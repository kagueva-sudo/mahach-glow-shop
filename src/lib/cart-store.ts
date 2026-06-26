import { useSyncExternalStore } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  quantity: number;
};

const STORAGE_KEY = "nuri-cart-v1";
let state: CartItem[] = [];
const listeners = new Set<() => void>();

function load(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function emit() {
  for (const l of listeners) l();
}

function init() {
  if (typeof window === "undefined") return;
  state = load();
}
init();

export const cartStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot(): CartItem[] {
    return state;
  },
  getServerSnapshot(): CartItem[] {
    return EMPTY;
  },
  add(item: Omit<CartItem, "quantity">, qty = 1) {
    const existing = state.find((i) => i.productId === item.productId);
    if (existing) {
      state = state.map((i) =>
        i.productId === item.productId ? { ...i, quantity: i.quantity + qty } : i,
      );
    } else {
      state = [...state, { ...item, quantity: qty }];
    }
    persist();
    emit();
  },
  setQuantity(productId: string, qty: number) {
    state = state
      .map((i) => (i.productId === productId ? { ...i, quantity: qty } : i))
      .filter((i) => i.quantity > 0);
    persist();
    emit();
  },
  remove(productId: string) {
    state = state.filter((i) => i.productId !== productId);
    persist();
    emit();
  },
  clear() {
    state = [];
    persist();
    emit();
  },
};

export function useCart(): CartItem[] {
  return useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
