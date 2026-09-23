"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type FaqItem = {
  question: string;
  answer: string;
};

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="grid gap-3">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        const panelId = `faq-answer-${index}`;

        return (
          <div key={item.question} className="overflow-hidden rounded-2xl border border-black/10 bg-white/70">
            <h2>
              <button
                type="button"
                id={`faq-question-${index}`}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left font-bold text-[#083b68] transition-colors hover:bg-[#f8f1e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1267a8] md:px-6"
              >
                <span>{item.question}</span>
                <ChevronDown size={18} className={`shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
              </button>
            </h2>
            <div
              id={panelId}
              role="region"
              aria-labelledby={`faq-question-${index}`}
              className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
            >
              <div className="min-h-0 overflow-hidden">
                <p className="border-t border-black/10 px-5 py-5 text-sm leading-7 text-black/60 md:px-6">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
