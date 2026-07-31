"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import dynamic from "next/dynamic";
import {
  Plus, Trash2, Upload, Calendar, MapPin, Ticket, Users, Mic2,
  Radio, Mail, ChevronRight, X, Check, Save, Image as ImageIcon,
  Globe, Wifi, User, Pencil, Tag, Star, ScanLine, Package, QrCode,
  Building2, Megaphone, Copy, AlertTriangle, MessageSquare, Layers,
  FileText, Sparkles
  , List
} from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { savePendingEvent } from "@/app/utils/offlineDb";
import { useOfflineSync } from "@/app/utils/useOfflineSync";
import { useLanguage } from "@/app/context/LanguageContext";

const EventMap = dynamic(() => import("@/components/EventMap"), { ssr: false, loading: () => <div className="w-full h-40 bg-[#f5f5f5] rounded-xl animate-pulse" /> });

type EventTab = "overview" | "details" | "schedule" | "location" | "tickets" | "coupons" | "team" | "sessions" | "speakers" | "sponsors" | "registrations" | "vendors" | "announcements" | "feedback" | "live" | "email" | "sections";

const TABS: { id: EventTab; labelKey: string; icon: any }[] = [
  { id: "overview", labelKey: "adminEvents.tabs.overview", icon: Globe },
  { id: "details", labelKey: "adminEvents.tabs.details", icon: ImageIcon },
  { id: "schedule", labelKey: "adminEvents.tabs.schedule", icon: Calendar },
  { id: "location", labelKey: "adminEvents.tabs.location", icon: MapPin },
  { id: "sections", labelKey: "adminEvents.tabs.sections", icon: Layers }
];

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";
const saveBtn = "flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-50";
const addBtn = "flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-colors cursor-pointer";

const toLocalISOString = (dateInput?: string | Date) => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

// Splits a start→end range into one schedule per calendar day, each keeping
// the same start/end time-of-day (e.g. picking 21st 09:00 → 23rd 17:00 gives
// three days, each running 09:00→17:00). A same-day range stays a single day.
const splitIntoDailySchedules = (start: Date, end: Date, timezone: string) => {
  const schedules: { startDatetime: string; endDatetime: string; timezone: string }[] = [];
  const startTimeMs = start.getHours() * 3600000 + start.getMinutes() * 60000;
  const endTimeMs = end.getHours() * 3600000 + end.getMinutes() * 60000;

  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  while (cursor <= lastDay) {
    const dayStart = new Date(cursor.getTime() + startTimeMs);
    const dayEnd = new Date(cursor.getTime() + endTimeMs);
    schedules.push({ startDatetime: dayStart.toISOString(), endDatetime: dayEnd.toISOString(), timezone });
    cursor.setDate(cursor.getDate() + 1);
  }
  return schedules;
};

