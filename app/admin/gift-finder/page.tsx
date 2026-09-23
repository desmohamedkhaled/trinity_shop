"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Question = {
  id: string;
  question: string;
  sort_order: number;
  is_active: boolean;
  gift_options?: { id: string; label: string; value: string }[];
};

export default function AdminGiftFinder() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/gift-finder", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load Gift Finder");
      setQuestions(Array.isArray(data) ? data : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Could not load Gift Finder"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save(question: Question) {
    const response = await fetch("/api/admin/gift-finder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: question.id, question: draft }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.error || "Could not save question");
      return;
    }
    setEditing(null);
    await load();
  }

  return (
    <div className="p-6 md:p-10">
      <p className="text-sm text-black/45">Marketing</p>
      <h1 className="text-4xl font-black">Gift Finder</h1>
      <p className="mt-2 text-black/55">
        Manage the Gift Finder system, questions, and customer requests.
      </p>

      {/* Navigation Tabs */}
      <div className="mt-8 flex gap-4 border-b">
        <button className="border-b-2 border-[#083b68] px-4 py-3 font-semibold text-[#083b68]">
          Questions
        </button>
        <Link
          href="/admin/gift-finder/requests"
          className="px-4 py-3 font-semibold text-black/50 hover:text-black"
        >
          Requests
        </Link>
      </div>

      {error && (
        <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-3">
        {loading ? (
          <p className="text-sm text-black/50">Loading questions...</p>
        ) : questions.length === 0 ? (
          <p className="rounded-2xl border bg-white p-6 text-sm text-black/50">
            No Gift Finder questions have been configured.
          </p>
        ) : (
          questions.map((question, index) => (
            <div
              key={question.id}
              className="rounded-2xl border bg-white p-5"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-black/40">Question {index + 1}</p>
                  {editing === question.id ? (
                    <input
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      className="mt-1 w-full rounded-lg border p-2 font-bold outline-none focus:border-[#1267a8]"
                    />
                  ) : (
                    <p className="mt-1 font-bold">{question.question}</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(question.gift_options || []).map((option) => (
                      <span
                        key={option.id}
                        className="rounded-full bg-[#f5f6f7] px-3 py-1 text-xs text-black/60"
                      >
                        {option.label}
                      </span>
                    ))}
                  </div>
                </div>
                {editing === question.id ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => save(question)}
                      className="rounded-lg bg-[#083b68] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0a4a7d]"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditing(null)}
                      className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-black/5"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditing(question.id);
                      setDraft(question.question);
                    }}
                    className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-black/5"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
