import type { Metadata, Viewport } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import ClientInitializer from "@/components/ClientInitializer";
import InstallPrompt from "@/components/InstallPrompt";
import { LanguageProvider } from "@/app/context/LanguageContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "YowEvent: Event as a Service",
  description: "Manage events at any scale with real-time traffic engineering",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YowEvent",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico" }],
    apple: [{ url: "/icon.svg" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`} suppressHydrationWarning>
      <body className="antialiased">
        <LanguageProvider>
          <ClientInitializer />
          <InstallPrompt />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
