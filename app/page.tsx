"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getApiBaseUrl, getStoredAuth } from "@/app/utils/api";
import { Calendar, MapPin } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LandingPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);

  useEffect(() => {
    setAuth(getStoredAuth());
    setMounted(true);

    // Fetch featured events from API gateway
    fetch(`${getApiBaseUrl()}/api/v1/events`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const active = data.filter(e => e.status === "PUBLISHED" || e.status === "ACTIVE").slice(0, 3);
          setFeaturedEvents(active);
        }
      })
      .catch(() => {
        // Fallback handled in rendering
      });
  }, []);

  // Prevent hydration mismatch by rendering default navbar layout initially
  const isLoggedIn = mounted && auth !== null;

  const mockEvents = [
    {
      eventId: "e1",
      title: "Nairobi Tech Summit 2026",
      description: "Join tech leaders across East Africa discussing microservices, cloud scaling, and AI ecosystems.",
      startDate: "2026-07-12T09:00:00Z",
      format: "IN_PERSON",
      isPaid: true,
      coverImage: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600",
    },
    {
      eventId: "e2",
      title: "Africa Design Week",
      description: "Celebrating innovative typography, layout systems, and product designs shaping modern applications.",
      startDate: "2026-08-05T10:00:00Z",
      format: "VIRTUAL",
      isPaid: false,
      coverImage: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=600",
    },
    {
      eventId: "e3",
      title: "FinTech Innovation Forums",
      description: "Discussing payments, banking APIs, security auditing, and ledger-based tracking architectures.",
      startDate: "2026-09-18T08:30:00Z",
      format: "IN_PERSON",
      isPaid: true,
      coverImage: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=600",
    },
  ];

  const displayEvents = featuredEvents.length > 0 ? featuredEvents : mockEvents;

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a] overflow-x-hidden">
      <Navbar />

      {/* HERO */}
      <section className="grid md:grid-cols-2 min-h-[85vh] items-center px-16 py-20 bg-gradient-to-br from-[#e8e0cc] via-[#d4c9a8] to-[#c8bb96]">
        <div className="pr-16">
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur border border-white/80 rounded-full px-4 py-1.5 text-xs font-medium text-[#5a5040] mb-7">
            <span className="text-[#8a7d5a]">★</span>
            5.0 Rated · Read Our Success Stories
          </div>
          <h1 className="font-display text-6xl md:text-7xl font-black leading-[1.05] tracking-[-2px] text-[#1a1a1a] mb-5">
            Manage{" "}
            <em className="italic text-[#5a5040]">Events</em>
            <br />At Any Scale
          </h1>
          <p className="text-base text-[#4a4030] leading-relaxed max-w-md mb-9 font-light">
            Easily add and organise events, with real-time notifications and smart traffic engineering to keep everyone engaged and your platform running smoothly.
          </p>
          <div className="flex items-center gap-4 mb-10">
            {isLoggedIn ? (
              <Link href="/admin">
                <button className="px-8 py-3.5 bg-[#1a1a1a] text-white rounded-full text-base font-medium hover:bg-[#333] hover:-translate-y-0.5 transition-all cursor-pointer">
                  Create an event
                </button>
              </Link>
            ) : (
              <Link href="/register">
                <button className="px-8 py-3.5 bg-[#1a1a1a] text-white rounded-full text-base font-medium hover:bg-[#333] hover:-translate-y-0.5 transition-all cursor-pointer">
                  Create an event
                </button>
              </Link>
            )}
          </div>
          <div className="flex gap-8">
            {[["10K+", "Events hosted"], ["98%", "Uptime SLA"], ["4.9★", "Satisfaction"]].map(([val, label]) => (
              <div key={label} className="flex flex-col">
                <strong className="font-display text-3xl font-bold text-[#1a1a1a]">{val}</strong>
                <span className="text-xs text-[#6a5e48]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero card */}
        <div className="hidden md:flex items-center justify-center relative">
          <div className="bg-white rounded-2xl p-7 shadow-2xl w-80 relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8a7d5a] to-[#5a4a30] flex items-center justify-center text-white font-bold text-sm">YE</div>
              <div>
                <div className="font-semibold text-sm">Event Overview</div>
                <div className="text-xs text-[#888]">2 active events</div>
              </div>
            </div>
            {[
              { name: "Tech Summit 2026", date: "Jun 14", fill: "600/500", pct: 96, badge: "Live", badgeColor: "bg-green-100 text-green-800" },
              { name: "Design Workshop", date: "Jul 3", fill: "120/300", pct: 40, badge: "Upcoming", badgeColor: "bg-amber-100 text-amber-800" },
            ].map((ev) => (
              <div key={ev.name} className="bg-[#f5f0e8] rounded-xl p-4 mb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-sm">{ev.name}</div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${ev.badgeColor}`}>{ev.badge}</span>
                </div>
                <div className="flex gap-3 text-xs text-[#888] mb-2">
                  <span>📅 {ev.date}</span><span>👥 {ev.fill}</span>
                </div>
                <div className="flex justify-between text-xs text-[#888] mb-1"><span>Capacity</span><span>{ev.pct}%</span></div>
                <div className="h-1 bg-[#e0d8c8] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#8a7d5a] to-[#5a4a30] rounded-full" style={{ width: `${ev.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="absolute top-6 -right-4 bg-[#1a1a1a] text-white rounded-xl px-4 py-2.5 text-xs font-medium shadow-xl z-20">📈 +21% Engagement</div>
          <div className="absolute -bottom-2 -left-4 bg-white rounded-xl px-4 py-2.5 text-xs font-medium shadow-xl border border-[#e0d8c8] z-20">✅ 100% Satisfied</div>
        </div>
      </section>

      {/* FEATURED EVENTS */}
      <section className="px-16 py-24 bg-[#f5f0e8] border-t border-[#e0d8c8]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 flex justify-between items-end flex-wrap gap-4">
            <div>
              <span className="text-xs font-medium text-[#8a7d5a] tracking-[3px] uppercase mb-3 block">Explore</span>
              <h2 className="font-display text-4xl font-bold tracking-tight text-[#1a1a1a]">Featured Events</h2>
            </div>
            <Link href="/events" className="text-sm font-semibold text-[#8a7d5a] hover:underline flex items-center gap-1">
              Browse all events →
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {displayEvents.map((ev: any) => (
              <Link key={ev.eventId} href={`/events/${ev.eventId}`} className="group block bg-white rounded-3xl overflow-hidden border border-[#e0d8c8] hover:border-[#8a7d5a] hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                <div className="relative h-48 bg-stone-100 overflow-hidden">
                  <img
                    src={ev.coverImage || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=600"}
                    alt={ev.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="bg-white/95 backdrop-blur-sm text-[#1a1a1a] text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wider">
                      {ev.format === "VIRTUAL" ? "Online" : "In Person"}
                    </span>
                    <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm uppercase tracking-wider ${ev.isPaid ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                      {ev.isPaid ? 'Paid' : 'Free'}
                    </span>
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-2 group-hover:text-[#8a7d5a] transition-colors leading-snug">
                    {ev.title}
                  </h3>
                  <p className="text-sm text-[#666] line-clamp-2 leading-relaxed mb-6 flex-1">
                    {ev.description}
                  </p>
                  <div className="pt-4 border-t border-[#f5f0e8] flex items-center gap-2 text-xs text-[#8a7d5a] font-semibold">
                    <Calendar size={14} />
                    {new Date(ev.startDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-16 py-24 bg-white">
        <div className="text-xs font-medium text-[#8a7d5a] tracking-[3px] uppercase mb-3">Why YowEvent</div>
        <h2 className="font-display text-4xl font-bold tracking-tight mb-4 max-w-lg leading-snug">Everything you need, nothing you don&apos;t</h2>
        <p className="text-[#666] text-sm leading-relaxed max-w-lg mb-14">A unified platform covering the entire event lifecycle — from creation to ticket sales and event stats — with smart protection built in.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: "🎟", title: "Smart Ticketing", desc: "Free and paid tickets, discount coupons, easy attendee lists, and quick mobile ticket check-in." },
            { icon: "📊", title: "Real-Time Stats", desc: "Live dashboards showing registrations, ticket check-ins, sales revenue and guest arrivals as they happen." },
            { icon: "🔔", title: "Crowd Control", desc: "Our virtual waiting room keeps the website fast and online even during high-demand, sold-out ticket releases." },
            { icon: "💬", title: "Guest Engagement", desc: "Live audience Q&A, active attendee polls, and direct feedback collection — no extra tools required." },
            { icon: "🏢", title: "Branded Portfolios", desc: "Get your own custom webpage with your logo, colors, fonts, and a custom web address." },
            { icon: "🔐", title: "Safe Payments", desc: "Industry-grade protection for your user logins, payouts, transaction histories, and ticket sales data." },
          ].map((f) => (
            <div key={f.title} className="p-8 border-[1.5px] border-[#e0d8c8] rounded-2xl hover:border-[#8a7d5a] hover:-translate-y-1 hover:shadow-md transition-all cursor-default group">
              <div className="w-11 h-11 bg-gradient-to-br from-[#d4c9a8] to-[#c8bb96] rounded-xl flex items-center justify-center text-xl mb-4">{f.icon}</div>
              <h3 className="font-display text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-[#666] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-16 py-24 bg-[#f5f0e8] text-center">
        <div className="text-xs font-medium text-[#8a7d5a] tracking-[3px] uppercase mb-3">How It Works</div>
        <h2 className="font-display text-4xl font-bold tracking-tight mb-4">Up and running in minutes</h2>
        <p className="text-[#666] text-sm max-w-md mx-auto mb-14 leading-relaxed">No sales call. No setup fee. Just sign up and start building your event.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            ["1", "Create Account", "Sign up free and provision your isolated tenant environment with your own branding."],
            ["2", "Build Your Event", "Set schedule, location, ticket types, sessions and agenda using the guided Event Builder."],
            ["3", "Publish & Invite", "Go live with one click. Send email campaigns and tokenised invitations to your audience."],
            ["4", "Analyse & Grow", "Review real-time and post-event analytics, traffic reports and attendee feedback."],
          ].map(([num, title, desc]) => (
            <div key={num} className="p-8">
              <div className="w-12 h-12 bg-[#1a1a1a] text-white rounded-full flex items-center justify-center font-display font-bold text-lg mx-auto mb-5">{num}</div>
              <h3 className="font-display text-base font-bold mb-2">{title}</h3>
              <p className="text-xs text-[#666] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* OFFLINE CAPABILITY PROMO */}
      <section className="px-16 py-24 bg-[#1a1a1a] text-white border-t border-[#333]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#8a7d5a]/20 border border-[#8a7d5a]/30 rounded-full px-3 py-1 text-xs font-semibold text-[#d4c9a8] mb-6">
              <span className="animate-pulse">🟢</span> Offline Mode Supported
            </div>
            <h2 className="font-display text-4xl font-bold tracking-tight mb-5 leading-tight">
              No internet connection? <br />
              <span className="text-[#d4c9a8]">No worries.</span> Keep scanning.
            </h2>
            <p className="text-[#aaa] text-sm leading-relaxed mb-6 font-light">
              YowEvent is built to work offline. All event guest list and ticket information is automatically saved locally. You can scan QR code tickets and check in attendees even in remote venues with zero cell service or Wi-Fi.
            </p>
            <ul className="space-y-3 text-xs text-[#ccc] list-none p-0 m-0">
              <li className="flex items-center gap-2">✓ Automatic data syncing once internet returns</li>
              <li className="flex items-center gap-2">✓ Scan and verify tickets instantly without internet</li>
              <li className="flex items-center gap-2">✓ Search guest lists instantly without waiting for page loads</li>
            </ul>
          </div>
          <div className="bg-[#222] border border-[#333] rounded-3xl p-8 relative overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
              </div>
              <span className="text-[10px] uppercase tracking-widest text-[#666] font-semibold">Offline Status Console</span>
            </div>
            <div className="font-mono text-xs text-[#d4c9a8] space-y-2">
              <p className="text-[#666]">// Loading ticket scanner...</p>
              <p className="text-white">Scanner ready: Active</p>
              <p className="text-white">Ticket list: Saved to device</p>
              <p className="text-green-400">Successfully synced: 240 guest tickets stored</p>
              <p className="text-[#666]">// Status: INTERNET DISCONNECTED (Offline Mode)</p>
              <p className="text-green-400">Scan status: Ticket verified in 0.01 seconds</p>
              <p className="text-amber-400">Offline check-ins recorded. Will sync back when online.</p>
            </div>
          </div>
        </div>
      </section>

      <FaqSection />

      {/* CTA */}
      <section className="px-16 py-24 bg-[#1a1a1a] text-center">
        <h2 className="font-display text-5xl font-bold text-white mb-4 tracking-tight">Ready to run better events?</h2>
        <p className="text-[#aaa] text-sm max-w-md mx-auto mb-9 leading-relaxed">Join thousands of organisers who trust YowEvent to manage every detail — from first ticket to final report.</p>
        {isLoggedIn ? (
          <Link href="/admin">
            <button className="px-10 py-4 bg-[#d4c9a8] text-[#1a1a1a] rounded-full text-base font-semibold hover:bg-[#c8bb96] hover:-translate-y-0.5 transition-all cursor-pointer">
              Go to Dashboard
            </button>
          </Link>
        ) : (
          <Link href="/register">
            <button className="px-10 py-4 bg-[#d4c9a8] text-[#1a1a1a] rounded-full text-base font-semibold hover:bg-[#c8bb96] hover:-translate-y-0.5 transition-all cursor-pointer">
              Get Started for Free
            </button>
          </Link>
        )}
      </section>

      <Footer />
    </div>
  );
}

function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "How do ticket sales and payouts work?",
      a: "You can create both free and paid tickets. For paid tickets, guests can pay quickly using mobile money or bank cards. Payouts are transferred directly to your bank account or mobile money wallet."
    },
    {
      q: "Can I use my own custom domain / website link?",
      a: "Yes! Premium account owners can connect their own website address (like events.mycompany.com) in the website settings to give the event page a branded feel."
    },
    {
      q: "How does the waiting room / crowd control work?",
      a: "When too many people try to buy tickets at once (like a sold-out concert), our smart queuing system puts them in a virtual line. This protects the site from crashing and ensures everyone gets a fair chance to buy tickets."
    },
    {
      q: "Does YowEvent work without internet?",
      a: "Yes! You can download the YowEvent app directly on your phone or computer. All your attendee information is saved locally so you can scan tickets and run check-ins without any network connection."
    }
  ];

  return (
    <section className="px-16 py-24 bg-white border-t border-[#e0d8c8]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-medium text-[#8a7d5a] tracking-[3px] uppercase mb-3 block">Got Questions?</span>
          <h2 className="font-display text-4xl font-bold tracking-tight text-[#1a1a1a]">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-[#e0d8c8] rounded-2xl overflow-hidden transition-all bg-[#f5f0e8]/30">
              <button 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-5 flex items-center justify-between text-left font-semibold text-[#1a1a1a] hover:bg-[#f5f0e8]/50 transition-colors"
              >
                <span>{faq.q}</span>
                <span className="text-xl text-[#8a7d5a]">{openIndex === i ? "−" : "+"}</span>
              </button>
              {openIndex === i && (
                <div className="px-6 pb-5 text-sm text-[#555] leading-relaxed border-t border-[#e0d8c8]/50 pt-3 bg-white">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
