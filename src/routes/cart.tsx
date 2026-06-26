import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { Minus, Plus, X } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { useCart, cartStore, cartTotal } from "@/lib/cart-store";
import { formatRub, SHOP_WHATSAPP } from "@/lib/format";
import { resolveProductImage } from "@/lib/products-images";
import { submitOrder } from "@/lib/shop.functions";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Корзина — Nuri" },
      { name: "description", content: "Оформите заказ свечей ручной работы Nuri через WhatsApp." },
    ],
  }),
  component: CartPage,
});

const formSchema = z.object({
  customer_name: z.string().trim().min(2, "Минимум 2 символа").max(80),
  phone: z.string().trim().min(5, "Укажите телефон").max(30),
  delivery_type: z.enum(["pickup", "delivery"]),
  address: z.string().trim().max(300).optional(),
  comment: z.string().trim().max(500).optional(),
});

function CartPage() {
  const items = useCart();
  const total = cartTotal(items);
  const submit = useServerFn(submitOrder);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    delivery_type: "pickup" as "pickup" | "delivery",
    address: "",
    comment: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = formSchema.parse(form);
      return submit({
        data: {
          ...parsed,
          address: parsed.address || null,
          comment: parsed.comment || null,
          items: items.map((i) => ({
            productId: i.productId,
            slug: i.slug,
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
        },
      });
    },
    onSuccess: () => {
      // Build WhatsApp message
      const lines = [
        `Здравствуйте! Хочу оформить заказ:`,
        ...items.map((i) => `— ${i.name} × ${i.quantity} = ${formatRub(i.price * i.quantity)}`),
        ``,
        `Итого: ${formatRub(total)}`,
        ``,
        `Имя: ${form.customer_name}`,
        `Телефон: ${form.phone}`,
        `Способ получения: ${form.delivery_type === "pickup" ? "Самовывоз (Махачкала)" : "Доставка"}`,
        ...(form.delivery_type === "delivery" && form.address ? [`Адрес: ${form.address}`] : []),
        ...(form.comment ? [`Комментарий: ${form.comment}`] : []),
      ];
      const text = encodeURIComponent(lines.join("\n"));
      window.open(`https://wa.me/${SHOP_WHATSAPP}?text=${text}`, "_blank", "noopener");
      cartStore.clear();
      setDone(true);
    },
    onError: (err) => {
      if (err instanceof z.ZodError) {
        const map: Record<string, string> = {};
        for (const issue of err.issues) {
          map[String(issue.path[0])] = issue.message;
        }
        setErrors(map);
      } else {
        toast.error("Не удалось отправить заявку. Попробуйте ещё раз.");
      }
    },
  });

  if (done) {
    return (
      <SiteShell>
        <section className="max-w-xl mx-auto px-6 py-32 text-center">
          <h1 className="font-serif text-5xl mb-6">Спасибо!</h1>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            Мы получили вашу заявку и открыли WhatsApp для подтверждения.
            Если окно не открылось — свяжитесь с нами по номеру в подвале сайта.
          </p>
          <Link
            to="/catalog"
            className="inline-block bg-primary text-primary-foreground px-8 py-3 text-xs font-semibold uppercase tracking-[0.25em]"
          >
            Вернуться в каталог
          </Link>
        </section>
      </SiteShell>
    );
  }

  if (items.length === 0) {
    return (
      <SiteShell>
        <section className="max-w-xl mx-auto px-6 py-32 text-center">
          <h1 className="font-serif text-5xl mb-6">Корзина пуста</h1>
          <p className="text-muted-foreground mb-10">
            Выберите свечу или аксессуар, и мы свяжемся с вами в WhatsApp.
          </p>
          <Link
            to="/catalog"
            className="inline-block bg-primary text-primary-foreground px-8 py-3 text-xs font-semibold uppercase tracking-[0.25em]"
          >
            В каталог
          </Link>
        </section>
      </SiteShell>
    );
  }

  return (
    <SiteShell>
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="font-serif text-5xl mb-12 text-center">Ваш заказ</h1>
        <div className="bg-background p-6 md:p-10 border border-border">
          {/* Items */}
          <ul className="divide-y divide-border">
            {items.map((i) => {
              const img = resolveProductImage(i.slug, null);
              return (
                <li key={i.productId} className="py-5 flex gap-4 items-center">
                  {img && (
                    <img
                      src={img}
                      alt={i.name}
                      width={64}
                      height={80}
                      loading="lazy"
                      className="w-16 h-20 object-cover bg-secondary"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-serif text-lg">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{formatRub(i.price)}</p>
                  </div>
                  <div className="flex items-center border border-border">
                    <button
                      className="p-2 hover:bg-muted"
                      onClick={() => cartStore.setQuantity(i.productId, i.quantity - 1)}
                      aria-label="Меньше"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="px-3 text-sm w-8 text-center">{i.quantity}</span>
                    <button
                      className="p-2 hover:bg-muted"
                      onClick={() => cartStore.setQuantity(i.productId, i.quantity + 1)}
                      aria-label="Больше"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <span className="font-medium w-24 text-right text-sm">
                    {formatRub(i.price * i.quantity)}
                  </span>
                  <button
                    onClick={() => cartStore.remove(i.productId)}
                    className="p-2 text-muted-foreground hover:text-destructive"
                    aria-label="Удалить"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="flex justify-between items-baseline pt-6 mt-2 border-t border-border">
            <span className="text-lg font-serif">Итого:</span>
            <span className="text-3xl font-serif font-bold text-primary">
              {formatRub(total)}
            </span>
          </div>

          {/* Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setErrors({});
              mutation.mutate();
            }}
            className="grid gap-4 mt-10"
          >
            <Field label="Ваше имя" error={errors.customer_name}>
              <input
                type="text"
                value={form.customer_name}
                onChange={(e) => setForm((f) => ({ ...f, customer_name: e.target.value }))}
                maxLength={80}
                required
                className="w-full border border-input px-4 py-3 text-sm focus:outline-none focus:border-primary bg-background"
              />
            </Field>
            <Field label="Телефон" error={errors.phone}>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+7 (___) ___-__-__"
                maxLength={30}
                required
                className="w-full border border-input px-4 py-3 text-sm focus:outline-none focus:border-primary bg-background"
              />
            </Field>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                Способ получения
              </p>
              <div className="flex gap-3">
                <DeliveryOption
                  active={form.delivery_type === "pickup"}
                  onClick={() => setForm((f) => ({ ...f, delivery_type: "pickup" }))}
                >
                  Самовывоз
                </DeliveryOption>
                <DeliveryOption
                  active={form.delivery_type === "delivery"}
                  onClick={() => setForm((f) => ({ ...f, delivery_type: "delivery" }))}
                >
                  Доставка
                </DeliveryOption>
              </div>
            </div>
            {form.delivery_type === "delivery" && (
              <Field label="Адрес доставки" error={errors.address}>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  maxLength={300}
                  className="w-full border border-input px-4 py-3 text-sm focus:outline-none focus:border-primary bg-background"
                />
              </Field>
            )}
            <Field label="Комментарий (необязательно)" error={errors.comment}>
              <textarea
                value={form.comment}
                onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                maxLength={500}
                rows={3}
                className="w-full border border-input px-4 py-3 text-sm focus:outline-none focus:border-primary bg-background resize-none"
              />
            </Field>

            <button
              type="submit"
              disabled={mutation.isPending}
              className="bg-wa text-wa-foreground py-4 font-semibold uppercase tracking-[0.25em] text-xs hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {mutation.isPending ? "Отправляем..." : "Оформить через WhatsApp"}
            </button>
            <p className="text-[11px] text-muted-foreground text-center italic">
              Оформляя заказ, вы соглашаетесь с{" "}
              <Link to="/offer" className="underline">офертой</Link> и{" "}
              <Link to="/privacy" className="underline">политикой конфиденциальности</Link>.
            </p>
          </form>
        </div>
      </section>
    </SiteShell>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2 block">
        {label}
      </span>
      {children}
      {error && <span className="text-xs text-destructive mt-1 block">{error}</span>}
    </label>
  );
}

function DeliveryOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-4 py-2 text-xs uppercase tracking-widest border transition-colors " +
        (active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input hover:border-primary")
      }
    >
      {children}
    </button>
  );
}
