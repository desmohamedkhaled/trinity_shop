import Link from "next/link";
import { FaqAccordion } from "@/components/faq-accordion";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata = {
  title: "FAQ | Trinity Christian Gift Shop",
  description: "Answers to common questions about ordering, shipping, gifts, and contacting Trinity Christian Gift Shop.",
};

const faqItems = [
  { question: "How can I place an order?", answer: "Add a gift to your cart, continue to checkout, and enter the requested details. The Trinity team will review the order and confirm the next steps." },
  { question: "How can I track my order?", answer: "Tracking availability depends on the order and delivery arrangement. Contact Trinity with your order details for the latest available update." },
  { question: "How long does shipping take?", answer: "Delivery timing can vary based on the destination, availability, and order details. The expected timing will be discussed when your order is confirmed." },
  { question: "Do you offer international shipping?", answer: "Shipping availability can vary by destination. Please contact Trinity before ordering if you need help confirming whether delivery is available to your location." },
  { question: "Can I return or exchange an item?", answer: "Contact Trinity with your order details and we will review the return or exchange request. Please keep the item in its original condition while the request is being reviewed." },
  { question: "What should I do if my order arrives damaged?", answer: "Contact Trinity as soon as possible with your order details and useful photos or information about the damage so the team can guide you." },
  { question: "Can I request a gift for a special occasion?", answer: "Yes. Use the Gift List or contact form to tell us about the occasion and the kind of gift you are looking for. The Trinity team will contact you to confirm the details." },
  { question: "Do you offer gift wrapping?", answer: "Gift wrapping availability may vary by item and request. Mention it when contacting Trinity so the team can confirm what is possible." },
  { question: "Can I customize a gift?", answer: "Customization depends on the item and the request. Contact Trinity with the product and details you have in mind so the team can advise you." },
  { question: "How can I contact Trinity Christian Gift Shop?", answer: "Use the Contact page to send your name, contact details, and message. The Trinity team will review your request and get in touch." },
];

export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <main className="store-page min-w-0">
        <div className="trinity-container">
          <section className="pattern-bg rounded-[30px] px-6 py-14 text-center md:px-12 md:py-20">
            <p className="eyebrow text-[#b48d55]">A little clarity</p>
            <h1 className="display-font mt-3 text-5xl text-[#083b68] md:text-6xl">Frequently Asked Questions</h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-black/60">Helpful answers for choosing, ordering, and caring for gifts with meaning.</p>
          </section>

          <section className="mx-auto mt-10 max-w-4xl" aria-label="Frequently asked questions">
            <FaqAccordion items={faqItems} />
          </section>

          <section className="mx-auto mt-10 max-w-4xl rounded-[30px] border border-black/10 bg-white/70 p-7 text-center md:p-9">
            <h2 className="display-font text-3xl text-[#083b68]">Still have a question?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-black/60">Send us the details and we will help you find the clearest next step.</p>
            <Link href="/contact" className="trinity-button trinity-button-primary mt-6 inline-flex">Contact Trinity</Link>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
