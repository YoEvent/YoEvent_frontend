"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import {
  Calendar, Users, BarChart2, Ticket, UserCheck, Plus, QrCode, ShoppingBag,
  CreditCard, CheckCircle2, AlertTriangle, RefreshCw, Smartphone, Clock, TrendingUp,
  Activity, AlertCircle, Shield,
} from "lucide-react";
import { getStoredAuth, setStoredAuth, api } from "@/app/utils/api";
import { authService } from "@/app/utils/services/authService";
import { eventService } from "@/app/utils/services/eventService";

const STATUS_CLS: Record<string, string> = {
  PUBLISHED: "bg-green-50 text-green-700 border border-green-100",
  ACTIVE:    "bg-green-50 text-green-700 border border-green-100",
  DRAFT:     "bg-stone-100 text-stone-600 border border-stone-200",
  CANCELLED: "bg-red-50 text-red-700 border border-red-100",
  COMPLETED: "bg-blue-50 text-blue-700 border border-blue-100",
};

export default function AdminPage() {
  const [profile, setProfile] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [attendeeUsers, setAttendeeUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [tenantSettings, setTenantSettings] = useState<any>(null);
  const [planLimits, setPlanLimits] = useState<any>(null);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) return;

    Promise.all([
      authService.getUserById(auth.userId),
      authService.getTenantById(auth.tenantId),
      eventService.getMyEvents(),
      eventService.getEventAnalytics(),
      eventService.getMyTenantRegistrations().catch(() => []),
      authService.getSubscriptionPlans().catch(() => []),
      eventService.getTicketTypes().catch(() => []),
      authService.stripeStatus(auth.tenantId).catch(() => ({ connected: false })),
      authService.getMyTenantSettings().catch(() => null),
      authService.getMyPlanLimits().catch(() => null),
    ])
      .then(async ([userData, tenantData, eventsData, analyticsData, regsData, plansData, ticketTypesData, stripeData, settingsData, limitsData]) => {
        setProfile(userData);
        setTenant(tenantData);
        setEvents(eventsData || []);
        setAnalytics(analyticsData || []);
        setRegistrations(regsData || []);
        setPlans(plansData || []);
        setTicketTypes(ticketTypesData || []);
        setStripeStatus(stripeData || { connected: false });
        setTenantSettings(settingsData);
        setPlanLimits(limitsData);

        const uniqueIds = [...new Set((regsData || []).map((r: any) => r.userId as string))];
        const fetched = await Promise.all(
          uniqueIds.map((id) => authService.getUserById(id).catch(() => null))
        );
        const userMap: Record<string, any> = {};
        fetched.filter(Boolean).forEach((u: any) => { userMap[u.userId] = u; });
        setAttendeeUsers(userMap);
      })
      .catch((err) => console.error("Dashboard load failed:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleStripeConnect = async () => {
    const auth = getStoredAuth();
    if (!auth) return;
    setStripeLoading(true);
    try {
      const res = await authService.stripeConnect(auth.tenantId);
      if (res && res.onboardingUrl) {
        window.location.href = res.onboardingUrl;
      } else {
        alert("Failed to get Stripe connection link.");
      }
    } catch (err: any) {
      console.error("Stripe connect failed:", err);
      alert(err.message || "Failed to initiate Stripe onboarding.");
    } finally {
      setStripeLoading(false);
    }
  };

  useEffect(() => {
    if (tenant && plans.length > 0) {
      const matchedPlan = plans.find(p => p.planId === tenant.planId);
      if (matchedPlan) {
        const mapPlanNameToTier = (name: string): string => {
          const n = (name || "").toLowerCase();
          if (n.includes("enterprise") || n.includes("premium") || n.includes("eventer")) return "PREMIUM";
          if (n.includes("pro") || n.includes("basic")) return "BASIC";
          return "FREE";
        };
        const tier = mapPlanNameToTier(matchedPlan.name);
        const auth = getStoredAuth();
        if (auth && auth.planTier !== tier) {
          auth.planTier = tier;
          setStoredAuth(auth);
        }
      }
    }
  }, [tenant, plans]);

  const handleUpgrade = async () => {
    const auth = getStoredAuth();
    if (!auth) return;
    try {
      const data = await authService.upgradeTenantToOrganization(auth.tenantId);
      setTenant(data);
      window.location.reload();
    } catch (err) {
      console.error("Failed to upgrade tenant:", err);
    }
  };

  // ── Core metrics ────────────────────────────────────────────────────────────
  const totalRegistrations = registrations.length;
  const publishedEvents    = events.filter(e => e.status === "PUBLISHED" || e.status === "ACTIVE").length;
  const totalRevenue       = registrations.reduce((sum, reg) => {
    if (reg.status !== "CONFIRMED" && reg.status !== "CHECKED_IN") return sum;
    const tType = ticketTypes.find((t: any) => (t.ticketId || t.id) === reg.ticketTypeId);
    return sum + Number(tType?.price || 0);
  }, 0);

  let paidTicketsCount = 0;
  let freeTicketsCount = 0;
  registrations.forEach((reg) => {
    if (reg.status !== "CONFIRMED" && reg.status !== "CHECKED_IN") return;
    const tType = ticketTypes.find((t: any) => (t.ticketId || t.id) === reg.ticketTypeId);
    if (tType && tType.price > 0) paidTicketsCount++;
    else freeTicketsCount++;
  });
  const totalConfirmed = paidTicketsCount + freeTicketsCount;
  const paidPct = totalConfirmed > 0 ? Math.round((paidTicketsCount / totalConfirmed) * 100) : 0;
  const freePct = totalConfirmed > 0 ? 100 - paidPct : 0;

  // ── Check-in rate ────────────────────────────────────────────────────────────
  const checkedInCount      = registrations.filter(r => r.status === "CHECKED_IN").length;
  const eligibleForCheckin  = registrations.filter(r => r.status === "CONFIRMED" || r.status === "CHECKED_IN").length;
  const checkinRate         = eligibleForCheckin > 0 ? Math.round((checkedInCount / eligibleForCheckin) * 100) : 0;

  // ── Profile helpers ──────────────────────────────────────────────────────────
  const displayName = profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : "—";
  const initials    = profile
    ? `${profile.firstName?.charAt(0) || ""}${profile.lastName?.charAt(0) || ""}`.toUpperCase()
    : "?";
  const matchedPlan = plans.find(p => p.planId === tenant?.planId);
  const planName    = matchedPlan?.name || tenant?.planName || "Free";

  // ── Enriched events ──────────────────────────────────────────────────────────
  const enrichedEvents = events.map((ev) => {
    const registrationsCount = registrations.filter((r: any) => r.eventId === ev.eventId || r.event?.eventId === ev.eventId).length;
    const capacity = ev.maxCapacity > 0 ? ev.maxCapacity : null;
    const pct      = capacity ? Math.min(100, Math.round((registrationsCount / capacity) * 100)) : null;
    return { ...ev, registrations: registrationsCount, capacity, pct };
  });

  // ── Upcoming events ──────────────────────────────────────────────────────────
  const now = new Date();
  const getEventDate = (ev: any): Date | null => {
    const d = ev.schedule?.startDatetime || ev.startDatetime || ev.startDate || ev.date;
    if (!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };
  const daysUntil = (d: Date) => Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  const upcomingEvents = events
    .map(ev => ({ ev, d: getEventDate(ev) }))
    .filter(({ d }) => d && d > now)
    .sort((a, b) => a.d!.getTime() - b.d!.getTime())
    .slice(0, 3);

  // ── Capacity alerts ──────────────────────────────────────────────────────────
  const capacityAlerts = enrichedEvents.filter(
    ev => ev.pct !== null && ev.pct >= 80 && (ev.status === "PUBLISHED" || ev.status === "ACTIVE")
  );

  // ── Revenue per event ────────────────────────────────────────────────────────
  const revenueByEvent = events
    .map(ev => {
      const evRegs = registrations.filter(r =>
        (r.eventId === ev.eventId || r.event?.eventId === ev.eventId) &&
        (r.status === "CONFIRMED" || r.status === "CHECKED_IN")
      );
      const revenue = evRegs.reduce((sum, reg) => {
        const tType = ticketTypes.find((t: any) => (t.ticketId || t.id) === reg.ticketTypeId);
        return sum + Number(tType?.price || 0);
      }, 0);
      return { ...ev, revenue, confirmedRegs: evRegs.length };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const maxRevenue = Math.max(...revenueByEvent.map(e => e.revenue), 1);

  // ── Recent activity ──────────────────────────────────────────────────────────
  const recentActivity = [...registrations]
    .sort((a, b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime())
    .slice(0, 8);

  // ── Plan quota ───────────────────────────────────────────────────────────────
  const maxEvents    = planLimits?.maxEvents ?? null;
  const maxAttendees = planLimits?.maxAttendeesPerEvent ?? null;
  const eventUsedPct = maxEvents ? Math.min(100, Math.round((events.length / maxEvents) * 100)) : null;

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">

        {/* TOPBAR */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">Overview</h1>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#e5e7eb] border-t-[#EB4203] rounded-full animate-spin" />
          </div>
        ) : (
          <main className="p-8 space-y-6">

            {/* ── STAT CARDS ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-5 gap-4">
              {[
                { label: "Total Events",        value: events.length,         icon: Calendar,   color: "text-[#EB4203]",  bg: "bg-[#F7E998]/30" },
                { label: "Published",           value: publishedEvents,       icon: BarChart2,  color: "text-green-500",  bg: "bg-green-500/10" },
                { label: "Registrations",       value: totalRegistrations,    icon: Users,      color: "text-blue-500",   bg: "bg-blue-500/10"  },
                { label: "Revenue (FCFA)",      value: totalRevenue > 0 ? totalRevenue.toLocaleString() : "—", icon: Ticket, color: "text-amber-500", bg: "bg-amber-500/10" },
                { label: "Check-in Rate",       value: eligibleForCheckin > 0 ? `${checkinRate}%` : "—", icon: UserCheck, color: "text-purple-500", bg: "bg-purple-500/10" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 hover:shadow-sm transition-shadow">
                  <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
                    <Icon size={16} className={color} />
                  </div>
                  <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</div>
                  <div className="font-display text-2xl font-bold text-[#1a1a1a]">{value}</div>
                  {label === "Check-in Rate" && eligibleForCheckin > 0 && (
                    <div className="mt-2 h-1 bg-[#e5e7eb] rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${checkinRate}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── UPCOMING EVENTS STRIP ──────────────────────────────────────── */}
            {upcomingEvents.length > 0 && (
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={15} className="text-[#EB4203]" />
                  <h2 className="font-display font-bold text-sm text-[#1a1a1a]">Upcoming Events</h2>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {upcomingEvents.map(({ ev, d }) => {
                    const days = daysUntil(d!);
                    const isImminent = days <= 3;
                    const evRegs = registrations.filter(r => r.eventId === ev.eventId || r.event?.eventId === ev.eventId).length;
                    return (
                      <div key={ev.eventId} className={`rounded-xl border p-4 flex flex-col gap-2 ${isImminent ? "border-[#EB4203]/30 bg-[#FFF5F0]" : "border-[#e5e7eb] bg-[#fafafa]"}`}>
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-[#1a1a1a] leading-snug line-clamp-2">{ev.title}</span>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${isImminent ? "bg-[#EB4203] text-white" : "bg-[#e5e7eb] text-[#555]"}`}>
                            {days === 0 ? "Today" : days === 1 ? "Tomorrow" : `${days}d`}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#666]">
                          {d!.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                          {" · "}
                          {d!.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[ev.status] || "bg-stone-100 text-stone-600 border border-stone-200"}`}>
                            {ev.status}
                          </span>
                          <span className="text-[10px] text-[#666] flex items-center gap-1">
                            <Users size={10} /> {evRegs} registered
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── CAPACITY ALERTS ────────────────────────────────────────────── */}
            {capacityAlerts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={15} className="text-amber-600" />
                  <h2 className="font-display font-bold text-sm text-amber-700">Capacity Alerts</h2>
                  <span className="ml-auto text-[10px] text-amber-600 font-semibold">{capacityAlerts.length} event{capacityAlerts.length !== 1 ? "s" : ""} nearly full</span>
                </div>
                <div className="space-y-2.5">
                  {capacityAlerts.map(ev => (
                    <div key={ev.eventId} className="flex items-center gap-4 bg-white/70 border border-amber-100 rounded-xl px-4 py-2.5">
                      <span className="text-xs font-semibold text-[#1a1a1a] w-48 truncate">{ev.title}</span>
                      <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${ev.pct! >= 100 ? "bg-red-500" : ev.pct! >= 90 ? "bg-amber-500" : "bg-amber-400"}`}
                          style={{ width: `${ev.pct}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold w-12 text-right ${ev.pct! >= 100 ? "text-red-600" : "text-amber-600"}`}>{ev.pct}%</span>
                      <span className="text-[10px] text-[#666] whitespace-nowrap">{ev.registrations} / {ev.capacity}</span>
                      <Link href="/admin/events" className="text-[10px] text-[#EB4203] hover:underline whitespace-nowrap shrink-0">Manage →</Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── SALES DISTRIBUTION ─────────────────────────────────────────── */}
            {registrations.length > 0 && (
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                <h3 className="font-display font-bold text-xs text-[#EB4203] uppercase tracking-wider mb-4">Ticket Sales Distribution</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-[#555]">
                    <span>Paid Tickets ({paidTicketsCount})</span>
                    <span>Free Tickets ({freeTicketsCount})</span>
                  </div>
                  <div className="h-3 bg-[#e5e7eb] rounded-full overflow-hidden flex">
                    <div className="h-full bg-gradient-to-r from-[#EB4203] to-amber-500 transition-all" style={{ width: `${paidPct}%` }} title={`Paid: ${paidPct}%`} />
                    <div className="h-full bg-stone-300 transition-all" style={{ width: `${freePct}%` }} title={`Free: ${freePct}%`} />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#666] tracking-wider uppercase font-semibold">
                    <span>{paidPct}% Paid</span>
                    <span>{freePct}% Free</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── EVENTS TABLE + RIGHT COLUMN ────────────────────────────────── */}
            <div className="grid grid-cols-[2fr_1fr] gap-5">

              {/* EVENTS */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display font-bold text-[#EB4203]">Your Events</h2>
                  <Link href="/admin/events" className="text-xs text-[#EB4203] hover:underline">Manage →</Link>
                </div>

                {enrichedEvents.length === 0 ? (
                  <div className="text-center py-12 text-[#555] text-sm">
                    <Calendar size={32} className="mx-auto mb-3 opacity-30" />
                    No events yet.{" "}
                    <Link href="/admin/events" className="text-[#EB4203] hover:underline">Create your first event →</Link>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 pb-3 border-b border-[#e5e7eb] text-[10px] text-[#555] uppercase tracking-wider">
                      <span>Event</span><span>Registrations</span><span>Fill Rate</span><span>Status</span>
                    </div>
                    <div className="divide-y divide-[#e5e7eb]">
                      {enrichedEvents.map((ev) => (
                        <div key={ev.eventId} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 items-center py-3 hover:bg-[#fafafa] hover:-mx-3 hover:px-3 rounded-lg transition-all">
                          <span className="text-sm text-[#1a1a1a] font-medium truncate">{ev.title}</span>
                          <span className="text-sm text-[#555]">{ev.registrations}</span>
                          <div>
                            {ev.pct !== null ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 bg-[#e5e7eb] rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${ev.pct >= 90 ? "bg-red-500" : ev.pct >= 70 ? "bg-amber-500" : "bg-gradient-to-r from-[#EB4203] to-[#c23b02]"}`}
                                    style={{ width: `${ev.pct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-[#666] w-8 text-right">{ev.pct}%</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[#555]">No cap</span>
                            )}
                          </div>
                          <span className={`inline-flex items-center justify-center text-[10px] font-medium px-2.5 py-0.5 rounded-full ${STATUS_CLS[ev.status] || "bg-stone-100 text-stone-600 border border-stone-200"}`}>
                            {ev.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-5 flex flex-col">

                {/* PROFILE CARD */}
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#EB4203] to-[#c23b02] flex items-center justify-center text-white font-bold text-lg mb-3">
                    {initials}
                  </div>
                  <div className="text-sm font-semibold text-[#1a1a1a] mb-0.5">{displayName}</div>
                  <div className="text-xs text-[#555] mb-5">{tenant?.type === "ORGANIZATION" ? "Organisation" : "Individual Creator"}</div>

                  {[
                    ["Account Type", tenant?.type || "—"],
                    ["Plan",         planName],
                    ["Industry",     tenant?.industryType || "—"],
                    ["Status",       tenant?.status || "ACTIVE"],
                    ["Member since", (tenant?.createdAt || profile?.createdAt)
                      ? new Date(tenant?.createdAt || profile?.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                      : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between w-full py-2.5 border-b border-[#e5e7eb] text-xs">
                      <span className="text-[#666]">{k}</span>
                      <strong className="text-[#1a1a1a] font-medium">{v}</strong>
                    </div>
                  ))}

                  {tenant?.type !== "ORGANIZATION" ? (
                    <button onClick={handleUpgrade} className="w-full mt-4 py-2.5 bg-[#EB4203] hover:bg-[#c23b02] text-white rounded-full text-sm font-semibold transition-colors cursor-pointer">
                      Upgrade to Org 🚀
                    </button>
                  ) : (
                    <Link href="/pricing" className="w-full mt-4">
                      <button className="w-full py-2.5 bg-[#EB4203] text-white rounded-full text-sm font-semibold hover:bg-[#c23b02] transition-colors cursor-pointer">
                        Change Plan
                      </button>
                    </Link>
                  )}
                </div>

                {/* PLAN QUOTA */}
                {(maxEvents !== null || maxAttendees !== null) && (
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <Shield size={14} className="text-[#EB4203]" />
                      <h3 className="font-display font-bold text-sm text-[#1a1a1a]">Plan Usage</h3>
                      <span className="ml-auto text-[10px] font-semibold text-[#555] bg-[#f3f4f6] px-2 py-0.5 rounded-full">{planName}</span>
                    </div>
                    <div className="space-y-4">
                      {maxEvents !== null && (
                        <div>
                          <div className="flex justify-between text-xs text-[#555] mb-1.5">
                            <span>Events</span>
                            <span className="font-semibold text-[#1a1a1a]">{events.length} / {maxEvents}</span>
                          </div>
                          <div className="h-2 bg-[#e5e7eb] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${eventUsedPct! >= 90 ? "bg-red-500" : eventUsedPct! >= 70 ? "bg-amber-500" : "bg-[#EB4203]"}`}
                              style={{ width: `${eventUsedPct}%` }}
                            />
                          </div>
                          {eventUsedPct! >= 80 && (
                            <p className="text-[10px] text-amber-600 mt-1 font-medium">
                              {maxEvents - events.length} event slot{maxEvents - events.length !== 1 ? "s" : ""} remaining
                            </p>
                          )}
                        </div>
                      )}
                      {maxAttendees !== null && (
                        <div className="flex justify-between text-xs text-[#555]">
                          <span>Max attendees / event</span>
                          <span className="font-semibold text-[#1a1a1a]">{maxAttendees.toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* PAYOUT DESTINATIONS WIDGET */}
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 flex flex-col space-y-5">
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#EB4203] mb-3 flex items-center gap-2">
                      <CreditCard size={16} /> Stripe Payouts
                    </h3>
                    {stripeStatus?.connected ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-green-600 text-xs font-semibold">
                          <CheckCircle2 size={14} /> Connected
                        </div>
                        <div className="text-[10px] text-[#666] bg-stone-50 border border-stone-100 rounded-lg p-2 font-mono truncate">
                          ID: {stripeStatus.accountId}
                        </div>
                        <div className="flex flex-col gap-1.5 text-xs text-[#555]">
                          <div className="flex justify-between">
                            <span>Charges Enabled</span>
                            <span className={stripeStatus.chargesEnabled ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                              {stripeStatus.chargesEnabled ? "Yes" : "No"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Payouts Enabled</span>
                            <span className={stripeStatus.payoutsEnabled ? "text-green-600 font-medium" : "text-amber-600 font-medium"}>
                              {stripeStatus.payoutsEnabled ? "Yes" : "No"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-start gap-2 text-amber-600 text-xs font-semibold leading-snug">
                          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                          <span>Disconnected. Connect Stripe to receive bank card ticket payments.</span>
                        </div>
                        <button
                          onClick={handleStripeConnect}
                          disabled={stripeLoading}
                          className="w-full mt-1 py-2 bg-[#EB4203] hover:bg-[#c23b02] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {stripeLoading ? (
                            <><RefreshCw size={12} className="animate-spin" /> Connecting...</>
                          ) : (
                            <>Connect Stripe 💳</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#e5e7eb]">
                    <h3 className="font-display font-bold text-sm text-[#EB4203] mb-3 flex items-center gap-2">
                      <Smartphone size={16} /> Mobile Money (MTN / Orange)
                    </h3>
                    {tenantSettings?.payoutMomoNumber ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600 text-xs font-semibold">
                          <CheckCircle2 size={14} /> Active
                        </div>
                        <div className="flex flex-col gap-1.5 text-xs text-[#555]">
                          <div className="flex justify-between">
                            <span>Provider</span>
                            <span className="font-medium text-[#1a1a1a] uppercase">{tenantSettings.payoutMomoProvider || "momo"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Phone Number</span>
                            <span className="font-medium text-[#1a1a1a]">{tenantSettings.payoutMomoNumber}</span>
                          </div>
                        </div>
                        <Link href="/admin/seo" className="inline-block mt-1 text-[10px] text-[#EB4203] hover:underline">Modify number →</Link>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-start gap-2 text-amber-600 text-xs font-semibold leading-snug">
                          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                          <span>No Mobile Money number set for payouts.</span>
                        </div>
                        <Link href="/admin/seo" className="block w-full">
                          <button className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-[#1a1a1a] border border-stone-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer">
                            Set up MoMo 📱
                          </button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                {/* QUICK ACTIONS */}
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                  <h3 className="font-display font-bold text-sm text-[#EB4203] mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { href: "/admin/events",  icon: Plus,       color: "text-[#EB4203]",  label: "Create Event" },
                      { href: "/admin/checkin", icon: QrCode,     color: "text-blue-500",   label: "Scan Tickets" },
                      { href: "/admin/orders",  icon: ShoppingBag,color: "text-emerald-500",label: "Manage Orders" },
                    ].map(({ href, icon: Icon, color, label }) => (
                      <Link key={label} href={href} className="flex flex-col items-center justify-center p-3 border border-[#e5e7eb] hover:border-[#EB4203] hover:bg-orange-50/20 rounded-xl transition-all text-center">
                        <Icon size={16} className={`${color} mb-1.5`} />
                        <span className="text-[10px] font-semibold text-[#1a1a1a]">{label}</span>
                      </Link>
                    ))}
                    <button onClick={() => window.location.reload()} className="flex flex-col items-center justify-center p-3 border border-[#e5e7eb] hover:border-[#EB4203] hover:bg-orange-50/20 rounded-xl transition-all text-center bg-transparent cursor-pointer outline-none">
                      <BarChart2 size={16} className="text-purple-500 mb-1.5" />
                      <span className="text-[10px] font-semibold text-[#1a1a1a]">Refresh Stats</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── REVENUE PER EVENT + RECENT ACTIVITY ───────────────────────── */}
            <div className="grid grid-cols-2 gap-5">

              {/* REVENUE PER EVENT */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <TrendingUp size={15} className="text-[#EB4203]" />
                  <h2 className="font-display font-bold text-[#EB4203]">Revenue by Event</h2>
                </div>
                {revenueByEvent.length === 0 || revenueByEvent.every(e => e.revenue === 0 && e.confirmedRegs === 0) ? (
                  <div className="text-center py-8 text-[#555] text-sm">
                    <TrendingUp size={28} className="mx-auto mb-2 opacity-20" />
                    No confirmed ticket sales yet.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {revenueByEvent.map((ev, i) => (
                      <div key={ev.eventId} className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[10px] font-bold text-[#666] w-4 shrink-0">#{i + 1}</span>
                            <span className="text-xs font-medium text-[#1a1a1a] truncate">{ev.title}</span>
                          </div>
                          <div className="text-right shrink-0 ml-3">
                            <span className="text-xs font-bold text-[#1a1a1a]">
                              {ev.revenue > 0 ? `${ev.revenue.toLocaleString()} FCFA` : "Free"}
                            </span>
                            <span className="text-[10px] text-[#666] ml-1.5">{ev.confirmedRegs} sold</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#e5e7eb] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#EB4203] to-amber-500 rounded-full transition-all"
                            style={{ width: ev.revenue > 0 ? `${Math.round((ev.revenue / maxRevenue) * 100)}%` : `${ev.confirmedRegs > 0 ? 8 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* RECENT ACTIVITY */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-5">
                  <Activity size={15} className="text-[#EB4203]" />
                  <h2 className="font-display font-bold text-[#EB4203]">Recent Activity</h2>
                </div>
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8 text-[#555] text-sm">
                    <Activity size={28} className="mx-auto mb-2 opacity-20" />
                    No activity yet.
                  </div>
                ) : (
                  <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                    {recentActivity.map((reg: any, i) => {
                      const user = attendeeUsers[reg.userId];
                      const ev   = events.find((e: any) => e.eventId === reg.eventId);
                      const name = user
                        ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email || "—"
                        : reg.userId?.slice(0, 8) + "…";
                      const isCheckedIn  = reg.status === "CHECKED_IN";
                      const isCancelled  = reg.status === "CANCELLED";
                      const dotColor     = isCheckedIn ? "bg-blue-500" : isCancelled ? "bg-red-400" : "bg-green-500";
                      const timeAgo = reg.registeredAt
                        ? (() => {
                            const diff = now.getTime() - new Date(reg.registeredAt).getTime();
                            const mins = Math.floor(diff / 60000);
                            const hrs  = Math.floor(diff / 3_600_000);
                            const days = Math.floor(diff / 86_400_000);
                            if (days > 0) return `${days}d ago`;
                            if (hrs  > 0) return `${hrs}h ago`;
                            return `${mins}m ago`;
                          })()
                        : "—";

                      return (
                        <div key={reg.registrationId || i} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-[#fafafa] transition-colors">
                          <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-[#1a1a1a] font-medium truncate">{name}</p>
                            <p className="text-[10px] text-[#666] truncate">{ev?.title || "Unknown event"}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-[10px] font-bold ${isCheckedIn ? "text-blue-600" : isCancelled ? "text-red-500" : "text-green-600"}`}>
                              {isCheckedIn ? "Checked in" : isCancelled ? "Cancelled" : "Registered"}
                            </p>
                            <p className="text-[10px] text-[#888]">{timeAgo}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── REGISTERED ATTENDEES ───────────────────────────────────────── */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <UserCheck size={16} className="text-blue-400" />
                  <h2 className="font-display font-bold text-[#EB4203]">Registered Attendees</h2>
                </div>
                <span className="text-xs text-[#555]">{registrations.length} registration{registrations.length !== 1 ? "s" : ""}</span>
              </div>

              {registrations.length === 0 ? (
                <div className="text-center py-10 text-[#555] text-sm">
                  <Users size={28} className="mx-auto mb-2 opacity-30" />
                  No attendees have registered yet.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-[2fr_2fr_2fr_1.5fr_1fr_1fr_1fr] gap-3 pb-3 border-b border-[#e5e7eb] text-[10px] text-[#555] uppercase tracking-wider">
                    <span>Attendee</span><span>Email</span><span>Event</span><span>Ticket Type</span><span>Cost</span><span>Date</span><span>Status</span>
                  </div>
                  <div className="divide-y divide-[#e5e7eb] max-h-80 overflow-y-auto">
                    {registrations.map((reg: any) => {
                      const user      = attendeeUsers[reg.userId];
                      const ev        = events.find((e: any) => e.eventId === reg.eventId);
                      const tType     = ticketTypes.find((t: any) => (t.ticketId || t.id) === reg.ticketTypeId);
                      const ticketName = tType?.name || "—";
                      const ticketCost = tType
                        ? (tType.price > 0 ? `${tType.price.toLocaleString()} ${tType.currency || "FCFA"}` : "Free")
                        : "—";

                      return (
                        <div key={reg.registrationId} className="grid grid-cols-[2fr_2fr_2fr_1.5fr_1fr_1fr_1fr] gap-3 items-center py-3 text-xs hover:bg-[#fafafa] hover:-mx-3 hover:px-3 rounded-lg transition-all">
                          <span className="text-[#1a1a1a] font-medium truncate">
                            {user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "—" : reg.userId?.slice(0, 8) + "…"}
                          </span>
                          <span className="text-[#555] truncate">{user?.email || "—"}</span>
                          <span className="text-[#555] truncate">{ev?.title || reg.eventId?.slice(0, 8) + "…"}</span>
                          <span className="text-[#555] truncate">{ticketName}</span>
                          <span className="text-[#555] font-medium">{ticketCost}</span>
                          <span className="text-[#666]">
                            {reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                          </span>
                          <span className={`inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            reg.status === "CONFIRMED" || reg.status === "CHECKED_IN" ? "bg-green-50 text-green-700 border border-green-100" :
                            reg.status === "CANCELLED" ? "bg-red-50 text-red-700 border border-red-100" :
                            "bg-stone-100 text-stone-600 border border-stone-200"
                          }`}>
                            {reg.status}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

          </main>
        )}
      </div>
    </div>
  );
}
