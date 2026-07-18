"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { eventService } from "@/app/utils/services/eventService";
import { authService } from "@/app/utils/services/authService";
import { getStoredAuth } from "@/app/utils/api";
import { Calendar, Search, MapPin, Wifi, Tag, ArrowRight, Bookmark, Building2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/app/context/LanguageContext";

export default function PublicEventsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [events, setEvents] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [formatFilter, setFormatFilter] = useState<"ALL" | "IN_PERSON" | "VIRTUAL">("ALL");
  const [tenantsMap, setTenantsMap] = useState<Record<string, string>>({});
  // savedMap: eventId → savedEventId (for unsaving)
  const [savedMap, setSavedMap] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [auth, setAuth] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setAuth(getStoredAuth()); }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [eventsData, settingsData, tenantsData] = await Promise.all([
          eventService.getEvents({ skipAuth: true }),
          authService.getTenantSettings().catch(() => []),
          authService.getTenants().catch(() => []),
        ]);

        const domainByTenantId: Record<string, string> = {};
        (settingsData || []).forEach((s: any) => {
          if (s.customDomain?.trim()) domainByTenantId[s.tenantId] = s.customDomain.trim();
        });

        const nameMap: Record<string, string> = {};
        (tenantsData || []).forEach((t: any) => {
          if (t.tenantId) nameMap[t.tenantId] = t.name;
        });
        setTenantsMap(nameMap);

        const eventList: any[] = Array.isArray(eventsData) ? eventsData : ((eventsData as any)?.content ?? []);
        const publicEvents = eventList
          .filter((e: any) => e.status !== "DRAFT" && e.status !== "CANCELLED" && e.visibility === "PUBLIC")
          .map((e: any) => ({ ...e, customDomain: domainByTenantId[e.tenantId] || null }));

        setEvents(publicEvents);
        setFiltered(publicEvents);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Load saved events for logged-in user
  useEffect(() => {
    if (!auth?.userId) return;
    eventService.getSavedEventsByUser(auth.userId)
      .then((saved: any[]) => {
        const map: Record<string, string> = {};
        (saved || []).forEach((s: any) => {
          if (s.eventId) map[s.eventId] = s.id || s.savedEventId;
        });
        setSavedMap(map);
      })
      .catch(() => {});
  }, [auth?.userId]);

  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    if (!query.trim()) {
      let result = [...events];
      if (formatFilter !== "ALL") result = result.filter(e => e.format === formatFilter);
      setFiltered(result);
      setSearching(false);
      return;
    }

    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await eventService.searchEvents({ q: query.trim() }, { skipAuth: true });
        let result = (results || []).filter((e: any) => e.status !== "DRAFT" && e.status !== "CANCELLED");
        if (formatFilter !== "ALL") result = result.filter((e: any) => e.format === formatFilter);
        setFiltered(result);
      } catch {
        // fall back to client-side filter if search-service is unavailable
        const q = query.toLowerCase();
        let result = events.filter(e => e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q));
        if (formatFilter !== "ALL") result = result.filter(e => e.format === formatFilter);
        setFiltered(result);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [query, formatFilter, events]);

  const toggleSave = useCallback(async (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!auth?.userId) { router.push("/login"); return; }
    if (savingId) return;
    setSavingId(eventId);
    try {
      if (savedMap[eventId]) {
        await eventService.unsaveEvent(savedMap[eventId]);
        setSavedMap(prev => { const next = { ...prev }; delete next[eventId]; return next; });
      } else {
        const res: any = await eventService.saveEvent({ tenantId: events.find(ev => ev.eventId === eventId)?.tenantId, userId: auth.userId, eventId });
        setSavedMap(prev => ({ ...prev, [eventId]: res?.id || res?.savedEventId || eventId }));
      }
    } catch {}
    finally { setSavingId(null); }
  }, [auth, savedMap, savingId, events, router]);

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a] overflow-x-hidden">
      <Navbar />

      {/* ── HERO HEADER ── */}
      <header className="bg-white text-[#1a1a1a]">

        <div className="relative z-10 max-w-4xl mx-auto px-8 py-20 text-center">
          <span className="inline-flex items-center gap-2 bg-[#FF4747]/10 border border-[#FF4747]/20 text-[#FF4747] text-xs font-bold rounded-full px-4 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF4747] animate-pulse" /> {t("eventsBrowse.hero.badge")}
          </span>
          <h1 className="font-display text-5xl md:text-6xl font-black tracking-tight mb-5 leading-[1.05]">
            {t("eventsBrowse.hero.headlinePart1")} <span className="text-[#FF4747]">{t("eventsBrowse.hero.headlineHighlight")}</span> {t("eventsBrowse.hero.headlinePart2")}
          </h1>
          <p className="text-[#666] text-base max-w-xl mx-auto leading-relaxed mb-9">
            {t("eventsBrowse.hero.subtitle")}
          </p>

          {/* Welcoming sector snapshot — a quick visual taste of what's out there */}
          <div className="flex items-center justify-center gap-4">
            {[
              { label: t("eventsBrowse.hero.sectors.music"), img: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=200" },
              { label: t("eventsBrowse.hero.sectors.business"), img: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=200" },
              { label: t("eventsBrowse.hero.sectors.tech"), img: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=200" },
              { label: t("eventsBrowse.hero.sectors.sports"), img: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=200" },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-1.5">
                <img src={s.img} alt={s.label} className="w-14 h-14 rounded-full object-cover border-4 border-white shadow-lg shadow-black/10" />
                <span className="text-[10px] font-semibold text-[#888]">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ── FILTERS ── */}
      <div className="sticky top-[61px] z-30 bg-white border-b border-[#f0f0f0] shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-white border border-[#f0f0f0] rounded-full px-4 py-2.5">
            <Search size={15} className="text-[#aaa] shrink-0" />
            <input
              placeholder={t("eventsBrowse.filters.searchPlaceholder")}
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
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${formatFilter === f ? "bg-[#FF4747] text-white shadow-sm" : "bg-white text-[#666] border border-[#f0f0f0] hover:border-[#FF4747]/30"}`}
              >
                {f === "VIRTUAL" ? <Wifi size={12} /> : f === "IN_PERSON" ? <MapPin size={12} /> : <Tag size={12} />}
                {f === "ALL" ? t("eventsBrowse.filters.allEvents") : f === "IN_PERSON" ? t("eventsBrowse.filters.inPerson") : t("eventsBrowse.filters.online")}
              </button>
            ))}
          </div>
          {!loading && (
            searching
              ? <span className="text-xs text-[#aaa] shrink-0 flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-[#ddd] border-t-[#FF4747] rounded-full animate-spin" />{t("eventsBrowse.filters.searching")}</span>
              : <span className="text-xs text-[#aaa] shrink-0">{t("eventsBrowse.filters.resultsCount", { count: filtered.length, plural: filtered.length !== 1 ? "s" : "" })}</span>
          )}
        </div>
      </div>

      {/* ── EVENTS GRID ── */}
      <main className="max-w-7xl mx-auto px-8 py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white border border-[#f0f0f0] rounded-3xl overflow-hidden animate-pulse">
                <div className="h-44 bg-[#f5f5f5]" />
                <div className="p-6 space-y-3">
                  <div className="h-4 bg-[#f5f5f5] rounded w-3/4" />
                  <div className="h-3 bg-[#f5f5f5] rounded w-full" />
                  <div className="h-3 bg-[#f5f5f5] rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-28">
            <div className="w-16 h-16 bg-white border border-[#f0f0f0] rounded-2xl flex items-center justify-center mx-auto mb-5">
              <Calendar size={28} className="text-[#ddd]" />
            </div>
            <h3 className="font-display text-xl font-bold text-[#1a1a1a] mb-2">
              {query ? t("eventsBrowse.empty.noResultsTitle") : t("eventsBrowse.empty.noEventsTitle")}
            </h3>
            <p className="text-[#888] text-sm mb-6">{query ? t("eventsBrowse.empty.tryDifferent") : t("eventsBrowse.empty.checkBackSoon")}</p>
            {query ? (
              <button onClick={() => { setQuery(""); setFormatFilter("ALL"); }} className="px-6 py-2.5 bg-[#FF4747] text-white rounded-full text-sm font-semibold cursor-pointer hover:bg-[#e03e3e] transition-colors">
                {t("eventsBrowse.empty.clearFilters")}
              </button>
            ) : (
              <Link href="/register">
                <button className="px-6 py-2.5 bg-[#FF4747] text-white rounded-full text-sm font-semibold cursor-pointer hover:bg-[#e03e3e] transition-colors flex items-center gap-2 mx-auto">
                  {t("eventsBrowse.empty.hostEvent")} <ArrowRight size={14} />
                </button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filtered.map(ev => {
              const isSaved = !!savedMap[ev.eventId];
              const isSavingThis = savingId === ev.eventId;
              const organizerName = tenantsMap[ev.tenantId];
              return (
                <a
                  key={ev.eventId}
                  href={ev.customDomain ? `http://${ev.customDomain}/events/${ev.eventId}` : `/events/${ev.eventId}`}
                  target={ev.customDomain ? "_blank" : undefined}
                  rel={ev.customDomain ? "noopener noreferrer" : undefined}
                  className="group block bg-white rounded-3xl overflow-hidden border border-[#f0f0f0] hover:border-[#FF4747]/30 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative"
                >
                  {/* Cover image */}
                  <div className="relative h-44 bg-gradient-to-br from-[#F7E998]/40 to-[#FF4747]/10 overflow-hidden">
                    {ev.coverImage ? (
                      <img src={ev.coverImage} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Calendar size={40} className="text-[#FF4747]/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                    {/* Format badge */}
                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${ev.format === "VIRTUAL" ? "bg-blue-50 text-blue-600" : "bg-white text-[#1a1a1a]"}`}>
                        {ev.format === "VIRTUAL" ? <><Wifi size={10} /> {t("eventsBrowse.card.badgeOnline")}</> : <><MapPin size={10} /> {t("eventsBrowse.card.badgeInPerson")}</>}
                      </span>
                    </div>

                    {/* Bookmark button */}
                    <button
                      onClick={e => toggleSave(e, ev.eventId)}
                      disabled={isSavingThis}
                      title={isSaved ? t("eventsBrowse.card.removeBookmarkTooltip") : t("eventsBrowse.card.saveTooltip")}
                      className={`absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${isSaved ? "bg-[#FF4747] text-white" : "bg-white/90 text-[#888] hover:bg-white hover:text-[#FF4747]"} ${isSavingThis ? "opacity-50" : ""}`}
                    >
                      <Bookmark size={14} fill={isSaved ? "currentColor" : "none"} />
                    </button>

                    {/* Currency badge */}
                    <div className="absolute bottom-3 right-3">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${ev.currency === "XAF" || ev.currency === "FCFA" ? "bg-[#F7E998] text-[#7a6a00]" : "bg-white text-[#1a1a1a]"}`}>
                        {ev.currency === "XAF" ? "FCFA" : ev.currency === "USD" ? "$" : ev.currency} {t("eventsBrowse.card.currencySuffix")}
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    {/* Organizer name */}
                    {organizerName && (
                      <div className="flex items-center gap-1.5 text-[11px] text-[#aaa] font-medium mb-2">
                        <Building2 size={11} className="text-[#FF4747]" />
                        {organizerName}
                      </div>
                    )}

                    <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-2 group-hover:text-[#FF4747] transition-colors line-clamp-2 leading-snug">{ev.title}</h3>
                    <p className="text-[#777] text-sm line-clamp-2 leading-relaxed mb-5">{ev.description || t("eventsBrowse.card.noDescription")}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-[#f0f0f0]">
                      <div className="flex items-center gap-2 text-xs text-[#888]">
                        <Calendar size={12} className="text-[#FF4747]" />
                        {ev.startDate ? new Date(ev.startDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : t("eventsBrowse.card.dateTBA")}
                      </div>
                      <span className="text-xs font-semibold text-[#FF4747] flex items-center gap-1 group-hover:gap-2 transition-all">
                        {t("eventsBrowse.card.viewLink")} <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </main>

      {/* ── HOST CTA ── */}
      <section className="mx-8 mb-12 rounded-3xl bg-[#FF4747] text-white p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h3 className="font-display text-2xl font-black mb-2">{t("eventsBrowse.hostCta.title")}</h3>
          <p className="text-white/85 text-sm max-w-sm">{t("eventsBrowse.hostCta.desc")}</p>
        </div>
        <Link href="/register">
          <button className="px-8 py-3.5 bg-white text-[#1a1a1a] rounded-full text-sm font-bold hover:bg-[#f5f5f5] transition-all cursor-pointer whitespace-nowrap flex items-center gap-2">
            {t("eventsBrowse.hostCta.cta")} <ArrowRight size={15} />
          </button>
        </Link>
      </section>

      <Footer />
    </div>
  );
}
