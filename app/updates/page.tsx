"use client";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { WifiOff, Globe2, Users, CreditCard, Zap, BarChart2, ArrowRight } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";

const BADGE_COLORS: Record<string, string> = {
  newFeature:      "bg-[#FF4747]/10 text-[#FF4747] border border-[#FF4747]/20",
  premiumUpgrade:  "bg-[#F7E998]/60 text-[#7a6a00] border border-[#F7E998]",
  performance:     "bg-blue-50 text-blue-600 border border-blue-100",
  payments:        "bg-green-50 text-green-600 border border-green-100",
  analytics:       "bg-purple-50 text-purple-600 border border-purple-100",
};

const updateMeta = [
  { badgeKey: "newFeature", icon: WifiOff, link: null },
  { badgeKey: "premiumUpgrade", icon: Globe2, link: "/pricing" },
  { badgeKey: "performance", icon: Users, link: null },
  { badgeKey: "payments", icon: CreditCard, link: "/admin" },
  { badgeKey: "analytics", icon: BarChart2, link: "/admin" },
  { badgeKey: "newFeature", icon: Zap, link: null },
];

export default function UpdatesPage() {
  const { t, tl } = useLanguage();
  const items: { title: string; date: string; desc: string; linkLabel: string }[] = tl("updatesPage.items");
  const updates = updateMeta.map((meta, i) => ({ ...meta, ...items[i] }));

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a] flex flex-col">
      <Navbar />

      {/* ── HERO ── */}
      <header className="bg-white text-[#1a1a1a] px-8 md:px-16 py-20">
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 bg-[#FF4747]/10 border border-[#FF4747]/20 text-[#FF4747] text-xs font-bold rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4747] animate-pulse" /> {t("updatesPage.hero.newsBadge")}
          </span>
          <h1 className="font-display text-5xl md:text-6xl font-black tracking-tight mb-5">
            {t("updatesPage.hero.titlePrefix")} <span className="text-[#FF4747]">YowEvent</span>
          </h1>
          <p className="text-[#666] text-base max-w-lg mx-auto leading-relaxed">
            {t("updatesPage.hero.subtitle")}
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
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full ${BADGE_COLORS[up.badgeKey] || "bg-gray-100 text-gray-600"}`}>
                        {t(`updatesPage.badges.${up.badgeKey}`)}
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
          <h3 className="font-display text-2xl font-black mb-2">{t("updatesPage.subscribe.title")}</h3>
          <p className="text-white/80 text-sm max-w-sm">{t("updatesPage.subscribe.desc")}</p>
        </div>
        <form onSubmit={e => e.preventDefault()} className="flex gap-3 w-full md:w-auto">
          <input
            type="email"
            placeholder={t("updatesPage.subscribe.placeholder")}
            className="flex-1 md:w-64 bg-white/20 border border-white/30 text-white text-sm rounded-full px-5 py-3 outline-none placeholder:text-white/60 focus:bg-white/30 transition-colors"
          />
          <button type="submit" className="px-6 py-3 bg-white text-[#FF4747] rounded-full text-sm font-bold hover:bg-[#F7E998] transition-colors cursor-pointer whitespace-nowrap">
            {t("updatesPage.subscribe.button")}
          </button>
        </form>
      </section>

      <Footer />
    </div>
  );
}
