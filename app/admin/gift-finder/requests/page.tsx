"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Eye, Loader2, Search } from "lucide-react";

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
    name: string;
    email: string;
    phone: string;
  };
};

type Status = "new" | "reviewing" | "recommended" | "completed" | "cancelled";

const statusColors: Record<Status, string> = {
  new: "bg-blue-100 text-blue-800",
  reviewing: "bg-amber-100 text-amber-800",
  recommended: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-gray-100 text-gray-800",
};

export default function GiftFinderRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "">("new");

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/gift-finder/requests", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Could not load requests");
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load gift finder requests"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const filtered = requests.filter((request) => {
    const matchesSearch =
      request.customers.name.toLowerCase().includes(search.toLowerCase()) ||
      request.customers.email.toLowerCase().includes(search.toLowerCase()) ||
      request.customers.phone.toLowerCase().includes(search.toLowerCase()) ||
      request.id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 md:p-10">
      <div className="mb-8">
        <p className="text-sm text-black/45">Gift Finder</p>
        <h1 className="text-4xl font-black">Requests</h1>
        <p className="mt-2 text-black/55">
          Manage and respond to gift finder requests from customers.
        </p>
      </div>

      {error && (
        <p className="mb-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <div className="relative md:col-span-2">
          <Search
            className="absolute left-3 top-3 text-black/40"
            size={18}
          />
          <input
            placeholder="Search by name, email, phone, or request ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-white/60 pl-10 pr-4 py-2 outline-none focus:border-[#1267a8]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as Status | "")}
          className="rounded-lg border bg-white/60 px-4 py-2 outline-none focus:border-[#1267a8]"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="reviewing">Reviewing</option>
          <option value="recommended">Recommended</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border bg-white/85 p-12">
          <Loader2 className="animate-spin text-[#1267a8]" size={32} />
          <p className="ml-4 text-black/60">Loading requests...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border bg-white/85 p-8 text-center">
          <p className="text-black/50">
            {requests.length === 0
              ? "No gift finder requests yet."
              : "No requests match your search."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((request) => (
            <Link
              key={request.id}
              href={`/admin/gift-finder/requests/${request.id}`}
              className="flex items-center justify-between rounded-2xl border bg-white/85 p-4 transition hover:bg-white hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{request.customers.name}</h3>
                    <p className="text-sm text-black/50">{request.customers.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                          statusColors[request.status as Status]
                        }`}
                      >
                        {request.status}
                      </span>
                      {request.occasion && (
                        <span className="inline-block rounded-full bg-black/5 px-2 py-1 text-xs">
                          {request.occasion}
                        </span>
                      )}
                      {request.gift_for && (
                        <span className="inline-block rounded-full bg-black/5 px-2 py-1 text-xs">
                          For: {request.gift_for}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="ml-4 flex items-center gap-2 text-black/40">
                <span className="text-right text-xs">
                  {new Date(request.created_at).toLocaleDateString()}
                </span>
                <Eye size={18} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
