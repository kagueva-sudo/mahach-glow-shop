import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatRub } from "@/lib/format";
import {
  adminListOrders,
  adminUpdateOrderStatus,
  adminListProducts,
  adminUpsertProduct,
  adminDeleteProduct,
  checkIsAdmin,
  getHeroImageUrl,
  adminSetHeroImageUrl,
} from "@/lib/shop.functions";
import {
  adminListChatSessions,
  adminListChatMessages,
  adminUpdateChatStatus,
} from "@/lib/chat.functions";


export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Админка — Nuri" }] }),
  beforeLoad: async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      throw redirect({ to: "/auth" });
    }
  },
  component: AdminPage,
});

const ORDER_STATUS_LABELS = {
  new: "Новый",
  in_progress: "В работе",
  done: "Готов",
  cancelled: "Отменён",
} as const;

type OrderStatus = keyof typeof ORDER_STATUS_LABELS;

async function uploadToSiteAssets(file: File, folder: string): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Это не изображение");
  if (file.size > 8 * 1024 * 1024) throw new Error("Файл больше 8 МБ");
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("site-assets")
    .upload(path, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
  if (upErr) throw upErr;
  const { data: signed, error: sErr } = await supabase.storage
    .from("site-assets")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 100);
  if (sErr || !signed?.signedUrl) throw sErr ?? new Error("Не удалось получить ссылку");
  return signed.signedUrl;
}

function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"orders" | "products" | "chats" | "settings" | "profile">("orders");
  const checkAdmin = useServerFn(checkIsAdmin);
  const listOrdersFn = useServerFn(adminListOrders);

  const adminQ = useQuery({
    queryKey: ["admin", "isAdmin"],
    queryFn: () => checkAdmin({}),
  });

  // Counter of new orders for tab badge
  const ordersCountQ = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => listOrdersFn({}),
    enabled: Boolean(adminQ.data?.isAdmin),
  });
  const newCount = (ordersCountQ.data ?? []).filter((o) => o.status === "new").length;

  if (adminQ.isLoading) {
    return <div className="p-20 text-center text-muted-foreground">Проверка прав...</div>;
  }
  if (adminQ.isError || !adminQ.data?.isAdmin) {
    return (
      <div className="max-w-md mx-auto p-12 text-center">
        <h1 className="font-serif text-3xl mb-4">Нет доступа</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          У вашего аккаунта нет роли administrator. Обратитесь к владельцу магазина.
        </p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            navigate({ to: "/auth" });
          }}
          className="text-xs uppercase tracking-[0.2em] underline"
        >
          Выйти
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center flex-wrap gap-3">
          <div className="flex items-center gap-8 flex-wrap">
            <Link to="/" className="font-serif text-xl">Nuri · Админка</Link>
            <nav className="flex gap-2 flex-wrap">
              <TabBtn active={tab === "orders"} onClick={() => setTab("orders")}>
                Заявки{newCount > 0 ? ` · ${newCount} нов.` : ""}
              </TabBtn>
              <TabBtn active={tab === "products"} onClick={() => setTab("products")}>
                Товары
              </TabBtn>
              <TabBtn active={tab === "chats"} onClick={() => setTab("chats")}>
                Чаты
              </TabBtn>
              <TabBtn active={tab === "settings"} onClick={() => setTab("settings")}>
                Оформление
              </TabBtn>
              <TabBtn active={tab === "profile"} onClick={() => setTab("profile")}>
                Профиль
              </TabBtn>
            </nav>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/auth" });
            }}
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
          >
            Выйти
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto p-6">
        {tab === "orders" && <OrdersPanel />}
        {tab === "products" && <ProductsPanel />}
        {tab === "chats" && <ChatsPanel />}
        {tab === "settings" && <SettingsPanel />}
        {tab === "profile" && <ProfilePanel />}
      </main>
    </div>
  );
}


function TabBtn({
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
      onClick={onClick}
      className={
        "text-xs uppercase tracking-[0.2em] px-4 py-2 " +
        (active ? "bg-primary text-primary-foreground" : "hover:bg-muted")
      }
    >
      {children}
    </button>
  );
}

