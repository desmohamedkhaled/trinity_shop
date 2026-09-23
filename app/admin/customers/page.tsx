"use client";

import { useEffect, useState } from "react";
import { useAdminAccess } from "@/components/admin-access";

type RequestHistory = { id: string; status: string; occasion: string | null; created_at: string };
type OrderHistory = { id: string; order_number: string; status: string; created_at: string; total: number; currency: string };
type Customer = { id: string; name: string | null; email: string | null; phone: string | null; created_at: string; requests?: RequestHistory[]; orders?: OrderHistory[] };

export default function CustomersPage() {
  const { can } = useAdminAccess();
  const [rows, setRows] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/customers", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load customers");
      setRows(Array.isArray(data.customers) ? data.customers : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load customers");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function deleteCustomer(customer: Customer) {
    if (!can("customers.delete")) return;
    if (!window.confirm(`Delete ${customer.email || customer.name || "this customer"}? Related requests and orders will remain, but their customer link will be removed.`)) return;
    try {
      setError("");
      const response = await fetch(`/api/admin/customers/${customer.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not delete customer");
      setRows((current) => current.filter((row) => row.id !== customer.id));
      if (selectedId === customer.id) setSelectedId(null);
    } catch (deleteError) { setError(deleteError instanceof Error ? deleteError.message : "Could not delete customer"); }
  }

  const filtered = rows.filter((customer) => `${customer.name || ""} ${customer.email || ""} ${customer.phone || ""}`.toLowerCase().includes(query.toLowerCase()));
  const selected = rows.find((customer) => customer.id === selectedId) || null;

  return <div className="min-w-0 p-6 md:p-10">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm text-black/45">Relationships</p><h1 className="text-4xl font-black">Customers</h1><p className="mt-2 text-sm text-black/50">Customer records created from real requests and orders.</p></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" className="w-full max-w-sm rounded-xl border bg-white px-4 py-3 text-sm outline-none focus:border-[#1267a8]" /></div>
    {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <div className="mt-8 overflow-x-auto rounded-2xl border border-black/10 bg-white shadow-sm"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-[#f5f6f7]"><tr>{["Customer", "Contact", "Requests", "Orders", "Joined", "Actions"].map((heading) => <th key={heading} className="p-4">{heading}</th>)}</tr></thead><tbody>{loading ? <tr><td colSpan={6} className="p-10 text-center text-black/50">Loading customers...</td></tr> : filtered.length === 0 ? <tr><td colSpan={6} className="p-10 text-center text-black/50">No customers found.</td></tr> : filtered.map((customer) => <tr key={customer.id} className="border-t align-top"><td className="p-4 font-bold">{customer.name || "Unnamed customer"}</td><td className="p-4 text-black/55">{customer.phone || "—"}<br />{customer.email || "—"}</td><td className="p-4">{customer.requests?.length ?? "Unavailable"}</td><td className="p-4">{customer.orders?.length ?? "Unavailable"}</td><td className="p-4 text-xs text-black/50">{customer.created_at ? new Date(customer.created_at).toLocaleDateString() : "—"}</td><td className="p-4"><div className="flex flex-wrap gap-3"><button onClick={() => setSelectedId(selectedId === customer.id ? null : customer.id)} className="font-bold text-[#1267a8]">{selectedId === customer.id ? "Hide history" : "View history"}</button>{can("customers.delete") && <button onClick={() => deleteCustomer(customer)} className="font-bold text-red-700">Delete</button>}</div></td></tr>)}</tbody></table></div>
    {selected && <section className="mt-6 min-w-0 rounded-2xl border border-black/10 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-black">{selected.name || "Unnamed customer"}</h2><p className="mt-1 break-all text-sm text-black/55">{selected.email || "No email"} · {selected.phone || "No phone"}</p><p className="mt-1 text-xs text-black/45">Joined {new Date(selected.created_at).toLocaleString()}</p></div><div className="flex flex-wrap gap-3 text-sm font-bold"><span>{selected.requests?.length ?? 0} requests</span><span>{selected.orders?.length ?? 0} orders</span></div></div><div className="mt-6 grid min-w-0 gap-5 lg:grid-cols-2"><div><h3 className="font-bold">Past requests</h3>{selected.requests === undefined ? <p className="mt-2 text-sm text-black/50">Requests history is not available for this role.</p> : selected.requests.length === 0 ? <p className="mt-2 text-sm text-black/50">No requests.</p> : <div className="mt-2 grid gap-2">{selected.requests.map((request) => <div key={request.id} className="rounded-xl bg-[#f5f6f7] p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span>{request.occasion || "Gift request"}</span><strong className="capitalize">{request.status}</strong></div><p className="mt-1 text-xs text-black/45">{new Date(request.created_at).toLocaleString()}</p></div>)}</div>}</div><div><h3 className="font-bold">Order history</h3>{selected.orders === undefined ? <p className="mt-2 text-sm text-black/50">Order history is not available for this role.</p> : selected.orders.length === 0 ? <p className="mt-2 text-sm text-black/50">No orders.</p> : <div className="mt-2 grid gap-2">{selected.orders.map((order) => <div key={order.id} className="rounded-xl bg-[#f5f6f7] p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><span className="font-bold">{order.order_number}</span><strong className="capitalize">{order.status}</strong></div><div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-black/45"><span>{new Date(order.created_at).toLocaleString()}</span><span>{order.currency || "USD"} {Number(order.total || 0).toFixed(2)}</span></div></div>)}</div>}</div></div></section>}
  </div>;
}
