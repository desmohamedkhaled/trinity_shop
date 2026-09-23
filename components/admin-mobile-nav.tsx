"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useAdminAccess } from "@/components/admin-access";
import { adminNavigation } from "@/components/admin-navigation";

export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
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
    <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#5d3b2a] px-5 py-4 text-white shadow-lg lg:hidden">
      <span className="text-sm font-black tracking-[.18em]">TRINITY ADMIN</span>
      <button onClick={() => setOpen((value) => !value)} className="rounded-xl p-2 transition hover:bg-white/10" aria-label={open ? "Close admin menu" : "Open admin menu"}>
        {open ? <X size={21} /> : <Menu size={21} />}
      </button>
      {open && status === "loaded" && <nav className="absolute inset-x-0 top-full grid gap-1 border-t border-white/10 bg-[#5d3b2a] p-3 shadow-xl">{visibleLinks.map(({ href, label }) => { const active = isActive(href); return <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`admin-sidebar-link${active ? " admin-sidebar-link-active" : ""}`}>{label}</Link>; })}</nav>}
    </div>
  );
}
