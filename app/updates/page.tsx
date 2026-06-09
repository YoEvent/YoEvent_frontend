"use client";
import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Sparkles, Calendar, WifiOff, Users, ArrowRight } from "lucide-react";

export default function UpdatesPage() {
  const updates = [
    {
      title: "Offline Mode is Now Active",
      date: "June 2, 2026",
      badge: "New Feature",
      icon: WifiOff,
      desc: "Run your events with confidence, even in remote locations. You can now download your guest lists directly to your device and scan tickets without any active Wi-Fi or cellular connection. Your device will automatically sync back when internet returns.",
    },
    {
      title: "Connect Your Custom Web Address",
      date: "May 28, 2026",
      badge: "Premium Upgrade",
      icon: Sparkles,
      desc: "Premium account owners can now link their own website address (like events.yourbrand.com) in the website settings. This keeps your customers on your own branded page from start to finish.",
    },
    {
      title: "Smart Crowd Control for Ticket Sales",
      date: "May 15, 2026",
      badge: "Performance",
      icon: Users,
      desc: "Selling tickets for a popular event? Our new virtual waiting room automatically manages high demand, putting buyers in a fair, orderly line. This prevents website crashes and ensures a smooth checkout experience.",
    },
    {
      title: "Mobile Money Payouts Launched",
      date: "May 10, 2026",
      badge: "Payments",
      icon: Calendar,
      desc: "We have integrated mobile money withdrawals directly. Event organizers can now withdraw their ticket sale payouts straight to MTN Mobile Money or Orange Money accounts in addition to bank cards.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a] flex flex-col">
      <Navbar />

      <main className="flex-grow max-w-4xl mx-auto px-6 py-20 w-full">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-block bg-[#8a7d5a]/10 border border-[#8a7d5a]/20 rounded-full px-4 py-1.5 text-xs text-[#8a7d5a] uppercase tracking-widest mb-4">News & Updates</span>
          <h1 className="font-display text-5xl font-black tracking-tight mb-3">What&apos;s New at YowEvent</h1>
          <p className="text-sm text-[#666] max-w-lg mx-auto">
            Stay up to date with the latest features, improvements, and news designed to help you run better events.
          </p>
        </div>

        {/* Updates List */}
        <div className="space-y-12">
          {updates.map((up, i) => {
            const Icon = up.icon;
            return (
              <article key={i} className="bg-white border border-[#e0d8c8] rounded-3xl p-8 shadow-sm flex flex-col md:flex-row gap-6 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-2xl bg-[#8a7d5a]/10 flex items-center justify-center text-[#8a7d5a] flex-shrink-0">
                  <Icon size={24} />
                </div>
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs font-semibold text-[#8a7d5a] uppercase tracking-wider">{up.badge}</span>
                    <span className="text-xs text-[#888] font-mono">{up.date}</span>
                  </div>
                  <h2 className="font-display text-2xl font-bold text-[#1a1a1a] leading-snug">{up.title}</h2>
                  <p className="text-sm text-[#666] leading-relaxed font-light">{up.desc}</p>
                </div>
              </article>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
