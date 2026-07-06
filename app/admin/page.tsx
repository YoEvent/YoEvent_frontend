"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { Search, Calendar, Users, BarChart2, Ticket, UserCheck, Plus, QrCode, ShoppingBag, CreditCard, CheckCircle2, AlertTriangle, RefreshCw, Smartphone } from "lucide-react";
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
    ])
      .then(async ([userData, tenantData, eventsData, analyticsData, regsData, plansData, ticketTypesData, stripeData, settingsData]) => {
        setProfile(userData);
        setTenant(tenantData);
        setEvents(eventsData || []);
        setAnalytics(analyticsData || []);
        setRegistrations(regsData || []);
        setPlans(plansData || []);
        setTicketTypes(ticketTypesData || []);
        setStripeStatus(stripeData || { connected: false });
        setTenantSettings(settingsData);

        // Fetch user details for unique attendee IDs
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

  const totalRegistrations = registrations.length;
  const publishedEvents   = events.filter(e => e.status === "PUBLISHED" || e.status === "ACTIVE").length;
  const totalRevenue      = registrations.reduce((sum, reg) => {
    if (reg.status !== "CONFIRMED" && reg.status !== "CHECKED_IN") return sum;
    const tType = ticketTypes.find((t: any) => (t.ticketId || t.id) === reg.ticketTypeId);
    return sum + Number(tType?.price || 0);
  }, 0);

  let paidTicketsCount = 0;
  let freeTicketsCount = 0;
  registrations.forEach((reg) => {
    if (reg.status !== "CONFIRMED" && reg.status !== "CHECKED_IN") return;
    const tType = ticketTypes.find((t: any) => (t.ticketId || t.id) === reg.ticketTypeId);
    if (tType && tType.price > 0) {
      paidTicketsCount++;
    } else {
      freeTicketsCount++;
    }
  });
  const totalConfirmed = paidTicketsCount + freeTicketsCount;
  const paidPct = totalConfirmed > 0 ? Math.round((paidTicketsCount / totalConfirmed) * 100) : 0;
  const freePct = totalConfirmed > 0 ? 100 - paidPct : 0;

  const displayName = profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : "—";
  const initials    = profile
    ? `${profile.firstName?.charAt(0) || ""}${profile.lastName?.charAt(0) || ""}`.toUpperCase()
    : "?";
  const matchedPlan = plans.find(p => p.planId === tenant?.planId);
  const planName = matchedPlan?.name || tenant?.planName || "Free";

  const enrichedEvents = events.map((ev) => {
    const registrationsCount = registrations.filter((r: any) => r.eventId === ev.eventId || r.event?.eventId === ev.eventId).length;
    const capacity      = ev.maxCapacity > 0 ? ev.maxCapacity : null;
    const pct           = capacity ? Math.min(100, Math.round((registrationsCount / capacity) * 100)) : null;
    return { ...ev, registrations: registrationsCount, capacity, pct };
  });

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">

        {/* TOPBAR */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">Overview</h1>
          <div className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-lg px-3 py-1.5 w-52">
            <Search size={14} className="text-[#555]" />
            <input placeholder="Search…" className="bg-transparent text-sm text-[#1a1a1a] placeholder:text-[#555] outline-none w-full" />
          </div>
        </header>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-[#e5e7eb] border-t-[#EB4203] rounded-full animate-spin" />
          </div>
        ) : (
          <main className="p-8 space-y-6">

            {/* STAT CARDS */}
            <div className="grid grid-cols-4 gap-5">
              {[
                { label: "Total Events",       value: events.length,         icon: Calendar,  color: "text-[#EB4203]", bg: "bg-[#F7E998]/20" },
                { label: "Published",          value: publishedEvents,       icon: BarChart2, color: "text-green-400",  bg: "bg-green-500/10" },
                { label: "Total Registrations",value: totalRegistrations,    icon: Users,     color: "text-blue-400",   bg: "bg-blue-500/10"  },
                { label: "Revenue (FCFA)",     value: totalRevenue > 0 ? totalRevenue.toLocaleString() : "—", icon: Ticket, color: "text-amber-400", bg: "bg-amber-500/10" },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white border border-[#e5e7eb] rounded-2xl p-6 hover:border-[#e5e7eb] transition-colors">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4`}>
                    <Icon size={18} className={color} />
                  </div>
                  <div className="text-xs text-[#555] uppercase tracking-wider mb-1">{label}</div>
                  <div className="font-display text-3xl font-bold text-[#1a1a1a]">{value}</div>
                </div>
              ))}
            </div>

            {/* SALES DISTRIBUTION BREAKDOWN */}
            {registrations.length > 0 && (
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                <h3 className="font-display font-bold text-xs text-[#EB4203] uppercase tracking-wider mb-4">Ticket Sales Distribution</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs text-[#555]">
                    <span>Paid Tickets ({paidTicketsCount})</span>
                    <span>Free Tickets ({freeTicketsCount})</span>
                  </div>
                  <div className="h-3 bg-[#e5e7eb] rounded-full overflow-hidden flex">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all" style={{ width: `${paidPct}%` }} title={`Paid: ${paidPct}%`} />
                    <div className="h-full bg-stone-300 transition-all" style={{ width: `${freePct}%` }} title={`Free: ${freePct}%`} />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#666] tracking-wider uppercase font-semibold">
                    <span>{paidPct}% Paid</span>
                    <span>{freePct}% Free</span>
                  </div>
                </div>
              </div>
            )}

            {/* EVENTS TABLE + PROFILE */}
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
                    No events yet. <Link href="/admin/events" className="text-[#EB4203] hover:underline">Create your first event →</Link>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 pb-3 border-b border-[#e5e7eb] text-[10px] text-[#555] uppercase tracking-wider">
                      <span>Event</span><span>Registrations</span><span>Fill Rate</span><span>Status</span>
                    </div>
                    <div className="divide-y divide-[#e5e7eb]">
                      {enrichedEvents.map((ev) => (
                        <div key={ev.eventId} className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-3 items-center py-3 hover:bg-[#ffffff] hover:-mx-3 hover:px-3 rounded-lg transition-all">
                          <span className="text-sm text-[#1a1a1a] font-medium truncate">{ev.title}</span>
                          <span className="text-sm text-[#555]">{ev.registrations}</span>
                          <div>
                            {ev.pct !== null ? (
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1 bg-[#333] rounded-full overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-[#EB4203] to-[#c23b02] rounded-full" style={{ width: `${ev.pct}%` }} />
                                </div>
                                <span className="text-[10px] text-[#666] w-8 text-right">{ev.pct}%</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[#555]">No cap set</span>
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
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#EB4203] to-[#c23b02] flex items-center justify-center text-[#1a1a1a] font-bold text-lg mb-3">
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
                    <button onClick={handleUpgrade} className="w-full mt-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-full text-sm font-semibold hover:brightness-110 transition-all cursor-pointer">
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
                            <>
                              <RefreshCw size={12} className="animate-spin" /> Connecting...
                            </>
                          ) : (
                            <>Connect Stripe 💳</>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-[#e5e7eb]">
                    <h3 className="font-display font-bold text-sm text-[#EB4203] mb-3 flex items-center gap-2">
                      <Smartphone size={16} className="text-[#EB4203]" /> Mobile Money (MTN / Orange)
                    </h3>
                    {tenantSettings?.payoutMomoNumber ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-600 text-xs font-semibold">
                          <CheckCircle2 size={14} /> Active
                        </div>
                        <div className="flex flex-col gap-1.5 text-xs text-[#555]">
                          <div className="flex justify-between">
                            <span>Provider</span>
                            <span className="font-medium text-[#1a1a1a] uppercase">
                              {tenantSettings.payoutMomoProvider || "momo"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Phone Number</span>
                            <span className="font-medium text-[#1a1a1a]">
                              {tenantSettings.payoutMomoNumber}
                            </span>
                          </div>
                        </div>
                        <Link href="/admin/seo" className="inline-block mt-1 text-[10px] text-[#EB4203] hover:underline">
                          Modify number →
                        </Link>
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

                {/* QUICK ACTIONS WIDGET */}
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 flex flex-col">
                  <h3 className="font-display font-bold text-sm text-[#EB4203] mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Link href="/admin/events" className="flex flex-col items-center justify-center p-3 border border-[#e5e7eb] hover:border-[#EB4203] hover:bg-orange-50/20 rounded-xl transition-all text-center">
                      <Plus size={16} className="text-[#EB4203] mb-1.5" />
                      <span className="text-[10px] font-semibold text-[#1a1a1a]">Create Event</span>
                    </Link>
                    <Link href="/admin/checkin" className="flex flex-col items-center justify-center p-3 border border-[#e5e7eb] hover:border-[#EB4203] hover:bg-orange-50/20 rounded-xl transition-all text-center">
                      <QrCode size={16} className="text-blue-500 mb-1.5" />
                      <span className="text-[10px] font-semibold text-[#1a1a1a]">Scan Tickets</span>
                    </Link>
                    <Link href="/admin/orders" className="flex flex-col items-center justify-center p-3 border border-[#e5e7eb] hover:border-[#EB4203] hover:bg-orange-50/20 rounded-xl transition-all text-center">
                      <ShoppingBag size={16} className="text-emerald-500 mb-1.5" />
                      <span className="text-[10px] font-semibold text-[#1a1a1a]">Manage Orders</span>
                    </Link>
                    <button onClick={() => window.location.reload()} className="flex flex-col items-center justify-center p-3 border border-[#e5e7eb] hover:border-[#EB4203] hover:bg-orange-50/20 rounded-xl transition-all text-center bg-transparent cursor-pointer outline-none">
                      <BarChart2 size={16} className="text-purple-500 mb-1.5" />
                      <span className="text-[10px] font-semibold text-[#1a1a1a]">Refresh Stats</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* REGISTERED ATTENDEES */}
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
                    <span>Attendee</span>
                    <span>Email</span>
                    <span>Event</span>
                    <span>Ticket Type</span>
                    <span>Cost</span>
                    <span>Date</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-[#e5e7eb] max-h-80 overflow-y-auto">
                    {registrations.map((reg: any) => {
                      const user = attendeeUsers[reg.userId];
                      const ev = events.find((e: any) => e.eventId === reg.eventId);
                      const tType = ticketTypes.find((t: any) => (t.ticketId || t.id) === reg.ticketTypeId);
                      const ticketName = tType?.name || "—";
                      const ticketCost = tType
                        ? (tType.price > 0 ? `${tType.price.toLocaleString()} ${tType.currency || "FCFA"}` : "Free")
                        : "—";

                      return (
                        <div key={reg.registrationId} className="grid grid-cols-[2fr_2fr_2fr_1.5fr_1fr_1fr_1fr] gap-3 items-center py-3 text-xs hover:bg-[#ffffff] hover:-mx-3 hover:px-3 rounded-lg transition-all">
                          <span className="text-[#1a1a1a] font-medium truncate">
                            {user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "—" : reg.userId?.slice(0, 8) + "…"}
                          </span>
                          <span className="text-[#555] truncate">{user?.email || "—"}</span>
                          <span className="text-[#555] truncate">{ev?.title || reg.eventId?.slice(0, 8) + "…"}</span>
                          <span className="text-[#555] truncate">{ticketName}</span>
                          <span className="text-[#555] truncate font-medium">{ticketCost}</span>
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
