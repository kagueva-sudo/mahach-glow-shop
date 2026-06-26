import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { SiteShell } from "@/components/site/SiteShell";
import { ProductCard } from "@/components/site/ProductCard";
import { listPublicProducts, getHeroImageUrl } from "@/lib/shop.functions";
import heroImgFallback from "@/assets/hero.jpg";

const productsQO = queryOptions({
  queryKey: ["products", "public"],
  queryFn: () => listPublicProducts(),
});

const heroQO = queryOptions({
  queryKey: ["site", "hero"],
  queryFn: () => getHeroImageUrl(),
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
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(productsQO),
      context.queryClient.ensureQueryData(heroQO),
    ]);
  },
  component: Index,
});

function Index() {
  const { data: products } = useSuspenseQuery(productsQO);
  const { data: hero } = useSuspenseQuery(heroQO);
  const featured = products.filter((p) => p.category === "candle").slice(0, 4);
  const heroSrc = hero?.url ?? heroImgFallback;

  return (
    <SiteShell>
      {/* Hero */}
      <section className="relative h-[88vh] min-h-[600px] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroSrc}
            alt="Свеча Nuri"
            width={1920}
            height={1080}
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 75% 65% at 25% 32%, rgba(20,12,8,0.72) 0%, rgba(20,12,8,0.35) 48%, transparent 78%)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-3xl text-background px-6 md:px-16 pt-24 md:pt-32 animate-in fade-in slide-in-from-left-8 duration-1000">
          <div className="flex items-center gap-4 mb-8">
            <span className="block h-px w-10 bg-clay" />
            <p className="text-[11px] uppercase tracking-[0.4em] font-semibold text-clay">
              Махачкала · Ручная работа
            </p>
          </div>

          <h1 className="font-serif mb-8 leading-[0.95] tracking-tight text-5xl md:text-7xl drop-shadow-[0_2px_22px_rgba(0,0,0,0.5)]">
            <span className="block italic font-black text-clay opacity-0 animate-[fade-in_1s_ease-out_0.2s_forwards]">Свет</span>
            <span className="block font-light opacity-0 animate-[fade-in_1s_ease-out_0.7s_forwards]">дагестанских</span>
            <span className="block font-light opacity-0 animate-[fade-in_1s_ease-out_1.2s_forwards]">гор</span>
          </h1>

          <p className="text-lg md:text-xl italic font-light leading-relaxed mb-12 max-w-md border-l-2 border-clay/50 pl-6 opacity-95">
            Свечи ручной работы из натурального воска с ароматами каспийского побережья.
          </p>

          <Link
            to="/catalog"
            className="group relative inline-flex items-center bg-foreground text-background px-10 py-4 text-xs font-semibold tracking-[0.25em] uppercase transition-all duration-300 hover:bg-clay hover:pl-12"
          >
            В каталог
            <span className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
              →
            </span>
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
