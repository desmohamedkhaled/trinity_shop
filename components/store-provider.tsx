 "use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { Product } from "@/lib/data";

type StoreContextType = {
  cart: Product[];
  cartQuantities: Record<string, number>;
  addToCart: (p: Product) => void;
  removeFromCart: (id: string) => void;
  setCartQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  giftList: Product[];
  quantities: Record<string, number>;
  addToGiftList: (p: Product) => void;
  removeFromGiftList: (id: string) => void;
  toggleGiftList: (p: Product) => void;
  setQuantity: (id: string, quantity: number) => void;
  clearGiftList: () => void;
  isInGiftList: (id: string) => boolean;
};

const StoreContext = createContext<StoreContextType | null>(null);

function readStoredValue<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Product[]>([]);
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [giftList, setGiftList] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setCart(readStoredValue<Product[]>("trinity-cart", []));
    setCartQuantities(readStoredValue<Record<string, number>>("trinity-cart-quantities", {}));
    setGiftList(readStoredValue<Product[]>("trinity-gift-list", []));
    setQuantities(readStoredValue<Record<string, number>>("trinity-gift-quantities", {}));
    setHydrated(true);
  }, []);
  useEffect(() => {
    localStorage.setItem("trinity-cart", JSON.stringify(cart));
    localStorage.setItem("trinity-cart-quantities", JSON.stringify(cartQuantities));
    if (!hydrated) return;
    localStorage.setItem("trinity-gift-list", JSON.stringify(giftList));
    localStorage.setItem("trinity-gift-quantities", JSON.stringify(quantities));
  }, [cart, cartQuantities, giftList, hydrated, quantities]);

  const addToCart = (p: Product) => { setCart((items) => items.some((item) => item.id === p.id) ? items : [...items, p]); setCartQuantities((items) => ({ ...items, [p.id]: items[p.id] || 1 })); };
  const removeFromCart = (id: string) => { setCart((items) => items.filter((item) => item.id !== id)); setCartQuantities((items) => { const next = { ...items }; delete next[id]; return next; }); };
  const setCartQuantity = (id: string, quantity: number) => setCartQuantities((items) => ({ ...items, [id]: Math.max(1, Math.min(99, quantity)) }));
  const clearCart = () => { setCart([]); setCartQuantities({}); };
  const addToGiftList = (p: Product) => { setGiftList((x) => x.some(i => i.id === p.id) ? x : [...x, p]); setQuantities(q => ({...q,[p.id]:q[p.id]||1})); };
  const removeFromGiftList = (id: string) => { setGiftList((x) => x.filter(i => i.id !== id)); setQuantities(q => { const n={...q}; delete n[id]; return n; }); };
  const toggleGiftList = (p: Product) => { setGiftList((items) => { if (items.some((item) => item.id === p.id)) return items.filter((item) => item.id !== p.id); return [...items, p]; }); setQuantities((current) => { if (current[p.id]) return current; return { ...current, [p.id]: 1 }; }); };
  const setQuantity = (id:string, quantity:number) => setQuantities(q => ({...q,[id]:Math.max(1,Math.min(99,quantity))}));
  const clearGiftList = () => { setGiftList([]); setQuantities({}); };
  const cartCount = cart.reduce((total, product) => total + (cartQuantities[product.id] || 1), 0);
  return <StoreContext.Provider value={{cart,cartQuantities,addToCart,removeFromCart,setCartQuantity,clearCart,cartCount,giftList,quantities,addToGiftList,removeFromGiftList,toggleGiftList,setQuantity,clearGiftList,isInGiftList: id => giftList.some(i => i.id === id)}}>{children}</StoreContext.Provider>;
}
export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
