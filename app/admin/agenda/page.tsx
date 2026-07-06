"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Trash2, Calendar, MapPin, Users, Mic, Save, Pencil, Clock, Star } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";
const saveBtn = "flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-50";

export default function AgendaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [editingSession, setEditingSession] = useState<any>(null);
  
  const [sessionForm, setSessionForm] = useState({
    title: "",
    description: "",
    type: "TALK",
    startTime: "",
    endTime: "",
    capacity: 50,
    trackId: "",
    locationId: "",
  });

  const [tracks, setTracks] = useState<any[]>([]);
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [trackForm, setTrackForm] = useState({
    name: "",
    description: "",
    capacity: 50,
    locationId: "",
  });

  const [locations, setLocations] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const sessionFormRef = useRef<HTMLFormElement>(null);
  const trackFormRef = useRef<HTMLFormElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    const auth = getStoredAuth();
    if (!auth) return;
    try {
      const evs = await eventService.getMyEvents();
      setEvents(evs || []);
      if (evs && evs.length > 0 && !selectedEventId) {
        setSelectedEventId(evs[0].eventId || evs[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAgendaConfig = async (eventId: string) => {
    if (!eventId) return;
    try {
      const [sessionsList, tracksList, locationsList] = await Promise.all([
        eventService.getSessions().catch(() => []),
        eventService.getTracks().catch(() => []),
        eventService.getEventLocations().catch(() => []),
      ]);

      const eventSessions = (sessionsList || []).filter((s: any) => s.eventId === eventId || s.event?.eventId === eventId);
      setSessions(eventSessions);

      const eventTracks = (tracksList || []).filter((t: any) => t.eventId === eventId || t.event?.eventId === eventId);
      setTracks(eventTracks);

      const eventLocations = (locationsList || []).filter((l: any) => l.eventId === eventId || l.event?.eventId === eventId);
      setLocations(eventLocations);
    } catch (err) {
      console.error("Failed to load agenda config:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchAgendaConfig(selectedEventId);
    }
  }, [selectedEventId]);

  const saveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setSaving(true);
    const payload = {
      eventId: selectedEventId,
      trackId: sessionForm.trackId || undefined,
      title: sessionForm.title,
      description: sessionForm.description,
      type: sessionForm.type,
      startTime: sessionForm.startTime ? new Date(sessionForm.startTime).toISOString() : undefined,
      endTime: sessionForm.endTime ? new Date(sessionForm.endTime).toISOString() : undefined,
      maxCapacity: Number(sessionForm.capacity),
      isRecorded: false,
      locationId: sessionForm.locationId || undefined,
    };
    try {
      if (editingSession) {
        await eventService.updateSession(editingSession.sessionId || editingSession.id, payload);
        setEditingSession(null);
        showToast("Session updated!");
      } else {
        await eventService.createSession(payload);
        showToast("Session added!");
      }
      setSessionForm({ title: "", description: "", type: "TALK", startTime: "", endTime: "", capacity: 50, trackId: "", locationId: "" });
      await fetchAgendaConfig(selectedEventId);
    } catch (err: any) {
      showToast(err.message || "Failed to save session.");
    } finally {
      setSaving(false);
    }
  };

  const saveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !trackForm.name.trim()) return;
    setSaving(true);
    const auth = getStoredAuth();
    try {
      const payload = {
        eventId: selectedEventId,
        tenantId: auth?.tenantId,
        name: trackForm.name,
        description: trackForm.description || undefined,
        capacity: trackForm.capacity || undefined,
        locationId: trackForm.locationId || undefined,
      };
      if (editingTrack) {
        await eventService.updateTrack(editingTrack.trackId || editingTrack.id, payload);
        setEditingTrack(null);
        showToast("Track updated!");
      } else {
        await eventService.createTrack(payload);
        showToast("Track created!");
      }
      setTrackForm({ name: "", description: "", capacity: 50, locationId: "" });
      await fetchAgendaConfig(selectedEventId);
    } catch (err: any) {
      showToast(err.message || "Failed to save track.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm("Delete this session?")) return;
    try {
      await eventService.deleteSession(id);
      if (editingSession?.sessionId === id || editingSession?.id === id) {
        setEditingSession(null);
        setSessionForm({ title: "", description: "", type: "TALK", startTime: "", endTime: "", capacity: 50, trackId: "", locationId: "" });
      }
      await fetchAgendaConfig(selectedEventId);
      showToast("Session deleted!");
    } catch {
      showToast("Failed to delete session.");
    }
  };

  const deleteTrack = async (id: string) => {
    if (!confirm("Delete this track?")) return;
    try {
      await eventService.deleteTrack(id);
      if (editingTrack?.trackId === id || editingTrack?.id === id) {
        setEditingTrack(null);
        setTrackForm({ name: "", description: "", capacity: 50, locationId: "" });
      }
      await fetchAgendaConfig(selectedEventId);
      showToast("Track deleted!");
    } catch {
      showToast("Failed to delete track.");
    }
  };

  const activeEvent = events.find((e) => e.eventId === selectedEventId || e.id === selectedEventId);

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* Header */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">Agenda & Sessions</h1>
          
          <div className="flex items-center gap-3">
            <label className="text-xs text-[#666] uppercase tracking-wider font-semibold">Active Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
              }}
              className="bg-white border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-sm text-[#1a1a1a] outline-none cursor-pointer"
            >
              {events.map((ev) => (
                <option key={ev.eventId || ev.id} value={ev.eventId || ev.id}>{ev.title}</option>
              ))}
            </select>
          </div>
        </header>

        <main className="p-8 space-y-8 max-w-[1400px]">
          {/* Main 2-column Layout */}
          <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
            {/* Sessions Column */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[#1a1a1a] flex items-center gap-2">
                  <Mic size={18} className="text-[#FF4747]" /> Sessions List
                </h2>
              </div>

              {sessions.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {sessions.map((s) => (
                    <div 
                      key={s.sessionId || s.id} 
                      className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-start gap-4 transition-all hover:border-[#FF4747]/30"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#F7E998]/40 flex items-center justify-center shrink-0"><Mic size={18} className="text-[#7a6a00]" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-[#1a1a1a] truncate">{s.title}</div>
                        {s.description && <div className="text-xs text-[#888] mt-0.5 line-clamp-1">{s.description}</div>}
                        <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                          <span className="px-2 py-0.5 bg-[#fafafa] border border-[#f0f0f0] rounded font-medium text-[#555]">{s.type}</span>
                          {s.maxCapacity && <span className="text-[#888]">Cap: {s.maxCapacity}</span>}
                          {s.startTime && (
                            <span className="text-[#888] flex items-center gap-0.5">
                              <Clock size={11} /> {new Date(s.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          )}
                          {tracks.find(t => (t.trackId || t.id) === s.trackId) && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded font-medium">
                              {tracks.find(t => (t.trackId || t.id) === s.trackId)?.name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingSession(s);
                            setSessionForm({
                              title: s.title || "",
                              description: s.description || "",
                              type: s.type || "TALK",
                              startTime: s.startTime ? new Date(s.startTime).toISOString().slice(0, 16) : "",
                              endTime: s.endTime ? new Date(s.endTime).toISOString().slice(0, 16) : "",
                              capacity: s.maxCapacity || 50,
                              trackId: s.trackId || "",
                              locationId: s.locationId || "",
                            });
                            sessionFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }} 
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"
                        >
                          <Pencil size={9} /> Edit
                        </button>
                        <button 
                          type="button" 
                          onClick={() => deleteSession(s.sessionId || s.id)} 
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={9} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white border border-dashed border-[#e5e7eb] rounded-3xl text-xs text-[#888] italic">No sessions created yet.</div>
              )}

              {/* Add Session Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-sm text-[#1a1a1a]">{editingSession ? "Edit Session" : "Add New Session"}</h3>
                  {editingSession && (
                    <button type="button" onClick={() => { setEditingSession(null); setSessionForm({ title: "", description: "", type: "TALK", startTime: "", endTime: "", capacity: 50, trackId: "", locationId: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                  )}
                </div>
                <form ref={sessionFormRef} onSubmit={saveSession} className="space-y-4">
                  <div>
                    <label className={label}>Session Title *</label>
                    <input required placeholder="e.g. Panel Discussion" value={sessionForm.title} onChange={e => setSessionForm(f => ({ ...f, title: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={label}>Description</label>
                    <textarea placeholder="Outline of the session..." value={sessionForm.description} onChange={e => setSessionForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inp + " resize-none"} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={label}>Type</label>
                      <select value={sessionForm.type} onChange={e => setSessionForm(f => ({ ...f, type: e.target.value }))} className={inp}>
                        {["TALK", "WORKSHOP", "PANEL", "NETWORKING", "BREAK", "OTHER"].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={label}>Start Time</label>
                      <input type="datetime-local" value={sessionForm.startTime} onChange={e => setSessionForm(f => ({ ...f, startTime: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>End Time</label>
                      <input type="datetime-local" value={sessionForm.endTime} onChange={e => setSessionForm(f => ({ ...f, endTime: e.target.value }))} className={inp} />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={label}>Capacity</label>
                      <input type="number" min={1} value={sessionForm.capacity} onChange={e => setSessionForm(f => ({ ...f, capacity: Number(e.target.value) }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Track</label>
                      <select value={sessionForm.trackId} onChange={e => setSessionForm(f => ({ ...f, trackId: e.target.value }))} className={inp}>
                        <option value="">— No track —</option>
                        {tracks.map(t => <option key={t.trackId || t.id} value={t.trackId || t.id}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={label}>Location</label>
                      <select value={sessionForm.locationId} onChange={e => setSessionForm(f => ({ ...f, locationId: e.target.value }))} className={inp}>
                        <option value="">— All locations —</option>
                        {locations.map(loc => (
                          <option key={loc.locationId} value={loc.locationId}>{loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={saving} className={saveBtn}>
                    <Save size={13} /> {editingSession ? (saving ? "Saving..." : "Save Session") : (saving ? "Adding..." : "Add Session")}
                  </button>
                </form>
              </div>
            </div>

            {/* Tracks Column */}
            <div className="space-y-6">
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 space-y-4">
                <div>
                  <h3 className="font-bold text-sm text-[#1a1a1a] flex items-center gap-2">
                    <Calendar size={16} className="text-[#FF4747]" /> Event Tracks
                  </h3>
                  <p className="text-[10px] text-[#888] mt-0.5">Create and manage topics or parallel streams for your sessions.</p>
                </div>

                {tracks.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {tracks.map(t => (
                      <div key={t.trackId || t.id} className={`p-3 bg-[#fafafa] border rounded-xl flex items-center justify-between gap-3 transition-colors ${editingTrack?.trackId === t.trackId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#f0f0f0]"}`}>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-[#1a1a1a] truncate">{t.name}</div>
                          {t.description && <div className="text-[10px] text-[#888] truncate">{t.description}</div>}
                          {t.capacity && <div className="text-[9px] text-[#aaa] mt-0.5">Capacity: {t.capacity}</div>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button 
                            type="button" 
                            onClick={() => {
                              setEditingTrack(t);
                              setTrackForm({
                                name: t.name || "",
                                description: t.description || "",
                                capacity: t.capacity || 50,
                                locationId: t.locationId || "",
                              });
                            }} 
                            className="p-1 text-[#555] hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer" 
                            title="Edit Track"
                          >
                            <Pencil size={11} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => deleteTrack(t.trackId || t.id)} 
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" 
                            title="Delete Track"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-[#fafafa] border border-dashed border-[#e5e7eb] rounded-xl text-[11px] text-[#aaa] italic">No tracks added yet.</div>
                )}

                <form ref={trackFormRef} onSubmit={saveTrack} className="border-t border-[#f0f0f0] pt-4 space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-xs text-[#1a1a1a]">{editingTrack ? "Edit Track" : "New Track"}</h4>
                    {editingTrack && (
                      <button type="button" onClick={() => { setEditingTrack(null); setTrackForm({ name: "", description: "", capacity: 50, locationId: "" }); }} className="text-[10px] text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                    )}
                  </div>
                  <div>
                    <label className={label}>Track Name *</label>
                    <input required placeholder="e.g. Dev track" value={trackForm.name} onChange={e => setTrackForm(f => ({ ...f, name: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={label}>Description</label>
                    <input placeholder="e.g. Coding workshops" value={trackForm.description} onChange={e => setTrackForm(f => ({ ...f, description: e.target.value }))} className={inp} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={label}>Capacity</label>
                      <input type="number" min={1} value={trackForm.capacity} onChange={e => setTrackForm(f => ({ ...f, capacity: Number(e.target.value) }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>Location</label>
                      <select value={trackForm.locationId} onChange={e => setTrackForm(f => ({ ...f, locationId: e.target.value }))} className={inp}>
                        <option value="">— Select Location —</option>
                        {locations.map(loc => (
                          <option key={loc.locationId} value={loc.locationId}>{loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center"}>
                    <Plus size={13} /> {editingTrack ? (saving ? "Saving..." : "Save Track") : (saving ? "Creating..." : "Add Track")}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] bg-[#1a1a1a] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Star size={12} className="text-[#FF4747]" />
          {toast}
        </div>
      )}
    </div>
  );
}
