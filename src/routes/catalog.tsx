import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { listPublicProducts } from "@/lib/shop.functions";

const productsQO = queryOptions({
  queryKey: ["products", "public"],
  queryFn: () => listPublicProducts(),
});

export const Route = createFileRoute("/catalog")({
  head: () => ({
    meta: [
      { title: "Каталог свечей и аксессуаров — Nuri" },
      {
        name: "description",
        content:
          "Каталог свечей ручной работы и аксессуаров. Соевый и пчелиный воск, авторские ароматы.",
      },
      { property: "og:title", content: "Каталог — Nuri Candle Studio" },
      { property: "og:description", content: "Свечи и аксессуары ручной работы из Махачкалы." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQO),
  component: Catalog,
});

type Filter = "all" | "candle" | "accessory";

function Catalog() {
  const { data: products } = useSuspenseQuery(productsQO);
  const [filter, setFilter] = useState<Filter>("all");
  const visible = products.filter((p) => filter === "all" || p.category === filter);

  return (
    <SiteShell>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-clay mb-3">Каталог</p>
            <h1 className="font-serif text-5xl mb-2">Наши изделия</h1>
            <p className="text-muted-foreground">
              {products.length} позиций, созданных вручную в Махачкале
            </p>
          </div>
          <div className="flex gap-6 border-b border-border pb-2">
            <FilterTab active={filter === "all"} onClick={() => setFilter("all")}>
              Все
            </FilterTab>
            <FilterTab active={filter === "candle"} onClick={() => setFilter("candle")}>
              Свечи
            </FilterTab>
            <FilterTab active={filter === "accessory"} onClick={() => setFilter("accessory")}>
              Аксессуары
            </FilterTab>
          </div>
        </div>

        {visible.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">
            В этой категории пока нет товаров.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </SiteShell>
  );
}

function FilterTab({
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
        "text-xs uppercase tracking-[0.2em] pb-2 transition-colors " +
        (active
          ? "font-bold border-b-2 border-primary -mb-[10px]"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  );
}
