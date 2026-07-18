"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { Calendar, MapPin, ArrowRight, Zap, BarChart2, ShieldCheck, Mic2, Globe2, Smartphone } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LandingPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [eventCount, setEventCount] = useState<string>("10K+");
  const [avgRating, setAvgRating] = useState<string>("4.9★");
  const [avgRatingVal, setAvgRatingVal] = useState<number>(5.0);
  const [organizerText, setOrganizerText] = useState<string>("10,000+ organizers");

  useEffect(() => {
    setAuth(getStoredAuth());
    setMounted(true);
    eventService.getEvents({ skipAuth: true })
      .then((data: any) => {
        const list: any[] = Array.isArray(data) ? data : (data?.content ?? []);
        setFeaturedEvents(list.filter(e => e.status === "PUBLISHED" || e.status === "ACTIVE").slice(0, 3));
        if (list.length > 0) {
          setEventCount(String(list.length));
          const uniqueTenants = new Set(list.map(e => e.tenantId).filter(Boolean));
          if (uniqueTenants.size > 0) {
            setOrganizerText(`${uniqueTenants.size.toLocaleString()} organizer${uniqueTenants.size !== 1 ? "s" : ""}`);
          }
        }
      })
      .catch(() => {});

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
      .catch(() => {});
  }, []);

  const isLoggedIn = mounted && auth !== null;

  const mockEvents = [
    { eventId: "e1", title: "Nairobi Tech Summit 2026", description: "Join tech leaders across East Africa discussing microservices, cloud scaling, and AI ecosystems.", startDate: "2026-07-12T09:00:00Z", format: "IN_PERSON", isPaid: true, coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600" },
    { eventId: "e2", title: "Africa Design Week", description: "Celebrating innovative typography, layout systems, and product designs shaping modern applications.", startDate: "2026-08-05T10:00:00Z", format: "VIRTUAL", isPaid: false, coverImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=600" },
    { eventId: "e3", title: "FinTech Innovation Forum", description: "Discussing payments, banking APIs, security auditing, and ledger-based tracking architectures.", startDate: "2026-09-18T08:30:00Z", format: "IN_PERSON", isPaid: true, coverImage: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=600" },
  ];

  const displayEvents = featuredEvents.length > 0 ? featuredEvents : mockEvents;

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a] overflow-x-hidden">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-white">
        <div className="relative z-10 w-full max-w-7xl mx-auto px-8 md:px-16 py-24 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#FF4747]/10 border border-[#FF4747]/20 rounded-full px-4 py-1.5 text-xs font-semibold text-[#FF4747] mb-8">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4747] animate-pulse" />
              {avgRatingVal.toFixed(1)} Rated · Trusted by {organizerText}
            </div>
            <h1 className="font-display text-6xl md:text-7xl font-black leading-[1.02] tracking-[-2px] text-[#1a1a1a] mb-6">
              Events,<br />
              <span className="text-[#FF4747]">Effortlessly</span><br />
              Managed
            </h1>
            <p className="text-[#666] text-base leading-relaxed max-w-md mb-10">
              The all-in-one platform for creating, selling, and managing events across Africa — from intimate workshops to sold-out concerts.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href={isLoggedIn ? "/admin" : "/register"}>
                <button className="px-8 py-3.5 bg-[#FF4747] text-white rounded-full text-sm font-bold hover:bg-[#e03e3e] hover:-translate-y-0.5 transition-all cursor-pointer shadow-lg shadow-[#FF4747]/25 flex items-center gap-2">
                  {isLoggedIn ? "Go to Dashboard" : "Start for Free"} <ArrowRight size={16} />
                </button>
              </Link>
              <Link href="/events">
                <button className="px-8 py-3.5 bg-white text-[#1a1a1a] border border-[#e5e7eb] rounded-full text-sm font-medium hover:border-[#1a1a1a] hover:-translate-y-0.5 transition-all cursor-pointer shadow-sm">
                  Browse Events
                </button>
              </Link>
            </div>
            <div className="flex gap-10 mt-12 pt-10 border-t border-[#f0f0f0]">
              {[[eventCount, "Events hosted"], ["99.9%", "Uptime SLA"], [avgRating, "Avg. rating"]].map(([val, label]) => (
                <div key={label}>
                  <div className="font-display text-2xl font-bold text-[#1a1a1a]">{val}</div>
                  <div className="text-xs text-[#999] mt-0.5">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero illustration */}
          <div className="hidden md:flex justify-center">
            <img
              src="/celebrating-team.png"
              alt="People celebrating at an event"
              className="w-full max-w-md animate-[float_4s_ease-in-out_infinite]"
            />
          </div>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-16px); }
          }
        `}</style>
      </section>

      {/* ── FEATURED EVENTS ── */}
      <section className="px-8 md:px-16 py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
            <div>
              <span className="text-sm font-black text-white bg-[#FF4747] tracking-[4px] rounded-full px-5 py-2 inline-block mb-4 uppercase shadow-md shadow-[#FF4747]/20">Explore</span>
              <h2 className="font-display text-4xl font-black tracking-tight">Featured Events</h2>
            </div>
            <Link href="/events" className="text-sm font-semibold text-[#FF4747] hover:underline flex items-center gap-1.5">
              Browse all <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-7">
            {displayEvents.map((ev: any) => (
              <Link key={ev.eventId} href={`/events/${ev.eventId}`} className="group block bg-white rounded-3xl overflow-hidden border border-[#f0f0f0] hover:border-[#FF4747]/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="relative h-48 bg-stone-100 overflow-hidden">
                  <img src={ev.coverImage || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600"} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide">{ev.format === "VIRTUAL" ? "Online" : "In Person"}</span>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${ev.isPaid ? "bg-[#F7E998] text-[#7a6a00]" : "bg-green-100 text-green-700"}`}>{ev.isPaid ? "Paid" : "Free"}</span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-2 group-hover:text-[#FF4747] transition-colors leading-snug">{ev.title}</h3>
                  <p className="text-sm text-[#666] line-clamp-2 leading-relaxed mb-5">{ev.description}</p>
                  <div className="flex items-center gap-2 text-xs text-[#FF4747] font-semibold">
                    <Calendar size={13} />
                    {new Date(ev.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="px-8 md:px-16 py-24 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="mb-16 max-w-xl">
            <span className="text-sm font-black text-white bg-[#FF4747] tracking-[4px] rounded-full px-5 py-2 inline-block mb-4.5 uppercase shadow-md shadow-[#FF4747]/20">Why YowEvent</span>
            <h2 className="font-display text-4xl font-black tracking-tight mb-4 leading-snug">Everything you need,<br />nothing you don&apos;t</h2>
            <p className="text-[#666] text-sm leading-relaxed">A unified platform covering the entire event lifecycle — from creation to ticket sales and analytics — with smart protection built in.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { icon: Zap, title: "Smart Ticketing", desc: "Free and paid tickets, discount coupons, easy attendee lists, and mobile ticket check-in.", accent: "#FF4747" },
              { icon: BarChart2, title: "Real-Time Analytics", desc: "Live dashboards showing registrations, check-ins, sales revenue and arrivals as they happen.", accent: "#FF4747" },
              { icon: ShieldCheck, title: "Crowd Control", desc: "Virtual waiting room keeps the site fast and live even during high-demand ticket releases.", accent: "#FF4747" },
              { icon: Mic2, title: "Guest Engagement", desc: "Live Q&A, audience polls, and direct feedback collection — no extra tools required.", accent: "#FF4747" },
              { icon: Globe2, title: "Branded Portfolios", desc: "Your own custom webpage with logo, colors, fonts, and a custom web address.", accent: "#FF4747" },
              { icon: Smartphone, title: "Safe Payments", desc: "MTN MoMo, Orange Money, and card payments — all secured with industry-grade protection.", accent: "#FF4747" },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="group p-7 border border-[#f0f0f0] rounded-2xl hover:border-[#FF4747]/30 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-default bg-white">
                <div className="w-11 h-11 bg-[#F7E998] rounded-xl flex items-center justify-center mb-5 group-hover:bg-[#FF4747] group-hover:text-white transition-colors">
                  <Icon size={20} className="text-[#1a1a1a] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-display text-base font-bold mb-2 text-[#1a1a1a]">{title}</h3>
                <p className="text-sm text-[#666] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="px-8 md:px-16 py-24 bg-white">
        <div className="relative z-10 max-w-5xl mx-auto text-center">
          <span className="text-sm font-black text-white bg-[#FF4747] tracking-[4px] rounded-full px-5 py-2 inline-block mb-4.5 uppercase shadow-md shadow-[#FF4747]/20">How It Works</span>
          <h2 className="font-display text-4xl font-black tracking-tight mb-4">Up and running in minutes</h2>
          <p className="text-[#666] text-sm max-w-md mx-auto mb-16 leading-relaxed">No sales calls. No setup fees. Sign up and start building your event right away.</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative">
            {[
              ["01", "Create Account", "Sign up free and set up your branded event space in seconds."],
              ["02", "Build Your Event", "Set schedule, tickets, sessions and agenda using our guided builder."],
              ["03", "Publish & Invite", "Go live with one click. Share and send invitations to your audience."],
              ["04", "Analyse & Grow", "Review live analytics, traffic reports and attendee feedback in real time."],
            ].map(([num, title, desc], i) => (
              <div key={num} className="relative">
                {i < 3 && <div className="hidden md:block absolute top-6 left-[calc(50%+24px)] right-[-calc(50%-24px)] h-px bg-[#f5f5f5] z-0" />}
                <div className="relative z-10 flex flex-col items-center p-6">
                  <div className="w-12 h-12 bg-[#FF4747] text-white rounded-full flex items-center justify-center font-display font-black text-sm mb-5 shadow-lg shadow-[#FF4747]/20">{num}</div>
                  <h3 className="font-display text-sm font-bold mb-2 text-[#1a1a1a]">{title}</h3>
                  <p className="text-xs text-[#666] leading-relaxed text-center">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <Link href="/register" className="inline-block mt-10">
            <button className="px-8 py-3.5 bg-[#1a1a1a] text-white rounded-full text-sm font-semibold hover:bg-[#333] transition-all cursor-pointer flex items-center gap-2 mx-auto">
              Get started free <ArrowRight size={15} />
            </button>
          </Link>
        </div>
      </section>

      {/* ── OFFLINE PROMO ── */}
      <section className="px-8 md:px-16 py-24 bg-white">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#FF4747]/10 border border-[#FF4747]/20 rounded-full px-3 py-1 text-xs font-semibold text-[#FF4747] mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF4747] animate-pulse" /> Offline Mode Active
            </div>
            <h2 className="font-display text-4xl font-black tracking-tight mb-5 leading-tight text-[#1a1a1a]">
              No internet? <br /><span className="text-[#FF4747]">Keep scanning.</span>
            </h2>
            <p className="text-[#666] text-sm leading-relaxed mb-8">
              YowEvent is built to work offline. All guest lists and ticket data are saved locally so you can check in attendees in remote venues with zero Wi-Fi or cell service.
            </p>
            <ul className="space-y-3 text-sm text-[#444]">
              {["Automatic sync when internet returns", "Scan & verify tickets offline instantly", "Search guest lists without page reloads"].map(item => (
                <li key={item} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-[#FF4747]/10 flex items-center justify-center text-[#FF4747] text-xs font-bold shrink-0">✓</span>
                  {item}
                </li>
              ))}
            </ul>
            <Link href="/register" className="inline-block mt-8">
              <button className="px-7 py-3 bg-[#FF4747] text-white rounded-full text-sm font-semibold hover:bg-[#e03e3e] transition-all cursor-pointer">
                Start for Free
              </button>
            </Link>
          </div>

          {/* Contained dark "device" mockup — intentional product-screenshot styling, not a full dark section */}
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-3xl p-7 shadow-xl shadow-black/10 font-mono text-xs">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span className="ml-2 text-[#555] uppercase tracking-widest text-[9px]">Offline Console</span>
            </div>
            <div className="space-y-2">
              <p className="text-[#555]">// Loading ticket scanner...</p>
              <p className="text-white">Scanner ready: <span className="text-green-400">Active</span></p>
              <p className="text-white">Ticket list: <span className="text-[#F7E998]">Saved to device</span></p>
              <p className="text-green-400">✓ 240 guest tickets synced</p>
              <p className="text-[#555]">// Status: OFFLINE MODE</p>
              <p className="text-[#FF4747]">→ Ticket verified in 0.01s</p>
              <p className="text-amber-400">ℹ Check-ins queued. Will sync on reconnect.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <FaqSection />

      {/* ── CTA ── */}
      <section className="px-8 md:px-16 py-24 bg-[#FF4747] text-white text-center">
        <h2 className="font-display text-5xl font-black mb-4 tracking-tight">Ready to run better events?</h2>
        <p className="text-white/80 text-sm max-w-md mx-auto mb-10 leading-relaxed">
          Join thousands of organisers who trust YowEvent to manage every detail — from first ticket to final report.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link href={isLoggedIn ? "/admin" : "/register"}>
            <button className="px-10 py-4 bg-white text-[#FF4747] rounded-full text-sm font-bold hover:-translate-y-0.5 transition-all cursor-pointer shadow-xl">
              {isLoggedIn ? "Go to Dashboard" : "Get Started for Free"}
            </button>
          </Link>
          <Link href="/pricing">
            <button className="px-10 py-4 bg-white/20 backdrop-blur text-white border border-white/30 rounded-full text-sm font-semibold hover:bg-white/30 transition-all cursor-pointer">
              View Pricing
            </button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    { q: "How do ticket sales and payouts work?", a: "You can create both free and paid tickets. Guests pay via MTN MoMo, Orange Money, or card. Payouts are transferred directly to your bank or mobile money wallet." },
    { q: "Can I use my own custom domain?", a: "Yes! Premium account owners can connect their own domain (like events.mycompany.com) in the website settings to give event pages a fully branded feel." },
    { q: "How does the crowd control waiting room work?", a: "When too many people rush for tickets at once, our smart queuing system puts buyers in a fair virtual line — protecting the site from crashes and ensuring everyone gets a chance." },
    { q: "Does YowEvent work without internet?", a: "Yes! All attendee information is saved locally on your device so you can scan tickets and run check-ins in remote venues with zero connectivity." },
  ];

  return (
    <section className="px-8 md:px-16 py-24 bg-white">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-14">
          <span className="text-sm font-black text-white bg-[#FF4747] tracking-[4px] rounded-full px-5 py-2 inline-block mb-4.5 uppercase shadow-md shadow-[#FF4747]/20">FAQ</span>
          <h2 className="font-display text-4xl font-black tracking-tight">Common questions</h2>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-[#f0f0f0] rounded-2xl overflow-hidden">
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-5 flex items-center justify-between text-left font-semibold text-sm text-[#1a1a1a] hover:bg-white transition-colors cursor-pointer">
                <span>{faq.q}</span>
                <span className={`text-xl font-bold transition-colors ${openIndex === i ? "text-[#FF4747]" : "text-[#bbb]"}`}>{openIndex === i ? "−" : "+"}</span>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5 pt-2 text-sm text-[#666] leading-relaxed border-t border-[#f0f0f0] bg-white">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
