import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP, Noto_Serif_JP } from "next/font/google";
import "./globals.css";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { Navigation } from "@/components/Navigation";

export const dynamic = "force-dynamic";

const sans = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-sans-jp",
  display: "swap",
});

const serif = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-serif-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "献立記録",
  description: "2人の献立記録と統計",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "献立記録",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#e07a4a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${sans.variable} ${serif.variable}`}>
      <body className="min-h-screen font-sans text-ink antialiased">
        <div className="app-shell mx-auto flex min-h-screen max-w-[920px] flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6 md:px-10 md:pb-10 md:pt-8">
          <Navigation />
          <main className="flex-1 pb-2">{children}</main>
        </div>
        <MobileBottomNav />
      </body>
    </html>
  );
}
