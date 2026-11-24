"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  homepageContentDefaults,
  homepageContentKeys,
  type HomepageContent,
  type HomepageContentKey,
} from "@/lib/homepage-content";

type SectionName = "Hero" | "Shop by Occasion" | "Featured Gifts" | "Trinity Story" | "Gift Finder" | "Final CTA";
type SectionField = { key: HomepageContentKey; label: string; multiline?: boolean };

const sectionContentFields: Record<Exclude<SectionName, "Hero" | "Shop by Occasion" | "Featured Gifts">, SectionField[]> = {
  "Trinity Story": [
    { key: "trinity_story_eyebrow", label: "Eyebrow" },
    { key: "trinity_story_title", label: "Heading" },
    { key: "trinity_story_emphasis", label: "Emphasized heading" },
    { key: "trinity_story_text", label: "Description", multiline: true },
    { key: "trinity_story_link", label: "Link text" },
  ],
  "Gift Finder": [
    { key: "gift_finder_eyebrow", label: "Eyebrow" },
    { key: "gift_finder_title", label: "Heading" },
    { key: "gift_finder_text", label: "Description", multiline: true },
    { key: "gift_finder_button", label: "Button text" },
  ],
  "Final CTA": [
    { key: "final_cta_eyebrow", label: "Eyebrow" },
    { key: "final_cta_title", label: "Heading" },
    { key: "final_cta_text", label: "Description", multiline: true },
    { key: "final_cta_button", label: "Button text" },
  ],
};

const sections: SectionName[] = [
  "Hero",
  "Shop by Occasion",
  "Featured Gifts",
  "Trinity Story",
  "Gift Finder",
  "Final CTA",
];

function getSectionFields(section: SectionName): SectionField[] | null {
  if (section === "Trinity Story" || section === "Gift Finder" || section === "Final CTA") {
    return sectionContentFields[section];
  }
  return null;
}

export default function Content() {
  const router = useRouter();
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedSection, setSelectedSection] = useState<SectionName>("Hero");
  const [homepageContent, setHomepageContent] = useState<HomepageContent>(homepageContentDefaults);

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

      const nextHomepageContent = { ...homepageContentDefaults };
      for (const key of homepageContentKeys) {
        if (typeof d[key] === "string") nextHomepageContent[key] = d[key];
      }
      setHomepageContent(nextHomepageContent);
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
    let updates: Record<string, string>;
    if (selectedSection === "Hero") {
      updates = { hero_title: heroTitle, hero_subtitle: heroSubtitle };
    } else {
      const fields = getSectionFields(selectedSection);
      if (!fields) {
        setError("Select an editable homepage section.");
        return;
      }
      updates = Object.fromEntries(fields.map(({ key }) => [key, homepageContent[key]]));
    }

    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const r = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
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

  const activeFields = getSectionFields(selectedSection);

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
            {sections.map((x) => (
              <button
                type="button"
                key={x}
                onClick={() => {
                  setSelectedSection(x);
                  setSaved(false);
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
                  onChange={(e) => {
                    setHeroTitle(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="Enter homepage heading"
                />
              </label>

              <label className="mt-4 block text-xs font-bold">
                Subheading

                <textarea
                  className="mt-2 w-full rounded-xl border p-3"
                  rows={5}
                  value={heroSubtitle}
                  onChange={(e) => {
                    setHeroSubtitle(e.target.value);
                    setSaved(false);
                  }}
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
          ) : activeFields ? (
            <>
              {activeFields.map(({ key, label, multiline }) => (
                <label key={key} className="mt-5 block text-xs font-bold">
                  {label}
                  {multiline ? (
                    <textarea
                      className="mt-2 w-full rounded-xl border p-3"
                      rows={5}
                      maxLength={500}
                      value={homepageContent[key]}
                      onChange={(event) => {
                        setHomepageContent((current) => ({ ...current, [key]: event.target.value }));
                        setSaved(false);
                      }}
                    />
                  ) : (
                    <input
                      className="mt-2 w-full rounded-xl border p-3"
                      maxLength={500}
                      value={homepageContent[key]}
                      onChange={(event) => {
                        setHomepageContent((current) => ({ ...current, [key]: event.target.value }));
                        setSaved(false);
                      }}
                    />
                  )}
                </label>
              ))}

              <button
                onClick={save}
                disabled={saving}
                className="mt-4 rounded-xl bg-[#083b68] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving ? "Saving..." : saved ? "Saved" : "Save changes"}
              </button>
            </>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-[#2479a8]/40 bg-[#f5f6f7] p-4 text-sm leading-6 text-black/60">
              Manage this section from its related dashboard.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}   