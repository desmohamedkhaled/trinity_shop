"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Menu, Search, ShoppingCart, X } from "lucide-react";
import { useStore } from "./store-provider";
import { IconButton } from "@/components/icon-button";

const navItems = [
  ["/shop", "Shop"],
  ["/occasions", "Occasions"],
  ["/events", "Events"],
  ["/gift-finder", "Gift Finder"],
  ["/our-story", "Our Story"],
  ["/journal", "Journal"],
];

export function SiteHeader() {
  const router = useRouter();
  const { giftList, cartCount } = useStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    setSearchOpen(false);
    router.push(value ? `/shop?search=${encodeURIComponent(value)}` : "/shop");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-[#fffaf3]/85 backdrop-blur-xl transition-colors duration-200">
      <div className="trinity-container flex items-center justify-between gap-4 py-4">
        <Link href="/" className="flex items-center gap-3" aria-label="Trinity home">
          <Image
            src="/brand/TRINTY LOGO.png"
            alt="Trinity Christian Gift Shop"
            width={190}
            height={72}
            className="h-12 w-auto object-contain sm:h-14"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold lg:flex" aria-label="Main navigation">
          {navItems.map(([href, label]) => (
            <Link key={href} href={href} className="transition-colors duration-200 hover:text-[#5d3b2a]">
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <IconButton
            label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="lg:hidden"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </IconButton>

          <IconButton
            label={searchOpen ? "Close search" : "Open search"}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
            className="inline-flex"
          >
            <Search size={18} />
          </IconButton>

          <Link href="/gift-list" className="relative inline-flex rounded-full p-2 text-black/70 transition-colors duration-200 hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5d3b2a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffaf3]" aria-label="Gift list">
            <Heart size={20} />
            {giftList.length > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#b84835] px-1 text-[10px] font-bold text-white">
                {giftList.length}
              </span>
            )}
          </Link>

          <Link href="/cart" className="relative inline-flex rounded-full p-2 text-black/70 transition-colors duration-200 hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5d3b2a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffaf3]" aria-label="Cart">
            <ShoppingCart size={20} />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#5d3b2a] px-1 text-[10px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {menuOpen && (
        <nav className="border-t border-black/10 bg-[#fffaf3] px-5 py-4 lg:hidden" aria-label="Mobile navigation">
          <div className="trinity-container grid gap-1 text-sm font-semibold">
            {navItems.map(([href, label]) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-4 py-3 transition-colors duration-200 hover:bg-black/[0.04]">
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}

      {searchOpen && (
        <div className="border-t border-black/10 px-5 py-3">
          <form onSubmit={submitSearch} className="trinity-container flex gap-2">
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search gifts"
              className="min-w-0 flex-1 rounded-xl border border-black/10 bg-white/80 px-4 py-2.5 text-sm text-black outline-none transition focus:border-[#5d3b2a]"
            />
            <button type="submit" className="rounded-xl bg-[#5d3b2a] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#472d23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5d3b2a] focus-visible:ring-offset-2">
              Search
            </button>
          </form>
        </div>
      )}
    </header>
  );
}
