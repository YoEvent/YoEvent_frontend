"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Plus, ChevronDown, User, X, Users, Mic, Save, Pencil, Trash2, MapPin, Star, Clock, Briefcase, Building, PlusCircle, AlertTriangle } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

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
  const auth = getStoredAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  
  // Data lists
  const [participants, setParticipants] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
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
  
  const [showQuickSession, setShowQuickSession] = useState(false);
  const [quickSession, setQuickSession] = useState({ title: "", startTime: "", endTime: "", locationId: "" });

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
    newCompanyName: "",
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
        
        setForm(f => {
          const slotExists = f.availabilitySlots.some(slot => slot.day === dayName && slot.startTime === startTimeStr && slot.endTime === endTimeStr);
          const newSlots = slotExists ? f.availabilitySlots : [...f.availabilitySlots, { id: Math.random().toString(), day: dayName, startTime: startTimeStr, endTime: endTimeStr }];
          
          return {
            ...f,
            shiftStart: sStart,
            shiftEnd: sEnd,
            availabilitySlots: newSlots
          };
        });
      }
    }
  }, [form.sessionId, sessions]);

  const loadData = async (eventId: string) => {
    setLoading(true);
    try {
      const [partsList, assignsList, sessList, locsList, orgsList, rolesList] = await Promise.all([
        eventService.getParticipantsByEvent(eventId).catch(() => []),
        eventService.getAssignmentsByEvent(eventId).catch(() => []),
        eventService.getSessions().catch(() => []),
        eventService.getRoomsByEvent(eventId).catch(() => []),
        eventService.getOrganizations().catch(() => []),
        eventService.getRoles().catch(() => []),
      ]);

      setParticipants(partsList || []);
      setAssignments(assignsList || []);
      setSessions((sessList || []).filter((s: any) => (s.eventId || s.event?.eventId) === eventId));
      setLocations(locsList || []);
      setOrganizations(orgsList || []);
      setRoles(rolesList || []);
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
      showToast(`Role "${created.name}" created!`);
      const list = await eventService.getRoles().catch(() => []);
      setRoles(list || []);
      setForm(f => ({ ...f, roleId: created.id }));
      setShowAddRole(false);
      setNewRoleName("");
    } catch {
      showToast("Failed to create role");
    }
  };

  const handleQuickSessionSave = async () => {
    if (!quickSession.title.trim() || !quickSession.startTime || !quickSession.endTime) {
      showToast("Fill in all session details");
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
      showToast("Session created!");
      const sessList = await eventService.getSessions().catch(() => []);
      setSessions((sessList || []).filter((s: any) => (s.eventId || s.event?.eventId) === selectedEventId));
      setForm(f => ({ ...f, sessionId: created.sessionId || created.id }));
      setShowQuickSession(false);
      setQuickSession({ title: "", startTime: "", endTime: "", locationId: "" });
    } catch (err: any) {
      showToast(err.message || "Failed to create session");
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
      // 1. Resolve organization if any
      let finalOrgId = form.organizationId;
      if (form.newCompanyName.trim()) {
        const org = await eventService.createOrganization({
          name: form.newCompanyName,
          type: "company"
        });
        finalOrgId = org.id;
      }

      // 2. Create/Update Person
      const personPayload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        organizationId: finalOrgId || undefined,
        jobTitle: form.jobTitle || undefined,
        bio: form.bio || undefined,
        profilePhoto: form.photoUrl || undefined
      };

      const person = await eventService.createPerson(personPayload);

      // 3. Create/Update EventParticipant
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

      // 4. Create/Update Assignment
      if (form.task.trim() || form.locationId || form.shiftStart || form.shiftEnd || form.sessionId) {
        const assignmentPayload = {
          eventParticipantId: participantRes.id,
          locationId: form.locationId || undefined,
          sessionId: form.sessionId || undefined,
          task: form.task || undefined,
          team: form.team || undefined,
          shiftStart: form.shiftStart ? new Date(form.shiftStart).toISOString() : undefined,
          shiftEnd: form.shiftEnd ? new Date(form.shiftEnd).toISOString() : undefined,
          hours: form.hours ? parseFloat(form.hours) : undefined
        };

        if (editingAssignment) {
          await eventService.updateAssignment(editingAssignment.id, assignmentPayload);
        } else {
          await eventService.createAssignment(assignmentPayload);
        }
      }

      showToast(editingParticipant ? "Participant updated!" : "Participant registered!");
      setEditingParticipant(null);
      setEditingAssignment(null);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        roleId: "a0000000-0000-0000-0000-000000000002",
        organizationId: "",
        newCompanyName: "",
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
        availabilitySlots: []
      });
      await loadData(selectedEventId);
    } catch (err: any) {
      showToast(err.message || "Failed to save participant.");
    } finally {
      setSaving(false);
    }
  };

  const removeParticipant = async (id: string) => {
    if (!confirm("Are you sure you want to remove this participant?")) return;
    try {
      // Find assignments
      const assigns = getAssignmentsForParticipant(id);
      for (const a of assigns) {
        await eventService.deleteAssignment(a.id);
      }
      await eventService.deleteParticipant(id);
      showToast("Participant removed!");
      await loadData(selectedEventId);
    } catch {
      showToast("Failed to remove participant.");
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
      return `Warning: Assigned session runs on ${sessDay} from ${sessStart} to ${sessEnd}. Speaker's availability profile does not cover this slot.`;
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
            <h1 className="font-display font-black text-xl text-[#1a1a1a]">Event Participants Manager</h1>
            <p className="text-xs text-[#888] mt-0.5">Manage crew, speakers, performers, and scheduling availability.</p>
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
                <option value="ALL">All Rooms</option>
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
            <span className="text-xs text-[#888] font-bold uppercase tracking-wider mr-2">Filter Role:</span>
            <button onClick={() => setSelectedRoleIdFilter("ALL")} className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${selectedRoleIdFilter === "ALL" ? "bg-[#1a1a1a] text-white border-black" : "bg-white text-[#555] border-[#e5e7eb] hover:bg-stone-50"}`}>All</button>
            {roles.map(role => (
              <button key={role.id} onClick={() => setSelectedRoleIdFilter(role.id)} className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${selectedRoleIdFilter === role.id ? "bg-[#FF4747] text-white border-[#FF4747]" : "bg-white text-[#555] border-[#e5e7eb] hover:bg-stone-50"}`}>{role.name}</button>
            ))}
          </div>

          <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
            {/* List */}
            <div>
              <h2 className="font-display font-bold text-[#1a1a1a] mb-5">Registered Participants ({filteredParticipants.length})</h2>
              
              {loading ? (
                <div className="grid md:grid-cols-2 gap-5">
                  {[1, 2, 3, 4].map(i => <div key={i} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 animate-pulse h-40" />)}
                </div>
              ) : filteredParticipants.length === 0 ? (
                <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-14 text-center text-[#aaa]">
                  <User size={36} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No participants registered under this filter.</p>
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
                              newCompanyName: "",
                              jobTitle: p.person?.jobTitle || "",
                              bio: p.person?.bio || "",
                              photoUrl: p.person?.profilePhoto || "",
                              sessionId: ass?.sessionId || "",
                              locationId: ass?.location?.roomId || "",
                              task: ass?.task || "",
                              team: ass?.team || "",
                              shiftStart: ass?.shiftStart ? ass.shiftStart.substring(0, 16) : "",
                              shiftEnd: ass?.shiftEnd ? ass.shiftEnd.substring(0, 16) : "",
                              hours: ass?.hours?.toString() || "",
                              notes: p.notes || "",
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
                          <div className="text-[9px] text-[#FF4747] font-bold bg-red-50 border border-red-100 rounded-full px-2.5 py-0.5 mt-1 tracking-wider uppercase">{p.role?.name || "Staff"}</div>
                          
                          {p.person?.jobTitle && <div className="text-xs text-gray-500 mt-1">{p.person.jobTitle}</div>}
                          {p.person?.organization && <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1"><Building size={10} />{p.person.organization.name}</div>}

                          <div className="w-full mt-4 text-left border-t border-[#f0f0f0] pt-3 space-y-2">
                            <div className="text-[11px] text-[#888] flex items-center gap-1.5"><Briefcase size={12} /> {p.person?.email}</div>
                            
                            {/* Availability list */}
                            {slots.length > 0 && (
                              <div className="space-y-1">
                                <div className="text-[9px] font-bold text-[#888] uppercase tracking-wider">Availability:</div>
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
                                  {ass.sessionId && <div className="text-red-500 font-bold flex items-center gap-1"><Mic size={10} /> Session: {sessions.find(s => (s.sessionId || s.id) === ass.sessionId)?.title || "Presentation"}</div>}
                                  {ass.location && <div className="text-blue-600 font-semibold flex items-center gap-1"><MapPin size={10} /> Room: {ass.location.name}</div>}
                                  {ass.task && <div className="text-[#1a1a1a] font-medium">Task/Notes: {ass.task}</div>}
                                  {(ass.shiftStart || ass.shiftEnd) && (
                                    <div className="text-[9px] text-[#888] flex items-center gap-1"><Clock size={10} /> Shift: {ass.shiftStart ? new Date(ass.shiftStart).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""} - {ass.shiftEnd ? new Date(ass.shiftEnd).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ""}</div>
                                  )}
                                </div>
                              ))
                            ) : (
                              <div className="text-[10px] text-[#aaa] italic text-center py-1">No active shifts scheduled</div>
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
                <h3 className="font-display font-bold text-[#1a1a1a]">{editingParticipant ? "Edit Participant" : "Add Participant"}</h3>
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
                      newCompanyName: "",
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
                      availabilitySlots: []
                    });
                  }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                )}
              </div>

              <form ref={formRef} onSubmit={saveParticipant} className="space-y-4">
                {/* Core Person Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={label}>First Name *</label><input required placeholder="Alice" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className={inp} /></div>
                  <div><label className={label}>Last Name</label><input placeholder="Smith" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className={inp} /></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={label}>Email *</label><input required type="email" placeholder="alice@yoevent.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} /></div>
                  <div><label className={label}>Phone</label><input placeholder="+1 (555) 012-3456" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inp} /></div>
                </div>

                {/* Role with Inline Create */}
                <div className="border-t border-[#f0f0f0] pt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className={label}>Participant Role / Level *</label>
                    <button type="button" onClick={() => setShowAddRole(!showAddRole)} className="text-[10px] font-bold text-[#FF4747] hover:underline cursor-pointer">+ Add Role</button>
                  </div>
                  
                  {showAddRole && (
                    <div className="flex gap-2 mb-3 bg-[#fafafa] p-3 rounded-xl border border-[#e5e7eb]">
                      <input placeholder="e.g. Performer" value={newRoleName} onChange={e => setNewRoleName(e.target.value)} className={inp + " py-1.5"} />
                      <button type="button" onClick={handleAddRole} className="px-3 py-1.5 bg-[#FF4747] text-white text-xs font-bold rounded-lg hover:bg-[#e03e3e]">Save</button>
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
                  <h4 className="text-[10px] font-bold text-[#FF4747] uppercase tracking-wider">Job / Company Metadata</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={label}>Job Title / Caption</label><input placeholder="e.g. Panelist" value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} className={inp} /></div>
                    <div>
                      <label className={label}>Affiliated Company</label>
                      <select value={form.organizationId} onChange={e => setForm(f => ({ ...f, organizationId: e.target.value }))} className={inp}>
                        <option value="">— Select Organization —</option>
                        {organizations.map(o => (
                          <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={label}>Or Create New Organization Name</label>
                    <input placeholder="e.g. OpenAI" value={form.newCompanyName} onChange={e => setForm(f => ({ ...f, newCompanyName: e.target.value }))} className={inp} />
                  </div>
                  <div><label className={label}>Bio / Description</label><textarea placeholder="Brief notes or speaker biography..." value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={2} className={inp + " resize-none"} /></div>
                </div>

                {/* Generic Availability Scheduler */}
                <div className="border-t border-[#f0f0f0] pt-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-[#FF4747] uppercase tracking-wider">Availability Scheduler</h4>
                  
                  <div className="flex gap-2 flex-wrap items-end bg-[#fafafa] border border-[#e5e7eb] rounded-2xl p-3.5">
                    <div className="flex-1 min-w-[120px]">
                      <label className={label}>Day</label>
                      <select value={availDay} onChange={e => setAvailDay(e.target.value)} className={inp + " py-1.5"}>
                        <option value="Monday">Monday</option>
                        <option value="Tuesday">Tuesday</option>
                        <option value="Wednesday">Wednesday</option>
                        <option value="Thursday">Thursday</option>
                        <option value="Friday">Friday</option>
                        <option value="Saturday">Saturday</option>
                        <option value="Sunday">Sunday</option>
                        <option value="All Days">All Days</option>
                      </select>
                    </div>
                    <div className="w-[80px]">
                      <label className={label}>Start</label>
                      <input type="time" value={availStart} onChange={e => setAvailStart(e.target.value)} className={inp + " py-1.5 px-2"} />
                    </div>
                    <div className="w-[80px]">
                      <label className={label}>End</label>
                      <input type="time" value={availEnd} onChange={e => setAvailEnd(e.target.value)} className={inp + " py-1.5 px-2"} />
                    </div>
                    <button type="button" onClick={addAvailabilitySlot} className="px-3.5 py-2 bg-black text-white rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors h-[38px] cursor-pointer">
                      + Add
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
                    <h4 className="text-[10px] font-bold text-[#FF4747] uppercase tracking-wider">Session & room scheduling</h4>
                    <button type="button" onClick={() => setShowQuickSession(!showQuickSession)} className="text-[10px] font-bold text-[#FF4747] hover:underline cursor-pointer">+ Quick Create Session</button>
                  </div>

                  {showQuickSession && (
                    <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-2xl p-4 space-y-3">
                      <div>
                        <label className={label}>Session Title</label>
                        <input placeholder="e.g. AI panel debate" value={quickSession.title} onChange={e => setQuickSession(q => ({ ...q, title: e.target.value }))} className={inp + " py-1.5"} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={label}>Start Date/Time</label>
                          <input type="datetime-local" value={quickSession.startTime} onChange={e => setQuickSession(q => ({ ...q, startTime: e.target.value }))} className={inp + " py-1.5"} />
                        </div>
                        <div>
                          <label className={label}>End Date/Time</label>
                          <input type="datetime-local" value={quickSession.endTime} onChange={e => setQuickSession(q => ({ ...q, endTime: e.target.value }))} className={inp + " py-1.5"} />
                        </div>
                      </div>
                      <div>
                        <label className={label}>Room Location</label>
                        <select value={quickSession.locationId} onChange={e => setQuickSession(q => ({ ...q, locationId: e.target.value }))} className={inp + " py-1.5"}>
                          <option value="">— Select Room —</option>
                          {locations.map(loc => (
                            <option key={loc.roomId} value={loc.roomId}>{loc.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex gap-2 justify-end pt-1">
                        <button type="button" onClick={() => setShowQuickSession(false)} className="px-3 py-1.5 border border-[#e5e7eb] rounded-lg text-xs font-semibold">Cancel</button>
                        <button type="button" onClick={handleQuickSessionSave} className="px-3 py-1.5 bg-[#FF4747] text-white rounded-lg text-xs font-bold">Create</button>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className={label}>Assigned Session</label>
                    <select value={form.sessionId} onChange={e => setForm(f => ({ ...f, sessionId: e.target.value }))} className={inp}>
                      <option value="">— Select Session —</option>
                      {sessions.map(s => (
                        <option key={s.sessionId || s.id} value={s.sessionId || s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>

                  {conflictWarning && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl p-3.5 flex items-start gap-2">
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <span>{conflictWarning}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>Room Location Override</label>
                      <select value={form.locationId} onChange={e => setForm(f => ({ ...f, locationId: e.target.value }))} className={inp}>
                        <option value="">— Select Room —</option>
                        {locations.map(loc => (
                          <option key={loc.roomId} value={loc.roomId}>{loc.name}</option>
                        ))}
                      </select>
                    </div>
                    <div><label className={label}>Shift Task / Note</label><input placeholder="e.g. Presenter" value={form.task} onChange={e => setForm(f => ({ ...f, task: e.target.value }))} className={inp} /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={label}>Shift Start Override</label><input type="datetime-local" value={form.shiftStart} onChange={e => setForm(f => ({ ...f, shiftStart: e.target.value }))} className={inp} /></div>
                    <div><label className={label}>Shift End Override</label><input type="datetime-local" value={form.shiftEnd} onChange={e => setForm(f => ({ ...f, shiftEnd: e.target.value }))} className={inp} /></div>
                  </div>
                </div>

                {/* Profile Photo */}
                <div className="border-t border-[#f0f0f0] pt-4">
                  <label className={label}>Profile Photo</label>
                  <label className="flex items-center gap-3 border-2 border-dashed border-[#e5e7eb] rounded-2xl p-4 cursor-pointer hover:border-[#FF4747] transition-colors group">
                    {form.photoUrl ? (
                      <img src={form.photoUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#fafafa] border border-[#e5e7eb] flex items-center justify-center shrink-0">
                        <User size={18} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                      </div>
                    )}
                    <span className="text-sm text-[#888] group-hover:text-[#FF4747] transition-colors">{form.photoUrl ? "Click to change" : "Upload photo"}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={async e => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        setSaving(true);
                        const res = await eventService.uploadImage(f);
                        setForm(f => ({ ...f, photoUrl: res.url }));
                        showToast("Photo uploaded successfully!");
                      } catch (err: any) {
                        showToast("Failed to upload photo: " + (err.message || err));
                      } finally {
                        setSaving(false);
                      }
                    }} />
                  </label>
                </div>

                <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center py-3 mt-4"}>
                  <Plus size={15} />{saving ? "Registering..." : (editingParticipant ? "Save Participant Changes" : "Register Participant")}
                </button>
              </form>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
