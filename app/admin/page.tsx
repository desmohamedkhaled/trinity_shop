"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminAccess } from "@/components/admin-access";
import {
  ArrowUpRight,
  ClipboardList,
  Gem,
  Heart,
  LoaderCircle,
  PackagePlus,
  RefreshCw,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";

type Stats = {
  requests: number;
  products: number;
  customers: number;
  giftLists: number;
};

type RequestItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string | null;
};

export default function Admin() {
  const router = useRouter();
  const { can, status } = useAdminAccess();

  const [stats, setStats] = useState<Stats>({
    requests: 0,
    products: 0,
    customers: 0,
    giftLists: 0,
  });

  const [recentRequests, setRecentRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState("");
  const [range, setRange] = useState("all");

  useEffect(() => {
    if (status !== "loaded") {
      setLoading(status === "loading");
      return;
    }

    async function loadDashboard() {
      try {
        setError("");
        setLoading(true);

        const [statsRes, productsRes, requestsRes] = await Promise.all([
          can("dashboard.read")
            ? fetch(`/api/admin/stats?range=${range}`, { cache: "no-store" })
            : Promise.resolve(null),
          can("products.read")
            ? fetch("/api/admin/products", { cache: "no-store" })
            : Promise.resolve(null),
          can("requests.read")
            ? fetch("/api/admin/requests", { cache: "no-store" })
            : Promise.resolve(null),
        ]);

        const productsData = productsRes?.ok
          ? await productsRes.json()
          : [];

        if (
          [statsRes, productsRes, requestsRes].some(
            (response) => response?.status === 401
          )
        ) {
          router.replace("/admin/login");
          return;
        }

        const requestsData = requestsRes?.ok
          ? await requestsRes.json()
          : [];

        const products = Array.isArray(productsData)
          ? productsData
          : productsData?.data ?? [];

        const requests = Array.isArray(requestsData)
          ? requestsData
          : requestsData?.data ?? [];

        const statsData = statsRes?.ok
          ? await statsRes.json()
          : null;

        if (![statsRes, productsRes, requestsRes].some((response) => response?.ok)) {
          throw new Error("Could not load dashboard data.");
        }

        setStats({
          products: can("products.read") &&
            typeof statsData?.products === "number"
              ? statsData.products
              : products.length,

          requests: can("requests.read") &&
            typeof statsData?.requests === "number"
              ? statsData.requests
              : requests.length,

          customers: can("customers.read") &&
            typeof statsData?.customers === "number"
              ? statsData.customers
              : 0,

          giftLists: can("gift_lists.read") &&
            typeof statsData?.giftLists === "number"
              ? statsData.giftLists
              : 0,
        });

        setRecentRequests(
          can("requests.read") ? requests.slice(0, 3).map((r: any) => ({
            id: r.id,
            title:
              r.title ||
              r.name ||
              r.occasion ||
              "Gift Request",
            status: r.status || "Pending",
            createdAt: r.created_at || null,
          })) : []
        );
      } catch (error) {
        console.error("Failed to load dashboard:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Could not load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [can, range, refreshKey, router, status]);

  const statCards = [
    {
      label: "Requests",
      value: stats.requests,
      href: "/admin/orders",
      permission: "requests.read" as const,
      icon: ClipboardList,
      tone: "bg-[#f6f0e7] text-[#5d3b2a]",
    },
    {
      label: "Products",
      value: stats.products,
      href: "/admin/products",
      permission: "products.read" as const,
      icon: Gem,
      tone: "bg-[#efe4d3] text-[#5d3b2a]",
    },
    {
      label: "Customers",
      value: stats.customers,
      href: "/admin/customers",
      permission: "customers.read" as const,
      icon: Users,
      tone: "bg-[#f3e9dc] text-[#5d3b2a]",
    },
    {
      label: "Gift Lists",
      value: stats.giftLists,
      href: "/admin/gift-lists",
      permission: "gift_lists.read" as const,
      icon: Heart,
      tone: "bg-[#f8efe9] text-[#5d3b2a]",
    },
  ];

  const actions = [
    {
      href: "/admin/products",
      permission: "products.read" as const,
      label: "Add product",
      description: "Create a catalog item",
      icon: PackagePlus,
    },
    {
      href: "/admin/content",
      permission: "pages.read" as const,
      label: "Edit homepage",
      description: "Update hero content",
      icon: Settings2,
    },
    {
      href: "/admin/gift-finder",
      permission: "gift_finder.read" as const,
      label: "Edit Gift Finder",
      description: "Manage questions",
      icon: Sparkles,
    },
    {
      href: "/admin/orders",
      permission: "requests.read" as const,
      label: "Review requests",
      description: "Follow up with customers",
      icon: ClipboardList,
    },
  ];

  return (
    <div className="min-h-screen min-w-0 w-full bg-[#f7f0e6] p-5 md:p-8 xl:p-10">
      {/* HEADER */}

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow text-[#b48d55]">
            Trinity workspace
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-black/50">
            A live view of your store activity.
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap gap-3">
          <select
            value={range}
            onChange={(event) =>
              setRange(event.target.value)
            }
            className="min-w-0 rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold"
          >
            <option value="all">All time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="year">This year</option>
          </select>

          <button
            onClick={() =>
              setRefreshKey((value) => value + 1)
            }
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d9c6b0] bg-[#fffdf8] px-4 py-3 text-sm font-bold text-[#5d3b2a] transition hover:border-[#5d3b2a] disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />

            Refresh
          </button>

          <button
            onClick={async () => {
              await fetch("/api/auth/logout", {
                method: "POST",
              });

              router.replace("/admin/login");
            }}
            className="rounded-xl border border-black/10 bg-white px-4 py-3 text-sm font-bold"
          >
            Sign out
          </button>

        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="mt-6 flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <span className="min-w-0 break-words">
            {error}
          </span>

          <button
            onClick={() =>
              setRefreshKey((value) => value + 1)
            }
            className="font-bold underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* STAT CARDS */}

      <div className="mt-8 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.filter(({ permission }) => can(permission)).map(
          ({
            label,
            value,
            href,
            icon: Icon,
            tone,
          }) => (
            <Link
              key={label}
              href={href}
              className="admin-surface group min-w-0 overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex min-w-0 items-start justify-between gap-4">
                <span
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${tone}`}
                >
                  <Icon size={20} />
                </span>

                <ArrowUpRight
                  size={17}
                  className="shrink-0 text-black/25 transition group-hover:text-[#5d3b2a]"
                />
              </div>

              <p className="mt-5 text-sm font-semibold text-black/50">
                {label}
              </p>

              <p className="mt-1 text-4xl font-black tracking-tight">
                {loading ? "—" : value}
              </p>

              <p className="mt-2 text-xs font-semibold text-black/35">
                View details
              </p>
            </Link>
          )
        )}
      </div>

      {/* RECENT REQUESTS + QUICK ACTIONS */}

      <div className="mt-8 grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,.65fr)]">
        {/* RECENT REQUESTS */}

        {can("requests.read") && <div className="admin-surface min-w-0 overflow-hidden p-6">
          <div className="flex min-w-0 items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-black">
                Recent requests
              </h2>

              <p className="mt-1 text-sm text-black/45">
                Latest customer activity
              </p>
            </div>

            <Link
              href="/admin/orders"
              className="shrink-0 text-sm font-bold text-[#5d3b2a]"
            >
              View all
            </Link>
          </div>

          <div className="mt-5 grid min-w-0 gap-3">
            {loading ? (
              <div className="rounded-xl bg-[#f6f0e7] p-4 text-sm text-black/50">
                <LoaderCircle
                  size={16}
                  className="mr-2 inline animate-spin"
                />

                Loading requests...
              </div>
            ) : recentRequests.length === 0 ? (
              <div className="rounded-xl bg-[#f6f0e7] p-5 text-sm text-black/50">
                No requests yet.
              </div>
            ) : (
              recentRequests.map((request) => (
                <Link
                  href="/admin/orders"
                  key={request.id}
                  className="flex min-w-0 items-center justify-between gap-4 rounded-xl bg-[#f6f0e7] p-4 text-sm transition hover:bg-[#eadfce]"
                >
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate">
                      {request.title}
                    </strong>

                    <small className="mt-1 block text-black/40">
                      {request.createdAt
                        ? new Date(
                            request.createdAt
                          ).toLocaleString()
                        : "Date unavailable"}
                    </small>
                  </span>

                  <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold capitalize text-amber-800">
                    {request.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>}

        {/* QUICK ACTIONS */}

        <div className="min-w-0 overflow-hidden rounded-2xl border border-[#dfcfbd] bg-[#fffdf8] p-6 shadow-sm">
          <h2 className="text-lg font-black">
            Quick actions
          </h2>

          <p className="mt-1 text-sm text-black/45">
            Common store management tasks
          </p>

          <div className="mt-5 grid min-w-0 gap-3">
            {actions.filter(({ permission }) => can(permission)).map(
              ({
                href,
                label,
                description,
                icon: Icon,
              }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex min-w-0 items-center gap-3 rounded-xl border border-[#e5d5c5] bg-[#fffdf8] p-3 transition hover:border-[#5d3b2a] hover:bg-[#f6f0e7]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#f3e9dc] text-[#5d3b2a]">
                    <Icon size={18} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm">
                      {label}
                    </strong>

                    <small className="mt-1 block truncate text-xs text-black/45">
                      {description}
                    </small>
                  </span>

                  <ArrowUpRight
                    size={16}
                    className="shrink-0 text-black/25 transition group-hover:text-[#5d3b2a]"
                  />
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}