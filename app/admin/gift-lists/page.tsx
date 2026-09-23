"use client";

import { useEffect, useState } from "react";

interface GiftList {
  id: string;
  status: string;
  notes: string | null;
  created_at: string;
  customers?: { name: string | null; email: string | null; phone: string | null } | null;
  gift_list_items?: { quantity: number; products?: { name: string | null } | null }[];
}

export default function GiftListsPage() {
  const [rows, setRows] = useState<GiftList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/gift-lists", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Could not load gift lists");
        setRows(Array.isArray(data) ? data : []);
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Could not load gift lists"))
      .finally(() => setLoading(false));
  }, []);

  return <div className="p-6 md:p-10"><p className="text-sm text-black/45">Relationships</p><h1 className="text-4xl font-black">Gift Lists</h1><p className="mt-2 text-sm text-black/50">Saved gift lists and their real product items.</p>{error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}<div className="mt-8 grid gap-4">{loading ? <div className="rounded-2xl border bg-white p-10 text-center text-sm text-black/50">Loading gift lists...</div> : rows.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center text-sm text-black/50">No gift lists yet.</div> : rows.map((list) => <article key={list.id} className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-black">{list.customers?.name || "Unnamed customer"}</h2><p className="mt-1 text-sm text-black/50">{list.customers?.email || list.customers?.phone || "No contact details"}</p></div><span className="rounded-full bg-[#eaf4fb] px-3 py-1 text-xs font-bold capitalize text-[#1267a8]">{list.status}</span></div><div className="mt-4 flex flex-wrap gap-2">{(list.gift_list_items || []).map((item, index) => <span key={`${list.id}-${index}`} className="rounded-full bg-[#f5f6f7] px-3 py-1 text-xs">{item.products?.name || "Product"} x {item.quantity}</span>)}</div>{list.notes && <p className="mt-4 text-sm text-black/55">{list.notes}</p>}<p className="mt-4 text-xs text-black/40">Created {new Date(list.created_at).toLocaleString()}</p></article>)}</div></div>;
}
