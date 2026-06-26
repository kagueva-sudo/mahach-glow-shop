import { Link } from "@tanstack/react-router";
import { resolveProductImage } from "@/lib/products-images";
import { formatRub } from "@/lib/format";
import type { ProductDTO } from "@/lib/shop.functions";

export function ProductCard({ product }: { product: ProductDTO }) {
  const image = resolveProductImage(product.slug, product.image_url);
  return (
    <Link
      to="/product/$slug"
      params={{ slug: product.slug }}
      className="group block"
    >
      <div className="relative aspect-[4/5] mb-4 overflow-hidden bg-secondary">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            width={800}
            height={1000}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-xs text-muted-foreground">
            Без фото
          </div>
        )}
      </div>
      <h3 className="font-serif text-xl mb-1">{product.name}</h3>
      <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] mb-3">
        {product.category === "candle" ? "Свеча" : "Аксессуар"}
        {product.volume ? ` · ${product.volume}` : ""}
      </p>
      <div className="flex justify-between items-baseline">
        <span className="text-lg font-medium">{formatRub(product.price)}</span>
        <span className="text-[11px] font-semibold uppercase tracking-widest underline decoration-primary underline-offset-4">
          Подробнее
        </span>
      </div>
    </Link>
  );
}
