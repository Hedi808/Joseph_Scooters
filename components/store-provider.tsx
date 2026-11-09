"use client";
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { dictionaries, type Locale } from "@/lib/i18n";
import type { Product, Variant } from "@/lib/model";
export type CartItem = {
  product: Product;
  variant: Variant | null;
  quantity: number;
};
type State = { cart: CartItem[]; wishlist: Product[]; compare: Product[] };
const initial: State = { cart: [], wishlist: [], compare: [] };
let snapshot = initial;
let raw: string | null = null;
const listeners = new Set<() => void>();
function getSnapshot() {
  try {
    const next = localStorage.getItem("josheph-store-v1");
    if (next !== raw) {
      raw = next;
      const parsed = JSON.parse(next || "null");
      snapshot =
        parsed &&
        Array.isArray(parsed.cart) &&
        Array.isArray(parsed.wishlist) &&
        Array.isArray(parsed.compare)
          ? parsed
          : initial;
    }
  } catch {
    snapshot = initial;
  }
  return snapshot;
}
export function readBrowserStore() {
  return getSnapshot();
}
function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
const Context = createContext<{
  locale: Locale;
  t: typeof dictionaries.fr;
  state: State;
  update: (s: State) => void;
  notice: string;
  notify: (s: string) => void;
}>({
  locale: "fr",
  t: dictionaries.fr,
  state: initial,
  update: () => {},
  notice: "",
  notify: () => {},
});
export function StoreProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => initial);
  const [notice, notify] = useState("");
  function update(s: State) {
    try {
      localStorage.setItem("josheph-store-v1", JSON.stringify(s));
      listeners.forEach((f) => f());
    } catch {
      notify(dictionaries[locale].error);
    }
  }
  return (
    <Context.Provider
      value={{ locale, t: dictionaries[locale], state, update, notice, notify }}
    >
      {children}
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button aria-label="OK" onClick={() => notify("")}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
export const useStore = () => useContext(Context);
