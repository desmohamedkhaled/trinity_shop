"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, MessageCircle, Sparkles, X } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { AddToCartButton } from "@/components/add-to-cart-button";
import type { Product } from "@/lib/data";

type Question = {
  id: string;
  question: string;
  sort_order: number;
  is_active: boolean;
  gift_options?: Array<{ id: string; label: string; value: string }>;
};

type Answers = Record<string, string>;

export default function GiftFinder() {
  const [products, setProducts] = useState<Product[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answers>({});
  const [step, setStep] = useState(-1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpSent, setHelpSent] = useState(false);
  const [helpLoading, setHelpLoading] = useState(false);

  const load = useCallback(async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 8000);
      try {
        setLoading(true);
        setError("");
        const [productsRes, questionsRes] = await Promise.all([
          fetch("/api/catalog/products", { cache: "no-store", signal: controller.signal }),
          fetch("/api/catalog/gift-finder", { cache: "no-store", signal: controller.signal }),
        ]);

        if (!productsRes.ok) throw new Error("We couldn't load the catalog. Please try again.");
        const productsData = await productsRes.json();
        setProducts(Array.isArray(productsData) ? productsData : []);

        if (questionsRes.ok) {
          const questionsData = await questionsRes.json();
          setQuestions(
            Array.isArray(questionsData)
              ? questionsData.filter((q: Question) => q.is_active)
              : []
          );
        }
      } catch (err) {
        setError(
          err instanceof DOMException && err.name === "AbortError"
            ? "Loading took too long. Please try again."
            : err instanceof Error
            ? err.message
            : "We couldn't find your recommendations right now. Please try again."
        );
      } finally {
        window.clearTimeout(timeout);
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Calculate matching score for products
  const results = useMemo(() => {
    if (!products.length) return [];

    return products
      .map((product) => {
        let score = 0;
        const giftFor = product.giftFor || [];
        const occasion = product.occasion || [];

        // Gift for matching
        const answerGiftFor = answers[questions[0]?.id] || "";
        if (answerGiftFor && giftFor.includes(answerGiftFor)) score += 5;

        // Occasion matching
        const answerOccasion = answers[questions[1]?.id] || "";
        if (answerOccasion && occasion.includes(answerOccasion)) score += 5;

        // Category matching
        const answerCategory = answers[questions[3]?.id] || "";
        if (
          answerCategory &&
          answerCategory !== "Any" &&
          product.category === answerCategory
        )
          score += 4;

        // Budget matching
        const answerBudget = answers[questions[2]?.id] || "";
        if (answerBudget === "Under 500" && product.price < 500) score += 4;
        else if (
          answerBudget === "500–1,000" &&
          product.price >= 500 &&
          product.price <= 1000
        )
          score += 4;
        else if (
          answerBudget === "1,000–2,000" &&
          product.price > 1000 &&
          product.price <= 2000
        )
          score += 4;
        else if (
          answerBudget === "2,000–5,000" &&
          product.price > 2000 &&
          product.price <= 5000
        )
          score += 4;
        else if (answerBudget === "5,000+" && product.price > 5000) score += 4;

        // Featured product bonus
        if (product.featured) score += 2;

        // Preference matching
        const answerPreferences = answers[questions[4]?.id] || "";
        const terms = answerPreferences.toLowerCase().split(/\s+/).filter(Boolean);
        if (
          terms.some((term) =>
            `${product.name} ${product.description} ${product.meaning}`
              .toLowerCase()
              .includes(term)
          )
        )
          score += 1;

        return { product, score };
      })
      .filter(({ product }) => (product.stock ?? 0) > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [answers, products, questions]);

  // Handle help form submission
  async function submitHelp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setHelpLoading(true);
    setError("");

    try {
      const form = new FormData(event.currentTarget);
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "gift_finder",
          customer: {
            name: form.get("name"),
            phone: form.get("phone"),
            email: form.get("email"),
          },
          giftFor: answers[questions[0]?.id] || null,
          occasion: answers[questions[1]?.id] || null,
          budgetMin: null,
          budgetMax: null,
          category: answers[questions[3]?.id] || null,
          preferences: answers[questions[4]?.id] || null,
          notes: form.get("message") || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Could not send request");
      }

      setHelpSent(true);
      setTimeout(() => {
        setHelpOpen(false);
        setHelpSent(false);
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't send your request right now. Please try again."
      );
    } finally {
      setHelpLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <SiteHeader />
        <main className="grid min-h-[75vh] place-items-center px-5 py-16 md:py-20">
          <div className="text-center">
            <Loader2 className="mx-auto animate-spin text-[#b48d55]" size={32} />
            <p className="mt-4 text-black/60">Finding gifts with meaning...</p>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-[75vh] px-5 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="store-panel px-6 py-14 text-center md:px-16">
            <Sparkles className="mx-auto text-[#b48d55]" size={32} />
            <p className="mt-4 text-xs font-bold uppercase tracking-[.28em] text-[#b48d55]">
              Gift Finder
            </p>
            <h1 className="display-font mt-3 text-5xl leading-tight md:text-7xl">
              {step < 0
                ? "Find a Gift With Meaning"
                : step < questions.length
                  ? questions[step].question
                  : "Your Gift Matches"}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-black/60">
              {step < 0
                ? "Tell us a little about who you're gifting, and we'll help you find something meaningful."
                : step < questions.length
                  ? `Step ${step + 1} of ${questions.length}`
                  : results.length > 0
                    ? "We found gifts we think could be meaningful."
                    : "We couldn't find a perfect match, but browse our collection or get personal help."}
            </p>

            {error && (
              <div role="alert" className="mx-auto mt-5 max-w-xl rounded-xl bg-red-50 p-4 text-left text-sm text-red-700"><p>{error}</p><button type="button" onClick={load} className="mt-3 font-bold underline">Try again</button></div>
            )}

            {/* Starting screen */}
            {step < 0 && (
              <button
                onClick={() => {
                  setStep(0);
                  setAnswers({});
                  setError("");
                }}
                className="mt-8 rounded-full bg-[#083b68] px-7 py-4 font-bold text-white"
              >
                Start Gift Finder
              </button>
            )}

            {/* Questions */}
            {step >= 0 && step < questions.length && (
              <>
                <div className="mx-auto mt-9 grid max-w-2xl gap-3 sm:grid-cols-2">
                  {questions[step].gift_options?.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setAnswers({
                          ...answers,
                          [questions[step].id]: option.value,
                        });
                        setStep(step + 1);
                      }}
                      className="group rounded-2xl border border-black/10 bg-white/75 px-5 py-4 text-left font-semibold transition hover:border-[#1267a8] hover:bg-white hover:-translate-y-0.5"
                    >
                      {option.label}
                      <ArrowRight
                        className="float-right transition group-hover:translate-x-1"
                        size={18}
                      />
                    </button>
                  ))}
                </div>

                <div className="mt-7 flex justify-center gap-4">
                  {step > 0 && (
                    <button
                      onClick={() => setStep(step - 1)}
                      className="inline-flex items-center gap-2 text-sm font-bold text-black/55 transition hover:text-black"
                    >
                      <ArrowLeft size={16} /> Back
                    </button>
                  )}
                  <button
                    onClick={() => setStep(step + 1)}
                    className="text-sm font-bold text-[#1267a8] transition hover:text-[#083b68]"
                  >
                    Skip
                  </button>
                </div>
              </>
            )}

            {/* Results */}
            {step >= questions.length && (
              <>
                {results.length > 0 && (
                  <button
                    onClick={() => setStep(step + 1)}
                    className="mt-8 rounded-full bg-[#083b68] px-7 py-4 font-bold text-white transition hover:bg-[#0a4a7d]"
                  >
                    View Your Matches
                  </button>
                )}
              </>
            )}
          </div>

          {/* Results grid */}
          {step > questions.length && results.length > 0 && (
            <div className="mt-16">
              <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                {results.map(({ product }) => (
                  <div key={product.id} className="group">
                    <ProductCard product={product} />
                    <div className="mt-3 flex gap-2">
                      <div className="flex-1">
                        <AddToCartButton product={product} />
                      </div>
                      <Link
                        href={`/products/${product.slug}`}
                        className="flex-1 rounded-lg border border-black/10 bg-white/60 px-4 py-2 text-center text-sm font-semibold transition hover:bg-white"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:justify-center">
                <button
                  onClick={() => setStep(-1)}
                  className="rounded-full border border-black/15 px-6 py-3 font-bold transition hover:bg-white"
                >
                  Start Over
                </button>
                <Link
                  href="/shop"
                  className="rounded-full border border-black/15 px-6 py-3 text-center font-bold transition hover:bg-white"
                >
                  Browse All Gifts
                </Link>
                <button
                  onClick={() => setHelpOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#083b68] px-6 py-3 font-bold text-white transition hover:bg-[#0a4a7d]"
                >
                  <MessageCircle size={18} /> Get Personal Help
                </button>
              </div>
            </div>
          )}

          {/* No results */}
          {step > questions.length && results.length === 0 && (
            <div className="mt-16 rounded-3xl border bg-white/85 p-8 text-center sm:p-12">
              <p className="text-sm text-black/50">
                We couldn&apos;t find a perfect match yet.
              </p>
              <h2 className="display-font mt-3 text-3xl">
                Let&apos;s find something together.
              </h2>
              <p className="mt-4 text-black/60">
                Get personal help from our Trinity team to find the perfect gift
                for your special moment.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                <button
                  onClick={() => setStep(-1)}
                  className="rounded-full border border-black/15 px-6 py-3 font-bold transition hover:bg-white"
                >
                  Start Over
                </button>
                <Link
                  href="/shop"
                  className="rounded-full border border-black/15 px-6 py-3 text-center font-bold transition hover:bg-white"
                >
                  Browse All Gifts
                </Link>
                <button
                  onClick={() => setHelpOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#083b68] px-6 py-3 font-bold text-white transition hover:bg-[#0a4a7d]"
                >
                  <MessageCircle size={18} /> Get Personal Help
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Help modal */}
      {helpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5 py-10">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl md:p-8">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.28em] text-[#b48d55]">
                  Get Help
                </p>
                <h2 className="display-font mt-2 text-3xl">
                  {helpSent ? "Request Sent" : "Personal Recommendation"}
                </h2>
              </div>
              {!helpSent && (
                <button
                  onClick={() => setHelpOpen(false)}
                  className="rounded-lg p-2 hover:bg-black/5"
                  aria-label="Close"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {helpSent ? (
              <div className="mt-6 text-center">
                <Check className="mx-auto text-green-600" size={48} />
                <p className="mt-4 text-black/60">
                  Your request has been sent to Trinity. We&apos;ll review your
                  preferences and reach out soon!
                </p>
              </div>
            ) : (
              <form onSubmit={submitHelp} className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-semibold">
                    Your Name *
                  </label>
                  <input
                    required
                    name="name"
                    type="text"
                    className="mt-2 w-full rounded-lg border p-3 outline-none focus:border-[#1267a8]"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold">
                      Phone *
                    </label>
                    <input
                      required
                      name="phone"
                      type="tel"
                      className="mt-2 w-full rounded-lg border p-3 outline-none focus:border-[#1267a8]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold">Email</label>
                    <input
                      name="email"
                      type="email"
                      className="mt-2 w-full rounded-lg border p-3 outline-none focus:border-[#1267a8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold">
                    Additional Message
                  </label>
                  <textarea
                    name="message"
                    rows={4}
                    placeholder="Tell us more about what you're looking for..."
                    className="mt-2 w-full rounded-lg border p-3 outline-none focus:border-[#1267a8]"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setHelpOpen(false)}
                    className="flex-1 rounded-lg border px-4 py-2 font-semibold transition hover:bg-black/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={helpLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#083b68] px-4 py-2 font-semibold text-white transition hover:bg-[#0a4a7d] disabled:opacity-60"
                  >
                    {helpLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} /> Sending...
                      </>
                    ) : (
                      "Send Request"
                    )}
                  </button>
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      <SiteFooter />
    </>
  );
}
