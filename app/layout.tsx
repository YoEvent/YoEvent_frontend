import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YoEvent — Event as a Service",
  description: "Manage events at any scale with real-time traffic engineering",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet"/>
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
