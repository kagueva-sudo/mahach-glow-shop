import { Link } from "@tanstack/react-router";
import { SHOP_ADDRESS, SHOP_PHONE, SHOP_INSTAGRAM } from "@/lib/format";

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-20 px-6 mt-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
        <div className="md:col-span-2">
          <h4 className="font-serif text-3xl mb-6">Nuri Candle Studio</h4>
          <p className="text-background/60 leading-relaxed max-w-sm">
            Каждое изделие — это история о тепле, доме и красоте Кавказа.
            Мы верим в магию живого огня.
          </p>
        </div>
        <div>
          <h5 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-6">Магазин</h5>
          <ul className="space-y-3 text-sm text-background/60">
            <li><Link to="/catalog" className="hover:text-background">Каталог</Link></li>
            <li><Link to="/delivery" className="hover:text-background">Доставка и оплата</Link></li>
            <li><Link to="/privacy" className="hover:text-background">Политика конфиденциальности</Link></li>
            <li><Link to="/offer" className="hover:text-background">Публичная оферта</Link></li>
          </ul>
        </div>
        <div>
          <h5 className="text-[10px] font-bold uppercase tracking-[0.25em] mb-6">Контакты</h5>
          <ul className="space-y-3 text-sm text-background/60">
            <li>{SHOP_ADDRESS}</li>
            <li>{SHOP_PHONE}</li>
            <li className="text-background font-semibold">{SHOP_INSTAGRAM}</li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-16 pt-8 border-t border-background/10 text-[10px] uppercase tracking-[0.2em] text-background/40 flex flex-wrap justify-between gap-4">
        <span>© {new Date().getFullYear()} Nuri Candles</span>
        <span>Designed in Dagestan</span>
      </div>
    </footer>
  );
}
