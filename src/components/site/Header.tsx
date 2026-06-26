import { Link } from "@tanstack/react-router";
import { ShoppingBag, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart, cartCount } from "@/lib/cart-store";

export function Header() {
  const cart = useCart();
  const count = cartCount(cart);
  const [open, setOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        <Link
          to="/"
          className="font-serif text-2xl font-bold tracking-tight text-primary uppercase"
        >
          Nuri
        </Link>
        <div className="hidden md:flex space-x-10 text-xs font-semibold uppercase tracking-[0.2em] items-center">
          <Link to="/" activeOptions={{ exact: true }} className="hover:text-primary transition-colors [&.active]:text-primary">
            Главная
          </Link>
          <Link to="/catalog" className="hover:text-primary transition-colors [&.active]:text-primary">
            Каталог
          </Link>
          <Link to="/delivery" className="hover:text-primary transition-colors [&.active]:text-primary">
            Доставка
          </Link>
          <Link to="/cart" className="flex items-center gap-2 hover:text-primary transition-colors [&.active]:text-primary">
            <ShoppingBag className="h-4 w-4" />
            Корзина
            {count > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
                {count}
              </span>
            )}
          </Link>
        </div>
        <button
          className="md:hidden p-2 text-primary"
          onClick={() => setOpen((v) => !v)}
          aria-label="Меню"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="md:hidden border-t border-border bg-background">
          <div className="px-6 py-4 flex flex-col gap-4 text-sm uppercase tracking-widest">
            <Link to="/" onClick={() => setOpen(false)}>Главная</Link>
            <Link to="/catalog" onClick={() => setOpen(false)}>Каталог</Link>
            <Link to="/delivery" onClick={() => setOpen(false)}>Доставка</Link>
            <Link to="/cart" onClick={() => setOpen(false)}>
              Корзина {count > 0 && `(${count})`}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
