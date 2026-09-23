 "use client";
import type { Product } from "@/lib/data";
import { useStore } from "./store-provider";
export function AddGiftButton({product}:{product:Product}) {
 const {toggleGiftList,isInGiftList}=useStore();
 return <button onClick={()=>toggleGiftList(product)} className="rounded-full bg-[#083b68] px-7 py-4 text-sm font-bold text-white hover:-translate-y-1 transition">{isInGiftList(product.id)?"Remove from Wishlist":"Add to Wishlist"}</button>;
}
