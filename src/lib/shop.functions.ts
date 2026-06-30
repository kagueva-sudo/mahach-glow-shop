import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

export type ProductDTO = {
  id: string;
  slug: string;
  name: string;
  category: "candle" | "accessory";
  description: string;
  scent: string | null;
  volume: string | null;
  price: number;
  image_url: string | null;
  is_published: boolean;
  sort_order: number;
};

export const listPublicProducts = createServerFn({ method: "GET" }).handler(async (): Promise<ProductDTO[]> => {
  const supabase = publicClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, slug, name, category, description, scent, volume, price, image_url, is_published, sort_order")
    .eq("is_published", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductDTO[];
});

export const getPublicProduct = createServerFn({ method: "GET" })
  .inputValidator((data: { slug: string }) => z.object({ slug: z.string().min(1).max(120) }).parse(data))
  .handler(async ({ data }): Promise<ProductDTO | null> => {
    const supabase = publicClient();
    const { data: row, error } = await supabase
      .from("products")
      .select("id, slug, name, category, description, scent, volume, price, image_url, is_published, sort_order")
      .eq("slug", data.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as ProductDTO | null) ?? null;
  });

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  slug: z.string().min(1).max(120),
  name: z.string().min(1).max(160),
  price: z.number().int().min(0).max(10_000_000),
  quantity: z.number().int().min(1).max(99),
});

const submitOrderSchema = z.object({
  customer_name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(5).max(30),
  delivery_type: z.enum(["pickup", "delivery"]),
  address: z.string().trim().max(300).optional().nullable(),
  comment: z.string().trim().max(500).optional().nullable(),
  items: z.array(orderItemSchema).min(1).max(50),
});

export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => submitOrderSchema.parse(data))
  .handler(async ({ data }): Promise<{ orderId: string }> => {
    const supabase = publicClient();
    const ids = data.items.map((i) => i.productId);
    const { data: products, error: priceErr } = await supabase
      .from("products")
      .select("id, slug, name, price, is_published")
      .in("id", ids);
    if (priceErr) throw new Error(priceErr.message);
    const productMap = new Map((products ?? []).map((p) => [p.id, p]));
    const validatedItems = data.items.map((i) => {
      const p = productMap.get(i.productId);
      if (!p || !p.is_published) {
        throw new Error(`Товар недоступен: ${i.name}`);
      }
      return {
        productId: p.id,
        slug: p.slug,
        name: p.name,
        price: p.price,
        quantity: i.quantity,
      };
    });
    const total = validatedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const { data: row, error } = await supabase
      .from("orders")
      .insert({
        customer_name: data.customer_name,
        phone: data.phone,
        delivery_type: data.delivery_type,
        address: data.address ?? null,
        comment: data.comment ?? null,
        items: validatedItems as unknown as Database["public"]["Tables"]["orders"]["Insert"]["items"],
        total,
        status: "new",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { orderId: row.id };
  });


// ===== Admin-only =====

async function assertAdmin(supabase: ReturnType<typeof publicClient>, userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("user_id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin role required");
}

export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as ReturnType<typeof publicClient>, context.userId);
    const { data, error } = await context.supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "in_progress", "done", "cancelled"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as ReturnType<typeof publicClient>, context.userId);
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase as ReturnType<typeof publicClient>, context.userId);
    const { data, error } = await context.supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const productInput = z.object({
  id: z.string().uuid().optional(),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "Только латиница, цифры и дефис"),
  name: z.string().trim().min(2).max(120),
  category: z.enum(["candle", "accessory"]),
  description: z.string().trim().max(2000).default(""),
  scent: z.string().trim().max(120).optional().nullable(),
  volume: z.string().trim().max(60).optional().nullable(),
  price: z.number().int().min(0).max(10_000_000),
  image_url: z.string().trim().max(500).optional().nullable(),
  is_published: z.boolean(),
  sort_order: z.number().int().min(0).max(100000).default(0),
});

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => productInput.parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as ReturnType<typeof publicClient>, context.userId);
    if (data.id) {
      const { id, ...rest } = data;
      const { error } = await context.supabase.from("products").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    } else {
      const { id: _omit, ...rest } = data;
      const { error } = await context.supabase.from("products").insert(rest);
      if (error) throw new Error(error.message);
      return { ok: true as const };
    }
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as ReturnType<typeof publicClient>, context.userId);
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_roles")
      .select("user_id")
      .eq("user_id", context.userId)
      .eq("role", "admin")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { isAdmin: Boolean(data) };
  });

// ===== Site settings =====

export const getHeroImageUrl = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ url: string | null }> => {
    const supabase = publicClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", "hero_image_url")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { url: (data?.value as string | null) ?? null };
  },
);

export const adminSetHeroImageUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ url: z.string().url().max(2000).nullable() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase as ReturnType<typeof publicClient>, context.userId);
    const { error } = await context.supabase
      .from("site_settings")
      .upsert({ key: "hero_image_url", value: data.url }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

