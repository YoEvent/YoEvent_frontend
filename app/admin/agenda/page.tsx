"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Clock, Users, Mic } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { authService } from "@/app/utils/services/authService";

export default function AgendaPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);

  // Forms
  const [sessionForm, setSessionForm] = useState({
    title: "",
    description: "",
    capacity: 100,
    format: "IN_PERSON",
    startTime: new Date().toISOString().slice(0, 16),
    endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
    trackId: "",
    isRecorded: false,
    recordingUrl: "",
  });

  const [speakerForm, setSpeakerForm] = useState({
    email: "",
    role: "SPEAKER",
  });

  const fetchData = async () => {
    const auth = getStoredAuth();
    if (!auth) return;
    try {
      const evs = await eventService.getEventsByTenant(auth.tenantId);
      setEvents(evs || []);
      if (evs && evs.length > 0 && !selectedEventId) {
        setSelectedEventId(evs[0].eventId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAgendaConfig = async (eventId: string) => {
    if (!eventId) return;
    try {
      const sessionsList = await eventService.getSessions();
      const eventSessions = (sessionsList || []).filter((s) => s.eventId === eventId);
      setSessions(eventSessions);
      if (eventSessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(eventSessions[0].sessionId);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    }
    try {
      const tracksList = await eventService.getTracks();
      const eventTracks = (tracksList || []).filter((t) => t.eventId === eventId);
      setTracks(eventTracks);
      if (eventTracks.length > 0 && !sessionForm.trackId) {
        setSessionForm(prev => ({ ...prev, trackId: eventTracks[0].trackId }));
      }
    } catch (err) {
      console.error("Failed to load tracks:", err);
    }
  };

  const fetchSessionDetails = async (sessionId: string) => {
    if (!sessionId) return;
    try {
      const [speakersList, attendeesList] = await Promise.all([
        eventService.getSessionSpeakers(),
        eventService.getSessionAttendees(),
      ]);

      setSpeakers((speakersList || []).filter((s) => s.sessionId === sessionId));
      setAttendees((attendeesList || []).filter((a) => a.sessionId === sessionId));
    } catch (err) {
      console.error("Failed to load session details:", err);
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

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionDetails(selectedSessionId);
    } else {
      setSpeakers([]);
      setAttendees([]);
    }
  }, [selectedSessionId]);

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      alert("Please select an event first.");
      return;
    }
    if (!sessionForm.title) {
      alert("Session title is required.");
      return;
    }
    try {
      await eventService.createSession({
        eventId: selectedEventId,
        trackId: sessionForm.trackId || selectedEventId, // Fallback if no tracks exist
        title: sessionForm.title,
        description: sessionForm.description,
        startTime: new Date(sessionForm.startTime).toISOString(),
        endTime: new Date(sessionForm.endTime).toISOString(),
        maxCapacity: Number(sessionForm.capacity),
        type: sessionForm.format,
        isRecorded: sessionForm.isRecorded,
        recordingUrl: sessionForm.recordingUrl,
      });
      setSessionForm({ 
        title: "", 
        description: "", 
        capacity: 100, 
        format: "IN_PERSON",
        startTime: new Date().toISOString().slice(0, 16),
        endTime: new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 16),
        trackId: tracks.length > 0 ? tracks[0].trackId : "",
        isRecorded: false,
        recordingUrl: ""
      });
      fetchAgendaConfig(selectedEventId);
      alert("Session created successfully!");
    } catch (err: any) {
      console.error("Failed to create session:", err);
      alert("Failed to create session: " + (err.message || err));
    }
  };

  const handleAddSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId) {
      alert("Please select a session first.");
      return;
    }
    if (!speakerForm.email) {
      alert("Speaker email is required.");
      return;
    }
    try {
      // Find the user by email
      const usersList = await authService.getUsers();
      const user = (usersList || []).find((u: any) => u.email === speakerForm.email);
      
      if (!user) {
        alert("No user found with that email. Please ensure the user is registered.");
        return;
      }

      await eventService.createSessionSpeaker({
        sessionId: selectedSessionId,
        speakerId: user.userId,
        role: speakerForm.role,
      });
      setSpeakerForm({ email: "", role: "SPEAKER" });
      fetchSessionDetails(selectedSessionId);
      alert("Speaker added successfully!");
    } catch (err: any) {
      console.error("Failed to add speaker:", err);
      alert("Failed to add speaker: " + (err.message || err));
    }
  };

  const activeEvent = events.find((e) => e.eventId === selectedEventId || e.id === selectedEventId);
  const activeSession = sessions.find((s) => s.sessionId === selectedSessionId || s.id === selectedSessionId);

  return (
    <div className="flex bg-[#111] min-h-screen text-[#e0e0e0]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        <header className="h-[60px] bg-[#161616] border-b border-[#222] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-white">Agenda & Sessions</h1>
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
          <div className="grid grid-cols-2 gap-8">
            {/* SESSIONS */}
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
              <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
                <Clock size={18} className="text-[#d4c9a8]" /> Event Sessions <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeEvent?.title || "selected event"})</span>
              </h2>
              <form onSubmit={handleAddSession} className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Session Title"
                    value={sessionForm.title}
                    onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                    required
                  />
                  <select
                    value={sessionForm.format}
                    onChange={(e) => setSessionForm({ ...sessionForm, format: e.target.value })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="IN_PERSON">In Person</option>
                    <option value="VIRTUAL">Virtual</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Description"
                    value={sessionForm.description}
                    onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Capacity"
                    value={sessionForm.capacity || ""}
                    onChange={(e) => setSessionForm({ ...sessionForm, capacity: Number(e.target.value) })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-medium text-[#555] uppercase tracking-wider mb-1">Start Time</label>
                    <input
                      type="datetime-local"
                      value={sessionForm.startTime}
                      onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                      className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-[#555] uppercase tracking-wider mb-1">End Time</label>
                    <input
                      type="datetime-local"
                      value={sessionForm.endTime}
                      onChange={(e) => setSessionForm({ ...sessionForm, endTime: e.target.value })}
                      className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-medium text-[#555] uppercase tracking-wider mb-1">Track</label>
                    <select
                      value={sessionForm.trackId}
                      onChange={(e) => setSessionForm({ ...sessionForm, trackId: e.target.value })}
                      className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                    >
                      <option value="">No Track Selected</option>
                      {tracks.map((t) => (
                        <option key={t.trackId} value={t.trackId}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-2 justify-end">
                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer h-[38px]">
                      <input
                        type="checkbox"
                        checked={sessionForm.isRecorded}
                        onChange={(e) => setSessionForm({ ...sessionForm, isRecorded: e.target.checked })}
                        className="rounded border-[#333] bg-[#252525]"
                      />
                      Is Recorded?
                    </label>
                  </div>
                </div>
                {sessionForm.isRecorded && (
                  <div>
                    <input
                      placeholder="Recording URL (optional)"
                      value={sessionForm.recordingUrl}
                      onChange={(e) => setSessionForm({ ...sessionForm, recordingUrl: e.target.value })}
                      className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Add Session
                </button>
              </form>

              <div className="space-y-3">
                {sessions.map((s) => (
                  <div 
                    key={s.sessionId} 
                    onClick={() => setSelectedSessionId(s.sessionId)}
                    className={`p-3.5 border rounded-xl cursor-pointer transition-colors ${
                      selectedSessionId === s.sessionId 
                        ? "bg-[#252525] border-[#d4c9a8]/50" 
                        : "bg-[#161616] border-[#2a2a2a] hover:border-[#333]"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-xs font-bold text-white">{s.title}</div>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-[#888]">{s.format}</span>
                    </div>
                    <div className="text-[10px] text-[#555] mt-1">{s.description || "No description"}</div>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <div className="text-center text-xs text-[#555] py-4">No sessions created yet.</div>
                )}
              </div>
            </div>

            {/* SPEAKERS & ATTENDEES */}
            <div className="space-y-8">
              {/* SPEAKERS */}
              <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
                <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
                  <Mic size={18} className="text-[#d4c9a8]" /> Session Speakers {activeSession && <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeSession.title})</span>}
                </h2>
                {selectedSessionId ? (
                  <>
                    <form onSubmit={handleAddSpeaker} className="space-y-4 mb-6">
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="email"
                          placeholder="Speaker Email Address"
                          value={speakerForm.email}
                          onChange={(e) => setSpeakerForm({ ...speakerForm, email: e.target.value })}
                          className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                          required
                        />
                        <select
                          value={speakerForm.role}
                          onChange={(e) => setSpeakerForm({ ...speakerForm, role: e.target.value })}
                          className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                        >
                          <option value="SPEAKER">Speaker</option>
                          <option value="MODERATOR">Moderator</option>
                          <option value="PANELIST">Panelist</option>
                          <option value="KEYNOTE">Keynote</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus size={14} /> Add Speaker
                      </button>
                    </form>

                    <div className="grid grid-cols-2 gap-3">
                      {speakers.map((sp) => (
                        <div key={sp.id || sp.speakerId} className="flex items-center gap-3 p-3 bg-[#161616] border border-[#2a2a2a] rounded-xl">
                          <img src={`https://api.dicebear.com/6.x/initials/svg?seed=${sp.speakerId}`} alt="Speaker" className="w-8 h-8 rounded-full bg-[#222]" />
                          <div>
                            <div className="text-xs font-bold text-white">User ID: {sp.speakerId.substring(0, 8)}...</div>
                            <div className="text-[9px] text-[#555] line-clamp-1">Role: {sp.role || "SPEAKER"}</div>
                          </div>
                        </div>
                      ))}
                      {speakers.length === 0 && (
                        <div className="col-span-2 text-center text-xs text-[#555] py-2">No speakers for this session.</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center text-xs text-[#555] py-8">Select a session to manage speakers.</div>
                )}
              </div>

              {/* ATTENDEES */}
              <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
                <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
                  <Users size={18} className="text-[#d4c9a8]" /> Registered Attendees
                </h2>
                {selectedSessionId ? (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {attendees.map((a) => (
                      <div key={a.attendeeId} className="flex justify-between items-center p-3 bg-[#161616] border border-[#2a2a2a] rounded-xl">
                        <div className="text-xs font-bold text-white">User ID: {a.userId.substring(0, 8)}...</div>
                        <div className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Registered</div>
                      </div>
                    ))}
                    {attendees.length === 0 && (
                      <div className="text-center text-xs text-[#555] py-4">No attendees registered yet.</div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-xs text-[#555] py-4">Select a session to view attendees.</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
