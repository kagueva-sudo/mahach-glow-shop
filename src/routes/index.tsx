import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { listPublicProducts } from "@/lib/shop.functions";
import heroImg from "@/assets/hero.jpg";

const productsQO = queryOptions({
  queryKey: ["products", "public"],
  queryFn: () => listPublicProducts(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Nuri — свечи ручной работы в Махачкале" },
      {
        name: "description",
        content:
          "Мастерская Nuri в Махачкале. Соевые и восковые свечи ручной работы, аксессуары. Доставка по России.",
      },
      { property: "og:title", content: "Nuri — свечи ручной работы в Махачкале" },
      {
        property: "og:description",
        content: "Свечи и аксессуары ручной работы. Каждая партия — небольшая, каждая свеча — с историей.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQO),
  component: Index,
});

function Index() {
  const { data: products } = useSuspenseQuery(productsQO);
  const featured = products.filter((p) => p.category === "candle").slice(0, 4);

  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative h-[85vh] min-h-[560px] flex items-center justify-center overflow-hidden px-6">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Свеча Nuri"
            width={1920}
            height={1080}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        <div className="relative z-10 text-center max-w-2xl text-background">
          <p className="text-[11px] uppercase tracking-[0.3em] mb-6 opacity-80">
            Махачкала · Ручная работа
          </p>
          <h1 className="font-serif text-5xl md:text-7xl mb-6 leading-[1.05]">
            Свет дагестанских гор
          </h1>
          <p className="text-lg md:text-xl font-light mb-10 italic opacity-90">
            Свечи ручной работы из натурального воска с ароматами каспийского побережья.
          </p>
          <Link
            to="/catalog"
            className="inline-block bg-primary text-primary-foreground px-10 py-4 text-xs font-semibold tracking-[0.25em] uppercase hover:bg-foreground transition-all"
          >
            В каталог
          </Link>
        </div>
      </section>

      {/* About */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <p className="text-[10px] uppercase tracking-[0.3em] text-clay mb-6">О мастерской</p>
        <h2 className="font-serif text-4xl mb-6 leading-tight">
          Каждая свеча — маленькая история о тепле и доме
        </h2>
        <p className="text-muted-foreground leading-relaxed text-balance">
          Мы заливаем свечи небольшими партиями в нашей мастерской в Махачкале.
          Натуральный соевый и пчелиный воск, хлопковый фитиль, авторские
          ароматические композиции. Никакого парафина и красителей.
        </p>
      </section>

      {/* Featured */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-clay mb-3">
              Подборка
            </p>
            <h2 className="font-serif text-4xl">Наши свечи</h2>
          </div>
          <Link
            to="/catalog"
            className="text-xs font-semibold uppercase tracking-[0.25em] underline decoration-primary underline-offset-4 hover:text-primary"
          >
            Смотреть все
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-12">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
