"use client";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { WifiOff, Globe2, Users, CreditCard, Zap, BarChart2, ArrowRight } from "lucide-react";

const BADGE_COLORS: Record<string, string> = {
  "New Feature":      "bg-[#FF4747]/10 text-[#FF4747] border border-[#FF4747]/20",
  "Premium Upgrade":  "bg-[#F7E998]/60 text-[#7a6a00] border border-[#F7E998]",
  "Performance":      "bg-blue-50 text-blue-600 border border-blue-100",
  "Payments":         "bg-green-50 text-green-600 border border-green-100",
  "Analytics":        "bg-purple-50 text-purple-600 border border-purple-100",
};

const updates = [
  {
    title: "Offline Mode is Now Active",
    date: "June 2, 2026",
    badge: "New Feature",
    icon: WifiOff,
    desc: "Run your events with confidence, even in remote locations. Download your guest lists directly to your device and scan tickets without any active Wi-Fi or cellular connection. Your device automatically syncs back when internet returns.",
    link: null,
  },
  {
    title: "Connect Your Custom Web Address",
    date: "May 28, 2026",
    badge: "Premium Upgrade",
    icon: Globe2,
    desc: "Premium account owners can now link their own website address (like events.yourbrand.com) in the website settings. This keeps your customers on your own branded page from start to finish.",
    link: "/pricing",
    linkLabel: "Upgrade to Premium",
  },
  {
    title: "Smart Crowd Control for Ticket Sales",
    date: "May 15, 2026",
    badge: "Performance",
    icon: Users,
    desc: "Selling tickets for a popular event? Our virtual waiting room automatically manages high demand, putting buyers in a fair, orderly line. This prevents website crashes and ensures a smooth checkout experience even during sold-out releases.",
    link: null,
  },
  {
    title: "Mobile Money Payouts Launched",
    date: "May 10, 2026",
    badge: "Payments",
    icon: CreditCard,
    desc: "Event organizers can now withdraw ticket sale payouts straight to MTN Mobile Money or Orange Money accounts in addition to bank cards. Withdrawals are processed within 24 hours directly from your organizer dashboard.",
    link: "/admin",
    linkLabel: "Go to Dashboard",
  },
  {
    title: "Real-Time Analytics Dashboard",
    date: "April 30, 2026",
    badge: "Analytics",
    icon: BarChart2,
    desc: "Your organizer dashboard now shows live registration counts, ticket check-ins, revenue totals, and attendee arrival rates as they happen — no page refresh needed.",
    link: "/admin",
    linkLabel: "View Dashboard",
  },
  {
    title: "Instant Ticket QR Generation",
    date: "April 20, 2026",
    badge: "New Feature",
    icon: Zap,
    desc: "Every purchased ticket now includes a unique QR code that attendees can show directly from their phone. Organisers can scan these at the door using any camera-enabled device.",
    link: null,
  },
];

export default function UpdatesPage() {
  return (
    <div className="min-h-screen bg-white text-[#1a1a1a] flex flex-col">
      <Navbar />

      {/* ── HERO ── */}
      <header className="bg-[#0f0f0f] text-white px-8 md:px-16 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-[#FF4747]/15 border border-[#FF4747]/30 text-[#FF4747] text-xs font-bold rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4747] animate-pulse" /> News & Updates
          </span>
          <h1 className="font-display text-5xl md:text-6xl font-black tracking-tight mb-5">
            What&apos;s New at <span className="text-[#F7E998]">YowEvent</span>
          </h1>
          <p className="text-[#aaa] text-base max-w-lg mx-auto leading-relaxed">
            Stay up to date with the latest features, improvements, and news designed to help you run better events.
          </p>
        </div>
      </header>

      {/* ── UPDATES ── */}
      <main className="flex-grow max-w-4xl mx-auto px-8 py-16 w-full">
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[#FF4747]/40 via-[#f0f0f0] to-transparent hidden md:block" />

          <div className="space-y-8">
            {updates.map((up, i) => {
              const Icon = up.icon;
              return (
                <article key={i} className="md:pl-16 relative group">
                  {/* Timeline dot */}
                  <div className="hidden md:flex absolute left-0 top-6 w-12 h-12 rounded-full bg-white border-2 border-[#f0f0f0] group-hover:border-[#FF4747] items-center justify-center transition-colors z-10">
                    <Icon size={18} className="text-[#FF4747]" />
                  </div>

                  <div className="bg-white border border-[#f0f0f0] rounded-3xl p-7 hover:border-[#FF4747]/30 hover:shadow-lg transition-all">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${BADGE_COLORS[up.badge] || "bg-gray-100 text-gray-600"}`}>
                        {up.badge}
                      </span>
                      <span className="text-xs text-[#aaa] font-mono">{up.date}</span>
                    </div>

                    <h2 className="font-display text-xl font-bold text-[#1a1a1a] mb-3 leading-snug">{up.title}</h2>
                    <p className="text-sm text-[#666] leading-relaxed">{up.desc}</p>

                    {up.link && (
                      <Link href={up.link} className="inline-flex items-center gap-1.5 mt-5 text-xs font-semibold text-[#FF4747] hover:gap-3 transition-all">
                        {up.linkLabel} <ArrowRight size={13} />
                      </Link>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </main>

      {/* ── SUBSCRIBE CTA ── */}
      <section className="mx-8 mb-12 rounded-3xl bg-[#FF4747] text-white p-10 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h3 className="font-display text-2xl font-black mb-2">Never miss an update</h3>
          <p className="text-white/80 text-sm max-w-sm">Get the latest features and announcements delivered straight to your inbox.</p>
        </div>
        <form onSubmit={e => e.preventDefault()} className="flex gap-3 w-full md:w-auto">
          <input
            type="email"
            placeholder="your@email.com"
            className="flex-1 md:w-64 bg-white/20 border border-white/30 text-white text-sm rounded-full px-5 py-3 outline-none placeholder:text-white/60 focus:bg-white/30 transition-colors"
          />
          <button type="submit" className="px-6 py-3 bg-white text-[#FF4747] rounded-full text-sm font-bold hover:bg-[#F7E998] transition-colors cursor-pointer whitespace-nowrap">
            Subscribe
          </button>
        </form>
      </section>

      <Footer />
    </div>
  );
}