function OrdersPanel() {
  const listFn = useServerFn(adminListOrders);
  const updateFn = useServerFn(adminUpdateOrderStatus);
  const qc = useQueryClient();
  const ordersQ = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: () => listFn({}),
  });
  const update = useMutation({
    mutationFn: (vars: { id: string; status: OrderStatus }) =>
      updateFn({ data: vars }),
    onSuccess: () => {
      toast.success("Статус обновлён");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | OrderStatus>("all");
  const [period, setPeriod] = useState<"all" | "today" | "week" | "month">("all");

  const orders = ordersQ.data ?? [];
  const filtered = useMemo(() => {
    const now = Date.now();
    const periodMs =
      period === "today" ? 24 * 3600e3 : period === "week" ? 7 * 24 * 3600e3 : period === "month" ? 30 * 24 * 3600e3 : null;
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (periodMs && now - new Date(o.created_at).getTime() > periodMs) return false;
      if (q) {
        const hay = `${o.customer_name} ${o.phone}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [orders, search, statusFilter, period]);

  if (ordersQ.isLoading) return <p className="text-muted-foreground">Загрузка...</p>;
  if (ordersQ.isError) return <p className="text-destructive">{(ordersQ.error as Error).message}</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-2">
        <h2 className="font-serif text-3xl">
          Заявки <span className="text-muted-foreground text-base">({filtered.length} из {orders.length})</span>
        </h2>
      </div>

      <div className="bg-background border border-border p-4 grid sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">Поиск</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Имя или телефон"
            className="w-full border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">Статус</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="w-full border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Все</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">Период</span>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as typeof period)}
            className="w-full border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">За всё время</option>
            <option value="today">Сегодня</option>
            <option value="week">Неделя</option>
            <option value="month">Месяц</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 && <p className="text-muted-foreground">Заявок не найдено.</p>}
      {filtered.map((o) => {
        const items = (o.items as Array<{ name: string; quantity: number; price: number }>) ?? [];
        return (
          <article key={o.id} className="bg-background border border-border p-5">
            <header className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-semibold">{o.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("ru-RU")} · {o.phone}
                </p>
              </div>
              <select
                value={o.status}
                onChange={(e) =>
                  update.mutate({ id: o.id, status: e.target.value as OrderStatus })
                }
                className="text-xs border border-input bg-background px-3 py-1.5"
              >
                {Object.entries(ORDER_STATUS_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </header>
            <div className="text-xs space-y-1 mb-3 text-muted-foreground">
              <p>
                <strong className="text-foreground">
                  {o.delivery_type === "pickup" ? "Самовывоз" : "Доставка"}
                </strong>
                {o.address ? ` · ${o.address}` : ""}
              </p>
              {o.comment && <p>Комментарий: {o.comment}</p>}
            </div>
            <ul className="text-sm divide-y divide-border border-y border-border mb-2">
              {items.map((i, idx) => (
                <li key={idx} className="py-2 flex justify-between">
                  <span>
                    {i.name} × {i.quantity}
                  </span>
                  <span>{formatRub(i.price * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <p className="text-right font-serif text-lg">Итого: {formatRub(o.total)}</p>
          </article>
        );
      })}
    </div>
  );
}

type ProductRow = {
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

type ProductForm = Omit<ProductRow, "id"> & { id?: string };

const emptyProduct: ProductForm = {
  slug: "",
  name: "",
  category: "candle",
  description: "",
  scent: "",
  volume: "",
  price: 0,
  image_url: "",
  is_published: true,
  sort_order: 0,
};

function ProductsPanel() {
  const listFn = useServerFn(adminListProducts);
  const upsertFn = useServerFn(adminUpsertProduct);
  const deleteFn = useServerFn(adminDeleteProduct);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProductForm | null>(null);

  const productsQ = useQuery({
    queryKey: ["admin", "products"],
    queryFn: () => listFn({}),
  });

  const upsert = useMutation({
    mutationFn: (data: ProductForm) =>
      upsertFn({
        data: {
          ...data,
          scent: data.scent || null,
          volume: data.volume || null,
          image_url: data.image_url || null,
        },
      }),
    onSuccess: () => {
      toast.success("Сохранено");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products", "public"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Удалено");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      qc.invalidateQueries({ queryKey: ["products", "public"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  if (productsQ.isLoading) return <p className="text-muted-foreground">Загрузка...</p>;
  if (productsQ.isError) return <p className="text-destructive">{(productsQ.error as Error).message}</p>;
  const products = (productsQ.data ?? []) as ProductRow[];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-3xl">Товары ({products.length})</h2>
        <button
          onClick={() => setEditing({ ...emptyProduct })}
          className="bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em]"
        >
          + Добавить
        </button>
      </div>

      <div className="bg-background border border-border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
            <tr>
              <th className="text-left px-4 py-3">Название</th>
              <th className="text-left px-4 py-3">Категория</th>
              <th className="text-right px-4 py-3">Цена</th>
              <th className="text-center px-4 py-3">Публ.</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => (
              <tr key={p.id}>
                <td className="px-4 py-3">
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">/{p.slug}</p>
                </td>
                <td className="px-4 py-3 text-xs">
                  {p.category === "candle" ? "Свеча" : "Аксессуар"}
                </td>
                <td className="px-4 py-3 text-right">{formatRub(p.price)}</td>
                <td className="px-4 py-3 text-center text-xs">
                  {p.is_published ? "Да" : "Нет"}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button
                    onClick={() => setEditing(p)}
                    className="text-xs underline mr-3"
                  >
                    Изменить
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Удалить «${p.name}»?`)) del.mutate(p.id);
                    }}
                    className="text-xs text-destructive underline"
                  >
                    Удалить
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <ProductEditor
          value={editing}
          onChange={setEditing}
          onSave={() => upsert.mutate(editing)}
          onClose={() => setEditing(null)}
          saving={upsert.isPending}
        />
      )}
    </div>
  );
}

