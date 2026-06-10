"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import dynamic from "next/dynamic";
import {
  Plus, Trash2, Upload, Calendar, MapPin, Ticket, Users, Mic2,
  Radio, Mail, ChevronRight, X, Check, Save, Image as ImageIcon,
  Globe, Wifi, User
} from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

const EventMap = dynamic(() => import("@/components/EventMap"), { ssr: false, loading: () => <div className="w-full h-40 bg-[#f5f5f5] rounded-xl animate-pulse" /> });

type EventTab = "details" | "schedule" | "location" | "tickets" | "team" | "sessions" | "live" | "email";

const TABS: { id: EventTab; label: string; icon: any }[] = [
  { id: "details",  label: "Details",   icon: ImageIcon },
  { id: "schedule", label: "Schedule",  icon: Calendar },
  { id: "location", label: "Location",  icon: MapPin },
  { id: "tickets",  label: "Tickets",   icon: Ticket },
  { id: "team",     label: "Team",      icon: Users },
  { id: "sessions", label: "Sessions",  icon: Mic2 },
  { id: "live",     label: "Live",      icon: Radio },
  { id: "email",    label: "Email",     icon: Mail },
];

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";
const saveBtn = "flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-50";
const addBtn = "flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-colors cursor-pointer";

export default function EventsPage() {
  const auth = getStoredAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [tab, setTab] = useState<EventTab>("details");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  // ── New event form ──
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStart, setNewStart] = useState(new Date().toISOString().slice(0, 16));
  const [newEnd, setNewEnd] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));

  // ── Details ──
  const [categories, setCategories] = useState<any[]>([]);
  const [banner, setBanner] = useState("");
  const [detailsForm, setDetailsForm] = useState({ title: "", description: "", status: "DRAFT", categoryId: "", maxCapacity: 100, currency: "XAF" });

  // ── Schedule ──
  const [schedule, setSchedule] = useState<any>(null);
  const [schedForm, setSchedForm] = useState({ startDatetime: "", endDatetime: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });

  // ── Location ──
  const [locations, setLocations] = useState<any[]>([]);
  const [locForm, setLocForm] = useState({ venueName: "", address: "", city: "", country: "Cameroon", isVirtual: false, virtualPlatform: "", virtualLink: "", latitude: 3.848, longitude: 11.502 });

  // ── Tickets ──
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketForm, setTicketForm] = useState({ name: "", description: "", price: 0, quantity: 100, isFree: true, saleStart: "", saleEnd: "" });

  // ── Team ──
  const [team, setTeam] = useState<any[]>([]);
  const [teamForm, setTeamForm] = useState({ name: "", position: "", bio: "", photoUrl: "" });
  const [teamLoading, setTeamLoading] = useState(false);

  // ── Sessions ──
  const [sessions, setSessions] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [sessionForm, setSessionForm] = useState({ title: "", description: "", type: "TALK", startTime: "", endTime: "", capacity: 50, trackId: "" });

  // ── Live ──
  const [polls, setPolls] = useState<any[]>([]);
  const [qaQuestions, setQaQuestions] = useState<any[]>([]);
  const [pollForm, setPollForm] = useState({ question: "", options: ["", ""] });
  const [qaForm, setQaForm] = useState({ questionText: "", isAnonymous: false, sessionId: "" });

  // ── Email ──
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [emailForm, setEmailForm] = useState({ subject: "", body: "", targetAudience: "ALL_REGISTRANTS", scheduledAt: "" });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const loadEvents = async () => {
    try {
      const evs = await eventService.getMyEvents();
      // getMyEvents already scoped to the authenticated tenant via JWT
      setEvents((evs || []).filter((e: any) => !auth?.tenantId || !e.tenantId || e.tenantId === auth.tenantId));
      if (!selectedId && evs?.length) selectEvent(evs[0].eventId);
    } catch {}
  };

  const selectEvent = async (id: string) => {
    setSelectedId(id);
    setTab("details");
    setShowNew(false);
    await loadEventData(id);
  };

  const loadEventData = async (id: string) => {
    const tenantId = auth?.tenantId;
    const byEvent = (item: any) =>
      (item.eventId === id || item.event?.eventId === id) &&
      (!tenantId || !item.tenantId || item.tenantId === tenantId);

    try {
      const [cats, locs, tix, scheds, sess, trks, pls, qas, camps, nets] = await Promise.all([
        eventService.getEventCategories().catch(() => []),
        eventService.getEventLocations().catch(() => []),
        eventService.getTicketTypes().catch(() => []),
        eventService.getEventSchedules().catch(() => []),
        eventService.getSessions().catch(() => []),
        eventService.getTracks().catch(() => []),
        eventService.getPolls().catch(() => []),
        eventService.getQaQuestions().catch(() => []),
        eventService.getEmailCampaigns().catch(() => []),
        eventService.getNetworkings().catch(() => []),
      ]);
      setCategories((cats || []).filter((c: any) => !tenantId || !c.tenantId || c.tenantId === tenantId));
      setLocations((locs || []).filter(byEvent));
      setTickets((tix || []).filter(byEvent));
      const eventSessions = (sess || []).filter(byEvent);
      setSessions(eventSessions);
      setTracks((trks || []).filter(byEvent));
      setPolls((pls || []).filter(byEvent));
      const eventSessionIds = new Set(eventSessions.map((s: any) => s.sessionId || s.id));
      setQaQuestions((qas || []).filter((q: any) => eventSessionIds.has(q.sessionId || q.session?.sessionId)));
      setCampaigns((camps || []).filter(byEvent));
      setTeam((nets || []).filter((n: any) => byEvent(n) && n.role === "TEAM_MEMBER"));

      const sched = (scheds || []).find((s: any) => s.eventId === id || s.event?.eventId === id);
      setSchedule(sched || null);
      if (sched) setSchedForm({ startDatetime: sched.startDatetime?.slice(0, 16) || "", endDatetime: sched.endDatetime?.slice(0, 16) || "", timezone: sched.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone });

      const ev = events.find(e => e.eventId === id);
      if (ev) {
        setDetailsForm({ title: ev.title || "", description: ev.description || "", status: ev.status || "DRAFT", categoryId: ev.categoryId || "", maxCapacity: ev.maxCapacity || 100, currency: ev.currency || "XAF" });
        setBanner(ev.coverImage || "");
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadEvents(); }, []);

  const selectedEvent = events.find(e => e.eventId === selectedId);

  // ── Create new event ──
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const ev = await eventService.createEvent({ tenantId: auth?.tenantId, organizerId: auth?.userId, title: newTitle, description: newDesc, status: "DRAFT", currency: "XAF", format: "IN_PERSON", visibility: "PUBLIC", isPaid: false, maxCapacity: 100 });
      const id = ev.eventId || (ev as any).id;
      await eventService.createEventSchedule({ eventId: id, startDatetime: new Date(newStart).toISOString(), endDatetime: new Date(newEnd).toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      setNewTitle(""); setNewDesc("");
      await loadEvents();
      selectEvent(id);
      showToast("Event created!");
    } catch (err: any) { showToast("Error: " + err.message); }
    finally { setSaving(false); }
  };

  // ── Save details ──
  const saveDetails = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await eventService.updateEvent(selectedId, {
        tenantId: selectedEvent?.tenantId,
        organizerId: selectedEvent?.organizerId,
        title: detailsForm.title,
        description: detailsForm.description,
        status: detailsForm.status,
        categoryId: detailsForm.categoryId || undefined,
        maxCapacity: detailsForm.maxCapacity,
        currency: detailsForm.currency,
        coverImage: banner || undefined,
        format: selectedEvent?.format || "IN_PERSON",
        visibility: selectedEvent?.visibility || "PUBLIC",
        isPaid: selectedEvent?.isPaid ?? false,
      });
      await loadEvents();
      showToast("Details saved!");
    } catch { showToast("Failed to save details."); }
    finally { setSaving(false); }
  };

  // ── Save schedule ──
  const saveSchedule = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      if (schedule?.scheduleId || schedule?.id) {
        await eventService.updateEventSchedule(schedule.scheduleId || schedule.id, { eventId: selectedId, startDatetime: new Date(schedForm.startDatetime).toISOString(), endDatetime: new Date(schedForm.endDatetime).toISOString(), timezone: schedForm.timezone });
      } else {
        const s = await eventService.createEventSchedule({ eventId: selectedId, startDatetime: new Date(schedForm.startDatetime).toISOString(), endDatetime: new Date(schedForm.endDatetime).toISOString(), timezone: schedForm.timezone });
        setSchedule(s);
      }
      showToast("Schedule saved!");
    } catch { showToast("Failed to save schedule."); }
    finally { setSaving(false); }
  };

  // ── Add location ──
  const addLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await eventService.createEventLocation({ eventId: selectedId, tenantId: auth?.tenantId, type: locForm.isVirtual ? "VIRTUAL" : "VENUE", venueName: locForm.venueName, address: locForm.address, city: locForm.city, country: locForm.country, latitude: locForm.latitude, longitude: locForm.longitude, virtualPlatform: locForm.virtualPlatform, virtualLink: locForm.virtualLink });
      setLocForm({ venueName: "", address: "", city: "", country: "Cameroon", isVirtual: false, virtualPlatform: "", virtualLink: "", latitude: 3.848, longitude: 11.502 });
      await loadEventData(selectedId);
      showToast("Location added!");
    } catch { showToast("Failed to add location."); }
    finally { setSaving(false); }
  };

  // ── Add ticket ──
  const addTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await eventService.createTicketType({
        eventId: selectedId,
        name: ticketForm.name,
        description: ticketForm.description,
        price: ticketForm.isFree ? 0 : Number(ticketForm.price),
        currency: "XAF",
        quantityAvailable: Number(ticketForm.quantity),
        quantitySold: 0,
        saleStart: ticketForm.saleStart ? new Date(ticketForm.saleStart).toISOString() : undefined,
        saleEnd: ticketForm.saleEnd ? new Date(ticketForm.saleEnd).toISOString() : undefined,
        maxPerOrder: 10,
      });
      setTicketForm({ name: "", description: "", price: 0, quantity: 100, isFree: true, saleStart: "", saleEnd: "" });
      await loadEventData(selectedId);
      showToast("Ticket type added!");
    } catch { showToast("Failed to add ticket."); }
    finally { setSaving(false); }
  };

  // ── Add team member ──
  const addTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name) return;
    setTeamLoading(true);
    try {
      await eventService.createNetworking({
        eventId: selectedId,
        role: "TEAM_MEMBER",
        name: teamForm.name,
        skills: teamForm.position,       // position stored in skills field
        availability: teamForm.bio,      // bio stored in availability field
        photoUrl: teamForm.photoUrl || undefined,
        status: "ACTIVE",
      });
      setTeamForm({ name: "", position: "", bio: "", photoUrl: "" });
      await loadEventData(selectedId);
      showToast("Team member added!");
    } catch { showToast("Failed to add team member."); }
    finally { setTeamLoading(false); }
  };

  // ── Add session ──
  const addSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await eventService.createSession({
        eventId: selectedId,
        trackId: sessionForm.trackId || undefined,
        title: sessionForm.title,
        description: sessionForm.description,
        type: sessionForm.type,
        startTime: sessionForm.startTime ? new Date(sessionForm.startTime).toISOString() : undefined,
        endTime: sessionForm.endTime ? new Date(sessionForm.endTime).toISOString() : undefined,
        maxCapacity: Number(sessionForm.capacity),
        isRecorded: false,
      });
      setSessionForm({ title: "", description: "", type: "TALK", startTime: "", endTime: "", capacity: 50, trackId: "" });
      await loadEventData(selectedId);
      showToast("Session added!");
    } catch { showToast("Failed to add session."); }
    finally { setSaving(false); }
  };

  // ── Add poll ──
  const addPoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await eventService.createPoll({
        eventId: selectedId,
        question: pollForm.question,
        options: JSON.stringify(pollForm.options.filter(o => o.trim())),
        isActive: true,
      });
      setPollForm({ question: "", options: ["", ""] });
      await loadEventData(selectedId);
      showToast("Poll created!");
    } catch { showToast("Failed to create poll."); }
    finally { setSaving(false); }
  };

  // ── Add Q&A ──
  const addQA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaForm.sessionId) { showToast("Please select a session for this question."); return; }
    setSaving(true);
    try {
      await eventService.createQaQuestion({
        sessionId: qaForm.sessionId,
        userId: auth?.userId,
        questionText: qaForm.questionText,
        isAnonymous: qaForm.isAnonymous,
        isAnswered: false,
        upvotes: 0,
      });
      setQaForm({ questionText: "", isAnonymous: false, sessionId: qaForm.sessionId });
      await loadEventData(selectedId);
      showToast("Question added!");
    } catch { showToast("Failed to add question."); }
    finally { setSaving(false); }
  };

  // ── Send email campaign ──
  const sendCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await eventService.createEmailCampaign({ eventId: selectedId, tenantId: auth?.tenantId, subject: emailForm.subject, body: emailForm.body, targetAudience: emailForm.targetAudience, scheduledAt: emailForm.scheduledAt ? new Date(emailForm.scheduledAt).toISOString() : undefined, status: "SCHEDULED" });
      setEmailForm({ subject: "", body: "", targetAudience: "ALL_REGISTRANTS", scheduledAt: "" });
      await loadEventData(selectedId);
      showToast("Campaign scheduled!");
    } catch { showToast("Failed to schedule campaign."); }
    finally { setSaving(false); }
  };

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#1a1a1a]">
      <Sidebar />

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[200] bg-[#1a1a1a] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <Check size={16} className="text-green-400" /> {toast}
        </div>
      )}

      <div className="ml-[220px] flex-1 flex">

        {/* ── LEFT: Event list ── */}
        <aside className="w-72 bg-white border-r border-[#e5e7eb] flex flex-col h-screen sticky top-0">
          <div className="p-5 border-b border-[#e5e7eb]">
            <h2 className="font-display font-black text-[#1a1a1a] text-base mb-4">Events</h2>
            <button onClick={() => { setShowNew(true); setSelectedId(""); }} className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer">
              <Plus size={14} /> New Event
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            {events.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-[#aaa]">No events yet. Create your first one!</div>
            ) : events.map(ev => (
              <button key={ev.eventId} onClick={() => selectEvent(ev.eventId)}
                className={`w-full text-left px-5 py-4 border-b border-[#f5f5f5] hover:bg-[#fafafa] transition-colors cursor-pointer ${selectedId === ev.eventId ? "bg-[#fff5f5] border-l-2 border-l-[#FF4747]" : ""}`}>
                <div className="font-semibold text-sm text-[#1a1a1a] truncate mb-1">{ev.title}</div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ev.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-[#f5f5f5] text-[#888]"}`}>{ev.status}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── RIGHT: Editor ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* ── NEW EVENT FORM ── */}
          {showNew && (
            <div className="flex-1 p-8">
              <div className="max-w-2xl">
                <h1 className="font-display text-2xl font-black text-[#1a1a1a] mb-2">Create New Event</h1>
                <p className="text-sm text-[#888] mb-8">Start with the basics — you can fill in all details after.</p>
                <form onSubmit={handleCreateEvent} className="bg-white border border-[#e5e7eb] rounded-3xl p-8 space-y-5">
                  <div>
                    <label className={label}>Event Title *</label>
                    <input required placeholder="e.g. Tech Summit Yaoundé 2026" value={newTitle} onChange={e => setNewTitle(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={label}>Short Description</label>
                    <textarea placeholder="A brief overview of the event..." value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} className={inp + " resize-none"} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>Start Date & Time *</label>
                      <input type="datetime-local" value={newStart} onChange={e => setNewStart(e.target.value)} className={inp} required />
                    </div>
                    <div>
                      <label className={label}>End Date & Time *</label>
                      <input type="datetime-local" value={newEnd} onChange={e => setNewEnd(e.target.value)} className={inp} required />
                    </div>
                  </div>
                  <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center py-3"}>
                    {saving ? "Creating..." : <><Plus size={15} /> Create Event</>}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ── EVENT EDITOR ── */}
          {selectedId && !showNew && (
            <>
              {/* Header */}
              <header className="bg-white border-b border-[#e5e7eb] px-8 py-4 flex items-center justify-between sticky top-0 z-30">
                <div>
                  <h1 className="font-display font-black text-[#1a1a1a] text-lg truncate max-w-md">{selectedEvent?.title}</h1>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${selectedEvent?.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-[#f5f5f5] text-[#888]"}`}>{selectedEvent?.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  {tab === "details" && <button onClick={saveDetails} disabled={saving} className={saveBtn}><Save size={13} />{saving ? "Saving..." : "Save Details"}</button>}
                  {tab === "schedule" && <button onClick={saveSchedule} disabled={saving} className={saveBtn}><Save size={13} />{saving ? "Saving..." : "Save Schedule"}</button>}
                </div>
              </header>

              {/* Tabs */}
              <div className="bg-white border-b border-[#e5e7eb] px-8 flex gap-1 overflow-x-auto">
                {TABS.map(({ id, label: lbl, icon: Icon }) => (
                  <button key={id} onClick={() => setTab(id)}
                    className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${tab === id ? "border-[#FF4747] text-[#FF4747]" : "border-transparent text-[#888] hover:text-[#1a1a1a]"}`}>
                    <Icon size={14} />{lbl}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-8">

                {/* ── DETAILS TAB ── */}
                {tab === "details" && (
                  <div className="max-w-3xl space-y-6">
                    {/* Banner */}
                    <div className="bg-white border border-[#e5e7eb] rounded-3xl overflow-hidden">
                      <div className="relative h-52 bg-gradient-to-br from-[#FF4747]/10 to-[#F7E998]/20">
                        {banner ? <img src={banner} alt="banner" className="w-full h-full object-cover" /> : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-[#ccc]">
                            <ImageIcon size={36} className="mb-2" />
                            <span className="text-sm">No banner uploaded</span>
                          </div>
                        )}
                        <label className="absolute bottom-3 right-3 flex items-center gap-2 px-4 py-2 bg-black/60 backdrop-blur text-white text-xs font-semibold rounded-full cursor-pointer hover:bg-black/80 transition-colors">
                          <Upload size={13} /> Upload Banner
                          <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setBanner(ev.target?.result as string); r.readAsDataURL(f); }} />
                        </label>
                      </div>
                    </div>

                    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7 space-y-5">
                      <div>
                        <label className={label}>Event Title *</label>
                        <input value={detailsForm.title} onChange={e => setDetailsForm(f => ({ ...f, title: e.target.value }))} className={inp} placeholder="Event title" />
                      </div>
                      <div>
                        <label className={label}>Overview / Description</label>
                        <textarea value={detailsForm.description} onChange={e => setDetailsForm(f => ({ ...f, description: e.target.value }))} rows={5} className={inp + " resize-none"} placeholder="Describe what attendees can expect..." />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className={label}>Status</label>
                          <select value={detailsForm.status} onChange={e => setDetailsForm(f => ({ ...f, status: e.target.value }))} className={inp}>
                            <option value="DRAFT">Draft</option>
                            <option value="PUBLISHED">Published</option>
                            <option value="CANCELLED">Cancelled</option>
                            <option value="COMPLETED">Completed</option>
                          </select>
                        </div>
                        <div>
                          <label className={label}>Category</label>
                          <select value={detailsForm.categoryId} onChange={e => setDetailsForm(f => ({ ...f, categoryId: e.target.value }))} className={inp}>
                            <option value="">— No category —</option>
                            {categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={label}>Max Capacity</label>
                          <input type="number" min={1} value={detailsForm.maxCapacity} onChange={e => setDetailsForm(f => ({ ...f, maxCapacity: Number(e.target.value) }))} className={inp} />
                        </div>
                      </div>
                      {/* Inline new category */}
                      <NewCategoryRow tenantId={auth?.tenantId} onCreated={() => eventService.getEventCategories().then(c => setCategories(c || []))} />
                    </div>
                  </div>
                )}

                {/* ── SCHEDULE TAB ── */}
                {tab === "schedule" && (
                  <div className="max-w-xl">
                    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7 space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={label}>Start Date & Time</label>
                          <input type="datetime-local" value={schedForm.startDatetime} onChange={e => setSchedForm(f => ({ ...f, startDatetime: e.target.value }))} className={inp} />
                        </div>
                        <div>
                          <label className={label}>End Date & Time</label>
                          <input type="datetime-local" value={schedForm.endDatetime} onChange={e => setSchedForm(f => ({ ...f, endDatetime: e.target.value }))} className={inp} />
                        </div>
                      </div>
                      <div>
                        <label className={label}>Timezone</label>
                        <input value={schedForm.timezone} onChange={e => setSchedForm(f => ({ ...f, timezone: e.target.value }))} className={inp} placeholder="Africa/Douala" />
                      </div>
                      {schedule && (
                        <div className="text-xs text-[#888] bg-[#fafafa] rounded-xl p-3 border border-[#f0f0f0]">
                          Currently saved: <span className="font-semibold text-[#1a1a1a]">{schedule.startDatetime?.slice(0, 16)}</span> → <span className="font-semibold text-[#1a1a1a]">{schedule.endDatetime?.slice(0, 16)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── LOCATION TAB ── */}
                {tab === "location" && (
                  <div className="max-w-3xl space-y-6">
                    {/* Existing locations */}
                    {locations.length > 0 && (
                      <div className="space-y-3">
                        {locations.map(loc => (
                          <div key={loc.locationId} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-start gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${loc.type === "VIRTUAL" ? "bg-blue-50" : "bg-[#FF4747]/10"}`}>
                              {loc.type === "VIRTUAL" ? <Wifi size={18} className="text-blue-500" /> : <MapPin size={18} className="text-[#FF4747]" />}
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-sm text-[#1a1a1a]">{loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName}</div>
                              <div className="text-xs text-[#888] mt-0.5">{loc.type === "VIRTUAL" ? loc.virtualLink : `${loc.address}, ${loc.city}, ${loc.country}`}</div>
                              {loc.type !== "VIRTUAL" && loc.latitude && loc.longitude && (
                                <div className="mt-3 rounded-xl overflow-hidden"><EventMap latitude={loc.latitude} longitude={loc.longitude} venueName={loc.venueName} /></div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add location form */}
                    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                      <h3 className="font-bold text-sm text-[#1a1a1a] mb-5">Add Location</h3>
                      <form onSubmit={addLocation} className="space-y-4">
                        <div className="flex items-center gap-3 p-3 bg-[#fafafa] rounded-xl border border-[#f0f0f0]">
                          <button type="button" onClick={() => setLocForm(f => ({ ...f, isVirtual: false }))} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${!locForm.isVirtual ? "bg-[#FF4747] text-white" : "text-[#888] hover:text-[#1a1a1a]"}`}>
                            <MapPin size={13} /> In Person
                          </button>
                          <button type="button" onClick={() => setLocForm(f => ({ ...f, isVirtual: true }))} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${locForm.isVirtual ? "bg-blue-500 text-white" : "text-[#888] hover:text-[#1a1a1a]"}`}>
                            <Wifi size={13} /> Virtual
                          </button>
                        </div>

                        {!locForm.isVirtual ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div><label className={label}>Venue Name *</label><input required placeholder="e.g. Palais des Congrès" value={locForm.venueName} onChange={e => setLocForm(f => ({ ...f, venueName: e.target.value }))} className={inp} /></div>
                              <div><label className={label}>Address</label><input placeholder="Street address" value={locForm.address} onChange={e => setLocForm(f => ({ ...f, address: e.target.value }))} className={inp} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div><label className={label}>City</label><input placeholder="Yaoundé" value={locForm.city} onChange={e => setLocForm(f => ({ ...f, city: e.target.value }))} className={inp} /></div>
                              <div><label className={label}>Country</label><input placeholder="Cameroon" value={locForm.country} onChange={e => setLocForm(f => ({ ...f, country: e.target.value }))} className={inp} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div><label className={label}>Latitude</label><input type="number" step="any" value={locForm.latitude} onChange={e => setLocForm(f => ({ ...f, latitude: Number(e.target.value) }))} className={inp} /></div>
                              <div><label className={label}>Longitude</label><input type="number" step="any" value={locForm.longitude} onChange={e => setLocForm(f => ({ ...f, longitude: Number(e.target.value) }))} className={inp} /></div>
                            </div>
                            {locForm.latitude && locForm.longitude && (
                              <div className="rounded-2xl overflow-hidden border border-[#e5e7eb]">
                                <EventMap latitude={locForm.latitude} longitude={locForm.longitude} venueName={locForm.venueName || "Selected location"} />
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className={label}>Platform</label><input placeholder="e.g. Zoom, Google Meet" value={locForm.virtualPlatform} onChange={e => setLocForm(f => ({ ...f, virtualPlatform: e.target.value }))} className={inp} required={locForm.isVirtual} /></div>
                            <div><label className={label}>Meeting Link</label><input type="url" placeholder="https://meet.example.com/..." value={locForm.virtualLink} onChange={e => setLocForm(f => ({ ...f, virtualLink: e.target.value }))} className={inp} /></div>
                          </div>
                        )}
                        <button type="submit" disabled={saving} className={saveBtn}><Plus size={13} />{saving ? "Adding..." : "Add Location"}</button>
                      </form>
                    </div>
                  </div>
                )}

                {/* ── TICKETS TAB ── */}
                {tab === "tickets" && (
                  <div className="max-w-4xl space-y-6">
                    {tickets.length > 0 && (
                      <div className="grid md:grid-cols-2 gap-4">
                        {tickets.map(t => (
                          <div key={t.ticketId || t.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <div className="font-bold text-sm text-[#1a1a1a]">{t.name}</div>
                                {t.description && <div className="text-xs text-[#888] mt-0.5">{t.description}</div>}
                              </div>
                              <span className={`text-sm font-black ${t.isFree || t.price === 0 ? "text-green-600" : "text-[#FF4747]"}`}>
                                {t.isFree || t.price === 0 ? "Free" : `${Number(t.price).toLocaleString()} FCFA`}
                              </span>
                            </div>
                            <div className="flex gap-3 text-[10px] text-[#888]">
                              <span>Qty: <strong className="text-[#1a1a1a]">{t.quantity}</strong></span>
                              {t.saleStartDate && <span>Sale from: <strong className="text-[#1a1a1a]">{t.saleStartDate?.slice(0, 10)}</strong></span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                      <h3 className="font-bold text-sm text-[#1a1a1a] mb-5">Create Ticket Type</h3>
                      <form onSubmit={addTicket} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className={label}>Name *</label><input required placeholder="e.g. General Admission" value={ticketForm.name} onChange={e => setTicketForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                          <div><label className={label}>Quantity</label><input type="number" min={1} value={ticketForm.quantity} onChange={e => setTicketForm(f => ({ ...f, quantity: Number(e.target.value) }))} className={inp} /></div>
                        </div>
                        <div><label className={label}>Description</label><input placeholder="What's included with this ticket?" value={ticketForm.description} onChange={e => setTicketForm(f => ({ ...f, description: e.target.value }))} className={inp} /></div>

                        <div className="flex items-center gap-3 p-3 bg-[#fafafa] rounded-xl border border-[#f0f0f0]">
                          <button type="button" onClick={() => setTicketForm(f => ({ ...f, isFree: true }))} className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${ticketForm.isFree ? "bg-green-500 text-white" : "text-[#888]"}`}>Free</button>
                          <button type="button" onClick={() => setTicketForm(f => ({ ...f, isFree: false }))} className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${!ticketForm.isFree ? "bg-[#FF4747] text-white" : "text-[#888]"}`}>Paid</button>
                        </div>

                        {!ticketForm.isFree && (
                          <div><label className={label}>Price (FCFA)</label><input type="number" min={0} placeholder="5000" value={ticketForm.price || ""} onChange={e => setTicketForm(f => ({ ...f, price: Number(e.target.value) }))} className={inp} /></div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div><label className={label}>Sale Starts</label><input type="datetime-local" value={ticketForm.saleStart} onChange={e => setTicketForm(f => ({ ...f, saleStart: e.target.value }))} className={inp} /></div>
                          <div><label className={label}>Sale Ends</label><input type="datetime-local" value={ticketForm.saleEnd} onChange={e => setTicketForm(f => ({ ...f, saleEnd: e.target.value }))} className={inp} /></div>
                        </div>
                        <button type="submit" disabled={saving} className={saveBtn}><Plus size={13} />{saving ? "Adding..." : "Add Ticket Type"}</button>
                      </form>
                    </div>
                  </div>
                )}

                {/* ── TEAM TAB ── */}
                {tab === "team" && (
                  <div className="max-w-4xl space-y-6">
                    {team.length > 0 && (
                      <div className="grid md:grid-cols-3 gap-5">
                        {team.map((m, i) => (
                          <div key={i} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 text-center">
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt={m.name} className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 border-[#f0f0f0]" />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-[#F7E998] flex items-center justify-center mx-auto mb-3 text-[#1a1a1a] font-black text-xl">{(m.name || "?").charAt(0)}</div>
                            )}
                            <div className="font-bold text-sm text-[#1a1a1a]">{m.name}</div>
                            {m.skills && <div className="text-xs text-[#FF4747] font-semibold mt-0.5">{m.skills}</div>}
                            {m.availability && <div className="text-xs text-[#888] mt-2 leading-relaxed">{m.availability}</div>}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                      <h3 className="font-bold text-sm text-[#1a1a1a] mb-5">Add Team Member</h3>
                      <form onSubmit={addTeamMember} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className={label}>Full Name *</label><input required placeholder="Jane Doe" value={teamForm.name} onChange={e => setTeamForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                          <div><label className={label}>Position / Role</label><input placeholder="Event Director" value={teamForm.position} onChange={e => setTeamForm(f => ({ ...f, position: e.target.value }))} className={inp} /></div>
                        </div>
                        <div><label className={label}>Bio / Credentials</label><textarea placeholder="Brief bio or credentials..." value={teamForm.bio} onChange={e => setTeamForm(f => ({ ...f, bio: e.target.value }))} rows={3} className={inp + " resize-none"} /></div>

                        <div>
                          <label className={label}>Profile Photo</label>
                          <label className="flex items-center gap-4 border-2 border-dashed border-[#e5e7eb] rounded-2xl p-4 cursor-pointer hover:border-[#FF4747] transition-colors group">
                            {teamForm.photoUrl ? (
                              <img src={teamForm.photoUrl} alt="Preview" className="w-14 h-14 rounded-full object-cover border-2 border-[#f0f0f0] shrink-0" />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-[#fafafa] flex items-center justify-center shrink-0 border border-[#e5e7eb]">
                                <User size={22} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                              </div>
                            )}
                            <div>
                              <div className="text-sm font-semibold text-[#1a1a1a]">{teamForm.photoUrl ? "Click to change" : "Upload photo"}</div>
                              <div className="text-xs text-[#aaa]">PNG or JPG</div>
                            </div>
                            <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setTeamForm(f => ({ ...f, photoUrl: ev.target?.result as string })); r.readAsDataURL(f); }} />
                          </label>
                          {teamForm.photoUrl && <button type="button" onClick={() => setTeamForm(f => ({ ...f, photoUrl: "" }))} className="text-xs text-red-500 mt-1 cursor-pointer hover:underline">Remove photo</button>}
                        </div>

                        <button type="submit" disabled={teamLoading} className={saveBtn}><Plus size={13} />{teamLoading ? "Adding..." : "Add Team Member"}</button>
                      </form>
                    </div>
                  </div>
                )}

                {/* ── SESSIONS TAB ── */}
                {tab === "sessions" && (
                  <div className="max-w-4xl space-y-6">
                    {sessions.length > 0 && (
                      <div className="space-y-3">
                        {sessions.map(s => (
                          <div key={s.sessionId || s.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#F7E998]/50 flex items-center justify-center shrink-0"><Mic2 size={18} className="text-[#7a6a00]" /></div>
                            <div className="flex-1">
                              <div className="font-bold text-sm text-[#1a1a1a]">{s.title}</div>
                              {s.description && <div className="text-xs text-[#888] mt-0.5">{s.description}</div>}
                              <div className="flex gap-3 mt-2 text-[10px] text-[#aaa]">
                                <span className="px-2 py-0.5 bg-[#fafafa] border border-[#f0f0f0] rounded font-medium">{s.type}</span>
                                {s.capacity && <span>Cap: {s.capacity}</span>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                      <h3 className="font-bold text-sm text-[#1a1a1a] mb-5">Add Session</h3>
                      <form onSubmit={addSession} className="space-y-4">
                        <div><label className={label}>Session Title *</label><input required placeholder="e.g. Opening Keynote" value={sessionForm.title} onChange={e => setSessionForm(f => ({ ...f, title: e.target.value }))} className={inp} /></div>
                        <div><label className={label}>Description</label><textarea value={sessionForm.description} onChange={e => setSessionForm(f => ({ ...f, description: e.target.value }))} rows={2} className={inp + " resize-none"} /></div>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className={label}>Type</label>
                            <select value={sessionForm.type} onChange={e => setSessionForm(f => ({ ...f, type: e.target.value }))} className={inp}>
                              {["TALK", "WORKSHOP", "PANEL", "NETWORKING", "BREAK", "OTHER"].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div><label className={label}>Start Time</label><input type="datetime-local" value={sessionForm.startTime} onChange={e => setSessionForm(f => ({ ...f, startTime: e.target.value }))} className={inp} /></div>
                          <div><label className={label}>End Time</label><input type="datetime-local" value={sessionForm.endTime} onChange={e => setSessionForm(f => ({ ...f, endTime: e.target.value }))} className={inp} /></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div><label className={label}>Capacity</label><input type="number" min={1} value={sessionForm.capacity} onChange={e => setSessionForm(f => ({ ...f, capacity: Number(e.target.value) }))} className={inp} /></div>
                          <div>
                            <label className={label}>Track</label>
                            <select value={sessionForm.trackId} onChange={e => setSessionForm(f => ({ ...f, trackId: e.target.value }))} className={inp}>
                              <option value="">— No track —</option>
                              {tracks.map(t => <option key={t.trackId || t.id} value={t.trackId || t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <button type="submit" disabled={saving} className={saveBtn}><Plus size={13} />{saving ? "Adding..." : "Add Session"}</button>
                      </form>
                    </div>
                  </div>
                )}

                {/* ── LIVE TAB ── */}
                {tab === "live" && (
                  <div className="max-w-4xl grid md:grid-cols-2 gap-6">
                    {/* Polls */}
                    <div className="space-y-5">
                      <h3 className="font-display font-black text-[#1a1a1a] text-base">Live Polls</h3>
                      {polls.length > 0 && polls.map(p => (
                        <div key={p.pollId || p.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5">
                          <div className="font-semibold text-sm text-[#1a1a1a] mb-3">{p.question}</div>
                          {p.options && (
                            <ul className="space-y-1.5">
                              {(typeof p.options === "string" ? JSON.parse(p.options) : p.options).map((opt: string, i: number) => (
                                <li key={i} className="text-xs text-[#888] flex items-center gap-2">
                                  <span className="w-4 h-4 rounded-full bg-[#F7E998] text-[#7a6a00] flex items-center justify-center text-[9px] font-black">{i + 1}</span>{opt}
                                </li>
                              ))}
                            </ul>
                          )}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-3 inline-block ${p.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-[#fafafa] text-[#888]"}`}>{p.status}</span>
                        </div>
                      ))}
                      <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6">
                        <h4 className="font-bold text-sm text-[#1a1a1a] mb-4">Create Poll</h4>
                        <form onSubmit={addPoll} className="space-y-3">
                          <div><label className={label}>Question *</label><input required placeholder="e.g. What topic interests you most?" value={pollForm.question} onChange={e => setPollForm(f => ({ ...f, question: e.target.value }))} className={inp} /></div>
                          <div>
                            <label className={label}>Options</label>
                            {pollForm.options.map((opt, i) => (
                              <div key={i} className="flex gap-2 mb-2">
                                <input placeholder={`Option ${i + 1}`} value={opt} onChange={e => { const opts = [...pollForm.options]; opts[i] = e.target.value; setPollForm(f => ({ ...f, options: opts })); }} className={inp} />
                                {pollForm.options.length > 2 && <button type="button" onClick={() => setPollForm(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))} className="p-2 text-red-400 hover:text-red-600 cursor-pointer"><X size={14} /></button>}
                              </div>
                            ))}
                            {pollForm.options.length < 6 && <button type="button" onClick={() => setPollForm(f => ({ ...f, options: [...f.options, ""] }))} className="text-xs text-[#FF4747] font-semibold cursor-pointer hover:underline">+ Add option</button>}
                          </div>
                          <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center"}><Radio size={13} />{saving ? "Creating..." : "Launch Poll"}</button>
                        </form>
                      </div>
                    </div>

                    {/* Q&A */}
                    <div className="space-y-5">
                      <h3 className="font-display font-black text-[#1a1a1a] text-base">Q&A Questions</h3>
                      {qaQuestions.length > 0 && qaQuestions.map(q => (
                        <div key={q.questionId || q.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-4">
                          <div className="text-sm text-[#1a1a1a] font-medium">{q.questionText || q.question}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${q.isAnswered ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{q.isAnswered ? "ANSWERED" : "PENDING"}</span>
                            {q.isAnonymous && <span className="text-[10px] text-[#aaa]">Anonymous</span>}
                          </div>
                        </div>
                      ))}
                      <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6">
                        <h4 className="font-bold text-sm text-[#1a1a1a] mb-4">Add Q&A Question</h4>
                        {sessions.length === 0 ? (
                          <div className="text-xs text-[#888] bg-[#fafafa] border border-[#f0f0f0] rounded-xl p-4">
                            Add at least one session first — Q&A questions are linked to sessions.
                          </div>
                        ) : (
                        <form onSubmit={addQA} className="space-y-3">
                          <div>
                            <label className={label}>Session *</label>
                            <select value={qaForm.sessionId} onChange={e => setQaForm(f => ({ ...f, sessionId: e.target.value }))} className={inp} required>
                              <option value="">— Select session —</option>
                              {sessions.map(s => <option key={s.sessionId || s.id} value={s.sessionId || s.id}>{s.title}</option>)}
                            </select>
                          </div>
                          <div><label className={label}>Question *</label><textarea required placeholder="Enter a question for attendees..." value={qaForm.questionText} onChange={e => setQaForm(f => ({ ...f, questionText: e.target.value }))} rows={3} className={inp + " resize-none"} /></div>
                          <label className="flex items-center gap-2 cursor-pointer text-sm text-[#555]">
                            <input type="checkbox" checked={qaForm.isAnonymous} onChange={e => setQaForm(f => ({ ...f, isAnonymous: e.target.checked }))} className="rounded" />
                            Post anonymously
                          </label>
                          <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center"}><Plus size={13} />{saving ? "Adding..." : "Add Question"}</button>
                        </form>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── EMAIL TAB ── */}
                {tab === "email" && (
                  <div className="max-w-3xl space-y-6">
                    {campaigns.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-bold text-sm text-[#1a1a1a]">Sent / Scheduled Campaigns</h3>
                        {campaigns.map((c, i) => (
                          <div key={c.campaignId || i} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl bg-[#FF4747]/10 flex items-center justify-center shrink-0"><Mail size={18} className="text-[#FF4747]" /></div>
                            <div className="flex-1">
                              <div className="font-bold text-sm text-[#1a1a1a]">{c.subject}</div>
                              <div className="text-xs text-[#888] mt-0.5">To: {c.targetAudience} · {c.scheduledAt ? new Date(c.scheduledAt).toLocaleDateString() : "Immediate"}</div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-2 inline-block ${c.status === "SENT" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{c.status}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                      <h3 className="font-bold text-sm text-[#1a1a1a] mb-5">New Email Campaign</h3>
                      <form onSubmit={sendCampaign} className="space-y-4">
                        <div><label className={label}>Subject *</label><input required placeholder="e.g. Your tickets are confirmed!" value={emailForm.subject} onChange={e => setEmailForm(f => ({ ...f, subject: e.target.value }))} className={inp} /></div>
                        <div>
                          <label className={label}>Target Audience</label>
                          <select value={emailForm.targetAudience} onChange={e => setEmailForm(f => ({ ...f, targetAudience: e.target.value }))} className={inp}>
                            <option value="ALL_REGISTRANTS">All Registrants</option>
                            <option value="TICKET_HOLDERS">Ticket Holders</option>
                            <option value="WAITLIST">Waitlist</option>
                            <option value="SPEAKERS">Speakers</option>
                            <option value="SPONSORS">Sponsors</option>
                          </select>
                        </div>
                        <div><label className={label}>Email Body *</label><textarea required placeholder="Write your email content here..." value={emailForm.body} onChange={e => setEmailForm(f => ({ ...f, body: e.target.value }))} rows={8} className={inp + " resize-none"} /></div>
                        <div><label className={label}>Schedule (leave empty to send now)</label><input type="datetime-local" value={emailForm.scheduledAt} onChange={e => setEmailForm(f => ({ ...f, scheduledAt: e.target.value }))} className={inp} /></div>
                        <button type="submit" disabled={saving} className={saveBtn}><Mail size={13} />{saving ? "Scheduling..." : "Send Campaign"}</button>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            </>
          )}

          {/* Empty state */}
          {!selectedId && !showNew && (
            <div className="flex-1 flex items-center justify-center text-center p-12">
              <div>
                <div className="w-16 h-16 bg-[#FF4747]/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><Calendar size={28} className="text-[#FF4747]" /></div>
                <h3 className="font-display font-black text-xl text-[#1a1a1a] mb-2">Select or create an event</h3>
                <p className="text-sm text-[#888] mb-6">Choose an event from the left to start editing, or create a new one.</p>
                <button onClick={() => setShowNew(true)} className="px-6 py-3 bg-[#FF4747] text-white text-sm font-bold rounded-full hover:bg-[#e03e3e] transition-colors cursor-pointer flex items-center gap-2 mx-auto">
                  <Plus size={15} /> New Event
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NewCategoryRow({ tenantId, onCreated }: { tenantId?: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await eventService.createEventCategory({ tenantId, name });
      setName(""); setOpen(false);
      onCreated();
    } catch {} finally { setSaving(false); }
  };

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)} className="text-xs text-[#FF4747] font-semibold hover:underline cursor-pointer flex items-center gap-1.5">
      <Plus size={12} /> Add new category
    </button>
  );

  return (
    <form onSubmit={create} className="flex gap-3 p-3 bg-[#fafafa] rounded-xl border border-[#f0f0f0]">
      <input autoFocus required placeholder="New category name" value={name} onChange={e => setName(e.target.value)} className="flex-1 bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#FF4747]" />
      <button type="submit" disabled={saving} className="px-4 py-2 bg-[#FF4747] text-white text-xs font-bold rounded-lg hover:bg-[#e03e3e] cursor-pointer disabled:opacity-50">{saving ? "..." : "Add"}</button>
      <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-[#888] hover:text-[#1a1a1a] cursor-pointer"><X size={14} /></button>
    </form>
  );
}
