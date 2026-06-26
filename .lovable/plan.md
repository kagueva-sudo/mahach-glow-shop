## Что строим

Сайт-витрина свечей ручной работы **Nuri Candle Studio** в стиле Artisan Earth (тёплая палитра воска и земли, Playfair Display + Montserrat). Заказы оформляются как заявки + кнопка WhatsApp с автозаполненным сообщением. Админка для управления товарами и просмотра заявок защищена логином/паролем через Lovable Cloud.

## Структура страниц

| Маршрут | Назначение |
|---|---|
| `/` | Главная: герой, о мастерской, превью каталога (4 свечи), CTA |
| `/catalog` | Каталог: фильтр «Все / Свечи / Аксессуары», сетка карточек |
| `/product/$slug` | Карточка товара: галерея, описание, аромат, объём, цена, «В корзину» |
| `/cart` | Корзина: список позиций, форма заявки, кнопка WhatsApp |
| `/delivery` | Доставка и оплата (Махачкала, СДЭК, самовывоз) |
| `/privacy` | Политика конфиденциальности |
| `/offer` | Публичная оферта |
| `/auth` | Вход для админа |
| `/_authenticated/admin` | Список заявок + статусы |
| `/_authenticated/admin/products` | CRUD товаров (список, добавить, редактировать) |

Общая обвязка — `Header` (лого Nuri, навигация, иконка корзины со счётчиком) и `Footer` (контакты Махачкалы, соцсети, инфо-ссылки).

## Данные (Lovable Cloud)

Включаем Lovable Cloud. Таблицы в `public`:

- **`products`** — `id, slug, name, category ('candle'|'accessory'), description, scent, volume, price, image_url, is_published, created_at`. Публичный SELECT для `anon` только по `is_published=true`. INSERT/UPDATE/DELETE — только для роли `admin`.
- **`orders`** — `id, customer_name, phone, delivery_type ('pickup'|'delivery'), address, comment, items (jsonb), total, status ('new'|'in_progress'|'done'|'cancelled'), created_at`. INSERT разрешён `anon` (оформление заявки). SELECT/UPDATE — только `admin`.
- **`user_roles`** + enum `app_role` + security-definer `has_role()` — по канону. Админ назначается миграцией (по email) при первом запуске.

Корзина хранится в `localStorage` (Zustand). Серверные функции — `createServerFn`: `submitOrder`, `listOrders`, `updateOrderStatus`, `upsertProduct`, `deleteProduct` (последние три — под `requireSupabaseAuth` + проверка роли `admin`).

## WhatsApp-флоу

При нажатии «Оформить через WhatsApp» в `/cart`:
1. Валидируем форму (zod: имя, телефон).
2. `submitOrder` пишет заявку в БД со статусом `new`.
3. Открываем `https://wa.me/79882345678?text=<автотекст с составом заказа>`.
4. Чистим корзину, показываем экран «спасибо».

## Админка

- `/auth` — sign-in email+password (Lovable Cloud).
- `/_authenticated/admin` — таблица заявок: фильтр по статусу, смена статуса инлайн, раскрытие деталей.
- `/_authenticated/admin/products` — список товаров + диалоги создания/редактирования (поля + загрузка картинки в Lovable Storage bucket `product-images`). Кнопка «Снять с публикации» вместо жёсткого удаления (для сохранения истории заказов).
- Доступ только при `has_role(uid, 'admin')`; при отсутствии роли — редирект на главную.

## Дизайн-токены

Из выбранного направления переносим в `src/styles.css`:
- `--background: #FDFCF8` (paper), `--foreground: #1C1917` (ink)
- `--primary: #7C4A3A` (earth), `--accent: #A67C52` (clay)
- Шрифты подключаем `<link>` в `__root.tsx`: Playfair Display (заголовки) + Montserrat (текст).
- Радиусы минимальные, переходы плавные, акценты — тонкие подчёркивания и `bg-primary` на CTA.

## Контент-сидинг

Миграцией засеиваем 10 товаров (8 свечей + 2 аксессуара) с плейсхолдер-описаниями и сгенерированными изображениями (image-gen, сохранены в `src/assets/products/`). Пользователь потом отредактирует через админку.

## Технические детали

- TanStack Start + TanStack Query (canonical loader/component pattern).
- Публичные роуты (`/`, `/catalog`, `/product/$slug`, `/delivery`, `/privacy`, `/offer`) — server publishable client (anon SELECT по `is_published`).
- Защищённые роуты — под `_authenticated/`, серверные fn с `requireSupabaseAuth` + проверкой `has_role`.
- Валидация форм — zod (имя 2–60, телефон по маске, адрес до 200, комментарий до 500).
- SEO: уникальные `head()` для каждой страницы, og-метатеги.

## Что НЕ делаем

- Без онлайн-оплаты, эквайринга, регистрации покупателей, отзывов, рейтингов, вишлиста.
- Без сравнения товаров, бейджей «Хит» в БД (только опционально на главной).
- Без email-уведомлений (на будущее — можно добавить через Resend).
