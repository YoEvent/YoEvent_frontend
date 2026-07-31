"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Trash2, Calendar, MapPin, Users, Mic, Save, Pencil, Clock, Star, Copy, ChevronRight } from "lucide-react";
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

  
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [showTrackLocDropdown, setShowTrackLocDropdown] = useState(false);
  const [showTrackDayDropdown, setShowTrackDayDropdown] = useState(false);
  const [showSessionTypeDropdown, setShowSessionTypeDropdown] = useState(false);
  const [showSessionTrackDropdown, setShowSessionTrackDropdown] = useState(false);
  const [showSessionRoomDropdown, setShowSessionRoomDropdown] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"track" | "session">("track");
  const [selectedTrackLocId, setSelectedTrackLocId] = useState<string>("ALL");
  const [selectedTrackDayId, setSelectedTrackDayId] = useState<string>("ALL");

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
      setIsDrawerOpen(false);
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
      setIsDrawerOpen(false);
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

  const filteredTracks = tracks.filter(t => {
    const locMatch = selectedTrackLocId === "ALL" || t.locationId === selectedTrackLocId;
    const dayMatch = selectedTrackDayId === "ALL" || t.eventScheduleId === selectedTrackDayId;
    return locMatch && dayMatch;
  });

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col relative min-h-screen">
        {/* Header */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">{t("adminAgenda.header.title")}</h1>
        </header>

        <main className="p-8 space-y-8 max-w-[1400px] mx-auto w-full">
          {/* Unified Filter Bar */}
          <div className="flex items-center justify-between bg-white border border-[#e5e7eb] p-3 rounded-2xl">
            <div className="flex items-center gap-3">
              {/* Event Filter */}
              <div className="relative">
                <button type="button" onClick={() => setShowEventDropdown(v => !v)} className="bg-[#fafafa] border border-[#e5e7eb] rounded-xl px-4 py-2 text-xs font-semibold text-[#1a1a1a] flex items-center justify-between min-w-[200px] cursor-pointer hover:border-[#FF4747] transition-colors">
                  <span className="truncate">{events.find(ev => (ev.eventId || ev.id) === selectedEventId)?.title || "Select event"}</span>
                  <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showEventDropdown ? "rotate-90" : ""}`} />
                </button>
                {showEventDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEventDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                      {events.map((ev) => {
                        const id = ev.eventId || ev.id;
                        const isSelected = id === selectedEventId;
                        return (
                          <button key={id} type="button" onClick={() => { setSelectedEventId(id); setShowEventDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                            {ev.title}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <div className="w-px h-6 bg-[#e5e7eb] mx-1"></div>

              {/* Track Location Filter */}
              <div className="relative">
                <button type="button" onClick={() => setShowTrackLocDropdown(v => !v)} className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-2 text-xs font-semibold text-[#1a1a1a] flex items-center gap-2 cursor-pointer hover:border-[#FF4747] transition-colors">
                  <MapPin size={12} className="text-[#888]" />
                  <span>{selectedTrackLocId === "ALL" ? t("adminAgenda.filters.allLocations") || "All Locations" : locations.find(l => l.locationId === selectedTrackLocId)?.venueName || "All Locations"}</span>
                  <ChevronRight size={10} className={`text-[#aaa] transition-transform ${showTrackLocDropdown ? "rotate-90" : ""}`} />
                </button>
                {showTrackLocDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowTrackLocDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                      <button type="button" onClick={() => { setSelectedTrackLocId("ALL"); setShowTrackLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${selectedTrackLocId === "ALL" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>
                        {t("adminAgenda.filters.allLocations") || "All Locations"}
                      </button>
                      {locations.map(loc => {
                        const isSelected = loc.locationId === selectedTrackLocId;
                        return (
                          <button key={loc.locationId} type="button" onClick={() => { setSelectedTrackLocId(loc.locationId); setShowTrackLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                            {loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Track Day Filter */}
              <div className="relative">
                <button type="button" onClick={() => setShowTrackDayDropdown(v => !v)} className="bg-white border border-[#e5e7eb] rounded-xl px-4 py-2 text-xs font-semibold text-[#1a1a1a] flex items-center gap-2 cursor-pointer hover:border-[#FF4747] transition-colors">
                  <Calendar size={12} className="text-[#888]" />
                  <span>{selectedTrackDayId === "ALL" ? t("adminAgenda.filters.allDays") || "All Days" : (() => { const sc = schedules.find(s => (s.scheduleId || s.id) === selectedTrackDayId); return sc && sc.startDatetime ? new Date(sc.startDatetime).toLocaleDateString() : selectedTrackDayId; })()}</span>
                  <ChevronRight size={10} className={`text-[#aaa] transition-transform ${showTrackDayDropdown ? "rotate-90" : ""}`} />
                </button>
                {showTrackDayDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowTrackDayDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                      <button type="button" onClick={() => { setSelectedTrackDayId("ALL"); setShowTrackDayDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${selectedTrackDayId === "ALL" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>
                        {t("adminAgenda.filters.allDays") || "All Days"}
                      </button>
                      {schedules.map(sc => {
                        const id = sc.scheduleId || sc.id;
                        const isSelected = id === selectedTrackDayId;
                        return (
                          <button key={id} type="button" onClick={() => { setSelectedTrackDayId(id); setShowTrackDayDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                            {sc.startDatetime ? new Date(sc.startDatetime).toLocaleDateString() : id}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => { setDrawerMode('track'); setIsDrawerOpen(true); setEditingTrack(null); setTrackForm({ name: "", description: "", locationId: "", eventScheduleId: "" }); }} className={saveBtn}>
                <Plus size={13} /> {t("adminAgenda.tracks.add") || "Add Track"}
              </button>
              <button onClick={() => { setDrawerMode('session'); setIsDrawerOpen(true); setEditingSession(null); setSessionForm({ title: "", description: "", type: "TALK", startTime: "", endTime: "", capacity: 50, trackId: "", roomId: "" }); }} className={saveBtn}>
                <Plus size={13} /> {t("adminAgenda.sessions.add") || "Add Session"}
              </button>
            </div>
          </div>

          {/* Main Layout: Tracks and their Sessions */}
          <div className="space-y-8">
            {filteredTracks.map(track => {
              const trackSessions = sessions.filter(s => s.trackId === (track.trackId || track.id));
              return (
                <div key={track.trackId || track.id} className="bg-white border border-[#e5e7eb] rounded-3xl overflow-hidden shadow-sm">
                  <div className="bg-[#fafafa] p-5 border-b border-[#e5e7eb] flex items-center justify-between cursor-pointer hover:bg-[#f0f0f0] transition-colors" onClick={() => {
                    setDrawerMode('track');
                    setEditingTrack(track);
                    setTrackForm({ name: track.name || "", description: track.description || "", locationId: track.locationId || "", eventScheduleId: track.eventScheduleId || "" });
                    setIsDrawerOpen(true);
                  }}>
                    <div>
                      <h3 className="font-bold text-lg text-[#1a1a1a] flex items-center gap-2">
                        <Calendar size={18} className="text-[#FF4747]" /> {track.name}
                      </h3>
                      {track.description && <p className="text-sm text-[#666] mt-1">{track.description}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                      {track.locationId && <span className="text-xs bg-white border border-[#e5e7eb] px-2.5 py-1.5 rounded-lg text-[#555] flex items-center gap-1 font-semibold"><MapPin size={12} className="text-[#FF4747]"/> {locations.find(l => l.locationId === track.locationId)?.venueName || track.locationId}</span>}
                      {track.eventScheduleId && <span className="text-xs bg-white border border-[#e5e7eb] px-2.5 py-1.5 rounded-lg text-[#555] flex items-center gap-1 font-semibold"><Calendar size={12} className="text-[#FF4747]"/> {(() => { const sc = schedules.find(s => (s.scheduleId || s.id) === track.eventScheduleId); return sc && sc.startDatetime ? new Date(sc.startDatetime).toLocaleDateString() : track.eventScheduleId; })()}</span>}
                      <button type="button" onClick={(e) => { e.stopPropagation(); deleteTrack(track.trackId || track.id); }} className="text-[#aaa] hover:text-[#FF4747] transition-colors ml-2"><Trash2 size={16}/></button>
                    </div>
                  </div>
                  <div className="p-5 bg-white">
                    {trackSessions.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {trackSessions.map(s => (
                          <div key={s.sessionId || s.id} onClick={() => {
                            setDrawerMode('session');
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
                            setIsDrawerOpen(true);
                          }} className="border border-[#e5e7eb] rounded-2xl p-4 flex flex-col hover:border-[#FF4747] cursor-pointer transition-colors bg-white hover:shadow-md relative group">
                            
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                               <button type="button" onClick={(e) => { e.stopPropagation(); deleteSession(s.sessionId || s.id); }} className="text-[#ccc] hover:text-[#FF4747] transition-colors"><Trash2 size={14}/></button>
                            </div>

                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-xl bg-[#F7E998]/40 flex items-center justify-center shrink-0"><Mic size={14} className="text-[#7a6a00]" /></div>
                              <div className="flex-1 pr-6">
                                <h4 className="font-bold text-sm text-[#1a1a1a]">{s.title}</h4>
                                {s.description && <p className="text-xs text-[#888] mt-1 line-clamp-2">{s.description}</p>}
                              </div>
                            </div>
                            <div className="mt-4 pt-3 border-t border-[#f0f0f0] flex items-center gap-2 flex-wrap text-[10px]">
                              <span className="px-1.5 py-0.5 bg-[#fafafa] border border-[#f0f0f0] rounded text-[#555] font-semibold">{s.type}</span>
                              {s.startTime && <span className="text-[#888] font-semibold flex items-center gap-1"><Clock size={10} /> {new Date(s.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                              {s.roomId && <span className="text-[#888] font-semibold flex items-center gap-1"><MapPin size={10} /> {rooms.find(rm => (rm.roomId || rm.id) === s.roomId)?.name || s.roomId}</span>}
                              {s.maxCapacity && <span className="text-[#888] font-semibold flex items-center gap-1"><Users size={10} /> {s.maxCapacity} cap</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-xs text-[#aaa] font-medium italic border border-dashed border-[#e5e7eb] rounded-2xl">No sessions scheduled in this track yet.</div>
                    )}
                  </div>
                </div>
              )
            })}
            
            {/* General Sessions (No track assigned) */}
            {sessions.filter(s => !s.trackId).length > 0 && (
              <div className="bg-white border border-[#e5e7eb] rounded-3xl overflow-hidden mt-8 shadow-sm">
                <div className="bg-[#fafafa] p-5 border-b border-[#e5e7eb]">
                  <h3 className="font-bold text-lg text-[#1a1a1a] flex items-center gap-2">
                    <Mic size={18} className="text-[#888]" /> General Sessions <span className="text-xs font-normal text-[#888]">(Unassigned to a Track)</span>
                  </h3>
                </div>
                <div className="p-5 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sessions.filter(s => !s.trackId).map(s => (
                       <div key={s.sessionId || s.id} onClick={() => {
                        setDrawerMode('session');
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
                        setIsDrawerOpen(true);
                      }} className="border border-[#e5e7eb] rounded-2xl p-4 flex flex-col hover:border-[#FF4747] cursor-pointer transition-colors bg-white hover:shadow-md relative group">
                        
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={(e) => { e.stopPropagation(); deleteSession(s.sessionId || s.id); }} className="text-[#ccc] hover:text-[#FF4747] transition-colors"><Trash2 size={14}/></button>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#F7E998]/40 flex items-center justify-center shrink-0"><Mic size={14} className="text-[#7a6a00]" /></div>
                          <div className="flex-1 pr-6">
                            <h4 className="font-bold text-sm text-[#1a1a1a]">{s.title}</h4>
                            {s.description && <p className="text-xs text-[#888] mt-1 line-clamp-2">{s.description}</p>}
                          </div>
                        </div>
                        <div className="mt-4 pt-3 border-t border-[#f0f0f0] flex items-center gap-2 flex-wrap text-[10px]">
                          <span className="px-1.5 py-0.5 bg-[#fafafa] border border-[#f0f0f0] rounded text-[#555] font-semibold">{s.type}</span>
                          {s.startTime && <span className="text-[#888] font-semibold flex items-center gap-1"><Clock size={10} /> {new Date(s.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                          {s.roomId && <span className="text-[#888] font-semibold flex items-center gap-1"><MapPin size={10} /> {rooms.find(rm => (rm.roomId || rm.id) === s.roomId)?.name || s.roomId}</span>}
                          {s.maxCapacity && <span className="text-[#888] font-semibold flex items-center gap-1"><Users size={10} /> {s.maxCapacity} cap</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {filteredTracks.length === 0 && sessions.length === 0 && (
               <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-16 text-center mt-8">
                  <Calendar size={36} className="mx-auto text-[#ccc] mb-3" />
                  <p className="font-bold text-sm text-[#1a1a1a]">No tracks or sessions scheduled.</p>
                  <p className="text-xs text-[#888] mt-1">Add tracks and group your sessions to start building the agenda!</p>
               </div>
            )}
          </div>
        </main>
      </div>

      {/* Slide-out Drawer */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-[#1a1a1a]/40 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
        <div className={`absolute top-0 right-0 bottom-0 w-full max-w-[420px] bg-white shadow-2xl transition-transform duration-300 transform ${isDrawerOpen ? "translate-x-0" : "translate-x-full"} flex flex-col`}>
          <div className="flex items-center justify-between p-6 border-b border-[#e5e7eb]">
            <h2 className="font-display font-bold text-lg text-[#1a1a1a]">
              {drawerMode === 'track' 
                ? (editingTrack ? t("adminAgenda.tracks.edit") || "Edit Track" : t("adminAgenda.tracks.add") || "Add Track")
                : (editingSession ? t("adminAgenda.sessions.edit") || "Edit Session" : t("adminAgenda.sessions.add") || "Add Session")
              }
            </h2>
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="w-8 h-8 rounded-full bg-[#f0f0f0] hover:bg-[#e5e7eb] flex items-center justify-center text-[#555] transition-colors cursor-pointer">
              ✕
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {drawerMode === 'track' ? (
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
            ) : (
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
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 right-5 z-[100] bg-[#1a1a1a] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Star size={12} className="text-[#FF4747]" />
          {toast}
        </div>
      )}
    </div>
  );
};
