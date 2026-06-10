"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { Search, Calendar, Users, BarChart2, Ticket, UserCheck } from "lucide-react";
import { getStoredAuth, api } from "@/app/utils/api";
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

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) return;

    Promise.all([
      authService.getUserById(auth.userId),
      authService.getTenantById(auth.tenantId),
      eventService.getMyEvents(),
      eventService.getEventAnalytics(),
      eventService.getMyRegistrations().catch(() => []),
    ])
      .then(async ([userData, tenantData, eventsData, analyticsData, regsData]) => {
        setProfile(userData);
        setTenant(tenantData);
        setEvents(eventsData || []);
        setAnalytics(analyticsData || []);
        setRegistrations(regsData || []);

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

  const totalRegistrations = analytics.reduce((sum, a) => sum + (a.totalRegistrations || 0), 0);
  const publishedEvents   = events.filter(e => e.status === "PUBLISHED" || e.status === "ACTIVE").length;
  const totalRevenue      = analytics.reduce((sum, a) => sum + (a.totalRevenue || 0), 0);

  const displayName = profile ? `${profile.firstName || ""} ${profile.lastName || ""}`.trim() : "—";
  const initials    = profile
    ? `${profile.firstName?.charAt(0) || ""}${profile.lastName?.charAt(0) || ""}`.toUpperCase()
    : "?";

  const enrichedEvents = events.map((ev) => {
    const analytic      = analytics.find((a) => a.eventId === ev.eventId);
    const registrations = analytic?.totalRegistrations || 0;
    const capacity      = ev.maxCapacity > 0 ? ev.maxCapacity : null;
    const pct           = capacity ? Math.min(100, Math.round((registrations / capacity) * 100)) : null;
    return { ...ev, registrations, capacity, pct };
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

              {/* PROFILE CARD */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#EB4203] to-[#c23b02] flex items-center justify-center text-[#1a1a1a] font-bold text-lg mb-3">
                  {initials}
                </div>
                <div className="text-sm font-semibold text-[#1a1a1a] mb-0.5">{displayName}</div>
                <div className="text-xs text-[#555] mb-5">{tenant?.type === "ORGANIZATION" ? "Organisation" : "Individual Creator"}</div>

                {[
                  ["Account Type", tenant?.type || "—"],
                  ["Plan",         tenant?.subscriptionPlan?.name || tenant?.planName || "Free"],
                  ["Industry",     tenant?.industryType || "—"],
                  ["Status",       tenant?.status || "—"],
                  ["Member since", tenant?.createdAt
                    ? new Date(tenant.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
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
                  <div className="grid grid-cols-[2fr_2fr_2fr_1fr_1fr] gap-3 pb-3 border-b border-[#e5e7eb] text-[10px] text-[#555] uppercase tracking-wider">
                    <span>Attendee</span>
                    <span>Email</span>
                    <span>Event</span>
                    <span>Date</span>
                    <span>Status</span>
                  </div>
                  <div className="divide-y divide-[#e5e7eb] max-h-80 overflow-y-auto">
                    {registrations.map((reg: any) => {
                      const user = attendeeUsers[reg.userId];
                      const ev = events.find((e: any) => e.eventId === reg.eventId);
                      return (
                        <div key={reg.registrationId} className="grid grid-cols-[2fr_2fr_2fr_1fr_1fr] gap-3 items-center py-3 text-xs hover:bg-[#ffffff] hover:-mx-3 hover:px-3 rounded-lg transition-all">
                          <span className="text-[#1a1a1a] font-medium truncate">
                            {user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "—" : reg.userId?.slice(0, 8) + "…"}
                          </span>
                          <span className="text-[#555] truncate">{user?.email || "—"}</span>
                          <span className="text-[#555] truncate">{ev?.title || reg.eventId?.slice(0, 8) + "…"}</span>
                          <span className="text-[#666]">
                            {reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                          </span>
                          <span className={`inline-flex items-center justify-center text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            reg.status === "CONFIRMED" ? "bg-green-50 text-green-700 border border-green-100" :
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
