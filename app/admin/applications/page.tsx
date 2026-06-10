"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { CheckCircle, XCircle, Users, Handshake, ChevronDown } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

type Tab = "sponsors" | "volunteers";

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-amber-900/30 text-amber-300 border border-amber-700/40",
  ACCEPTED: "bg-green-900/30 text-green-400 border border-green-700/40",
  REJECTED: "bg-red-900/30 text-red-400 border border-red-700/40",
};

export default function ApplicationsPage() {
  const [tab, setTab] = useState<Tab>("sponsors");
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [maxSponsors, setMaxSponsors] = useState(10);
  const [maxVolunteers, setMaxVolunteers] = useState(20);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) return;
    eventService.getMyEvents().then((evs) => {
      setEvents(evs || []);
      if (evs?.length) setSelectedEventId(evs[0].eventId);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    loadApplications(selectedEventId);
  }, [selectedEventId]);

  const loadApplications = async (eventId: string) => {
    setLoading(true);
    const auth = getStoredAuth();
    const tenantId = auth?.tenantId;
    const byEventAndTenant = (item: any) =>
      (item.eventId === eventId || item.event?.eventId === eventId) &&
      (!tenantId || !item.tenantId || item.tenantId === tenantId);
    try {
      const [allSponsors, allNetworkings, allSettings] = await Promise.all([
        eventService.getSponsors().catch(() => []),
        eventService.getNetworkings().catch(() => []),
        eventService.getEventSettings().catch(() => []),
      ]);
      setSponsors((allSponsors || []).filter(byEventAndTenant));
      setVolunteers((allNetworkings || []).filter((n: any) => byEventAndTenant(n) && n.role === "VOLUNTEER"));

      const evSetting = (allSettings || []).find((s: any) => s.eventId === eventId || s.event?.eventId === eventId);
      setSettings(evSetting || null);
      if (evSetting?.notificationPrefs) {
        try {
          const prefs = JSON.parse(evSetting.notificationPrefs);
          if (prefs.maxSponsors) setMaxSponsors(prefs.maxSponsors);
          if (prefs.maxVolunteers) setMaxVolunteers(prefs.maxVolunteers);
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveLimit = async (field: "maxSponsors" | "maxVolunteers", value: number) => {
    if (!selectedEventId) return;
    try {
      const auth = getStoredAuth();
      const currentPrefs = (() => { try { return settings?.notificationPrefs ? JSON.parse(settings.notificationPrefs) : {}; } catch { return {}; } })();
      const newPrefs = JSON.stringify({ ...currentPrefs, [field]: value });
      if (settings?.settingId) {
        await eventService.updateEventSetting(settings.settingId, { ...settings, notificationPrefs: newPrefs });
      } else {
        const created = await eventService.createEventSetting({ eventId: selectedEventId, tenantId: auth?.tenantId, notificationPrefs: newPrefs });
        setSettings(created);
      }
      showToast("success", "Limit saved.");
    } catch {
      showToast("error", "Failed to save limit.");
    }
  };

  const updateSponsorStatus = async (sponsor: any, status: "ACCEPTED" | "REJECTED") => {
    const id = sponsor.sponsorId || sponsor.id;
    const acceptedCount = sponsors.filter(s => s.status === "ACCEPTED").length;
    if (status === "ACCEPTED" && acceptedCount >= maxSponsors) {
      showToast("error", `Maximum sponsor limit (${maxSponsors}) already reached.`);
      return;
    }
    setActionLoading(id);
    try {
      await eventService.updateSponsor(id, { ...sponsor, status });
      setSponsors(prev => prev.map(s => (s.sponsorId === id || s.id === id) ? { ...s, status } : s));
      showToast("success", `Sponsor ${status === "ACCEPTED" ? "accepted" : "rejected"}.`);
    } catch {
      showToast("error", "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const updateVolunteerStatus = async (volunteer: any, status: "ACCEPTED" | "REJECTED") => {
    const id = volunteer.connectionId || volunteer.id;
    const acceptedCount = volunteers.filter(v => v.status === "ACCEPTED").length;
    if (status === "ACCEPTED" && acceptedCount >= maxVolunteers) {
      showToast("error", `Maximum volunteer limit (${maxVolunteers}) already reached.`);
      return;
    }
    setActionLoading(id);
    try {
      await eventService.updateNetworking(id, { ...volunteer, status });
      setVolunteers(prev => prev.map(v => (v.connectionId === id || v.id === id) ? { ...v, status } : v));
      showToast("success", `Volunteer ${status === "ACCEPTED" ? "accepted" : "rejected"}.`);
    } catch {
      showToast("error", "Action failed.");
    } finally {
      setActionLoading(null);
    }
  };

  const selectedEvent = events.find(e => e.eventId === selectedEventId);
  const pendingSponsors = sponsors.filter(s => s.status === "PENDING").length;
  const pendingVolunteers = volunteers.filter(v => v.status === "PENDING").length;

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">Applications</h1>
          {events.length > 0 && (
            <div className="relative">
              <select
                value={selectedEventId}
                onChange={e => setSelectedEventId(e.target.value)}
                className="appearance-none bg-white border border-[#e5e7eb] text-[#1a1a1a] text-sm rounded-lg px-4 py-1.5 pr-8 outline-none cursor-pointer"
              >
                {events.map(ev => (
                  <option key={ev.eventId} value={ev.eventId}>{ev.title}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
            </div>
          )}
        </header>

        <main className="p-8 space-y-6">
          {/* TOAST */}
          {toast && (
            <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl text-sm font-semibold shadow-xl ${toast.type === "success" ? "bg-green-700 text-white" : "bg-red-700 text-white"}`}>
              {toast.text}
            </div>
          )}

          {/* STATS */}
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-900/30 flex items-center justify-center"><Handshake size={20} className="text-amber-300" /></div>
              <div>
                <p className="text-xs text-[#555] uppercase tracking-wider">Sponsor Applications</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">{sponsors.length} <span className="text-sm font-normal text-amber-300">({pendingSponsors} pending)</span></p>
              </div>
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-900/30 flex items-center justify-center"><Users size={20} className="text-blue-300" /></div>
              <div>
                <p className="text-xs text-[#555] uppercase tracking-wider">Volunteer Applications</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">{volunteers.length} <span className="text-sm font-normal text-blue-300">({pendingVolunteers} pending)</span></p>
              </div>
            </div>
          </div>

          {/* LIMITS */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
            <h2 className="font-display font-bold text-[#EB4203] mb-4">Acceptance Limits — {selectedEvent?.title || "Select an event"}</h2>
            <div className="flex flex-wrap gap-8">
              <div>
                <label className="block text-xs text-[#555] uppercase tracking-wider mb-2">Max Sponsors</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min={1} value={maxSponsors}
                    onChange={e => setMaxSponsors(Number(e.target.value))}
                    className="w-24 bg-white border border-[#e5e7eb] text-[#1a1a1a] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#F7E998]"
                  />
                  <button onClick={() => saveLimit("maxSponsors", maxSponsors)} className="px-4 py-1.5 bg-[#EB4203] text-white text-xs font-bold rounded-lg hover:bg-[#c23b02] transition-colors cursor-pointer">Save</button>
                  <span className="text-xs text-[#555]">{sponsors.filter(s => s.status === "ACCEPTED").length} accepted</span>
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#555] uppercase tracking-wider mb-2">Max Volunteers</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min={1} value={maxVolunteers}
                    onChange={e => setMaxVolunteers(Number(e.target.value))}
                    className="w-24 bg-white border border-[#e5e7eb] text-[#1a1a1a] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#F7E998]"
                  />
                  <button onClick={() => saveLimit("maxVolunteers", maxVolunteers)} className="px-4 py-1.5 bg-[#EB4203] text-white text-xs font-bold rounded-lg hover:bg-[#c23b02] transition-colors cursor-pointer">Save</button>
                  <span className="text-xs text-[#555]">{volunteers.filter(v => v.status === "ACCEPTED").length} accepted</span>
                </div>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-1 bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl p-1 w-fit">
            {([["sponsors", "Sponsors", Handshake], ["volunteers", "Volunteers", Users]] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tab === key ? "bg-[#FF4747] text-white" : "text-[#666] hover:text-[#1a1a1a]"}`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#e5e7eb] border-t-[#EB4203] rounded-full animate-spin" /></div>
          ) : tab === "sponsors" ? (
            <div className="space-y-3">
              {sponsors.length === 0 ? (
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-10 text-center text-[#555]">No sponsor applications for this event.</div>
              ) : sponsors.map((s) => {
                const id = s.sponsorId || s.id;
                return (
                  <div key={id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-5">
                    {/* Logo */}
                    <div className="w-14 h-14 rounded-xl bg-[#ffffff] border border-[#e5e7eb] flex items-center justify-center shrink-0 overflow-hidden">
                      {s.logo || s.logoUrl ? (
                        <img src={s.logo || s.logoUrl} alt={s.companyName} className="w-full h-full object-contain p-1" />
                      ) : (
                        <Handshake size={22} className="text-[#444]" />
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1a1a1a] truncate">{s.companyName || "Unknown Company"}</p>
                      <p className="text-xs text-[#666] mt-0.5">{s.email || s.contactEmail || "—"} {s.phone ? `· ${s.phone}` : ""}</p>
                      {s.message && <p className="text-xs text-[#555] mt-1 line-clamp-2 italic">"{s.message}"</p>}
                    </div>
                    {/* Amount */}
                    {s.sponsorshipAmount && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-[#555]">Amount</p>
                        <p className="text-sm font-bold text-[#EB4203]">{Number(s.sponsorshipAmount).toLocaleString()} FCFA</p>
                      </div>
                    )}
                    {/* Status */}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 ${STATUS_STYLES[s.status] || STATUS_STYLES.PENDING}`}>
                      {s.status || "PENDING"}
                    </span>
                    {/* Actions */}
                    {(s.status === "PENDING" || !s.status) && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => updateSponsorStatus(s, "ACCEPTED")}
                          disabled={actionLoading === id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/40 hover:bg-green-800/60 text-green-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <CheckCircle size={13} /> Accept
                        </button>
                        <button
                          onClick={() => updateSponsorStatus(s, "REJECTED")}
                          disabled={actionLoading === id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              {volunteers.length === 0 ? (
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-10 text-center text-[#555]">No volunteer applications for this event.</div>
              ) : volunteers.map((v) => {
                const id = v.connectionId || v.id;
                return (
                  <div key={id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-5">
                    {/* Photo */}
                    <div className="w-14 h-14 rounded-full bg-[#ffffff] border border-[#e5e7eb] flex items-center justify-center shrink-0 overflow-hidden">
                      {v.photoUrl ? (
                        <img src={v.photoUrl} alt={v.name} className="w-full h-full object-cover" />
                      ) : (
                        <Users size={22} className="text-[#444]" />
                      )}
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1a1a1a] truncate">{v.name || `Volunteer ${(id || "").substring(0, 8)}`}</p>
                      <p className="text-xs text-[#666] mt-0.5">{v.email || "—"} {v.phone ? `· ${v.phone}` : ""}</p>
                      {v.skills && <p className="text-xs text-[#555] mt-1">Skills: {v.skills}</p>}
                      {v.availability && <p className="text-xs text-[#555]">Availability: {v.availability}</p>}
                    </div>
                    {/* Status */}
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 ${STATUS_STYLES[v.status] || STATUS_STYLES.PENDING}`}>
                      {v.status || "PENDING"}
                    </span>
                    {/* Actions */}
                    {(v.status === "PENDING" || !v.status) && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => updateVolunteerStatus(v, "ACCEPTED")}
                          disabled={actionLoading === id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/40 hover:bg-green-800/60 text-green-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <CheckCircle size={13} /> Accept
                        </button>
                        <button
                          onClick={() => updateVolunteerStatus(v, "REJECTED")}
                          disabled={actionLoading === id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
