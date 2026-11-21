import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export default function BalanceSuccessPage() {
  return (
    <>
      <SiteHeader />
      <main className="px-5 py-16 md:py-20">
        <div className="mx-auto max-w-xl rounded-3xl border border-black/10 bg-white p-7 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[.24em] text-[#b48d55]">Balance payment</p>
          <h1 className="mt-2 text-4xl font-black text-[#083b68]">Payment confirmation is processing</h1>
          <p className="mt-4 text-sm text-black/55">Your Stripe payment will update the order through the verified webhook.</p>
          <Link href="/shop" className="mt-6 inline-block rounded-xl bg-[#083b68] px-5 py-3 font-bold text-white">Continue shopping</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
