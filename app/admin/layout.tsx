"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminGuard } from "@/components/admin-guard";
import { AdminMobileNav } from "@/components/admin-mobile-nav";
import { AdminAccessProvider, useAdminAccess } from "@/components/admin-access";
import { adminNavigation } from "@/components/admin-navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminAccessProvider>
      <AdminGuard>
        <AdminShell>{children}</AdminShell>
      </AdminGuard>
    </AdminAccessProvider>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { can, status } = useAdminAccess();

  const visibleLinks = status === "loaded"
    ? adminNavigation.filter(({ permission }) => can(permission))
    : [];

  function isActive(href: string) {
    return href === "/admin"
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div>
      <div className="admin-shell min-h-screen w-full overflow-x-hidden">
        {/* =====================================================
            DESKTOP SIDEBAR
        ===================================================== */}
        <aside
          className="
            fixed
            left-0
            top-0
            z-40
            hidden
            h-screen
            w-64
            flex-col
            border-r
            border-white/10
            bg-[#5d3b2a]
            p-5
            text-white
            lg:flex
          "
        >
          <div className="border-b border-white/10 px-3 pb-6">
            <p className="text-xl font-black tracking-[.18em]">
              TRINITY
            </p>

            <p className="mt-1 text-[9px] uppercase tracking-[.25em] text-white/50">
              Admin workspace
            </p>
          </div>

          <nav
            className="mt-6 grid min-w-0 gap-1"
            aria-label="Admin navigation"
          >
            {visibleLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={isActive(href) ? "page" : undefined}
                className={`admin-sidebar-link${isActive(href) ? " admin-sidebar-link-active" : ""}`}
              >
                <Icon
                  size={17}
                  strokeWidth={1.8}
                  className="shrink-0"
                />

                <span className="min-w-0 truncate">
                  {label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="mt-auto rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-xs leading-5 text-white/60">
            Trinity Commerce
            <br />
            Gifts with meaning.
          </div>
        </aside>

        {/* =====================================================
            MOBILE NAV
        ===================================================== */}
        <AdminMobileNav />

        {/* =====================================================
            MAIN ADMIN CONTENT

            IMPORTANT:
            Sidebar = 256px.
            Main = viewport - 256px.
        ===================================================== */}
        <main
          className="
            admin-main
            min-w-0
            w-full
          "
        >
          <div className="min-w-0 w-full">
            {children}
          </div>
        </main>
      </div>
      
      </div>
  );
}