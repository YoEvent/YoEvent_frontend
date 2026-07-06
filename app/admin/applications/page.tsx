"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { CheckCircle, XCircle, Users, Handshake, ChevronDown, Building2, Star, Plus, Trash2, Pencil, Save, Image as ImageIcon } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

type Tab = "sponsors" | "vendors" | "volunteers";

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-amber-900/30 text-amber-300 border border-amber-700/40",
  ACCEPTED: "bg-green-900/30 text-green-400 border border-green-700/40",
  REJECTED: "bg-red-900/30 text-red-400 border border-red-700/40",
};

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";
const saveBtn = "flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-50";

export default function ApplicationsPage() {
  const [tab, setTab] = useState<Tab>("sponsors");
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [exhibitors, setExhibitors] = useState<any[]>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [sponsorPackages, setSponsorPackages] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  
  const [maxSponsors, setMaxSponsors] = useState(10);
  const [maxVendors, setMaxVendors] = useState(15);
  const [maxVolunteers, setMaxVolunteers] = useState(20);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Forms
  const [editingSponsor, setEditingSponsor] = useState<any>(null);
  const [sponsorForm, setSponsorForm] = useState({
    name: "",
    email: "",
    website: "",
    logoUrl: "",
    packageId: "",
  });

  const [editingVendor, setEditingVendor] = useState<any>(null);
  const [vendorForm, setVendorForm] = useState({
    name: "",
    email: "",
    website: "",
    logoUrl: "",
  });

  const [editingVolunteer, setEditingVolunteer] = useState<any>(null);
  const [volunteerForm, setVolunteerForm] = useState({
    name: "",
    email: "",
    phone: "",
    skills: "",
    availability: "",
    photoUrl: "",
  });

  const sponsorFormRef = useRef<HTMLFormElement>(null);
  const vendorFormRef = useRef<HTMLFormElement>(null);
  const volunteerFormRef = useRef<HTMLFormElement>(null);

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
      const [allSponsors, allNetworkings, allSettings, allExhibitors, allPackages] = await Promise.all([
        eventService.getSponsors().catch(() => []),
        eventService.getNetworkings().catch(() => []),
        eventService.getEventSettings().catch(() => []),
        eventService.getExhibitors().catch(() => []),
        eventService.getSponsorshipPackages().catch(() => []),
      ]);
      setSponsors((allSponsors || []).filter(byEventAndTenant));
      setExhibitors((allExhibitors || []).filter(byEventAndTenant));
      setVolunteers((allNetworkings || []).filter((n: any) => byEventAndTenant(n) && n.role === "VOLUNTEER"));
      setSponsorPackages((allPackages || []).filter((p: any) => p.eventId === eventId || p.event?.eventId === eventId));

      const evSetting = (allSettings || []).find((s: any) => s.eventId === eventId || s.event?.eventId === eventId);
      setSettings(evSetting || null);
      if (evSetting?.notificationPrefs) {
        try {
          const prefs = JSON.parse(evSetting.notificationPrefs);
          if (prefs.maxSponsors) setMaxSponsors(prefs.maxSponsors);
          if (prefs.maxVolunteers) setMaxVolunteers(prefs.maxVolunteers);
          if (prefs.maxVendors) setMaxVendors(prefs.maxVendors);
        } catch {}
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveLimit = async (field: "maxSponsors" | "maxVolunteers" | "maxVendors", value: number) => {
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

  const updateVendorStatus = async (vendor: any, status: "ACCEPTED" | "REJECTED") => {
    const id = vendor.exhibitorId || vendor.id;
    const acceptedCount = exhibitors.filter(v => v.status === "ACCEPTED").length;
    if (status === "ACCEPTED" && acceptedCount >= maxVendors) {
      showToast("error", `Maximum vendor limit (${maxVendors}) already reached.`);
      return;
    }
    setActionLoading(id);
    try {
      await eventService.updateExhibitor(id, { ...vendor, status });
      setExhibitors(prev => prev.map(v => (v.exhibitorId === id || v.id === id) ? { ...v, status } : v));
      showToast("success", `Vendor ${status === "ACCEPTED" ? "accepted" : "rejected"}.`);
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

  const saveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setSaving(true);
    const auth = getStoredAuth();
    const payload = {
      eventId: selectedEventId,
      tenantId: auth?.tenantId,
      name: sponsorForm.name,
      email: sponsorForm.email,
      website: sponsorForm.website,
      logoUrl: sponsorForm.logoUrl || undefined,
      packageId: sponsorForm.packageId || undefined,
      status: "ACCEPTED",
    };
    try {
      if (editingSponsor) {
        await eventService.updateSponsor(editingSponsor.sponsorId || editingSponsor.id, payload);
        setEditingSponsor(null);
        showToast("success", "Sponsor updated!");
      } else {
        await eventService.createSponsor(payload);
        showToast("success", "Sponsor added!");
      }
      setSponsorForm({ name: "", email: "", website: "", logoUrl: "", packageId: "" });
      await loadApplications(selectedEventId);
    } catch (err: any) {
      showToast("error", err.message || "Failed to save sponsor.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSponsor = async (id: string) => {
    if (!confirm("Delete this sponsor?")) return;
    try {
      await eventService.deleteSponsor(id);
      if (editingSponsor?.sponsorId === id || editingSponsor?.id === id) {
        setEditingSponsor(null);
        setSponsorForm({ name: "", email: "", website: "", logoUrl: "", packageId: "" });
      }
      await loadApplications(selectedEventId);
      showToast("success", "Sponsor deleted!");
    } catch {
      showToast("error", "Failed to delete sponsor.");
    }
  };

  const saveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setSaving(true);
    const auth = getStoredAuth();
    const payload = {
      eventId: selectedEventId,
      tenantId: auth?.tenantId,
      name: vendorForm.name,
      email: vendorForm.email,
      website: vendorForm.website,
      logoUrl: vendorForm.logoUrl || undefined,
      status: "ACCEPTED",
    };
    try {
      if (editingVendor) {
        await eventService.updateExhibitor(editingVendor.exhibitorId || editingVendor.id, payload);
        setEditingVendor(null);
        showToast("success", "Vendor updated!");
      } else {
        await eventService.createExhibitor(payload);
        showToast("success", "Vendor added!");
      }
      setVendorForm({ name: "", email: "", website: "", logoUrl: "" });
      await loadApplications(selectedEventId);
    } catch (err: any) {
      showToast("error", err.message || "Failed to save vendor.");
    } finally {
      setSaving(false);
    }
  };

  const deleteVendor = async (id: string) => {
    if (!confirm("Delete this vendor?")) return;
    try {
      await eventService.deleteExhibitor(id);
      if (editingVendor?.exhibitorId === id || editingVendor?.id === id) {
        setEditingVendor(null);
        setVendorForm({ name: "", email: "", website: "", logoUrl: "" });
      }
      await loadApplications(selectedEventId);
      showToast("success", "Vendor deleted!");
    } catch {
      showToast("error", "Failed to delete vendor.");
    }
  };

  const saveVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setSaving(true);
    const auth = getStoredAuth();
    const payload = {
      eventId: selectedEventId,
      tenantId: auth?.tenantId,
      name: volunteerForm.name,
      email: volunteerForm.email,
      phone: volunteerForm.phone,
      skills: volunteerForm.skills,
      availability: volunteerForm.availability,
      photoUrl: volunteerForm.photoUrl || undefined,
      role: "VOLUNTEER",
      status: "ACCEPTED",
    };
    try {
      if (editingVolunteer) {
        await eventService.updateNetworking(editingVolunteer.connectionId || editingVolunteer.id, payload);
        setEditingVolunteer(null);
        showToast("success", "Volunteer updated!");
      } else {
        await eventService.createNetworking(payload);
        showToast("success", "Volunteer added!");
      }
      setVolunteerForm({ name: "", email: "", phone: "", skills: "", availability: "", photoUrl: "" });
      await loadApplications(selectedEventId);
    } catch (err: any) {
      showToast("error", err.message || "Failed to save volunteer.");
    } finally {
      setSaving(false);
    }
  };

  const deleteVolunteer = async (id: string) => {
    if (!confirm("Delete this volunteer?")) return;
    try {
      await eventService.deleteNetworking(id);
      if (editingVolunteer?.connectionId === id || editingVolunteer?.id === id) {
        setEditingVolunteer(null);
        setVolunteerForm({ name: "", email: "", phone: "", skills: "", availability: "", photoUrl: "" });
      }
      await loadApplications(selectedEventId);
      showToast("success", "Volunteer deleted!");
    } catch {
      showToast("error", "Failed to delete volunteer.");
    }
  };

  const selectedEvent = events.find(e => e.eventId === selectedEventId);
  const pendingSponsors = sponsors.filter(s => s.status === "PENDING").length;
  const pendingVendors = exhibitors.filter(v => v.status === "PENDING").length;
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
                onChange={e => {
                  setSelectedEventId(e.target.value);
                  setEditingSponsor(null);
                  setEditingVendor(null);
                  setEditingVolunteer(null);
                }}
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

        <main className="p-8 space-y-6 max-w-[1400px]">
          {/* TOAST */}
          {toast && (
            <div className={`fixed top-5 right-5 z-[100] px-5 py-3 rounded-xl text-sm font-semibold shadow-xl ${toast.type === "success" ? "bg-green-700 text-white" : "bg-red-700 text-white"}`}>
              {toast.text}
            </div>
          )}

          {/* STATS */}
          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-900/30 flex items-center justify-center"><Handshake size={20} className="text-amber-300" /></div>
              <div>
                <p className="text-xs text-[#555] uppercase tracking-wider">Sponsor Applications</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">{sponsors.length} <span className="text-sm font-normal text-amber-300">({pendingSponsors} pending)</span></p>
              </div>
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-purple-900/30 flex items-center justify-center"><Building2 size={20} className="text-purple-300" /></div>
              <div>
                <p className="text-xs text-[#555] uppercase tracking-wider">Vendor Applications</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">{exhibitors.length} <span className="text-sm font-normal text-purple-300">({pendingVendors} pending)</span></p>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                <label className="block text-xs text-[#555] uppercase tracking-wider mb-2">Max Vendors</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number" min={1} value={maxVendors}
                    onChange={e => setMaxVendors(Number(e.target.value))}
                    className="w-24 bg-white border border-[#e5e7eb] text-[#1a1a1a] rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#F7E998]"
                  />
                  <button onClick={() => saveLimit("maxVendors", maxVendors)} className="px-4 py-1.5 bg-[#EB4203] text-white text-xs font-bold rounded-lg hover:bg-[#c23b02] transition-colors cursor-pointer">Save</button>
                  <span className="text-xs text-[#555]">{exhibitors.filter(v => v.status === "ACCEPTED").length} accepted</span>
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
            {([["sponsors", "Sponsors", Handshake], ["vendors", "Vendors", Building2], ["volunteers", "Volunteers", Users]] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tab === key ? "bg-[#FF4747] text-white" : "text-[#666] hover:text-[#1a1a1a]"}`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#e5e7eb] border-t-[#EB4203] rounded-full animate-spin" /></div>
          ) : tab === "sponsors" ? (
            <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
              {/* Sponsors List */}
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
                        <p className="font-semibold text-[#1a1a1a] truncate">{s.companyName || s.name || "Unknown Company"}</p>
                        <p className="text-xs text-[#666] mt-0.5">{s.email || s.contactEmail || "—"} {s.phone ? `· ${s.phone}` : ""}</p>
                        {s.website && <p className="text-xs text-[#EB4203] mt-1"><a href={s.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{s.website}</a></p>}
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
                      <div className="flex gap-2 shrink-0">
                        {(s.status === "PENDING" || !s.status) && (
                          <>
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
                          </>
                        )}
                        <button
                          onClick={() => {
                            setEditingSponsor(s);
                            setSponsorForm({
                              name: s.companyName || s.name || "",
                              email: s.email || s.contactEmail || "",
                              website: s.website || "",
                              logoUrl: s.logo || s.logoUrl || "",
                              packageId: s.packageId || "",
                            });
                            sponsorFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="p-1.5 text-[#555] hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteSponsor(id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Sponsor Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-sm text-[#1a1a1a]">{editingSponsor ? "Edit Sponsor" : "Add Sponsor"}</h3>
                  {editingSponsor && (
                    <button type="button" onClick={() => { setEditingSponsor(null); setSponsorForm({ name: "", email: "", website: "", logoUrl: "", packageId: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                  )}
                </div>
                <form ref={sponsorFormRef} onSubmit={saveSponsor} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>Sponsor Name *</label>
                      <input required placeholder="Acme Corp" value={sponsorForm.name} onChange={e => setSponsorForm(f => ({ ...f, name: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Email</label>
                      <input type="email" placeholder="sponsor@acme.com" value={sponsorForm.email} onChange={e => setSponsorForm(f => ({ ...f, email: e.target.value }))} className={inp} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>Website / Link</label>
                      <input type="url" placeholder="https://acme.com" value={sponsorForm.website} onChange={e => setSponsorForm(f => ({ ...f, website: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Package</label>
                      <select value={sponsorForm.packageId} onChange={e => setSponsorForm(f => ({ ...f, packageId: e.target.value }))} className={inp}>
                        <option value="">— No package —</option>
                        {sponsorPackages.map((p: any) => <option key={p.packageId || p.id} value={p.packageId || p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={label}>Sponsor Logo</label>
                    <label className="flex items-center gap-4 border-2 border-dashed border-[#e5e7eb] rounded-2xl p-4 cursor-pointer hover:border-[#FF4747] transition-colors group">
                      {sponsorForm.logoUrl ? (
                        <img src={sponsorForm.logoUrl} alt="Preview" className="w-14 h-14 rounded-lg object-contain border border-[#e5e7eb] shrink-0 bg-[#fafafa]" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-[#fafafa] flex items-center justify-center shrink-0 border border-[#e5e7eb]">
                          <ImageIcon size={22} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-[#1a1a1a]">{sponsorForm.logoUrl ? "Click to change" : "Upload logo"}</div>
                        <div className="text-xs text-[#aaa]">PNG or JPG</div>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          setSaving(true);
                          const res = await eventService.uploadImage(f);
                          setSponsorForm(f => ({ ...f, logoUrl: res.url }));
                          showToast("success", "Logo uploaded successfully!");
                        } catch (err: any) {
                          showToast("error", "Failed to upload logo: " + (err.message || err));
                        } finally {
                          setSaving(false);
                        }
                      }} />
                    </label>
                    {sponsorForm.logoUrl && <button type="button" onClick={() => setSponsorForm(f => ({ ...f, logoUrl: "" }))} className="text-xs text-red-500 mt-1 cursor-pointer hover:underline">Remove logo</button>}
                  </div>
                  <button type="submit" disabled={saving} className={saveBtn}>
                    <Save size={13} /> {editingSponsor ? (saving ? "Saving..." : "Save Sponsor") : (saving ? "Adding..." : "Add Sponsor")}
                  </button>
                </form>
              </div>
            </div>
          ) : tab === "vendors" ? (
            <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
              {/* Vendors List */}
              <div className="space-y-3">
                {exhibitors.length === 0 ? (
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl p-10 text-center text-[#555]">No vendor applications for this event.</div>
                ) : exhibitors.map((v) => {
                  const id = v.exhibitorId || v.id;
                  return (
                    <div key={id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-5">
                      {/* Logo */}
                      <div className="w-14 h-14 rounded-xl bg-[#ffffff] border border-[#e5e7eb] flex items-center justify-center shrink-0 overflow-hidden">
                        {v.logo || v.logoUrl ? (
                          <img src={v.logo || v.logoUrl} alt={v.name || v.companyName} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Building2 size={22} className="text-[#444]" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1a1a1a] truncate">{v.name || v.companyName || "Unknown Vendor"}</p>
                        <p className="text-xs text-[#666] mt-0.5">{v.email || "—"} {v.phone ? `· ${v.phone}` : ""}</p>
                        {v.website && <p className="text-xs text-[#EB4203] mt-1"><a href={v.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{v.website}</a></p>}
                      </div>
                      {/* Status */}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 ${STATUS_STYLES[v.status] || STATUS_STYLES.PENDING}`}>
                        {v.status || "PENDING"}
                      </span>
                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        {(v.status === "PENDING" || !v.status) && (
                          <>
                            <button
                              onClick={() => updateVendorStatus(v, "ACCEPTED")}
                              disabled={actionLoading === id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/40 hover:bg-green-800/60 text-green-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                            >
                              <CheckCircle size={13} /> Accept
                            </button>
                            <button
                              onClick={() => updateVendorStatus(v, "REJECTED")}
                              disabled={actionLoading === id}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                            >
                              <XCircle size={13} /> Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => {
                            setEditingVendor(v);
                            setVendorForm({
                              name: v.name || v.companyName || "",
                              email: v.email || "",
                              website: v.website || "",
                              logoUrl: v.logo || v.logoUrl || "",
                            });
                            vendorFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="p-1.5 text-[#555] hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteVendor(id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Vendor Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-sm text-[#1a1a1a]">{editingVendor ? "Edit Vendor" : "Add Vendor"}</h3>
                  {editingVendor && (
                    <button type="button" onClick={() => { setEditingVendor(null); setVendorForm({ name: "", email: "", website: "", logoUrl: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                  )}
                </div>
                <form ref={vendorFormRef} onSubmit={saveVendor} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>Vendor Name *</label>
                      <input required placeholder="Vendor Corp" value={vendorForm.name} onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Email</label>
                      <input type="email" placeholder="vendor@acme.com" value={vendorForm.email} onChange={e => setVendorForm(f => ({ ...f, email: e.target.value }))} className={inp} />
                    </div>
                  </div>
                  <div>
                    <label className={label}>Website / Link</label>
                    <input type="url" placeholder="https://vendor.com" value={vendorForm.website} onChange={e => setVendorForm(f => ({ ...f, website: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={label}>Vendor Logo</label>
                    <label className="flex items-center gap-4 border-2 border-dashed border-[#e5e7eb] rounded-2xl p-4 cursor-pointer hover:border-[#FF4747] transition-colors group">
                      {vendorForm.logoUrl ? (
                        <img src={vendorForm.logoUrl} alt="Preview" className="w-14 h-14 rounded-lg object-contain border border-[#e5e7eb] shrink-0 bg-[#fafafa]" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-[#fafafa] flex items-center justify-center shrink-0 border border-[#e5e7eb]">
                          <ImageIcon size={22} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-[#1a1a1a]">{vendorForm.logoUrl ? "Click to change" : "Upload logo"}</div>
                        <div className="text-xs text-[#aaa]">PNG or JPG</div>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          setSaving(true);
                          const res = await eventService.uploadImage(f);
                          setVendorForm(f => ({ ...f, logoUrl: res.url }));
                          showToast("success", "Logo uploaded successfully!");
                        } catch (err: any) {
                          showToast("error", "Failed to upload logo: " + (err.message || err));
                        } finally {
                          setSaving(false);
                        }
                      }} />
                    </label>
                    {vendorForm.logoUrl && <button type="button" onClick={() => setVendorForm(f => ({ ...f, logoUrl: "" }))} className="text-xs text-red-500 mt-1 cursor-pointer hover:underline">Remove logo</button>}
                  </div>
                  <button type="submit" disabled={saving} className={saveBtn}>
                    <Save size={13} /> {editingVendor ? (saving ? "Saving..." : "Save Vendor") : (saving ? "Adding..." : "Add Vendor")}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
              {/* Volunteers List */}
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
                        {v.skills && <p className="text-xs text-[#555] mt-1"><strong className="font-medium text-[#1a1a1a]">Skills:</strong> {v.skills}</p>}
                        {v.availability && <p className="text-xs text-[#555]"><strong className="font-medium text-[#1a1a1a]">Availability:</strong> {v.availability}</p>}
                      </div>
                      {/* Status */}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 ${STATUS_STYLES[v.status] || STATUS_STYLES.PENDING}`}>
                        {v.status || "PENDING"}
                      </span>
                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        {(v.status === "PENDING" || !v.status) && (
                          <>
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
                          </>
                        )}
                        <button
                          onClick={() => {
                            setEditingVolunteer(v);
                            setVolunteerForm({
                              name: v.name || "",
                              email: v.email || "",
                              phone: v.phone || "",
                              skills: v.skills || "",
                              availability: v.availability || "",
                              photoUrl: v.photoUrl || "",
                            });
                            volunteerFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="p-1.5 text-[#555] hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteVolunteer(id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Volunteer Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-sm text-[#1a1a1a]">{editingVolunteer ? "Edit Volunteer" : "Add Volunteer"}</h3>
                  {editingVolunteer && (
                    <button type="button" onClick={() => { setEditingVolunteer(null); setVolunteerForm({ name: "", email: "", phone: "", skills: "", availability: "", photoUrl: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                  )}
                </div>
                <form ref={volunteerFormRef} onSubmit={saveVolunteer} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>Name *</label>
                      <input required placeholder="John Doe" value={volunteerForm.name} onChange={e => setVolunteerForm(f => ({ ...f, name: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Email</label>
                      <input type="email" placeholder="john@example.com" value={volunteerForm.email} onChange={e => setVolunteerForm(f => ({ ...f, email: e.target.value }))} className={inp} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>Phone</label>
                      <input placeholder="+237699..." value={volunteerForm.phone} onChange={e => setVolunteerForm(f => ({ ...f, phone: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Availability</label>
                      <input placeholder="e.g. Day 1, Mornings" value={volunteerForm.availability} onChange={e => setVolunteerForm(f => ({ ...f, availability: e.target.value }))} className={inp} />
                    </div>
                  </div>
                  <div>
                    <label className={label}>Skills / Notes</label>
                    <textarea placeholder="e.g. Graphic design, crowd control" value={volunteerForm.skills} onChange={e => setVolunteerForm(f => ({ ...f, skills: e.target.value }))} rows={2} className={inp + " resize-none"} />
                  </div>
                  <div>
                    <label className={label}>Photo</label>
                    <label className="flex items-center gap-4 border-2 border-dashed border-[#e5e7eb] rounded-2xl p-4 cursor-pointer hover:border-[#FF4747] transition-colors group">
                      {volunteerForm.photoUrl ? (
                        <img src={volunteerForm.photoUrl} alt="Preview" className="w-14 h-14 rounded-full object-cover border border-[#e5e7eb] shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-[#fafafa] flex items-center justify-center shrink-0 border border-[#e5e7eb]">
                          <ImageIcon size={22} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-semibold text-[#1a1a1a]">{volunteerForm.photoUrl ? "Click to change" : "Upload photo"}</div>
                        <div className="text-xs text-[#aaa]">PNG or JPG</div>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          setSaving(true);
                          const res = await eventService.uploadImage(f);
                          setVolunteerForm(f => ({ ...f, photoUrl: res.url }));
                          showToast("success", "Photo uploaded successfully!");
                        } catch (err: any) {
                          showToast("error", "Failed to upload photo: " + (err.message || err));
                        } finally {
                          setSaving(false);
                        }
                      }} />
                    </label>
                    {volunteerForm.photoUrl && <button type="button" onClick={() => setVolunteerForm(f => ({ ...f, photoUrl: "" }))} className="text-xs text-red-500 mt-1 cursor-pointer hover:underline">Remove photo</button>}
                  </div>
                  <button type="submit" disabled={saving} className={saveBtn}>
                    <Save size={13} /> {editingVolunteer ? (saving ? "Saving..." : "Save Volunteer") : (saving ? "Adding..." : "Add Volunteer")}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
