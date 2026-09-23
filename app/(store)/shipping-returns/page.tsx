import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "Shipping & Returns | Trinity Christian Gift Shop",
  description: "Helpful information about shipping, returns, exchanges, and damaged items at Trinity Christian Gift Shop.",
};

export default function ShippingReturnsPage() {
  return (
    <>
      <SiteHeader />
      <main className="store-page min-w-0">
        <div className="trinity-container">
          <section className="pattern-bg rounded-[30px] px-6 py-14 text-center md:px-12 md:py-20">
            <p className="eyebrow text-[#b48d55]">Care after checkout</p>
            <h1 className="display-font mt-3 text-5xl text-[#083b68] md:text-6xl">Shipping &amp; Returns</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-black/60">A clear guide to what happens after you choose a gift with meaning.</p>
          </section>

          <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-2">
            <section className="store-panel p-6 md:p-8">
              <p className="eyebrow text-[#b48d55]">01</p>
              <h2 className="display-font mt-2 text-3xl text-[#083b68]">Shipping</h2>
              <div className="mt-5 grid gap-5 text-sm leading-7 text-black/60">
                <div><h3 className="font-bold text-black">Order processing</h3><p className="mt-1">After checkout, your order details are reviewed so the Trinity team can confirm the request and prepare the next steps.</p></div>
                <div><h3 className="font-bold text-black">Delivery estimates</h3><p className="mt-1">Delivery timing depends on the order details, destination, availability, and any special handling. We will share the relevant details when your order is confirmed.</p></div>
                <div><h3 className="font-bold text-black">Availability and tracking</h3><p className="mt-1">Shipping availability and tracking information can vary by order. Please keep your order details available when contacting us for an update.</p></div>
              </div>
            </section>

            <section className="store-panel p-6 md:p-8">
              <p className="eyebrow text-[#b48d55]">02</p>
              <h2 className="display-font mt-2 text-3xl text-[#083b68]">Returns &amp; Exchanges</h2>
              <div className="mt-5 grid gap-5 text-sm leading-7 text-black/60">
                <div><h3 className="font-bold text-black">Starting a request</h3><p className="mt-1">If you need to discuss a return or exchange, contact Trinity with your order details and a short description of the request.</p></div>
                <div><h3 className="font-bold text-black">Item condition</h3><p className="mt-1">Items should be kept in their original condition while your request is reviewed. Some items may require different handling.</p></div>
                <div><h3 className="font-bold text-black">Refund handling</h3><p className="mt-1">Any available return, exchange, or refund options will be confirmed with you after the order details have been reviewed.</p></div>
              </div>
            </section>

            <section className="rounded-[30px] border border-[#b48d55]/30 bg-[#f8f1e7] p-6 md:p-8">
              <p className="eyebrow text-[#b48d55]">03</p>
              <h2 className="display-font mt-2 text-3xl text-[#083b68]">Damaged or incorrect items</h2>
              <p className="mt-5 text-sm leading-7 text-black/60">Please contact Trinity as soon as you notice a damaged or incorrect item. Include your order details and any useful photos or information so the team can review what happened and guide you through the next step.</p>
            </section>

            <section className="rounded-[30px] border border-black/10 bg-white/70 p-6 md:p-8">
              <p className="eyebrow text-[#b48d55]">04</p>
              <h2 className="display-font mt-2 text-3xl text-[#083b68]">Important notes</h2>
              <ul className="mt-5 grid list-disc gap-3 pl-5 text-sm leading-7 text-black/60">
                <li>Delivery estimates may vary based on the order and destination.</li>
                <li>Personalized or specially prepared items may require different handling.</li>
                <li>Please review your order details carefully before completing checkout.</li>
              </ul>
            </section>
          </div>

          <section className="mx-auto mt-10 max-w-5xl rounded-[30px] bg-[#083b68] p-7 text-white md:flex md:items-center md:justify-between md:gap-8 md:p-9">
            <div><p className="eyebrow text-[#e7c991]">Need help?</p><h2 className="display-font mt-2 text-3xl">We are happy to help with your order.</h2></div>
            <Link href="/contact" className="trinity-button trinity-button-primary mt-6 w-fit bg-white text-[#083b68] hover:bg-[#f8f1e7] md:mt-0">Contact Trinity</Link>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
