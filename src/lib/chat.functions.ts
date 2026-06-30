import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { generateText, tool, stepCountIs, type ModelMessage } from "ai";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

function randomToken(len = 40) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ===== Public: start chat session =====

const startSchema = z.object({
  customer_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(5).max(30),
  consent: z.literal(true),
});

export const startChatSession = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => startSchema.parse(data))
  .handler(async ({ data }): Promise<{ sessionId: string; sessionToken: string; greeting: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const token = randomToken();
    const { data: row, error } = await supabaseAdmin
      .from("chat_sessions")
      .insert({
        session_token: token,
        customer_name: data.customer_name,
        phone: data.phone,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const greeting = `Здравствуйте, ${data.customer_name}! Я Нури — консультант по нашим свечам ручной работы. Расскажите, для кого подбираете — для себя, в подарок, для интерьера? Какие ароматы и настроения вам ближе?`;

    await supabaseAdmin.from("chat_messages").insert({
      session_id: row.id,
      role: "assistant",
      content: greeting,
    });

    return { sessionId: row.id, sessionToken: token, greeting };
  });

// ===== Public: get session messages (resume) =====

const resumeSchema = z.object({
  sessionId: z.string().uuid(),
  sessionToken: z.string().min(10).max(200),
});

export const getChatHistory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => resumeSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: session, error: sErr } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, status, needs_operator")
      .eq("id", data.sessionId)
      .eq("session_token", data.sessionToken)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Сессия не найдена");
    const { data: messages, error: mErr } = await supabaseAdmin
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });
    if (mErr) throw new Error(mErr.message);
    return { session, messages: messages ?? [] };
  });

// ===== Public: send a chat message =====

const sendSchema = z.object({
  sessionId: z.string().uuid(),
  sessionToken: z.string().min(10).max(200),
  text: z.string().trim().min(1).max(2000),
});

