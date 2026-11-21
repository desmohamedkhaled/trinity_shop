"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function BalanceCheckoutPage() {
  const [token, setToken] = useState("");
  const [canceled, setCanceled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") || "");
    setCanceled(params.get("canceled") === "1");
  }, []);

  async function startPayment() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/stripe/balance-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create the balance checkout.");
      window.location.href = data.checkoutUrl;
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Unable to start balance payment.");
      setLoading(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="px-5 py-16 md:py-20">
        <div className="mx-auto max-w-xl rounded-3xl border border-black/10 bg-white p-7 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[.24em] text-[#b48d55]">Remaining balance</p>
          <h1 className="mt-2 text-4xl font-black text-[#083b68]">Pay the outstanding amount</h1>
          {canceled && <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Payment was canceled. The balance payment link remains active until its expiry.</p>}
          {!token ? <p className="mt-5 text-sm text-red-700">This balance payment link is missing or invalid.</p> : null}
          {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
          <button type="button" onClick={() => void startPayment()} disabled={!token || loading} className="mt-6 w-full rounded-xl bg-[#083b68] px-5 py-4 font-bold text-white disabled:opacity-50">
            {loading ? "Preparing secure payment..." : "Pay remaining balance"}
          </button>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
