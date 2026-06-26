import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { SHOP_ADDRESS, SHOP_EMAIL } from "@/lib/format";

export const Route = createFileRoute("/offer")({
  head: () => ({
    meta: [{ title: "Публичная оферта — Nuri" }],
  }),
  component: () => (
    <SiteShell>
      <article className="max-w-3xl mx-auto px-6 py-20">
        <p className="text-[10px] uppercase tracking-[0.3em] text-clay mb-4">Правовая информация</p>
        <h1 className="font-serif text-5xl mb-10">Публичная оферта</h1>
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>
            Настоящая публичная оферта (далее — «Оферта») является официальным
            предложением мастерской Nuri Candle Studio ({SHOP_ADDRESS}) заключить
            договор купли-продажи на условиях, изложенных ниже.
          </p>
          <h2 className="font-serif text-2xl text-foreground">1. Предмет договора</h2>
          <p>
            Продавец обязуется передать в собственность Покупателя свечи и
            сопутствующие аксессуары ручной работы, представленные в каталоге Сайта,
            а Покупатель — принять и оплатить их.
          </p>
          <h2 className="font-serif text-2xl text-foreground">2. Оформление заказа</h2>
          <p>
            Заказ оформляется через корзину Сайта и подтверждается в WhatsApp.
            Договор считается заключённым с момента подтверждения заказа
            представителем Продавца.
          </p>
          <h2 className="font-serif text-2xl text-foreground">3. Цена и оплата</h2>
          <p>
            Цены указаны в рублях. Оплата производится переводом на карту
            (СБП), наличными при самовывозе или наложенным платежом.
          </p>
          <h2 className="font-serif text-2xl text-foreground">4. Возврат</h2>
          <p>
            Свечи как товар, имеющий аромат и индивидуальные особенности ручной
            заливки, возврату надлежащего качества не подлежат (п. 3 ст. 25 Закона
            «О защите прав потребителей»). Брак или повреждение при доставке —
            замена в течение 14 дней.
          </p>
          <h2 className="font-serif text-2xl text-foreground">5. Контакты</h2>
          <p>{SHOP_EMAIL}</p>
        </div>
      </article>
    </SiteShell>
  ),
});
