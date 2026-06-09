"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Users, Box, Link2, Upload } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { authService } from "@/app/utils/services/authService";

export default function WebsitePage() {
  const [tenant, setTenant] = useState<any>(null);
  const [brandingLoading, setBrandingLoading] = useState<"logo" | "banner" | null>(null);
  const [brandingMsg, setBrandingMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [tracks, setTracks] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [exhibitors, setExhibitors] = useState<any[]>([]);

  // Forms
  const [trackForm, setTrackForm] = useState({ name: "", description: "", capacity: 100 });
  const [sponsorForm, setSponsorForm] = useState({ companyName: "", logo: "", sponsorshipAmount: 500, email: "" });
  const [exhibitorForm, setExhibitorForm] = useState({ companyName: "", logo: "", boothNumber: "", website: "", email: "" });

  const fetchWebsiteData = async () => {
    const auth = getStoredAuth();
    if (!auth) return;
    try {
      const [evs, tenantData] = await Promise.all([
        eventService.getMyEvents(),
        authService.getTenantById(auth.tenantId),
      ]);
      setEvents(evs || []);
      setTenant(tenantData);
      if (evs && evs.length > 0 && !selectedEventId) {
        setSelectedEventId(evs[0].eventId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBrandingUpload = async (type: "logo" | "banner", file: File) => {
    const auth = getStoredAuth();
    if (!auth) return;
    setBrandingLoading(type);
    setBrandingMsg(null);
    try {
      const res = type === "logo"
        ? await authService.uploadTenantLogo(auth.tenantId, file)
        : await authService.uploadTenantBanner(auth.tenantId, file);
      const url = res?.url || res?.logoUrl || res?.bannerUrl || Object.values(res || {})[0] as string;
      setTenant((prev: any) => ({ ...prev, [type === "logo" ? "logo" : "bannerUrl"]: url }));
      setBrandingMsg({ type: "success", text: `${type === "logo" ? "Logo" : "Banner"} updated successfully.` });
    } catch {
      setBrandingMsg({ type: "error", text: `Failed to upload ${type}. Please try again.` });
    } finally {
      setBrandingLoading(null);
    }
  };

  const fetchEventConfig = async (eventId: string) => {
    if (!eventId) return;
    try {
      const [tracksList, sponsorsList, exhibitorsList] = await Promise.all([
        eventService.getTracks(),
        eventService.getSponsors(),
        eventService.getExhibitors(),
      ]);

      setTracks((tracksList || []).filter((t) => t.eventId === eventId));
      setSponsors((sponsorsList || []).filter((s) => s.eventId === eventId));
      setExhibitors((exhibitorsList || []).filter((e) => e.eventId === eventId));
    } catch (err) {
      console.error("Failed to load configs:", err);
    }
  };

  useEffect(() => {
    fetchWebsiteData();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventConfig(selectedEventId);
    }
  }, [selectedEventId]);

  const handleAddTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !trackForm.name) return;
    try {
      await eventService.createTrack({
        eventId: selectedEventId,
        name: trackForm.name,
        description: trackForm.description,
        capacity: Number(trackForm.capacity),
      });
      setTrackForm({ name: "", description: "", capacity: 100 });
      fetchEventConfig(selectedEventId);
    } catch (err) {
      console.error("Failed to add track:", err);
    }
  };

  const handleAddSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!sponsorForm.email) {
      alert("Sponsor User Email is required.");
      return;
    }
    try {
      const usersList = await authService.getUsers();
      const user = (usersList || []).find((u: any) => u.email === sponsorForm.email);
      
      if (!user) {
        alert("No user found with that email. Please ensure the user is registered.");
        return;
      }

      await eventService.createSponsor({
        eventId: selectedEventId,
        userId: user.userId,
        packageId: null, // Hardcoded for now as packages UI doesn't exist
        companyName: sponsorForm.companyName,
        logo: sponsorForm.logo || "https://logo.clearbit.com/placeholder.com",
        sponsorshipAmount: Number(sponsorForm.sponsorshipAmount),
        status: "APPROVED",
      });
      setSponsorForm({ companyName: "", logo: "", sponsorshipAmount: 500, email: "" });
      fetchEventConfig(selectedEventId);
    } catch (err) {
      console.error("Failed to add sponsor:", err);
    }
  };

  const handleAddExhibitor = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!exhibitorForm.email) {
      alert("Exhibitor User Email is required.");
      return;
    }
    try {
      const usersList = await authService.getUsers();
      const user = (usersList || []).find((u: any) => u.email === exhibitorForm.email);
      
      if (!user) {
        alert("No user found with that email. Please ensure the user is registered.");
        return;
      }

      await eventService.createExhibitor({
        eventId: selectedEventId,
        userId: user.userId,
        companyName: exhibitorForm.companyName,
        logo: exhibitorForm.logo || "https://logo.clearbit.com/placeholder.com",
        boothNumber: exhibitorForm.boothNumber,
        website: exhibitorForm.website,
        status: "APPROVED",
      });
      setExhibitorForm({ companyName: "", logo: "", boothNumber: "", website: "", email: "" });
      fetchEventConfig(selectedEventId);
    } catch (err) {
      console.error("Failed to add exhibitor:", err);
    }
  };

  const activeEvent = events.find((e) => e.eventId === selectedEventId || e.id === selectedEventId);

  return (
    <div className="flex bg-[#111] min-h-screen text-[#e0e0e0]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* HEADER */}
        <header className="h-[60px] bg-[#161616] border-b border-[#222] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-white">Event Customization</h1>
          <div className="flex items-center gap-3">
            <label className="text-xs text-[#666] uppercase tracking-wider font-semibold">Active Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-[#222] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-[#ddd] outline-none"
            >
              {events.map((ev) => (
                <option key={ev.eventId} value={ev.eventId}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="p-8 space-y-8">

          {/* TENANT BRANDING */}
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
            <h2 className="font-display font-bold text-white mb-1">Tenant Branding</h2>
            <p className="text-xs text-[#555] mb-5">Upload your organisation logo and banner — these appear on your public event pages and tenant profile.</p>

            {brandingMsg && (
              <div className={`mb-4 px-4 py-2.5 rounded-xl text-xs font-semibold ${brandingMsg.type === "success" ? "bg-green-900/30 text-green-400 border border-green-700/30" : "bg-red-900/30 text-red-400 border border-red-700/30"}`}>
                {brandingMsg.text}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* LOGO */}
              <div>
                <p className="text-xs text-[#666] uppercase tracking-wider font-semibold mb-3">Logo</p>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#333] hover:border-[#d4c9a8] rounded-xl p-6 cursor-pointer transition-colors group">
                  {tenant?.logo ? (
                    <img src={tenant.logo} alt="Logo" className="h-16 max-w-[160px] object-contain rounded-lg mb-2" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#252525] flex items-center justify-center mb-2">
                      <Upload size={22} className="text-[#444] group-hover:text-[#d4c9a8] transition-colors" />
                    </div>
                  )}
                  <span className="text-xs text-[#555] group-hover:text-[#d4c9a8] transition-colors">
                    {brandingLoading === "logo" ? "Uploading…" : tenant?.logo ? "Click to replace logo" : "Upload logo (PNG, SVG)"}
                  </span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleBrandingUpload("logo", f); }} />
                </label>
              </div>

              {/* BANNER */}
              <div>
                <p className="text-xs text-[#666] uppercase tracking-wider font-semibold mb-3">Banner / Hero Image</p>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#333] hover:border-[#d4c9a8] rounded-xl p-6 cursor-pointer transition-colors group overflow-hidden">
                  {tenant?.bannerUrl ? (
                    <img src={tenant.bannerUrl} alt="Banner" className="w-full h-16 object-cover rounded-lg mb-2" />
                  ) : (
                    <div className="w-full h-16 rounded-xl bg-[#252525] flex items-center justify-center mb-2">
                      <Upload size={22} className="text-[#444] group-hover:text-[#d4c9a8] transition-colors" />
                    </div>
                  )}
                  <span className="text-xs text-[#555] group-hover:text-[#d4c9a8] transition-colors">
                    {brandingLoading === "banner" ? "Uploading…" : tenant?.bannerUrl ? "Click to replace banner" : "Upload banner (16:9, JPG or PNG)"}
                  </span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleBrandingUpload("banner", f); }} />
                </label>
              </div>
            </div>
          </div>

          {/* TRACKS & SPONSORS */}
          <div className="grid grid-cols-2 gap-8">
            {/* TRACKS */}
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
              <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
                <Box size={18} className="text-[#d4c9a8]" /> Agenda Tracks <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeEvent?.title || "selected event"})</span>
              </h2>
              <form onSubmit={handleAddTrack} className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Track Name (e.g., Tech Talk)"
                    value={trackForm.name}
                    onChange={(e) => setTrackForm({ ...trackForm, name: e.target.value })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Capacity"
                    value={trackForm.capacity || ""}
                    onChange={(e) => setTrackForm({ ...trackForm, capacity: Number(e.target.value) })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                    required
                  />
                </div>
                <input
                  placeholder="Track Description"
                  value={trackForm.description}
                  onChange={(e) => setTrackForm({ ...trackForm, description: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Add Track
                </button>
              </form>

              {/* LIST */}
              <div className="space-y-3">
                {tracks.map((t) => (
                  <div key={t.trackId} className="flex justify-between items-center p-3.5 bg-[#161616] border border-[#2a2a2a] rounded-xl">
                    <div>
                      <div className="text-xs font-bold text-white">{t.name}</div>
                      <div className="text-[10px] text-[#555] mt-0.5">{t.description || "No description"}</div>
                    </div>
                    <div className="text-xs text-[#888] font-mono">Max: {t.capacity}</div>
                  </div>
                ))}
                {tracks.length === 0 && (
                  <div className="text-center text-xs text-[#555] py-4">No agenda tracks created yet.</div>
                )}
              </div>
            </div>

            {/* SPONSORS */}
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
              <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
                <Users size={18} className="text-[#d4c9a8]" /> Event Sponsors <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeEvent?.title || "selected event"})</span>
              </h2>
              <form onSubmit={handleAddSponsor} className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Company Name"
                    value={sponsorForm.companyName}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, companyName: e.target.value })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Sponsorship Amount ($)"
                    value={sponsorForm.sponsorshipAmount || ""}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, sponsorshipAmount: Number(e.target.value) })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="email"
                    placeholder="Sponsor User Email"
                    value={sponsorForm.email}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, email: e.target.value })}
                    className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                    required
                  />
                  <input
                    placeholder="Logo URL"
                    value={sponsorForm.logo}
                    onChange={(e) => setSponsorForm({ ...sponsorForm, logo: e.target.value })}
                    className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Add Sponsor
                </button>
              </form>

              {/* LIST */}
              <div className="space-y-3">
                {sponsors.map((s) => (
                  <div key={s.sponsorId} className="flex justify-between items-center p-3.5 bg-[#161616] border border-[#2a2a2a] rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 border border-[#333] flex items-center justify-center text-xs font-bold font-display overflow-hidden">
                        {s.logo ? <img src={s.logo} alt="" className="object-contain w-full h-full" /> : "🏢"}
                      </div>
                      <div className="text-xs font-bold text-white">{s.companyName}</div>
                    </div>
                    <div className="text-xs font-bold text-green-400">{Number(s.sponsorshipAmount).toLocaleString()} FCFA</div>
                  </div>
                ))}
                {sponsors.length === 0 && (
                  <div className="text-center text-xs text-[#555] py-4">No sponsors added yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* EXHIBITORS */}
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
            <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
              <Box size={18} className="text-[#d4c9a8]" /> Vendor Exhibitors
            </h2>
            <form onSubmit={handleAddExhibitor} className="grid grid-cols-5 gap-4 mb-6 items-end">
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#555] mb-1.5 font-bold">User Email</label>
                <input
                  type="email"
                  placeholder="vendor@example.com"
                  value={exhibitorForm.email}
                  onChange={(e) => setExhibitorForm({ ...exhibitorForm, email: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#555] mb-1.5 font-bold">Company</label>
                <input
                  placeholder="Acme Corp"
                  value={exhibitorForm.companyName}
                  onChange={(e) => setExhibitorForm({ ...exhibitorForm, companyName: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#555] mb-1.5 font-bold">Booth Number</label>
                <input
                  placeholder="Booth 404"
                  value={exhibitorForm.boothNumber}
                  onChange={(e) => setExhibitorForm({ ...exhibitorForm, boothNumber: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-wider text-[#555] mb-1.5 font-bold">Website</label>
                <input
                  placeholder="https://acme.com"
                  value={exhibitorForm.website}
                  onChange={(e) => setExhibitorForm({ ...exhibitorForm, website: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                />
              </div>
              <button
                type="submit"
                className="py-2.5 bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus size={14} /> Add Vendor
              </button>
            </form>

            {/* LIST */}
            <div className="grid grid-cols-3 gap-4">
              {exhibitors.map((e) => (
                <div key={e.exhibitorId} className="p-4 bg-[#161616] border border-[#2a2a2a] rounded-xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">{e.companyName}</div>
                    <div className="text-[10px] text-[#555] mt-1 flex items-center gap-1">
                      <Link2 size={12} /> <a href={e.website} target="_blank" className="hover:underline">{e.website || "No site"}</a>
                    </div>
                  </div>
                  <div className="bg-[#222] border border-[#333] rounded-lg px-2.5 py-1 text-[10px] font-mono text-[#d4c9a8]">
                    {e.boothNumber}
                  </div>
                </div>
              ))}
              {exhibitors.length === 0 && (
                <div className="col-span-3 text-center text-xs text-[#555] py-4">No vendors registered yet.</div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
