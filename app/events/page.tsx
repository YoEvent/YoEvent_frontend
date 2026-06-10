"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { eventService } from "@/app/utils/services/eventService";
import { authService } from "@/app/utils/services/authService";
import { Calendar, Search, MapPin, Wifi, WifiOff, Tag, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PublicEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<"ALL" | "IN_PERSON" | "VIRTUAL">("ALL");

  useEffect(() => {
    Promise.all([
      eventService.getEvents({ skipAuth: true }),
      authService.getTenantSettings().catch(() => []),
    ])
      .then(([eventsData, settingsData]) => {
        const domainByTenantId: Record<string, string> = {};
        (settingsData || []).forEach((s: any) => {
          if (s.customDomain?.trim()) domainByTenantId[s.tenantId] = s.customDomain.trim();
        });

        const publicEvents = (eventsData || [])
          .filter((e: any) => e.status !== "DRAFT" && e.status !== "CANCELLED" && domainByTenantId[e.tenantId])
          .map((e: any) => ({ ...e, customDomain: domainByTenantId[e.tenantId] }));

        setEvents(publicEvents);
        setFiltered(publicEvents);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let result = [...events];
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(e => e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q));
    }
    if (formatFilter !== "ALL") {
      result = result.filter(e => e.format === formatFilter);
    }
    setFiltered(result);
  }, [query, formatFilter, events]);

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a] overflow-x-hidden">
      <Navbar />

      {/* ── HERO HEADER ── */}
      <header className="relative bg-[#0f0f0f] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070')` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f0f]/80 to-[#0f0f0f]" />
        <div className="relative z-10 max-w-4xl mx-auto px-8 py-20 text-center">
          <span className="inline-flex items-center gap-2 bg-[#FF4747]/20 border border-[#FF4747]/30 text-[#FF4747] text-xs font-bold rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4747] animate-pulse" /> Live events across Africa
          </span>
          <h1 className="font-display text-5xl md:text-6xl font-black tracking-tight mb-5 leading-[1.05]">
            Explore <span className="text-[#F7E998]">Public</span> Events
          </h1>
          <p className="text-[#aaa] text-base max-w-xl mx-auto leading-relaxed">
            Discover incredible events hosted by organisations across Africa. Find your next experience below.
          </p>
        </div>
      </header>

      {/* ── FILTERS ── */}
      <div className="sticky top-[61px] z-30 bg-white border-b border-[#f0f0f0] shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-[#fafafa] border border-[#f0f0f0] rounded-full px-4 py-2.5">
            <Search size={15} className="text-[#aaa] shrink-0" />
            <input
              placeholder="Search events..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="bg-transparent text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none w-full"
            />
          </div>
          <div className="flex gap-2">
            {(["ALL", "IN_PERSON", "VIRTUAL"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFormatFilter(f)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${formatFilter === f ? "bg-[#FF4747] text-white shadow-sm" : "bg-[#fafafa] text-[#666] border border-[#f0f0f0] hover:border-[#FF4747]/30"}`}
              >
                {f === "VIRTUAL" ? <Wifi size={12} /> : f === "IN_PERSON" ? <MapPin size={12} /> : <Tag size={12} />}
                {f === "ALL" ? "All Events" : f === "IN_PERSON" ? "In Person" : "Online"}
              </button>
            ))}
          </div>
          {!loading && (
            <span className="text-xs text-[#aaa] shrink-0">{filtered.length} event{filtered.length !== 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {/* ── EVENTS GRID ── */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-[#fafafa] border border-[#f0f0f0] rounded-3xl overflow-hidden animate-pulse">
                <div className="h-44 bg-[#f0f0f0]" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-[#f0f0f0] rounded w-3/4" />
                  <div className="h-3 bg-[#f0f0f0] rounded w-full" />
                  <div className="h-3 bg-[#f0f0f0] rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-16 h-16 bg-[#fafafa] border border-[#f0f0f0] rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Calendar size={28} className="text-[#ddd]" />
            </div>
            <h3 className="font-display text-xl font-bold text-[#1a1a1a] mb-2">
              {query ? "No events match your search" : "No public events yet"}
            </h3>
            <p className="text-[#888] text-sm mb-6">{query ? "Try a different search term or remove filters." : "Check back soon or host your own."}</p>
            {query ? (
              <button onClick={() => { setQuery(""); setFormatFilter("ALL"); }} className="px-6 py-2.5 bg-[#FF4747] text-white rounded-full text-sm font-semibold cursor-pointer hover:bg-[#e03e3e] transition-colors">
                Clear filters
              </button>
            ) : (
              <Link href="/register">
                <button className="px-6 py-2.5 bg-[#FF4747] text-white rounded-full text-sm font-semibold cursor-pointer hover:bg-[#e03e3e] transition-colors flex items-center gap-2 mx-auto">
                  Host an Event <ArrowRight size={14} />
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filtered.map(ev => (
              <a key={ev.eventId} href={`http://${ev.customDomain}/events/${ev.eventId}`} target="_blank" rel="noopener noreferrer" className="group block bg-white rounded-3xl overflow-hidden border border-[#f0f0f0] hover:border-[#FF4747]/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="relative h-44 bg-gradient-to-br from-[#F7E998]/40 to-[#FF4747]/10 overflow-hidden">
                  {ev.coverImage ? (
                    <img src={ev.coverImage} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar size={40} className="text-[#FF4747]/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${ev.format === "VIRTUAL" ? "bg-blue-50 text-blue-600" : "bg-white text-[#1a1a1a]"}`}>
                      {ev.format === "VIRTUAL" ? <><Wifi size={10} /> Online</> : <><MapPin size={10} /> In Person</>}
                    </span>
                  </div>
                  <div className="absolute bottom-3 right-3">
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${ev.currency === "XAF" || ev.currency === "FCFA" ? "bg-[#F7E998] text-[#7a6a00]" : "bg-white text-[#1a1a1a]"}`}>
                      {ev.currency === "XAF" ? "FCFA" : ev.currency === "USD" ? "$" : ev.currency} EVENT
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-2 group-hover:text-[#FF4747] transition-colors line-clamp-2 leading-snug">{ev.title}</h3>
                  <p className="text-[#777] text-sm line-clamp-2 leading-relaxed mb-5">{ev.description || "No description provided."}</p>
                  <div className="flex items-center justify-between pt-4 border-t border-[#f5f5f5]">
                    <div className="flex items-center gap-2 text-xs text-[#888]">
                      <Calendar size={12} className="text-[#FF4747]" />
                      {ev.startDate ? new Date(ev.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "TBA"}
                    </div>
                    <span className="text-xs font-semibold text-[#FF4747] flex items-center gap-1 group-hover:gap-2 transition-all">
                      View <ArrowRight size={12} />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </main>

      {/* ── HOST CTA ── */}
      <section className="mx-8 mb-12 rounded-3xl bg-[#0f0f0f] text-white p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h3 className="font-display text-2xl font-black mb-2">Host your own event</h3>
          <p className="text-[#777] text-sm max-w-sm">Create, manage, and sell tickets for your next event in minutes. Free to start.</p>
        </div>
        <Link href="/register">
          <button className="px-8 py-3.5 bg-[#FF4747] text-white rounded-full text-sm font-bold hover:bg-[#e03e3e] transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 shadow-lg shadow-[#FF4747]/20">
            Get Started Free <ArrowRight size={15} />
          </button>
        </Link>
      </section>

      <Footer />
    </div>
  );
}
