"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Check, Loader2, Save, X } from "lucide-react";

type Request = {
  id: string;
  status: string;
  request_type: string;
  gift_for: string | null;
  occasion: string | null;
  budget_min: number | null;
  budget_max: number | null;
  gift_category: string | null;
  preferences: string | null;
  notes: string | null;
  admin_notes: string | null;
  created_at: string;
  customers: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
};

type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  stock: number;
};

type Recommendation = {
  id: string;
  product_id: string;
  product: Product;
};

const statusOptions = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "recommended", label: "Recommended" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewing: "bg-amber-100 text-amber-800",
  recommended: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const requestId = params.id as string;

  const [request, setRequest] = useState<Request | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);

  const loadRequest = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/gift-finder/requests/${requestId}`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Could not load request");
      const data = await response.json();
      setRequest(data.request);
      setStatus(data.request.status);
      setAdminNotes(data.request.admin_notes || "");
      setRecommendations(data.recommendations || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load request details"
      );
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    loadRequest();
  }, [loadRequest]);

  async function handleSave() {
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/gift-finder/requests/${requestId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, admin_notes: adminNotes }),
        }
      );

      if (!response.ok) throw new Error("Could not save changes");
      await loadRequest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  async function searchProducts() {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `/api/catalog/products?q=${encodeURIComponent(searchQuery)}`,
        { cache: "no-store" }
      );
      if (!response.ok) throw new Error("Could not search products");
      const data = await response.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not search products"
      );
    } finally {
      setSearching(false);
    }
  }

  async function addRecommendation(productId: string) {
    try {
      const response = await fetch(
        `/api/admin/gift-finder/requests/${requestId}/recommendations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ product_id: productId }),
        }
      );

      if (!response.ok) throw new Error("Could not add recommendation");
      await loadRequest();
      setShowProductSearch(false);
      setSearchQuery("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not add recommendation"
      );
    }
  }

  async function removeRecommendation(recommendationId: string) {
    try {
      const response = await fetch(
        `/api/admin/gift-finder/requests/${requestId}/recommendations/${recommendationId}`,
        { method: "DELETE" }
      );

      if (!response.ok) throw new Error("Could not remove recommendation");
      await loadRequest();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not remove recommendation"
      );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="animate-spin text-[#1267a8]" size={32} />
        <p className="ml-4 text-black/60">Loading request...</p>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-10">
        <Link href="/admin/gift-finder/requests" className="inline-flex items-center gap-2 text-sm font-bold text-black/50 hover:text-black">
          <ArrowLeft size={16} /> Back
        </Link>
        <p className="mt-4 text-red-600">Request not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <Link
        href="/admin/gift-finder/requests"
        className="inline-flex items-center gap-2 text-sm font-bold text-black/50 hover:text-black"
      >
        <ArrowLeft size={16} /> Back
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <p className="text-xs font-bold uppercase tracking-[.28em] text-[#b48d55]">
              Gift Finder Request
            </p>
            <h1 className="display-font mt-2 text-4xl">{request.customers.name}</h1>
            <div className="mt-4 flex flex-wrap gap-2">
              <span
                className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
                  statusColors[request.status]
                }`}
              >
                {request.status}
              </span>
              <span className="inline-block rounded-full bg-black/5 px-3 py-1 text-sm">
                {new Date(request.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Customer Details */}
          <div className="rounded-2xl border bg-white/85 p-6">
            <h2 className="font-bold">Customer Details</h2>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs text-black/50">Name</p>
                <p className="font-semibold">{request.customers.name}</p>
              </div>
              <div>
                <p className="text-xs text-black/50">Email</p>
                <p className="font-semibold">{request.customers.email}</p>
              </div>
              <div>
                <p className="text-xs text-black/50">Phone</p>
                <p className="font-semibold">{request.customers.phone}</p>
              </div>
            </div>
          </div>

          {/* Gift Preferences */}
          <div className="rounded-2xl border bg-white/85 p-6">
            <h2 className="font-bold">Gift Preferences</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {request.gift_for && (
                <div>
                  <p className="text-xs text-black/50">Gift For</p>
                  <p className="font-semibold">{request.gift_for}</p>
                </div>
              )}
              {request.occasion && (
                <div>
                  <p className="text-xs text-black/50">Occasion</p>
                  <p className="font-semibold">{request.occasion}</p>
                </div>
              )}
              {request.budget_min && (
                <div>
                  <p className="text-xs text-black/50">Budget</p>
                  <p className="font-semibold">
                    {request.budget_min}–{request.budget_max}
                  </p>
                </div>
              )}
              {request.gift_category && (
                <div>
                  <p className="text-xs text-black/50">Category</p>
                  <p className="font-semibold">{request.gift_category}</p>
                </div>
              )}
              {request.preferences && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-black/50">Preferences</p>
                  <p className="font-semibold">{request.preferences}</p>
                </div>
              )}
              {request.notes && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-black/50">Customer Message</p>
                  <p className="font-semibold">{request.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Admin Notes */}
          <div className="rounded-2xl border bg-white/85 p-6">
            <h2 className="font-bold">Admin Notes</h2>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={6}
              className="mt-4 w-full rounded-lg border p-3 outline-none focus:border-[#1267a8]"
              placeholder="Add notes about this request..."
            />
          </div>

          {/* Status */}
          <div className="rounded-2xl border bg-white/85 p-6">
            <h2 className="font-bold">Status</h2>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-4 w-full rounded-lg border px-4 py-2 outline-none focus:border-[#1267a8]"
            >
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[#083b68] px-6 py-3 font-bold text-white transition hover:bg-[#0a4a7d] disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Saving...
              </>
            ) : (
              <>
                <Save size={18} /> Save Changes
              </>
            )}
          </button>
        </div>

        {/* Recommendations Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border bg-white/85 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Recommended Products</h2>
              <span className="rounded-full bg-black/5 px-2 py-1 text-xs font-semibold">
                {recommendations.length}
              </span>
            </div>

            {recommendations.length > 0 && (
              <div className="mt-4 space-y-3">
                {recommendations.map((rec) => (
                  <div key={rec.id} className="flex gap-3 rounded-lg border p-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-[#eadfce]">
                      {rec.product.image && (
                        <img
                          src={rec.product.image}
                          alt={rec.product.name}
                          className="h-full w-full object-cover"
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold">{rec.product.name}</h3>
                      <p className="text-xs text-black/50">
                        {rec.product.price.toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => removeRecommendation(rec.id)}
                      className="flex items-center justify-center rounded p-2 hover:bg-red-50"
                      aria-label="Remove"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!showProductSearch ? (
              <button
                onClick={() => setShowProductSearch(true)}
                className="mt-4 w-full rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-black/5"
              >
                + Add Product
              </button>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2">
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-[#1267a8]"
                  />
                  <button
                    onClick={searchProducts}
                    disabled={searching || !searchQuery.trim()}
                    className="rounded-lg bg-[#083b68] px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {searching ? "..." : "Search"}
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border p-3">
                    {searchResults.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => addRecommendation(product.id)}
                        className="flex w-full items-center justify-between rounded px-2 py-2 text-left hover:bg-black/5"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{product.name}</p>
                          <p className="text-xs text-black/50">
                            {product.price.toLocaleString()}
                          </p>
                        </div>
                        <Check size={16} className="shrink-0 text-green-600" />
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => {
                    setShowProductSearch(false);
                    setSearchQuery("");
                    setSearchResults([]);
                  }}
                  className="w-full rounded-lg border px-4 py-2 text-sm font-semibold transition hover:bg-black/5"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
