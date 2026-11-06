import type { Metadata, Viewport } from "next";
import { Fraunces, Archivo } from "next/font/google";
import "./globals.css";
import "lenis/dist/lenis.css";
import "./jaiye-v3-pages.css";
import { ExperienceMotion } from "@/components/motion/experience-motion";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnalyticsConsentBanner } from "@/components/analytics/analytics";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
});

export const metadata: Metadata = {
  title: {
    default: "JaiyePass — Your pass to a good time",
    template: "%s · JaiyePass",
  },
  description:
    "Discover concerts, festivals, comedy and nightlife across Nigeria. Find events, book securely and access tickets on your phone.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://jaiyepass.vercel.app"),
  openGraph: {
    title: "JaiyePass — Your pass to a good time",
    description: "Discover experiences across Nigeria. Find events, book securely and access tickets on your phone.",
    type: "website",
    siteName: "JaiyePass",
    locale: "en_NG",
  },
};

export const viewport: Viewport = {
  themeColor: "#fcf9f5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${archivo.variable}`}>
      <body className="min-h-screen flex flex-col antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:bg-ink focus:text-paper focus:px-4 focus:py-2"
        >
          Skip to content
        </a>
        <ExperienceMotion />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
        <AnalyticsConsentBanner />
      </body>
    </html>
  );
}
