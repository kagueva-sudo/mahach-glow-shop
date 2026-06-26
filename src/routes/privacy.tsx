import { createFileRoute } from "@tanstack/react-router";
import { SiteShell } from "@/components/site/SiteShell";
import { SHOP_EMAIL } from "@/lib/format";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [{ title: "Политика конфиденциальности — Nuri" }],
  }),
  component: () => (
    <SiteShell>
      <article className="max-w-3xl mx-auto px-6 py-20 prose-content">
        <p className="text-[10px] uppercase tracking-[0.3em] text-clay mb-4">Правовая информация</p>
        <h1 className="font-serif text-5xl mb-10">Политика конфиденциальности</h1>
        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <p>
            Настоящая Политика определяет порядок обработки персональных данных
            посетителей сайта Nuri Candle Studio (далее — «Сайт»).
          </p>
          <h2 className="font-serif text-2xl text-foreground">1. Состав данных</h2>
          <p>
            Мы запрашиваем минимально необходимый набор данных: имя, номер телефона,
            адрес доставки и комментарий к заказу. Эти данные используются исключительно
            для обработки и доставки заказа.
          </p>
          <h2 className="font-serif text-2xl text-foreground">2. Хранение</h2>
          <p>
            Данные хранятся на защищённых серверах. Доступ к ним имеет только
            администратор магазина. Срок хранения — не более 3 лет с момента
            последнего заказа.
          </p>
          <h2 className="font-serif text-2xl text-foreground">3. Передача третьим лицам</h2>
          <p>
            Мы не передаём ваши данные третьим лицам, за исключением курьерских
            служб (СДЭК, Почта России), необходимых для доставки заказа.
          </p>
          <h2 className="font-serif text-2xl text-foreground">4. Cookies</h2>
          <p>
            Сайт использует cookies для сохранения корзины и работы интерфейса.
            Аналитические cookies не используются.
          </p>
          <h2 className="font-serif text-2xl text-foreground">5. Контакты</h2>
          <p>
            По вопросам обработки персональных данных пишите на {SHOP_EMAIL}.
          </p>
        </div>
      </article>
    </SiteShell>
  ),
});
