"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Plus, ChevronDown, User, X, Users, Mic, Save, Pencil, Trash2, MapPin, Star, Clock, Briefcase, Building, PlusCircle, AlertTriangle, ChevronRight } from "lucide-react";
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

  const [showEventFilterDropdown, setShowEventFilterDropdown] = useState(false);
  const [showLocationFilterDropdown, setShowLocationFilterDropdown] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  const [showAvailDayDropdown, setShowAvailDayDropdown] = useState(false);
  const [showQuickSessionLocDropdown, setShowQuickSessionLocDropdown] = useState(false);
  const [showFormSessionDropdown, setShowFormSessionDropdown] = useState(false);
  const [showEventLocDropdown, setShowEventLocDropdown] = useState(false);
  const [showAssignLocDropdown, setShowAssignLocDropdown] = useState(false);
  const [showAssignStatusDropdown, setShowAssignStatusDropdown] = useState(false);

  // Availability form state
  const [availDay, setAvailDay] = useState("Monday");
  const [availStart, setAvailStart] = useState("09:00");
  const [availEnd, setAvailEnd] = useState("17:00");

  // Editing state
  const [editingParticipant, setEditingParticipant] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

      <div className="ml-[220px] flex-1 flex flex-col min-h-screen relative">
        {/* Header */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-30">
          <div>
            <h1 className="font-display font-black text-xl text-[#1a1a1a]">{t("adminTeam.header.title")}</h1>
          </div>
        </header>

        <main className="p-8 space-y-8 max-w-[1400px] mx-auto w-full">
          {/* Unified Filter Bar */}
          <div className="flex items-center justify-between bg-white border border-[#e5e7eb] p-3 rounded-2xl">
            <div className="flex items-center gap-4 flex-wrap">
              {/* Event Filter */}
              <div className="relative min-w-[180px]">
                <button type="button" onClick={() => setShowEventFilterDropdown(v => !v)} className={`${inp} py-1.5 px-3 w-full text-left flex items-center justify-between cursor-pointer`}>
                  <span className="truncate">{events.find(ev => (ev.eventId || ev.id) === selectedEventId)?.title || "Select event"}</span>
                  <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showEventFilterDropdown ? "rotate-90" : ""}`} />
                </button>
                {showEventFilterDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEventFilterDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                      {events.map(ev => {
                        const id = ev.eventId || ev.id;
                        const isSelected = id === selectedEventId;
                        return (
                          <button key={id} type="button" onClick={() => { setSelectedEventId(id); setShowEventFilterDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                            {ev.title}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Location Filter */}
              <div className="relative min-w-[180px]">
                <button type="button" onClick={() => setShowLocationFilterDropdown(v => !v)} className={`${inp} py-1.5 px-3 w-full text-left flex items-center justify-between cursor-pointer`}>
                  <span className="truncate">{selectedLocationId === "ALL" ? t("adminTeam.filters.allRooms") : locations.find(loc => loc.roomId === selectedLocationId)?.name || "Select room"}</span>
                  <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showLocationFilterDropdown ? "rotate-90" : ""}`} />
                </button>
                {showLocationFilterDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowLocationFilterDropdown(false)} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                      <button type="button" onClick={() => { setSelectedLocationId("ALL"); setShowLocationFilterDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${selectedLocationId === "ALL" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>
                        {t("adminTeam.filters.allRooms")}
                      </button>
                      {locations.map(loc => {
                        const isSelected = loc.roomId === selectedLocationId;
                        return (
                          <button key={loc.roomId} type="button" onClick={() => { setSelectedLocationId(loc.roomId); setShowLocationFilterDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                            {loc.name} {loc.roomNumber ? `(${loc.roomNumber})` : ""}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Role Filter Inline Buttons */}
              <div className="flex items-center gap-2 border-l border-[#e5e7eb] pl-4 ml-1">
                <span className="text-xs text-[#888] font-bold uppercase tracking-wider">{t("adminTeam.filters.filterRoleLabel")}</span>
                <button onClick={() => setSelectedRoleIdFilter("ALL")} className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${selectedRoleIdFilter === "ALL" ? "bg-[#1a1a1a] text-white border-black" : "bg-white text-[#555] border-[#e5e7eb] hover:bg-stone-50"}`}>{t("adminTeam.filters.all")}</button>
                {roles.map(role => (
                  <button key={role.id} onClick={() => setSelectedRoleIdFilter(role.id)} className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${selectedRoleIdFilter === role.id ? "bg-[#FF4747] text-white border-[#FF4747]" : "bg-white text-[#555] border-[#e5e7eb] hover:bg-stone-50"}`}>{role.name}</button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button onClick={() => {
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
                setIsDrawerOpen(true);
              }} className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white text-xs font-bold rounded-xl hover:bg-black transition-colors cursor-pointer">
                <Plus size={14} />
                {t("adminTeam.form.addTitle")}
              </button>
            </div>
          </div>

          {/* Main Layout: Participants Grid */}
          <div className="space-y-6">
            <h2 className="font-display font-bold text-[#1a1a1a]">{t("adminTeam.list.registeredParticipants", { count: filteredParticipants.length })}</h2>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[1, 2, 3, 4].map(i => <div key={i} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 animate-pulse h-40" />)}
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-14 text-center text-[#aaa]">
                <User size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t("adminTeam.list.emptyState")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredParticipants.map(p => {
                  const assigns = getAssignmentsForParticipant(p.id);
                  let slots: any[] = [];
                  try {
                    if (p.availability) {
                      slots = JSON.parse(p.availability);
                    }
                  } catch { }

                  return (
                    <div key={p.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 relative group hover:border-[#FF4747]/30 hover:shadow-md transition-all flex flex-col justify-between">
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                          setIsDrawerOpen(true);
                        }} className="w-7 h-7 bg-[#fafafa] border border-[#f0f0f0] rounded-full flex items-center justify-center text-[#aaa] hover:bg-stone-100 hover:text-[#1a1a1a] transition-all cursor-pointer shadow-sm">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => removeParticipant(p.id)} className="w-7 h-7 bg-[#fafafa] border border-[#f0f0f0] rounded-full flex items-center justify-center text-[#aaa] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all cursor-pointer shadow-sm">
                          <Trash2 size={12} />
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
                              <div key={idx} className="bg-stone-50 border border-[#e5e7eb] rounded-xl p-2.5 space-y-1 text-xs mt-2">
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
                                  <div className="text-[9px] text-[#888] flex items-center gap-1"><Clock size={10} /> {t("adminTeam.list.shiftPrefix", { start: ass.shiftStart ? new Date(ass.shiftStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "", end: ass.shiftEnd ? new Date(ass.shiftEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "" })}</div>
                                )}
                              </div>
                            ))
                          ) : (
                            <div className="text-[10px] text-[#aaa] italic text-center py-1 mt-2">{t("adminTeam.list.noShifts")}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Slide-out Drawer */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isDrawerOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute inset-0 bg-[#1a1a1a]/40 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
        <div className={`absolute top-0 right-0 bottom-0 w-full max-w-[500px] bg-white shadow-2xl transition-transform duration-300 transform ${isDrawerOpen ? "translate-x-0" : "translate-x-full"} flex flex-col`}>

          <div className="flex items-center justify-between p-6 border-b border-[#e5e7eb] shrink-0">
            <h2 className="font-display font-bold text-lg text-[#1a1a1a]">
              {editingParticipant ? t("adminTeam.form.editTitle") : t("adminTeam.form.addTitle")}
            </h2>
            <button type="button" onClick={() => setIsDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#fafafa] text-[#888] hover:bg-red-50 hover:text-[#FF4747] transition-colors cursor-pointer">
              <X size={16} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
            <form id="team-form" onSubmit={(e) => { saveParticipant(e); setIsDrawerOpen(false); }} className="space-y-5 pb-20">
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
              <div className="border-t border-[#f0f0f0] pt-5 mt-5">
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

                <div className="relative">
                  <button type="button" onClick={() => setShowRoleDropdown(v => !v)} className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}>
                    <span className={form.roleId ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                      {form.roleId ? roles.find(r => r.id === form.roleId)?.name || "Select role" : "Select role"}
                    </span>
                    <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showRoleDropdown ? "rotate-90" : ""}`} />
                  </button>
                  {showRoleDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowRoleDropdown(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                        {roles.map(r => {
                          const isSelected = r.id === form.roleId;
                          return (
                            <button key={r.id} type="button" onClick={() => { setForm(f => ({ ...f, roleId: r.id })); setShowRoleDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                              {r.name}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Job / Bio / Org */}
              <div className="border-t border-[#f0f0f0] pt-5 mt-5 space-y-4">
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

                  <div className="relative">
                    <button type="button" onClick={() => setShowOrgDropdown(v => !v)} className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}>
                      <span className={form.organizationId ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                        {form.organizationId ? organizations.find(o => o.id === form.organizationId)?.name || "Select organization" : t("adminTeam.form.selectOrganization")}
                      </span>
                      <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showOrgDropdown ? "rotate-90" : ""}`} />
                    </button>
                    {showOrgDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowOrgDropdown(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                          <button type="button" onClick={() => { setForm(f => ({ ...f, organizationId: "" })); setShowOrgDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${!form.organizationId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>
                            {t("adminTeam.form.selectOrganization")}
                          </button>
                          {organizations.map(o => {
                            const isSelected = o.id === form.organizationId;
                            return (
                              <button key={o.id} type="button" onClick={() => { setForm(f => ({ ...f, organizationId: o.id })); setShowOrgDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                {o.name}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <div><label className={label}>{t("adminTeam.form.bioLabel")}</label><textarea placeholder={t("adminTeam.form.bioPlaceholder")} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={2} className={inp + " resize-none"} /></div>
              </div>

              {/* Generic Availability Scheduler */}
              <div className="border-t border-[#f0f0f0] pt-5 mt-5 space-y-3">
                <h4 className="text-[10px] font-bold text-[#FF4747] uppercase tracking-wider">{t("adminTeam.form.availabilitySchedulerHeading")}</h4>

                <div className="flex gap-2 flex-wrap items-end bg-[#fafafa] border border-[#e5e7eb] rounded-2xl p-3.5">
                  <div className="flex-1 min-w-[120px]">
                    <label className={label}>{t("adminTeam.form.dayLabel")}</label>
                    <div className="relative">
                      <button type="button" onClick={() => setShowAvailDayDropdown(v => !v)} className={`${inp} py-1.5 w-full text-left flex items-center justify-between cursor-pointer`}>
                        <span className="truncate">{availDay === "All Days" ? t("adminTeam.days.allDays") : (eventDays.find(d => d.value === availDay)?.label || availDay)}</span>
                        <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showAvailDayDropdown ? "rotate-90" : ""}`} />
                      </button>
                      {showAvailDayDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowAvailDayDropdown(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                            {eventDays.length > 0 ? eventDays.map(d => {
                              const isSelected = d.value === availDay;
                              return (
                                <button key={d.value} type="button" onClick={() => { setAvailDay(d.value); setShowAvailDayDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {d.label}
                                </button>
                              );
                            }) : (
                              <button type="button" onClick={() => { setAvailDay("Monday"); setShowAvailDayDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${availDay === "Monday" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                Monday
                              </button>
                            )}
                            <button type="button" onClick={() => { setAvailDay("All Days"); setShowAvailDayDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer border-t border-[#f0f0f0] ${availDay === "All Days" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>
                              {t("adminTeam.days.allDays")}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="w-[85px]"><label className={label}>{t("adminTeam.form.startLabel")}</label><input type="time" value={availStart} onChange={e => setAvailStart(e.target.value)} className={`${inp} py-1.5 px-2`} /></div>
                  <div className="w-[85px]"><label className={label}>{t("adminTeam.form.endLabel")}</label><input type="time" value={availEnd} onChange={e => setAvailEnd(e.target.value)} className={`${inp} py-1.5 px-2`} /></div>
                  <button type="button" onClick={addAvailabilitySlot} className="bg-[#1a1a1a] text-white w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black transition-colors shrink-0 cursor-pointer shadow-sm"><Plus size={16} /></button>
                </div>

                {form.availabilitySlots.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {form.availabilitySlots.map(slot => (
                      <div key={slot.id} className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm">
                        <Clock size={12} className="opacity-70" />
                        <span>{slot.day === "All Days" ? t("adminTeam.days.allDays") : slot.day}: {slot.startTime} - {slot.endTime}</span>
                        <button type="button" onClick={() => removeAvailabilitySlot(slot.id)} className="ml-1 text-green-700 hover:text-red-500 cursor-pointer"><X size={12} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Assignment (Shift / Task) Details */}
              <div className="border-t border-[#f0f0f0] pt-5 mt-5 space-y-4">
                <h4 className="text-[10px] font-bold text-[#FF4747] uppercase tracking-wider">{t("adminTeam.form.shiftDetailsHeading")}</h4>

                <div className="bg-[#fffcf5] border border-orange-200 rounded-2xl p-4 space-y-4">
                  <div className="flex items-center justify-between mb-1">
                    <label className={label + " !mb-0"}>{t("adminTeam.form.assignSession")}</label>
                    <button type="button" onClick={() => setShowQuickSession(!showQuickSession)} className="text-[10px] font-bold text-[#FF4747] hover:underline cursor-pointer">{t("adminTeam.form.quickCreateSession")}</button>
                  </div>

                  {showQuickSession && (
                    <div className="bg-white border border-[#e5e7eb] rounded-xl p-3 space-y-3 mb-3 shadow-sm">
                      <input placeholder={t("adminTeam.form.sessionTitlePlaceholder")} value={quickSession.title} onChange={e => setQuickSession(q => ({ ...q, title: e.target.value }))} className={inp + " py-1.5"} />
                      <div className="flex gap-2">
                        <input type="datetime-local" value={quickSession.startTime} onChange={e => setQuickSession(q => ({ ...q, startTime: e.target.value }))} className={inp + " py-1.5 flex-1"} />
                        <input type="datetime-local" value={quickSession.endTime} onChange={e => setQuickSession(q => ({ ...q, endTime: e.target.value }))} className={inp + " py-1.5 flex-1"} />
                      </div>
                      <div className="relative">
                        <button type="button" onClick={() => setShowQuickSessionLocDropdown(v => !v)} className={`${inp} py-1.5 w-full text-left flex items-center justify-between cursor-pointer`}>
                          <span className={quickSession.locationId ? "text-[#1a1a1a]" : "text-[#aaa]"}>{quickSession.locationId ? locations.find(l => l.roomId === quickSession.locationId)?.name || "Selected Room" : "Select Room (Optional)"}</span>
                          <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showQuickSessionLocDropdown ? "rotate-90" : ""}`} />
                        </button>
                        {showQuickSessionLocDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowQuickSessionLocDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-40 overflow-y-auto">
                              <button type="button" onClick={() => { setQuickSession(q => ({ ...q, locationId: "" })); setShowQuickSessionLocDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${!quickSession.locationId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>
                                - Clear Room -
                              </button>
                              {locations.map(loc => {
                                const isSelected = loc.roomId === quickSession.locationId;
                                return (
                                  <button key={loc.roomId} type="button" onClick={() => { setQuickSession(q => ({ ...q, locationId: loc.roomId })); setShowQuickSessionLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                    {loc.name}
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                      <button type="button" onClick={handleQuickSessionSave} className="w-full bg-[#1a1a1a] text-white text-xs font-bold py-2 rounded-lg hover:bg-black transition-colors">{t("adminTeam.form.createSessionBtn")}</button>
                    </div>
                  )}

                  <div className="relative">
                    <button type="button" onClick={() => setShowFormSessionDropdown(v => !v)} className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}>
                      <span className={form.sessionId ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                        {form.sessionId ? sessions.find(s => (s.sessionId || s.id) === form.sessionId)?.title || "Select Session" : "- Select Session -"}
                      </span>
                      <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showFormSessionDropdown ? "rotate-90" : ""}`} />
                    </button>
                    {showFormSessionDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowFormSessionDropdown(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                          <button type="button" onClick={() => { setForm(f => ({ ...f, sessionId: "", shiftStart: "", shiftEnd: "" })); setShowFormSessionDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${!form.sessionId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>
                            - Select Session -
                          </button>
                          {sessions.map(s => {
                            const id = s.sessionId || s.id;
                            const isSelected = id === form.sessionId;
                            return (
                              <button key={id} type="button" onClick={() => { setForm(f => ({ ...f, sessionId: id })); setShowFormSessionDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                {s.title}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div><label className={label}>{t("adminTeam.form.shiftStart")}</label><input type="datetime-local" value={form.shiftStart} onChange={e => setForm(f => ({ ...f, shiftStart: e.target.value }))} className={inp} /></div>
                  <div><label className={label}>{t("adminTeam.form.shiftEnd")}</label><input type="datetime-local" value={form.shiftEnd} onChange={e => setForm(f => ({ ...f, shiftEnd: e.target.value }))} className={inp} /></div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                    <label className={label}>Event Location</label>
                    <button type="button" onClick={() => setShowEventLocDropdown(v => !v)} className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}>
                      <span className={form.eventLocationId ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                        {form.eventLocationId ? eventLocations.find(el => (el.locationId || el.id) === form.eventLocationId)?.venueName || "Select Location" : "- Select Location -"}
                      </span>
                      <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showEventLocDropdown ? "rotate-90" : ""}`} />
                    </button>
                    {showEventLocDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowEventLocDropdown(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                          <button type="button" onClick={() => { setForm(f => ({ ...f, eventLocationId: "", locationId: "" })); setShowEventLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${!form.eventLocationId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>
                            - Select Location -
                          </button>
                          {eventLocations.map(el => {
                            const id = el.locationId || el.id;
                            const isSelected = id === form.eventLocationId;
                            return (
                              <button key={id} type="button" onClick={() => { setForm(f => ({ ...f, eventLocationId: id, locationId: "" })); setShowEventLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                {el.venueName || el.virtualPlatform || "Unnamed Location"}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="relative">
                    <label className={label}>Room / Hall</label>
                    <button type="button" onClick={() => setShowAssignLocDropdown(v => !v)} className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}>
                      <span className={form.locationId ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                        {form.locationId ? locations.find(loc => loc.roomId === form.locationId)?.name || "Select Room" : "- Select Room -"}
                      </span>
                      <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showAssignLocDropdown ? "rotate-90" : ""}`} />
                    </button>
                    {showAssignLocDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowAssignLocDropdown(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                          <button type="button" onClick={() => { setForm(f => ({ ...f, locationId: "" })); setShowAssignLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${!form.locationId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>
                            - Select Room -
                          </button>
                          {locations.filter(loc => !form.eventLocationId || loc.locationId === form.eventLocationId).map(loc => {
                            const isSelected = loc.roomId === form.locationId;
                            return (
                              <button key={loc.roomId} type="button" onClick={() => { setForm(f => ({ ...f, locationId: loc.roomId })); setShowAssignLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                {loc.name} {loc.roomNumber ? `(${loc.roomNumber})` : ""}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
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
                  <div className="relative">
                    <label className={label}>{t("adminTeam.form.assignmentStatus")}</label>
                    <button type="button" onClick={() => setShowAssignStatusDropdown(v => !v)} className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}>
                      <span>{form.assignmentStatus === "ACTIVE" ? t("adminTeam.form.assignmentStatusActive") : t("adminTeam.form.assignmentStatusEnded")}</span>
                      <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showAssignStatusDropdown ? "rotate-90" : ""}`} />
                    </button>
                    {showAssignStatusDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowAssignStatusDropdown(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                          <button type="button" onClick={() => { setForm(f => ({ ...f, assignmentStatus: "ACTIVE" })); setShowAssignStatusDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${form.assignmentStatus === "ACTIVE" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                            {t("adminTeam.form.assignmentStatusActive")}
                          </button>
                          <button type="button" onClick={() => { setForm(f => ({ ...f, assignmentStatus: "ENDED" })); setShowAssignStatusDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${form.assignmentStatus === "ENDED" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                            {t("adminTeam.form.assignmentStatusEnded")}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Profile Photo */}
              <div className="border-t border-[#f0f0f0] pt-5 mt-5">
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
            </form>
          </div>

          <div className="p-6 border-t border-[#f3f4f6] bg-white shrink-0">
            <button type="submit" form="team-form" disabled={saving} className={saveBtn + " w-full justify-center py-3"}>
              <Plus size={15} />{saving ? t("adminTeam.form.registering") : (editingParticipant ? t("adminTeam.form.saveChanges") : t("adminTeam.form.registerParticipant"))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
