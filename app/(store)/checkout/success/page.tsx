"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useStore } from "@/components/store-provider";

type OrderData = { order: { id: string; order_number: string; customer_name: string; customer_phone: string; customer_email: string | null; country: string; governorate: string; city: string; address: string; subtotal: number; discount: number; shipping: number; total: number; payment_status?: string; status?: string }; items: { product_name: string; quantity: number; unit_price: number; line_total: number }[] };

export default function CheckoutSuccessPage() {
  const [data, setData] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentPending, setPaymentPending] = useState(false);
  const { clearCart } = useStore();
  const clearCartRef = useRef(clearCart);
  useEffect(() => {
    async function load() {
      const params = new URLSearchParams(window.location.search);
      const orderId = params.get("order");
      const sessionId = params.get("session_id");
      try {
        if (sessionId && orderId) {
          const response = await fetch(`/api/stripe/checkout-status?order=${encodeURIComponent(orderId)}&session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Could not verify the payment.");
          const orderData = { order: result.order, items: result.order.order_items || [] };
          setData(orderData);
          const paid = result.order.payment_status === "paid" && result.stripe.paymentStatus === "paid";
          setPaymentPending(!paid);
          if (paid) {
            clearCartRef.current();
            sessionStorage.removeItem("trinity-last-order");
          }
          return;
        }

        const saved = sessionStorage.getItem("trinity-last-order");
        if (saved) setData(JSON.parse(saved));
        else throw new Error("Order confirmation is unavailable.");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not verify the order.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <><SiteHeader /><main className="grid min-h-[65vh] place-items-center px-5 py-20"><p className="text-black/55">Verifying your order...</p></main><SiteFooter /></>;
  if (!data) return <><SiteHeader /><main className="grid min-h-[65vh] place-items-center px-5 py-20"><div className="text-center"><h1 className="display-font text-5xl">Order confirmation unavailable.</h1><p className="mt-3 text-black/55">{error || "Your order may still exist. Please contact Trinity with your details."}</p><Link href="/shop" className="mt-6 inline-block rounded-full bg-[#083b68] px-6 py-3 font-bold text-white">Continue shopping</Link></div></main><SiteFooter /></>;
  const { order, items } = data;
  return <><SiteHeader /><main className="px-5 py-16 md:py-20"><article className="mx-auto max-w-3xl rounded-3xl border border-black/10 bg-white/85 p-6 shadow-sm md:p-10"><div className={`flex items-center gap-3 ${paymentPending ? "text-amber-700" : "text-green-700"}`}>{paymentPending ? <span className="text-2xl">...</span> : <CheckCircle2 size={30} />}<span className="font-bold">{paymentPending ? "Payment processing" : "Order confirmed"}</span></div><h1 className="display-font mt-4 text-5xl">{paymentPending ? "Your payment is being processed." : "Thank you for your order."}</h1>{paymentPending && <p className="mt-3 text-black/55">We received the checkout return, but Stripe has not confirmed the payment yet. Your order will update when the payment event is received.</p>}<div className="mt-8 rounded-2xl bg-[#f5f6f7] p-5"><p className="text-sm text-black/50">Order number</p><p className="mt-1 text-2xl font-black text-[#083b68]">{order.order_number || "Processing"}</p></div><div className="mt-8 grid gap-6 sm:grid-cols-2"><div><h2 className="font-black">Customer</h2><p className="mt-2 text-sm leading-7 text-black/60">{order.customer_name || "—"}<br />{order.customer_phone || "—"}<br />{order.customer_email || "No email"}</p></div><div><h2 className="font-black">Shipping address</h2><p className="mt-2 text-sm leading-7 text-black/60">{order.country || "—"}<br />{order.governorate ? `${order.governorate}, ${order.city}` : order.city || "—"}<br />{order.address || "—"}</p></div></div><div className="mt-8"><h2 className="font-black">Order summary</h2>{items.length ? <div className="mt-3 grid gap-2">{items.map((item, index) => <div key={`${item.product_name}-${index}`} className="flex justify-between gap-4 border-b border-black/5 py-2 text-sm"><span>{item.product_name} x {item.quantity}</span><b>${Number(item.line_total).toFixed(2)}</b></div>)}</div> : <p className="mt-3 text-sm text-black/50">Your payment has been received and the order is being finalized.</p>}<div className="mt-5 grid gap-2 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>${Number(order.subtotal).toFixed(2)}</span></div><div className="flex justify-between"><span>Discount</span><span>${Number(order.discount).toFixed(2)}</span></div><div className="flex justify-between"><span>Shipping</span><span>${Number(order.shipping).toFixed(2)}</span></div><div className="flex justify-between border-t pt-3 text-lg font-black"><span>Total</span><span>${Number(order.total).toFixed(2)}</span></div></div></div><Link href="/shop" className="mt-8 inline-block rounded-full bg-[#083b68] px-6 py-3 font-bold text-white">Continue shopping</Link></article></main><SiteFooter /></>;
}
