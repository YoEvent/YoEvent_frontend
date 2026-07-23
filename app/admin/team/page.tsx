"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Plus, ChevronDown, User, X, Users, Mic, Save, Pencil, Trash2, MapPin, Star, Clock, Briefcase, Building, PlusCircle, AlertTriangle } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { useLanguage } from "@/app/context/LanguageContext";

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";
const saveBtn = "flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-50";

const toLocalISOString = (dateInput?: string | Date) => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function TeamPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const auth = getStoredAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  
  // Data lists
  const [participants, setParticipants] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [eventLocations, setEventLocations] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);

  // Filtering / UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState("ALL");
  const [selectedRoleIdFilter, setSelectedRoleIdFilter] = useState("ALL");

  // Inline forms
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");

  const [showAddOrg, setShowAddOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");

  const [showQuickSession, setShowQuickSession] = useState(false);
  const [quickSession, setQuickSession] = useState({ title: "", startTime: "", endTime: "", locationId: "" });

  // Event days (derived from the event's schedule, so only real event days are selectable)
  const [eventDays, setEventDays] = useState<{ value: string; label: string }[]>([]);

  // Availability form state
  const [availDay, setAvailDay] = useState("Monday");
  const [availStart, setAvailStart] = useState("09:00");
  const [availEnd, setAvailEnd] = useState("17:00");

  // Editing state
  const [editingParticipant, setEditingParticipant] = useState<any>(null);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);

  // Unified Form
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    roleId: "a0000000-0000-0000-0000-000000000002", // Staff member
    organizationId: "",
    jobTitle: "",
    bio: "",
    photoUrl: "",
    sessionId: "",
    locationId: "",
    eventLocationId: "",
    task: "",
    team: "",
    shiftStart: "",
    shiftEnd: "",
    hours: "",
    notes: "",
    assignmentStatus: "ACTIVE",
    availabilitySlots: [] as { id: string; day: string; startTime: string; endTime: string }[],
  });

  const formRef = useRef<HTMLFormElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // Fetch events on mount
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const list = await eventService.getMyEvents().catch(() => []);
        const filtered = (list || []).filter((e: any) => !auth?.tenantId || !e.tenantId || e.tenantId === auth.tenantId);
        setEvents(filtered);
        if (filtered.length > 0) {
          setSelectedEventId(filtered[0].eventId || filtered[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchEvents();
  }, []);

  // Fetch data on event select
  useEffect(() => {
    if (selectedEventId) {
      loadData(selectedEventId);
    }
  }, [selectedEventId]);

  // Synchronize speaker availability with assigned session
  useEffect(() => {
    if (form.sessionId) {
      const sess = sessions.find(s => (s.sessionId || s.id) === form.sessionId);
      if (sess && sess.startTime && sess.endTime) {
        const sStart = toLocalISOString(sess.startTime);
        const sEnd = toLocalISOString(sess.endTime);
        
        const dateObj = new Date(sess.startTime);
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
        const startTimeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        const endTimeStr = new Date(sess.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
        
        const room = locations.find(loc => loc.roomId === sess.roomId);
        const resolvedEventLocationId = room ? room.locationId : "";

        setForm(f => {
          const slotExists = f.availabilitySlots.some(slot => slot.day === dayName && slot.startTime === startTimeStr && slot.endTime === endTimeStr);
          const newSlots = slotExists ? f.availabilitySlots : [...f.availabilitySlots, { id: Math.random().toString(), day: dayName, startTime: startTimeStr, endTime: endTimeStr }];
          
          return {
            ...f,
            shiftStart: sStart,
            shiftEnd: sEnd,
            locationId: sess.roomId || f.locationId,
            eventLocationId: resolvedEventLocationId || f.eventLocationId,
            availabilitySlots: newSlots
          };
        });
      }
    }
  }, [form.sessionId, sessions, locations]);

  // Default the availability day picker to the first real event day once loaded
  useEffect(() => {
    if (eventDays.length > 0 && !eventDays.some(d => d.value === availDay)) {
      setAvailDay(eventDays[0].value);
    }
  }, [eventDays]);

  const loadData = async (eventId: string) => {
    setLoading(true);
    try {
      const [partsList, assignsList, sessList, locsList, orgsList, rolesList, schedList, evLocsList] = await Promise.all([
        eventService.getParticipantsByEvent(eventId).catch(() => []),
        eventService.getAssignmentsByEvent(eventId).catch(() => []),
        eventService.getSessions().catch(() => []),
        eventService.getRoomsByEvent(eventId).catch(() => []),
        eventService.getOrganizations().catch(() => []),
        eventService.getRoles().catch(() => []),
        eventService.getEventSchedules().catch(() => []),
        eventService.getEventLocations().catch(() => []),
      ]);

      setParticipants(partsList || []);
      setAssignments(assignsList || []);
      setSessions((sessList || []).filter((s: any) => (s.eventId || s.event?.eventId) === eventId));
      setLocations(locsList || []);
      setEventLocations((evLocsList || []).filter((l: any) => l.eventId === eventId || l.event?.eventId === eventId));
      setOrganizations(orgsList || []);
      setRoles(rolesList || []);

      const eventSchedules = (schedList || [])
        .filter((s: any) => (s.eventId || s.event?.eventId) === eventId)
        .sort((a: any, b: any) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());

      const seenDays = new Set<string>();
      const days: { value: string; label: string }[] = [];
      eventSchedules.forEach((s: any) => {
        const date = new Date(s.startDatetime);
        const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
        if (!seenDays.has(dayName)) {
          seenDays.add(dayName);
          days.push({ value: dayName, label: date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) });
        }
      });
      setEventDays(days);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentsForParticipant = (partId: string) => {
    return assignments.filter(a => a.eventParticipant?.id === partId);
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const created = await eventService.createRole({
        name: newRoleName,
        tenantId: auth?.tenantId || "c0000000-0000-0000-0000-000000000001"
      });
      showToast(t("adminTeam.toast.roleCreated", { name: created.name }));
      const list = await eventService.getRoles().catch(() => []);
      setRoles(list || []);
      setForm(f => ({ ...f, roleId: created.id }));
      setShowAddRole(false);
      setNewRoleName("");
    } catch {
      showToast(t("adminTeam.toast.roleCreateFailed"));
    }
  };

  const handleAddOrg = async () => {
    if (!newOrgName.trim()) return;
    try {
      const created = await eventService.createOrganization({
        name: newOrgName,
        type: "company"
      });
      showToast(t("adminTeam.toast.orgCreated", { name: created.name }));
      const list = await eventService.getOrganizations().catch(() => []);
      setOrganizations(list || []);
      setForm(f => ({ ...f, organizationId: created.id }));
      setShowAddOrg(false);
      setNewOrgName("");
    } catch {
      showToast(t("adminTeam.toast.orgCreateFailed"));
    }
  };

  const handleQuickSessionSave = async () => {
    if (!quickSession.title.trim() || !quickSession.startTime || !quickSession.endTime) {
      showToast(t("adminTeam.toast.fillSessionDetails"));
      return;
    }
    try {
      const created = await eventService.createSession({
        eventId: selectedEventId,
        title: quickSession.title,
        description: "Quick created session",
        type: "TALK",
        startTime: new Date(quickSession.startTime).toISOString(),
        endTime: new Date(quickSession.endTime).toISOString(),
        maxCapacity: 100,
        locationId: quickSession.locationId || undefined,
      });
      showToast(t("adminTeam.toast.sessionCreated"));
      const sessList = await eventService.getSessions().catch(() => []);
      setSessions((sessList || []).filter((s: any) => (s.eventId || s.event?.eventId) === selectedEventId));
      setForm(f => ({ ...f, sessionId: created.sessionId || created.id }));
      setShowQuickSession(false);
      setQuickSession({ title: "", startTime: "", endTime: "", locationId: "" });
    } catch (err: any) {
      showToast(err.message || t("adminTeam.toast.sessionCreateFailed"));
    }
  };

  const addAvailabilitySlot = () => {
    setForm(f => ({
      ...f,
      availabilitySlots: [...f.availabilitySlots, { id: Math.random().toString(), day: availDay, startTime: availStart, endTime: availEnd }]
    }));
  };

  const removeAvailabilitySlot = (id: string) => {
    setForm(f => ({
      ...f,
      availabilitySlots: f.availabilitySlots.filter(s => s.id !== id)
    }));
  };

  const saveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.email.trim() || !selectedEventId) return;
    setSaving(true);

    try {
      // 1. Create/Update Person
      const personPayload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        organizationId: form.organizationId || undefined,
        jobTitle: form.jobTitle || undefined,
        bio: form.bio || undefined,
        profilePhoto: form.photoUrl || undefined
      };

      const person = await eventService.createPerson(personPayload);

      // 2. Create/Update EventParticipant
      const participantPayload = {
        eventId: selectedEventId,
        personId: person.id,
        roleId: form.roleId,
        status: "confirmed",
        notes: form.notes || undefined,
        availability: form.availabilitySlots.length > 0 ? JSON.stringify(form.availabilitySlots) : undefined
      };

      let participantRes;
      if (editingParticipant) {
        participantRes = await eventService.updateParticipant(editingParticipant.id, participantPayload);
      } else {
        participantRes = await eventService.createParticipant(participantPayload);
      }

      // 3. Create/Update Assignment
      if (form.task.trim() || form.locationId || form.eventLocationId || form.shiftStart || form.shiftEnd || form.sessionId) {
        const assignmentPayload = {
          eventParticipantId: participantRes.id,
          locationId: form.locationId || undefined,
          eventLocationId: form.eventLocationId || undefined,
          sessionId: form.sessionId || undefined,
          task: form.task || undefined,
          team: form.team || undefined,
          shiftStart: form.shiftStart ? new Date(form.shiftStart).toISOString() : undefined,
          shiftEnd: form.shiftEnd ? new Date(form.shiftEnd).toISOString() : undefined,
          hours: form.hours ? parseFloat(form.hours) : undefined,
          status: form.assignmentStatus || "ACTIVE"
        };

        if (editingAssignment) {
          await eventService.updateAssignment(editingAssignment.id, assignmentPayload);
        } else {
          await eventService.createAssignment(assignmentPayload);
        }
      }

      showToast(editingParticipant ? t("adminTeam.toast.participantUpdated") : t("adminTeam.toast.participantRegistered"));
      setEditingParticipant(null);
      setEditingAssignment(null);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        roleId: "a0000000-0000-0000-0000-000000000002",
        organizationId: "",
        jobTitle: "",
        bio: "",
        photoUrl: "",
        sessionId: "",
        locationId: "",
        eventLocationId: "",
        task: "",
        team: "",
        shiftStart: "",
        shiftEnd: "",
        hours: "",
        notes: "",
        assignmentStatus: "ACTIVE",
        availabilitySlots: []
      });
      await loadData(selectedEventId);
    } catch (err: any) {
      showToast(err.message || t("adminTeam.toast.participantSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const removeParticipant = async (id: string) => {
    if (!confirm(t("adminTeam.toast.confirmRemove"))) return;
    try {
      // Find assignments
      const assigns = getAssignmentsForParticipant(id);
      for (const a of assigns) {
        await eventService.deleteAssignment(a.id);
      }
      await eventService.deleteParticipant(id);
      showToast(t("adminTeam.toast.participantRemoved"));
      await loadData(selectedEventId);
    } catch {
      showToast(t("adminTeam.toast.participantRemoveFailed"));
    }
  };

  // Availability validation feedback
  const conflictWarning = checkAvailabilityConflict(form.availabilitySlots, form.sessionId);

  function checkAvailabilityConflict(slots: any[], sessId: string) {
    if (!sessId) return null;
    const s = sessions.find(x => (x.sessionId || x.id) === sessId);
    if (!s || !s.startTime || !s.endTime) return null;
    
    const sessDay = new Date(s.startTime).toLocaleDateString("en-US", { weekday: "long" });
    const sessStart = new Date(s.startTime).toTimeString().slice(0, 5);
    const sessEnd = new Date(s.endTime).toTimeString().slice(0, 5);
    
    const isCovered = slots.some(slot => {
      if (slot.day !== sessDay && slot.day !== "All Days") return false;
      return slot.startTime <= sessStart && slot.endTime >= sessEnd;
    });
    
    if (!isCovered) {
      return t("adminTeam.form.conflictWarning", { day: sessDay, start: sessStart, end: sessEnd });
    }
    return null;
  }

  // Generic Filtered List
  const filteredParticipants = participants.filter(p => {
    if (selectedRoleIdFilter !== "ALL" && p.role?.id !== selectedRoleIdFilter) return false;
    if (selectedLocationId !== "ALL") {
      const assigns = getAssignmentsForParticipant(p.id);
      return assigns.some(a => a.location?.roomId === selectedLocationId);
    }
    return true;
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

      <div className="ml-[220px] flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-[#e5e7eb] px-8 py-5 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="font-display font-black text-xl text-[#1a1a1a]">{t("adminTeam.header.title")}</h1>
            <p className="text-xs text-[#888] mt-0.5">{t("adminTeam.header.subtitle")}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative w-48">
              <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)} className={inp + " py-1.5 pr-8"}>
                {events.map(ev => (
                  <option key={ev.eventId || ev.id} value={ev.eventId || ev.id}>{ev.title}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] pointer-events-none" />
            </div>

            <div className="relative w-48">
              <select value={selectedLocationId} onChange={e => setSelectedLocationId(e.target.value)} className={inp + " py-1.5 pr-8"}>
                <option value="ALL">{t("adminTeam.filters.allRooms")}</option>
                {locations.map(loc => (
                  <option key={loc.roomId} value={loc.roomId}>{loc.name} {loc.roomNumber ? `(${loc.roomNumber})` : ""}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] pointer-events-none" />
            </div>
          </div>
        </header>

        <main className="p-8 max-w-[1400px]">
          {/* Header Filter by Role */}
          <div className="flex gap-2 mb-6 items-center flex-wrap">
            <span className="text-xs text-[#888] font-bold uppercase tracking-wider mr-2">{t("adminTeam.filters.filterRoleLabel")}</span>
            <button onClick={() => setSelectedRoleIdFilter("ALL")} className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${selectedRoleIdFilter === "ALL" ? "bg-[#1a1a1a] text-white border-black" : "bg-white text-[#555] border-[#e5e7eb] hover:bg-stone-50"}`}>{t("adminTeam.filters.all")}</button>
            {roles.map(role => (
              <button key={role.id} onClick={() => setSelectedRoleIdFilter(role.id)} className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${selectedRoleIdFilter === role.id ? "bg-[#FF4747] text-white border-[#FF4747]" : "bg-white text-[#555] border-[#e5e7eb] hover:bg-stone-50"}`}>{role.name}</button>
            ))}
          </div>

          <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
            {/* List */}
            <div>
              <h2 className="font-display font-bold text-[#1a1a1a] mb-5">{t("adminTeam.list.registeredParticipants", { count: filteredParticipants.length })}</h2>
              
              {loading ? (
                <div className="grid md:grid-cols-2 gap-5">
                  {[1, 2, 3, 4].map(i => <div key={i} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 animate-pulse h-40" />)}
                </div>
              ) : filteredParticipants.length === 0 ? (
                <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-14 text-center text-[#aaa]">
                  <User size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">{t("adminTeam.list.emptyState")}</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-5">
                  {filteredParticipants.map(p => {
                    const assigns = getAssignmentsForParticipant(p.id);
                    let slots: any[] = [];
                    try {
                      if (p.availability) {
                        slots = JSON.parse(p.availability);
                      }
                    } catch {}

                    return (
                      <div key={p.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 relative group hover:border-[#FF4747]/30 hover:shadow-md transition-all flex flex-col justify-between">
                        <div className="absolute top-3 right-3 flex gap-1">
                          <button onClick={() => {
                            setEditingParticipant(p);
                            const ass = assigns[0] || null;
                            setEditingAssignment(ass);
                            setForm({
                              firstName: p.person?.firstName || "",
                              lastName: p.person?.lastName || "",
                              email: p.person?.email || "",
                              phone: p.person?.phone || "",
                              roleId: p.role?.id || "a0000000-0000-0000-0000-000000000002",
                              organizationId: p.person?.organization?.id || "",
                              jobTitle: p.person?.jobTitle || "",
                              bio: p.person?.bio || "",
                              photoUrl: p.person?.profilePhoto || "",
                              sessionId: ass?.sessionId || "",
                              locationId: ass?.location?.roomId || "",
                              eventLocationId: ass?.eventLocationId || "",
                              task: ass?.task || "",
                              team: ass?.team || "",
                              shiftStart: ass?.shiftStart ? ass.shiftStart.substring(0, 16) : "",
                              shiftEnd: ass?.shiftEnd ? ass.shiftEnd.substring(0, 16) : "",
                              hours: ass?.hours?.toString() || "",
                              notes: p.notes || "",
                              assignmentStatus: ass?.status || "ACTIVE",
                              availabilitySlots: slots
                            });
                            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }} className="w-7 h-7 bg-[#fafafa] border border-[#f0f0f0] rounded-full flex items-center justify-center text-[#aaa] hover:bg-stone-100 hover:text-[#1a1a1a] transition-all cursor-pointer">
                            <Pencil size={11} />
                          </button>
                          <button onClick={() => removeParticipant(p.id)} className="w-7 h-7 bg-[#fafafa] border border-[#f0f0f0] rounded-full flex items-center justify-center text-[#aaa] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all cursor-pointer">
                            <X size={12} />
                          </button>
                        </div>

                        <div className="flex flex-col items-center text-center">
                          {p.person?.profilePhoto ? (
                            <img src={p.person.profilePhoto} alt={p.person.firstName} className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-[#f0f0f0]" />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-[#FF4747]/10 flex items-center justify-center text-[#FF4747] font-black text-xl mb-3">{(p.person?.firstName || "?").charAt(0)}</div>
                          )}
                          <div className="font-bold text-sm text-[#1a1a1a]">{p.person?.firstName} {p.person?.lastName}</div>
                          <div className="text-[9px] text-[#FF4747] font-bold bg-red-50 border border-red-100 rounded-full px-2.5 py-0.5 mt-1 tracking-wider uppercase">{p.role?.name || t("adminTeam.list.staffFallback")}</div>
                          
                          {p.person?.jobTitle && <div className="text-xs text-gray-500 mt-1">{p.person.jobTitle}</div>}
                          {p.person?.organization && <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><Building size={10} />{p.person.organization.name}</div>}

                          <div className="w-full mt-4 text-left border-t border-[#f0f0f0] pt-3 space-y-2">
                            <div className="text-[11px] text-[#888] flex items-center gap-1.5"><Briefcase size={12} /> {p.person?.email}</div>
                            
                            {/* Availability list */}
                            {slots.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[9px] font-bold text-[#888] uppercase tracking-wider">{t("adminTeam.list.availabilityLabel")}</div>
                                <div className="flex flex-wrap gap-1">
                                  {slots.map((sl: any, idx: number) => (
                                    <span key={idx} className="bg-green-50 text-green-700 border border-green-200 text-[8px] font-bold rounded px-1.5 py-0.5">
                                      {sl.day.slice(0, 3)}: {sl.startTime}-{sl.endTime}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Assignments details */}
                            {assigns.length > 0 ? (
                              assigns.map((ass, idx) => (
                                <div key={idx} className="bg-stone-50 border border-[#e5e7eb] rounded-xl p-2.5 space-y-1 text-xs">
                                  {ass.sessionId && <div className="text-red-500 font-bold flex items-center gap-1"><Mic size={10} /> {t("adminTeam.list.sessionPrefix", { title: sessions.find(s => (s.sessionId || s.id) === ass.sessionId)?.title || t("adminTeam.list.presentationFallback") })}</div>}
                                  {(ass.eventLocationName || ass.locationName) && (
                                     <div className="text-blue-600 font-semibold flex items-center gap-1">
                                       <MapPin size={10} />
                                       <span>
                                         {ass.eventLocationName || ""}
                                         {ass.eventLocationName && ass.locationName && " — "}
                                         {ass.locationName || ""}
                                       </span>
                                     </div>
                                   )}
                                  {ass.task && <div className="text-[#1a1a1a] font-medium">{t("adminTeam.list.taskPrefix", { task: ass.task })}</div>}
                                  {(ass.shiftStart || ass.shiftEnd) && (
                                    <div className="text-[9px] text-[#888] flex items-center gap-1"><Clock size={10} /> {t("adminTeam.list.shiftPrefix", { start: ass.shiftStart ? new Date(ass.shiftStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "", end: ass.shiftEnd ? new Date(ass.shiftEnd).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : "" })}</div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-[10px] text-[#aaa] italic text-center py-1">{t("adminTeam.list.noShifts")}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Unified Form */}
            <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-[#1a1a1a]">{editingParticipant ? t("adminTeam.form.editTitle") : t("adminTeam.form.addTitle")}</h3>
                {editingParticipant && (
                  <button type="button" onClick={() => {
                    setEditingParticipant(null);
                    setEditingAssignment(null);
                    setForm({
                      firstName: "",
                      lastName: "",
                      email: "",
                      phone: "",
                      roleId: "a0000000-0000-0000-0000-000000000002",
                      organizationId: "",
                      jobTitle: "",
                      bio: "",
                      photoUrl: "",
                      sessionId: "",
                      locationId: "",
                      task: "",
                      team: "",
                      shiftStart: "",
                      shiftEnd: "",
                      hours: "",
                      notes: "",
                      assignmentStatus: "ACTIVE",
                      availabilitySlots: []
                    });
                  }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">{t("adminTeam.form.cancelEdit")}</button>
                )}
              </div>

              <form ref={formRef} onSubmit={saveParticipant} className="space-y-4">
                {/* Core Person Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={label}>{t("adminTeam.form.firstName")}</label><input required placeholder={t("adminTeam.form.firstNamePlaceholder")} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className={inp} /></div>
                  <div><label className={label}>{t("adminTeam.form.lastName")}</label><input placeholder={t("adminTeam.form.lastNamePlaceholder")} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className={inp} /></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className={label}>{t("adminTeam.form.email")}</label><input required type="email" placeholder={t("adminTeam.form.emailPlaceholder")} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} /></div>
                  <div><label className={label}>{t("adminTeam.form.phone")}</label><input placeholder={t("adminTeam.form.phonePlaceholder")} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inp} /></div>
                </div>

                {/* Role with Inline Create */}
                <div className="border-t border-[#f0f0f0] pt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={label}>{t("adminTeam.form.roleLabel")}</label>
                    <button type="button" onClick={() => setShowAddRole(!showAddRole)} className="text-[10px] font-bold text-[#FF4747] hover:underline cursor-pointer">{t("adminTeam.form.addRole")}</button>
                  </div>

                  {showAddRole && (
                    <div className="flex gap-2 mb-3 bg-[#fafafa] p-3 rounded-xl border border-[#e5e7eb]">
                      <input placeholder={t("adminTeam.form.newRolePlaceholder")} value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className={inp + " py-1.5"} />
                      <button type="button" onClick={handleAddRole} className="px-3 py-1.5 bg-[#FF4747] text-white text-xs font-bold rounded-lg hover:bg-[#e03e3e]">{t("adminTeam.form.save")}</button>
                    </div>
                  )}

                  <select value={form.roleId} onChange={e => setForm(f => ({ ...f, roleId: e.target.value }))} className={inp}>
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* Job / Bio / Org */}
                <div className="border-t border-[#f0f0f0] pt-4 space-y-4">
                  <h4 className="text-[10px] font-bold text-[#FF4747] uppercase tracking-wider">{t("adminTeam.form.jobMetadataHeading")}</h4>
                  <div><label className={label}>{t("adminTeam.form.jobTitleLabel")}</label><input placeholder={t("adminTeam.form.jobTitlePlaceholder")} value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} className={inp} /></div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className={label}>{t("adminTeam.form.affiliatedCompany")}</label>
                      <button type="button" onClick={() => setShowAddOrg(!showAddOrg)} className="text-[10px] font-bold text-[#FF4747] hover:underline cursor-pointer">{t("adminTeam.form.addOrg")}</button>
                    </div>

                    {showAddOrg && (
                      <div className="flex gap-2 mb-3 bg-[#fafafa] p-3 rounded-xl border border-[#e5e7eb]">
                        <input placeholder={t("adminTeam.form.newOrgNamePlaceholder")} value={newOrgName} onChange={e => setNewOrgName(e.target.value)} className={inp + " py-1.5"} />
                        <button type="button" onClick={handleAddOrg} className="px-3 py-1.5 bg-[#FF4747] text-white text-xs font-bold rounded-lg hover:bg-[#e03e3e]">{t("adminTeam.form.save")}</button>
                      </div>
                    )}

                    <select value={form.organizationId} onChange={e => setForm(f => ({ ...f, organizationId: e.target.value }))} className={inp}>
                      <option value="">{t("adminTeam.form.selectOrganization")}</option>
                      {organizations.map(o => (
                        <option key={o.id} value={o.id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                  <div><label className={label}>{t("adminTeam.form.bioLabel")}</label><textarea placeholder={t("adminTeam.form.bioPlaceholder")} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={2} className={inp + " resize-none"} /></div>
                </div>

                {/* Generic Availability Scheduler */}
                <div className="border-t border-[#f0f0f0] pt-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-[#FF4747] uppercase tracking-wider">{t("adminTeam.form.availabilitySchedulerHeading")}</h4>

                  <div className="flex gap-2 flex-wrap items-end bg-[#fafafa] border border-[#e5e7eb] rounded-2xl p-3.5">
                    <div className="flex-1 min-w-[120px]">
                      <label className={label}>{t("adminTeam.form.dayLabel")}</label>
                      <select value={availDay} onChange={e => setAvailDay(e.target.value)} className={inp + " py-1.5"}>
                        {eventDays.length > 0 ? (
                          eventDays.map(d => <option key={d.value} value={d.value}>{d.label}</option>)
                        ) : (
                          <option value="Monday">{t("adminTeam.days.monday")}</option>
                        )}
                        <option value="All Days">{t("adminTeam.days.allDays")}</option>
                      </select>
                    </div>
                    <div className="w-[80px]">
                      <label className={label}>{t("adminTeam.form.startLabel")}</label>
                      <input type="time" value={availStart} onChange={e => setAvailStart(e.target.value)} className={inp + " py-1.5 px-2"} />
                    </div>
                    <div className="w-[80px]">
                      <label className={label}>{t("adminTeam.form.endLabel")}</label>
                      <input type="time" value={availEnd} onChange={e => setAvailEnd(e.target.value)} className={inp + " py-1.5 px-2"} />
                    </div>
                    <button type="button" onClick={addAvailabilitySlot} className="px-3.5 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors h-[38px] cursor-pointer">
                      {t("adminTeam.form.addSlot")}
                    </button>
                  </div>

                  {form.availabilitySlots.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 border border-[#e5e7eb] rounded-xl p-3 bg-white">
                      {form.availabilitySlots.map(s => (
                        <div key={s.id} className="flex items-center gap-1.5 bg-[#f0f9f4] text-green-700 border border-green-200 rounded-lg px-2.5 py-1 text-xs font-semibold">
                          <span>{s.day}: {s.startTime}-{s.endTime}</span>
                          <button type="button" onClick={() => removeAvailabilitySlot(s.id)} className="text-[#888] hover:text-red-500 font-bold">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Session Assignment with Inline Create */}
                <div className="border-t border-[#f0f0f0] pt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-[#FF4747] uppercase tracking-wider">{t("adminTeam.form.sessionRoomHeading")}</h4>
                    <button type="button" onClick={() => setShowQuickSession(!showQuickSession)} className="text-[10px] font-bold text-[#FF4747] hover:underline cursor-pointer">{t("adminTeam.form.quickCreateSession")}</button>
                  </div>

                  {showQuickSession && (
                    <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-2xl p-4 space-y-3">
                      <div>
                        <label className={label}>{t("adminTeam.form.sessionTitleLabel")}</label>
                        <input placeholder={t("adminTeam.form.sessionTitlePlaceholder")} value={quickSession.title} onChange={e => setQuickSession(q => ({ ...q, title: e.target.value }))} className={inp + " py-1.5"} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={label}>{t("adminTeam.form.startDateTime")}</label>
                          <input type="datetime-local" value={quickSession.startTime} onChange={e => setQuickSession(q => ({ ...q, startTime: e.target.value }))} className={inp + " py-1.5"} />
                        </div>
                        <div>
                          <label className={label}>{t("adminTeam.form.endDateTime")}</label>
                          <input type="datetime-local" value={quickSession.endTime} onChange={e => setQuickSession(q => ({ ...q, endTime: e.target.value }))} className={inp + " py-1.5"} />
                        </div>
                      </div>
                      <div>
                        <label className={label}>{t("adminTeam.form.roomLocationLabel")}</label>
                        <select value={quickSession.locationId} onChange={e => setQuickSession(q => ({ ...q, locationId: e.target.value }))} className={inp + " py-1.5"}>
                          <option value="">{t("adminTeam.form.selectRoom")}</option>
                          {locations.map(loc => (
                            <option key={loc.roomId} value={loc.roomId}>{loc.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button type="button" onClick={() => setShowQuickSession(false)} className="px-3 py-1.5 border border-[#e5e7eb] rounded-lg text-xs font-semibold">{t("adminTeam.form.cancel")}</button>
                        <button type="button" onClick={handleQuickSessionSave} className="px-3 py-1.5 bg-[#FF4747] text-white rounded-lg text-xs font-bold">{t("adminTeam.form.create")}</button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={label}>{t("adminTeam.form.assignedSession")}</label>
                    <select value={form.sessionId} onChange={e => setForm(f => ({ ...f, sessionId: e.target.value }))} className={inp}>
                      <option value="">{t("adminTeam.form.selectSession")}</option>
                      {sessions.map(s => (
                        <option key={s.sessionId || s.id} value={s.sessionId || s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>Event Location</label>
                      <select value={form.eventLocationId} onChange={e => setForm(f => ({ ...f, eventLocationId: e.target.value, locationId: "" }))} className={inp}>
                        <option value="">— Select Location —</option>
                        {eventLocations.map(el => (
                          <option key={el.locationId || el.id} value={el.locationId || el.id}>
                            {el.venueName || el.virtualPlatform || "Unnamed Location"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={label}>Room / Hall</label>
                      <select value={form.locationId} onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))} className={inp}>
                        <option value="">— Select Room —</option>
                        {locations
                          .filter(loc => !form.eventLocationId || loc.locationId === form.eventLocationId)
                          .map(loc => (
                            <option key={loc.roomId} value={loc.roomId}>
                              {loc.name} {loc.roomNumber ? `(${loc.roomNumber})` : ""}
                            </option>
                          ))
                        }
                      </select>
                    </div>
                  </div>

                  {conflictWarning && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3.5 flex items-start gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <span>{conflictWarning}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={label}>{t("adminTeam.form.shiftTaskNote")}</label><input placeholder={t("adminTeam.form.shiftTaskPlaceholder")} value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} className={inp} /></div>
                    <div>
                      <label className={label}>{t("adminTeam.form.assignmentStatus")}</label>
                      <select value={form.assignmentStatus} onChange={e => setForm(f => ({ ...f, assignmentStatus: e.target.value }))} className={inp}>
                        <option value="ACTIVE">{t("adminTeam.form.assignmentStatusActive")}</option>
                        <option value="ENDED">{t("adminTeam.form.assignmentStatusEnded")}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Profile Photo */}
                <div className="border-t border-[#f0f0f0] pt-4">
                  <label className={label}>{t("adminTeam.form.profilePhoto")}</label>
                  <label className="flex items-center gap-3 border-2 border-dashed border-[#e5e7eb] rounded-2xl p-4 cursor-pointer hover:border-[#FF4747] transition-colors group">
                    {form.photoUrl ? (
                      <img src={form.photoUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#fafafa] border border-[#e5e7eb] flex items-center justify-center shrink-0">
                        <User size={18} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                      </div>
                    )}
                    <span className="text-sm text-[#888] group-hover:text-[#FF4747] transition-colors">{form.photoUrl ? t("adminTeam.form.clickToChange") : t("adminTeam.form.uploadPhoto")}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        setSaving(true);
                        const res = await eventService.uploadImage(f);
                        setForm(f => ({ ...f, photoUrl: res.url }));
                        showToast(t("adminTeam.toast.photoUploaded"));
                      } catch (err: any) {
                        showToast(t("adminTeam.toast.photoUploadFailed", { error: err.message || err }));
                      } finally {
                        setSaving(false);
                      }
                    }} />
                  </label>
                </div>

                <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center py-3 mt-4"}>
                  <Plus size={15} />{saving ? t("adminTeam.form.registering") : (editingParticipant ? t("adminTeam.form.saveChanges") : t("adminTeam.form.registerParticipant"))}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
