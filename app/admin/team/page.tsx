"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { Plus, User, X, Mic, Pencil, Trash2, MapPin, Star, Clock, Briefcase, Building, AlertTriangle, ChevronRight } from "lucide-react";
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

const emptyForm = () => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  roleId: "a0000000-0000-0000-0000-000000000002",
  organizationId: "",
  jobTitle: "",
  bio: "",
  photoUrl: "",
  sessionIds: [] as string[],
  locationId: "",
  eventLocationId: "",
  task: "",
  team: "",
  hours: "",
  notes: "",
  assignmentStatus: "ACTIVE",
  availabilitySlots: [] as { id: string; day: string; startTime: string; endTime: string }[],
});

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

  // Event days derived from schedules
  const [eventDays, setEventDays] = useState<{ value: string; label: string }[]>([]);

  // Dropdown open state
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

  // Editing / Drawer state
  const [editingParticipant, setEditingParticipant] = useState<any>(null);
  const [editingAssignment, setEditingAssignment] = useState<any>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Unified Form
  const [form, setForm] = useState(emptyForm());
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

  // Default the availability day picker to the first real event day once loaded
  useEffect(() => {
    if (eventDays.length > 0 && !eventDays.some(d => d.value === availDay)) {
      setAvailDay(eventDays[0].value);
    }
  }, [eventDays]);

  async function loadData(eventId: string) {
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
  }

  const getAssignmentsForParticipant = (partId: string) => {
    return assignments.filter(a => a.eventParticipant?.id === partId);
  };

  const handleAddRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const created = await eventService.createRole({ name: newRoleName, tenantId: auth?.tenantId || "c0000000-0000-0000-0000-000000000001" });
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
      const created = await eventService.createOrganization({ name: newOrgName, type: "company" });
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
      const newId = created.sessionId || created.id;
      setForm(f => ({ ...f, sessionIds: [...f.sessionIds, newId] }));
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
    setForm(f => ({ ...f, availabilitySlots: f.availabilitySlots.filter(s => s.id !== id) }));
  };

  const saveParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName.trim() || !form.email.trim() || !selectedEventId) return;
    setSaving(true);

    try {
      // 1. Create/Update Person
      const person = await eventService.createPerson({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        organizationId: form.organizationId || undefined,
        jobTitle: form.jobTitle || undefined,
        bio: form.bio || undefined,
        profilePhoto: form.photoUrl || undefined,
      });

      // 2. Create/Update EventParticipant
      const participantPayload = {
        eventId: selectedEventId,
        personId: person.id,
        roleId: form.roleId,
        status: "confirmed",
        notes: form.notes || undefined,
        availability: form.availabilitySlots.length > 0 ? JSON.stringify(form.availabilitySlots) : undefined,
      };

      let participantRes;
      if (editingParticipant) {
        participantRes = await eventService.updateParticipant(editingParticipant.id, participantPayload);
        // Delete existing assignments when editing
        const existingAssigns = getAssignmentsForParticipant(editingParticipant.id);
        await Promise.all(existingAssigns.map(a => eventService.deleteAssignment(a.id).catch(() => { })));
      } else {
        participantRes = await eventService.createParticipant(participantPayload);
      }

      // 3. Create assignments for each selected session
      for (const sId of form.sessionIds) {
        const sess = sessions.find(s => (s.sessionId || s.id) === sId);
        await eventService.createAssignment({
          eventParticipantId: participantRes.id,
          sessionId: sId,
          locationId: form.locationId || sess?.roomId || undefined,
          eventLocationId: form.eventLocationId || undefined,
          task: form.task || undefined,
          team: form.team || undefined,
          shiftStart: sess?.startTime ? new Date(sess.startTime).toISOString() : undefined,
          shiftEnd: sess?.endTime ? new Date(sess.endTime).toISOString() : undefined,
          hours: form.hours ? parseFloat(form.hours) : undefined,
          status: form.assignmentStatus || "ACTIVE",
        });
      }

      // 4. Create assignments for custom availability slots (when no session selected)
      if (form.sessionIds.length === 0) {
        for (const slot of form.availabilitySlots) {
          if (slot.day === "All Days" || !slot.day) continue;
          const startDt = new Date(slot.day + "T" + slot.startTime);
          const endDt = new Date(slot.day + "T" + slot.endTime);
          await eventService.createAssignment({
            eventParticipantId: participantRes.id,
            locationId: form.locationId || undefined,
            eventLocationId: form.eventLocationId || undefined,
            task: form.task || undefined,
            team: form.team || undefined,
            shiftStart: startDt.toISOString(),
            shiftEnd: endDt.toISOString(),
            hours: form.hours ? parseFloat(form.hours) : undefined,
            status: form.assignmentStatus || "ACTIVE",
          });
        }
      }

      showToast(editingParticipant ? t("adminTeam.toast.participantUpdated") : t("adminTeam.toast.participantRegistered"));
      setEditingParticipant(null);
      setEditingAssignment(null);
      setForm(emptyForm());
      setIsDrawerOpen(false);
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
      const assigns = getAssignmentsForParticipant(id);
      for (const a of assigns) await eventService.deleteAssignment(a.id);
      await eventService.deleteParticipant(id);
      showToast(t("adminTeam.toast.participantRemoved"));
      await loadData(selectedEventId);
    } catch {
      showToast(t("adminTeam.toast.participantRemoveFailed"));
    }
  };

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
        <div className="fixed top-5 right-5 z-[60] bg-[#1a1a1a] text-white text-xs font-bold px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-bounce">
          <Star size={12} className="text-[#FF4747]" />
          {toast}
        </div>
      )}

      <div className="ml-[220px] flex-1 flex flex-col min-h-screen">
        {/* Header */}
        <header className="bg-white border-b border-[#e5e7eb] px-8 py-5 flex items-center justify-between sticky top-0 z-30">
          <div>
            <h1 className="font-display font-black text-xl" style={{ background: "linear-gradient(90deg, #EB4203, #FF4747)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{t("adminTeam.header.title")}</h1>
            <p className="text-xs text-[#888] mt-0.5">{t("adminTeam.header.subtitle")}</p>
          </div>
          <button onClick={() => { setEditingParticipant(null); setEditingAssignment(null); setForm(emptyForm()); setIsDrawerOpen(true); }} className="flex items-center gap-2 bg-[#FF4747] hover:bg-[#e03e3e] text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer">
            <Plus size={16} />{t("adminTeam.form.addTitle")}
          </button>
        </header>

        <main className="p-8 space-y-6 max-w-[1400px] w-full mx-auto">
          {/* Filter Bar */}
          <div className="flex items-center gap-4 bg-white border border-[#e5e7eb] p-3 rounded-2xl flex-wrap">
            {/* Event Dropdown */}
            <div className="relative min-w-[200px]">
              <button type="button" onClick={() => setShowEventFilterDropdown(v => !v)} className={`${inp} py-1.5 px-3 w-full text-left flex items-center justify-between cursor-pointer`}>
                <span className="truncate text-xs">{events.find(ev => (ev.eventId || ev.id) === selectedEventId)?.title || "Select event"}</span>
                <ChevronRight size={14} className={`text-[#aaa] transition-transform shrink-0 ${showEventFilterDropdown ? "rotate-90" : ""}`} />
              </button>
              {showEventFilterDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEventFilterDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                    {events.map(ev => {
                      const id = ev.eventId || ev.id;
                      return (
                        <button key={id} type="button" onClick={() => { setSelectedEventId(id); setShowEventFilterDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${id === selectedEventId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                          {ev.title}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Location Dropdown */}
            <div className="relative min-w-[180px]">
              <button type="button" onClick={() => setShowLocationFilterDropdown(v => !v)} className={`${inp} py-1.5 px-3 w-full text-left flex items-center justify-between cursor-pointer`}>
                <span className="truncate text-xs">{selectedLocationId === "ALL" ? t("adminTeam.filters.allRooms") : locations.find(l => l.roomId === selectedLocationId)?.name || "Select room"}</span>
                <ChevronRight size={14} className={`text-[#aaa] transition-transform shrink-0 ${showLocationFilterDropdown ? "rotate-90" : ""}`} />
              </button>
              {showLocationFilterDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowLocationFilterDropdown(false)} />
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                    <button type="button" onClick={() => { setSelectedLocationId("ALL"); setShowLocationFilterDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${selectedLocationId === "ALL" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>{t("adminTeam.filters.allRooms")}</button>
                    {locations.map(loc => (
                      <button key={loc.roomId} type="button" onClick={() => { setSelectedLocationId(loc.roomId); setShowLocationFilterDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${loc.roomId === selectedLocationId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                        {loc.name} {loc.roomNumber ? `(${loc.roomNumber})` : ""}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Role filter pills */}
            <div className="flex items-center gap-2 border-l border-[#e5e7eb] pl-4 flex-wrap">
              <span className="text-[10px] text-[#888] font-bold uppercase tracking-wider">{t("adminTeam.filters.filterRoleLabel")}</span>
              <button onClick={() => setSelectedRoleIdFilter("ALL")} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${selectedRoleIdFilter === "ALL" ? "bg-[#1a1a1a] text-white border-black" : "bg-white text-[#555] border-[#e5e7eb] hover:bg-stone-50"}`}>{t("adminTeam.filters.all")}</button>
              {roles.map(role => (
                <button key={role.id} onClick={() => setSelectedRoleIdFilter(role.id)} className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${selectedRoleIdFilter === role.id ? "bg-[#FF4747] text-white border-[#FF4747]" : "bg-white text-[#555] border-[#e5e7eb] hover:bg-stone-50"}`}>{role.name}</button>
              ))}
            </div>
          </div>

          {/* Participants Grid */}
          <div>
            <h2 className="font-display font-bold text-[#1a1a1a] mb-5">{t("adminTeam.list.registeredParticipants", { count: filteredParticipants.length })}</h2>

            {loading ? (
              <div className="grid md:grid-cols-3 xl:grid-cols-4 gap-5">
                {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 animate-pulse h-44" />)}
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-14 text-center text-[#aaa]">
                <User size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">{t("adminTeam.list.emptyState")}</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredParticipants.map(p => {
                  const assigns = getAssignmentsForParticipant(p.id);
                  let slots: any[] = [];
                  try { if (p.availability) slots = JSON.parse(p.availability); } catch { }

                  return (
                    <div key={p.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 relative group hover:border-[#FF4747]/30 hover:shadow-md transition-all flex flex-col justify-between">
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                          setEditingParticipant(p);
                          const sessionIds = assigns.filter(a => a.sessionId).map(a => a.sessionId);
                          const customAssigns = assigns.filter(a => !a.sessionId && a.shiftStart);
                          const customSlots = customAssigns.map(a => {
                            const d = new Date(a.shiftStart);
                            const e = new Date(a.shiftEnd || a.shiftStart);
                            return { id: a.id, day: d.toISOString().split("T")[0], startTime: d.toISOString().substring(11, 16), endTime: e.toISOString().substring(11, 16) };
                          });
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
                            sessionIds,
                            locationId: ass?.location?.roomId || "",
                            eventLocationId: ass?.eventLocationId || "",
                            task: ass?.task || "",
                            team: ass?.team || "",
                            hours: ass?.hours?.toString() || "",
                            notes: p.notes || "",
                            assignmentStatus: ass?.status || "ACTIVE",
                            availabilitySlots: customSlots.length > 0 ? customSlots : slots,
                          });
                          setIsDrawerOpen(true);
                        }} className="w-7 h-7 bg-[#fafafa] border border-[#f0f0f0] rounded-full flex items-center justify-center text-[#aaa] hover:bg-stone-100 hover:text-[#1a1a1a] transition-all cursor-pointer">
                          <Pencil size={11} />
                        </button>
                        <button onClick={() => removeParticipant(p.id)} className="w-7 h-7 bg-[#fafafa] border border-[#f0f0f0] rounded-full flex items-center justify-center text-[#aaa] hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all cursor-pointer">
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
                          {slots.length > 0 && (
                            <div className="space-y-1">
                              <div className="text-[9px] font-bold text-[#888] uppercase tracking-wider">{t("adminTeam.list.availabilityLabel")}</div>
                              <div className="flex flex-wrap gap-1">
                                {slots.map((sl: any, idx: number) => (
                                  <span key={idx} className="bg-green-50 text-green-700 border border-green-200 text-[8px] font-bold rounded px-1.5 py-0.5">{sl.day.slice(0, 3)}: {sl.startTime}-{sl.endTime}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {assigns.length > 0 ? assigns.map((ass, idx) => (
                            <div key={idx} className="bg-stone-50 border border-[#e5e7eb] rounded-xl p-2.5 space-y-1 text-xs">
                              {ass.sessionId && <div className="text-red-500 font-bold flex items-center gap-1"><Mic size={10} /> {sessions.find(s => (s.sessionId || s.id) === ass.sessionId)?.title || t("adminTeam.list.presentationFallback")}</div>}
                              {(ass.eventLocationName || ass.locationName) && (
                                <div className="text-blue-600 font-semibold flex items-center gap-1"><MapPin size={10} /><span>{ass.eventLocationName || ""}{ass.eventLocationName && ass.locationName && " — "}{ass.locationName || ""}</span></div>
                              )}
                              {ass.task && <div className="text-[#1a1a1a] font-medium">{ass.task}</div>}
                              {(ass.shiftStart || ass.shiftEnd) && (
                                <div className="text-[9px] text-[#888] flex items-center gap-1"><Clock size={10} /> {ass.shiftStart ? new Date(ass.shiftStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""} - {ass.shiftEnd ? new Date(ass.shiftEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</div>
                              )}
                            </div>
                          )) : (
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
        </main>
      </div>

      {/* Drawer Backdrop */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setIsDrawerOpen(false)} />
      )}

      {/* Slide-out Drawer */}
      <div className={`fixed inset-y-0 right-0 z-50 w-[500px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${isDrawerOpen ? "translate-x-0" : "translate-x-full"}`}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#f3f4f6] shrink-0 bg-white">
          <div>
            <h3 className="font-display font-bold text-lg" style={{ background: "linear-gradient(90deg, #EB4203, #FF4747)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{editingParticipant ? t("adminTeam.form.editTitle") : t("adminTeam.form.addTitle")}</h3>
            <p className="text-[#888] text-xs mt-0.5">{editingParticipant ? t("adminTeam.form.editSubtitle") : t("adminTeam.form.addSubtitle")}</p>
          </div>
          <button onClick={() => setIsDrawerOpen(false)} className="text-[#aaa] hover:text-[#FF4747] p-2 rounded-xl hover:bg-[#fff5f5] transition-colors cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form id="team-form" ref={formRef} onSubmit={saveParticipant} className="space-y-5">

            {/* Personal Info */}
            <div className="grid grid-cols-2 gap-4">
              <div><label className={label}>{t("adminTeam.form.firstName")}</label><input required placeholder={t("adminTeam.form.firstNamePlaceholder")} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} className={inp} /></div>
              <div><label className={label}>{t("adminTeam.form.lastName")}</label><input placeholder={t("adminTeam.form.lastNamePlaceholder")} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} className={inp} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className={label}>{t("adminTeam.form.email")}</label><input required type="email" placeholder={t("adminTeam.form.emailPlaceholder")} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inp} /></div>
              <div><label className={label}>{t("adminTeam.form.phone")}</label><input placeholder={t("adminTeam.form.phonePlaceholder")} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={inp} /></div>
            </div>

            {/* Role */}
            <div className="border-t border-[#f0f0f0] pt-5">
              <label className={label}>{t("adminTeam.form.roleLabel")}</label>
              <div className="relative">
                <button type="button" onClick={() => setShowRoleDropdown(v => !v)} className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}>
                  <span className={form.roleId ? "text-[#1a1a1a]" : "text-[#aaa]"}>{roles.find(r => r.id === form.roleId)?.name || "Select role"}</span>
                  <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showRoleDropdown ? "rotate-90" : ""}`} />
                </button>
                {showRoleDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setShowRoleDropdown(false); setShowAddRole(false); setNewRoleName(""); }} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-72 overflow-y-auto">
                      {roles.map(r => (
                        <div key={r.id} className={`flex items-center group/item px-3 py-0.5 ${r.id === form.roleId ? "bg-[#fff5f5]" : "hover:bg-[#fafafa]"} transition-colors`}>
                          <button type="button" onClick={() => { setForm(f => ({ ...f, roleId: r.id })); setShowRoleDropdown(false); setShowAddRole(false); }} className={`flex-1 text-left py-2 text-sm cursor-pointer ${r.id === form.roleId ? "text-[#FF4747] font-semibold" : "text-[#1a1a1a]"}`}>{r.name}</button>
                          <button type="button" onClick={async e => { e.stopPropagation(); if (!confirm(`Delete role "${r.name}"?`)) return; try { await eventService.deleteRole(r.id); const list = await eventService.getRoles().catch(() => []); setRoles(list || []); if (form.roleId === r.id) setForm(f => ({ ...f, roleId: "" })); showToast(`Role "${r.name}" deleted`); } catch { showToast("Failed to delete role"); } }} className="opacity-0 group-hover/item:opacity-100 ml-2 w-6 h-6 flex items-center justify-center text-[#ccc] hover:text-red-500 hover:bg-red-50 rounded-full transition-all cursor-pointer shrink-0">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {showAddRole ? (
                        <div className="px-3 py-2 border-t border-[#f0f0f0] space-y-2">
                          <input autoFocus placeholder={t("adminTeam.form.newRolePlaceholder")} value={newRoleName} onChange={e => setNewRoleName(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddRole())} className={inp + " py-1.5 text-xs"} />
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setShowAddRole(false); setNewRoleName(""); }} className="flex-1 py-1.5 text-xs text-[#888] hover:text-[#1a1a1a] border border-[#e5e7eb] rounded-lg cursor-pointer">{t("adminTeam.form.cancel")}</button>
                            <button type="button" onClick={handleAddRole} className="flex-1 py-1.5 text-xs font-bold text-white bg-[#FF4747] hover:bg-[#e03e3e] rounded-lg cursor-pointer">{t("adminTeam.form.save")}</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setShowAddRole(true)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#FF4747] hover:bg-[#fff5f5] transition-colors cursor-pointer border-t border-[#f0f0f0]">
                          {t("adminTeam.form.addRole")}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Job / Company */}
            <div className="border-t border-[#f0f0f0] pt-5 space-y-4">
              <h4 className="text-[10px] font-bold text-[#FF4747] uppercase tracking-wider">{t("adminTeam.form.jobMetadataHeading")}</h4>
              <div><label className={label}>{t("adminTeam.form.jobTitleLabel")}</label><input placeholder={t("adminTeam.form.jobTitlePlaceholder")} value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} className={inp} /></div>

              <div>
                <label className={label}>{t("adminTeam.form.affiliatedCompany")}</label>
                <div className="relative">
                  <button type="button" onClick={() => setShowOrgDropdown(v => !v)} className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}>
                    <span className={form.organizationId ? "text-[#1a1a1a]" : "text-[#aaa]"}>{form.organizationId ? organizations.find(o => o.id === form.organizationId)?.name : t("adminTeam.form.selectOrganization")}</span>
                    <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showOrgDropdown ? "rotate-90" : ""}`} />
                  </button>
                  {showOrgDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => { setShowOrgDropdown(false); setShowAddOrg(false); setNewOrgName(""); }} />
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-72 overflow-y-auto">
                        <button type="button" onClick={() => { setForm(f => ({ ...f, organizationId: "" })); setShowOrgDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${!form.organizationId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>{t("adminTeam.form.selectOrganization")}</button>
                        {organizations.map(o => (
                          <div key={o.id} className={`flex items-center group/item px-3 py-0.5 ${o.id === form.organizationId ? "bg-[#fff5f5]" : "hover:bg-[#fafafa]"} transition-colors`}>
                            <button type="button" onClick={() => { setForm(f => ({ ...f, organizationId: o.id })); setShowOrgDropdown(false); setShowAddOrg(false); }} className={`flex-1 text-left py-2 text-sm cursor-pointer ${o.id === form.organizationId ? "text-[#FF4747] font-semibold" : "text-[#1a1a1a]"}`}>{o.name}</button>
                            <button type="button" onClick={async e => { e.stopPropagation(); if (!confirm(`Delete organization "${o.name}"?`)) return; try { await eventService.deleteOrganization(o.id); const list = await eventService.getOrganizations().catch(() => []); setOrganizations(list || []); if (form.organizationId === o.id) setForm(f => ({ ...f, organizationId: "" })); showToast(`Organization "${o.name}" deleted`); } catch { showToast("Failed to delete organization"); } }} className="opacity-0 group-hover/item:opacity-100 ml-2 w-6 h-6 flex items-center justify-center text-[#ccc] hover:text-red-500 hover:bg-red-50 rounded-full transition-all cursor-pointer shrink-0">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                        {showAddOrg ? (
                          <div className="px-3 py-2 border-t border-[#f0f0f0] space-y-2">
                            <input autoFocus placeholder={t("adminTeam.form.newOrgNamePlaceholder")} value={newOrgName} onChange={e => setNewOrgName(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddOrg())} className={inp + " py-1.5 text-xs"} />
                            <div className="flex gap-2">
                              <button type="button" onClick={() => { setShowAddOrg(false); setNewOrgName(""); }} className="flex-1 py-1.5 text-xs text-[#888] hover:text-[#1a1a1a] border border-[#e5e7eb] rounded-lg cursor-pointer">{t("adminTeam.form.cancel")}</button>
                              <button type="button" onClick={handleAddOrg} className="flex-1 py-1.5 text-xs font-bold text-white bg-[#FF4747] hover:bg-[#e03e3e] rounded-lg cursor-pointer">{t("adminTeam.form.save")}</button>
                            </div>
                          </div>
                        ) : (
                          <button type="button" onClick={() => setShowAddOrg(true)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#FF4747] hover:bg-[#fff5f5] transition-colors cursor-pointer border-t border-[#f0f0f0]">
                            {t("adminTeam.form.addOrg")}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div><label className={label}>{t("adminTeam.form.bioLabel")}</label><textarea placeholder={t("adminTeam.form.bioPlaceholder")} value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={2} className={inp + " resize-none"} /></div>
            </div>
            {/* Scheduling & Availability */}
            <div className="border-t border-[#f0f0f0] pt-5 space-y-4">
              <h4 className="text-[10px] font-bold text-[#FF4747] uppercase tracking-wider">{t("adminTeam.form.sessionRoomHeading")}</h4>

              {/* Multi-select Sessions with inline Quick Create */}
              <div className="relative">
                <label className={label}>{t("adminTeam.form.assignedSession")}</label>
                <button type="button" onClick={() => { setShowFormSessionDropdown(v => !v); setShowQuickSession(false); }} className={`${inp} w-full text-left flex items-center justify-between cursor-pointer min-h-[42px]`}>
                  <div className="flex gap-1.5 flex-wrap flex-1 max-w-[90%] min-h-[22px]">
                    {form.sessionIds.length > 0 ? (
                      form.sessionIds.map(sId => {
                        const sess = sessions.find(s => (s.sessionId || s.id) === sId);
                        return (
                          <span key={sId} className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                            <span className="truncate max-w-[120px]">{sess?.title || sId}</span>
                            <button type="button" onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, sessionIds: f.sessionIds.filter(id => id !== sId) })); }} className="hover:text-red-500 cursor-pointer">×</button>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[#aaa]">{t("adminTeam.form.selectSession")}</span>
                    )}
                  </div>
                  <ChevronRight size={14} className={`text-[#aaa] transition-transform shrink-0 ${showFormSessionDropdown ? "rotate-90" : ""}`} />
                </button>
                {showFormSessionDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setShowFormSessionDropdown(false); setShowQuickSession(false); setQuickSession({ title: "", startTime: "", endTime: "", locationId: "" }); }} />
                    <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-80 overflow-y-auto">
                      {sessions.length === 0 && !showQuickSession && <div className="px-4 py-3 text-sm text-[#aaa]">No sessions yet. Create one below.</div>}
                      {sessions.map(s => {
                        const id = s.sessionId || s.id;
                        const isSelected = form.sessionIds.includes(id);
                        return (
                          <div key={id} className={`flex items-center group/item px-3 py-0.5 ${isSelected ? "bg-[#fff5f5]" : "hover:bg-[#fafafa]"} transition-colors`}>
                            <button type="button" onClick={() => setForm(f => ({ ...f, sessionIds: isSelected ? f.sessionIds.filter(sid => sid !== id) : [...f.sessionIds, id] }))} className={`flex-1 text-left py-2 text-sm cursor-pointer flex items-center justify-between ${isSelected ? "text-[#FF4747] font-semibold" : "text-[#1a1a1a]"}`}>
                              <span className="truncate pr-2">{s.title}</span>
                              {isSelected && <span className="text-[#FF4747] shrink-0 font-bold text-xs">✓</span>}
                            </button>
                            <button type="button" onClick={async e => { e.stopPropagation(); if (!confirm(`Delete session "${s.title}"?`)) return; try { await eventService.deleteSession(id); const sessList = await eventService.getSessions().catch(() => []); setSessions((sessList || []).filter((ss: any) => (ss.eventId || ss.event?.eventId) === selectedEventId)); setForm(f => ({ ...f, sessionIds: f.sessionIds.filter(sid => sid !== id) })); showToast(`Session "${s.title}" deleted`); } catch { showToast("Failed to delete session"); } }} className="opacity-0 group-hover/item:opacity-100 ml-2 w-6 h-6 flex items-center justify-center text-[#ccc] hover:text-red-500 hover:bg-red-50 rounded-full transition-all cursor-pointer shrink-0">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })}
                      {/* Quick Create Session inline */}
                      {showQuickSession ? (
                        <div className="px-3 py-2 border-t border-[#f0f0f0] space-y-2">
                          <input autoFocus placeholder={t("adminTeam.form.sessionTitlePlaceholder")} value={quickSession.title} onChange={e => setQuickSession(q => ({ ...q, title: e.target.value }))} className={inp + " py-1.5 text-xs"} />
                          <div className="flex gap-2">
                            <input type="datetime-local" value={quickSession.startTime} onChange={e => setQuickSession(q => ({ ...q, startTime: e.target.value }))} className={inp + " py-1.5 flex-1 text-xs"} />
                            <input type="datetime-local" value={quickSession.endTime} onChange={e => setQuickSession(q => ({ ...q, endTime: e.target.value }))} className={inp + " py-1.5 flex-1 text-xs"} />
                          </div>
                          <div className="relative">
                            <button type="button" onClick={() => setShowQuickSessionLocDropdown(v => !v)} className={`${inp} py-1.5 w-full text-left flex items-center justify-between cursor-pointer text-xs`}>
                              <span className={quickSession.locationId ? "text-[#1a1a1a]" : "text-[#aaa]"}>{quickSession.locationId ? locations.find(l => l.roomId === quickSession.locationId)?.name || "Selected" : "Select Room (Optional)"}</span>
                              <ChevronRight size={12} className={`text-[#aaa] transition-transform ${showQuickSessionLocDropdown ? "rotate-90" : ""}`} />
                            </button>
                            {showQuickSessionLocDropdown && (
                              <>
                                <div className="fixed inset-0 z-[60]" onClick={() => setShowQuickSessionLocDropdown(false)} />
                                <div className="absolute left-0 right-0 top-full mt-1 z-[70] bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-36 overflow-y-auto">
                                  <button type="button" onClick={() => { setQuickSession(q => ({ ...q, locationId: "" })); setShowQuickSessionLocDropdown(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-[#fafafa] cursor-pointer text-[#888]">Clear Room</button>
                                  {locations.map(loc => (
                                    <button key={loc.roomId} type="button" onClick={() => { setQuickSession(q => ({ ...q, locationId: loc.roomId })); setShowQuickSessionLocDropdown(false); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-[#fafafa] cursor-pointer ${loc.roomId === quickSession.locationId ? "text-[#FF4747] font-semibold" : "text-[#1a1a1a]"}`}>{loc.name}</button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={() => { setShowQuickSession(false); setQuickSession({ title: "", startTime: "", endTime: "", locationId: "" }); }} className="flex-1 py-1.5 text-xs text-[#888] hover:text-[#1a1a1a] border border-[#e5e7eb] rounded-lg cursor-pointer">{t("adminTeam.form.cancel")}</button>
                            <button type="button" onClick={handleQuickSessionSave} className="flex-1 py-1.5 text-xs font-bold text-white bg-[#FF4747] hover:bg-[#e03e3e] rounded-lg cursor-pointer">{t("adminTeam.form.create")}</button>
                          </div>
                        </div>
                      ) : (
                        <button type="button" onClick={() => setShowQuickSession(true)} className="w-full text-left px-4 py-2.5 text-xs font-bold text-[#FF4747] hover:bg-[#fff5f5] transition-colors cursor-pointer border-t border-[#f0f0f0]">
                          {t("adminTeam.form.quickCreateSession")}
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Location */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <label className={label}>Event Location</label>
                  <button type="button" onClick={() => setShowEventLocDropdown(v => !v)} className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}>
                    <span className={`truncate ${form.eventLocationId ? "text-[#1a1a1a]" : "text-[#aaa]"}`}>{form.eventLocationId ? eventLocations.find(el => (el.locationId || el.id) === form.eventLocationId)?.venueName || "Selected" : "Select Location"}</span>
                    <ChevronRight size={14} className={`text-[#aaa] transition-transform shrink-0 ${showEventLocDropdown ? "rotate-90" : ""}`} />
                  </button>
                  {showEventLocDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowEventLocDropdown(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-52 overflow-y-auto">
                        <button type="button" onClick={() => { setForm(f => ({ ...f, eventLocationId: "", locationId: "" })); setShowEventLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] cursor-pointer ${!form.eventLocationId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>— Clear —</button>
                        {eventLocations.map(el => {
                          const id = el.locationId || el.id;
                          return (
                            <button key={id} type="button" onClick={() => { setForm(f => ({ ...f, eventLocationId: id, locationId: "" })); setShowEventLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] cursor-pointer ${id === form.eventLocationId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                              {el.venueName || el.virtualPlatform || "Unnamed"}
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
                    <span className={`truncate ${form.locationId ? "text-[#1a1a1a]" : "text-[#aaa]"}`}>{form.locationId ? locations.find(l => l.roomId === form.locationId)?.name || "Selected" : "Select Room"}</span>
                    <ChevronRight size={14} className={`text-[#aaa] transition-transform shrink-0 ${showAssignLocDropdown ? "rotate-90" : ""}`} />
                  </button>
                  {showAssignLocDropdown && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowAssignLocDropdown(false)} />
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-52 overflow-y-auto">
                        <button type="button" onClick={() => { setForm(f => ({ ...f, locationId: "" })); setShowAssignLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] cursor-pointer ${!form.locationId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>— Clear —</button>
                        {locations.filter(loc => !form.eventLocationId || loc.locationId === form.eventLocationId).map(loc => (
                          <button key={loc.roomId} type="button" onClick={() => { setForm(f => ({ ...f, locationId: loc.roomId })); setShowAssignLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] cursor-pointer ${loc.roomId === form.locationId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                            {loc.name} {loc.roomNumber ? `(${loc.roomNumber})` : ""}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Availability Scheduler (Custom Shifts) */}
              <div className="bg-[#fafafa] border border-[#e5e7eb] rounded-2xl p-4 space-y-3">
                <div>
                  <h4 className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-1">{t("adminTeam.form.availabilitySchedulerHeading")}</h4>
                  <p className="text-[10px] text-[#aaa]">Add custom shift slots when the participant works outside of session times.</p>
                </div>
                <div className="flex gap-2 items-end flex-wrap">
                  <div className="flex-1 min-w-[120px] relative">
                    <label className={label}>{t("adminTeam.form.dayLabel")}</label>
                    <button type="button" onClick={() => setShowAvailDayDropdown(v => !v)} className={`${inp} py-1.5 w-full text-left flex items-center justify-between cursor-pointer`}>
                      <span className="truncate">{eventDays.find(d => d.value === availDay)?.label || availDay}</span>
                      <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showAvailDayDropdown ? "rotate-90" : ""}`} />
                    </button>
                    {showAvailDayDropdown && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowAvailDayDropdown(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1 max-h-52 overflow-y-auto">
                          {eventDays.length > 0 ? eventDays.map(d => (
                            <button key={d.value} type="button" onClick={() => { setAvailDay(d.value); setShowAvailDayDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[#fafafa] cursor-pointer ${d.value === availDay ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>{d.label}</button>
                          )) : (
                            <div className="px-4 py-2 text-sm text-[#aaa]">No event days found</div>
                          )}
                          <button type="button" onClick={() => { setAvailDay("All Days"); setShowAvailDayDropdown(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-[#fafafa] cursor-pointer border-t border-[#f0f0f0] ${availDay === "All Days" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>{t("adminTeam.days.allDays")}</button>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="w-[80px]"><label className={label}>{t("adminTeam.form.startLabel")}</label><input type="time" value={availStart} onChange={e => setAvailStart(e.target.value)} className={`${inp} py-1.5 px-2`} /></div>
                  <div className="w-[80px]"><label className={label}>{t("adminTeam.form.endLabel")}</label><input type="time" value={availEnd} onChange={e => setAvailEnd(e.target.value)} className={`${inp} py-1.5 px-2`} /></div>
                  <button type="button" onClick={addAvailabilitySlot} className="bg-[#1a1a1a] text-white w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black transition-colors shrink-0 cursor-pointer">
                    <Plus size={16} />
                  </button>
                </div>

                {form.availabilitySlots.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[#f0f0f0]">
                    {form.availabilitySlots.map(slot => (
                      <div key={slot.id} className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-full text-xs font-semibold">
                        <Clock size={11} className="opacity-70" />
                        <span>{slot.day === "All Days" ? t("adminTeam.days.allDays") : slot.day}: {slot.startTime} - {slot.endTime}</span>
                        <button type="button" onClick={() => removeAvailabilitySlot(slot.id)} className="hover:text-red-500 cursor-pointer ml-0.5">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Task & Status */}
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
                      <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1">
                        <button type="button" onClick={() => { setForm(f => ({ ...f, assignmentStatus: "ACTIVE" })); setShowAssignStatusDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] cursor-pointer ${form.assignmentStatus === "ACTIVE" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>{t("adminTeam.form.assignmentStatusActive")}</button>
                        <button type="button" onClick={() => { setForm(f => ({ ...f, assignmentStatus: "ENDED" })); setShowAssignStatusDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] cursor-pointer ${form.assignmentStatus === "ENDED" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>{t("adminTeam.form.assignmentStatusEnded")}</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Profile Photo */}
            <div className="border-t border-[#f0f0f0] pt-5">
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

        {/* Drawer Footer */}
        <div className="p-6 border-t border-[#f3f4f6] bg-white shrink-0">
          <button type="submit" form="team-form" disabled={saving} className={saveBtn + " w-full justify-center py-3"}>
            <Plus size={15} />{saving ? t("adminTeam.form.registering") : (editingParticipant ? t("adminTeam.form.saveChanges") : t("adminTeam.form.registerParticipant"))}
          </button>
        </div>
      </div>
    </div>
  );
}