export const sendChatMessage = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => sendSchema.parse(data))
  .handler(async ({ data }): Promise<{ reply: string; orderId: string | null; state.ticket: boolean }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: session, error: sErr } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, session_token, customer_name, phone, status, needs_operator")
      .eq("id", data.sessionId)
      .eq("session_token", data.sessionToken)
      .maybeSingle();
    if (sErr) throw new Error(sErr.message);
    if (!session) throw new Error("Сессия не найдена");

    // persist user message
    await supabaseAdmin.from("chat_messages").insert({
      session_id: session.id,
      role: "user",
      content: data.text,
    });

    // load product catalog
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("slug, name, category, description, scent, volume, price")
      .eq("is_published", true)
      .order("sort_order");

    const catalog = (products ?? [])
      .map(
        (p) =>
          `- slug: ${p.slug} | ${p.name} (${p.category === "candle" ? "свеча" : "аксессуар"})` +
          ` | ${p.price} ₽` +
          (p.scent ? ` | аромат: ${p.scent}` : "") +
          (p.volume ? ` | объём: ${p.volume}` : "") +
          (p.description ? `\n   ${p.description}` : ""),
      )
      .join("\n");

    const systemPrompt = `Ты — Нури, тёплый и внимательный консультант мастерской свечей ручной работы из Махачкалы.
Ты помогаешь подобрать свечи, рассказываешь про ароматы, объём, как пользоваться, считаешь стоимость заказа.
Общайся по-русски, на «вы», мягко и романтично, без канцелярита. Короткие абзацы, можно списки.

Клиент: ${session.customer_name}, телефон ${session.phone}.

КАТАЛОГ (используй ТОЛЬКО эти товары, не выдумывай):
${catalog || "(каталог пуст)"}

Правила:
- Перед расчётом стоимости — уточни предпочтения (аромат, повод, бюджет).
- Когда клиент согласен оформить заказ, ОБЯЗАТЕЛЬНО вызови инструмент create_order со списком slug + quantity. Не «обещай» оформить — именно вызови инструмент.
- Уточни тип доставки: pickup (самовывоз по Махачкале) или delivery (с адресом).
- Если клиент просит живого человека, жалуется, или ты не знаешь ответа — вызови инструмент request_operator с коротким резюме ситуации.
- Никогда не называй цены, которых нет в каталоге.`;

    // build full history
    const { data: history } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", session.id)
      .order("created_at", { ascending: true });

    const modelMessages: ModelMessage[] = (history ?? [])
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3-flash-preview");

    const state: { orderId: string | null; ticket: boolean } = { orderId: null, ticket: false };

    const tools = {
      create_order: tool({
        description: "Оформить заказ от имени клиента. Используй когда клиент подтвердил состав заказа.",
        inputSchema: z.object({
          items: z
            .array(
              z.object({
                slug: z.string(),
                quantity: z.number().int().min(1).max(20),
              }),
            )
            .min(1)
            .max(20),
          delivery_type: z.enum(["pickup", "delivery"]),
          address: z.string().max(300).optional(),
          comment: z.string().max(500).optional(),
        }),
        execute: async (input) => {
          const slugs = input.items.map((i) => i.slug);
          const { data: prods, error } = await supabaseAdmin
            .from("products")
            .select("id, slug, name, price, is_published")
            .in("slug", slugs);
          if (error) return { ok: false, error: error.message };
          const bySlug = new Map((prods ?? []).map((p) => [p.slug, p]));
          const orderItems = [];
          let total = 0;
          for (const it of input.items) {
            const p = bySlug.get(it.slug);
            if (!p || !p.is_published) {
              return { ok: false, error: `Товар ${it.slug} недоступен` };
            }
            orderItems.push({
              productId: p.id,
              slug: p.slug,
              name: p.name,
              price: p.price,
              quantity: it.quantity,
            });
            total += p.price * it.quantity;
          }
          const { data: order, error: oErr } = await supabaseAdmin
            .from("orders")
            .insert({
              customer_name: session.customer_name,
              phone: session.phone,
              delivery_type: input.delivery_type,
              address: input.address ?? null,
              comment: (input.comment ? input.comment + " " : "") + `[Из чата #${session.id.slice(0, 8)}]`,
              items: orderItems as unknown as Database["public"]["Tables"]["orders"]["Insert"]["items"],
              total,
              status: "new",
            })
            .select("id")
            .single();
          if (oErr) return { ok: false, error: oErr.message };
          state.orderId = order.id;
          await supabaseAdmin
            .from("chat_sessions")
            .update({ status: "ordered", order_id: order.id })
            .eq("id", session.id);
          return { ok: true, orderId: order.id, total, items: orderItems };
        },
      }),
      request_operator: tool({
        description: "Передать беседу живому оператору. Используй при сложных запросах, жалобах или прямой просьбе.",
        inputSchema: z.object({
          reason: z.string().min(3).max(500),
        }),
        execute: async (input) => {
          await supabaseAdmin
            .from("chat_sessions")
            .update({ needs_operator: true, status: "ticket" })
            .eq("id", session.id);
          await supabaseAdmin.from("chat_messages").insert({
            session_id: session.id,
            role: "system",
            content: `[Тикет] ${input.reason}`,
          });
          state.ticket = true;
          // best-effort email notification
          try {
            const resendKey = process.env.RESEND_API_KEY;
            if (resendKey) {
              await fetch("https://connector-gateway.lovable.dev/resend/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${key}`,
                  "X-Connection-Api-Key": resendKey,
                },
                body: JSON.stringify({
                  from: "Nuri <onboarding@resend.dev>",
                  to: ["hello@nuri-candles.ru"],
                  subject: `Новый тикет из чата — ${session.customer_name}`,
                  html: `<p><b>Клиент:</b> ${session.customer_name} (${session.phone})</p><p><b>Причина:</b> ${input.reason}</p><p>Откройте админку и вкладку «Чаты», чтобы ответить.</p>`,
                }),
              });
            }
          } catch (e) {
            console.error("email notify failed", e);
          }
          return { ok: true };
        },
      }),
    };

    const result = await generateText({
      model,
      system: systemPrompt,
      messages: modelMessages,
      tools,
      stopWhen: stepCountIs(8),
    });

    const replyText = result.text?.trim() || (state.orderId
      ? `Заказ оформлен! Номер: ${state.orderId.slice(0, 8)}. Мы свяжемся с вами по телефону ${session.phone} в течение часа.`
      : state.ticket
        ? "Подключаю живого оператора, он напишет вам в ближайшее время."
        : "Расскажите подробнее, я слушаю.");

    await supabaseAdmin.from("chat_messages").insert({
      session_id: session.id,
      role: "assistant",
      content: replyText,
    });
    await supabaseAdmin
      .from("chat_sessions")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", session.id);

    return { reply: replyText, orderId: state.orderId, state.ticket };
  });

// ===== Admin =====

async function assertAdmin(supabase: ReturnType<typeof publicClient>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

export const adminListChatSessions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as ReturnType<typeof publicClient>, context.userId);
    const { data, error } = await context.supabase
      .from("chat_sessions")
      .select("*")
      .order("last_message_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminListChatMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ sessionId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as ReturnType<typeof publicClient>, context.userId);
    const { data: rows, error } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("session_id", data.sessionId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const adminUpdateChatStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["active", "ticket", "ordered", "closed"]).optional(),
        needs_operator: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as ReturnType<typeof publicClient>, context.userId);
    const patch: Record<string, unknown> = {};
    if (data.status) patch.status = data.status;
    if (typeof data.needs_operator === "boolean") patch.needs_operator = data.needs_operator;
    const { error } = await context.supabase.from("chat_sessions").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
