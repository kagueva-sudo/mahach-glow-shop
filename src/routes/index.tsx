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
      <section className="relative h-[88vh] min-h-[600px] flex items-end justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroSrc}
            alt="Свеча Nuri"
            width={1920}
            height={1080}
            className="w-full h-full object-cover"
          />
          {/* soft vignette so edges hold the frame */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 45%, rgba(20,12,8,0.45) 100%)",
            }}
          />
          {/* bottom gradient panel for text legibility */}
          <div className="absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-[#1a110a]/85 via-[#1a110a]/55 to-transparent" />
        </div>

        <div className="relative z-10 text-center max-w-2xl text-background px-6 pb-16 md:pb-24">
          <p className="text-[11px] uppercase tracking-[0.35em] mb-5 opacity-85">
            Махачкала · Ручная работа
          </p>
          <h1 className="font-serif text-5xl md:text-7xl mb-5 leading-[1.05] drop-shadow-[0_2px_18px_rgba(0,0,0,0.35)]">
            Свет дагестанских гор
          </h1>
          <p className="text-base md:text-lg font-light mb-9 italic opacity-95 max-w-xl mx-auto">
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
