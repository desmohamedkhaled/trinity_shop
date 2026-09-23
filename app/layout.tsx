import "./globals.css";
import { StoreProvider } from "@/components/store-provider";
import { VideoIntroOverlay } from "@/components/video-intro-overlay";

export const metadata = {
  title: "Trinity Christian Gift Shop",
  description: "Gifts With Meaning — premium Christian gifts for meaningful moments.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <StoreProvider>
          <VideoIntroOverlay />
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
