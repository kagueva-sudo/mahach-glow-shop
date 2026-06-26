export function formatRub(amount: number): string {
  return new Intl.NumberFormat("ru-RU").format(amount) + " ₽";
}

export const SHOP_PHONE = "+7 988 234-56-78";
export const SHOP_WHATSAPP = "79882345678";
export const SHOP_ADDRESS = "г. Махачкала, ул. Ленина, 42";
export const SHOP_INSTAGRAM = "@nuri_candles";
export const SHOP_EMAIL = "hello@nuri-candles.ru";
