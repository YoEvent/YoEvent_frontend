"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Trash2, Calendar, MapPin, Users, Mic, Save, Pencil, Clock, Star, Copy } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { useLanguage } from "@/app/context/LanguageContext";

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";
const saveBtn = "flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-50";

export default function AgendaPage() {
  const { t } = useLanguage();
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
    roomId: "",
  });

  const [tracks, setTracks] = useState<any[]>([]);
  const [editingTrack, setEditingTrack] = useState<any>(null);
  const [trackForm, setTrackForm] = useState({
    name: "",
    description: "",
    locationId: "",
    eventScheduleId: "",
  });

  const [locations, setLocations] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [customSessionTypes, setCustomSessionTypes] = useState<string[]>([]);
  const [showAddCustomSessionType, setShowAddCustomSessionType] = useState(false);
  const [newCustomSessionType, setNewCustomSessionType] = useState("");

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

  const [assignments, setAssignments] = useState<any[]>([]);

  const fetchAgendaConfig = async (eventId: string) => {
    if (!eventId) return;
    try {
      const [sessionsList, tracksList, locationsList, assignmentsList, roomsList, schedulesList] = await Promise.all([
        eventService.getSessions().catch(() => []),
        eventService.getTracks().catch(() => []),
        eventService.getEventLocations().catch(() => []),
        eventService.getAssignmentsByEvent(eventId).catch(() => []),
        eventService.getRoomsByEvent(eventId).catch(() => []),
        eventService.getEventSchedules().catch(() => []),
      ]);

      const eventSessions = (sessionsList || []).filter((s: any) => s.eventId === eventId || s.event?.eventId === eventId);
      setSessions(eventSessions);

      const eventTracks = (tracksList || []).filter((t: any) => t.eventId === eventId || t.event?.eventId === eventId);
      setTracks(eventTracks);

      const eventLocations = (locationsList || []).filter((l: any) => l.eventId === eventId || l.event?.eventId === eventId);
      setLocations(eventLocations);

      setAssignments(assignmentsList || []);
      setRooms(roomsList || []);

      const eventSchedules = (schedulesList || []).filter((sc: any) => sc.eventId === eventId || sc.event?.eventId === eventId);
      setSchedules(eventSchedules);
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
      roomId: sessionForm.roomId || undefined,
    };
    try {
      if (editingSession) {
        await eventService.updateSession(editingSession.sessionId || editingSession.id, payload);
        setEditingSession(null);
        showToast(t("adminAgenda.toasts.sessionUpdated"));
      } else {
        await eventService.createSession(payload);
        showToast(t("adminAgenda.toasts.sessionAdded"));
      }
      setSessionForm({ title: "", description: "", type: "TALK", startTime: "", endTime: "", capacity: 50, trackId: "", roomId: "" });
      await fetchAgendaConfig(selectedEventId);
    } catch (err: any) {
      showToast(err.message || t("adminAgenda.toasts.sessionSaveFailed"));
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
        locationId: trackForm.locationId || undefined,
        eventScheduleId: trackForm.eventScheduleId || undefined,
      };
      if (editingTrack) {
        await eventService.updateTrack(editingTrack.trackId || editingTrack.id, payload);
        setEditingTrack(null);
        showToast(t("adminAgenda.toasts.trackUpdated"));
      } else {
        await eventService.createTrack(payload);
        showToast(t("adminAgenda.toasts.trackCreated"));
      }
      setTrackForm({ name: "", description: "", locationId: "", eventScheduleId: "" });
      await fetchAgendaConfig(selectedEventId);
    } catch (err: any) {
      showToast(err.message || t("adminAgenda.toasts.trackSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = async (id: string) => {
    if (!confirm(t("adminAgenda.confirm.deleteSession"))) return;
    try {
      await eventService.deleteSession(id);
      if (editingSession?.sessionId === id || editingSession?.id === id) {
        setEditingSession(null);
        setSessionForm({ title: "", description: "", type: "TALK", startTime: "", endTime: "", capacity: 50, trackId: "", roomId: "" });
      }
      await fetchAgendaConfig(selectedEventId);
      showToast(t("adminAgenda.toasts.sessionDeleted"));
    } catch {
      showToast(t("adminAgenda.toasts.sessionDeleteFailed"));
    }
  };

  const deleteTrack = async (id: string) => {
    if (!confirm(t("adminAgenda.confirm.deleteTrack"))) return;
    try {
      await eventService.deleteTrack(id);
      if (editingTrack?.trackId === id || editingTrack?.id === id) {
        setEditingTrack(null);
        setTrackForm({ name: "", description: "", locationId: "", eventScheduleId: "" });
      }
      await fetchAgendaConfig(selectedEventId);
      showToast(t("adminAgenda.toasts.trackDeleted"));
    } catch {
      showToast(t("adminAgenda.toasts.trackDeleteFailed"));
    }
  };

  const activeEvent = events.find((e) => e.eventId === selectedEventId || e.id === selectedEventId);

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* Header */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">{t("adminAgenda.header.title")}</h1>

          <div className="flex items-center gap-3">
            <label className="text-xs text-[#666] uppercase tracking-wider font-semibold">{t("adminAgenda.header.activeEvent")}</label>
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
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Tracks Column */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[#1a1a1a] flex items-center gap-2">
                  <Calendar size={18} className="text-[#FF4747]" /> {t("adminAgenda.tracks.heading")}
                </h2>
              </div>
 
              {tracks.length > 0 ? (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {tracks.map((tr) => (
                    <div 
                      key={tr.trackId || tr.id} 
                      className={`bg-white border rounded-2xl p-5 flex items-start gap-4 transition-all hover:border-[#FF4747]/30 ${editingTrack?.trackId === tr.trackId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#FF4747]/10 flex items-center justify-center shrink-0">
                        <Calendar size={18} className="text-[#FF4747]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm text-[#1a1a1a] truncate">{tr.name}</div>
                        {tr.description && <div className="text-xs text-[#888] mt-0.5 line-clamp-1">{tr.description}</div>}
                        
                        <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                          {(() => {
                            const sc = schedules.find(s => (s.scheduleId || s.id) === tr.eventScheduleId);
                            return sc?.startDatetime ? (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-100 rounded font-medium">
                                {new Date(sc.startDatetime).toLocaleDateString()}
                              </span>
                            ) : null;
                          })()}
                          {locations.find(loc => loc.locationId === tr.locationId) && (
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded font-medium">
                              {locations.find(loc => loc.locationId === tr.locationId)?.type === "VIRTUAL" 
                                ? locations.find(loc => loc.locationId === tr.locationId)?.virtualPlatform 
                                : locations.find(loc => loc.locationId === tr.locationId)?.venueName}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button 
                          type="button" 
                          onClick={() => {
                            setEditingTrack(tr);
                            setTrackForm({
                              name: tr.name || "",
                              description: tr.description || "",
                              locationId: tr.locationId || "",
                              eventScheduleId: tr.eventScheduleId || "",
                            });
                            trackFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }} 
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"
                        >
                          <Pencil size={9} /> {t("adminAgenda.sessions.edit") || "Edit"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTrack(tr.trackId || tr.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={9} /> {t("adminAgenda.sessions.delete") || "Delete"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white border border-dashed border-[#e5e7eb] rounded-3xl text-xs text-[#888] italic">{t("adminAgenda.tracks.empty")}</div>
              )}
 
              {/* Add Track Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-sm text-[#1a1a1a]">{editingTrack ? t("adminAgenda.tracks.editTitle") : t("adminAgenda.tracks.newTitle")}</h3>
                  {editingTrack && (
                    <button type="button" onClick={() => { setEditingTrack(null); setTrackForm({ name: "", description: "", locationId: "", eventScheduleId: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">{t("adminAgenda.tracks.cancelEdit")}</button>
                  )}
                </div>
                <form ref={trackFormRef} onSubmit={saveTrack} className="space-y-4">
                  <div>
                    <label className={label}>{t("adminAgenda.tracks.nameLabel")}</label>
                    <input required placeholder={t("adminAgenda.tracks.namePlaceholder")} value={trackForm.name} onChange={e => setTrackForm(f => ({ ...f, name: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={label}>{t("adminAgenda.tracks.descriptionLabel")}</label>
                    <input placeholder={t("adminAgenda.tracks.descriptionPlaceholder")} value={trackForm.description} onChange={e => setTrackForm(f => ({ ...f, description: e.target.value }))} className={inp} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>{t("adminAgenda.tracks.locationLabel")}</label>
                      <select value={trackForm.locationId} onChange={e => setTrackForm(f => ({ ...f, locationId: e.target.value }))} className={inp}>
                        <option value="">{t("adminAgenda.tracks.selectLocationOption")}</option>
                        {locations.map(loc => (
                          <option key={loc.locationId} value={loc.locationId}>{loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={label}>{t("adminAgenda.tracks.dayLabel")}</label>
                      <select value={trackForm.eventScheduleId} onChange={e => setTrackForm(f => ({ ...f, eventScheduleId: e.target.value }))} className={inp}>
                        <option value="">{t("adminAgenda.tracks.noDayOption")}</option>
                        {schedules.map(sc => (
                          <option key={sc.scheduleId || sc.id} value={sc.scheduleId || sc.id}>
                            {sc.startDatetime ? new Date(sc.startDatetime).toLocaleDateString() : (sc.scheduleId || sc.id)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center"}>
                    <Plus size={13} /> {editingTrack ? (saving ? t("adminAgenda.tracks.saving") : t("adminAgenda.tracks.save")) : (saving ? t("adminAgenda.tracks.creating") : t("adminAgenda.tracks.add"))}
                  </button>
                </form>
              </div>
            </div>

            {/* Sessions Column */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[#1a1a1a] flex items-center gap-2">
                  <Mic size={18} className="text-[#FF4747]" /> {t("adminAgenda.sessions.heading")}
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
                        
                        {(() => {
                          const sessionAssigns = assignments.filter(a => a.sessionId === (s.sessionId || s.id));
                          const speakersForSession = sessionAssigns.map(a => a.eventParticipant?.person).filter(Boolean);
                          if (speakersForSession.length === 0) return null;
                          return (
                            <div className="flex items-center gap-1.5 mt-2">
                              <span className="text-[9px] font-semibold text-[#888] uppercase tracking-wider">{t("adminAgenda.sessions.speakers")}</span>
                              <div className="flex -space-x-1.5">
                                {speakersForSession.map((sp: any, idx: number) => (
                                  sp.profilePhoto ? (
                                    <img key={idx} src={sp.profilePhoto} title={`${sp.firstName} ${sp.lastName}`} className="inline-block h-5 w-5 rounded-full ring-2 ring-white object-cover" />
                                  ) : (
                                    <div key={idx} title={`${sp.firstName} ${sp.lastName}`} className="inline-block h-5 w-5 rounded-full bg-stone-100 border border-[#e5e7eb] text-[#333] ring-2 ring-white text-[8px] flex items-center justify-center font-bold">{(sp.firstName || "?").charAt(0)}</div>
                                  )
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                        <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                          <span className="px-2 py-0.5 bg-[#fafafa] border border-[#f0f0f0] rounded font-medium text-[#555]">{s.type}</span>
                          {s.maxCapacity && <span className="text-[#888]">{t("adminAgenda.sessions.capacity", { count: s.maxCapacity })}</span>}
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
                              roomId: s.roomId || "",
                            });
                            sessionFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"
                        >
                          <Pencil size={9} /> {t("adminAgenda.sessions.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSession(null);
                            setSessionForm({
                              title: (s.title || "") + t("adminAgenda.sessions.copySuffix"),
                              description: s.description || "",
                              type: s.type || "TALK",
                              startTime: s.startTime ? new Date(s.startTime).toISOString().slice(0, 16) : "",
                              endTime: s.endTime ? new Date(s.endTime).toISOString().slice(0, 16) : "",
                              capacity: s.maxCapacity || 50,
                              trackId: s.trackId || "",
                              roomId: s.roomId || "",
                            });
                            sessionFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-blue-500 hover:text-blue-500 transition-colors cursor-pointer"
                        >
                          <Copy size={9} /> {t("adminAgenda.sessions.duplicate")}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSession(s.sessionId || s.id)}
                          className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={9} /> {t("adminAgenda.sessions.delete")}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-white border border-dashed border-[#e5e7eb] rounded-3xl text-xs text-[#888] italic">{t("adminAgenda.sessions.empty")}</div>
              )}

              {/* Add Session Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-sm text-[#1a1a1a]">{editingSession ? t("adminAgenda.sessionForm.editTitle") : t("adminAgenda.sessionForm.addTitle")}</h3>
                  {editingSession && (
                    <button type="button" onClick={() => { setEditingSession(null); setSessionForm({ title: "", description: "", type: "TALK", startTime: "", endTime: "", capacity: 50, trackId: "", roomId: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">{t("adminAgenda.sessionForm.cancelEdit")}</button>
                  )}
                </div>
                <form ref={sessionFormRef} onSubmit={saveSession} className="space-y-4">
                  <div>
                    <label className={label}>{t("adminAgenda.sessionForm.titleLabel")}</label>
                    <input required placeholder={t("adminAgenda.sessionForm.titlePlaceholder")} value={sessionForm.title} onChange={e => setSessionForm(f => ({ ...f, title: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={label}>{t("adminAgenda.sessionForm.descriptionLabel")}</label>
                    <textarea placeholder={t("adminAgenda.sessionForm.descriptionPlaceholder")} value={sessionForm.description} onChange={e => setSessionForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inp + " resize-none"} />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className={label}>{t("adminAgenda.sessionForm.typeLabel")}</label>
                      <div className="flex gap-1">
                        <select value={sessionForm.type} onChange={e => setSessionForm(f => ({ ...f, type: e.target.value }))} className="flex-1 bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors">
                          {["TALK", "WORKSHOP", "PANEL", "NETWORKING", "BREAK", "OTHER"].map(typeOption => (
                            <option key={typeOption} value={typeOption}>{t(`adminAgenda.sessions.types.${typeOption}`) || typeOption}</option>
                          ))}
                          {customSessionTypes.map(typeOption => (
                            <option key={typeOption} value={typeOption}>{typeOption}</option>
                          ))}
                        </select>
                        <button type="button" onClick={() => setShowAddCustomSessionType(!showAddCustomSessionType)} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-[#e5e7eb] rounded-xl text-xs font-bold shrink-0 cursor-pointer">+</button>
                      </div>
                      {showAddCustomSessionType && (
                        <div className="mt-2 p-3 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl space-y-2">
                          <input placeholder={t("adminAgenda.sessionForm.customTypePlaceholder") || "e.g. Q&A, Fireside"} value={newCustomSessionType} onChange={e => setNewCustomSessionType(e.target.value)} className="w-full bg-white border rounded-lg px-2 py-1 text-xs outline-none" />
                          <button type="button" onClick={() => {
                            if (newCustomSessionType.trim()) {
                              setCustomSessionTypes(prev => [...prev, newCustomSessionType.trim()]);
                              setSessionForm(f => ({ ...f, type: newCustomSessionType.trim() }));
                              setNewCustomSessionType("");
                              setShowAddCustomSessionType(false);
                            }
                          }} className="w-full py-1 bg-black text-white text-xs font-bold rounded-lg hover:bg-stone-800">{t("adminAgenda.sessionForm.addType") || "Add Type"}</button>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className={label}>{t("adminAgenda.sessionForm.startTimeLabel")}</label>
                      <input type="datetime-local" value={sessionForm.startTime} onChange={e => setSessionForm(f => ({ ...f, startTime: e.target.value }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>{t("adminAgenda.sessionForm.endTimeLabel")}</label>
                      <input type="datetime-local" value={sessionForm.endTime} onChange={e => setSessionForm(f => ({ ...f, endTime: e.target.value }))} className={inp} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>{t("adminAgenda.sessionForm.capacityLabel")}</label>
                      <input type="number" min={1} value={sessionForm.capacity} onChange={e => setSessionForm(f => ({ ...f, capacity: Number(e.target.value) }))} className={inp} />
                    </div>
                    <div>
                      <label className={label}>{t("adminAgenda.sessionForm.trackLabel")}</label>
                      <select value={sessionForm.trackId} onChange={e => setSessionForm(f => ({ ...f, trackId: e.target.value }))} className={inp}>
                        <option value="">{t("adminAgenda.sessionForm.noTrackOption")}</option>
                        {tracks.map(tr => <option key={tr.trackId || tr.id} value={tr.trackId || tr.id}>{tr.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={label}>{t("adminAgenda.sessionForm.roomLabel")}</label>
                    <select value={sessionForm.roomId} onChange={e => setSessionForm(f => ({ ...f, roomId: e.target.value }))} className={inp}>
                      <option value="">{t("adminAgenda.sessionForm.noRoomOption")}</option>
                      {rooms.map(rm => (
                        <option key={rm.roomId || rm.id} value={rm.roomId || rm.id}>{rm.name}</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" disabled={saving} className={saveBtn}>
                    <Save size={13} /> {editingSession ? (saving ? t("adminAgenda.sessionForm.saving") : t("adminAgenda.sessionForm.save")) : (saving ? t("adminAgenda.sessionForm.adding") : t("adminAgenda.sessionForm.add"))}
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
