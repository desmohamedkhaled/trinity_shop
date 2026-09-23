"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Content() {
  const router = useRouter();
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedSection, setSelectedSection] = useState("Hero");

  async function load() {
    try {
      setLoading(true);
      setError("");

      const r = await fetch("/api/settings", {
        cache: "no-store",
      });

      const d = await r.json();

      if (!r.ok) {
        setError(d.error || "Could not load site settings");
        return;
      }

      setHeroTitle(
        typeof d.hero_title === "string" ? d.hero_title : ""
      );

      setHeroSubtitle(
        typeof d.hero_subtitle === "string"
          ? d.hero_subtitle
          : ""
      );
    } catch {
      setError("Could not load site settings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const r = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hero_title: heroTitle,
          hero_subtitle: heroSubtitle,
        }),
      });

      const d = await r.json();

      if (!r.ok) {
        setError(d.error || "Could not save changes");
        return;
      }

      setSaved(true);
    } catch {
      setError("Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 md:p-10">
      <p className="text-sm text-black/45">Content</p>

      <h1 className="text-4xl font-black">
        Homepage & Pages
      </h1>

      <p className="mt-2 text-black/55">
        Manage the homepage content shown on the storefront.
      </p>

      {error && (
        <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6">
          <h2 className="font-bold">
            Homepage sections
          </h2>

          <div className="mt-4 grid gap-2">
            {[
              "Hero",
              "Shop by Occasion",
              "Featured Gifts",
              "Trinity Story",
              "Gift Finder",
              "Final CTA",
            ].map((x) => (
              <button
                type="button"
                key={x}
                onClick={() => {
                  setSelectedSection(x);
                  if (x === "Shop by Occasion") router.push("/admin/occasions");
                  if (x === "Featured Gifts") router.push("/admin/products");
                }}
                aria-pressed={selectedSection === x}
                className={`rounded-xl p-4 text-left text-sm font-semibold transition ${selectedSection === x ? "bg-[#083b68] text-white shadow-md" : "bg-[#f5f6f7] hover:bg-[#e5f0f5]"}`}
              >
                ☰ &nbsp; {x}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-6">
          <h2 className="font-bold">{selectedSection} content</h2>

          {loading ? (
            <div className="mt-5 text-sm text-black/45">
              Loading content...
            </div>
          ) : selectedSection === "Hero" ? (
            <>
              <label className="mt-5 block text-xs font-bold">
                Heading

                <input
                  className="mt-2 w-full rounded-xl border p-3"
                  value={heroTitle}
                  onChange={(e) =>
                    setHeroTitle(e.target.value)
                  }
                  placeholder="Enter homepage heading"
                />
              </label>

              <label className="mt-4 block text-xs font-bold">
                Subheading

                <textarea
                  className="mt-2 w-full rounded-xl border p-3"
                  rows={5}
                  value={heroSubtitle}
                  onChange={(e) =>
                    setHeroSubtitle(e.target.value)
                  }
                  placeholder="Enter homepage subheading"
                />
              </label>

              <button
                onClick={save}
                disabled={saving}
                className="mt-4 rounded-xl bg-[#083b68] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : saved
                  ? "Saved"
                  : "Save changes"}
              </button>
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-[#2479a8]/40 bg-[#f5f6f7] p-4 text-sm leading-6 text-black/60">
              This section is controlled by the current storefront catalog. Select Hero to edit the connected homepage text fields.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}   