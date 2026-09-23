"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAccess } from "@/components/admin-access";

type RequestRow = {
  id: string;
  status: string;
  occasion: string | null;
  created_at: string;
  admin_notes?: string | null;
  customers?: {
    name?: string | null;
    phone?: string | null;
    email?: string | null;
  } | null;
  request_items?: {
    quantity?: number | null;
    unit_price?: number | null;
    products?: {
      name?: string | null;
    } | null;
  }[];
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  total: number;
  status: string;
  created_at: string;
  order_items?: { product_name: string; quantity: number; line_total: number }[];
};

const statusOptions = [
  "pending",
  "contacted",
  "confirmed",
  "preparing",
  "completed",
  "canceled",
];

export default function Orders() {
  const { can } = useAdminAccess();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [r, ordersResponse] = await Promise.all([
        can("requests.read") ? fetch("/api/admin/requests", { cache: "no-store" }) : Promise.resolve(null),
        can("orders.read") ? fetch("/api/admin/orders", { cache: "no-store" }) : Promise.resolve(null),
      ]);

      const d = r ? await r.json() : [];

      if (r && !r.ok) {
        setError(d.error || "Could not load requests");
        setRows([]);
        return;
      }

      setRows(Array.isArray(d) ? d : []);
      setNotes(Object.fromEntries((Array.isArray(d) ? d : []).map((row) => [row.id, row.admin_notes || ""])));
      if (ordersResponse?.ok) { const ordersData = await ordersResponse.json(); setOrders(Array.isArray(ordersData) ? ordersData : []); }
    } catch {
      setError("Could not load requests");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [can]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = rows.filter((row) => {
    const customer = `${row.customers?.name || ""} ${row.customers?.phone || ""} ${row.customers?.email || ""}`.toLowerCase();
    const matchesQuery = !query || `${row.id} ${row.occasion || ""} ${customer}`.toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (statusFilter === "all" || row.status === statusFilter);
  });

  async function update(id: string, changes: { status?: string; admin_notes?: string }) {
    try {
      setUpdating(id);
      setError("");

      const r = await fetch(`/api/admin/requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(changes),
      });

      const d = await r.json();

      if (!r.ok) {
        setError(d.error || "Could not update request");
        return;
      }

      await load();
    } catch {
      setError("Could not update request");
    } finally {
      setUpdating(null);
    }
  }

  async function updateOrder(id: string, changes: { status: string }) {
    try {
      setUpdating(id);
      setError("");
      const response = await fetch(`/api/admin/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update order");
      setOrders((current) => current.map((order) => order.id === id ? data : order));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update order");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="p-6 md:p-10">
      <p className="text-sm text-black/45">Sales</p>

      <h1 className="text-4xl font-black">Requests / Orders</h1>

      <p className="mt-2 text-black/55">
        Every WhatsApp checkout or fallback request is tracked here.
      </p>

      {error && (
        <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search requests or customers" className="min-w-64 flex-1 rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-[#1267a8]" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border bg-white px-4 py-3 text-sm font-semibold">
          <option value="all">All statuses</option>
          {statusOptions.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}
        </select>
      </div>
      <section className="mt-10 rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-xl font-black">Checkout orders</h2><p className="mt-1 text-sm text-black/50">Orders created through the new Cart and Checkout flow.</p></div></div>
        <div className="mt-5 grid gap-3">{orders.length === 0 ? <p className="rounded-xl bg-[#f5f6f7] p-5 text-sm text-black/50">No checkout orders yet, or the orders schema is not configured.</p> : orders.map((order) => <div key={order.id} className="rounded-xl border border-black/10 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-black text-[#083b68]">{order.order_number}</p><p className="mt-1 text-sm">{order.customer_name} · {order.customer_phone}</p><p className="text-xs text-black/45">{order.customer_email || "No email"} · {new Date(order.created_at).toLocaleString()}</p></div><div className="text-right"><select aria-label={`Status for ${order.order_number}`} value={order.status || "pending"} disabled={!can("orders.update") || updating === order.id} onChange={(event) => updateOrder(order.id, { status: event.target.value })} className="rounded-lg border bg-white px-3 py-2 text-xs font-bold disabled:opacity-50">{statusOptions.map((status) => <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>)}</select><p className="mt-2 font-black">${Number(order.total).toFixed(2)}</p></div></div><div className="mt-3 flex flex-wrap gap-2">{(order.order_items || []).map((item, index) => <span key={`${order.id}-${index}`} className="rounded-full bg-[#f5f6f7] px-3 py-1 text-xs">{item.product_name} x {item.quantity}</span>)}</div></div>)}</div>
      </section>

      <div className="mt-4 overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[#f5f6f7]">
            <tr>
              {[
                "Request",
                "Customer",
                "Occasion",
                "Items",
                "Status",
                "Created",
                "Admin notes",
              ].map((x) => (
                <th key={x} className="p-4">
                  {x}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredRows.map((r) => {
              const itemCount = (r.request_items || []).reduce(
                (sum, item) => sum + Number(item.quantity || 0),
                0
              );

              return (
                <tr key={r.id} className="border-t">
                  <td className="p-4 font-mono text-xs">
                    {r.id.slice(0, 8).toUpperCase()}
                  </td>

                  <td className="p-4">
                    <b>{r.customers?.name || "—"}</b>

                    {r.customers?.phone && (
                      <div className="text-xs text-black/45">
                        {r.customers.phone}
                      </div>
                    )}

                    {r.customers?.email && (
                      <div className="text-xs text-black/45">
                        {r.customers.email}
                      </div>
                    )}
                  </td>

                  <td className="p-4">
                    {r.occasion || "—"}
                  </td>

                    <td className="p-4">
                      <span>{itemCount} items</span>
                      <div className="mt-2 grid gap-1 text-xs text-black/55">
                        {(r.request_items || []).map((item, index) => (
                          <span key={`${r.id}-${index}`}>
                            {item.products?.name || "Product"} x {item.quantity || 0} (${Number(item.unit_price || 0).toFixed(2)})
                          </span>
                        ))}
                      </div>
                    </td>

                  <td className="p-4">
                    <select
                      value={r.status || "pending"}
                      disabled={!can("requests.update") || updating === r.id}
                      onChange={(e) =>
                        update(r.id, { status: e.target.value })
                      }
                      className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status.charAt(0).toUpperCase() +
                            status.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td className="p-4 text-xs text-black/45">
                    {r.created_at
                      ? new Date(r.created_at).toLocaleString()
                      : "—"}
                  </td>
                  <td className="p-4">
                    <textarea
                      value={notes[r.id] ?? ""}
                      onChange={(event) => setNotes((current) => ({ ...current, [r.id]: event.target.value }))}
                      placeholder="Admin note"
                      className="min-h-16 w-48 rounded-lg border p-2 text-xs"
                    />
                    <button
                      onClick={() => update(r.id, { admin_notes: notes[r.id] || "" })}
                      disabled={!can("requests.update") || updating === r.id}
                      className="mt-2 rounded-lg border px-3 py-1 text-xs font-bold disabled:opacity-50"
                    >
                      Save note
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {loading && (
          <div className="p-10 text-center text-sm text-black/45">
            Loading requests...
          </div>
        )}

        {!loading && !filteredRows.length && !error && (
          <div className="p-10 text-center text-sm text-black/45">
            {rows.length ? "No requests match your filters." : "No requests yet."}
          </div>
        )}
      </div>
    </div>
  );
}