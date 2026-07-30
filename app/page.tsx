"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { Calendar, MapPin, ArrowRight, Zap, BarChart2, ShieldCheck, Mic2, Globe2, Smartphone, Check, X, Minus, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/app/context/LanguageContext";

const trustedOrgs = [
  "RENTAL WEB", "YOWPAINTER", "YOWYOB SEARCH",
  "FLEETMAN", "VERIFID", "TIIBNTICK", "RIDNGO", "YOWYOB EDUCATION"
];

type Flag = true | false | "partial";

const comparisonFlags: { yow: Flag; eventbrite: Flag; eventgate: Flag }[] = [
  { yow: true, eventbrite: false, eventgate: false },
  { yow: true, eventbrite: "partial", eventgate: "partial" },
  { yow: true, eventbrite: "partial", eventgate: "partial" },
  { yow: true, eventbrite: "partial", eventgate: "partial" },
  { yow: true, eventbrite: true, eventgate: "partial" },
  { yow: true, eventbrite: false, eventgate: "partial" },
  { yow: true, eventbrite: true, eventgate: "partial" },
  { yow: true, eventbrite: false, eventgate: false },
];

const featureIcons = [Zap, BarChart2, ShieldCheck, Mic2, Globe2, Smartphone];

export default function LandingPage() {
  const router = useRouter();
  const { language, t, tl } = useLanguage();
  const [auth, setAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [eventCount, setEventCount] = useState<string>("10K+");
  const [avgRating, setAvgRating] = useState<string>("4.9★");
  const [avgRatingVal, setAvgRatingVal] = useState<number>(5.0);
  const [organizerCount, setOrganizerCount] = useState<number | null>(null);

  useEffect(() => {
    setAuth(getStoredAuth());
    setMounted(true);
    eventService.getEvents({ skipAuth: true })
      .then((data: any) => {
        const list: any[] = Array.isArray(data) ? data : (data?.content ?? []);
        setFeaturedEvents(list.filter(e => e.status === "PUBLISHED" || e.status === "ACTIVE").slice(0, 10));
        if (list.length > 0) {
          setEventCount(String(list.length));
          const uniqueTenants = new Set(list.map(e => e.tenantId).filter(Boolean));
          if (uniqueTenants.size > 0) {
            setOrganizerCount(uniqueTenants.size);
          }
        }
      })
      .catch(() => { });

    eventService.getFeedbacks()
      .then((data: any) => {
        const list: any[] = Array.isArray(data) ? data : (data?.content ?? []);
        const rated = list.filter((f: any) => f.rating != null && f.rating > 0);
        if (rated.length > 0) {
          const avg = rated.reduce((s: number, f: any) => s + f.rating, 0) / rated.length;
          setAvgRating(`${avg.toFixed(1)}★`);
          setAvgRatingVal(avg);
        }
      })
      .catch(() => { });
  }, []);

  const isLoggedIn = mounted && auth !== null;

  const organizersLabel = organizerCount !== null
    ? t("home.hero.organizersCount", { count: organizerCount.toLocaleString(), plural: organizerCount !== 1 ? "s" : "" })
    : t("home.hero.organizersDefault");

  const displayEvents = featuredEvents;
  const dateLocale = language === "fr" ? "fr-FR" : "en-US";

  const featureItems: { title: string; desc: string }[] = tl("home.features.items");
  const stepItems: { title: string; desc: string }[] = tl("home.howItWorks.steps");
  const offlineBullets: string[] = tl("home.offline.bullets");
  const comparisonLabels: string[] = tl("home.comparison.rows");

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a] overflow-x-hidden">
      <Navbar />

      {/* ── HERO ── */}
      <motion.section
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative min-h-[90vh] flex items-center overflow-hidden bg-white">
        <div className="relative z-10 w-full max-w-[90rem] mx-auto px-8 md:px-16 py-24 grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="inline-flex items-center gap-2 bg-[#FF4747]/10 border border-[#FF4747]/20 rounded-full px-4 py-1.5 text-xs font-semibold text-[#FF4747] mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4747] animate-pulse" />
              {t("home.hero.badge", { rating: avgRatingVal.toFixed(1), organizers: organizersLabel })}
            </div>
            <h1 className="font-display text-7xl md:text-8xl font-black leading-[1.02] tracking-[-2px] text-[#1a1a1a] mb-6">
              {t("home.hero.headlinePart1")}<br />
              <span className="relative inline-block text-[#FF4747]">
                {t("home.hero.headlineHighlight")}
                <svg className="absolute left-0 -bottom-1.5 w-full" height="10" viewBox="0 0 120 10" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M2 7 Q 30 1 60 6 T 118 5" fill="none" stroke="#FF4747" strokeWidth="3" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1} style={{ animation: "draw-underline 1s ease-out 0.5s forwards" }} />
                </svg>
              </span><br />
              {t("home.hero.headlinePart2")}
            </h1>
            <p className="text-[#666] text-lg leading-relaxed max-w-lg mb-10">
              {t("home.hero.subtitle")}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href={isLoggedIn ? "/admin" : "/register"}>
                <button className="px-9 py-4 bg-[#FF4747] text-white rounded-full text-base font-bold hover:bg-[#e03e3e] hover:-translate-y-0.5 transition-all cursor-pointer flex items-center gap-2">
                  {isLoggedIn ? t("home.hero.ctaPrimaryLoggedIn") : t("home.hero.ctaPrimaryGuest")} <ArrowRight size={18} />
                </button>
              </Link>
              <Link href="/events">
                <button className="px-9 py-4 bg-white text-[#1a1a1a] border border-[#e5e7eb] rounded-full text-base font-medium hover:border-[#1a1a1a] hover:-translate-y-0.5 transition-all cursor-pointer">
                  {t("home.hero.ctaSecondary")}
                </button>
              </Link>
            </div>
            <div className="flex items-center gap-10 mt-14">
              {[[eventCount, t("home.hero.statEventsHosted")], ["99.9%", t("home.hero.statUptime")], [avgRating, t("home.hero.statAvgRating")]].map(([val, label], i) => (
                <div key={label} className={i > 0 ? "pl-10 border-l border-[#eee]" : ""}>
                  <div className="font-display text-3xl font-bold text-[#1a1a1a]">{val}</div>
                  <div className="text-sm text-[#999] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Hero illustration */}
          <div className="hidden md:flex justify-center relative">
            {/* Soft color glow behind the illustration */}
            <div className="absolute w-96 h-96 rounded-full bg-gradient-to-br from-[#FF4747]/15 via-[#F7E998]/20 to-transparent blur-3xl" />

            {/* Minimalist motion accents — a little "event spirit" */}
            <span className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-[#FF4747]/70 animate-[drift_3s_ease-in-out_infinite]" />
            <span className="absolute bottom-16 -left-6 w-2 h-2 rounded-full bg-[#1a1a1a]/15 animate-[drift_4.2s_ease-in-out_infinite_1s]" />
            <span className="absolute -bottom-2 right-6 w-16 h-16 rounded-full border-2 border-dashed border-[#FF4747]/25 animate-[spin-slow_16s_linear_infinite]" />

            <img
              src="/celebrating-team.png"
              alt="People celebrating at an event"
              className="relative z-10 w-full max-w-xl animate-[float_4s_ease-in-out_infinite]"
            />

            {/* Floating live-activity card */}
            <div className="absolute top-8 -left-8 z-20 bg-white border border-[#f0f0f0] rounded-2xl px-4 py-2.5 flex items-center gap-2 animate-[float_5s_ease-in-out_infinite_0.3s]">
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex w-full h-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-green-500" />
              </span>
              <span className="text-xs font-semibold text-[#1a1a1a] whitespace-nowrap">{t("home.hero.liveBadge")}</span>
            </div>

            {/* Floating rating card */}
            <div className="absolute bottom-10 -right-6 z-20 bg-white border border-[#f0f0f0] rounded-2xl px-4 py-3 flex items-center gap-2.5 animate-[float_4.5s_ease-in-out_infinite_0.6s]">
              <Star size={16} className="text-[#F7E998] fill-[#F7E998] shrink-0" />
              <div>
                <div className="text-sm font-bold text-[#1a1a1a] leading-none">{avgRating}</div>
                <div className="text-[10px] text-[#999] mt-0.5 whitespace-nowrap">{t("home.hero.ratingCardLabel")}</div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-16px); }
          }
          @keyframes drift {
            0%, 100% { transform: translateY(0) scale(1); opacity: 0.9; }
            50% { transform: translateY(-10px) scale(1.15); opacity: 1; }
          }
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes draw-underline {
            to { stroke-dashoffset: 0; }
          }
          @keyframes marquee {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>
      </motion.section>

      {/* ── TRUSTED BY ── */}
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="px-8 md:px-16 py-14 bg-white border-y border-[#f5f5f5]">
        <div className="max-w-[90rem] mx-auto">
          <p className="text-center text-lg font-bold tracking-[4px] text-[#FF4747] uppercase mb-8">
            {t("home.trusted.label")}
          </p>
          <div className="relative overflow-hidden">
            <div className="flex gap-16 items-center w-max animate-[marquee_26s_linear_infinite]">
              {[...trustedOrgs, ...trustedOrgs].map((name, i) => (
                <span key={i} className="font-display text-2xl font-bold text-[#ccc] tracking-tight whitespace-nowrap hover:text-[#FF4747] transition-colors">
                  {name}
                </span>
              ))}
            </div>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent" />
          </div>
        </div>
      </motion.section>

      {/* ── FEATURED EVENTS ── */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="px-8 md:px-16 py-24 bg-white border-t border-[#f0f0f0]">
        <div className="max-w-[90rem] mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
            <div>
              <span className="text-sm font-black text-white bg-[#FF4747] tracking-[4px] rounded-full px-5 py-2 inline-block mb-4 uppercase">{t("home.featured.eyebrow")}</span>
              <h2 className="font-display text-5xl font-black tracking-tight">{t("home.featured.title")}</h2>
            </div>
            <Link href="/events" className="text-sm font-semibold text-[#FF4747] hover:underline flex items-center gap-1.5">
              {t("home.featured.browseAll")} <ArrowRight size={14} />
            </Link>
          </div>

          <div className="flex overflow-x-auto gap-7 pb-8 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {displayEvents.map((ev: any) => (
              <Link key={ev.eventId} href={`/events/${ev.eventId}`} className="group block shrink-0 w-[85vw] md:w-[380px] bg-white rounded-3xl overflow-hidden border border-[#f0f0f0] hover:border-[#FF4747]/40 hover:-translate-y-1 transition-all duration-300 snap-start">
                <div className="relative h-56 bg-stone-100 overflow-hidden">
                  <img src={ev.coverImage || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600"} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">{ev.format === "VIRTUAL" ? t("home.featured.badgeOnline") : t("home.featured.badgeInPerson")}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${ev.isPaid ? "bg-[#F7E998] text-[#7a6a00]" : "bg-green-100 text-green-700"}`}>{ev.isPaid ? t("home.featured.badgePaid") : t("home.featured.badgeFree")}</span>
                  </div>
                </div>
                <div className="p-7">
                  <h3 className="font-display text-xl font-bold text-[#1a1a1a] mb-2 group-hover:text-[#FF4747] transition-colors leading-snug">{ev.title}</h3>
                  <p className="text-base text-[#666] line-clamp-2 leading-relaxed mb-5">{ev.description}</p>
                  <div className="flex items-center gap-2 text-sm text-[#FF4747] font-semibold">
                    <Calendar size={15} />
                    {new Date(ev.startDate).toLocaleDateString(dateLocale, { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── FEATURES ── */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="px-8 md:px-16 py-24 bg-white border-t border-[#f0f0f0]">
        <div className="max-w-[90rem] mx-auto">
          <div className="mb-16 max-w-xl">
            <span className="text-sm font-black text-white bg-[#FF4747] tracking-[4px] rounded-full px-5 py-2 inline-block mb-4.5 uppercase">{t("home.features.eyebrow")}</span>
            <h2 className="font-display text-5xl font-black tracking-tight mb-4 leading-snug">{t("home.features.titleLine1")}<br />{t("home.features.titleLine2")}</h2>
            <p className="text-[#666] text-base leading-relaxed">{t("home.features.subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featureItems.map((item, i) => {
              const Icon = featureIcons[i];
              return (
                <div key={item.title} className="group p-8 border border-[#f0f0f0] rounded-2xl hover:border-[#FF4747]/30 hover:-translate-y-0.5 transition-all cursor-default bg-white">
                  <div className="w-14 h-14 bg-[#1a1a1a] rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#FF4747] transition-colors">
                    <Icon size={24} className="text-white transition-colors" />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-2 text-[#1a1a1a]">{item.title}</h3>
                  <p className="text-base text-[#666] leading-relaxed">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ── HOW IT WORKS ── */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="px-8 md:px-16 py-24 bg-white border-t border-[#f0f0f0]">
        <div className="relative z-10 max-w-7xl mx-auto text-center">
          <span className="text-sm font-black text-white bg-[#FF4747] tracking-[4px] rounded-full px-5 py-2 inline-block mb-4.5 uppercase">{t("home.howItWorks.eyebrow")}</span>
          <h2 className="font-display text-5xl font-black tracking-tight mb-4">{t("home.howItWorks.title")}</h2>
          <p className="text-[#666] text-base max-w-lg mx-auto mb-16 leading-relaxed">{t("home.howItWorks.subtitle")}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative">
            {stepItems.map((step, i) => (
              <div key={step.title} className="relative">
                {i < 3 && <div className="hidden md:block absolute top-8 left-[calc(50%+32px)] right-[-calc(50%-32px)] h-px bg-[#f5f5f5] z-0" />}
                <div className="relative z-10 flex flex-col items-center p-6">
                  <div className="w-16 h-16 bg-[#FF4747] text-white rounded-full flex items-center justify-center font-display font-black text-base mb-5">{String(i + 1).padStart(2, "0")}</div>
                  <h3 className="font-display text-base font-bold mb-2 text-[#1a1a1a]">{step.title}</h3>
                  <p className="text-sm text-[#666] leading-relaxed text-center">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Link href="/register" className="inline-block mt-10">
            <button className="px-9 py-4 bg-[#1a1a1a] text-white rounded-full text-base font-semibold hover:bg-[#333] transition-all cursor-pointer flex items-center gap-2 mx-auto">
              {t("home.howItWorks.cta")} <ArrowRight size={17} />
            </button>
          </Link>
        </div>
      </motion.section>

      {/* ── OFFLINE PROMO ── */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="px-8 md:px-16 py-24 bg-white border-t border-[#f0f0f0]">
        <div className="max-w-[90rem] mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#FF4747]/10 border border-[#FF4747]/20 rounded-full px-3 py-1 text-xs font-semibold text-[#FF4747] mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4747] animate-pulse" /> {t("home.offline.pillLabel")}
            </div>
            <h2 className="font-display text-5xl font-black tracking-tight mb-5 leading-tight text-[#1a1a1a]">
              {t("home.offline.titleLine1")} <br /><span className="text-[#FF4747]">{t("home.offline.titleHighlight")}</span>
            </h2>
            <p className="text-[#666] text-base leading-relaxed mb-8">
              {t("home.offline.desc")}
            </p>
            <ul className="space-y-3.5 text-base text-[#444]">
              {offlineBullets.map(item => (
                <li key={item} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#FF4747]/10 flex items-center justify-center text-[#FF4747] text-sm font-bold shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" className="inline-block mt-8">
              <button className="px-8 py-3.5 bg-[#FF4747] text-white rounded-full text-base font-semibold hover:bg-[#e03e3e] transition-all cursor-pointer">
                {t("home.offline.cta")}
              </button>
            </Link>
          </div>

          {/* No-connectivity visual — large WiFi-off mark, minimal and clean */}
          <div className="relative hidden md:flex items-center justify-center py-8">
            <div className="absolute w-full max-w-[42rem] aspect-square rounded-full bg-gradient-to-br from-[#FF4747]/10 via-[#F7E998]/15 to-transparent blur-3xl" />
            <img
              src="/nowifi.png"
              alt="No WiFi connection"
              className="relative w-full max-w-[36rem] h-auto object-contain animate-[float_4s_ease-in-out_infinite]"
            />
          </div>
        </div>
      </motion.section>

      {/* ── COMPARISON ── */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="px-8 md:px-16 py-24 bg-white border-t border-[#f0f0f0]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <span className="text-sm font-black text-white bg-[#FF4747] tracking-[4px] rounded-full px-5 py-2 inline-block mb-4.5 uppercase">{t("home.comparison.eyebrow")}</span>
            <h2 className="font-display text-5xl font-black tracking-tight mb-4">{t("home.comparison.title")}</h2>
            <p className="text-[#666] text-base max-w-lg mx-auto leading-relaxed">{t("home.comparison.subtitle")}</p>
          </div>

          <div className="border border-[#f0f0f0] rounded-3xl overflow-x-auto">
            <table className="w-full border-collapse text-base min-w-[600px]">
              <thead>
                <tr className="bg-[#faf9f7]">
                  <th className="text-left font-semibold text-[#1a1a1a] px-7 py-5">{t("home.comparison.colFeature")}</th>
                  <th className="px-5 py-5 text-[#FF4747] font-display font-bold">{t("home.comparison.colYow")}</th>
                  <th className="px-5 py-5 text-[#999] font-medium">{t("home.comparison.colEventbrite")}</th>
                  <th className="px-5 py-5 text-[#999] font-medium">{t("home.comparison.colEventgate")}</th>
                </tr>
              </thead>
              <tbody>
                {comparisonFlags.map((flags, i) => (
                  <tr key={comparisonLabels[i]} className={i % 2 === 0 ? "bg-white" : "bg-[#faf9f7]/60"}>
                    <td className="px-7 py-5 text-[#444] border-t border-[#f0f0f0]">{comparisonLabels[i]}</td>
                    <td className="px-5 py-5 text-center border-t border-[#f0f0f0]">{renderComparisonCell(flags.yow)}</td>
                    <td className="px-5 py-5 text-center border-t border-[#f0f0f0]">{renderComparisonCell(flags.eventbrite)}</td>
                    <td className="px-5 py-5 text-center border-t border-[#f0f0f0]">{renderComparisonCell(flags.eventgate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-[#aaa] mt-4 text-center leading-relaxed">
            {t("home.comparison.footnote")}
          </p>
        </div>
      </motion.section>

      {/* ── FAQ ── */}
      <FaqSection />

      {/* ── CTA ── */}
      <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="px-8 md:px-16 py-24 bg-[#FF4747] text-white text-center">
        <h2 className="font-display text-6xl font-black mb-4 tracking-tight">{t("home.cta.title")}</h2>
        <p className="text-white/80 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
          {t("home.cta.subtitle")}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href={isLoggedIn ? "/admin" : "/register"}>
            <button className="px-11 py-4.5 bg-white text-[#FF4747] rounded-full text-base font-bold hover:-translate-y-0.5 transition-all cursor-pointer">
              {isLoggedIn ? t("home.cta.primaryLoggedIn") : t("home.cta.primaryGuest")}
            </button>
          </Link>
          <Link href="/pricing">
            <button className="px-11 py-4.5 bg-white/20 backdrop-blur text-white border border-white/30 rounded-full text-base font-semibold hover:bg-white/30 transition-all cursor-pointer">
              {t("home.cta.secondary")}
            </button>
          </Link>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
}

function renderComparisonCell(value: true | false | "partial") {
  if (value === true) return <Check size={19} strokeWidth={2.5} className="text-green-600 mx-auto" />;
  if (value === "partial") return <Minus size={19} strokeWidth={2.5} className="text-amber-500 mx-auto" />;
  return <X size={19} strokeWidth={2.5} className="text-[#ccc] mx-auto" />;
}

function FaqSection() {
  const { t, tl } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs: { q: string; a: string }[] = tl("home.faq.items");

  return (
    <motion.section 
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.6 }}
        className="px-8 md:px-16 py-24 bg-white border-t border-[#f0f0f0]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-sm font-black text-white bg-[#FF4747] tracking-[4px] rounded-full px-5 py-2 inline-block mb-4.5 uppercase">{t("home.faq.eyebrow")}</span>
          <h2 className="font-display text-5xl font-black tracking-tight">{t("home.faq.title")}</h2>


        </div>
        <div className="space-y-3.5">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-[#f0f0f0] rounded-2xl overflow-hidden">
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-7 py-6 flex items-center justify-between text-left font-semibold text-base text-[#1a1a1a] hover:bg-white transition-colors cursor-pointer">
                <span>{faq.q}</span>
                <span className={`text-2xl font-bold transition-colors ${openIndex === i ? "text-[#FF4747]" : "text-[#bbb]"}`}>{openIndex === i ? "−" : "+"}</span>
              </button>
              {openIndex === i && (
                <div className="px-7 pb-6 pt-2 text-base text-[#666] leading-relaxed border-t border-[#f0f0f0] bg-white">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
