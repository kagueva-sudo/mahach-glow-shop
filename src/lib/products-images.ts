// Maps seed product slugs to bundled images. Admin-uploaded images use
// `image_url` directly from the database (full URL or storage path).
import gornyy from "@/assets/products/gornyy-tuman.jpg";
import kaspiyskiy from "@/assets/products/kaspiyskiy-briz.jpg";
import kedrovyy from "@/assets/products/kedrovyy-les.jpg";
import utrenniy from "@/assets/products/utrenniy-svet.jpg";
import medovyy from "@/assets/products/medovyy-vecher.jpg";
import rozovyy from "@/assets/products/rozovyy-sad.jpg";
import zimnyaya from "@/assets/products/zimnyaya-noch.jpg";
import morskaya from "@/assets/products/morskaya-sol.jpg";
import gasitel from "@/assets/products/gasitel.jpg";
import nozhnicy from "@/assets/products/nozhnicy.jpg";

const seedImages: Record<string, string> = {
  "gornyy-tuman": gornyy,
  "kaspiyskiy-briz": kaspiyskiy,
  "kedrovyy-les": kedrovyy,
  "utrenniy-svet": utrenniy,
  "medovyy-vecher": medovyy,
  "rozovyy-sad": rozovyy,
  "zimnyaya-noch": zimnyaya,
  "morskaya-sol": morskaya,
  gasitel,
  nozhnicy,
};

export function resolveProductImage(slug: string, imageUrl: string | null): string {
  if (imageUrl && imageUrl.length > 0) return imageUrl;
  return seedImages[slug] ?? "";
}