export default function EventsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const auth = getStoredAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [tab, setTab] = useState<EventTab>("details");
  const [saving, setSaving] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showEventsPanel, setShowEventsPanel] = useState(false);

  // ── New event form ──
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newStart, setNewStart] = useState(new Date().toISOString().slice(0, 16));
  const [newEnd, setNewEnd] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));

  // ── Details ──
  const [categories, setCategories] = useState<any[]>([]);
  const [banner, setBanner] = useState("");
  const [detailsForm, setDetailsForm] = useState({ title: "", description: "", status: "DRAFT", categoryId: "", maxCapacity: 100, maxExhibitors: 0, currency: "XAF", format: "IN_PERSON", visibility: "PUBLIC", isPaid: false, themes: "", motto: "" });

  // ── Schedule ── (one row per day of a multi-day event)
  const [schedules, setSchedules] = useState<any[]>([]);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [schedForm, setSchedForm] = useState({ startDatetime: "", endDatetime: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
  // Derived overall event window (earliest start → latest end across all days) —
  // everything below that used to read the single `schedule` record keeps working unchanged.
  const schedule = useMemo(() => {
    if (schedules.length === 0) return null;
    const starts = schedules.map((s: any) => new Date(s.startDatetime).getTime()).filter((n) => !isNaN(n));
    const ends = schedules.map((s: any) => new Date(s.endDatetime).getTime()).filter((n) => !isNaN(n));
    if (starts.length === 0 || ends.length === 0) return schedules[0];
    return {
      startDatetime: new Date(Math.min(...starts)).toISOString(),
      endDatetime: new Date(Math.max(...ends)).toISOString(),
      timezone: schedules[0].timezone,
    };
  }, [schedules]);

  // ── Location ──
  const [locations, setLocations] = useState<any[]>([]);
  const [locForm, setLocForm] = useState({ venueName: "", address: "", city: "", country: "Cameroon", isVirtual: false, virtualPlatform: "", virtualLink: "", latitude: 3.848, longitude: 11.502 });

  // ── Tickets ──
  const [tickets, setTickets] = useState<any[]>([]);
  const [ticketForm, setTicketForm] = useState({ name: "", description: "", price: 0, quantity: 100, maxPerOrder: 10, isFree: true, saleStart: "", saleEnd: "", locationId: "", sessionIds: [] as string[] });

  // ── Team ──
  const [team, setTeam] = useState<any[]>([]);
  const [teamForm, setTeamForm] = useState({ name: "", position: "", bio: "", photoUrl: "" });
  const [teamLoading, setTeamLoading] = useState(false);

  // ── Sessions ──
  const [sessions, setSessions] = useState<any[]>([]);
  const [tracks, setTracks] = useState<any[]>([]);
  const [sessionForm, setSessionForm] = useState({ title: "", description: "", type: "TALK", startTime: "", endTime: "", capacity: 50, trackId: "" });
  const [trackForm, setTrackForm] = useState({ name: "", description: "", locationId: "", eventScheduleId: "" });

  // ── Live ──
  const [polls, setPolls] = useState<any[]>([]);
  const [qaQuestions, setQaQuestions] = useState<any[]>([]);
  const [pollForm, setPollForm] = useState({ question: "", options: ["", ""] });
  const [qaForm, setQaForm] = useState({ questionText: "", isAnonymous: false, sessionId: "" });

  // ── Email ──
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [emailForm, setEmailForm] = useState({ subject: "", body: "", targetAudience: "ALL_REGISTRANTS", scheduledAt: "" });

  // ── Sponsors ──
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [sponsorPackages, setSponsorPackages] = useState<any[]>([]);
  const [sponsorForm, setSponsorForm] = useState({ name: "", email: "", website: "", logoUrl: "", packageId: "" });
  const [sponsorPkgForm, setSponsorPkgForm] = useState({ name: "", description: "", price: 0, benefits: "", maxSponsors: 0, applicationStart: "", applicationEnd: "" });
  const [volunteerOpenings, setVolunteerOpenings] = useState<any[]>([]);
  const [volunteerOpeningForm, setVolunteerOpeningForm] = useState({ title: "", description: "", requirements: "", applicationStart: "", applicationEnd: "", maxVolunteers: 0 });
  const [editingVolunteerOpening, setEditingVolunteerOpening] = useState<any>(null);
  const [volunteerApplications, setVolunteerApplications] = useState<any[]>([]);
  const [editingSponsor, setEditingSponsor] = useState<any>(null);

  // ── Invitations ──
  const [invitations, setInvitations] = useState<any[]>([]);
  const [inviteEmails, setInviteEmails] = useState("");
  const [sendingInvites, setSendingInvites] = useState(false);

  // ── Speakers ──
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [speakerForm, setSpeakerForm] = useState({ name: "", bio: "", photoUrl: "", company: "", title: "", sessionId: "", locationId: "" });
  const [editingSpeaker, setEditingSpeaker] = useState<any>(null);
  const speakerFormRef = useRef<HTMLFormElement>(null);
  const sponsorFormRef = useRef<HTMLFormElement>(null);

  // ── Coupons ──
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponForm, setCouponForm] = useState({ code: "", type: "PERCENTAGE", value: 10, maxUses: 100, expiryDate: "" });
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const couponFormRef = useRef<HTMLFormElement>(null);

  // ── Inline new category ──
  const [showCategoryInline, setShowCategoryInline] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showFormatDropdown, setShowFormatDropdown] = useState(false);
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const handleCreateCategoryInline = async () => {
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
    try {
      const created = await eventService.createEventCategory({ tenantId: auth?.tenantId, name: newCategoryName.trim() });
      const cats = await eventService.getEventCategories();
      setCategories(cats || []);
      setDetailsForm(f => ({ ...f, categoryId: created?.categoryId || created?.id }));
      setNewCategoryName("");
      setShowCategoryInline(false);
      showToast("Category created!");
    } catch {
      showToast("Failed to create category");
    } finally {
      setSavingCategory(false);
    }
  };

  // ── Registrations ──
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);

  // ── Vendors (Exhibitors) ──
  const [exhibitors, setExhibitors] = useState<any[]>([]);
  const [exhibitorForm, setExhibitorForm] = useState({ name: "", email: "", website: "", logoUrl: "", boothNumber: "", locationId: "" });
  const [editingExhibitor, setEditingExhibitor] = useState<any>(null);
  const exhibitorFormRef = useRef<HTMLFormElement>(null);

  // ── Announcements ──
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "", type: "GENERAL" });
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const announcementFormRef = useRef<HTMLFormElement>(null);

  // ── Feedback ──
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  // ── Custom Sections ──
  const [eventSections, setEventSections] = useState<any[]>([]);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [sectionForm, setSectionForm] = useState({ title: "", content: "", imageUrl: "", displayOrder: 0, sectionType: "CUSTOM", status: "ACTIVE" });

  const getNextSectionOrder = (secs: any[]) => secs && secs.length > 0 ? Math.max(...secs.map((s: any) => s.displayOrder || 0)) + 1 : 0;

  // ── Edit mode (null = create, set = editing that record) ──
  const [editingLocation, setEditingLocation] = useState<any>(null);
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [editingPoll, setEditingPoll] = useState<any>(null);
  const [editingTrack, setEditingTrack] = useState<any>(null);

  // Form refs — used to trigger submit from the header "Save" button
  const locFormRef = useRef<HTMLFormElement>(null);
  const ticketFormRef = useRef<HTMLFormElement>(null);
  const teamFormRef = useRef<HTMLFormElement>(null);
  const sessionFormRef = useRef<HTMLFormElement>(null);
  const pollFormRef = useRef<HTMLFormElement>(null);
  const qaFormRef = useRef<HTMLFormElement>(null);
  const emailFormRef = useRef<HTMLFormElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000); };

  const loadEvents = async () => {
    try {
      const evs = await eventService.getMyEvents();
      const filtered = (evs || []).filter((e: any) => !auth?.tenantId || !e.tenantId || e.tenantId === auth.tenantId);
      setEvents(filtered);
      if (!selectedId && filtered.length) {
        const firstId = filtered[0].eventId;
        setSelectedId(firstId);
        setTab("overview");
        setShowNew(false);
        await loadEventData(firstId, filtered);
      }
    } catch { }
  };

  useOfflineSync((count) => {
    showToast(`${count} offline event${count > 1 ? "s" : ""} synced!`);
    loadEvents();
  });

  const selectEvent = async (id: string) => {
    setSelectedId(id);
    setTab("overview");
    setShowNew(false);
    setDeleteConfirmText("");
    await loadEventData(id);
  };

  const loadEventData = async (id: string, evList?: any[]) => {
    const tenantId = auth?.tenantId;
    const byEvent = (item: any) =>
      (item.eventId === id || item.event?.eventId === id) &&
      (!tenantId || !item.tenantId || item.tenantId === tenantId);

    try {
      const [ev, cats, locs, tix, scheds, sess, trks, pls, qas, camps, nets, spons, sponsPkgs, spkrs, cpns, exhbs, anncs, fdbks, volOpenings, sectionsList, invs] = await Promise.all([
        eventService.getEventById(id).catch(() => null),
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
        eventService.getSponsors().catch(() => []),
        eventService.getSponsorshipPackages().catch(() => []),
        eventService.getSessionSpeakers().catch(() => []),
        eventService.getCoupons().catch(() => []),
        eventService.getExhibitors().catch(() => []),
        eventService.getAnnouncements().catch(() => []),
        eventService.getFeedbacks().catch(() => []),
        eventService.getVolunteerOpenings().catch(() => []),
        eventService.getEventSections(id).catch(() => []),
        eventService.getInvitations().catch(() => []),
      ]);

      // Populate event details directly from the fetched event (avoids stale state)
      if (ev) {
        setDetailsForm({ title: ev.title || "", description: ev.description || "", status: ev.status || "DRAFT", categoryId: ev.categoryId || "", maxCapacity: ev.maxCapacity ?? 0, maxExhibitors: ev.maxExhibitors ?? 0, currency: ev.currency || "XAF", format: ev.format || "IN_PERSON", visibility: ev.visibility || "PUBLIC", isPaid: ev.isPaid ?? false, themes: ev.themes || "", motto: ev.motto || "" });
        setBanner(ev.coverImage || "");
        // Keep events list in sync if caller passed a fresh list
        if (evList) setEvents(evList);
      }

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
      setVolunteerApplications((nets || []).filter((n: any) => byEvent(n) && n.role === "VOLUNTEER"));
      setSponsors((spons || []).filter(byEvent));
      setSponsorPackages((sponsPkgs || []).filter(byEvent));
      setSpeakers((spkrs || []).filter(byEvent));
      setCoupons((cpns || []).filter(byEvent));
      setExhibitors((exhbs || []).filter(byEvent));
      setAnnouncements((anncs || []).filter(byEvent));
      setFeedbacks((fdbks || []).filter(byEvent));
      setVolunteerOpenings((volOpenings || []).filter(byEvent));
      setEventSections((sectionsList || []).filter(byEvent));
      setInvitations((invs || []).filter((inv: any) => inv.eventId === id));

      const eventSchedules = (scheds || []).filter((s: any) => s.eventId === id || s.event?.eventId === id)
        .sort((a: any, b: any) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());
      setSchedules(eventSchedules);
      setEditingSchedule(null);
      setSchedForm({ startDatetime: "", endDatetime: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadEvents(); }, []);
  useEffect(() => { if (tab === "registrations" && selectedId) loadRegistrations(); }, [tab, selectedId]);

  const selectedEvent = events.find(e => e.eventId === selectedId);

  const maxCapacity = detailsForm.maxCapacity || 0;
  const allocatedTicketQty = tickets.reduce((sum: number, t: any) => sum + (t.quantityAvailable ?? 0), 0);

  // ── Custom Sections Actions ──
  const saveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    setSaving(true);
    try {
      if (editingSection) {
        await eventService.updateEventSection(editingSection.sectionId || editingSection.id, {
          ...sectionForm,
          eventId: selectedId,
          tenantId: auth?.tenantId
        });
        showToast(t("adminEvents.toasts.sectionUpdated"));
        setEditingSection(null);
      } else {
        await eventService.createEventSection({
          ...sectionForm,
          eventId: selectedId,
          tenantId: auth?.tenantId
        });
        showToast(t("adminEvents.toasts.sectionCreated"));
      }
      setSectionForm({ title: "", content: "", imageUrl: "", displayOrder: 0, sectionType: "CUSTOM", status: "ACTIVE" });
      const secs = await eventService.getEventSections(selectedId).catch(() => []);
      setEventSections(secs || []);
    } catch (err: any) {
      showToast(err.message || t("adminEvents.toasts.sectionSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm(t("adminEvents.sections.confirmDelete"))) return;
    try {
      await eventService.deleteEventSection(sectionId);
      showToast(t("adminEvents.toasts.sectionDeleted"));
      const secs = await eventService.getEventSections(selectedId).catch(() => []);
      setEventSections(secs || []);
      if (editingSection && (editingSection.sectionId === sectionId || editingSection.id === sectionId)) {
        setEditingSection(null);
        setSectionForm({ title: "", content: "", imageUrl: "", displayOrder: 0, sectionType: "CUSTOM", status: "ACTIVE" });
      }
    } catch (err: any) {
      showToast(err.message || t("adminEvents.toasts.sectionDeleteFailed"));
    }
  };

  // ── Create new event ──
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const start = new Date(newStart);
    const end = new Date(newEnd);
    if (start < new Date()) { showToast(t("adminEvents.toasts.startInPast")); return; }
    if (end <= start) { showToast(t("adminEvents.toasts.endBeforeStart")); return; }
    if ((end.getTime() - start.getTime()) < 2 * 3600 * 1000) { showToast(t("adminEvents.toasts.minDuration")); return; }
    setSaving(true);
    const eventData = { tenantId: auth?.tenantId, organizerId: auth?.userId, title: newTitle, description: newDesc, status: "DRAFT", currency: "XAF", format: "IN_PERSON", visibility: "PUBLIC", isPaid: false, maxCapacity: 100 };
    const scheduleDataList = splitIntoDailySchedules(start, end, Intl.DateTimeFormat().resolvedOptions().timeZone);
    try {
      const ev = await eventService.createEvent(eventData);
      const id = ev.eventId || (ev as any).id;
      for (const day of scheduleDataList) {
        await eventService.createEventSchedule({ eventId: id, ...day });
      }
      setNewTitle(""); setNewDesc("");
      await loadEvents();
      await selectEvent(id);
      showToast(t("adminEvents.toasts.eventCreated"));
    } catch (err: any) {
      if (!navigator.onLine || err?.message?.toLowerCase().includes("network") || err?.message?.toLowerCase().includes("fetch")) {
        await savePendingEvent(eventData, scheduleDataList);
        setNewTitle(""); setNewDesc("");
        showToast(t("adminEvents.toasts.savedOffline"));
      } else {
        showToast(t("adminEvents.toasts.errorPrefix") + err.message);
      }
    }
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
        maxExhibitors: detailsForm.maxExhibitors || undefined,
        currency: detailsForm.currency,
        coverImage: banner || undefined,
        format: detailsForm.format || "IN_PERSON",
        visibility: detailsForm.visibility || "PUBLIC",
        isPaid: detailsForm.isPaid ?? false,
        themes: detailsForm.themes || "",
        motto: detailsForm.motto || "",
      });
      // Refresh events list and re-sync the selected event details
      const evs = await eventService.getMyEvents().catch(() => []);
      const filtered = (evs || []).filter((e: any) => !auth?.tenantId || !e.tenantId || e.tenantId === auth.tenantId);
      setEvents(filtered);
      showToast(t("adminEvents.toasts.detailsSaved"));
    } catch (err: any) {
      showToast(err.message || t("adminEvents.toasts.detailsSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvitations = async () => {
    if (!inviteEmails.trim() || !selectedId) return;
    setSendingInvites(true);
    try {
      const emails = inviteEmails
        .split(",")
        .map(e => e.trim())
        .filter(e => e.length > 0 && e.includes("@"));
      if (emails.length === 0) {
        showToast(t("adminEvents.toasts.noValidEmails"));
        setSendingInvites(false);
        return;
      }
      for (const email of emails) {
        await eventService.createInvitation({
          eventId: selectedId,
          email: email,
          status: "PENDING",
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
      showToast(t("adminEvents.toasts.invitationsSent", { count: emails.length }));
      setInviteEmails("");
      const list = await eventService.getInvitations().catch(() => []);
      setInvitations((list || []).filter((inv: any) => inv.eventId === selectedId));
    } catch (err: any) {
      showToast(t("adminEvents.toasts.invitationsSendFailed"));
    } finally {
      setSendingInvites(false);
    }
  };

  // ── Schedule: reload the day list for the current event ──
  const reloadSchedules = async () => {
    if (!selectedId) return;
    const scheds = await eventService.getEventSchedules().catch(() => []);
    const eventSchedules = (scheds || []).filter((s: any) => s.eventId === selectedId || s.event?.eventId === selectedId)
      .sort((a: any, b: any) => new Date(a.startDatetime).getTime() - new Date(b.startDatetime).getTime());
    setSchedules(eventSchedules);
  };

  // ── Save schedule (add a new day, or update the one being edited) ──
  const saveSchedule = async () => {
    if (!selectedId) return;
    const start = new Date(schedForm.startDatetime);
    const end = new Date(schedForm.endDatetime);
    if (start < new Date()) { showToast(t("adminEvents.toasts.startInPast")); return; }
    if (end <= start) { showToast(t("adminEvents.toasts.endBeforeStart")); return; }
    if ((end.getTime() - start.getTime()) < 2 * 3600 * 1000) { showToast(t("adminEvents.toasts.minDuration")); return; }
    setSaving(true);
    try {
      if (editingSchedule?.scheduleId || editingSchedule?.id) {
        await eventService.updateEventSchedule(editingSchedule.scheduleId || editingSchedule.id, { eventId: selectedId, startDatetime: new Date(schedForm.startDatetime).toISOString(), endDatetime: new Date(schedForm.endDatetime).toISOString(), timezone: schedForm.timezone });
        setEditingSchedule(null);
      } else {
        await eventService.createEventSchedule({ eventId: selectedId, startDatetime: new Date(schedForm.startDatetime).toISOString(), endDatetime: new Date(schedForm.endDatetime).toISOString(), timezone: schedForm.timezone });
      }
      setSchedForm({ startDatetime: "", endDatetime: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      await reloadSchedules();
      showToast(t("adminEvents.toasts.scheduleSaved"));
    } catch (err: any) {
      showToast(err.message || t("adminEvents.toasts.scheduleSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const deleteScheduleDay = async (id: string) => {
    if (!confirm(t("adminEvents.schedule.confirmDelete") || "Delete this day?")) return;
    try {
      await eventService.deleteEventSchedule(id);
      if (editingSchedule?.scheduleId === id || editingSchedule?.id === id) {
        setEditingSchedule(null);
        setSchedForm({ startDatetime: "", endDatetime: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      }
      await reloadSchedules();
      showToast(t("adminEvents.toasts.scheduleSaved"));
    } catch (err: any) {
      showToast(err.message || t("adminEvents.toasts.scheduleSaveFailed"));
    }
  };

  // ── Save location (create or update) ──
  const saveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (detailsForm.format === "IN_PERSON" && locForm.isVirtual) {
      showToast(t("adminEvents.toasts.virtualOnInPerson"));
      return;
    }
    if (detailsForm.format === "VIRTUAL" && !locForm.isVirtual) {
      showToast(t("adminEvents.toasts.physicalOnVirtual"));
      return;
    }
    setSaving(true);
    const payload = { eventId: selectedId, tenantId: auth?.tenantId, type: locForm.isVirtual ? "VIRTUAL" : "VENUE", venueName: locForm.venueName, address: locForm.address, city: locForm.city, country: locForm.country, latitude: locForm.latitude, longitude: locForm.longitude, virtualPlatform: locForm.virtualPlatform, virtualLink: locForm.virtualLink };
    try {
      if (editingLocation) {
        await eventService.updateEventLocation(editingLocation.locationId, payload);
        setEditingLocation(null);
        showToast(t("adminEvents.toasts.locationUpdated"));
      } else {
        await eventService.createEventLocation(payload);
        showToast(t("adminEvents.toasts.locationAdded"));
      }
      setLocForm({ venueName: "", address: "", city: "", country: "Cameroon", isVirtual: false, virtualPlatform: "", virtualLink: "", latitude: 3.848, longitude: 11.502 });
      await loadEventData(selectedId);
    } catch (err: any) {
      showToast(err.message || (editingLocation ? t("adminEvents.toasts.locationUpdateFailed") : t("adminEvents.toasts.locationAddFailed")));
    } finally {
      setSaving(false);
    }
  };

  // ── Save ticket (create or update) ──
  const saveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(ticketForm.quantity);
    const mpo = Number(ticketForm.maxPerOrder);
    const now = new Date();
    const eventStart = schedule?.startDatetime ? new Date(schedule.startDatetime) : null;
    const eventEnd = schedule?.endDatetime ? new Date(schedule.endDatetime) : null;

    // ── Quantity vs capacity ──
    if (maxCapacity > 0) {
      const usedByOthers = allocatedTicketQty - (editingTicket ? (editingTicket.quantityAvailable ?? 0) : 0);
      const allowed = maxCapacity - usedByOthers;
      if (qty > allowed) {
        showToast(t("adminEvents.toasts.quantityExceedsCapacity", { allowed, max: maxCapacity }));
        return;
      }
    }

    // ── Max Per Order ──
    if (mpo < 1) { showToast(t("adminEvents.toasts.maxPerOrderMin")); return; }
    if (maxCapacity > 0 && mpo > maxCapacity) {
      showToast(t("adminEvents.toasts.maxPerOrderExceedsCapacity", { mpo, max: maxCapacity }));
      return;
    }
    if (mpo > qty) {
      showToast(t("adminEvents.toasts.maxPerOrderExceedsQty", { mpo, qty }));
      return;
    }

    // ── Sale dates ──
    if (ticketForm.saleStart) {
      const saleStart = new Date(ticketForm.saleStart);
      if (eventEnd && saleStart >= eventEnd) {
        showToast(t("adminEvents.toasts.saleStartBeforeEnd", { date: fmtDt(schedule.endDatetime) }));
        return;
      }
      if (ticketForm.saleEnd) {
        const saleEnd = new Date(ticketForm.saleEnd);
        if (saleEnd <= saleStart) { showToast(t("adminEvents.toasts.saleEndAfterStart")); return; }
        if (saleEnd.getTime() - saleStart.getTime() < 2 * 3600 * 1000) {
          showToast(t("adminEvents.toasts.saleWindowMin")); return;
        }
        if (eventEnd && saleEnd > eventEnd) {
          showToast(t("adminEvents.toasts.saleEndAfterEvent", { date: fmtDt(schedule.endDatetime) }));
          return;
        }
      }
    } else if (ticketForm.saleEnd) {
      const saleEnd = new Date(ticketForm.saleEnd);
      if (eventEnd && saleEnd > eventEnd) {
        showToast(t("adminEvents.toasts.saleEndAfterEvent", { date: fmtDt(schedule.endDatetime) }));
        return;
      }
    }

    setSaving(true);
    const payload = {
      eventId: selectedId,
      name: ticketForm.name,
      description: ticketForm.description,
      price: ticketForm.isFree ? 0 : Number(ticketForm.price),
      currency: "XAF",
      quantityAvailable: qty,
      quantitySold: editingTicket?.quantitySold ?? 0,
      saleStart: ticketForm.saleStart ? new Date(ticketForm.saleStart).toISOString() : undefined,
      saleEnd: ticketForm.saleEnd ? new Date(ticketForm.saleEnd).toISOString() : undefined,
      maxPerOrder: mpo,
      locationId: ticketForm.locationId || undefined,
      sessionIds: ticketForm.sessionIds,
    };
    try {
      if (editingTicket) {
        await eventService.updateTicketType(editingTicket.ticketId, payload);
        setEditingTicket(null);
        showToast(t("adminEvents.toasts.ticketUpdated"));
      } else {
        await eventService.createTicketType(payload);
        showToast(t("adminEvents.toasts.ticketAdded"));
      }
      setTicketForm({ name: "", description: "", price: 0, quantity: 100, maxPerOrder: 10, isFree: true, saleStart: "", saleEnd: "", locationId: "", sessionIds: [] });
      await loadEventData(selectedId);
    } catch (err: any) {
      showToast(err.message || (editingTicket ? t("adminEvents.toasts.ticketUpdateFailed") : t("adminEvents.toasts.ticketAddFailed")));
    } finally {
      setSaving(false);
    }
  };

  // ── Save team member (create or update) ──
  const saveTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.name) return;
    setTeamLoading(true);
    const payload = {
      eventId: selectedId,
      role: "TEAM_MEMBER",
      name: teamForm.name,
      skills: teamForm.position,
      availability: teamForm.bio,
      photoUrl: teamForm.photoUrl || undefined,
      status: "ACTIVE",
    };
    try {
      if (editingMember) {
        await eventService.updateNetworking(editingMember.connectionId, payload);
        setEditingMember(null);
        showToast(t("adminEvents.toasts.memberUpdated"));
      } else {
        await eventService.createNetworking(payload);
        showToast(t("adminEvents.toasts.memberAdded"));
      }
      setTeamForm({ name: "", position: "", bio: "", photoUrl: "" });
      await loadEventData(selectedId);
    } catch { showToast(editingMember ? t("adminEvents.toasts.memberUpdateFailed") : t("adminEvents.toasts.memberAddFailed")); }
    finally { setTeamLoading(false); }
  };

  // ── Save session (create or update) ──
  const saveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (maxCapacity > 0 && Number(sessionForm.capacity) > maxCapacity) {
      showToast(t("adminEvents.toasts.sessionCapacityExceeded", { max: maxCapacity }));
      return;
    }
    setSaving(true);
    const payload = {
      eventId: selectedId,
      trackId: sessionForm.trackId || undefined,
      title: sessionForm.title,
      description: sessionForm.description,
      type: sessionForm.type,
      startTime: sessionForm.startTime ? new Date(sessionForm.startTime).toISOString() : undefined,
      endTime: sessionForm.endTime ? new Date(sessionForm.endTime).toISOString() : undefined,
      maxCapacity: Number(sessionForm.capacity),
      isRecorded: false,
    };
    try {
      if (editingSession) {
        await eventService.updateSession(editingSession.sessionId, payload);
        setEditingSession(null);
        showToast(t("adminEvents.toasts.sessionUpdated"));
      } else {
        await eventService.createSession(payload);
        showToast(t("adminEvents.toasts.sessionAdded"));
      }
      setSessionForm({ title: "", description: "", type: "TALK", startTime: "", endTime: "", capacity: 50, trackId: "" });
      await loadEventData(selectedId);
    } catch (err: any) {
      showToast(err.message || (editingSession ? t("adminEvents.toasts.sessionUpdateFailed") : t("adminEvents.toasts.sessionAddFailed")));
    } finally {
      setSaving(false);
    }
  };

  // ── Save track ──
  const saveTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackForm.name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        eventId: selectedId,
        tenantId: auth?.tenantId,
        name: trackForm.name,
        description: trackForm.description || undefined,
        locationId: trackForm.locationId || undefined,
        eventScheduleId: trackForm.eventScheduleId || undefined,
      };
      if (editingTrack) {
        await eventService.updateTrack(editingTrack.trackId || editingTrack.id, payload);
        setEditingTrack(null);
        showToast(t("adminEvents.toasts.trackUpdated"));
      } else {
        await eventService.createTrack(payload);
        showToast(t("adminEvents.toasts.trackCreated"));
      }
      setTrackForm({ name: "", description: "", locationId: "", eventScheduleId: "" });
      await loadEventData(selectedId);
    } catch (err: any) {
      showToast(err.message || t("adminEvents.toasts.trackSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  // ── Save poll (create or update) ──
  const savePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      eventId: selectedId,
      question: pollForm.question,
      options: JSON.stringify(pollForm.options.filter(o => o.trim())),
      isActive: true,
    };
    try {
      if (editingPoll) {
        await eventService.updatePoll(editingPoll.pollId, payload);
        setEditingPoll(null);
        showToast(t("adminEvents.toasts.pollUpdated"));
      } else {
        await eventService.createPoll(payload);
        showToast(t("adminEvents.toasts.pollCreated"));
      }
      setPollForm({ question: "", options: ["", ""] });
      await loadEventData(selectedId);
    } catch { showToast(editingPoll ? t("adminEvents.toasts.pollUpdateFailed") : t("adminEvents.toasts.pollCreateFailed")); }
    finally { setSaving(false); }
  };

  // ── Add Q&A ──
  const addQA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qaForm.sessionId) { showToast(t("adminEvents.toasts.selectSessionFirst")); return; }
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
      showToast(t("adminEvents.toasts.questionAdded"));
    } catch { showToast(t("adminEvents.toasts.questionAddFailed")); }
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
      showToast(t("adminEvents.toasts.campaignScheduled"));
    } catch { showToast(t("adminEvents.toasts.campaignScheduleFailed")); }
    finally { setSaving(false); }
  };

  // ── Save sponsor ──
  const saveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { eventId: selectedId, tenantId: auth?.tenantId, name: sponsorForm.name, email: sponsorForm.email, website: sponsorForm.website, logoUrl: sponsorForm.logoUrl || undefined, packageId: sponsorForm.packageId || undefined };
    try {
      if (editingSponsor) {
        await eventService.updateSponsor(editingSponsor.sponsorId || editingSponsor.id, { ...payload, status: editingSponsor.status || "APPROVED" });
        setEditingSponsor(null);
        showToast(t("adminEvents.toasts.sponsorUpdated"));
      } else {
        await eventService.createSponsor({ ...payload, status: "APPROVED" });
        showToast(t("adminEvents.toasts.sponsorAdded"));
      }
      setSponsorForm({ name: "", email: "", website: "", logoUrl: "", packageId: "" });
      await loadEventData(selectedId);
    } catch { showToast(editingSponsor ? t("adminEvents.toasts.sponsorUpdateFailed") : t("adminEvents.toasts.sponsorAddFailed")); }
    finally { setSaving(false); }
  };

  // ── Approve/reject a publicly-submitted sponsor application ──
  const updateSponsorStatus = async (s: any, status: string) => {
    try {
      await eventService.updateSponsor(s.sponsorId || s.id, {
        eventId: selectedId, tenantId: auth?.tenantId,
        name: s.name, companyName: s.companyName, contactName: s.contactName,
        email: s.email, phone: s.phone, message: s.message,
        website: s.website, logoUrl: s.logoUrl, packageId: s.packageId,
        status,
      });
      await loadEventData(selectedId);
      showToast(status === "APPROVED" ? t("adminEvents.toasts.sponsorApproved") : t("adminEvents.toasts.sponsorRejected"));
    } catch { showToast(t("adminEvents.toasts.sponsorStatusFailed")); }
  };

  // ── Save sponsorship package ──
  const saveSponsorPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await eventService.createSponsorshipPackage({
        eventId: selectedId, tenantId: auth?.tenantId,
        name: sponsorPkgForm.name, description: sponsorPkgForm.description,
        price: Number(sponsorPkgForm.price), benefits: sponsorPkgForm.benefits,
        maxSponsors: sponsorPkgForm.maxSponsors || undefined,
        applicationStart: sponsorPkgForm.applicationStart ? new Date(sponsorPkgForm.applicationStart).toISOString() : undefined,
        applicationEnd: sponsorPkgForm.applicationEnd ? new Date(sponsorPkgForm.applicationEnd).toISOString() : undefined,
      });
      setSponsorPkgForm({ name: "", description: "", price: 0, benefits: "", maxSponsors: 0, applicationStart: "", applicationEnd: "" });
      await loadEventData(selectedId);
      showToast(t("adminEvents.toasts.packageCreated"));
    } catch { showToast(t("adminEvents.toasts.packageCreateFailed")); }
    finally { setSaving(false); }
  };

  // ── Save volunteer opening ──
  const saveVolunteerOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      eventId: selectedId, tenantId: auth?.tenantId,
      title: volunteerOpeningForm.title, description: volunteerOpeningForm.description,
      requirements: volunteerOpeningForm.requirements,
      maxVolunteers: volunteerOpeningForm.maxVolunteers || undefined,
      applicationStart: volunteerOpeningForm.applicationStart ? new Date(volunteerOpeningForm.applicationStart).toISOString() : undefined,
      applicationEnd: volunteerOpeningForm.applicationEnd ? new Date(volunteerOpeningForm.applicationEnd).toISOString() : undefined,
      status: "ACTIVE",
    };
    try {
      if (editingVolunteerOpening) {
        await eventService.updateVolunteerOpening(editingVolunteerOpening.openingId || editingVolunteerOpening.id, payload);
        setEditingVolunteerOpening(null);
        showToast(t("adminEvents.toasts.volunteerOpeningUpdated"));
      } else {
        await eventService.createVolunteerOpening(payload);
        showToast(t("adminEvents.toasts.volunteerOpeningCreated"));
      }
      setVolunteerOpeningForm({ title: "", description: "", requirements: "", applicationStart: "", applicationEnd: "", maxVolunteers: 0 });
      await loadEventData(selectedId);
    } catch { showToast(t("adminEvents.toasts.volunteerOpeningSaveFailed")); }
    finally { setSaving(false); }
  };

  // ── Approve/reject a volunteer application ──
  const updateVolunteerApplicationStatus = async (v: any, status: string) => {
    try {
      await eventService.updateNetworking(v.connectionId || v.id, {
        eventId: selectedId, tenantId: auth?.tenantId,
        name: v.name, email: v.email, phone: v.phone,
        role: "VOLUNTEER", skills: v.skills, availability: v.availability, photoUrl: v.photoUrl,
        status,
      });
      await loadEventData(selectedId);
      showToast(status === "APPROVED" ? t("adminEvents.toasts.volunteerApplicationApproved") : t("adminEvents.toasts.volunteerApplicationRejected"));
    } catch { showToast(t("adminEvents.toasts.volunteerApplicationStatusFailed")); }
  };

  // ── Save speaker ──
  const saveSpeaker = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      eventId: selectedId,
      tenantId: auth?.tenantId,
      sessionId: speakerForm.sessionId || undefined,
      locationId: speakerForm.locationId || undefined,
      name: speakerForm.name,
      bio: speakerForm.bio,
      photoUrl: speakerForm.photoUrl || undefined,
      company: speakerForm.company,
      title: speakerForm.title
    };
    try {
      if (editingSpeaker) {
        await eventService.updateSessionSpeaker(editingSpeaker.speakerId || editingSpeaker.id, payload);
        setEditingSpeaker(null);
        showToast(t("adminEvents.toasts.speakerUpdated"));
      } else {
        await eventService.createSessionSpeaker(payload);
        showToast(t("adminEvents.toasts.speakerAdded"));
      }
      setSpeakerForm({ name: "", bio: "", photoUrl: "", company: "", title: "", sessionId: "", locationId: "" });
      await loadEventData(selectedId);
    } catch { showToast(editingSpeaker ? t("adminEvents.toasts.speakerUpdateFailed") : t("adminEvents.toasts.speakerAddFailed")); }
    finally { setSaving(false); }
  };

  // ── Save coupon ──
  const saveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { eventId: selectedId, tenantId: auth?.tenantId, code: couponForm.code.toUpperCase(), type: couponForm.type, value: Number(couponForm.value), maxUses: Number(couponForm.maxUses), expiryDate: couponForm.expiryDate ? new Date(couponForm.expiryDate).toISOString() : undefined };
    try {
      if (editingCoupon) {
        await eventService.updateCoupon(editingCoupon.couponId || editingCoupon.id, payload);
        setEditingCoupon(null);
        showToast(t("adminEvents.toasts.couponUpdated"));
      } else {
        await eventService.createCoupon(payload);
        showToast(t("adminEvents.toasts.couponCreated"));
      }
      setCouponForm({ code: "", type: "PERCENTAGE", value: 10, maxUses: 100, expiryDate: "" });
      await loadEventData(selectedId);
    } catch { showToast(editingCoupon ? t("adminEvents.toasts.couponUpdateFailed") : t("adminEvents.toasts.couponCreateFailed")); }
    finally { setSaving(false); }
  };

  // ── Save exhibitor ──
  const saveExhibitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { eventId: selectedId, tenantId: auth?.tenantId, name: exhibitorForm.name, email: exhibitorForm.email, website: exhibitorForm.website, logoUrl: exhibitorForm.logoUrl || undefined, boothNumber: exhibitorForm.boothNumber || undefined, locationId: exhibitorForm.locationId || undefined };
    try {
      if (editingExhibitor) {
        await eventService.updateExhibitor(editingExhibitor.exhibitorId || editingExhibitor.id, { ...payload, status: editingExhibitor.status || "APPROVED" });
        setEditingExhibitor(null);
        showToast(t("adminEvents.toasts.exhibitorUpdated"));
      } else {
        await eventService.createExhibitor({ ...payload, status: "APPROVED" });
        showToast(t("adminEvents.toasts.exhibitorAdded"));
      }
      setExhibitorForm({ name: "", email: "", website: "", logoUrl: "", boothNumber: "", locationId: "" });
      await loadEventData(selectedId);
    } catch { showToast(editingExhibitor ? t("adminEvents.toasts.exhibitorUpdateFailed") : t("adminEvents.toasts.exhibitorAddFailed")); }
    finally { setSaving(false); }
  };

  // ── Approve/reject a publicly-submitted vendor application ──
  const updateExhibitorStatus = async (ex: any, status: string) => {
    try {
      await eventService.updateExhibitor(ex.exhibitorId || ex.id, {
        eventId: selectedId, tenantId: auth?.tenantId,
        name: ex.name, companyName: ex.companyName,
        email: ex.email, website: ex.website, logoUrl: ex.logoUrl,
        boothNumber: ex.boothNumber, locationId: ex.locationId,
        status,
      });
      await loadEventData(selectedId);
      showToast(status === "APPROVED" ? t("adminEvents.toasts.vendorApproved") : t("adminEvents.toasts.vendorRejected"));
    } catch { showToast(t("adminEvents.toasts.vendorStatusFailed")); }
  };

  // ── Save announcement ──
  const saveAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = { eventId: selectedId, tenantId: auth?.tenantId, title: announcementForm.title, content: announcementForm.content, type: announcementForm.type, publishedAt: new Date().toISOString() };
    try {
      if (editingAnnouncement) {
        await eventService.updateAnnouncement(editingAnnouncement.announcementId || editingAnnouncement.id, payload);
        setEditingAnnouncement(null);
        showToast(t("adminEvents.toasts.announcementUpdated"));
      } else {
        await eventService.createAnnouncement(payload);
        showToast(t("adminEvents.toasts.announcementSent"));
      }
      setAnnouncementForm({ title: "", content: "", type: "GENERAL" });
      await loadEventData(selectedId);
    } catch { showToast(editingAnnouncement ? t("adminEvents.toasts.announcementUpdateFailed") : t("adminEvents.toasts.announcementSendFailed")); }
    finally { setSaving(false); }
  };

  // ── Clone event ──
  const cloneEvent = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const cloned = await eventService.cloneEvent(selectedId);
      const clonedId = cloned.eventId || (cloned as any).id;
      await loadEvents();
      await selectEvent(clonedId);
      showToast(t("adminEvents.toasts.eventCloned"));
    } catch { showToast(t("adminEvents.toasts.eventCloneFailed")); }
    finally { setSaving(false); }
  };

  // ── Delete event (cascades everything tied to it, except payment/refund records) ──
  const deleteEventPermanently = async () => {
    if (!selectedId || !selectedEvent) return;
    setSaving(true);
    try {
      await eventService.deleteEvent(selectedId);
      setDeleteConfirmText("");
      setSelectedId("");
      await loadEvents();
      showToast("Event deleted.");
    } catch (err: any) {
      showToast(err.message || "Failed to delete event.");
    } finally {
      setSaving(false);
    }
  };

  // ── Quick status change ──
  const quickUpdateStatus = async (newStatus: string) => {
    if (!selectedId || !selectedEvent) return;
    setSaving(true);
    try {
      if (newStatus === "CANCELLED") {
        await eventService.cancelEvent(selectedId);
      } else {
        await eventService.updateEvent(selectedId, {
          tenantId: selectedEvent.tenantId,
          organizerId: selectedEvent.organizerId,
          title: selectedEvent.title,
          description: selectedEvent.description,
          status: newStatus,
          categoryId: selectedEvent.categoryId || undefined,
          maxCapacity: selectedEvent.maxCapacity,
          currency: selectedEvent.currency,
          coverImage: selectedEvent.coverImage || undefined,
          format: selectedEvent.format || "IN_PERSON",
          visibility: selectedEvent.visibility || "PUBLIC",
          isPaid: selectedEvent.isPaid ?? false,
        });
      }
      setDetailsForm(f => ({ ...f, status: newStatus }));
      const evs = await eventService.getMyEvents().catch(() => []);
      const filtered = (evs || []).filter((e: any) => !auth?.tenantId || !e.tenantId || e.tenantId === auth.tenantId);
      setEvents(filtered);
      showToast(t("adminEvents.toasts.statusSetTo", { status: newStatus }));
    } catch { showToast(t("adminEvents.toasts.statusUpdateFailed")); }
    finally { setSaving(false); }
  };

  // ── Load registrations ──
  const loadRegistrations = async () => {
    if (!selectedId) return;
    setRegistrationsLoading(true);
    try {
      const regs = await eventService.getRegistrationsByEvent(selectedId).catch(() => []);
      setRegistrations(regs || []);
    } catch { } finally { setRegistrationsLoading(false); }
  };

  // ── Check-in registration ──
  // Quick-action shortcut only — the dedicated /admin/checkin scanner lets the
  // organizer pick which session a scan is for; this defaults to the event's
  // first session since there's no session picker on this compact row.
  const handleCheckIn = async (regId: string) => {
    const sessionId = sessions[0]?.sessionId || sessions[0]?.id;
    if (!sessionId) { showToast("Create a session for this event before checking attendees in."); return; }
    try {
      await eventService.checkInRegistration(regId, sessionId);
      showToast(t("adminEvents.toasts.checkedInSuccess"));
      await loadRegistrations();
    } catch (err: any) { showToast(err.message || t("adminEvents.toasts.checkInFailed")); }
  };

  // Completion status for each tab — drives dots in tab bar
  const tabStatus = (id: EventTab): "done" | "partial" | "empty" => {
    switch (id) {
      case "details": return detailsForm.title ? (detailsForm.description && detailsForm.categoryId ? "done" : "partial") : "empty";
      case "schedule": return schedule ? "done" : "empty";
      case "location": return locations.length > 0 ? "done" : "empty";
      case "tickets": return tickets.length > 0 ? "done" : "empty";
      case "coupons": return coupons.length > 0 ? "done" : "empty";
      case "team": return team.length > 0 ? "done" : "empty";
      case "sessions": return sessions.length > 0 ? "done" : "empty";
      case "speakers": return speakers.length > 0 ? "done" : "empty";
      case "sponsors": return sponsors.length > 0 ? "done" : "empty";
      case "registrations": return registrations.length > 0 ? "done" : "empty";
      case "vendors": return exhibitors.length > 0 ? "done" : "empty";
      case "announcements": return announcements.length > 0 ? "done" : "empty";
      case "feedback": return feedbacks.length > 0 ? "done" : "empty";
      case "live": return polls.length > 0 || qaQuestions.length > 0 ? "done" : "empty";
      case "email": return campaigns.length > 0 ? "done" : "empty";
      case "sections": return eventSections.length > 0 ? "done" : "empty";
      default: return "empty";
    }
  };

  const fmtDt = (dt?: string) => dt ? new Date(dt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const getSpeakerLocationName = (s: any) => {
    if (!s.sessionId) return "";
    const sessObj = sessions.find((ss: any) => (ss.sessionId || ss.id) === s.sessionId);
    if (!sessObj || !sessObj.locationId) return "";
    const loc = locations.find((l: any) => (l.locationId || l.id) === sessObj.locationId);
    if (!loc) return "";
    return loc.type === "VIRTUAL" ? (loc.virtualPlatform || "Virtual") : (loc.venueName || loc.address || "In Person");
  };

  return (
    <div className="flex bg-[#f9fafb] h-screen overflow-hidden text-[#1a1a1a]">
      <Sidebar />

      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[200] bg-[#1a1a1a] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <Check size={16} className="text-green-400" /> {toast}
        </div>
      )}

      <div className="ml-[220px] flex-1 flex flex-col h-full overflow-hidden">

        {/* ── Events Panel Modal ── */}
        {showEventsPanel && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
              onClick={() => setShowEventsPanel(false)}
            />
            {/* Slide-in panel */}
            <div className="fixed right-0 top-0 h-full w-[380px] z-[101] bg-white shadow-2xl flex flex-col" style={{ animation: "slideInRight 0.25s ease" }}>
              <div className="p-6 border-b border-[#f0f0f0] flex items-center justify-between">
                <div>
                  <h2 className="font-display font-black text-[#1a1a1a] text-lg">Your Events</h2>
                  <p className="text-xs text-[#888] mt-0.5">{events.length} event{events.length !== 1 ? "s" : ""} created</p>
                </div>
                <button onClick={() => setShowEventsPanel(false)} className="w-9 h-9 rounded-xl bg-[#f5f5f5] flex items-center justify-center hover:bg-[#ebebeb] transition-colors cursor-pointer">
                  <X size={16} className="text-[#555]" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16">
                    <div className="w-14 h-14 bg-[#FF4747]/10 rounded-2xl flex items-center justify-center mb-4">
                      <Calendar size={24} className="text-[#FF4747]" />
                    </div>
                    <p className="font-bold text-[#1a1a1a] mb-1">No events yet</p>
                    <p className="text-xs text-[#aaa] mb-5">Create your first event to get started.</p>
                    <button onClick={() => { setShowEventsPanel(false); setShowNew(true); setSelectedId(""); }} className="px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer flex items-center gap-2">
                      <Plus size={13} /> New Event
                    </button>
                  </div>
                ) : (
                  <div className="p-4 space-y-2">
                    {events.map(ev => (
                      <button
                        key={ev.eventId}
                        onClick={() => { selectEvent(ev.eventId); setShowEventsPanel(false); }}
                        className={`w-full text-left p-4 rounded-2xl border transition-all cursor-pointer group ${selectedId === ev.eventId
                          ? "border-[#FF4747] bg-[#fff5f5] ring-1 ring-[#FF4747]/20"
                          : "border-[#f0f0f0] hover:border-[#FF4747]/40 hover:bg-[#fafafa]"
                          }`}
                      >
                        <div className="flex items-start gap-3">
                          {ev.coverImage ? (
                            <img src={ev.coverImage} alt={ev.title} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-[#f0f0f0]" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF4747]/10 to-[#F7E998]/20 flex items-center justify-center shrink-0">
                              <Calendar size={18} className="text-[#FF4747]/50" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm text-[#1a1a1a] truncate group-hover:text-[#FF4747] transition-colors">{ev.title}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${ev.status === "PUBLISHED" ? "bg-green-100 text-green-700"
                                : ev.status === "CANCELLED" ? "bg-red-100 text-red-600"
                                  : "bg-[#f5f5f5] text-[#888]"
                                }`}>{ev.status}</span>
                              {ev.format && <span className="text-[9px] font-medium text-[#aaa]">{ev.format === "IN_PERSON" ? "In Person" : ev.format === "VIRTUAL" ? "Virtual" : "Hybrid"}</span>}
                            </div>
                          </div>
                          {selectedId === ev.eventId && <Check size={14} className="text-[#FF4747] shrink-0 mt-0.5" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-[#f0f0f0]">
                <button
                  onClick={() => { setShowEventsPanel(false); setShowNew(true); setSelectedId(""); }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Create New Event
                </button>
              </div>
            </div>
            <style>{`
              @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
              }
            `}</style>
          </>
        )}

        {/* ── MAIN CONTENT ── */}

        {/* ── NEW EVENT FORM ── */}
        {showNew && (
          <>
            {/* Shared header for create form */}
            <header className="bg-white border-b border-[#e5e7eb] px-8 py-4 flex items-center justify-between sticky top-0 z-30">
              <div>
                <h1 className="font-display font-black text-[#1a1a1a] text-lg">{t("adminEvents.createForm.heading")}</h1>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowEventsPanel(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-colors cursor-pointer">
                  <List size={12} /> View Events
                  {events.length > 0 && <span className="bg-white/20 text-[9px] font-black px-1.5 py-0.5 rounded-full">{events.length}</span>}
                </button>
                <button onClick={() => { setShowNew(false); }} className="flex items-center gap-2 px-5 py-2.5 bg-[#f5f5f5] text-[#555] text-xs font-bold rounded-xl hover:bg-[#eee] transition-colors cursor-pointer">
                  <X size={12} /> Cancel
                </button>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-2xl">
                <form onSubmit={handleCreateEvent} className="bg-white border border-[#e5e7eb] rounded-3xl p-8 space-y-5">
                  <div>
                    <label className={label}>{t("adminEvents.createForm.titleLabel")}</label>
                    <input required placeholder={t("adminEvents.createForm.titlePlaceholder")} value={newTitle} onChange={e => setNewTitle(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className={label}>{t("adminEvents.createForm.descLabel")}</label>
                    <textarea placeholder={t("adminEvents.createForm.descPlaceholder")} value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3} className={inp + " resize-none"} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={label}>{t("adminEvents.createForm.startLabel")}</label>
                      <input
                        type="datetime-local"
                        value={newStart}
                        min={toLocalISOString(new Date())}
                        onChange={e => {
                          setNewStart(e.target.value);
                          const minEnd = toLocalISOString(new Date(new Date(e.target.value).getTime() + 2 * 3600 * 1000));
                          if (!newEnd || new Date(newEnd) < new Date(minEnd)) setNewEnd(minEnd);
                        }}
                        className={inp}
                        required
                      />
                    </div>
                    <div>
                      <label className={label}>{t("adminEvents.createForm.endLabel")}</label>
                      <input
                        type="datetime-local"
                        value={newEnd}
                        min={newStart ? toLocalISOString(new Date(new Date(newStart).getTime() + 2 * 3600 * 1000)) : toLocalISOString(new Date())}
                        onChange={e => setNewEnd(e.target.value)}
                        className={inp}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center py-3"}>
                    {saving ? t("adminEvents.createForm.creating") : <><Plus size={15} /> {t("adminEvents.createForm.submit")}</>}
                  </button>
                </form>
              </div>
            </div>
          </>
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
                {/* View Events + New Event always visible */}
                <button onClick={() => setShowEventsPanel(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-colors cursor-pointer">
                  <List size={12} /> View Events
                  {events.length > 0 && <span className="bg-white/20 text-[9px] font-black px-1.5 py-0.5 rounded-full">{events.length}</span>}
                </button>
                <button onClick={() => { setShowNew(true); setSelectedId(""); }} className="flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer">
                  <Plus size={12} /> New Event
                </button>
                <div className="w-px h-5 bg-[#e5e7eb] mx-1" />
                {tab === "details" && <button onClick={saveDetails} disabled={saving} className={saveBtn}><Save size={13} />{saving ? t("adminEvents.common.saving") : t("adminEvents.header.saveDetails")}</button>}
                {tab === "schedule" && <button onClick={saveSchedule} disabled={saving} className={saveBtn}><Save size={13} />{saving ? t("adminEvents.common.saving") : t("adminEvents.header.saveSchedule")}</button>}
                {tab === "location" && <button onClick={() => locFormRef.current?.requestSubmit()} disabled={saving} className={saveBtn}>{editingLocation ? <><Save size={13} />{saving ? t("adminEvents.common.saving") : t("adminEvents.header.saveLocation")}</> : <><Plus size={13} />{saving ? t("adminEvents.common.adding") : t("adminEvents.header.addLocation")}</>}</button>}
                {tab === "tickets" && <button onClick={() => ticketFormRef.current?.requestSubmit()} disabled={saving} className={saveBtn}>{editingTicket ? <><Save size={13} />{saving ? t("adminEvents.common.saving") : t("adminEvents.header.saveTicket")}</> : <><Plus size={13} />{saving ? t("adminEvents.common.adding") : t("adminEvents.header.addTicket")}</>}</button>}
                {tab === "coupons" && <button onClick={() => couponFormRef.current?.requestSubmit()} disabled={saving} className={saveBtn}>{editingCoupon ? <><Save size={13} />{saving ? t("adminEvents.common.saving") : t("adminEvents.header.saveCoupon")}</> : <><Plus size={13} />{saving ? t("adminEvents.common.adding") : t("adminEvents.header.addCoupon")}</>}</button>}
                {tab === "team" && <button onClick={() => teamFormRef.current?.requestSubmit()} disabled={teamLoading} className={saveBtn}>{editingMember ? <><Save size={13} />{teamLoading ? t("adminEvents.common.saving") : t("adminEvents.header.saveMember")}</> : <><Plus size={13} />{teamLoading ? t("adminEvents.common.adding") : t("adminEvents.header.addMember")}</>}</button>}
                {tab === "sessions" && <button onClick={() => sessionFormRef.current?.requestSubmit()} disabled={saving} className={saveBtn}>{editingSession ? <><Save size={13} />{saving ? t("adminEvents.common.saving") : t("adminEvents.header.saveSession")}</> : <><Plus size={13} />{saving ? t("adminEvents.common.adding") : t("adminEvents.header.addSession")}</>}</button>}
                {tab === "speakers" && <button onClick={() => speakerFormRef.current?.requestSubmit()} disabled={saving} className={saveBtn}>{editingSpeaker ? <><Save size={13} />{saving ? t("adminEvents.common.saving") : t("adminEvents.header.saveSpeaker")}</> : <><Plus size={13} />{saving ? t("adminEvents.common.adding") : t("adminEvents.header.addSpeaker")}</>}</button>}
                {tab === "sponsors" && <button onClick={() => sponsorFormRef.current?.requestSubmit()} disabled={saving} className={saveBtn}>{editingSponsor ? <><Save size={13} />{saving ? t("adminEvents.common.saving") : t("adminEvents.header.saveSponsor")}</> : <><Plus size={13} />{saving ? t("adminEvents.common.adding") : t("adminEvents.header.addSponsor")}</>}</button>}
                {tab === "registrations" && <button onClick={loadRegistrations} disabled={registrationsLoading} className={saveBtn}><ScanLine size={13} />{registrationsLoading ? t("adminEvents.common.loading") : t("adminEvents.header.refresh")}</button>}
                {tab === "vendors" && <button onClick={() => exhibitorFormRef.current?.requestSubmit()} disabled={saving} className={saveBtn}>{editingExhibitor ? <><Save size={13} />{saving ? t("adminEvents.common.saving") : t("adminEvents.header.saveExhibitor")}</> : <><Plus size={13} />{saving ? t("adminEvents.common.adding") : t("adminEvents.header.addExhibitor")}</>}</button>}
                {tab === "announcements" && <button onClick={() => announcementFormRef.current?.requestSubmit()} disabled={saving} className={saveBtn}>{editingAnnouncement ? <><Save size={13} />{saving ? t("adminEvents.common.saving") : t("adminEvents.header.save")}</> : <><Megaphone size={13} />{saving ? t("adminEvents.common.posting") : t("adminEvents.header.postAnnouncement")}</>}</button>}
                {tab === "live" && <button onClick={() => pollFormRef.current?.requestSubmit()} disabled={saving} className={saveBtn}>{editingPoll ? <><Save size={13} />{saving ? t("adminEvents.common.saving") : t("adminEvents.header.savePoll")}</> : <><Plus size={13} />{saving ? t("adminEvents.common.creating") : t("adminEvents.header.addPoll")}</>}</button>}
                {tab === "email" && <button onClick={() => emailFormRef.current?.requestSubmit()} disabled={saving} className={saveBtn}><Mail size={13} />{saving ? t("adminEvents.common.saving") : t("adminEvents.header.scheduleEmail")}</button>}
                {tab === "sections" && <button onClick={saveSection} disabled={saving} className={saveBtn}><Save size={13} />{saving ? t("adminEvents.common.saving") : editingSection ? t("adminEvents.header.saveSection") : t("adminEvents.header.addSection")}</button>}
              </div>
            </header>

            {/* Tabs */}
            <div className="bg-white border-b border-[#e5e7eb] px-4 flex justify-center gap-1 overflow-x-auto shrink-0 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {TABS.map(({ id, labelKey, icon: Icon }) => {
                const status = id === "overview" ? null : tabStatus(id);
                return (
                  <button key={id} onClick={() => setTab(id)}
                    className={`flex items-center gap-2 px-4 py-3.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${tab === id ? "border-[#FF4747] text-[#FF4747]" : "border-transparent text-[#888] hover:text-[#1a1a1a]"}`}>
                    <Icon size={14} />{t(labelKey)}
                    {status === "done" && <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />}
                    {status === "partial" && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                    {status === "empty" && <span className="w-1.5 h-1.5 rounded-full bg-[#e5e7eb] shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-y-auto p-8">

              {/* ── OVERVIEW TAB ── */}
              {tab === "overview" && (
                <div className="max-w-4xl w-full mx-auto space-y-6">

                  {/* Hero card — banner + core details */}
                  <div className="bg-white border border-[#e5e7eb] rounded-3xl overflow-hidden">
                    <div className="relative h-48 bg-gradient-to-br from-[#FF4747]/10 to-[#F7E998]/20">
                      {banner
                        ? <img src={banner} alt="banner" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex flex-col items-center justify-center text-[#ccc] gap-2"><ImageIcon size={32} /><span className="text-xs">No banner</span></div>
                      }
                      <button onClick={() => setTab("details")}
                        className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-black/50 backdrop-blur text-white text-xs font-semibold rounded-full hover:bg-black/70 transition-colors cursor-pointer">
                        <ImageIcon size={11} /> Edit banner
                      </button>
                    </div>
                    <div className="p-6 flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="font-display text-2xl font-black text-[#1a1a1a] truncate">{detailsForm.title || selectedEvent?.title || "Untitled Event"}</h2>
                        {detailsForm.description
                          ? <p className="text-sm text-[#888] mt-1 line-clamp-2">{detailsForm.description}</p>
                          : <p className="text-sm text-[#ccc] mt-1 italic">No description yet</p>
                        }
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${detailsForm.status === "PUBLISHED" ? "bg-green-100 text-green-700" : detailsForm.status === "CANCELLED" ? "bg-red-100 text-red-600" : "bg-[#f5f5f5] text-[#888]"}`}>
                            {detailsForm.status || "DRAFT"}
                          </span>
                          {detailsForm.categoryId && (
                            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#F7E998]/60 text-[#7a6a00]">
                              {categories.find(c => c.categoryId === detailsForm.categoryId)?.name || "Category"}
                            </span>
                          )}
                          {detailsForm.maxCapacity && (
                            <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-[#f5f5f5] text-[#555]">
                              Max {detailsForm.maxCapacity} attendees
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => setTab("details")} className="shrink-0 text-xs font-bold text-[#FF4747] border border-[#FF4747]/30 px-4 py-2 rounded-xl hover:bg-[#FF4747]/5 transition-colors cursor-pointer flex items-center gap-1.5">
                        Edit <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Section grid */}
                  <div className="grid md:grid-cols-2 gap-4">

                    {/* Schedule */}
                    <div className={`bg-white border rounded-2xl p-5 ${schedule ? "border-[#e5e7eb]" : "border-dashed border-[#e5e7eb]"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Calendar size={15} className="text-[#FF4747]" />
                          <span className="font-bold text-sm text-[#1a1a1a]">Schedule</span>
                        </div>
                        <button onClick={() => setTab("schedule")} className="text-xs font-semibold text-[#FF4747] hover:underline cursor-pointer flex items-center gap-1">Edit <ChevronRight size={11} /></button>
                      </div>
                      {schedule ? (
                        <div className="space-y-1.5 text-xs text-[#555]">
                          <div className="flex gap-2"><span className="text-[#aaa] w-10 shrink-0">Start</span><span className="font-semibold text-[#1a1a1a]">{fmtDt(schedule.startDatetime)}</span></div>
                          <div className="flex gap-2"><span className="text-[#aaa] w-10 shrink-0">End</span><span className="font-semibold text-[#1a1a1a]">{fmtDt(schedule.endDatetime)}</span></div>
                          <div className="flex gap-2"><span className="text-[#aaa] w-10 shrink-0">Zone</span><span className="text-[#888]">{schedule.timezone}</span></div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#aaa] italic">No dates set yet.</p>
                      )}
                    </div>

                    {/* Location */}
                    <div className={`bg-white border rounded-2xl p-5 ${locations.length > 0 ? "border-[#e5e7eb]" : "border-dashed border-[#e5e7eb]"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <MapPin size={15} className="text-[#FF4747]" />
                          <span className="font-bold text-sm text-[#1a1a1a]">Location</span>
                        </div>
                        <button onClick={() => setTab("location")} className="text-xs font-semibold text-[#FF4747] hover:underline cursor-pointer flex items-center gap-1">Edit <ChevronRight size={11} /></button>
                      </div>
                      {locations.length > 0 ? (
                        <div className="space-y-2">
                          {locations.map(loc => (
                            <div key={loc.locationId} className="text-xs text-[#555]">
                              <span className="font-semibold text-[#1a1a1a]">{loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName}</span>
                              <span className="text-[#aaa] ml-2">{loc.type === "VIRTUAL" ? "Virtual" : `${loc.city}, ${loc.country}`}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#aaa] italic">No location added yet.</p>
                      )}
                    </div>

                    {/* Tickets */}
                    <div className={`bg-white border rounded-2xl p-5 ${tickets.length > 0 ? "border-[#e5e7eb]" : "border-dashed border-[#e5e7eb]"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Ticket size={15} className="text-[#FF4747]" />
                          <span className="font-bold text-sm text-[#1a1a1a]">Tickets</span>
                          {tickets.length > 0 && <span className="text-[10px] font-bold bg-[#FF4747]/10 text-[#FF4747] px-1.5 py-0.5 rounded-full">{tickets.length}</span>}
                        </div>
                        <button onClick={() => router.push("/admin/project")} className="text-xs font-semibold text-[#FF4747] hover:underline cursor-pointer flex items-center gap-1">Edit <ChevronRight size={11} /></button>
                      </div>
                      {tickets.length > 0 ? (
                        <div className="space-y-1.5">
                          {tickets.slice(0, 3).map(t => (
                            <div key={t.ticketId || t.id} className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[#1a1a1a] truncate max-w-[140px]">{t.name}</span>
                              <span className={t.price === 0 ? "text-green-600 font-bold" : "text-[#FF4747] font-bold"}>
                                {t.price === 0 ? "Free" : `${Number(t.price).toLocaleString()} FCFA`}
                              </span>
                            </div>
                          ))}
                          {tickets.length > 3 && <p className="text-[10px] text-[#aaa]">+{tickets.length - 3} more</p>}
                        </div>
                      ) : (
                        <p className="text-xs text-[#aaa] italic">No ticket types yet.</p>
                      )}
                    </div>

                    {/* Team */}
                    <div className={`bg-white border rounded-2xl p-5 ${team.length > 0 ? "border-[#e5e7eb]" : "border-dashed border-[#e5e7eb]"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Users size={15} className="text-[#FF4747]" />
                          <span className="font-bold text-sm text-[#1a1a1a]">Team</span>
                          {team.length > 0 && <span className="text-[10px] font-bold bg-[#FF4747]/10 text-[#FF4747] px-1.5 py-0.5 rounded-full">{team.length}</span>}
                        </div>
                        <button onClick={() => router.push("/admin/team")} className="text-xs font-semibold text-[#FF4747] hover:underline cursor-pointer flex items-center gap-1">Edit <ChevronRight size={11} /></button>
                      </div>
                      {team.length > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {team.slice(0, 5).map((m, i) => (
                            <div key={i} title={`${m.name}${m.skills ? ` · ${m.skills}` : ""}`} className="flex items-center gap-1.5">
                              {m.photoUrl
                                ? <img src={m.photoUrl} alt={m.name} className="w-7 h-7 rounded-full object-cover border border-[#f0f0f0]" />
                                : <div className="w-7 h-7 rounded-full bg-[#F7E998] flex items-center justify-center text-[10px] font-black text-[#7a6a00]">{(m.name || "?").charAt(0)}</div>
                              }
                            </div>
                          ))}
                          {team.length > 5 && <span className="text-xs text-[#aaa]">+{team.length - 5}</span>}
                          <span className="text-xs text-[#888] ml-1">{team.length} member{team.length !== 1 ? "s" : ""}</span>
                        </div>
                      ) : (
                        <p className="text-xs text-[#aaa] italic">No team members yet.</p>
                      )}
                    </div>

                    {/* Sessions */}
                    <div className={`bg-white border rounded-2xl p-5 ${sessions.length > 0 ? "border-[#e5e7eb]" : "border-dashed border-[#e5e7eb]"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Mic2 size={15} className="text-[#FF4747]" />
                          <span className="font-bold text-sm text-[#1a1a1a]">Sessions</span>
                          {sessions.length > 0 && <span className="text-[10px] font-bold bg-[#FF4747]/10 text-[#FF4747] px-1.5 py-0.5 rounded-full">{sessions.length}</span>}
                        </div>
                        <button onClick={() => router.push("/admin/agenda")} className="text-xs font-semibold text-[#FF4747] hover:underline cursor-pointer flex items-center gap-1">Edit <ChevronRight size={11} /></button>
                      </div>
                      {sessions.length > 0 ? (
                        <div className="space-y-1.5">
                          {sessions.slice(0, 3).map(s => (
                            <div key={s.sessionId || s.id} className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-[#1a1a1a] truncate max-w-[160px]">{s.title}</span>
                              <span className="text-[#aaa] shrink-0 ml-2">{s.type}</span>
                            </div>
                          ))}
                          {sessions.length > 3 && <p className="text-[10px] text-[#aaa]">+{sessions.length - 3} more</p>}
                        </div>
                      ) : (
                        <p className="text-xs text-[#aaa] italic">No sessions added yet.</p>
                      )}
                    </div>

                    {/* Live — polls + Q&A */}
                    <div className={`bg-white border rounded-2xl p-5 ${polls.length > 0 || qaQuestions.length > 0 ? "border-[#e5e7eb]" : "border-dashed border-[#e5e7eb]"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Radio size={15} className="text-[#FF4747]" />
                          <span className="font-bold text-sm text-[#1a1a1a]">Live</span>
                        </div>
                        <button onClick={() => router.push("/admin/engagements")} className="text-xs font-semibold text-[#FF4747] hover:underline cursor-pointer flex items-center gap-1">Edit <ChevronRight size={11} /></button>
                      </div>
                      {polls.length > 0 || qaQuestions.length > 0 ? (
                        <div className="space-y-1.5 text-xs text-[#555]">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                            <span><strong>{polls.length}</strong> poll{polls.length !== 1 ? "s" : ""} created</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                            <span><strong>{qaQuestions.length}</strong> Q&amp;A question{qaQuestions.length !== 1 ? "s" : ""}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[#aaa] italic">No polls or Q&amp;A yet.</p>
                      )}
                    </div>

                    {/* Email campaigns */}
                    <div className={`bg-white border rounded-2xl p-5 md:col-span-2 ${campaigns.length > 0 ? "border-[#e5e7eb]" : "border-dashed border-[#e5e7eb]"}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Mail size={15} className="text-[#FF4747]" />
                          <span className="font-bold text-sm text-[#1a1a1a]">Email Campaigns</span>
                          {campaigns.length > 0 && <span className="text-[10px] font-bold bg-[#FF4747]/10 text-[#FF4747] px-1.5 py-0.5 rounded-full">{campaigns.length}</span>}
                        </div>
                        <button onClick={() => router.push("/admin/support")} className="text-xs font-semibold text-[#FF4747] hover:underline cursor-pointer flex items-center gap-1">Edit <ChevronRight size={11} /></button>
                      </div>
                      {campaigns.length > 0 ? (
                        <div className="grid md:grid-cols-3 gap-3">
                          {campaigns.slice(0, 3).map((c, i) => (
                            <div key={c.campaignId || i} className="bg-[#fafafa] border border-[#f0f0f0] rounded-xl px-4 py-3">
                              <p className="font-semibold text-xs text-[#1a1a1a] truncate">{c.subject}</p>
                              <p className="text-[10px] text-[#aaa] mt-0.5">{c.targetAudience} · {c.status}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#aaa] italic">No email campaigns yet.</p>
                      )}
                    </div>

                  </div>

                  {/* Quick action bar */}
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="font-bold text-sm text-[#1a1a1a]">Quick Actions</p>
                      <p className="text-xs text-[#888] mt-0.5">Change event status or duplicate this event.</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {detailsForm.status !== "PUBLISHED" && (
                        <button onClick={() => quickUpdateStatus("PUBLISHED")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50">
                          <Check size={13} /> Publish
                        </button>
                      )}
                      {detailsForm.status === "PUBLISHED" && (
                        <button onClick={() => quickUpdateStatus("DRAFT")} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#f5f5f5] text-[#555] border border-[#e5e7eb] rounded-xl hover:bg-[#eee] transition-colors cursor-pointer disabled:opacity-50">
                          Unpublish
                        </button>
                      )}
                      {detailsForm.status !== "CANCELLED" && (
                        <button onClick={() => { if (confirm("Cancel this event?")) quickUpdateStatus("CANCELLED"); }} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50">
                          <AlertTriangle size={13} /> Cancel Event
                        </button>
                      )}
                      <button onClick={cloneEvent} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#555] border border-[#e5e7eb] rounded-xl hover:border-[#1a1a1a] hover:text-[#1a1a1a] transition-colors cursor-pointer disabled:opacity-50">
                        <Copy size={13} /> Clone Event
                      </button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={16} className="text-red-500 shrink-0" />
                      <p className="font-bold text-sm text-red-700">Danger Zone</p>
                    </div>
                    <p className="text-xs text-red-600">
                      Permanently deletes this event and everything tied to it — sessions, tracks, rooms,
                      locations, tickets, orders, registrations, coupons, waitlist entries, sponsors, exhibitors,
                      polls, Q&amp;A, announcements, feedback, and staff assignments. This cannot be undone.
                      (Payment/refund records are kept for your accounting records.)
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        value={deleteConfirmText}
                        onChange={e => setDeleteConfirmText(e.target.value)}
                        placeholder={`Type "${selectedEvent?.title || ""}" to confirm`}
                        className="flex-1 min-w-[240px] bg-white border border-red-200 rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-red-300 outline-none focus:border-red-500 transition-colors"
                      />
                      <button
                        onClick={() => { if (confirm("This permanently deletes the event and all its data. Continue?")) deleteEventPermanently(); }}
                        disabled={saving || !selectedEvent?.title || deleteConfirmText !== selectedEvent.title}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 size={13} /> Delete Event Permanently
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── DETAILS TAB ── */}
              {tab === "details" && (
                <div className="max-w-3xl w-full mx-auto space-y-6">
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
                        <input type="file" accept="image/*" className="hidden" onChange={async e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          try {
                            setSaving(true);
                            const res = await eventService.uploadCoverImage(selectedId, f);
                            setBanner(res.url);
                            showToast("Banner uploaded successfully!");
                          } catch (err: any) {
                            showToast("Failed to upload banner: " + (err.message || err));
                          } finally {
                            setSaving(false);
                          }
                        }} />
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={label}>Event Motto</label>
                        <input value={detailsForm.motto || ""} onChange={e => setDetailsForm(f => ({ ...f, motto: e.target.value }))} className={inp} placeholder="e.g. Connect and Create" />
                      </div>
                      <div>
                        <label className={label}>Event Themes (comma-separated)</label>
                        <input value={detailsForm.themes || ""} onChange={e => setDetailsForm(f => ({ ...f, themes: e.target.value }))} className={inp} placeholder="e.g. Tech, AI, Innovation" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="relative">
                        <label className={label}>Status</label>
                        <button
                          type="button"
                          onClick={() => setShowStatusDropdown(v => !v)}
                          className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}
                        >
                          <span className={detailsForm.status ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                            {detailsForm.status === "DRAFT" ? "Draft" : detailsForm.status === "PUBLISHED" ? "Published" : detailsForm.status === "CANCELLED" ? "Cancelled" : detailsForm.status === "COMPLETED" ? "Completed" : "Select status"}
                          </span>
                          <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showStatusDropdown ? "rotate-90" : ""}`} />
                        </button>
                        {showStatusDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowStatusDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1">
                              {[
                                { value: "DRAFT", label: "Draft" },
                                { value: "PUBLISHED", label: "Published" },
                                { value: "CANCELLED", label: "Cancelled" },
                                { value: "COMPLETED", label: "Completed" }
                              ].map((opt) => (
                                <button key={opt.value} type="button"
                                  onClick={() => { setDetailsForm(f => ({ ...f, status: opt.value })); setShowStatusDropdown(false); }}
                                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${detailsForm.status === opt.value ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="relative">
                        <label className={label}>Category</label>
                        {/* Custom dropdown trigger */}
                        <button
                          type="button"
                          onClick={() => setShowCategoryDropdown(v => !v)}
                          className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}
                        >
                          <span className={detailsForm.categoryId ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                            {detailsForm.categoryId
                              ? categories.find((c: any) => (c.categoryId || c.id) === detailsForm.categoryId)?.name || "Select category"
                              : "No category"}
                          </span>
                          <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showCategoryDropdown ? "rotate-90" : ""}`} />
                        </button>
                        {/* Custom dropdown list */}
                        {showCategoryDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowCategoryDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden">
                              <button type="button"
                                onClick={() => { setDetailsForm(f => ({ ...f, categoryId: "" })); setShowCategoryDropdown(false); }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${!detailsForm.categoryId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#888]"}`}>
                                No category
                              </button>
                              {categories.length > 0 && <div className="border-t border-[#f5f5f5]" />}
                              {categories.map((c: any) => {
                                const id = c.categoryId || c.id;
                                const isSelected = detailsForm.categoryId === id;
                                return (
                                  <div key={id} className={`flex items-center group transition-colors ${isSelected ? "bg-[#fff5f5]" : "hover:bg-[#fafafa]"}`}>
                                    <button type="button"
                                      onClick={() => { setDetailsForm(f => ({ ...f, categoryId: id })); setShowCategoryDropdown(false); }}
                                      className={`flex-1 text-left px-4 py-2.5 text-sm cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold" : "text-[#1a1a1a]"}`}>
                                      {c.name}
                                    </button>
                                    <button type="button" title={`Delete "${c.name}"`}
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          await eventService.deleteEventCategory(id);
                                          const cats = await eventService.getEventCategories();
                                          setCategories(cats || []);
                                          if (detailsForm.categoryId === id) setDetailsForm(f => ({ ...f, categoryId: "" }));
                                          showToast(`"${c.name}" deleted`);
                                        } catch {
                                          showToast("Failed to delete category");
                                        }
                                      }}
                                      className="mr-3 w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 text-[#ccc] hover:text-red-500 hover:bg-red-50 transition-all cursor-pointer">
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                );
                              })}
                              <div className="border-t border-[#f5f5f5]" />
                              <button type="button"
                                onClick={() => { setShowCategoryDropdown(false); setShowCategoryInline(true); setNewCategoryName(""); }}
                                className="w-full text-left px-4 py-2.5 text-sm text-[#FF4747] font-bold hover:bg-[#fff5f5] transition-colors cursor-pointer flex items-center gap-2">
                                <Plus size={12} /> Add New Category
                              </button>
                            </div>
                          </>
                        )}

                        {/* Inline category creator */}
                        {showCategoryInline && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-bold text-[#1a1a1a]">New Category</p>
                              <button type="button" onClick={() => { setShowCategoryInline(false); setNewCategoryName(""); }} className="w-6 h-6 flex items-center justify-center rounded-lg bg-[#f5f5f5] hover:bg-[#eee] transition-colors cursor-pointer">
                                <X size={11} className="text-[#555]" />
                              </button>
                            </div>
                            <input
                              autoFocus
                              placeholder="e.g. Technology, Music…"
                              value={newCategoryName}
                              onChange={e => setNewCategoryName(e.target.value)}
                              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleCreateCategoryInline(); } if (e.key === "Escape") { setShowCategoryInline(false); setNewCategoryName(""); } }}
                              className="w-full bg-[#fafafa] border border-[#e5e7eb] rounded-xl px-3 py-2 text-sm text-[#1a1a1a] placeholder:text-[#ccc] outline-none focus:border-[#FF4747] transition-colors"
                            />
                            <div className="flex gap-2">
                              <button type="button" onClick={handleCreateCategoryInline} disabled={savingCategory || !newCategoryName.trim()} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-40">
                                <Plus size={11} /> {savingCategory ? "Saving…" : "Create"}
                              </button>
                              <button type="button" onClick={() => { setShowCategoryInline(false); setNewCategoryName(""); }} className="px-4 py-2 text-xs font-semibold text-[#888] bg-[#f5f5f5] rounded-xl hover:bg-[#eee] transition-colors cursor-pointer">
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className={label}>Max Capacity</label>
                        <input type="number" min={1} value={detailsForm.maxCapacity} onChange={e => setDetailsForm(f => ({ ...f, maxCapacity: Number(e.target.value) }))} className={inp} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div className="relative">
                        <label className={label}>Format</label>
                        <button
                          type="button"
                          onClick={() => setShowFormatDropdown(v => !v)}
                          className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}
                        >
                          <span className={detailsForm.format ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                            {detailsForm.format === "IN_PERSON" ? "In Person" : detailsForm.format === "VIRTUAL" ? "Virtual" : detailsForm.format === "HYBRID" ? "Hybrid" : "Select format"}
                          </span>
                          <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showFormatDropdown ? "rotate-90" : ""}`} />
                        </button>
                        {showFormatDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowFormatDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1">
                              {[
                                { value: "IN_PERSON", label: "In Person" },
                                { value: "VIRTUAL", label: "Virtual" },
                                { value: "HYBRID", label: "Hybrid" }
                              ].map((opt) => (
                                <button key={opt.value} type="button"
                                  onClick={() => {
                                    setDetailsForm(f => ({ ...f, format: opt.value }));
                                    if (opt.value === "IN_PERSON") setLocForm(f => ({ ...f, isVirtual: false }));
                                    else if (opt.value === "VIRTUAL") setLocForm(f => ({ ...f, isVirtual: true }));
                                    setShowFormatDropdown(false);
                                  }}
                                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${detailsForm.format === opt.value ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="relative">
                        <label className={label}>Visibility</label>
                        <button
                          type="button"
                          onClick={() => setShowVisibilityDropdown(v => !v)}
                          className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}
                        >
                          <span className={detailsForm.visibility ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                            {detailsForm.visibility === "PUBLIC" ? "Public" : detailsForm.visibility === "PRIVATE" ? "Private" : "Select visibility"}
                          </span>
                          <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showVisibilityDropdown ? "rotate-90" : ""}`} />
                        </button>
                        {showVisibilityDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowVisibilityDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1">
                              {[
                                { value: "PUBLIC", label: "Public" },
                                { value: "PRIVATE", label: "Private" }
                              ].map((opt) => (
                                <button key={opt.value} type="button"
                                  onClick={() => { setDetailsForm(f => ({ ...f, visibility: opt.value })); setShowVisibilityDropdown(false); }}
                                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${detailsForm.visibility === opt.value ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="relative">
                        <label className={label}>Currency</label>
                        <button
                          type="button"
                          onClick={() => setShowCurrencyDropdown(v => !v)}
                          className={`${inp} w-full text-left flex items-center justify-between cursor-pointer`}
                        >
                          <span className={detailsForm.currency ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                            {detailsForm.currency === "XAF" ? "XAF (FCFA)" : detailsForm.currency === "USD" ? "USD" : detailsForm.currency === "EUR" ? "EUR" : "Select currency"}
                          </span>
                          <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showCurrencyDropdown ? "rotate-90" : ""}`} />
                        </button>
                        {showCurrencyDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowCurrencyDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-2xl shadow-xl overflow-hidden py-1">
                              {[
                                { value: "XAF", label: "XAF (FCFA)" },
                                { value: "USD", label: "USD" },
                                { value: "EUR", label: "EUR" }
                              ].map((opt) => (
                                <button key={opt.value} type="button"
                                  onClick={() => { setDetailsForm(f => ({ ...f, currency: opt.value })); setShowCurrencyDropdown(false); }}
                                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${detailsForm.currency === opt.value ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    {detailsForm.visibility === "PRIVATE" && (
                      <div className="border border-amber-200 bg-amber-50/50 rounded-2xl p-5 space-y-4">
                        <div className="flex gap-2 items-start text-xs text-amber-800">
                          <span className="text-base">🔒</span>
                          <div>
                            <strong>Private event</strong>
                            <p className="mt-0.5 font-normal">This event won't appear in public listings. Anyone you share the direct link with can view and register.</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-xs font-bold text-[#1a1a1a]">Invite Attendees via Email</label>
                          <div className="flex gap-2">
                            <textarea
                              value={inviteEmails}
                              onChange={e => setInviteEmails(e.target.value)}
                              className={inp + " h-20 resize-none py-2"}
                              placeholder="Enter email addresses separated by commas (e.g. john@example.com, jane@example.com)"
                            />
                            <button
                              type="button"
                              onClick={handleSendInvitations}
                              disabled={sendingInvites || !inviteEmails.trim()}
                              className="px-4 py-2 bg-[#FF4747] text-white rounded-xl text-xs font-bold hover:bg-[#e03b3b] disabled:opacity-50 transition-colors self-end h-[38px] cursor-pointer"
                            >
                              {sendingInvites ? "Sending..." : "Send"}
                            </button>
                          </div>
                        </div>

                        {invitations.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-xs font-bold text-[#1a1a1a]">Sent Invitations ({invitations.length})</div>
                            <div className="max-h-40 overflow-y-auto border border-[#e5e7eb] rounded-xl bg-white text-xs">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-[#e5e7eb] bg-[#fcfcfc] text-[#888]">
                                    <th className="p-2 font-semibold">Email</th>
                                    <th className="p-2 font-semibold">Status</th>
                                    <th className="p-2 font-semibold">Expires At</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {invitations.map((inv: any) => (
                                    <tr key={inv.invitationId || inv.id} className="border-b border-[#e5e7eb] last:border-none">
                                      <td className="p-2 font-medium">{inv.email}</td>
                                      <td className="p-2">
                                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">{inv.status || "PENDING"}</span>
                                      </td>
                                      <td className="p-2 text-gray-500">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-1">
                      <button type="button" onClick={() => setDetailsForm(f => ({ ...f, isPaid: !f.isPaid }))}
                        className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${detailsForm.isPaid ? "bg-[#FF4747]" : "bg-[#e5e7eb]"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${detailsForm.isPaid ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                      <span className="text-xs font-semibold text-[#555]">Paid Event</span>
                      <span className="text-xs text-[#aaa]">{detailsForm.isPaid ? "Attendees pay to register" : "Free entry"}</span>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-[#f0f0f0]">
                      <button onClick={saveDetails} disabled={saving} className={saveBtn}>
                        <Save size={13} />{saving ? "Saving…" : "Save Details"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── SCHEDULE TAB ── */}
              {tab === "schedule" && (
                <div className="max-w-xl w-full mx-auto space-y-6">
                  {/* Existing days */}
                  {schedules.length > 0 && (
                    <div className="space-y-3">
                      {schedules.map((sc: any, idx: number) => (
                        <div key={sc.scheduleId || sc.id} className={`bg-white border rounded-2xl p-5 flex items-start gap-4 transition-colors ${editingSchedule?.scheduleId === sc.scheduleId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                          <div className="w-10 h-10 rounded-xl bg-[#FF4747]/10 flex items-center justify-center shrink-0">
                            <Calendar size={18} className="text-[#FF4747]" />
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-sm text-[#1a1a1a]">Day {idx + 1}</div>
                            <div className="text-xs text-[#888] mt-0.5">{fmtDt(sc.startDatetime)} → {fmtDt(sc.endDatetime)}</div>
                            <div className="text-[10px] text-[#aaa] mt-0.5">{sc.timezone}</div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSchedule(sc);
                                setSchedForm({
                                  startDatetime: sc.startDatetime?.slice(0, 16) || "",
                                  endDatetime: sc.endDatetime?.slice(0, 16) || "",
                                  timezone: sc.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                                });
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"
                            >
                              <Pencil size={9} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteScheduleDay(sc.scheduleId || sc.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={9} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add / edit a day */}
                  <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7 space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-sm text-[#1a1a1a]">{editingSchedule ? "Edit Day" : "Add a Day"}</h3>
                      {editingSchedule && (
                        <button
                          type="button"
                          onClick={() => { setEditingSchedule(null); setSchedForm({ startDatetime: "", endDatetime: "", timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }); }}
                          className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline"
                        >
                          Cancel edit
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={label}>Start Date & Time</label>
                        <input
                          type="datetime-local"
                          value={schedForm.startDatetime}
                          min={toLocalISOString(new Date())}
                          onChange={e => {
                            const minEnd = toLocalISOString(new Date(new Date(e.target.value).getTime() + 2 * 3600 * 1000));
                            setSchedForm(f => ({
                              ...f,
                              startDatetime: e.target.value,
                              endDatetime: !f.endDatetime || new Date(f.endDatetime) < new Date(minEnd) ? minEnd : f.endDatetime,
                            }));
                          }}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={label}>End Date & Time</label>
                        <input
                          type="datetime-local"
                          value={schedForm.endDatetime}
                          min={schedForm.startDatetime ? toLocalISOString(new Date(new Date(schedForm.startDatetime).getTime() + 2 * 3600 * 1000)) : toLocalISOString(new Date())}
                          onChange={e => setSchedForm(f => ({ ...f, endDatetime: e.target.value }))}
                          className={inp}
                        />
                      </div>
                    </div>
                    <div>
                      <label className={label}>Timezone</label>
                      <input value={schedForm.timezone} onChange={e => setSchedForm(f => ({ ...f, timezone: e.target.value }))} className={inp} placeholder="Africa/Douala" />
                    </div>
                    <div className="flex justify-end pt-2 border-t border-[#f0f0f0]">
                      <button onClick={saveSchedule} disabled={saving} className={saveBtn}>
                        <Save size={13} />{saving ? "Saving…" : editingSchedule ? "Save Day" : "Add Day"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── LOCATION TAB ── */}
              {tab === "location" && (
                <div className="max-w-3xl w-full mx-auto space-y-6">
                  {/* Existing locations */}
                  {locations.length > 0 && (
                    <div className="space-y-3">
                      {locations.map(loc => (
                        <div key={loc.locationId} className={`bg-white border rounded-2xl p-5 flex items-start gap-4 transition-colors ${editingLocation?.locationId === loc.locationId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
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
                          <div className="flex gap-1.5 shrink-0">
                            <button type="button" onClick={() => {
                              setEditingLocation(loc);
                              setLocForm({ venueName: loc.venueName || "", address: loc.address || "", city: loc.city || "", country: loc.country || "Cameroon", isVirtual: loc.type === "VIRTUAL", virtualPlatform: loc.virtualPlatform || "", virtualLink: loc.virtualLink || "", latitude: loc.latitude || 3.848, longitude: loc.longitude || 11.502 });
                              locFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer">
                              <Pencil size={11} /> Edit
                            </button>
                            <button type="button" onClick={async () => { if (!confirm("Delete this location?")) return; try { await eventService.deleteEventLocation(loc.locationId); if (editingLocation?.locationId === loc.locationId) { setEditingLocation(null); setLocForm({ venueName: "", address: "", city: "", country: "Cameroon", isVirtual: false, virtualPlatform: "", virtualLink: "", latitude: 3.848, longitude: 11.502 }); } await loadEventData(selectedId); showToast("Location deleted!"); } catch { showToast("Failed to delete location."); } }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add / Edit location form */}
                  <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-sm text-[#1a1a1a]">{editingLocation ? "Edit Location" : "Add Location"}</h3>
                      {editingLocation && (
                        <button type="button" onClick={() => { setEditingLocation(null); setLocForm({ venueName: "", address: "", city: "", country: "Cameroon", isVirtual: false, virtualPlatform: "", virtualLink: "", latitude: 3.848, longitude: 11.502 }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                      )}
                    </div>
                    <form ref={locFormRef} onSubmit={saveLocation} className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-[#fafafa] rounded-xl border border-[#f0f0f0]">
                        <button
                          type="button"
                          onClick={() => setLocForm(f => ({ ...f, isVirtual: false }))}
                          disabled={detailsForm.format === "VIRTUAL"}
                          title={detailsForm.format === "VIRTUAL" ? "Switch event format to In Person or Hybrid to add a physical venue" : undefined}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${detailsForm.format === "VIRTUAL" ? "opacity-40 cursor-not-allowed text-[#888]" : !locForm.isVirtual ? "bg-[#FF4747] text-white cursor-pointer" : "text-[#888] hover:text-[#1a1a1a] cursor-pointer"}`}
                        >
                          <MapPin size={13} /> In Person
                        </button>
                        <button
                          type="button"
                          onClick={() => setLocForm(f => ({ ...f, isVirtual: true }))}
                          disabled={detailsForm.format === "IN_PERSON"}
                          title={detailsForm.format === "IN_PERSON" ? "Switch event format to Virtual or Hybrid to add a virtual location" : undefined}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${detailsForm.format === "IN_PERSON" ? "opacity-40 cursor-not-allowed text-[#888]" : locForm.isVirtual ? "bg-blue-500 text-white cursor-pointer" : "text-[#888] hover:text-[#1a1a1a] cursor-pointer"}`}
                        >
                          <Wifi size={13} /> Virtual
                        </button>
                        {detailsForm.format !== "HYBRID" && (
                          <span className="text-[10px] text-[#aaa] ml-1">
                            {detailsForm.format === "IN_PERSON" ? "Virtual option locked — change format to Hybrid to allow both" : "In-person option locked — change format to Hybrid to allow both"}
                          </span>
                        )}
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
                      <button type="submit" disabled={saving} className={saveBtn}>{editingLocation ? <><Save size={13} />{saving ? "Saving..." : "Save Location"}</> : <><Plus size={13} />{saving ? "Adding..." : "Add Location"}</>}</button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── TICKETS TAB ── */}
              {tab === "tickets" && (
                <div className="max-w-4xl w-full mx-auto space-y-6">
                  {maxCapacity > 0 && (
                    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 flex items-center gap-5">
                      <div className="flex-1">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="font-semibold text-[#1a1a1a]">Capacity Allocation</span>
                          <span className={`font-bold ${allocatedTicketQty > maxCapacity ? "text-red-500" : allocatedTicketQty === maxCapacity ? "text-green-600" : "text-[#555]"}`}>
                            {allocatedTicketQty} / {maxCapacity} slots
                          </span>
                        </div>
                        <div className="w-full bg-[#f0f0f0] rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${allocatedTicketQty > maxCapacity ? "bg-red-500" : allocatedTicketQty === maxCapacity ? "bg-green-500" : "bg-[#FF4747]"}`}
                            style={{ width: `${Math.min(100, maxCapacity > 0 ? (allocatedTicketQty / maxCapacity) * 100 : 0)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs shrink-0">
                        {allocatedTicketQty > maxCapacity ? (
                          <span className="text-red-500 font-semibold">Over capacity!</span>
                        ) : allocatedTicketQty === maxCapacity ? (
                          <span className="text-green-600 font-semibold">Fully allocated</span>
                        ) : (
                          <span className="text-[#888]"><strong className="text-[#1a1a1a]">{maxCapacity - allocatedTicketQty}</strong> remaining</span>
                        )}
                      </div>
                    </div>
                  )}

                  {tickets.length > 0 && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {tickets.map(t => (
                        <div key={t.ticketId || t.id} className={`bg-white border rounded-2xl p-5 transition-colors ${editingTicket?.ticketId === t.ticketId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-[#1a1a1a]">{t.name}</div>
                              {t.description && <div className="text-xs text-[#888] mt-0.5">{t.description}</div>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-3">
                              <span className={`text-sm font-black ${t.price === 0 ? "text-green-600" : "text-[#FF4747]"}`}>
                                {t.price === 0 ? "Free" : `${Number(t.price).toLocaleString()} FCFA`}
                              </span>
                              <button type="button" onClick={() => {
                                setEditingTicket(t);
                                setTicketForm({ name: t.name || "", description: t.description || "", price: t.price || 0, quantity: t.quantityAvailable || 100, maxPerOrder: t.maxPerOrder || 10, isFree: t.price === 0, saleStart: t.saleStart ? toLocalISOString(t.saleStart) : "", saleEnd: t.saleEnd ? toLocalISOString(t.saleEnd) : "", locationId: t.locationId || "", sessionIds: t.sessionIds || [] });
                                ticketFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer">
                                <Pencil size={10} /> Edit
                              </button>
                              <button type="button" onClick={async () => { if (!confirm("Delete this ticket type?")) return; try { await eventService.deleteTicketType(t.ticketId || t.id); if (editingTicket?.ticketId === t.ticketId) { setEditingTicket(null); setTicketForm({ name: "", description: "", price: 0, quantity: 100, maxPerOrder: 10, isFree: true, saleStart: "", saleEnd: "", locationId: "", sessionIds: [] }); } await loadEventData(selectedId); showToast("Ticket deleted!"); } catch { showToast("Failed to delete ticket."); } }} className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-3 text-[10px] text-[#888]">
                            <span>Qty: <strong className="text-[#1a1a1a]">{t.quantityAvailable ?? "—"}</strong></span>
                            {t.quantitySold > 0 && <span>Sold: <strong className="text-[#1a1a1a]">{t.quantitySold}</strong></span>}
                            {t.saleStart && <span>Sale from: <strong className="text-[#1a1a1a]">{new Date(t.saleStart).toLocaleDateString()}</strong></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-sm text-[#1a1a1a]">{editingTicket ? "Edit Ticket Type" : "Create Ticket Type"}</h3>
                      {editingTicket && (
                        <button type="button" onClick={() => { setEditingTicket(null); setTicketForm({ name: "", description: "", price: 0, quantity: 100, maxPerOrder: 10, isFree: true, saleStart: "", saleEnd: "", locationId: "", sessionIds: [] }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                      )}
                    </div>
                    <form ref={ticketFormRef} onSubmit={saveTicket} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={label}>Name *</label><input required placeholder="e.g. General Admission" value={ticketForm.name} onChange={e => setTicketForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                        <div>
                          <label className={label}>Quantity{maxCapacity > 0 && <span className="ml-1 text-[#aaa] normal-case font-normal tracking-normal">— event max: {maxCapacity}</span>}</label>
                          <input
                            type="number"
                            min={1}
                            max={maxCapacity > 0 ? maxCapacity - allocatedTicketQty + (editingTicket?.quantityAvailable ?? 0) : undefined}
                            value={ticketForm.quantity}
                            onChange={e => {
                              const q = Number(e.target.value);
                              setTicketForm(f => ({ ...f, quantity: q, maxPerOrder: Math.min(f.maxPerOrder, q) }));
                            }}
                            className={inp}
                          />
                          {maxCapacity > 0 && (
                            <p className="text-[10px] mt-1 text-[#888]">
                              {maxCapacity - allocatedTicketQty + (editingTicket?.quantityAvailable ?? 0)} slot{maxCapacity - allocatedTicketQty + (editingTicket?.quantityAvailable ?? 0) !== 1 ? "s" : ""} available
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className={label}>Max Per Order{maxCapacity > 0 && <span className="ml-1 text-[#aaa] normal-case font-normal tracking-normal">— max {Math.min(ticketForm.quantity, maxCapacity)}</span>}</label>
                        <input
                          type="number"
                          min={1}
                          max={Math.min(ticketForm.quantity, maxCapacity > 0 ? maxCapacity : ticketForm.quantity)}
                          value={ticketForm.maxPerOrder}
                          onChange={e => setTicketForm(f => ({ ...f, maxPerOrder: Number(e.target.value) }))}
                          className={inp}
                        />
                        <p className="text-[10px] mt-1 text-[#888]">Maximum tickets one person can buy in a single order.</p>
                      </div>

                      <div><label className={label}>Description</label><input placeholder="What's included with this ticket?" value={ticketForm.description} onChange={e => setTicketForm(f => ({ ...f, description: e.target.value }))} className={inp} /></div>

                      <div className="flex items-center gap-3 p-3 bg-[#fafafa] rounded-xl border border-[#f0f0f0]">
                        <button type="button" onClick={() => setTicketForm(f => ({ ...f, isFree: true }))} className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${ticketForm.isFree ? "bg-green-500 text-white" : "text-[#888]"}`}>Free</button>
                        <button type="button" onClick={() => setTicketForm(f => ({ ...f, isFree: false }))} className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${!ticketForm.isFree ? "bg-[#FF4747] text-white" : "text-[#888]"}`}>Paid</button>
                      </div>

                      {!ticketForm.isFree && (
                        <div><label className={label}>Price (FCFA)</label><input type="number" min={0} placeholder="5000" value={ticketForm.price || ""} onChange={e => setTicketForm(f => ({ ...f, price: Number(e.target.value) }))} className={inp} /></div>
                      )}

                      {!schedule && (
                        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
                          ⚠️ No schedule set — go to the <strong>Schedule</strong> tab first. Sale dates will be constrained to the event window once a schedule exists.
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={label}>Sale Starts</label>
                          <input
                            type="datetime-local"
                            value={ticketForm.saleStart}
                            max={schedule?.endDatetime ? toLocalISOString(schedule.endDatetime) : undefined}
                            onChange={e => {
                              const v = e.target.value;
                              setTicketForm(f => {
                                const minEnd = v ? toLocalISOString(new Date(new Date(v).getTime() + 2 * 3600 * 1000)) : f.saleEnd;
                                return { ...f, saleStart: v, saleEnd: f.saleEnd && v && new Date(f.saleEnd) < new Date(minEnd) ? minEnd : f.saleEnd };
                              });
                            }}
                            className={inp}
                          />
                          {schedule?.startDatetime && <p className="text-[10px] mt-1 text-[#888]">Event starts {fmtDt(schedule.startDatetime)}</p>}
                        </div>
                        <div>
                          <label className={label}>Sale Ends</label>
                          <input
                            type="datetime-local"
                            value={ticketForm.saleEnd}
                            max={schedule?.endDatetime ? toLocalISOString(schedule.endDatetime) : undefined}
                            onChange={e => setTicketForm(f => ({ ...f, saleEnd: e.target.value }))}
                            className={inp}
                          />
                          {schedule?.endDatetime && <p className="text-[10px] mt-1 text-[#888]">Event ends {fmtDt(schedule.endDatetime)}</p>}
                        </div>
                      </div>
                      {locations.length > 0 && (
                        <div>
                          <label className={label}>Location</label>
                          <select value={ticketForm.locationId} onChange={e => setTicketForm(f => ({ ...f, locationId: e.target.value }))} className={inp}>
                            <option value="">— All locations —</option>
                            {locations.map(loc => (
                              <option key={loc.locationId} value={loc.locationId}>{loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      {sessions.length > 0 && (
                        <div>
                          <label className={label}>Valid for Sessions</label>
                          <p className="text-[10px] text-[#888] mb-2">Select which sessions this ticket can be used to check in. Leave empty for all sessions (General Admission).</p>
                          <div className="grid grid-cols-2 gap-2 border border-[#e5e7eb] rounded-xl p-3 max-h-40 overflow-y-auto bg-[#fafafa]">
                            {sessions.map(s => {
                              const sId = s.sessionId || s.id;
                              const checked = ticketForm.sessionIds.includes(sId);
                              return (
                                <label key={sId} className="flex items-center gap-2 text-xs font-semibold text-[#555] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => {
                                      setTicketForm(f => {
                                        const nextIds = f.sessionIds.includes(sId)
                                          ? f.sessionIds.filter(id => id !== sId)
                                          : [...f.sessionIds, sId];
                                        return { ...f, sessionIds: nextIds };
                                      });
                                    }}
                                    className="rounded text-[#FF4747] focus:ring-[#FF4747]"
                                  />
                                  <span className="truncate">{s.title}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      <button type="submit" disabled={saving} className={saveBtn}>{editingTicket ? <><Save size={13} />{saving ? "Saving..." : "Save Ticket"}</> : <><Plus size={13} />{saving ? "Adding..." : "Add Ticket Type"}</>}</button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── TEAM TAB ── */}
              {tab === "team" && (
                <div className="max-w-4xl w-full mx-auto space-y-6">
                  {team.length > 0 && (
                    <div className="grid md:grid-cols-3 gap-5">
                      {team.map((m, i) => (
                        <div key={m.connectionId || i} className={`bg-white border rounded-2xl p-5 text-center relative transition-colors ${editingMember?.connectionId === m.connectionId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                          <div className="absolute top-3 right-3 flex gap-1">
                            <button type="button" onClick={() => {
                              setEditingMember(m);
                              setTeamForm({ name: m.name || "", position: m.skills || "", bio: m.availability || "", photoUrl: m.photoUrl || "" });
                              teamFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }} className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer">
                              <Pencil size={9} /> Edit
                            </button>
                            <button type="button" onClick={async () => { if (!confirm("Remove team member?")) return; try { await eventService.deleteNetworking(m.connectionId || m.id); if (editingMember?.connectionId === m.connectionId) { setEditingMember(null); setTeamForm({ name: "", position: "", bio: "", photoUrl: "" }); } await loadEventData(selectedId); showToast("Member removed!"); } catch { showToast("Failed to remove member."); } }} className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                              <Trash2 size={9} />
                            </button>
                          </div>
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
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-sm text-[#1a1a1a]">{editingMember ? "Edit Team Member" : "Add Team Member"}</h3>
                      {editingMember && (
                        <button type="button" onClick={() => { setEditingMember(null); setTeamForm({ name: "", position: "", bio: "", photoUrl: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                      )}
                    </div>
                    <form ref={teamFormRef} onSubmit={saveTeamMember} className="space-y-4">
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
                          <input type="file" accept="image/*" className="hidden" onChange={async e => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              setTeamLoading(true);
                              const res = await eventService.uploadImage(f);
                              setTeamForm(f => ({ ...f, photoUrl: res.url }));
                              showToast("Photo uploaded successfully!");
                            } catch (err: any) {
                              showToast("Failed to upload photo: " + (err.message || err));
                            } finally {
                              setTeamLoading(false);
                            }
                          }} />
                        </label>
                        {teamForm.photoUrl && <button type="button" onClick={() => setTeamForm(f => ({ ...f, photoUrl: "" }))} className="text-xs text-red-500 mt-1 cursor-pointer hover:underline">Remove photo</button>}
                      </div>

                      <button type="submit" disabled={teamLoading} className={saveBtn}>{editingMember ? <><Save size={13} />{teamLoading ? "Saving..." : "Save Member"}</> : <><Plus size={13} />{teamLoading ? "Adding..." : "Add Team Member"}</>}</button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── SESSIONS TAB ── */}
              {tab === "sessions" && (
                <div className="max-w-5xl w-full mx-auto grid md:grid-cols-[1.7fr_1.3fr] gap-6">
                  <div className="space-y-6">
                    {/* Existing sessions */}
                    {sessions.length > 0 ? (
                      <div className="space-y-3">
                        {sessions.map(s => (
                          <div key={s.sessionId || s.id} className={`bg-white border rounded-2xl p-5 flex items-start gap-4 transition-colors ${editingSession?.sessionId === s.sessionId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                            <div className="w-10 h-10 rounded-xl bg-[#F7E998]/50 flex items-center justify-center shrink-0"><Mic2 size={18} className="text-[#7a6a00]" /></div>
                            <div className="flex-1">
                              <div className="font-bold text-sm text-[#1a1a1a]">{s.title}</div>
                              {s.description && <div className="text-xs text-[#888] mt-0.5">{s.description}</div>}
                              <div className="flex gap-3 mt-2 text-[10px] text-[#aaa]">
                                <span className="px-2 py-0.5 bg-[#fafafa] border border-[#f0f0f0] rounded font-medium">{s.type}</span>
                                {s.maxCapacity && <span>Cap: {s.maxCapacity}</span>}
                                {tracks.find(t => (t.trackId || t.id) === (s.trackId || s.track?.trackId)) && <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded font-medium">{tracks.find(t => (t.trackId || t.id) === (s.trackId || s.track?.trackId))?.name}</span>}
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button type="button" onClick={() => {
                                setEditingSession(s);
                                setSessionForm({ title: s.title || "", description: s.description || "", type: s.type || "TALK", startTime: s.startTime ? new Date(s.startTime).toISOString().slice(0, 16) : "", endTime: s.endTime ? new Date(s.endTime).toISOString().slice(0, 16) : "", capacity: s.maxCapacity || 50, trackId: s.trackId || s.track?.trackId || "" });
                                sessionFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer">
                                <Pencil size={11} /> Edit
                              </button>
                              <button type="button" onClick={async () => { if (!confirm("Delete this session?")) return; try { await eventService.deleteSession(s.sessionId || s.id); if (editingSession?.sessionId === s.sessionId) { setEditingSession(null); setSessionForm({ title: "", description: "", type: "TALK", startTime: "", endTime: "", capacity: 50, trackId: "" }); } await loadEventData(selectedId); showToast("Session deleted!"); } catch { showToast("Failed to delete session."); } }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                                <Trash2 size={11} /> Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10 bg-white border border-[#e5e7eb] rounded-3xl text-xs text-[#888] italic">No sessions created yet.</div>
                    )}

                    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                      <div className="flex items-center justify-between mb-5">
                        <h3 className="font-bold text-sm text-[#1a1a1a]">{editingSession ? "Edit Session" : "Add Session"}</h3>
                        {editingSession && (
                          <button type="button" onClick={() => { setEditingSession(null); setSessionForm({ title: "", description: "", type: "TALK", startTime: "", endTime: "", capacity: 50, trackId: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                        )}
                      </div>
                      <form ref={sessionFormRef} onSubmit={saveSession} className="space-y-4">
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
                          <div>
                            <label className={label}>Capacity{maxCapacity > 0 && <span className="ml-1 text-[#aaa] normal-case font-normal tracking-normal">— max {maxCapacity}</span>}</label>
                            <input type="number" min={1} max={maxCapacity || undefined} value={sessionForm.capacity} onChange={e => setSessionForm(f => ({ ...f, capacity: Number(e.target.value) }))} className={inp} />
                          </div>
                          <div>
                            <label className={label}>Track</label>
                            <select value={sessionForm.trackId} onChange={e => setSessionForm(f => ({ ...f, trackId: e.target.value }))} className={inp}>
                              <option value="">— No track —</option>
                              {tracks.map(t => <option key={t.trackId || t.id} value={t.trackId || t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <button type="submit" disabled={saving} className={saveBtn}>{editingSession ? <><Save size={13} />{saving ? "Saving..." : "Save Session"}</> : <><Plus size={13} />{saving ? "Adding..." : "Add Session"}</>}</button>
                      </form>
                    </div>
                  </div>

                  {/* Tracks Column */}
                  <div className="space-y-6">
                    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 space-y-4">
                      <div>
                        <h3 className="font-bold text-sm text-[#1a1a1a]">Event Tracks</h3>
                        <p className="text-[10px] text-[#888] mt-0.5">Define topics, rooms, or parallel streams for your sessions.</p>
                      </div>

                      {tracks.length > 0 ? (
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                          {tracks.map(t => (
                            <div key={t.trackId || t.id} className={`p-3 bg-[#fafafa] border rounded-xl flex items-center justify-between gap-3 transition-colors ${editingTrack?.trackId === t.trackId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#f0f0f0]"}`}>
                              <div className="min-w-0">
                                <div className="font-semibold text-xs text-[#1a1a1a] truncate">{t.name}</div>
                                {t.description && <div className="text-[10px] text-[#888] truncate">{t.description}</div>}
                                {(() => {
                                  const sc = schedules.find((s: any) => (s.scheduleId || s.id) === t.eventScheduleId);
                                  return sc?.startDatetime ? <div className="text-[9px] text-[#aaa] mt-0.5">{new Date(sc.startDatetime).toLocaleDateString()}</div> : null;
                                })()}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <button type="button" onClick={() => {
                                  setEditingTrack(t);
                                  setTrackForm({
                                    name: t.name || "",
                                    description: t.description || "",
                                    locationId: t.locationId || "",
                                    eventScheduleId: t.eventScheduleId || "",
                                  });
                                }} className="p-1 text-[#555] hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer" title="Edit Track">
                                  <Pencil size={11} />
                                </button>
                                <button type="button" onClick={async () => {
                                  if (!confirm(`Delete track "${t.name}"?`)) return;
                                  try {
                                    await eventService.deleteTrack(t.trackId || t.id);
                                    if (editingTrack?.trackId === t.trackId) {
                                      setEditingTrack(null);
                                      setTrackForm({ name: "", description: "", locationId: "", eventScheduleId: "" });
                                    }
                                    await loadEventData(selectedId);
                                    showToast("Track deleted!");
                                  } catch (err: any) {
                                    showToast(err.message || "Failed to delete track.");
                                  }
                                }} className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Delete Track">
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 bg-[#fafafa] border border-dashed border-[#e5e7eb] rounded-xl text-[11px] text-[#aaa] italic">No tracks added yet.</div>
                      )}

                      <form onSubmit={saveTrack} className="border-t border-[#f0f0f0] pt-4 space-y-3">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-xs text-[#1a1a1a]">{editingTrack ? "Edit Track" : "New Track"}</h4>
                          {editingTrack && (
                            <button type="button" onClick={() => {
                              setEditingTrack(null);
                              setTrackForm({ name: "", description: "", locationId: "", eventScheduleId: "" });
                            }} className="text-[10px] text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                          )}
                        </div>
                        <div>
                          <label className={label}>Track Name *</label>
                          <input required placeholder="e.g. Technical, Business" value={trackForm.name} onChange={e => setTrackForm(f => ({ ...f, name: e.target.value }))} className={inp} />
                        </div>
                        <div>
                          <label className={label}>Description</label>
                          <input placeholder="e.g. Advanced technical talks" value={trackForm.description} onChange={e => setTrackForm(f => ({ ...f, description: e.target.value }))} className={inp} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {locations.length > 0 && (
                            <div>
                              <label className={label}>Location</label>
                              <select value={trackForm.locationId} onChange={e => setTrackForm(f => ({ ...f, locationId: e.target.value }))} className={inp}>
                                <option value="">— Select Location —</option>
                                {locations.map(loc => (
                                  <option key={loc.locationId} value={loc.locationId}>{loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div>
                            <label className={label}>Day</label>
                            <select value={trackForm.eventScheduleId} onChange={e => setTrackForm(f => ({ ...f, eventScheduleId: e.target.value }))} className={inp}>
                              <option value="">— Any day —</option>
                              {schedules.map((sc: any) => (
                                <option key={sc.scheduleId || sc.id} value={sc.scheduleId || sc.id}>
                                  {sc.startDatetime ? new Date(sc.startDatetime).toLocaleDateString() : (sc.scheduleId || sc.id)}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center"}>
                          {editingTrack ? <><Save size={13} /> {saving ? "Saving..." : "Save Track"}</> : <><Plus size={13} /> {saving ? "Creating..." : "Add Track"}</>}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}

              {/* ── LIVE TAB ── */}
              {tab === "live" && (
                <div className="max-w-4xl w-full mx-auto grid md:grid-cols-2 gap-6">
                  {/* Polls */}
                  <div className="space-y-5">
                    <h3 className="font-display font-black text-[#1a1a1a] text-base">Live Polls</h3>
                    {polls.length > 0 && polls.map(p => (
                      <div key={p.pollId || p.id} className={`bg-white border rounded-2xl p-5 transition-colors ${editingPoll?.pollId === p.pollId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="font-semibold text-sm text-[#1a1a1a]">{p.question}</div>
                          <div className="flex gap-1 shrink-0 flex-col">
                            <button type="button" onClick={() => {
                              setEditingPoll(p);
                              const opts = typeof p.options === "string" ? JSON.parse(p.options) : (p.options || ["", ""]);
                              setPollForm({ question: p.question || "", options: opts.length >= 2 ? opts : [...opts, ""] });
                              pollFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer">
                              <Pencil size={9} /> Edit
                            </button>
                            <button type="button" onClick={async () => { if (!confirm("Delete this poll?")) return; try { await eventService.deletePoll(p.pollId || p.id); if (editingPoll?.pollId === p.pollId) { setEditingPoll(null); setPollForm({ question: "", options: ["", ""] }); } await loadEventData(selectedId); showToast("Poll deleted!"); } catch { showToast("Failed to delete poll."); } }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer">
                              <Trash2 size={9} /> Del
                            </button>
                          </div>
                        </div>
                        {p.options && (
                          <ul className="space-y-1.5">
                            {(typeof p.options === "string" ? JSON.parse(p.options) : p.options).map((opt: string, i: number) => (
                              <li key={i} className="text-xs text-[#888] flex items-center gap-2">
                                <span className="w-4 h-4 rounded-full bg-[#F7E998] text-[#7a6a00] flex items-center justify-center text-[9px] font-black">{i + 1}</span>{opt}
                              </li>
                            ))}
                          </ul>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-3 inline-block ${p.isActive ? "bg-green-100 text-green-700" : "bg-[#fafafa] text-[#888]"}`}>{p.isActive ? "ACTIVE" : "INACTIVE"}</span>
                      </div>
                    ))}
                    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-sm text-[#1a1a1a]">{editingPoll ? "Edit Poll" : "Create Poll"}</h4>
                        {editingPoll && (
                          <button type="button" onClick={() => { setEditingPoll(null); setPollForm({ question: "", options: ["", ""] }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                        )}
                      </div>
                      <form ref={pollFormRef} onSubmit={savePoll} className="space-y-3">
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
                        <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center"}>{editingPoll ? <><Save size={13} />{saving ? "Saving..." : "Save Poll"}</> : <><Radio size={13} />{saving ? "Creating..." : "Launch Poll"}</>}</button>
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

              {/* ── COUPONS TAB ── */}
              {tab === "coupons" && (
                <div className="max-w-3xl w-full mx-auto space-y-6">
                  {coupons.length > 0 && (
                    <div className="space-y-3">
                      {coupons.map((c: any) => (
                        <div key={c.couponId || c.id} className={`bg-white border rounded-2xl p-5 flex items-center gap-4 transition-colors ${editingCoupon?.couponId === c.couponId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                          <div className="w-10 h-10 rounded-xl bg-[#F7E998]/50 flex items-center justify-center shrink-0"><Tag size={18} className="text-[#7a6a00]" /></div>
                          <div className="flex-1">
                            <div className="font-bold text-sm text-[#1a1a1a] font-mono">{c.code}</div>
                            <div className="text-xs text-[#888] mt-0.5">{c.type === "PERCENTAGE" ? `${c.value}% off` : `${Number(c.value).toLocaleString()} FCFA off`} · max {c.maxUses} uses · used {c.usedCount ?? 0}</div>
                            {c.expiryDate && <div className="text-[10px] text-[#aaa] mt-0.5">Expires {new Date(c.expiryDate).toLocaleDateString()}</div>}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <button type="button" onClick={() => { setEditingCoupon(c); setCouponForm({ code: c.code || "", type: c.type || "PERCENTAGE", value: c.value || 10, maxUses: c.maxUses || 100, expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString().slice(0, 16) : "" }); couponFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"><Pencil size={10} /> Edit</button>
                            <button type="button" onClick={async () => { if (!confirm("Delete this coupon?")) return; try { await eventService.deleteCoupon(c.couponId || c.id); await loadEventData(selectedId); showToast("Coupon deleted!"); } catch { showToast("Failed to delete coupon."); } }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"><Trash2 size={10} /> Delete</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-sm text-[#1a1a1a]">{editingCoupon ? "Edit Coupon" : "Create Coupon"}</h3>
                      {editingCoupon && <button type="button" onClick={() => { setEditingCoupon(null); setCouponForm({ code: "", type: "PERCENTAGE", value: 10, maxUses: 100, expiryDate: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>}
                    </div>
                    <form ref={couponFormRef} onSubmit={saveCoupon} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={label}>Coupon Code *</label><input required placeholder="SUMMER20" value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className={inp} style={{ fontFamily: "monospace" }} /></div>
                        <div>
                          <label className={label}>Discount Type</label>
                          <select value={couponForm.type} onChange={e => setCouponForm(f => ({ ...f, type: e.target.value }))} className={inp}>
                            <option value="PERCENTAGE">Percentage (%)</option>
                            <option value="FIXED">Fixed Amount (FCFA)</option>
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={label}>{couponForm.type === "PERCENTAGE" ? "Discount %" : "Amount (FCFA)"}</label><input type="number" min={1} max={couponForm.type === "PERCENTAGE" ? 100 : undefined} value={couponForm.value} onChange={e => setCouponForm(f => ({ ...f, value: Number(e.target.value) }))} className={inp} /></div>
                        <div><label className={label}>Max Uses</label><input type="number" min={1} value={couponForm.maxUses} onChange={e => setCouponForm(f => ({ ...f, maxUses: Number(e.target.value) }))} className={inp} /></div>
                      </div>
                      <div><label className={label}>Expiry Date</label><input type="datetime-local" value={couponForm.expiryDate} onChange={e => setCouponForm(f => ({ ...f, expiryDate: e.target.value }))} className={inp} /></div>
                      <button type="submit" disabled={saving} className={saveBtn}>{editingCoupon ? <><Save size={13} />{saving ? "Saving..." : "Save Coupon"}</> : <><Plus size={13} />{saving ? "Creating..." : "Create Coupon"}</>}</button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── SPEAKERS TAB ── */}
              {tab === "speakers" && (
                <div className="max-w-4xl w-full mx-auto space-y-6">
                  {(() => {
                    const sortedSpeakers = [...speakers].sort((a, b) => {
                      const locA = getSpeakerLocationName(a);
                      const locB = getSpeakerLocationName(b);
                      if (!locA && locB) return 1;
                      if (locA && !locB) return -1;
                      return locA.localeCompare(locB);
                    });
                    return sortedSpeakers.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        {sortedSpeakers.map((s: any) => (
                          <div key={s.speakerId || s.id} className={`bg-white border rounded-2xl p-5 flex items-start gap-4 transition-colors ${editingSpeaker?.speakerId === s.speakerId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                            {s.photoUrl ? <img src={s.photoUrl} alt={s.name} className="w-12 h-12 rounded-full object-cover border-2 border-[#f0f0f0] shrink-0" /> : <div className="w-12 h-12 rounded-full bg-[#F7E998] flex items-center justify-center font-black text-lg text-[#1a1a1a] shrink-0">{(s.name || "?").charAt(0)}</div>}
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-[#1a1a1a]">{s.name}</div>
                              {s.title && <div className="text-xs text-[#FF4747] font-semibold mt-0.5">{s.title}</div>}
                              {s.company && <div className="text-xs text-[#888]">{s.company}</div>}
                              {s.sessionId && (
                                <div className="text-[10px] text-blue-500 mt-1">
                                  Session: {sessions.find((ss: any) => (ss.sessionId || ss.id) === s.sessionId)?.title || s.sessionId}
                                  {getSpeakerLocationName(s) && ` (${getSpeakerLocationName(s)})`}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0 flex-col">
                              <button type="button" onClick={() => { setEditingSpeaker(s); setSpeakerForm({ name: s.name || "", bio: s.bio || "", photoUrl: s.photoUrl || "", company: s.company || "", title: s.title || "", sessionId: s.sessionId || "", locationId: s.locationId || "" }); speakerFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"><Pencil size={9} /> Edit</button>
                              <button type="button" onClick={async () => { if (!confirm("Remove speaker?")) return; try { await eventService.deleteSessionSpeaker(s.speakerId || s.id); await loadEventData(selectedId); showToast("Speaker removed!"); } catch { showToast("Failed to remove speaker."); } }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"><Trash2 size={9} /> Del</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-sm text-[#1a1a1a]">{editingSpeaker ? "Edit Speaker" : "Add Speaker"}</h3>
                      {editingSpeaker && <button type="button" onClick={() => { setEditingSpeaker(null); setSpeakerForm({ name: "", bio: "", photoUrl: "", company: "", title: "", sessionId: "", locationId: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>}
                    </div>
                    <form ref={speakerFormRef} onSubmit={saveSpeaker} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={label}>Full Name *</label><input required placeholder="Jane Doe" value={speakerForm.name} onChange={e => setSpeakerForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                        <div><label className={label}>Title / Role</label><input placeholder="CEO, Keynote Speaker" value={speakerForm.title} onChange={e => setSpeakerForm(f => ({ ...f, title: e.target.value }))} className={inp} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={label}>Company / Organization</label><input placeholder="Acme Corp" value={speakerForm.company} onChange={e => setSpeakerForm(f => ({ ...f, company: e.target.value }))} className={inp} /></div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className={label + " mb-0"}>Assign to Session</label>
                            <button
                              type="button"
                              onClick={() => setTab("sessions")}
                              className="text-[10px] text-[#FF4747] font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
                            >
                              <Plus size={10} /> Create Session
                            </button>
                          </div>
                          <select value={speakerForm.sessionId} onChange={e => setSpeakerForm(f => ({ ...f, sessionId: e.target.value }))} className={inp}>
                            <option value="">— No session —</option>
                            {sessions.map((s: any) => <option key={s.sessionId || s.id} value={s.sessionId || s.id}>{s.title}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={label}>Direct Location Link (Override)</label>
                          <select value={speakerForm.locationId} onChange={e => setSpeakerForm(f => ({ ...f, locationId: e.target.value }))} className={inp}>
                            <option value="">— Select Location (Optional) —</option>
                            {locations.map((loc: any) => (
                              <option key={loc.locationId || loc.id} value={loc.locationId || loc.id}>
                                {loc.type === "VIRTUAL" ? (loc.virtualPlatform || "Virtual") : (loc.venueName || loc.address || "In Person")}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div><label className={label}>Bio</label><textarea placeholder="Brief speaker biography..." value={speakerForm.bio} onChange={e => setSpeakerForm(f => ({ ...f, bio: e.target.value }))} rows={3} className={inp + " resize-none"} /></div>

                      <div>
                        <label className={label}>Speaker Photo</label>
                        <label className="flex items-center gap-4 border-2 border-dashed border-[#e5e7eb] rounded-2xl p-4 cursor-pointer hover:border-[#FF4747] transition-colors group">
                          {speakerForm.photoUrl ? (
                            <img src={speakerForm.photoUrl} alt="Preview" className="w-14 h-14 rounded-full object-cover border-2 border-[#f0f0f0] shrink-0" />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-[#fafafa] flex items-center justify-center shrink-0 border border-[#e5e7eb]">
                              <User size={22} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-[#1a1a1a]">{speakerForm.photoUrl ? "Click to change" : "Upload photo"}</div>
                            <div className="text-xs text-[#aaa]">PNG or JPG</div>
                          </div>
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
                        {speakerForm.photoUrl && <button type="button" onClick={() => setSpeakerForm(f => ({ ...f, photoUrl: "" }))} className="text-xs text-red-500 mt-1 cursor-pointer hover:underline">Remove photo</button>}
                      </div>

                      <button type="submit" disabled={saving} className={saveBtn}>{editingSpeaker ? <><Save size={13} />{saving ? "Saving..." : "Save Speaker"}</> : <><Plus size={13} />{saving ? "Adding..." : "Add Speaker"}</>}</button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── SPONSORS TAB ── */}
              {tab === "sponsors" && (
                <div className="max-w-4xl w-full mx-auto space-y-6">
                  {/* Sponsorship packages */}
                  <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6">
                    <h3 className="font-bold text-sm text-[#1a1a1a] mb-4">Sponsorship Packages</h3>
                    {sponsorPackages.length > 0 ? (
                      <div className="grid md:grid-cols-3 gap-3 mb-4">
                        {sponsorPackages.map((pkg: any) => {
                          const takenSlots = sponsors.filter((s: any) => (s.packageId || "") === (pkg.packageId || pkg.id) && s.status !== "REJECTED").length;
                          return (
                            <div key={pkg.packageId || pkg.id} className="bg-[#fafafa] border border-[#f0f0f0] rounded-xl p-4">
                              <div className="font-bold text-sm text-[#1a1a1a]">{pkg.name}</div>
                              <div className="text-sm font-black text-[#FF4747] mt-1">{Number(pkg.price).toLocaleString()} FCFA</div>
                              {pkg.description && <div className="text-xs text-[#888] mt-1">{pkg.description}</div>}
                              {pkg.maxSponsors > 0 && (
                                <div className="text-[10px] text-[#888] mt-2 font-semibold">{takenSlots} / {pkg.maxSponsors} slots filled</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : <p className="text-xs text-[#aaa] italic mb-4">No packages yet.</p>}
                    <form onSubmit={saveSponsorPackage} className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <input required placeholder="Package name" value={sponsorPkgForm.name} onChange={e => setSponsorPkgForm(f => ({ ...f, name: e.target.value }))} className={inp} />
                        <input type="number" min={0} placeholder="Price (FCFA)" value={sponsorPkgForm.price || ""} onChange={e => setSponsorPkgForm(f => ({ ...f, price: Number(e.target.value) }))} className={inp} />
                        <input placeholder="Benefits" value={sponsorPkgForm.benefits} onChange={e => setSponsorPkgForm(f => ({ ...f, benefits: e.target.value }))} className={inp} />
                      </div>
                      <div className="grid grid-cols-3 gap-3 items-end">
                        <div><label className={label}>Max Sponsors (slots)</label><input type="number" min={0} placeholder="Unlimited" value={sponsorPkgForm.maxSponsors || ""} onChange={e => setSponsorPkgForm(f => ({ ...f, maxSponsors: Number(e.target.value) }))} className={inp} /></div>
                        <div><label className={label}>Applications Open</label><input type="datetime-local" value={sponsorPkgForm.applicationStart} onChange={e => setSponsorPkgForm(f => ({ ...f, applicationStart: e.target.value }))} className={inp} /></div>
                        <div><label className={label}>Applications Close</label><input type="datetime-local" value={sponsorPkgForm.applicationEnd} onChange={e => setSponsorPkgForm(f => ({ ...f, applicationEnd: e.target.value }))} className={inp} /></div>
                      </div>
                      <button type="submit" disabled={saving} className={saveBtn + " justify-center h-[38px]"}><Plus size={13} />{saving ? "..." : "Add Package"}</button>
                    </form>
                  </div>

                  {/* Sponsors list */}
                  {sponsors.length > 0 && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {sponsors.map((s: any) => {
                        const sponsorName = s.name || s.companyName || "Unnamed sponsor";
                        const statusBadge: Record<string, string> = {
                          PENDING: "bg-amber-50 text-amber-700 border-amber-200",
                          APPROVED: "bg-green-50 text-green-700 border-green-200",
                          REJECTED: "bg-red-50 text-red-700 border-red-200",
                        };
                        return (
                          <div key={s.sponsorId || s.id} className={`bg-white border rounded-2xl p-5 flex items-center gap-4 transition-colors ${editingSponsor?.sponsorId === s.sponsorId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                            {s.logoUrl ? <img src={s.logoUrl} alt={sponsorName} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-[#f0f0f0]" /> : <div className="w-10 h-10 rounded-lg bg-[#F7E998]/60 flex items-center justify-center font-black text-sm text-[#7a6a00] shrink-0">{sponsorName.charAt(0)}</div>}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="font-bold text-sm text-[#1a1a1a]">{sponsorName}</div>
                                {s.status && (
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${statusBadge[s.status] || "bg-[#f0f0f0] text-[#888] border-[#e5e7eb]"}`}>{s.status}</span>
                                )}
                              </div>
                              {s.website && <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">{s.website}</a>}
                              {s.email && <div className="text-[10px] text-[#888]">{s.email}</div>}
                            </div>
                            <div className="flex gap-1 flex-col shrink-0">
                              {s.status === "PENDING" && (
                                <>
                                  <button type="button" onClick={() => updateSponsorStatus(s, "APPROVED")} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors cursor-pointer"><Check size={9} /> Approve</button>
                                  <button type="button" onClick={() => updateSponsorStatus(s, "REJECTED")} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"><X size={9} /> Reject</button>
                                </>
                              )}
                              <button type="button" onClick={() => { setEditingSponsor(s); setSponsorForm({ name: s.name || "", email: s.email || "", website: s.website || "", logoUrl: s.logoUrl || "", packageId: s.packageId || "" }); sponsorFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"><Pencil size={9} /> Edit</button>
                              <button type="button" onClick={async () => { if (!confirm("Remove sponsor?")) return; try { await eventService.deleteSponsor(s.sponsorId || s.id); await loadEventData(selectedId); showToast("Sponsor removed!"); } catch { showToast("Failed to remove sponsor."); } }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"><Trash2 size={9} /> Del</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Add sponsor form */}
                  <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-sm text-[#1a1a1a]">{editingSponsor ? "Edit Sponsor" : "Add Sponsor"}</h3>
                      {editingSponsor && <button type="button" onClick={() => { setEditingSponsor(null); setSponsorForm({ name: "", email: "", website: "", logoUrl: "", packageId: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>}
                    </div>
                    <form ref={sponsorFormRef} onSubmit={saveSponsor} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={label}>Sponsor Name *</label><input required placeholder="Acme Corp" value={sponsorForm.name} onChange={e => setSponsorForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                        <div><label className={label}>Email</label><input type="email" placeholder="sponsor@acme.com" value={sponsorForm.email} onChange={e => setSponsorForm(f => ({ ...f, email: e.target.value }))} className={inp} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={label}>Website</label><input type="url" placeholder="https://acme.com" value={sponsorForm.website} onChange={e => setSponsorForm(f => ({ ...f, website: e.target.value }))} className={inp} /></div>
                        <div>
                          <label className={label}>Package</label>
                          <select value={sponsorForm.packageId} onChange={e => setSponsorForm(f => ({ ...f, packageId: e.target.value }))} className={inp}>
                            <option value="">— No package —</option>
                            {sponsorPackages.map((p: any) => <option key={p.packageId || p.id} value={p.packageId || p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className={label}>Sponsor Logo</label>
                        <label className="flex items-center gap-4 border-2 border-dashed border-[#e5e7eb] rounded-2xl p-4 cursor-pointer hover:border-[#FF4747] transition-colors group">
                          {sponsorForm.logoUrl ? (
                            <img src={sponsorForm.logoUrl} alt="Preview" className="w-14 h-14 rounded-lg object-contain border-2 border-[#f0f0f0] shrink-0 bg-[#fafafa]" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-[#fafafa] flex items-center justify-center shrink-0 border border-[#e5e7eb]">
                              <ImageIcon size={22} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-[#1a1a1a]">{sponsorForm.logoUrl ? "Click to change" : "Upload logo"}</div>
                            <div className="text-xs text-[#aaa]">PNG or JPG</div>
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={async e => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              setSaving(true);
                              const res = await eventService.uploadImage(f);
                              setSponsorForm(f => ({ ...f, logoUrl: res.url }));
                              showToast("Logo uploaded successfully!");
                            } catch (err: any) {
                              showToast("Failed to upload logo: " + (err.message || err));
                            } finally {
                              setSaving(false);
                            }
                          }} />
                        </label>
                        {sponsorForm.logoUrl && <button type="button" onClick={() => setSponsorForm(f => ({ ...f, logoUrl: "" }))} className="text-xs text-red-500 mt-1 cursor-pointer hover:underline">Remove logo</button>}
                      </div>
                      <button type="submit" disabled={saving} className={saveBtn}>{editingSponsor ? <><Save size={13} />{saving ? "Saving..." : "Save Sponsor"}</> : <><Plus size={13} />{saving ? "Adding..." : "Add Sponsor"}</>}</button>
                    </form>
                  </div>

                  {/* Volunteer Openings */}
                  <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6">
                    <h3 className="font-bold text-sm text-[#1a1a1a] mb-1">Volunteer Program</h3>
                    <p className="text-xs text-[#888] mb-4">Configure when people can apply to volunteer at this event.</p>
                    {volunteerOpenings.length > 0 && (
                      <div className="space-y-3 mb-5">
                        {volunteerOpenings.map((v: any) => (
                          <div key={v.openingId || v.id} className={`border rounded-xl p-4 flex items-start gap-3 ${editingVolunteerOpening?.openingId === v.openingId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-[#1a1a1a]">{v.title}</div>
                              {v.applicationStart && <div className="text-xs text-[#888] mt-0.5">Open: {new Date(v.applicationStart).toLocaleString()}</div>}
                              {v.applicationEnd && <div className="text-xs text-[#888]">Close: {new Date(v.applicationEnd).toLocaleString()}</div>}
                              {v.maxVolunteers && <div className="text-xs text-[#aaa]">Max: {v.maxVolunteers} volunteers</div>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button type="button" onClick={() => { setEditingVolunteerOpening(v); setVolunteerOpeningForm({ title: v.title || "", description: v.description || "", requirements: v.requirements || "", applicationStart: v.applicationStart ? new Date(v.applicationStart).toISOString().slice(0, 16) : "", applicationEnd: v.applicationEnd ? new Date(v.applicationEnd).toISOString().slice(0, 16) : "", maxVolunteers: v.maxVolunteers || 0 }); }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"><Pencil size={9} /> Edit</button>
                              <button type="button" onClick={async () => { if (!confirm("Delete this volunteer opening?")) return; try { await eventService.deleteVolunteerOpening(v.openingId || v.id); await loadEventData(selectedId); showToast("Deleted!"); } catch { showToast("Failed to delete."); } }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"><Trash2 size={9} /> Del</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <form onSubmit={saveVolunteerOpening} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-[#555]">{editingVolunteerOpening ? "Edit Opening" : "Add Opening"}</p>
                        {editingVolunteerOpening && <button type="button" onClick={() => { setEditingVolunteerOpening(null); setVolunteerOpeningForm({ title: "", description: "", requirements: "", applicationStart: "", applicationEnd: "", maxVolunteers: 0 }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel</button>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={label}>Title *</label><input required placeholder="e.g. Event Volunteer" value={volunteerOpeningForm.title} onChange={e => setVolunteerOpeningForm(f => ({ ...f, title: e.target.value }))} className={inp} /></div>
                        <div><label className={label}>Max Volunteers</label><input type="number" min={0} value={volunteerOpeningForm.maxVolunteers || ""} onChange={e => setVolunteerOpeningForm(f => ({ ...f, maxVolunteers: Number(e.target.value) }))} className={inp} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={label}>Applications Open</label><input type="datetime-local" value={volunteerOpeningForm.applicationStart} onChange={e => setVolunteerOpeningForm(f => ({ ...f, applicationStart: e.target.value }))} className={inp} /></div>
                        <div><label className={label}>Applications Close</label><input type="datetime-local" value={volunteerOpeningForm.applicationEnd} onChange={e => setVolunteerOpeningForm(f => ({ ...f, applicationEnd: e.target.value }))} className={inp} /></div>
                      </div>
                      <div><label className={label}>Description</label><textarea rows={2} value={volunteerOpeningForm.description} onChange={e => setVolunteerOpeningForm(f => ({ ...f, description: e.target.value }))} className={inp + " resize-none"} /></div>
                      <div><label className={label}>Requirements</label><textarea rows={2} value={volunteerOpeningForm.requirements} onChange={e => setVolunteerOpeningForm(f => ({ ...f, requirements: e.target.value }))} className={inp + " resize-none"} /></div>
                      <button type="submit" disabled={saving} className={saveBtn}>{editingVolunteerOpening ? <><Save size={13} />{saving ? "Saving..." : "Save Opening"}</> : <><Plus size={13} />{saving ? "Adding..." : "Add Opening"}</>}</button>
                    </form>
                  </div>

                  {/* Volunteer Applications */}
                  <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6">
                    <h3 className="font-bold text-sm text-[#1a1a1a] mb-1">Volunteer Applications</h3>
                    <p className="text-xs text-[#888] mb-4">People who applied to volunteer via the public event page.</p>
                    {volunteerApplications.length === 0 ? (
                      <div className="border border-dashed border-[#e5e7eb] rounded-xl p-8 text-center">
                        <p className="text-xs text-[#aaa]">No volunteer applications yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {volunteerApplications.map((v: any) => {
                          const statusBadge: Record<string, string> = {
                            PENDING: "bg-amber-50 text-amber-700 border-amber-200",
                            APPROVED: "bg-green-50 text-green-700 border-green-200",
                            REJECTED: "bg-red-50 text-red-700 border-red-200",
                          };
                          return (
                            <div key={v.connectionId || v.id} className="border border-[#e5e7eb] rounded-xl p-4 flex items-start gap-3">
                              {v.photoUrl ? (
                                <img src={v.photoUrl} alt={v.name} className="w-9 h-9 rounded-full object-cover shrink-0 border border-[#f0f0f0]" />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center shrink-0 font-black text-xs text-[#555]">{(v.name || "?").charAt(0)}</div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <div className="font-bold text-sm text-[#1a1a1a]">{v.name}</div>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${statusBadge[v.status] || "bg-[#f0f0f0] text-[#888] border-[#e5e7eb]"}`}>{v.status || "PENDING"}</span>
                                </div>
                                <div className="text-[10px] text-[#888] mt-0.5">{v.email}{v.phone ? ` · ${v.phone}` : ""}</div>
                                {v.skills && <div className="text-xs text-[#555] mt-1"><span className="text-[#aaa]">Skills:</span> {v.skills}</div>}
                                {v.availability && <div className="text-xs text-[#555]"><span className="text-[#aaa]">Availability:</span> {v.availability}</div>}
                              </div>
                              {v.status === "PENDING" && (
                                <div className="flex gap-1 shrink-0">
                                  <button type="button" onClick={() => updateVolunteerApplicationStatus(v, "APPROVED")} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors cursor-pointer"><Check size={9} /> Approve</button>
                                  <button type="button" onClick={() => updateVolunteerApplicationStatus(v, "REJECTED")} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"><X size={9} /> Reject</button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── REGISTRATIONS TAB ── */}
              {tab === "registrations" && (
                <div className="max-w-4xl w-full mx-auto space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-sm text-[#1a1a1a]">Registrations</h3>
                      <p className="text-xs text-[#888] mt-0.5">{registrations.length} registrant{registrations.length !== 1 ? "s" : ""} for this event</p>
                    </div>
                    <a href="/admin/checkin" className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-colors cursor-pointer">
                      <ScanLine size={13} /> Open Check-in Scanner
                    </a>
                  </div>

                  {registrationsLoading ? (
                    <div className="flex items-center justify-center py-20 text-[#aaa]">
                      <div className="w-7 h-7 border-4 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin" />
                    </div>
                  ) : registrations.length === 0 ? (
                    <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-16 text-center">
                      <ScanLine size={36} className="mx-auto text-[#e5e7eb] mb-3" />
                      <p className="font-bold text-[#1a1a1a] mb-1">No registrations yet</p>
                      <p className="text-xs text-[#aaa]">When attendees register, they'll appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {registrations.map((r: any) => (
                        <div key={r.registrationId || r.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-4 flex items-center gap-4">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${r.checkedIn ? "bg-green-100" : "bg-[#fafafa] border border-[#e5e7eb]"}`}>
                            {r.checkedIn ? <Check size={16} className="text-green-600" /> : <QrCode size={16} className="text-[#aaa]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-[#1a1a1a] font-mono">{r.confirmationCode || r.registrationId?.substring(0, 8)}</div>
                            <div className="flex gap-3 mt-0.5 text-[10px] text-[#aaa]">
                              <span>Registered {r.registeredAt ? new Date(r.registeredAt).toLocaleDateString() : "—"}</span>
                              {r.checkedIn && <span className="text-green-600 font-semibold">Checked in {r.checkedInAt ? new Date(r.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>}
                            </div>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${r.checkedIn ? "bg-green-100 text-green-700" : r.status === "CANCELLED" ? "bg-red-100 text-red-600" : "bg-[#f5f5f5] text-[#888]"}`}>
                            {r.checkedIn ? "CHECKED IN" : r.status || "REGISTERED"}
                          </span>
                          {!r.checkedIn && (
                            <button type="button" onClick={() => handleCheckIn(r.registrationId || r.id)} className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer">
                              <Check size={12} /> Check In
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── VENDORS TAB ── */}
              {tab === "vendors" && (
                <div className="max-w-4xl w-full mx-auto space-y-6">
                  <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6">
                    <h3 className="font-bold text-sm text-[#1a1a1a] mb-1">Vendor Slots</h3>
                    <p className="text-xs text-[#888] mb-4">Limit how many vendors/exhibitors can be accepted for this event. Leave at 0 for unlimited.</p>
                    <div className="flex items-end gap-3">
                      <div className="flex-1 max-w-[180px]">
                        <label className={label}>Max Vendors</label>
                        <input type="number" min={0} placeholder="Unlimited" value={detailsForm.maxExhibitors || ""} onChange={e => setDetailsForm(f => ({ ...f, maxExhibitors: Number(e.target.value) }))} className={inp} />
                      </div>
                      <button type="button" onClick={saveDetails} disabled={saving} className={saveBtn + " h-[38px]"}><Save size={13} />{saving ? "Saving..." : "Save"}</button>
                      {detailsForm.maxExhibitors > 0 && (
                        <span className="text-xs text-[#888] font-semibold pb-2">
                          {exhibitors.filter((ex: any) => ex.status !== "REJECTED").length} / {detailsForm.maxExhibitors} slots filled
                        </span>
                      )}
                    </div>
                  </div>

                  {exhibitors.length > 0 && (
                    <div className="grid md:grid-cols-2 gap-4">
                      {exhibitors.map((ex: any) => {
                        const exhibitorName = ex.name || ex.companyName || "Unnamed vendor";
                        const statusBadge: Record<string, string> = {
                          PENDING: "bg-amber-50 text-amber-700 border-amber-200",
                          APPROVED: "bg-green-50 text-green-700 border-green-200",
                          REJECTED: "bg-red-50 text-red-700 border-red-200",
                        };
                        return (
                          <div key={ex.exhibitorId || ex.id} className={`bg-white border rounded-2xl p-5 flex items-center gap-4 transition-colors ${editingExhibitor?.exhibitorId === ex.exhibitorId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                            {ex.logoUrl ? (
                              <img src={ex.logoUrl} alt={exhibitorName} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-[#f0f0f0]" />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-[#f5f5f5] flex items-center justify-center shrink-0 font-black text-sm text-[#555]">{exhibitorName.charAt(0)}</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <div className="font-bold text-sm text-[#1a1a1a]">{exhibitorName}</div>
                                {ex.status && (
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${statusBadge[ex.status] || "bg-[#f0f0f0] text-[#888] border-[#e5e7eb]"}`}>{ex.status}</span>
                                )}
                              </div>
                              {ex.boothNumber && <div className="text-[10px] text-[#FF4747] font-semibold">Booth #{ex.boothNumber}</div>}
                              {ex.website && <a href={ex.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">{ex.website}</a>}
                              {ex.email && <div className="text-[10px] text-[#888]">{ex.email}</div>}
                            </div>
                            <div className="flex gap-1 flex-col shrink-0">
                              {ex.status === "PENDING" && (
                                <>
                                  <button type="button" onClick={() => updateExhibitorStatus(ex, "APPROVED")} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors cursor-pointer"><Check size={9} /> Approve</button>
                                  <button type="button" onClick={() => updateExhibitorStatus(ex, "REJECTED")} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"><X size={9} /> Reject</button>
                                </>
                              )}
                              <button type="button" onClick={() => {
                                setEditingExhibitor(ex);
                                setExhibitorForm({ name: ex.name || "", email: ex.email || "", website: ex.website || "", logoUrl: ex.logoUrl || "", boothNumber: ex.boothNumber || "", locationId: ex.locationId || "" });
                                exhibitorFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"><Pencil size={9} /> Edit</button>
                              <button type="button" onClick={async () => { if (!confirm("Remove exhibitor?")) return; try { await eventService.deleteExhibitor(ex.exhibitorId || ex.id); await loadEventData(selectedId); showToast("Exhibitor removed!"); } catch { showToast("Failed to remove."); } }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"><Trash2 size={9} /> Del</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-sm text-[#1a1a1a]">{editingExhibitor ? "Edit Exhibitor" : "Add Exhibitor / Vendor"}</h3>
                      {editingExhibitor && <button type="button" onClick={() => { setEditingExhibitor(null); setExhibitorForm({ name: "", email: "", website: "", logoUrl: "", boothNumber: "", locationId: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>}
                    </div>
                    <form ref={exhibitorFormRef} onSubmit={saveExhibitor} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={label}>Company Name *</label><input required placeholder="Acme Exhibits" value={exhibitorForm.name} onChange={e => setExhibitorForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                        <div><label className={label}>Booth Number</label><input placeholder="A-12" value={exhibitorForm.boothNumber} onChange={e => setExhibitorForm(f => ({ ...f, boothNumber: e.target.value }))} className={inp} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={label}>Email</label><input type="email" placeholder="vendor@acme.com" value={exhibitorForm.email} onChange={e => setExhibitorForm(f => ({ ...f, email: e.target.value }))} className={inp} /></div>
                        <div><label className={label}>Website</label><input type="url" placeholder="https://acme.com" value={exhibitorForm.website} onChange={e => setExhibitorForm(f => ({ ...f, website: e.target.value }))} className={inp} /></div>
                      </div>
                      <div>
                        <label className={label}>Exhibitor Logo</label>
                        <label className="flex items-center gap-4 border-2 border-dashed border-[#e5e7eb] rounded-2xl p-4 cursor-pointer hover:border-[#FF4747] transition-colors group">
                          {exhibitorForm.logoUrl ? (
                            <img src={exhibitorForm.logoUrl} alt="Preview" className="w-14 h-14 rounded-lg object-contain border-2 border-[#f0f0f0] shrink-0 bg-[#fafafa]" />
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-[#fafafa] flex items-center justify-center shrink-0 border border-[#e5e7eb]">
                              <ImageIcon size={22} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-semibold text-[#1a1a1a]">{exhibitorForm.logoUrl ? "Click to change" : "Upload logo"}</div>
                            <div className="text-xs text-[#aaa]">PNG or JPG</div>
                          </div>
                          <input type="file" accept="image/*" className="hidden" onChange={async e => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              setSaving(true);
                              const res = await eventService.uploadImage(f);
                              setExhibitorForm(f => ({ ...f, logoUrl: res.url }));
                              showToast("Logo uploaded successfully!");
                            } catch (err: any) {
                              showToast("Failed to upload logo: " + (err.message || err));
                            } finally {
                              setSaving(false);
                            }
                          }} />
                        </label>
                        {exhibitorForm.logoUrl && <button type="button" onClick={() => setExhibitorForm(f => ({ ...f, logoUrl: "" }))} className="text-xs text-red-500 mt-1 cursor-pointer hover:underline">Remove logo</button>}
                      </div>
                      {locations.length > 0 && (
                        <div>
                          <label className={label}>Location</label>
                          <select value={exhibitorForm.locationId} onChange={e => setExhibitorForm(f => ({ ...f, locationId: e.target.value }))} className={inp}>
                            <option value="">— All locations —</option>
                            {locations.map(loc => (
                              <option key={loc.locationId} value={loc.locationId}>{loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <button type="submit" disabled={saving} className={saveBtn}>{editingExhibitor ? <><Save size={13} />{saving ? "Saving..." : "Save Exhibitor"}</> : <><Plus size={13} />{saving ? "Adding..." : "Add Exhibitor"}</>}</button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── ANNOUNCEMENTS TAB ── */}
              {tab === "announcements" && (
                <div className="max-w-3xl w-full mx-auto space-y-6">
                  {announcements.length > 0 && (
                    <div className="space-y-3">
                      {announcements.map((a: any) => (
                        <div key={a.announcementId || a.id} className={`bg-white border rounded-2xl p-5 flex items-start gap-4 transition-colors ${editingAnnouncement?.announcementId === a.announcementId ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0"><Megaphone size={18} className="text-amber-500" /></div>
                          <div className="flex-1">
                            <div className="font-bold text-sm text-[#1a1a1a]">{a.title}</div>
                            <div className="text-xs text-[#888] mt-1 leading-relaxed">{a.content}</div>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{a.type || "GENERAL"}</span>
                              {a.publishedAt && <span className="text-[10px] text-[#aaa]">{new Date(a.publishedAt).toLocaleDateString()}</span>}
                            </div>
                          </div>
                          <div className="flex gap-1 flex-col shrink-0">
                            <button type="button" onClick={() => {
                              setEditingAnnouncement(a);
                              setAnnouncementForm({ title: a.title || "", content: a.content || "", type: a.type || "GENERAL" });
                              announcementFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"><Pencil size={9} /> Edit</button>
                            <button type="button" onClick={async () => { if (!confirm("Delete announcement?")) return; try { await eventService.deleteAnnouncement(a.announcementId || a.id); await loadEventData(selectedId); showToast("Announcement deleted!"); } catch { showToast("Failed to delete."); } }} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"><Trash2 size={9} /> Del</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="font-bold text-sm text-[#1a1a1a]">{editingAnnouncement ? "Edit Announcement" : "Post Announcement"}</h3>
                      {editingAnnouncement && <button type="button" onClick={() => { setEditingAnnouncement(null); setAnnouncementForm({ title: "", content: "", type: "GENERAL" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>}
                    </div>
                    <form ref={announcementFormRef} onSubmit={saveAnnouncement} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><label className={label}>Title *</label><input required placeholder="Important Update" value={announcementForm.title} onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))} className={inp} /></div>
                        <div>
                          <label className={label}>Type</label>
                          <select value={announcementForm.type} onChange={e => setAnnouncementForm(f => ({ ...f, type: e.target.value }))} className={inp}>
                            <option value="GENERAL">General</option>
                            <option value="URGENT">Urgent</option>
                            <option value="SCHEDULE_CHANGE">Schedule Change</option>
                            <option value="REMINDER">Reminder</option>
                            <option value="LOGISTICS">Logistics</option>
                          </select>
                        </div>
                      </div>
                      <div><label className={label}>Content *</label><textarea required placeholder="Write your announcement here..." value={announcementForm.content} onChange={e => setAnnouncementForm(f => ({ ...f, content: e.target.value }))} rows={5} className={inp + " resize-none"} /></div>
                      <button type="submit" disabled={saving} className={saveBtn}>{editingAnnouncement ? <><Save size={13} />{saving ? "Saving..." : "Save"}</> : <><Megaphone size={13} />{saving ? "Posting..." : "Post Announcement"}</>}</button>
                    </form>
                  </div>
                </div>
              )}

              {/* ── FEEDBACK TAB ── */}
              {tab === "feedback" && (
                <div className="max-w-3xl w-full mx-auto space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-sm text-[#1a1a1a]">Attendee Feedback</h3>
                      <p className="text-xs text-[#888] mt-0.5">{feedbacks.length} submission{feedbacks.length !== 1 ? "s" : ""} for this event</p>
                    </div>
                  </div>
                  {feedbacks.length === 0 ? (
                    <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-16 text-center">
                      <MessageSquare size={36} className="mx-auto text-[#e5e7eb] mb-3" />
                      <p className="font-bold text-[#1a1a1a] mb-1">No feedback yet</p>
                      <p className="text-xs text-[#aaa]">Attendee feedback will appear here after the event.</p>
                    </div>
                  ) : (
                    <>
                      {/* Summary stats */}
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { label: "Total Responses", value: feedbacks.length, color: "#6366f1" },
                          { label: "Avg Rating", value: feedbacks.filter(f => f.rating).length > 0 ? (feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbacks.filter(f => f.rating).length).toFixed(1) : "N/A", color: "#f59e0b" },
                          { label: "Would Recommend", value: `${feedbacks.filter(f => f.wouldRecommend).length}/${feedbacks.length}`, color: "#10b981" },
                        ].map(s => (
                          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-2xl p-4 text-center">
                            <div className="font-black text-2xl" style={{ color: s.color }}>{s.value}</div>
                            <div className="text-xs text-[#888] mt-0.5">{s.label}</div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3">
                        {feedbacks.map((f: any) => (
                          <div key={f.feedbackId || f.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {f.rating && (
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(n => (
                                      <span key={n} className={`text-sm ${n <= f.rating ? "text-amber-400" : "text-[#e5e7eb]"}`}>★</span>
                                    ))}
                                  </div>
                                )}
                                {f.category && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f5f5f5] text-[#888]">{f.category}</span>}
                              </div>
                              <span className="text-[10px] text-[#aaa]">{f.createdAt ? new Date(f.createdAt).toLocaleDateString() : "—"}</span>
                            </div>
                            {f.comment && <p className="text-sm text-[#555] leading-relaxed italic">"{f.comment}"</p>}
                            {f.wouldRecommend !== undefined && (
                              <div className={`mt-2 text-[10px] font-bold ${f.wouldRecommend ? "text-green-600" : "text-red-500"}`}>
                                {f.wouldRecommend ? "✓ Would recommend" : "✗ Would not recommend"}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── EMAIL TAB ── */}
              {tab === "email" && (
                <div className="max-w-3xl w-full mx-auto space-y-6">
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
                    <form ref={emailFormRef} onSubmit={sendCampaign} className="space-y-4">
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

              {/* ── CUSTOM SECTIONS TAB ── */}
              {tab === "sections" && (() => {
                const SECTION_TYPES: { type: string; icon: any; label: string; hint: string }[] = [
                  { type: "HERO", icon: ImageIcon, label: "Hero", hint: "Full-width banner at the top of the page" },
                  { type: "TEXT", icon: FileText, label: "Text", hint: "Title + description with optional image" },
                  { type: "SCHEDULE", icon: Calendar, label: "Schedule", hint: "Auto-pulls sessions and agenda" },
                  { type: "IMAGE_GALLERY", icon: ImageIcon, label: "Gallery", hint: "Emphasises an image with caption" },
                  { type: "REGISTRATION", icon: Ticket, label: "Register CTA", hint: "Call-to-action block driving registrations" },
                  { type: "CUSTOM", icon: Sparkles, label: "Custom", hint: "Freeform block — anything goes" },
                ];
                const needsImage = ["HERO", "TEXT", "IMAGE_GALLERY", "CUSTOM"].includes(sectionForm.sectionType);
                const isAutoType = ["SCHEDULE"].includes(sectionForm.sectionType);
                return (
                  <div className="max-w-5xl w-full mx-auto grid grid-cols-1 md:grid-cols-[1.6fr_1fr] gap-8">
                    {/* Left: Create/Edit Form */}
                    <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7 shadow-sm space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-sm text-[#1a1a1a]">
                          {editingSection ? "Edit Section" : "Add Page Section"}
                        </h3>
                        {editingSection && (
                          <button type="button" onClick={() => { setEditingSection(null); setSectionForm({ title: "", content: "", imageUrl: "", displayOrder: getNextSectionOrder(eventSections), sectionType: "CUSTOM", status: "ACTIVE" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel</button>
                        )}
                      </div>

                      {/* Section type picker */}
                      <div>
                        <label className={label}>Section Type</label>
                        <div className="grid grid-cols-6 gap-2">
                          {SECTION_TYPES.map(st => {
                            const IconComponent = st.icon;
                            return (
                              <button
                                key={st.type}
                                type="button"
                                title={st.hint}
                                onClick={() => setSectionForm(f => ({ ...f, sectionType: st.type }))}
                                className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border text-center transition-all cursor-pointer ${sectionForm.sectionType === st.type ? "border-[#FF4747] bg-[#fff5f5] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb] hover:border-[#FF4747]/40"}`}
                              >
                                <IconComponent size={16} className={sectionForm.sectionType === st.type ? "text-[#FF4747]" : "text-[#888]"} />
                                <span className={`text-[9px] font-semibold leading-tight ${sectionForm.sectionType === st.type ? "text-[#FF4747]" : "text-[#888]"}`}>{st.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        {(() => { const t = SECTION_TYPES.find(s => s.type === sectionForm.sectionType); return t ? <p className="text-[10px] text-[#888] mt-1.5">{t.hint}</p> : null; })()}
                      </div>

                      <form onSubmit={saveSection} className="space-y-4">
                        <div>
                          <label className={label}>Section Title *</label>
                          <input required placeholder="e.g. About This Event, Agenda, Highlights" value={sectionForm.title} onChange={e => setSectionForm(f => ({ ...f, title: e.target.value }))} className={inp} />
                        </div>

                        <div>
                          <label className={label}>Description{isAutoType ? " (intro text shown above the auto-pulled content)" : " *"}</label>
                          <textarea
                            required={!isAutoType}
                            placeholder={
                              isAutoType
                                ? "Optional intro text displayed above the list…"
                                : "Write the details for this section…"
                            }
                            value={sectionForm.content}
                            onChange={e => setSectionForm(f => ({ ...f, content: e.target.value }))}
                            rows={5}
                            className={inp + " resize-none"}
                          />
                        </div>

                        {needsImage && (
                          <div>
                            <label className={label}>Image (Optional)</label>
                            <label className="flex items-center gap-4 border-2 border-dashed border-[#e5e7eb] rounded-2xl p-4 cursor-pointer hover:border-[#FF4747] transition-colors group mb-2">
                              {sectionForm.imageUrl ? (
                                <img src={sectionForm.imageUrl} alt="Preview" className="w-14 h-14 rounded-lg object-cover border border-[#f0f0f0] shrink-0" />
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-[#fafafa] flex items-center justify-center shrink-0 border border-[#e5e7eb]">
                                  <ImageIcon size={22} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                                </div>
                              )}
                              <div>
                                <div className="text-sm font-semibold text-[#1a1a1a]">{sectionForm.imageUrl ? "Click to replace" : "Upload image"}</div>
                                <div className="text-xs text-[#aaa]">PNG or JPG</div>
                              </div>
                              <input type="file" accept="image/*" className="hidden" onChange={async e => {
                                const f = e.target.files?.[0];
                                if (!f) return;
                                try {
                                  setSaving(true);
                                  const res = await eventService.uploadImage(f);
                                  setSectionForm(f => ({ ...f, imageUrl: res.url }));
                                  showToast("Image uploaded!");
                                } catch (err: any) {
                                  showToast("Upload failed: " + (err.message || err));
                                } finally { setSaving(false); }
                              }} />
                            </label>
                            <input placeholder="Or paste an image URL…" value={sectionForm.imageUrl} onChange={e => setSectionForm(f => ({ ...f, imageUrl: e.target.value }))} className={inp} />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={label}>Display Order</label>
                            <input type="number" placeholder="0" value={sectionForm.displayOrder} onChange={e => setSectionForm(f => ({ ...f, displayOrder: parseInt(e.target.value) || 0 }))} className={inp} />
                            <p className="text-[10px] text-[#aaa] mt-1">Lower = appears first.</p>
                          </div>
                          <div>
                            <label className={label}>Status</label>
                            <div className="flex items-center gap-3 mt-2">
                              <button type="button" onClick={() => setSectionForm(f => ({ ...f, status: f.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }))}
                                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer shrink-0 ${sectionForm.status === "ACTIVE" ? "bg-green-500" : "bg-[#e5e7eb]"}`}>
                                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${sectionForm.status === "ACTIVE" ? "translate-x-5" : "translate-x-0"}`} />
                              </button>
                              <span className="text-xs font-semibold text-[#555]">{sectionForm.status === "ACTIVE" ? "Visible" : "Hidden"}</span>
                            </div>
                          </div>
                        </div>

                        <button type="submit" disabled={saving} className={saveBtn}>
                          <Save size={13} />{saving ? "Saving..." : editingSection ? "Save Changes" : "Add Section"}
                        </button>
                      </form>
                    </div>

                    {/* Right: Existing Sections List */}
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-bold text-sm text-[#1a1a1a]">Page Sections</h3>
                        <p className="text-xs text-[#888] mt-0.5">Drag or reorder by changing the order number. Attendees see these on the event page.</p>
                      </div>

                      {eventSections.length === 0 ? (
                        <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-10 text-center">
                          <Layers size={28} className="mx-auto text-[#ccc] mb-2" />
                          <p className="font-bold text-xs text-[#1a1a1a]">No sections yet</p>
                          <p className="text-[10px] text-[#aaa] mt-0.5">Build your event page by adding sections on the left.</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {[...eventSections]
                            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                            .map((sec) => {
                              const typeInfo = SECTION_TYPES.find(t => t.type === (sec.sectionType || "CUSTOM")) || SECTION_TYPES[SECTION_TYPES.length - 1];
                              const isEditing = editingSection?.sectionId === sec.sectionId || editingSection?.id === sec.id;
                              return (
                                <div key={sec.sectionId || sec.id} className={`bg-white border rounded-2xl p-4 flex items-start gap-3 transition-colors ${isEditing ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : sec.status === "INACTIVE" ? "border-[#e5e7eb] opacity-50" : "border-[#e5e7eb]"}`}>
                                  <div className="w-9 h-9 rounded-xl bg-[#fafafa] border border-[#f0f0f0] flex items-center justify-center shrink-0">
                                    {(() => {
                                      const IconComponent = typeInfo.icon;
                                      return <IconComponent size={16} className="text-[#888]" />;
                                    })()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-bold text-xs text-[#1a1a1a] truncate">{sec.title}</span>
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#f0f0f0] text-[#888]">#{sec.displayOrder ?? 0}</span>
                                      {sec.status === "INACTIVE" && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Hidden</span>}
                                    </div>
                                    <p className="text-[10px] text-[#FF4747] font-semibold mt-0.5">{typeInfo.label}</p>
                                    {sec.content && <p className="text-[10px] text-[#aaa] mt-0.5 line-clamp-1">{sec.content}</p>}
                                  </div>
                                  <div className="flex flex-col gap-1 shrink-0">
                                    <button type="button" onClick={() => {
                                      setEditingSection(sec);
                                      setSectionForm({ title: sec.title || "", content: sec.content || "", imageUrl: sec.imageUrl || "", displayOrder: sec.displayOrder || 0, sectionType: sec.sectionType || "CUSTOM", status: sec.status || "ACTIVE" });
                                    }} className="flex items-center justify-center p-1.5 text-xs text-[#555] border border-[#e5e7eb] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer" title="Edit">
                                      <Pencil size={11} />
                                    </button>
                                    <button type="button" onClick={() => deleteSection(sec.sectionId || sec.id)} className="flex items-center justify-center p-1.5 text-xs text-red-500 border border-red-100 rounded-lg hover:bg-red-50 transition-colors cursor-pointer" title="Delete">
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

            </div>
          </>
        )}

        {/* Empty state */}
        {!selectedId && !showNew && (
          <>
            <header className="bg-white border-b border-[#e5e7eb] px-8 py-4 flex items-center justify-between sticky top-0 z-30">
              <h1 className="font-display font-black text-[#1a1a1a] text-lg">Events</h1>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowEventsPanel(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1a1a] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-colors cursor-pointer">
                  <List size={12} /> View Events
                  {events.length > 0 && <span className="bg-white/20 text-[9px] font-black px-1.5 py-0.5 rounded-full">{events.length}</span>}
                </button>
                <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer">
                  <Plus size={12} /> New Event
                </button>
              </div>
            </header>
            <div className="flex-1 flex items-center justify-center text-center p-12">
              <div>
                <div className="w-16 h-16 bg-[#FF4747]/10 rounded-2xl flex items-center justify-center mx-auto mb-4"><Calendar size={28} className="text-[#FF4747]" /></div>
                <h3 className="font-display font-black text-xl text-[#1a1a1a] mb-2">Select or create an event</h3>
                <p className="text-sm text-[#888] mb-6">Click <strong>View Events</strong> to pick one, or <strong>New Event</strong> to create.</p>
              </div>
            </div>
          </>
        )}
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
    } catch { } finally { setSaving(false); }
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
