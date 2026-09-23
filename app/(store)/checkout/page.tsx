"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, LoaderCircle, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useStore } from "@/components/store-provider";

type Form = { name: string; phone: string; email: string; country: string; governorate: string; city: string; address: string };
const initial: Form = { name: "", phone: "", email: "", country: "", governorate: "", city: "", address: "" };

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartQuantities, clearCart } = useStore();
  const [form, setForm] = useState<Form>(initial);
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);
  const items = cart.map((product) => ({ product, quantity: cartQuantities[product.id] || 1 }));
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0), [items]);

  useEffect(() => { fetch("/api/settings/public", { cache: "no-store" }).then((response) => response.json()).then((data) => setWhatsapp(String(data.whatsapp_number || ""))).catch(() => undefined); }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!items.length) { setError("Your cart is empty."); return; }
    setPlacing(true); setError("");
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer: form, items: items.map(({ product, quantity }) => ({ id: product.id, quantity })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to place your order.");
      sessionStorage.setItem("trinity-last-order", JSON.stringify(data));
      clearCart();
      if (whatsapp && data.order) {
        const order = data.order;
        const orderItems = data.items || [];
        const message = ["Hello Trinity, I would like to place an order.", "", "Customer Details:", `Name: ${order.customer_name}`, `Phone: ${order.customer_phone}`, `Email: ${order.customer_email || "—"}`, `Country: ${order.country}`, `Governorate: ${order.governorate}`, `City: ${order.city}`, `Address: ${order.address}`, "", "Order Summary:", ...orderItems.map((item: { product_name: string; quantity: number; line_total: number }) => `${item.product_name} x ${item.quantity} — $${Number(item.line_total).toFixed(2)}`), "", `Subtotal: $${Number(order.subtotal).toFixed(2)}`, `Discount: $${Number(order.discount).toFixed(2)}`, `Shipping: $${Number(order.shipping).toFixed(2)}`, `Total: $${Number(order.total).toFixed(2)}`, `Order Number: ${order.order_number}`].join("\n");
        window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      }
      router.replace(`/checkout/success?order=${encodeURIComponent(data.order.id)}`);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Unable to place your order."); setPlacing(false); }
  }

  if (!items.length) return <><SiteHeader /><main className="grid min-h-[65vh] place-items-center px-5 py-20"><div className="text-center"><h1 className="display-font text-5xl">Your cart is empty.</h1><Link href="/shop" className="mt-6 inline-block rounded-full bg-[#083b68] px-6 py-3 font-bold text-white">Continue shopping</Link></div></main><SiteFooter /></>;
  return <><SiteHeader /><main className="px-5 py-14 md:py-20"><div className="mx-auto max-w-6xl"><Link href="/cart" className="inline-flex items-center gap-2 text-sm font-bold text-black/50"><ArrowLeft size={16} /> Back to cart</Link><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]"><form onSubmit={submit} className="rounded-3xl border border-black/10 bg-white/85 p-6 shadow-sm md:p-8"><p className="text-xs font-bold uppercase tracking-[.28em] text-[#b48d55]">Checkout</p><h1 className="display-font mt-2 text-5xl">Where should we send it?</h1><div className="mt-8 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Name *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label><label className="text-sm font-bold">Phone *<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label><label className="text-sm font-bold">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label><label className="text-sm font-bold">Country *<input required value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label><label className="text-sm font-bold">Governorate *<input required value={form.governorate} onChange={(event) => setForm({ ...form, governorate: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label><label className="text-sm font-bold">City *<input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label><label className="text-sm font-bold sm:col-span-2">Address *<textarea required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="mt-2 min-h-28 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label></div>{error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}<button disabled={placing} className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-[#083b68] px-5 py-4 font-bold text-white hover:bg-[#1267a8] disabled:opacity-50">{placing ? <><LoaderCircle size={18} className="animate-spin" /> Placing order...</> : <><MessageCircle size={18} /> Place order</>}</button></form><aside className="h-fit rounded-3xl border border-black/10 bg-[#fffaf3] p-6 shadow-sm"><h2 className="text-lg font-black">Order summary</h2><div className="mt-5 grid gap-3">{items.map(({ product, quantity }) => <div key={product.id} className="flex justify-between gap-3 text-sm"><span>{product.name} x {quantity}</span><b>${(product.price * quantity).toFixed(2)}</b></div>)}</div><div className="mt-5 flex justify-between border-t pt-4 text-lg font-black"><span>Total</span><span>${subtotal.toFixed(2)}</span></div><p className="mt-3 text-xs text-black/50">Discount and shipping are calculated securely when the order is created.</p></aside></div></div></main><SiteFooter /></>;
}