function ProductEditor({
  value,
  onChange,
  onSave,
  onClose,
  saving,
}: {
  value: ProductForm;
  onChange: (v: ProductForm) => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const url = await uploadToSiteAssets(file, "products");
      onChange({ ...value, image_url: url });
      toast.success("Фото загружено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-foreground/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-serif text-2xl">{value.id ? "Редактирование" : "Новый товар"}</h3>
          <button onClick={onClose} className="text-xs uppercase tracking-[0.2em]">
            Закрыть
          </button>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave();
          }}
          className="grid grid-cols-2 gap-4"
        >
          <Field label="Название" full>
            <input
              required
              value={value.name}
              onChange={(e) => onChange({ ...value, name: e.target.value })}
              className="inp"
            />
          </Field>
          <Field label="Slug (латиница)">
            <input
              required
              pattern="[a-z0-9-]+"
              value={value.slug}
              onChange={(e) => onChange({ ...value, slug: e.target.value })}
              className="inp"
            />
          </Field>
          <Field label="Категория">
            <select
              value={value.category}
              onChange={(e) =>
                onChange({ ...value, category: e.target.value as "candle" })
              }
              className="inp"
            >
              <option value="candle">Свеча</option>
              <option value="accessory">Аксессуар</option>
            </select>
          </Field>
          <Field label="Цена, ₽">
            <input
              type="number"
              min={0}
              required
              value={value.price}
              onChange={(e) => onChange({ ...value, price: Number(e.target.value) })}
              className="inp"
            />
          </Field>
          <Field label="Порядок">
            <input
              type="number"
              min={0}
              value={value.sort_order}
              onChange={(e) => onChange({ ...value, sort_order: Number(e.target.value) })}
              className="inp"
            />
          </Field>
          <Field label="Аромат">
            <input
              value={value.scent ?? ""}
              onChange={(e) => onChange({ ...value, scent: e.target.value })}
              className="inp"
            />
          </Field>
          <Field label="Объём">
            <input
              value={value.volume ?? ""}
              onChange={(e) => onChange({ ...value, volume: e.target.value })}
              className="inp"
            />
          </Field>

          <div className="col-span-2 space-y-2">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block">
              Фото товара
            </span>
            {value.image_url && (
              <div className="aspect-[4/3] max-w-xs bg-muted overflow-hidden border border-border">
                <img src={value.image_url} alt="Превью" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex flex-wrap gap-2 items-center">
              <label className="inline-flex items-center bg-primary text-primary-foreground px-4 py-2 text-xs uppercase tracking-[0.2em] cursor-pointer hover:bg-foreground transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                  }}
                />
                {uploading ? "Загрузка..." : value.image_url ? "Заменить фото" : "Загрузить с компьютера"}
              </label>
              {value.image_url && (
                <button
                  type="button"
                  onClick={() => onChange({ ...value, image_url: "" })}
                  className="text-xs underline text-muted-foreground"
                >
                  Убрать
                </button>
              )}
            </div>
            <input
              value={value.image_url ?? ""}
              onChange={(e) => onChange({ ...value, image_url: e.target.value })}
              placeholder="Или вставьте URL изображения"
              className="inp"
            />
          </div>

          <Field label="Описание" full>
            <textarea
              rows={4}
              value={value.description}
              onChange={(e) => onChange({ ...value, description: e.target.value })}
              className="inp resize-none"
            />
          </Field>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={value.is_published}
              onChange={(e) => onChange({ ...value, is_published: e.target.checked })}
            />
            Опубликовать в каталоге
          </label>

          <div className="col-span-2 flex gap-3 justify-end pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-xs uppercase tracking-[0.2em] border border-input"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={saving || uploading}
              className="bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
            >
              {saving ? "..." : "Сохранить"}
            </button>
          </div>
        </form>
        <style>{`.inp{width:100%;border:1px solid var(--input);background:var(--background);padding:0.5rem 0.75rem;font-size:0.875rem;outline:none;}.inp:focus{border-color:var(--primary);}`}</style>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={"block " + (full ? "col-span-2" : "")}>
      <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5 block">
        {label}
      </span>
      {children}
    </label>
  );
}

function SettingsPanel() {
  const qc = useQueryClient();
  const getHero = useServerFn(getHeroImageUrl);
  const setHero = useServerFn(adminSetHeroImageUrl);
  const heroQ = useQuery({ queryKey: ["site", "hero"], queryFn: () => getHero({}) });

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (url: string | null) => setHero({ data: { url } }),
    onSuccess: () => {
      toast.success("Hero обновлён");
      qc.invalidateQueries({ queryKey: ["site", "hero"] });
      setPreviewUrl(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadToSiteAssets(file, "hero");
      setPreviewUrl(url);
      save.mutate(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  }

  const currentUrl = previewUrl ?? heroQ.data?.url ?? null;

  return (
    <div className="max-w-3xl">
      <h2 className="font-serif text-3xl mb-6">Оформление главной</h2>

      <section className="bg-background border border-border p-6">
        <h3 className="font-serif text-xl mb-2">Hero-изображение</h3>
        <p className="text-sm text-muted-foreground mb-5">
          Рекомендуем горизонтальное фото от 1920×1080. Если ничего не загружено —
          используется встроенное изображение мастерской.
        </p>

        <div className="aspect-[16/9] bg-muted overflow-hidden mb-4 border border-border">
          {currentUrl ? (
            <img src={currentUrl} alt="Текущее hero" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground uppercase tracking-[0.2em]">
              Используется изображение по умолчанию
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <label className="inline-flex items-center bg-primary text-primary-foreground px-5 py-2.5 text-xs uppercase tracking-[0.2em] cursor-pointer hover:bg-foreground transition-colors">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading || save.isPending}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
                e.target.value = "";
              }}
            />
            {uploading || save.isPending ? "Загрузка..." : "Загрузить новое"}
          </label>
          {heroQ.data?.url && (
            <button
              onClick={() => {
                if (confirm("Вернуть изображение по умолчанию?")) save.mutate(null);
              }}
              disabled={save.isPending}
              className="text-xs uppercase tracking-[0.2em] underline text-muted-foreground hover:text-destructive"
            >
              Сбросить
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function ProfilePanel() {
  const [email, setEmail] = useState<string>("");
  const [newEmail, setNewEmail] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState<"pwd" | "email" | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? "");
      setNewEmail(data.user?.email ?? "");
    });
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 8) {
      toast.error("Минимум 8 символов");
      return;
    }
    if (pwd !== pwd2) {
      toast.error("Пароли не совпадают");
      return;
    }
    setBusy("pwd");
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(null);
    if (error) toast.error(error.message);
    else {
      toast.success("Пароль обновлён");
      setPwd("");
      setPwd2("");
    }
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail || newEmail === email) {
      toast.error("Введите новый email");
      return;
    }
    setBusy("email");
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    setBusy(null);
    if (error) toast.error(error.message);
    else toast.success("Письмо с подтверждением отправлено на новый адрес");
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="font-serif text-3xl">Профиль администратора</h2>

      <section className="bg-background border border-border p-6">
        <h3 className="font-serif text-xl mb-1">Текущий аккаунт</h3>
        <p className="text-sm text-muted-foreground">{email || "—"}</p>
      </section>

      <section className="bg-background border border-border p-6">
        <h3 className="font-serif text-xl mb-4">Сменить пароль</h3>
        <form onSubmit={changePassword} className="space-y-3 max-w-sm">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">
              Новый пароль
            </span>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              minLength={8}
              required
              className="w-full border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">
              Подтверждение
            </span>
            <input
              type="password"
              value={pwd2}
              onChange={(e) => setPwd2(e.target.value)}
              minLength={8}
              required
              className="w-full border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={busy === "pwd"}
            className="bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {busy === "pwd" ? "..." : "Обновить пароль"}
          </button>
        </form>
      </section>

      <section className="bg-background border border-border p-6">
        <h3 className="font-serif text-xl mb-1">Сменить email</h3>
        <p className="text-xs text-muted-foreground mb-4">
          На новый адрес придёт письмо для подтверждения. Логин изменится только после клика по ссылке.
        </p>
        <form onSubmit={changeEmail} className="space-y-3 max-w-sm">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground block mb-1">
              Новый email
            </span>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="w-full border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={busy === "email"}
            className="bg-primary text-primary-foreground px-5 py-2 text-xs uppercase tracking-[0.2em] disabled:opacity-50"
          >
            {busy === "email" ? "..." : "Сменить email"}
          </button>
        </form>
      </section>
    </div>
  );
}
