import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { SiteShell } from "@/components/site/SiteShell";
import { getPublicProduct } from "@/lib/shop.functions";
import { resolveProductImage } from "@/lib/products-images";
import { formatRub } from "@/lib/format";
import { cartStore } from "@/lib/cart-store";
import { Minus, Plus } from "lucide-react";

const productQO = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    queryFn: () => getPublicProduct({ data: { slug } }),
  });

export const Route = createFileRoute("/product/$slug")({
  head: ({ loaderData }) => {
    const product = loaderData as { name?: string; description?: string } | undefined;
    const name = product?.name ?? "Товар";
    const description = product?.description ?? "Свеча ручной работы Nuri";
    return {
      meta: [
        { title: `${name} — Nuri` },
        { name: "description", content: description.slice(0, 160) },
        { property: "og:title", content: `${name} — Nuri` },
        { property: "og:description", content: description.slice(0, 160) },
      ],
    };
  },
  loader: async ({ context, params }) => {
    const product = await context.queryClient.ensureQueryData(productQO(params.slug));
    if (!product) throw notFound();
    return product;
  },
  component: Product,
  notFoundComponent: () => (
    <SiteShell>
      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <h1 className="font-serif text-4xl mb-4">Товар не найден</h1>
        <p className="text-muted-foreground mb-8">
          Возможно, он снят с продажи или ссылка устарела.
        </p>
        <Link
          to="/catalog"
          className="inline-block bg-primary text-primary-foreground px-8 py-3 text-xs font-semibold uppercase tracking-[0.2em]"
        >
          В каталог
        </Link>
      </div>
    </SiteShell>
  ),
});

function Product() {
  const { slug } = Route.useParams();
  const { data: product } = useSuspenseQuery(productQO(slug));
  const [qty, setQty] = useState(1);

  if (!product) return null;
  const image = resolveProductImage(product.slug, product.image_url);

  function addToCart() {
    if (!product) return;
    cartStore.add(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        price: product.price,
      },
      qty,
    );
    toast.success(`«${product.name}» добавлен в корзину`);
  }

  return (
    <SiteShell>
      <section className="max-w-6xl mx-auto px-6 py-16">
        <Link
          to="/catalog"
          className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-primary"
        >
          ← В каталог
        </Link>
        <div className="grid md:grid-cols-2 gap-12 mt-8">
          <div className="aspect-[4/5] bg-secondary overflow-hidden">
            {image && (
              <img
                src={image}
                alt={product.name}
                width={800}
                height={1000}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="flex flex-col">
            <p className="text-[10px] uppercase tracking-[0.3em] text-clay mb-3">
              {product.category === "candle" ? "Свеча" : "Аксессуар"}
            </p>
            <h1 className="font-serif text-5xl mb-4">{product.name}</h1>
            <p className="text-3xl font-serif text-primary mb-8">{formatRub(product.price)}</p>

            <p className="text-muted-foreground leading-relaxed mb-8">{product.description}</p>

            <dl className="grid grid-cols-2 gap-4 mb-10 text-sm border-y border-border py-6">
              {product.scent && (
                <>
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Аромат
                  </dt>
                  <dd className="text-right">{product.scent}</dd>
                </>
              )}
              {product.volume && (
                <>
                  <dt className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Объём
                  </dt>
                  <dd className="text-right">{product.volume}</dd>
                </>
              )}
            </dl>

            <div className="flex items-center gap-6 mb-6">
              <div className="flex items-center border border-border">
                <button
                  className="p-3 hover:bg-muted"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Меньше"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="px-4 w-10 text-center text-sm">{qty}</span>
                <button
                  className="p-3 hover:bg-muted"
                  onClick={() => setQty((q) => Math.min(99, q + 1))}
                  aria-label="Больше"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              <button
                onClick={addToCart}
                className="flex-1 bg-primary text-primary-foreground py-4 text-xs font-semibold uppercase tracking-[0.25em] hover:bg-foreground transition-colors"
              >
                В корзину
              </button>
            </div>
            <p className="text-xs text-muted-foreground italic">
              Доставка по Махачкале от 200 ₽, по России — СДЭК
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
