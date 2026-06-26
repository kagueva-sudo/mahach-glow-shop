import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
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

function AdminPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"orders" | "products" | "settings">("orders");
  const checkAdmin = useServerFn(checkIsAdmin);

  const adminQ = useQuery({
    queryKey: ["admin", "isAdmin"],
    queryFn: () => checkAdmin({}),
  });

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
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-serif text-xl">Nuri · Админка</Link>
            <nav className="flex gap-2">
              <TabBtn active={tab === "orders"} onClick={() => setTab("orders")}>
                Заявки
              </TabBtn>
              <TabBtn active={tab === "products"} onClick={() => setTab("products")}>
                Товары
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
        {tab === "orders" ? <OrdersPanel /> : <ProductsPanel />}
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
    mutationFn: (vars: { id: string; status: "new" | "in_progress" | "done" | "cancelled" }) =>
      updateFn({ data: vars }),
    onSuccess: () => {
      toast.success("Статус обновлён");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Ошибка"),
  });

  if (ordersQ.isLoading) return <p className="text-muted-foreground">Загрузка...</p>;
  if (ordersQ.isError) return <p className="text-destructive">{(ordersQ.error as Error).message}</p>;
  const orders = ordersQ.data ?? [];

  return (
    <div className="space-y-4">
      <h2 className="font-serif text-3xl mb-4">Заявки ({orders.length})</h2>
      {orders.length === 0 && <p className="text-muted-foreground">Пока нет заявок.</p>}
      {orders.map((o) => {
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
                  update.mutate({ id: o.id, status: e.target.value as "new" })
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
          <Field label="URL изображения" full>
            <input
              value={value.image_url ?? ""}
              onChange={(e) => onChange({ ...value, image_url: e.target.value })}
              placeholder="https://... или оставьте пустым для сид-изображения"
              className="inp"
            />
          </Field>
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
              disabled={saving}
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
