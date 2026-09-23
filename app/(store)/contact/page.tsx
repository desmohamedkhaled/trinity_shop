import type { Metadata } from "next";
import { ContactExperience } from "@/components/contact-experience";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Contact | Trinity Christian Gift Shop",
  description: "Contact Trinity Christian Gift Shop about a meaningful gift, a Gift List, or an existing request.",
};

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="store-page min-w-0">
        <div className="trinity-container">
          <ContactExperience />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
