import Link from "next/link";
import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-[#f3e9dc]">
      <div className="trinity-container grid gap-10 py-12 md:grid-cols-[1.5fr_1fr_1fr] md:py-16">
        <div className="md:col-span-2">
          <div className="h-20 w-[230px] overflow-clip rounded-lg md:h-43 md:w-[300px]">
            <Image
              src="/brand/TRINTY LOGO.png"
              alt="Trinity Christian Gift Shop"
              width={3209}
              height={1795}
              className="h-full w-full object-contain object-left"
            />
          </div>
          <p className="eyebrow mt-5 text-[#b48d55]">
            Gifts with meaning
          </p>
          <p className="mt-3 max-w-md text-sm leading-6 text-black/60">Thoughtful Christian gifts for the moments people remember.</p>
        </div>

        <div>
          <h4 className="font-bold">Explore</h4>
          <div className="mt-4 grid gap-3 text-sm text-black/60">
            <Link className="transition-colors hover:text-[#083b68]" href="/shop">Shop</Link>
            <Link className="transition-colors hover:text-[#083b68]" href="/events">Events</Link>
            <Link className="transition-colors hover:text-[#083b68]" href="/gift-finder">Gift Finder</Link>
            <Link className="transition-colors hover:text-[#083b68]" href="/our-story">Our Story</Link>
            <Link className="transition-colors hover:text-[#083b68]" href="/journal">Journal</Link>
          </div>
        </div>

        <div>
          <h4 className="font-bold">Help</h4>
          <div className="mt-4 grid gap-3 text-sm text-black/60">
            <Link className="transition-colors hover:text-[#083b68]" href="/contact">Contact</Link>
            <Link className="transition-colors hover:text-[#083b68]" href="/gift-list">Gift List</Link>
            <Link className="transition-colors hover:text-[#083b68]" href="/shipping-returns">Shipping &amp; Returns</Link>
            <Link className="transition-colors hover:text-[#083b68]" href="/faq">FAQ</Link>
          </div>
        </div>
      </div>

      <div className="border-t border-black/10 px-5 py-5 text-center text-xs text-black/45">
        © {new Date().getFullYear()} Trinity Christian Gift Shop. Gifts With Meaning.
      </div>
    </footer>
  );
}
