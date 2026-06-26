import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { SHOP_ADDRESS, SHOP_PHONE, SHOP_WHATSAPP } from "@/lib/format";

export const Route = createFileRoute("/delivery")({
  head: () => ({
    meta: [
      { title: "Доставка и оплата — Nuri" },
      {
        name: "description",
        content: "Самовывоз из Махачкалы и доставка по России через СДЭК и Почту России.",
      },
    ],
  }),
  component: DeliveryPage,
});

function DeliveryPage() {
  return (
    <SiteShell>
      <article className="max-w-3xl mx-auto px-6 py-20">
        <p className="text-[10px] uppercase tracking-[0.3em] text-clay mb-4">Информация</p>
        <h1 className="font-serif text-5xl mb-10">Доставка и оплата</h1>

        <section className="mb-12">
          <h2 className="font-serif text-2xl mb-4">Самовывоз</h2>
          <p className="text-muted-foreground leading-relaxed">
            Бесплатно из нашей мастерской по адресу: <strong>{SHOP_ADDRESS}</strong>.
            Будем рады угостить вас чаем и показать процесс заливки свечей.
            Работаем ежедневно с 10:00 до 20:00.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="font-serif text-2xl mb-4">Доставка по Махачкале</h2>
          <p className="text-muted-foreground leading-relaxed">
            Курьером — от <strong>200 ₽</strong>, в день заказа при оформлении до 16:00.
            Время доставки 1–3 часа после подтверждения.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="font-serif text-2xl mb-4">Доставка по Дагестану и России</h2>
          <p className="text-muted-foreground leading-relaxed">
            СДЭК, Почта России, Boxberry — рассчитываем стоимость индивидуально
            после оформления заказа. Срок доставки 2–7 дней. Каждое изделие
            бережно упаковано в крафт-бумагу и фирменную коробку.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="font-serif text-2xl mb-4">Оплата</h2>
          <ul className="space-y-2 text-muted-foreground leading-relaxed list-disc list-inside">
            <li>Переводом на карту по СБП</li>
            <li>Наличными при самовывозе</li>
            <li>Наложенным платежом (только для регионов России)</li>
          </ul>
        </section>

        <section>
          <h2 className="font-serif text-2xl mb-4">Связаться с нами</h2>
          <p className="text-muted-foreground leading-relaxed">
            Телефон: <a href={`tel:${SHOP_PHONE.replace(/\s/g, "")}`} className="text-primary underline">{SHOP_PHONE}</a><br />
            WhatsApp: <a href={`https://wa.me/${SHOP_WHATSAPP}`} className="text-primary underline" target="_blank" rel="noopener">написать</a>
          </p>
        </section>
      </article>
    </SiteShell>
  );
}
