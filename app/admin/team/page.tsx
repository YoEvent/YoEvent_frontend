"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, ChevronDown, User, X, Users, Mic, Save, Pencil, Trash2, MapPin, Star } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

type SubTab = "team" | "speakers";

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";
const saveBtn = "flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-50";

export default function TeamPage() {
  const auth = getStoredAuth();
  const [tab, setTab] = useState<SubTab>("team");
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  
  // Data lists
  const [team, setTeam] = useState<any[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Filtering
  const [selectedLocationName, setSelectedLocationName] = useState<string>("ALL");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Forms
  const [editingMember, setEditingMember] = useState<any>(null);
  const [teamForm, setTeamForm] = useState({ name: "", position: "", bio: "", location: "", photoUrl: "" });

  const [editingSpeaker, setEditingSpeaker] = useState<any>(null);
  const [speakerForm, setSpeakerForm] = useState({ name: "", bio: "", company: "", title: "", sessionId: "", photoUrl: "" });

  const teamFormRef = useRef<HTMLFormElement>(null);
  const speakerFormRef = useRef<HTMLFormElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const load = async () => {
      try {
        const evs = await eventService.getMyEvents();
        setEvents(evs || []);
        if (evs?.length) setSelectedEventId(evs[0].eventId);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    loadData(selectedEventId);
  }, [selectedEventId]);

  const loadData = async (eventId: string) => {
    setLoading(true);
    const tenantId = auth?.tenantId;
    try {
      const [nets, spkrs, sessList, locsList] = await Promise.all([
        eventService.getNetworkings().catch(() => []),
        eventService.getSessionSpeakers().catch(() => []),
        eventService.getSessions().catch(() => []),
        eventService.getEventLocations().catch(() => []),
      ]);

      const byEvent = (item: any) =>
        (item.eventId === eventId || item.event?.eventId === eventId) &&
        (!tenantId || !item.tenantId || item.tenantId === tenantId);

      setTeam((nets || []).filter((n: any) => byEvent(n) && n.role === "TEAM_MEMBER"));
      setSpeakers((spkrs || []).filter(byEvent));
      setSessions((sessList || []).filter(byEvent));
      setLocations((locsList || []).filter(byEvent));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name.trim() || !selectedEventId) return;
    setSaving(true);
    const tenantId = auth?.tenantId;
    
    // Position and Location serialized inside the skills field (Position | Location)
    const serializedSkills = `${teamForm.position.trim()}${teamForm.location.trim() ? ` | ${teamForm.location.trim()}` : ""}`;

    const payload = {
      eventId: selectedEventId,
      tenantId: tenantId,
      role: "TEAM_MEMBER",
      name: teamForm.name,
      skills: serializedSkills,
      availability: teamForm.bio,
      photoUrl: teamForm.photoUrl || undefined,
      status: "ACTIVE",
    };

    try {
      if (editingMember) {
        await eventService.updateNetworking(editingMember.connectionId || editingMember.id, payload);
        setEditingMember(null);
        showToast("Team member updated!");
      } else {
        await eventService.createNetworking(payload);
        showToast("Team member added!");
      }
      setTeamForm({ name: "", position: "", bio: "", location: "", photoUrl: "" });
      await loadData(selectedEventId);
    } catch {
      showToast("Failed to save team member.");
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (id: string) => {
    if (!confirm("Remove this team member?")) return;
    try {
      await eventService.deleteNetworking(id);
      await loadData(selectedEventId);
      showToast("Team member removed.");
    } catch {
      showToast("Failed to remove.");
    }
  };

  const saveSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!speakerForm.name.trim() || !selectedEventId) return;
    setSaving(true);
    const tenantId = auth?.tenantId;

    const payload = {
      eventId: selectedEventId,
      tenantId: tenantId,
      sessionId: speakerForm.sessionId || undefined,
      name: speakerForm.name,
      bio: speakerForm.bio,
      company: speakerForm.company,
      title: speakerForm.title,
      photoUrl: speakerForm.photoUrl || undefined,
    };

    try {
      if (editingSpeaker) {
        await eventService.updateSessionSpeaker(editingSpeaker.speakerId || editingSpeaker.id, payload);
        setEditingSpeaker(null);
        showToast("Speaker updated!");
      } else {
        await eventService.createSessionSpeaker(payload);
        showToast("Speaker added!");
      }
      setSpeakerForm({ name: "", bio: "", company: "", title: "", sessionId: "", photoUrl: "" });
      await loadData(selectedEventId);
    } catch {
      showToast("Failed to save speaker.");
    } finally {
      setSaving(false);
    }
  };

  const removeSpeaker = async (id: string) => {
    if (!confirm("Remove this speaker?")) return;
    try {
      await eventService.deleteSessionSpeaker(id);
      await loadData(selectedEventId);
      showToast("Speaker removed.");
    } catch {
      showToast("Failed to remove.");
    }
  };

  const selectedEvent = events.find(e => e.eventId === selectedEventId);

  // Helper to get location name of a session
  const getSessionLocationName = (sessId: string) => {
    const s = sessions.find(x => (x.sessionId || x.id) === sessId);
    if (!s || !s.locationId) return "";
    const loc = locations.find(l => l.locationId === s.locationId);
    if (!loc) return "";
    return loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName;
  };

  // Helper to parse team member details (position, location)
  const parseTeamMember = (m: any) => {
    const parts = (m.skills || "").split(" | ");
    const position = parts[0] || "";
    const location = parts[1] || "";
    return { position, location };
  };

  // Filtered lists by Location Filter
  const filteredTeam = team.filter((m) => {
    if (selectedLocationName === "ALL") return true;
    const { location } = parseTeamMember(m);
    return (location || "").toLowerCase().includes(selectedLocationName.toLowerCase());
  });

  const filteredSpeakers = speakers.filter((sp) => {
    if (selectedLocationName === "ALL") return true;
    if (!sp.sessionId) return false;
    const locName = getSessionLocationName(sp.sessionId);
    return locName.toLowerCase().includes(selectedLocationName.toLowerCase());
  });

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#1a1a1a]">
      <Sidebar />

      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-[#1a1a1a] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Star size={12} className="text-[#FF4747]" />
          {toast}
        </div>
      )}

      <div className="ml-[220px] flex-1 flex flex-col">
        {/* Header */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#FF4747]">Team & Speakers</h1>
          
          <div className="flex items-center gap-4">
            {/* Event Selector */}
            {events.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#666] font-semibold uppercase tracking-wider">Event</label>
                <div className="relative">
                  <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
                    className="appearance-none bg-white border border-[#e5e7eb] text-[#1a1a1a] text-sm rounded-xl px-4 py-1.5 pr-8 outline-none cursor-pointer focus:border-[#FF4747]">
                    {events.map(ev => <option key={ev.eventId || ev.id} value={ev.eventId || ev.id}>{ev.title}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] pointer-events-none" />
                </div>
              </div>
            )}

            {/* Location Sorter/Filter */}
            {locations.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#666] font-semibold uppercase tracking-wider flex items-center gap-1"><MapPin size={12} className="text-[#FF4747]" /> Location</label>
                <div className="relative">
                  <select value={selectedLocationName} onChange={e => setSelectedLocationName(e.target.value)}
                    className="appearance-none bg-white border border-[#e5e7eb] text-[#1a1a1a] text-sm rounded-xl px-4 py-1.5 pr-8 outline-none cursor-pointer focus:border-[#FF4747]">
                    <option value="ALL">All Locations</option>
                    {locations.map(loc => {
                      const name = loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName;
                      return <option key={loc.locationId} value={name}>{name}</option>;
                    })}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] pointer-events-none" />
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="p-8 max-w-[1400px]">
          {/* Navigation Tabs */}
          <div className="flex gap-1 bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl p-1 w-fit mb-6">
            <button onClick={() => setTab("team")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tab === "team" ? "bg-[#FF4747] text-white" : "text-[#666] hover:text-[#1a1a1a]"}`}>
              <Users size={15} />Team Members
            </button>
            <button onClick={() => setTab("speakers")}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tab === "speakers" ? "bg-[#FF4747] text-white" : "text-[#666] hover:text-[#1a1a1a]"}`}>
              <Mic size={15} />Speakers
            </button>
          </div>

          {!selectedEventId ? (
            <div className="text-center py-20 text-[#aaa]">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>No events found. Create an event first.</p>
            </div>
          ) : tab === "team" ? (
            // TEAM TAB
            <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
              {/* Team list */}
              <div>
                <h2 className="font-display font-bold text-[#1a1a1a] mb-5">
                  Team Members for <span className="text-[#FF4747]">{selectedEvent?.title}</span>
                  <span className="ml-2 text-sm font-normal text-[#aaa]">({filteredTeam.length} filtered)</span>
                </h2>

                {loading ? (
                  <div className="grid md:grid-cols-2 gap-5">
                    {[1, 2].map(i => <div key={i} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 animate-pulse h-40" />)}
                  </div>
                ) : filteredTeam.length === 0 ? (
                  <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-14 text-center text-[#aaa]">
                    <User size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No team members matching filter.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-5">
                    {filteredTeam.map((m) => {
                      const id = m.connectionId || m.id;
                      const { position, location } = parseTeamMember(m);
                      return (
                        <div key={id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 relative group hover:border-[#FF4747]/30 hover:shadow-md transition-all">
                          <div className="absolute top-3 right-3 flex gap-1">
                            <button onClick={() => {
                              setEditingMember(m);
                              setTeamForm({
                                name: m.name || "",
                                position: position,
                                location: location,
                                bio: m.availability || "",
                                photoUrl: m.photoUrl || "",
                              });
                              teamFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }} className="w-7 h-7 bg-[#fafafa] border border-[#f0f0f0] rounded-full flex items-center justify-center text-[#aaa] hover:bg-stone-100 hover:text-[#1a1a1a] transition-all cursor-pointer">
                              <Pencil size={11} />
                            </button>
                            <button onClick={() => removeMember(id)} className="w-7 h-7 bg-[#fafafa] border border-[#f0f0f0] rounded-full flex items-center justify-center text-[#aaa] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all cursor-pointer">
                              <X size={12} />
                            </button>
                          </div>
                          <div className="flex flex-col items-center text-center">
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt={m.name} className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-[#f0f0f0]" />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-[#F7E998] flex items-center justify-center text-[#1a1a1a] font-black text-xl mb-3">{(m.name || "?").charAt(0)}</div>
                            )}
                            <div className="font-bold text-sm text-[#1a1a1a]">{m.name}</div>
                            {position && <div className="text-xs text-[#FF4747] font-semibold mt-0.5">{position}</div>}
                            {location && (
                              <div className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5 font-medium mt-1.5 flex items-center gap-0.5">
                                <MapPin size={10} /> {location}
                              </div>
                            )}
                            {m.availability && <div className="text-xs text-[#888] mt-2.5 leading-relaxed line-clamp-2">{m.availability}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Team Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7 h-fit">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display font-bold text-[#1a1a1a]">{editingMember ? "Edit Team Member" : "Add Team Member"}</h3>
                  {editingMember && (
                    <button type="button" onClick={() => { setEditingMember(null); setTeamForm({ name: "", position: "", bio: "", location: "", photoUrl: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                  )}
                </div>
                <form ref={teamFormRef} onSubmit={saveTeamMember} className="space-y-4">
                  <div><label className={label}>Full Name *</label><input required placeholder="Jane Doe" value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={label}>Position / Role</label><input placeholder="e.g. Lead Planner" value={teamForm.position} onChange={e => setTeamForm(f => ({ ...f, position: e.target.value }))} className={inp} /></div>
                    <div>
                      <label className={label}>Location / Room</label>
                      <select value={teamForm.location} onChange={e => setTeamForm(f => ({ ...f, location: e.target.value }))} className={inp}>
                        <option value="">— Select Location —</option>
                        {locations.map(loc => {
                          const name = loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName;
                          return <option key={loc.locationId} value={name}>{name}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  <div><label className={label}>Bio / Credentials</label><textarea placeholder="Brief bio..." value={teamForm.bio} onChange={e => setTeamForm(f => ({ ...f, bio: e.target.value }))} rows={2} className={inp + " resize-none"} /></div>

                  <div>
                    <label className={label}>Profile Photo</label>
                    <label className="flex items-center gap-3 border-2 border-dashed border-[#e5e7eb] rounded-2xl p-4 cursor-pointer hover:border-[#FF4747] transition-colors group">
                      {teamForm.photoUrl ? (
                        <img src={teamForm.photoUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#fafafa] border border-[#e5e7eb] flex items-center justify-center shrink-0">
                          <User size={18} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                        </div>
                      )}
                      <span className="text-sm text-[#888] group-hover:text-[#FF4747] transition-colors">{teamForm.photoUrl ? "Click to change" : "Upload photo"}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          setSaving(true);
                          const res = await eventService.uploadImage(f);
                          setTeamForm(f => ({ ...f, photoUrl: res.url }));
                          showToast("Photo uploaded successfully!");
                        } catch (err: any) {
                          showToast("Failed to upload photo: " + (err.message || err));
                        } finally {
                          setSaving(false);
                        }
                      }} />
                    </label>
                    {teamForm.photoUrl && <button type="button" onClick={() => setTeamForm(f => ({ ...f, photoUrl: "" }))} className="text-xs text-red-500 mt-1 hover:underline cursor-pointer">Remove photo</button>}
                  </div>

                  <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center"}>
                    <Plus size={15} />{saving ? "Saving..." : (editingMember ? "Save Changes" : "Add Team Member")}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            // SPEAKERS TAB
            <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
              {/* Speakers list */}
              <div>
                <h2 className="font-display font-bold text-[#1a1a1a] mb-5">
                  Speakers for <span className="text-[#FF4747]">{selectedEvent?.title}</span>
                  <span className="ml-2 text-sm font-normal text-[#aaa]">({filteredSpeakers.length} filtered)</span>
                </h2>

                {loading ? (
                  <div className="grid md:grid-cols-2 gap-5">
                    {[1, 2].map(i => <div key={i} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 animate-pulse h-45" />)}
                  </div>
                ) : filteredSpeakers.length === 0 ? (
                  <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-14 text-center text-[#aaa]">
                    <Mic size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No speakers matching location filter.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-5">
                    {filteredSpeakers.map((sp) => {
                      const id = sp.speakerId || sp.id;
                      const locName = sp.sessionId ? getSessionLocationName(sp.sessionId) : "";
                      return (
                        <div key={id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 relative group hover:border-[#FF4747]/30 hover:shadow-md transition-all">
                          <div className="absolute top-3 right-3 flex gap-1">
                            <button onClick={() => {
                              setEditingSpeaker(sp);
                              setSpeakerForm({
                                name: sp.name || "",
                                bio: sp.bio || "",
                                company: sp.company || "",
                                title: sp.title || "",
                                sessionId: sp.sessionId || "",
                                photoUrl: sp.photoUrl || sp.imageUrl || "",
                              });
                              speakerFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }} className="w-7 h-7 bg-[#fafafa] border border-[#f0f0f0] rounded-full flex items-center justify-center text-[#aaa] hover:bg-stone-100 hover:text-[#1a1a1a] transition-all cursor-pointer">
                              <Pencil size={11} />
                            </button>
                            <button onClick={() => removeSpeaker(id)} className="w-7 h-7 bg-[#fafafa] border border-[#f0f0f0] rounded-full flex items-center justify-center text-[#aaa] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all cursor-pointer">
                              <X size={12} />
                            </button>
                          </div>
                          <div className="flex flex-col items-center text-center">
                            {sp.photoUrl || sp.imageUrl ? (
                              <img src={sp.photoUrl || sp.imageUrl} alt={sp.name} className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-[#f0f0f0]" />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-[#fcd34d]/60 flex items-center justify-center text-[#1a1a1a] font-black text-xl mb-3">{(sp.name || "?").charAt(0)}</div>
                            )}
                            <div className="font-bold text-sm text-[#1a1a1a]">{sp.name}</div>
                            {(sp.title || sp.company) && (
                              <div className="text-xs text-[#FF4747] font-semibold mt-0.5">
                                {sp.title} {sp.company ? ` at ${sp.company}` : ""}
                              </div>
                            )}
                            {locName && (
                              <div className="text-[10px] text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5 font-medium mt-1.5 flex items-center gap-0.5">
                                <MapPin size={10} /> {locName}
                              </div>
                            )}
                            {sp.bio && <div className="text-xs text-[#888] mt-2.5 leading-relaxed line-clamp-2">{sp.bio}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Speaker Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7 h-fit">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-display font-bold text-[#1a1a1a]">{editingSpeaker ? "Edit Speaker" : "Add Speaker"}</h3>
                  {editingSpeaker && (
                    <button type="button" onClick={() => { setEditingSpeaker(null); setSpeakerForm({ name: "", bio: "", company: "", title: "", sessionId: "", photoUrl: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                  )}
                </div>
                <form ref={speakerFormRef} onSubmit={saveSpeaker} className="space-y-4">
                  <div><label className={label}>Full Name *</label><input required placeholder="Dr. Alice Smith" value={speakerForm.name} onChange={e => setSpeakerForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={label}>Speaker Job Title</label><input placeholder="e.g. Chief Scientist" value={speakerForm.title} onChange={e => setSpeakerForm(f => ({ ...f, title: e.target.value }))} className={inp} /></div>
                    <div><label className={label}>Company / Organization</label><input placeholder="e.g. Google" value={speakerForm.company} onChange={e => setSpeakerForm(f => ({ ...f, company: e.target.value }))} className={inp} /></div>
                  </div>
                  <div>
                    <label className={label}>Assigned Session (Resolves Location)</label>
                    <select value={speakerForm.sessionId} onChange={e => setSpeakerForm(f => ({ ...f, sessionId: e.target.value }))} className={inp}>
                      <option value="">— Select Session —</option>
                      {sessions.map(s => {
                        const locName = getSessionLocationName(s.sessionId || s.id);
                        return <option key={s.sessionId || s.id} value={s.sessionId || s.id}>{s.title} {locName ? `(${locName})` : ""}</option>;
                      })}
                    </select>
                  </div>
                  <div><label className={label}>Biography</label><textarea placeholder="Brief speaker bio..." value={speakerForm.bio} onChange={e => setSpeakerForm(f => ({ ...f, bio: e.target.value }))} rows={2} className={inp + " resize-none"} /></div>

                  <div>
                    <label className={label}>Profile Photo</label>
                    <label className="flex items-center gap-3 border-2 border-dashed border-[#e5e7eb] rounded-2xl p-4 cursor-pointer hover:border-[#FF4747] transition-colors group">
                      {speakerForm.photoUrl ? (
                        <img src={speakerForm.photoUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#fafafa] border border-[#e5e7eb] flex items-center justify-center shrink-0">
                          <User size={18} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                        </div>
                      )}
                      <span className="text-sm text-[#888] group-hover:text-[#FF4747] transition-colors">{speakerForm.photoUrl ? "Click to change" : "Upload photo"}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={async e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        try {
                          setSaving(true);
                          const res = await eventService.uploadImage(f);
                          setSpeakerForm(f => ({ ...f, photoUrl: res.url }));
                          showToast("Photo uploaded successfully!");
                        } catch (err: any) {
                          showToast("Failed to upload photo: " + (err.message || err));
                        } finally {
                          setSaving(false);
                        }
                      }} />
                    </label>
                    {speakerForm.photoUrl && <button type="button" onClick={() => setSpeakerForm(f => ({ ...f, photoUrl: "" }))} className="text-xs text-red-500 mt-1 hover:underline cursor-pointer">Remove photo</button>}
                  </div>

                  <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center"}>
                    <Plus size={15} />{saving ? "Saving..." : (editingSpeaker ? "Save Changes" : "Add Speaker")}
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
