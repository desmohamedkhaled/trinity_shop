"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, CreditCard, LoaderCircle, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useStore } from "@/components/store-provider";
import { formatAUD } from "@/lib/currency";

type Form = { name: string; phone: string; email: string; country: string; governorate: string; city: string; postcode: string; address: string };
type ShippingService = { service: string; name: string; speed?: string; price: number; currency?: string; gst_included?: boolean };
const initial: Form = { name: "", phone: "", email: "", country: "Australia", governorate: "", city: "", postcode: "", address: "" };

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartQuantities, clearCart } = useStore();
  const [form, setForm] = useState<Form>(initial);
  const [whatsapp, setWhatsapp] = useState("");
  const [error, setError] = useState("");
  const [placing, setPlacing] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingServices, setShippingServices] = useState<ShippingService[]>([]);
  const [shippingService, setShippingService] = useState("");
  const [shippingQuote, setShippingQuote] = useState<ShippingService | null>(null);
  const [shippingError, setShippingError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const lineId = (line: (typeof cart)[number]) => `${line.product.id}:${line.variant?.id || "default"}:${line.image?.id || "default"}:${line.is_deposit ? `deposit-${line.deposit_percentage ?? 0}` : "full"}`;
  const items = cart.map((line) => ({ ...line, quantity: cartQuantities[lineId(line)] || 1 }));
  const subtotal = useMemo(() => items.reduce((sum, item) => {
    const price = item.variant?.price ?? item.product.price;
    const payable = item.is_deposit
      ? Math.round(price * Number(item.deposit_percentage ?? 50)) / 100
      : price;
    return sum + payable * item.quantity;
  }, 0), [items]);
  const total = subtotal + (shippingQuote?.price || 0);

  async function loadShippingServices() {
    if (!/^\d{4}$/.test(form.postcode)) return;
    setShippingLoading(true);
    setShippingError("");
    setShippingServices([]);
    setShippingService("");
    setShippingQuote(null);
    try {
      const response = await fetch("/api/shipping/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_postcode: form.postcode,
          items: items.map(({ product, variant, image, quantity }) => ({ id: product.id, variant_id: variant?.id, image_id: image?.id, quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to calculate live shipping.");
      setShippingServices(Array.isArray(data.services) ? data.services : []);
    } catch (shippingLoadError) {
      setShippingError(shippingLoadError instanceof Error ? shippingLoadError.message : "Unable to calculate live shipping.");
    } finally {
      setShippingLoading(false);
    }
  }

  async function selectShippingService(service: string) {
    if (!service) {
      setShippingService("");
      setShippingQuote(null);
      return;
    }
    setShippingLoading(true);
    setShippingError("");
    try {
      const response = await fetch("/api/shipping/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to_postcode: form.postcode,
          service,
          items: items.map(({ product, variant, image, quantity }) => ({ id: product.id, variant_id: variant?.id, image_id: image?.id, quantity })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to calculate the selected shipping service.");
      setShippingService(service);
      setShippingQuote(data.quote);
    } catch (shippingLoadError) {
      setShippingService("");
      setShippingQuote(null);
      setShippingError(shippingLoadError instanceof Error ? shippingLoadError.message : "Unable to calculate the selected shipping service.");
    } finally {
      setShippingLoading(false);
    }
  }

  useEffect(() => { fetch("/api/settings/public", { cache: "no-store" }).then((response) => response.json()).then((data) => setWhatsapp(String(data.whatsapp_number || ""))).catch(() => undefined); }, []);
  useEffect(() => {
    setCanceled(new URLSearchParams(window.location.search).get("canceled") === "1");
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!items.length) { setError("Your cart is empty."); return; }
    setPlacing(true); setError("");
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customer: form, shipping_service: shippingService, items: items.map(({ product, variant, image, quantity, is_deposit, deposit_percentage, remaining_balance }) => ({ id: product.id, variant_id: variant?.id, image_id: image?.id, quantity, is_deposit, deposit_percentage, remaining_balance })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to place your order.");
      sessionStorage.setItem("trinity-last-order", JSON.stringify(data));
      clearCart();
      if (whatsapp && data.order) {
        const order = data.order;
        const orderItems = data.items || [];
        const message = ["Hello Trinity, I would like to place an order.", "", "Customer Details:", `Name: ${order.customer_name}`, `Phone: ${order.customer_phone}`, `Email: ${order.customer_email || "—"}`, `Country: ${order.country}`, `Governorate: ${order.governorate}`, `City: ${order.city}`, `Address: ${order.address}`, "", "Order Summary:", ...orderItems.map((item: { product_name: string; quantity: number; line_total: number }) => `${item.product_name} x ${item.quantity} — ${formatAUD(item.line_total)}`), "", `Subtotal: ${formatAUD(order.subtotal)}`, `Discount: ${formatAUD(order.discount)}`, `Shipping: ${formatAUD(order.shipping)}`, `Total: ${formatAUD(order.total)}`, `Order Number: ${order.order_number}`].join("\n");
        window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
      }
      router.replace(`/checkout/success?order=${encodeURIComponent(data.order.id)}`);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Unable to place your order."); setPlacing(false); }
  }

  async function handleStripeCheckout() {
    if (!items.length) { setError("Your cart is empty."); return; }
    if (!formRef.current?.reportValidity()) return;
    setStripeLoading(true); setError("");
    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: form, shipping_service: shippingService, items: items.map(({ product, variant, image, quantity, is_deposit, deposit_percentage, remaining_balance }) => ({ id: product.id, variant_id: variant?.id, image_id: image?.id, quantity, is_deposit, deposit_percentage, remaining_balance })) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create your Stripe payment session.");
      if (!data.checkoutUrl) throw new Error("Stripe checkout URL was not returned.");
      router.push(data.checkoutUrl);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create your Stripe payment session.");
      setStripeLoading(false);
    }
  }

  if (!items.length) return <><SiteHeader /><main className="grid min-h-[65vh] place-items-center px-5 py-20"><div className="text-center"><h1 className="display-font text-5xl">Your cart is empty.</h1><Link href="/shop" className="mt-6 inline-block rounded-full bg-[#083b68] px-6 py-3 font-bold text-white">Continue shopping</Link></div></main><SiteFooter /></>;
  return <><SiteHeader /><main className="px-5 py-14 md:py-20"><div className="mx-auto max-w-6xl"><Link href="/cart" className="inline-flex items-center gap-2 text-sm font-bold text-black/50"><ArrowLeft size={16} /> Back to cart</Link>{canceled && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Payment was canceled. Your order was not confirmed; you can try again.</p>}<div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]"><form ref={formRef} onSubmit={submit} className="rounded-3xl border border-black/10 bg-white/85 p-6 shadow-sm md:p-8"><p className="text-xs font-bold uppercase tracking-[.28em] text-[#b48d55]">Checkout</p><h1 className="display-font mt-2 text-5xl">Where should we send it?</h1><div className="mt-8 grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Name *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label><label className="text-sm font-bold">Phone *<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label><label className="text-sm font-bold">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label><label className="text-sm font-bold">Country *<input required value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]"   />  </label><label className="text-sm font-bold">State *<input required value={form.governorate} onChange={(event) => setForm({ ...form, governorate: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label><label className="text-sm font-bold">City *<input required value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label>  <label className="text-sm font-bold">Post code *<input required inputMode="numeric" pattern="[0-9]{4}" maxLength={4} value={form.postcode} onChange={(event) => setForm({ ...form, postcode: event.target.value.replace(/\D/g, "").slice(0, 4) })} onBlur={() => void loadShippingServices()} className="mt-2 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label><label className="text-sm font-bold sm:col-span-2">Address *<textarea required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} className="mt-2 min-h-28 w-full rounded-xl border p-3 font-normal outline-none focus:border-[#1267a8]" /></label></div><section className="mt-6 rounded-2xl border border-black/10 p-4"><p className="text-sm font-black">Live shipping</p>{shippingLoading ? <p className="mt-3 text-sm text-black/55">Checking available services...</p> : shippingError ? <p className="mt-3 text-sm text-red-700">{shippingError}</p> : shippingServices.length ? <div className="mt-3 grid gap-2">{shippingServices.map((service) => <button type="button" key={service.service} onClick={() => void selectShippingService(service.service)} className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left ${shippingService === service.service ? "border-[#083b68] bg-[#eef5fa]" : "border-black/10 bg-white"}`}><span><b>{service.name}</b>{service.speed && <small className="block text-black/50">{service.speed}</small>}</span><b>{formatAUD(service.price)}</b></button>)}</div> : <p className="mt-3 text-sm   text-black/55">Enter a valid post code to view live rates.</p>}</section>{error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}<div className="mt-7 grid gap-3"><button type="button" onClick={handleStripeCheckout} disabled={placing || stripeLoading || !shippingQuote} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#083b68] px-5 py-4 font-bold text-white hover:bg-[#1267a8] disabled:opacity-50">{stripeLoading ? <><LoaderCircle size={18} className="animate-spin" /> Preparing Stripe checkout...</> : <><CreditCard size={18} /> Pay securely with Stripe</>}</button>{whatsapp ? <button type="button" onClick={() => window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(["Hello Trinity, I would like to place an order.", "", `Name: ${form.name || ""}`, `Phone: ${form.phone || ""}`, `Email: ${form.email || "—"}`, `Country: ${form.country || ""}`, `Governorate: ${form.governorate || ""}`, `City: ${form.city || ""}`, `Postcode: ${form.postcode || ""}`, `Address: ${form.address || ""}`, "", ...items.map(({ product, quantity }) => `${product.name} x ${quantity} — ${formatAUD(product.price * quantity)}`), "", `Subtotal: ${formatAUD(subtotal)}`, `Shipping: ${formatAUD(shippingQuote?.price || 0)}`, `Total: ${formatAUD(total)}`].join("\n"))}`, "_blank", "noopener,noreferrer")} disabled={placing || stripeLoading || !shippingQuote} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#083b68] bg-white px-5 py-4 font-bold text-[#083b68] hover:bg-[#f5f7fa] disabled:opacity-50"><MessageCircle size={18} /> Continue with WhatsApp</button> : null}<button type="submit" disabled={placing || stripeLoading || !shippingQuote} className="flex w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-[#f5f6f7] px-5 py-4 font-bold text-black hover:bg-[#edf1f4] disabled:opacity-50">{placing ? <><LoaderCircle size={18} className="animate-spin" /> Placing order...</> : "Place order manually"}</button></div></form><aside className="h-fit rounded-3xl border border-black/10 bg-[#fffaf3] p-6 shadow-sm"><h2 className="text-lg font-black">Order summary</h2><div className="mt-5 grid gap-3">{items.map(({ product, quantity }) => <div key={product.id} className="flex justify-between gap-3 text-sm"><span>{product.name} x {quantity}</span><b>{formatAUD(product.price * quantity)}</b></div>)}</div><div className="mt-5 grid gap-2 border-t pt-4 text-sm"><div className="flex justify-between"><span>Subtotal</span><b>{formatAUD(subtotal)}</b></div><div className="flex justify-between"><span>Shipping</span><b>{formatAUD(shippingQuote?.price || 0)}</b></div><div className="flex justify-between text-lg font-black"><span>Total</span><span>{formatAUD(total)}</span></div></div></aside></div></div></main><SiteFooter /></>;
}
