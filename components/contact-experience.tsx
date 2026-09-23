"use client";

import { useEffect, useState } from "react";
import { Mail, MessageCircle, Phone } from "lucide-react";

export function ContactExperience() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [whatsapp, setWhatsapp] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    fetch("/api/settings/public", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setWhatsapp(String(data.whatsapp_number || ""));
        setPhoneNumber(String(data.phone_number || ""));
      })
      .catch(() => undefined);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer: { name: form.name, phone: form.phone, email: form.email }, notes: form.message }),
      });
      setState(response.ok ? "sent" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,.78fr)_minmax(0,1.22fr)] lg:items-start">
      <aside className="min-w-0">
        <p className="eyebrow text-[#b48d55]">Contact Trinity</p>
        <h1 className="display-font mt-3 text-5xl leading-tight text-[#083b68] md:text-6xl">Let&apos;s find the right gift.</h1>
        <p className="mt-5 max-w-xl text-lg leading-8 text-black/60">Tell us what you are looking for, share the moment behind the gift, and our team will contact you to confirm the details.</p>

        <div className="mt-8 grid gap-3">
          {phoneNumber && (
            <a href={`tel:${phoneNumber.replace(/[^0-9+]/g, "")}`} className="flex min-w-0 items-start gap-4 rounded-2xl border border-black/10 bg-white/70 p-4 transition-colors hover:border-[#1267a8] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1267a8]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8eef5] text-[#083b68]"><Phone size={18} /></span>
              <span className="min-w-0"><span className="block text-xs font-bold uppercase tracking-[.16em] text-black/45">Phone</span><span className="mt-1 block break-all font-semibold text-[#083b68]">{phoneNumber}</span></span>
            </a>
          )}
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="flex min-w-0 items-start gap-4 rounded-2xl border border-black/10 bg-white/70 p-4 transition-colors hover:border-[#1267a8] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1267a8]">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#e8f4ed] text-[#27734b]"><MessageCircle size={18} /></span>
              <span className="min-w-0"><span className="block text-xs font-bold uppercase tracking-[.16em] text-black/45">WhatsApp</span><span className="mt-1 block break-all font-semibold text-[#083b68]">{whatsapp}</span></span>
            </a>
          )}
          <div className="flex min-w-0 items-start gap-4 rounded-2xl border border-black/10 bg-[#f8f1e7] p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[#083b68]"><Mail size={18} /></span>
            <span className="min-w-0"><span className="block text-xs font-bold uppercase tracking-[.16em] text-black/45">Send a request</span><span className="mt-1 block text-sm leading-6 text-black/60">Use the form and include your order or gift details so we can help quickly.</span></span>
          </div>
        </div>
      </aside>

      <section className="store-panel min-w-0 p-6 md:p-10">
        <h2 className="display-font text-3xl text-[#083b68]">How can we help?</h2>
        <p className="mt-2 text-sm text-black/55">Required fields are marked by the browser.</p>
        <form onSubmit={submit} className="mt-7 grid gap-4">
          <label className="grid gap-2 text-sm font-semibold" htmlFor="contact-name">Name<input id="contact-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="rounded-2xl border border-black/10 bg-white/70 p-4 font-normal outline-none transition-colors focus:border-[#1267a8] focus:ring-2 focus:ring-[#1267a8]/20" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold" htmlFor="contact-phone">Phone / WhatsApp<input id="contact-phone" required type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="rounded-2xl border border-black/10 bg-white/70 p-4 font-normal outline-none transition-colors focus:border-[#1267a8] focus:ring-2 focus:ring-[#1267a8]/20" /></label>
            <label className="grid gap-2 text-sm font-semibold" htmlFor="contact-email">Email<input id="contact-email" required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="rounded-2xl border border-black/10 bg-white/70 p-4 font-normal outline-none transition-colors focus:border-[#1267a8] focus:ring-2 focus:ring-[#1267a8]/20" /></label>
          </div>
          <label className="grid gap-2 text-sm font-semibold" htmlFor="contact-message">Message<textarea id="contact-message" required value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} className="min-h-40 resize-y rounded-2xl border border-black/10 bg-white/70 p-4 font-normal outline-none transition-colors focus:border-[#1267a8] focus:ring-2 focus:ring-[#1267a8]/20" /></label>
          <button type="submit" disabled={state === "sending"} className="trinity-button trinity-button-primary w-full sm:w-fit">{state === "sending" ? "Sending..." : state === "sent" ? "Request sent" : "Send request"}</button>
          {state === "sent" && <p role="status" className="text-sm font-semibold text-[#27734b]">Your request was sent. Trinity will contact you to confirm the details.</p>}
          {state === "error" && <p role="alert" className="text-sm text-red-700">Could not send your request. Please try again.</p>}
        </form>
      </section>
    </div>
  );
}
