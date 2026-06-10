"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredAuth, setStoredAuth, clearStoredAuth, ApiError } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { authService } from "@/app/utils/services/authService";
import { paymentService } from "@/app/utils/services/paymentService";
import {
  LogOut, Ticket, Calendar, Settings, Home, CheckCircle2, AlertCircle, X,
  Bookmark, LayoutDashboard, User, ChevronRight, RefreshCw, Trash2, QrCode,
  MapPin, Clock, Star, ArrowRight, Zap
} from "lucide-react";
import { useRouter } from "next/navigation";

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";

type Tab = "overview" | "tickets" | "saved" | "settings";

export default function AttendeeDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("Attendee");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState<"plan" | "payment" | "workspace">("plan");
  const [selectedPlan, setSelectedPlan] = useState<"FREE" | "BASIC" | "PREMIUM">("FREE");
  const [upgradeForm, setUpgradeForm] = useState({ workspaceName: "", type: "INDIVIDUAL" });
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState<"stripe" | "mtn_mobile_money" | "orange_money">("stripe");
  const [upgradePhone, setUpgradePhone] = useState("");
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "", phone: "", email: "", avatar: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [savedEventsLoading, setSavedEventsLoading] = useState(true);
  const [refundLoadingId, setRefundLoadingId] = useState<string | null>(null);
  const [refundConfirmTicket, setRefundConfirmTicket] = useState<any | null>(null);
  const [refundStatus, setRefundStatus] = useState<{ type: "success" | "error"; title: string; message: string } | null>(null);
  const [deleteConfirmTicket, setDeleteConfirmTicket] = useState<any | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [syncLoadingId, setSyncLoadingId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);

  // ── handlers (unchanged logic) ──────────────────────────────

  const handleRefund = (ticket: any) => setRefundConfirmTicket(ticket);

  const confirmRefundProcess = async (ticket: any) => {
    setRefundConfirmTicket(null);
    if (ticket.isPastEvent) {
      setRefundStatus({ type: "error", title: "Refund Not Available", message: "This event has already ended. Refunds are not available after the event date." });
      return;
    }
    const ticketOrderId = ticket.orderId || ticket.id;
    setRefundLoadingId(ticketOrderId);
    try {
      const payments = await paymentService.getPaymentsByOrderId(ticketOrderId);
      const payment = (payments || [])[0];
      if (!payment) throw new Error("No payment record found for this order.");
      await paymentService.createRefund({ paymentId: payment.paymentId, amount: payment.amount, reason: "Requested by attendee via dashboard", status: "SUCCESSFUL" });
      await eventService.updateOrder(ticketOrderId, { ...ticket, status: "REFUNDED" });
      const auth = getStoredAuth();
      if (auth) await fetchTickets(auth.userId);
      setRefundStatus({ type: "success", title: "Refund Successful", message: "Your refund has been processed. Funds will be credited to your original payment method shortly." });
    } catch (err: any) {
      setRefundStatus({ type: "error", title: "Refund Failed", message: err.message || "An unknown error occurred." });
    } finally {
      setRefundLoadingId(null);
    }
  };

  const confirmDeleteProcess = async (ticket: any) => {
    setDeleteConfirmTicket(null);
    const ticketOrderId = ticket.orderId || ticket.id;
    setDeleteLoadingId(ticketOrderId);
    try {
      await eventService.deleteOrder(ticketOrderId);
      const auth = getStoredAuth();
      if (auth) await fetchTickets(auth.userId);
      setRefundStatus({ type: "success", title: "Ticket Deleted", message: "The ticket record has been permanently removed." });
    } catch (err: any) {
      setRefundStatus({ type: "error", title: "Delete Failed", message: err.message || "An unknown error occurred." });
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleSyncPaymentStatus = async (ticket: any) => {
    const ticketOrderId = ticket.orderId || ticket.id;
    setSyncLoadingId(ticketOrderId);
    try {
      const payments = await paymentService.getPaymentsByOrderId(ticketOrderId);
      const payment = (payments || [])[0];
      if (!payment) throw new Error("No payment record found.");
      const updatedPayment = await paymentService.getPaymentById(payment.paymentId);
      const auth = getStoredAuth();
      if (auth) await fetchTickets(auth.userId);
      setRefundStatus({ type: "success", title: "Status Synced", message: `Payment status: ${updatedPayment.status}` });
    } catch (err: any) {
      setRefundStatus({ type: "error", title: "Sync Failed", message: err.message || "An unknown error occurred." });
    } finally {
      setSyncLoadingId(null);
    }
  };

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) { router.push("/login?from=/user/dashboard"); return; }
    setUserName(auth.email?.split("@")[0] || "Attendee");
    if (auth.tenantId && auth.tenantId !== "") setIsOrganizer(true);
    fetchProfile(auth.userId);
    fetchTickets(auth.userId);
    fetchSavedEvents(auth.userId);
    import("@/app/utils/api").then(({ api }) =>
      api.get<any[]>("/api/v1/subscriptionplans", { skipAuth: true }).then(d => setAvailablePlans(d || [])).catch(() => {})
    );
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upgrade") === "1") {
        const planParam = (params.get("plan") || "FREE").toUpperCase();
        const validPlan = (["FREE", "BASIC", "PREMIUM"] as const).includes(planParam as any) ? (planParam as "FREE" | "BASIC" | "PREMIUM") : "FREE";
        setSelectedPlan(validPlan);
        setUpgradeStep("plan");
        setUpgradeForm({ workspaceName: "", type: "INDIVIDUAL" });
        setUpgradeError("");
        setShowUpgradeModal(true);
        window.history.replaceState({}, "", "/user/dashboard");
      }
    }
  }, [router]);

  useEffect(() => {
    if (myTickets.length === 0) return;
    const buildRecommendations = async () => {
      try {
        const allEvents = await eventService.getEvents({ skipAuth: true });
        const publishedEvents = (allEvents || []).filter((e: any) => e.status !== "DRAFT");
        const attendedEventIds = new Set(myTickets.map((t: any) => t.eventId));
        const categoryScores: Record<string, number> = {};
        for (const ticket of myTickets) {
          const ev = publishedEvents.find((e: any) => e.eventId === ticket.eventId);
          if (ev?.categoryId) categoryScores[ev.categoryId] = (categoryScores[ev.categoryId] || 0) + 1;
        }
        const scored = publishedEvents
          .filter((e: any) => !attendedEventIds.has(e.eventId))
          .map((e: any) => ({ ...e, score: categoryScores[e.categoryId] || 0 }))
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 4);
        setRecommendations(scored);
      } catch {}
    };
    buildRecommendations();
  }, [myTickets]);

  const fetchTickets = async (_userId: string) => {
    setTicketsLoading(true);
    try {
      const orders = await eventService.getMyOrders();
      const enrichedOrders = await Promise.all((orders || []).map(async (order) => {
        let eventData = { title: "Unknown Event", date: "Unknown Date", isPast: false };
        let tenantData = { name: "Unknown Organizer" };
        const orderId = order.orderId || order.id;
        try {
          if (order.eventId) {
            const ev: any = await eventService.getEventById(order.eventId, { skipAuth: true });
            const startDate = ev.startDate || ev.startDatetime;
            const endDate = ev.endDate || ev.endDatetime;
            eventData = { title: ev.title, date: startDate ? new Date(startDate).toLocaleDateString() : "Unknown Date", isPast: endDate ? new Date(endDate) < new Date() : false };
            if (ev.tenantSlug) {
              try { const tn: any = await authService.getTenantBySlug(ev.tenantSlug); tenantData = { name: tn.name }; } catch {}
            }
          }
        } catch {}
        let paymentStatus = "NO_PAYMENT";
        try {
          const payments = await paymentService.getPaymentsByOrderId(orderId);
          if (payments?.[0]) paymentStatus = payments[0].status;
        } catch {}
        return { ...order, eventTitle: eventData.title, eventDate: eventData.date, isPastEvent: eventData.isPast, organizerName: tenantData.name, paymentStatus };
      }));
      setMyTickets(enrichedOrders);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setMyTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchSavedEvents = async (userId: string) => {
    setSavedEventsLoading(true);
    try {
      const saved = await eventService.getSavedEventsByUser(userId);
      const enriched = await Promise.all((saved || []).map(async (item) => {
        let eventData = { title: "Unknown Event", date: "Unknown Date", imageUrl: "" };
        let tenantData = { name: "Unknown Organizer" };
        try {
          if (item.eventId) {
            const ev: any = await eventService.getEventById(item.eventId, { skipAuth: true });
            eventData = { title: ev.title, date: new Date(ev.startDate).toLocaleDateString(), imageUrl: ev.imageUrl };
            if (ev?.tenantSlug) { try { const tn: any = await authService.getTenantBySlug(ev.tenantSlug); tenantData = { name: tn.name }; } catch {} }
          }
        } catch {}
        return { ...item, eventTitle: eventData.title, eventDate: eventData.date, imageUrl: eventData.imageUrl, organizerName: tenantData.name };
      }));
      setSavedEvents(enriched);
    } catch {}
    finally { setSavedEventsLoading(false); }
  };

  const handleUnsave = async (savedEventId: string) => {
    try { await eventService.unsaveEvent(savedEventId); setSavedEvents(prev => prev.filter(e => e.id !== savedEventId)); } catch {}
  };

  const fetchProfile = async (userId: string) => {
    try {
      const res: any = await authService.getUserById(userId);
      setProfileForm({ firstName: res.firstName || "", lastName: res.lastName || "", phone: res.phone || "", email: res.email || "", avatar: res.avatar || "" });
      if (res.firstName) setUserName(res.firstName);
    } catch {}
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ type: "", text: "" });
    try {
      const auth = getStoredAuth();
      if (!auth) throw new Error("Not logged in");
      const payload: any = { ...profileForm };
      delete payload.email;
      await authService.updateUser(auth.userId, payload);
      setProfileMsg({ type: "success", text: "Profile updated successfully!" });
      setUserName(profileForm.firstName);
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const auth = getStoredAuth();
      if (!auth) return;
      const res: any = await authService.uploadUserAvatar(auth.userId, file);
      const newAvatar = res.avatarUrl || res.url || res.avatar || (typeof res === "string" ? res : "");
      setProfileForm(prev => ({ ...prev, avatar: newAvatar }));
      setProfileMsg({ type: "success", text: "Avatar uploaded!" });
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || "Failed to upload avatar" });
    }
  };

  const handleLogout = () => { clearStoredAuth(); router.push("/login"); };

  const PLAN_PRICES: Record<string, number> = { FREE: 0, BASIC: 29, PREMIUM: 99 };
  const PLAN_FEATURES: Record<string, string[]> = {
    FREE:    ["3 events", "100 attendees/event", "General listing only"],
    BASIC:   ["20 events", "1,000 attendees/event", "Up to 5 team members", "Paid events"],
    PREMIUM: ["Unlimited events", "Unlimited attendees", "Unlimited team members", "Custom domain", "Advanced branding"],
  };

  const openUpgradeModal = () => {
    if (!getStoredAuth()) { router.push("/login?from=/user/dashboard"); return; }
    setUpgradeStep("plan"); setSelectedPlan("FREE");
    setUpgradeForm({ workspaceName: "", type: "INDIVIDUAL" });
    setUpgradePaymentMethod("stripe"); setUpgradePhone(""); setUpgradeError("");
    setShowUpgradeModal(true);
  };

  const handleUpgradeSubmit = async () => {
    setUpgradeError("");
    if (!upgradeForm.workspaceName.trim()) { setUpgradeError("Workspace name is required"); return; }
    const auth = getStoredAuth();
    if (!auth) { router.push("/login?from=/user/dashboard"); return; }
    setUpgradeLoading(true);
    try {
      const data = await authService.upgradeToOrganizer({ workspaceName: upgradeForm.workspaceName, type: upgradeForm.type, planName: selectedPlan });
      const tenantId = data.tenantId ? String(data.tenantId) : "";
      if (PLAN_PRICES[selectedPlan] > 0 && tenantId) {
        const matchedPlan = availablePlans.find(p => p.name?.toUpperCase() === selectedPlan || p.name?.toUpperCase().includes(selectedPlan));
        if (matchedPlan?.planId) {
          await paymentService.createSubscription({ tenantId, planId: matchedPlan.planId, amount: matchedPlan.price ?? PLAN_PRICES[selectedPlan], currency: "XAF", provider: upgradePaymentMethod });
        }
      }
      setStoredAuth({ token: data.token || auth.token, type: data.type || "Bearer", userId: String(data.userId || auth.userId), tenantId, email: data.email || auth.email || "", planTier: data.planTier || selectedPlan });
      setShowUpgradeModal(false);
      router.push("/admin");
    } catch (err: any) {
      setUpgradeError(err.message || "An error occurred");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleWorkspaceContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgradeError("");
    if (!upgradeForm.workspaceName.trim()) { setUpgradeError("Workspace name is required"); return; }
    if (!getStoredAuth()) { router.push("/login?from=/user/dashboard"); return; }
    if (PLAN_PRICES[selectedPlan] > 0) setUpgradeStep("payment");
    else await handleUpgradeSubmit();
  };

  const handleUpgradePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (upgradePaymentMethod !== "stripe" && upgradePhone.replace(/\D/g, "").length < 9) { setUpgradeError("Please enter a valid 9-digit phone number."); return; }
    setUpgradeError("");
    await handleUpgradeSubmit();
  };

  // ── helpers ────────────────────────────────────────────────

  const getTicketBadge = (ticket: any) => {
    const isRefunded = ticket.status === "REFUNDED" || ticket.paymentStatus === "REFUNDED";
    const isUsed = ticket.status === "USED" || ticket.isPastEvent;
    const isPending = ticket.paymentStatus === "PENDING" || (!isRefunded && !isUsed && ticket.status === "PENDING");
    const isPaid = !isPending && (ticket.paymentStatus === "SUCCESSFUL" || ticket.status === "COMPLETED" || ticket.status === "PAID");
    if (isRefunded) return { label: "Refunded", cls: "bg-red-100 text-red-600" };
    if (isUsed)     return { label: "Used",     cls: "bg-[#f5f5f5] text-[#888]" };
    if (isPending)  return { label: "Pending",  cls: "bg-amber-100 text-amber-700" };
    if (isPaid)     return { label: "Paid",     cls: "bg-green-100 text-green-700" };
    return { label: ticket.status || "Active", cls: "bg-[#f5f5f5] text-[#888]" };
  };

  const upcoming = myTickets.filter(t => !t.isPastEvent && t.status !== "REFUNDED" && t.paymentStatus !== "REFUNDED").slice(0, 3);

  const NAV: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: "overview", label: "Overview",     icon: LayoutDashboard },
    { id: "tickets",  label: "My Tickets",   icon: Ticket,   count: myTickets.length },
    { id: "saved",    label: "Saved Events", icon: Bookmark, count: savedEvents.length },
    { id: "settings", label: "Profile",      icon: User },
  ];

  // ── render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#f9fafb] flex text-[#1a1a1a]">

      {/* SIDEBAR */}
      <aside className="w-[260px] shrink-0 bg-white border-r border-[#e5e7eb] flex flex-col sticky top-0 h-screen">

        {/* Logo */}
        <div className="px-6 py-5 border-b border-[#f0f0f0]">
          <Link href="/" className="font-display text-xl font-black tracking-tight">
            Yow<span className="text-[#FF4747]">Event</span>
          </Link>
        </div>

        {/* User identity */}
        <div className="px-6 py-5 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            {profileForm.avatar ? (
              <img src={profileForm.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover border border-[#e5e7eb]" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-[#F7E998] flex items-center justify-center font-black text-base text-[#1a1a1a]">
                {(profileForm.firstName || userName).charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-bold text-sm text-[#1a1a1a] truncate">
                {profileForm.firstName ? `${profileForm.firstName} ${profileForm.lastName}`.trim() : userName}
              </div>
              <div className="text-[11px] text-[#888] truncate">{profileForm.email}</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                activeTab === id
                  ? "bg-[#FF4747]/10 text-[#FF4747] font-semibold"
                  : "text-[#555] hover:bg-[#f5f5f5] hover:text-[#1a1a1a]"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              <span className="flex-1 text-left">{label}</span>
              {count !== undefined && count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === id ? "bg-[#FF4747] text-white" : "bg-[#f0f0f0] text-[#888]"}`}>
                  {count}
                </span>
              )}
            </button>
          ))}

          <div className="pt-3 border-t border-[#f0f0f0] mt-3 space-y-0.5">
            {isOrganizer && (
              <Link href="/admin" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#555] hover:bg-[#f5f5f5] hover:text-[#1a1a1a] transition-all">
                <Zap size={16} className="text-[#FF4747]" />
                Organizer Dashboard
              </Link>
            )}
            <Link href="/" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#555] hover:bg-[#f5f5f5] transition-all">
              <Home size={16} />
              Back to Home
            </Link>
          </div>
        </nav>

        {/* Upgrade CTA */}
        {!isOrganizer && (
          <div className="px-4 py-4 border-t border-[#f0f0f0]">
            <button onClick={openUpgradeModal} className="w-full bg-[#1a1a1a] hover:bg-[#333] text-white text-xs font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2">
              <Zap size={13} /> Become an Organizer
            </button>
          </div>
        )}

        {/* Logout */}
        <div className="px-4 pb-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#888] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer">
            <LogOut size={15} /> Log out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0 p-8">

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="max-w-4xl">
            {/* Header */}
            <div className="mb-8">
              <p className="text-xs text-[#aaa] font-semibold uppercase tracking-widest mb-1">Dashboard</p>
              <h1 className="font-display text-3xl font-black text-[#1a1a1a]">
                Welcome back, <span className="text-[#FF4747]">{profileForm.firstName || userName}</span>
              </h1>
              <p className="text-[#888] text-sm mt-1">Here's what's happening with your events.</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Tickets Owned",  value: myTickets.filter(t => t.status !== "REFUNDED").length, color: "#FF4747",  bg: "#FF4747" },
                { label: "Upcoming Events", value: upcoming.length, color: "#10b981", bg: "#10b981" },
                { label: "Saved Events",   value: savedEvents.length, color: "#6366f1", bg: "#6366f1" },
              ].map(s => (
                <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.bg}15` }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: s.bg }} />
                  </div>
                  <div>
                    <div className="font-black text-2xl text-[#1a1a1a]">{s.value}</div>
                    <div className="text-xs text-[#888]">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Upcoming events */}
            {upcoming.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-lg text-[#1a1a1a]">Upcoming Events</h2>
                  <button onClick={() => setActiveTab("tickets")} className="text-xs text-[#FF4747] font-semibold hover:underline cursor-pointer flex items-center gap-1">
                    View all <ChevronRight size={12} />
                  </button>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {upcoming.map(t => (
                    <div key={t.orderId} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 hover:border-[#FF4747]/30 hover:shadow-sm transition-all">
                      <div className="w-8 h-8 rounded-lg bg-[#FF4747]/10 flex items-center justify-center mb-3">
                        <Calendar size={15} className="text-[#FF4747]" />
                      </div>
                      <p className="font-bold text-sm text-[#1a1a1a] mb-1 line-clamp-2">{t.eventTitle}</p>
                      <p className="text-xs text-[#888] flex items-center gap-1 mb-3">
                        <Clock size={10} /> {t.eventDate}
                      </p>
                      <button onClick={() => setActiveTab("tickets")} className="text-xs font-semibold text-[#FF4747] hover:underline cursor-pointer flex items-center gap-1">
                        View Ticket <ArrowRight size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={15} className="text-[#F7E998] fill-[#F7E998]" />
                  <h2 className="font-display font-bold text-lg text-[#1a1a1a]">Recommended for You</h2>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {recommendations.map((ev: any) => (
                    <Link key={ev.eventId} href={`/events/${ev.eventId}`} className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden hover:border-[#FF4747]/30 hover:shadow-md transition-all group block">
                      <div className="h-24 bg-gradient-to-br from-[#F7E998]/40 to-[#FF4747]/10 flex items-center justify-center">
                        <Calendar size={28} className="text-[#FF4747]/40 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="p-4">
                        <p className="font-bold text-xs text-[#1a1a1a] line-clamp-2 group-hover:text-[#FF4747] transition-colors">{ev.title}</p>
                        <p className="text-[10px] text-[#aaa] mt-1 uppercase tracking-wider">{ev.status}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Quick links */}
            <div className="grid md:grid-cols-2 gap-4">
              <button onClick={() => setActiveTab("tickets")} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-4 hover:border-[#FF4747]/30 hover:shadow-sm transition-all cursor-pointer text-left group">
                <div className="w-10 h-10 rounded-xl bg-[#FF4747]/10 flex items-center justify-center shrink-0 group-hover:bg-[#FF4747]/20 transition-colors">
                  <Ticket size={18} className="text-[#FF4747]" />
                </div>
                <div>
                  <div className="font-bold text-sm text-[#1a1a1a]">My Tickets</div>
                  <div className="text-xs text-[#888]">{myTickets.length} ticket{myTickets.length !== 1 ? "s" : ""} • view QR codes, request refunds</div>
                </div>
                <ChevronRight size={16} className="text-[#ccc] ml-auto shrink-0" />
              </button>
              <button onClick={() => setActiveTab("saved")} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-4 hover:border-[#FF4747]/30 hover:shadow-sm transition-all cursor-pointer text-left group">
                <div className="w-10 h-10 rounded-xl bg-[#6366f1]/10 flex items-center justify-center shrink-0 group-hover:bg-[#6366f1]/20 transition-colors">
                  <Bookmark size={18} className="text-[#6366f1]" />
                </div>
                <div>
                  <div className="font-bold text-sm text-[#1a1a1a]">Saved Events</div>
                  <div className="text-xs text-[#888]">{savedEvents.length} event{savedEvents.length !== 1 ? "s" : ""} bookmarked</div>
                </div>
                <ChevronRight size={16} className="text-[#ccc] ml-auto shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* ── MY TICKETS ── */}
        {activeTab === "tickets" && (
          <div className="max-w-4xl">
            <div className="mb-6">
              <p className="text-xs text-[#aaa] font-semibold uppercase tracking-widest mb-1">Tickets</p>
              <h1 className="font-display text-2xl font-black text-[#1a1a1a]">My Tickets</h1>
            </div>

            {ticketsLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-[#aaa]">
                <div className="w-8 h-8 border-4 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin mb-4" />
                <p className="text-sm">Loading your tickets...</p>
              </div>
            ) : myTickets.length === 0 ? (
              <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-16 text-center">
                <Ticket size={40} className="mx-auto text-[#F7E998] mb-4" />
                <p className="font-bold text-[#1a1a1a] mb-2">No tickets yet</p>
                <p className="text-sm text-[#888] max-w-xs mx-auto mb-6">Explore events and book your spot to see your tickets here.</p>
                <Link href="/events" className="inline-flex items-center gap-2 bg-[#FF4747] text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-[#e03e3e] transition-colors">
                  Explore Events <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {myTickets.map((ticket, i) => {
                  const badge = getTicketBadge(ticket);
                  const isRefunded = ticket.status === "REFUNDED" || ticket.paymentStatus === "REFUNDED";
                  const isUsed = ticket.status === "USED" || ticket.isPastEvent;
                  const isPending = ticket.paymentStatus === "PENDING" || (!isRefunded && !isUsed && ticket.status === "PENDING");
                  const isPaid = !isPending && (ticket.paymentStatus === "SUCCESSFUL" || ticket.status === "COMPLETED" || ticket.status === "PAID");
                  const showQR = isPaid || ticket.status === "COMPLETED" || ticket.status === "PAID";

                  return (
                    <div key={i} className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden hover:border-[#FF4747]/20 hover:shadow-sm transition-all">
                      <div className="flex">
                        {/* Ticket body */}
                        <div className="flex-1 p-5">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <h3 className="font-bold text-[#1a1a1a]">{ticket.eventTitle}</h3>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${badge.cls}`}>{badge.label}</span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-xs text-[#888]">
                            <span className="flex items-center gap-1"><Clock size={10} /> {ticket.eventDate}</span>
                            <span className="flex items-center gap-1"><MapPin size={10} /> {ticket.organizerName}</span>
                            <span className="font-mono text-[#aaa]">#{ticket.orderId?.substring(0, 8)}</span>
                          </div>

                          {ticket.paymentStatus === "PENDING" && (
                            <div className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 leading-relaxed">
                              <strong>Payment Pending:</strong> Awaiting confirmation from payment provider. If you've completed checkout, it may take a moment.
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 mt-4 flex-wrap">
                            {isPaid && !isUsed && !isRefunded && (
                              <button onClick={() => handleRefund(ticket)} disabled={refundLoadingId === (ticket.orderId || ticket.id)}
                                className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1">
                                <RefreshCw size={10} /> {refundLoadingId === (ticket.orderId || ticket.id) ? "Refunding..." : "Request Refund"}
                              </button>
                            )}
                            {isPending && (
                              <button onClick={() => handleSyncPaymentStatus(ticket)} disabled={syncLoadingId === (ticket.orderId || ticket.id)}
                                className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1">
                                <RefreshCw size={10} /> {syncLoadingId === (ticket.orderId || ticket.id) ? "Syncing..." : "Sync Status"}
                              </button>
                            )}
                            {(isRefunded || isUsed || isPending) && (
                              <button onClick={() => setDeleteConfirmTicket(ticket)}
                                className="text-xs font-semibold text-[#888] bg-[#f5f5f5] hover:bg-red-50 hover:text-red-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1">
                                <Trash2 size={10} /> Delete
                              </button>
                            )}
                          </div>
                        </div>

                        {/* QR panel */}
                        {showQR && (
                          <div className="border-l border-dashed border-[#e5e7eb] flex flex-col items-center justify-center px-5 py-4 shrink-0 bg-[#fafafa]">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`YOEVENT:ORDER:${ticket.orderId}`)}&bgcolor=ffffff&color=1a1a1a&margin=4`}
                              alt="Ticket QR"
                              className="w-20 h-20 rounded-lg"
                            />
                            <p className="text-[9px] text-[#aaa] mt-2 font-mono uppercase tracking-wider flex items-center gap-1">
                              <QrCode size={9} /> Scan at entry
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── SAVED EVENTS ── */}
        {activeTab === "saved" && (
          <div className="max-w-4xl">
            <div className="mb-6">
              <p className="text-xs text-[#aaa] font-semibold uppercase tracking-widest mb-1">Bookmarks</p>
              <h1 className="font-display text-2xl font-black text-[#1a1a1a]">Saved Events</h1>
            </div>

            {savedEventsLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-[#aaa]">
                <div className="w-8 h-8 border-4 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin mb-4" />
                <p className="text-sm">Loading saved events...</p>
              </div>
            ) : savedEvents.length === 0 ? (
              <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-16 text-center">
                <Bookmark size={40} className="mx-auto text-[#F7E998] mb-4" />
                <p className="font-bold text-[#1a1a1a] mb-2">Nothing saved yet</p>
                <p className="text-sm text-[#888] max-w-xs mx-auto mb-6">Bookmark events you're interested in so you can easily find them later.</p>
                <Link href="/events" className="inline-flex items-center gap-2 bg-[#FF4747] text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-[#e03e3e] transition-colors">
                  Browse Events <ArrowRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {savedEvents.map((ev, i) => (
                  <div key={i} className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden hover:border-[#FF4747]/30 hover:shadow-md transition-all group">
                    <Link href={`/events/${ev.eventId}`} className="block">
                      {ev.imageUrl ? (
                        <img src={ev.imageUrl} alt={ev.eventTitle} className="w-full h-32 object-cover group-hover:opacity-90 transition-opacity" />
                      ) : (
                        <div className="w-full h-32 bg-gradient-to-br from-[#F7E998]/30 to-[#FF4747]/10 flex items-center justify-center">
                          <Calendar size={32} className="text-[#FF4747]/30" />
                        </div>
                      )}
                    </Link>
                    <div className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link href={`/events/${ev.eventId}`}>
                          <p className="font-bold text-sm text-[#1a1a1a] group-hover:text-[#FF4747] transition-colors line-clamp-1">{ev.eventTitle}</p>
                        </Link>
                        <p className="text-xs text-[#888] mt-0.5 flex items-center gap-1">
                          <Clock size={10} /> {ev.eventDate} · {ev.organizerName}
                        </p>
                      </div>
                      <button onClick={() => handleUnsave(ev.id)} title="Remove bookmark"
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-[#ccc] hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer">
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PROFILE / SETTINGS ── */}
        {activeTab === "settings" && (
          <div className="max-w-2xl">
            <div className="mb-6">
              <p className="text-xs text-[#aaa] font-semibold uppercase tracking-widest mb-1">Account</p>
              <h1 className="font-display text-2xl font-black text-[#1a1a1a]">Profile Settings</h1>
            </div>

            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-7">
              {profileMsg.text && (
                <div className={`p-3.5 rounded-xl mb-5 text-sm border ${profileMsg.type === "success" ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                  {profileMsg.text}
                </div>
              )}

              {/* Avatar */}
              <div className="flex items-center gap-5 mb-7 pb-7 border-b border-[#f0f0f0]">
                <label className="cursor-pointer group relative">
                  {profileForm.avatar ? (
                    <img src={profileForm.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-[#e5e7eb] group-hover:opacity-80 transition-opacity" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-[#F7E998] flex items-center justify-center font-black text-3xl text-[#1a1a1a] group-hover:opacity-80 transition-opacity">
                      {(profileForm.firstName || userName).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <User size={18} className="text-white" />
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
                <div>
                  <p className="font-bold text-[#1a1a1a] text-sm">{profileForm.firstName ? `${profileForm.firstName} ${profileForm.lastName}`.trim() : userName}</p>
                  <p className="text-xs text-[#888] mt-0.5">{profileForm.email}</p>
                  <p className="text-xs text-[#FF4747] mt-2 font-semibold">Click avatar to change photo</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={label}>First Name</label>
                    <input value={profileForm.firstName} onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))} className={inp} required />
                  </div>
                  <div>
                    <label className={label}>Last Name</label>
                    <input value={profileForm.lastName} onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))} className={inp} required />
                  </div>
                </div>
                <div>
                  <label className={label}>Email Address</label>
                  <input value={profileForm.email} disabled className="w-full bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#aaa] cursor-not-allowed" />
                  <p className="text-[10px] text-[#aaa] mt-1">Email cannot be changed.</p>
                </div>
                <div>
                  <label className={label}>Phone Number</label>
                  <input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="+237 6XXXXXXXX" className={inp} />
                </div>
                <button type="submit" disabled={profileLoading} className="mt-2 px-6 py-2.5 bg-[#FF4747] text-white rounded-xl text-sm font-bold hover:bg-[#e03e3e] transition-colors disabled:opacity-50 cursor-pointer">
                  {profileLoading ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>

      {/* ── UPGRADE MODAL ── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full shadow-2xl relative overflow-hidden" style={{ maxWidth: upgradeStep === "plan" ? "640px" : "440px" }}>
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-5 right-5 text-[#888] hover:text-[#1a1a1a] z-10 cursor-pointer"><X size={20} /></button>

            {upgradeStep === "plan" && (
              <div className="p-8">
                <h2 className="font-display text-2xl font-black mb-1">Choose your plan</h2>
                <p className="text-sm text-[#888] mb-6">Select the plan that fits your needs.</p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {(["FREE", "BASIC", "PREMIUM"] as const).map(plan => (
                    <button key={plan} type="button" onClick={() => setSelectedPlan(plan)}
                      className={`rounded-2xl p-4 border-2 text-left transition-all cursor-pointer ${selectedPlan === plan ? "border-[#FF4747] bg-[#FF4747]/5" : "border-[#e5e7eb] hover:border-[#FF4747]/40"}`}>
                      <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${selectedPlan === plan ? "text-[#FF4747]" : "text-[#aaa]"}`}>{plan}</div>
                      <div className="text-2xl font-black text-[#1a1a1a] mb-3">
                        {PLAN_PRICES[plan] === 0 ? "Free" : `${Number(PLAN_PRICES[plan]).toLocaleString()} FCFA`}
                        {PLAN_PRICES[plan] > 0 && <span className="text-xs font-normal text-[#aaa]">/mo</span>}
                      </div>
                      <ul className="space-y-1">{PLAN_FEATURES[plan].map(f => (
                        <li key={f} className="text-[10px] text-[#666] flex items-start gap-1"><CheckCircle2 size={9} className="text-green-500 shrink-0 mt-0.5" /> {f}</li>
                      ))}</ul>
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => setUpgradeStep("workspace")}
                  className="w-full py-3.5 bg-[#FF4747] text-white rounded-xl text-sm font-bold hover:bg-[#e03e3e] transition-all cursor-pointer">
                  Continue with {selectedPlan} →
                </button>
              </div>
            )}

            {upgradeStep === "workspace" && (
              <div className="p-8">
                <button type="button" onClick={() => setUpgradeStep("plan")} className="text-xs text-[#FF4747] font-semibold hover:underline mb-4 block cursor-pointer">← Back</button>
                <h2 className="font-display text-2xl font-black mb-1">Set up your workspace</h2>
                <p className="text-sm text-[#888] mb-6">Creating a <span className="font-bold text-[#1a1a1a]">{selectedPlan}</span> workspace.</p>
                {upgradeError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200 mb-4">⚠️ {upgradeError}</div>}
                <form onSubmit={handleWorkspaceContinue} className="space-y-4">
                  <div>
                    <label className={label}>Account Type</label>
                    <div className="flex bg-[#f5f5f5] rounded-xl p-1">
                      {(["INDIVIDUAL", "ORGANIZATION"] as const).map(t => (
                        <button key={t} type="button" onClick={() => setUpgradeForm(f => ({ ...f, type: t }))}
                          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${upgradeForm.type === t ? "bg-white text-[#1a1a1a] shadow-sm" : "text-[#888]"}`}>
                          {t.charAt(0) + t.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={label}>{upgradeForm.type === "INDIVIDUAL" ? "Display Name" : "Organization Name"}</label>
                    <input value={upgradeForm.workspaceName} onChange={e => setUpgradeForm(f => ({ ...f, workspaceName: e.target.value }))}
                      placeholder={upgradeForm.type === "INDIVIDUAL" ? "e.g. Jane Doe" : "e.g. Acme Events"} className={inp} required />
                  </div>
                  <button type="submit" disabled={upgradeLoading}
                    className="w-full py-3 bg-[#FF4747] text-white rounded-xl text-sm font-bold hover:bg-[#e03e3e] transition-all disabled:opacity-60 cursor-pointer">
                    {upgradeLoading ? "Creating..." : PLAN_PRICES[selectedPlan] > 0 ? "Continue to Payment →" : "Create Free Workspace"}
                  </button>
                </form>
              </div>
            )}

            {upgradeStep === "payment" && (
              <div className="p-8">
                <button type="button" onClick={() => setUpgradeStep("workspace")} className="text-xs text-[#FF4747] font-semibold hover:underline mb-4 block cursor-pointer">← Back</button>
                <h2 className="font-display text-2xl font-black mb-1">Payment</h2>
                <p className="text-sm text-[#888] mb-5">{selectedPlan} — {Number(PLAN_PRICES[selectedPlan]).toLocaleString()} FCFA/month</p>
                {upgradeError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200 mb-4">⚠️ {upgradeError}</div>}
                <div className="space-y-3 mb-5">
                  {[
                    { id: "stripe" as const, label: "Credit / Debit Card", sub: "Visa, Mastercard — via Stripe", tag: "S", color: "#635bff" },
                    { id: "mtn_mobile_money" as const, label: "MTN Mobile Money", sub: "USSD push — all MTN numbers", tag: "MTN", color: "#ffcc00", textDark: true },
                    { id: "orange_money" as const, label: "Orange Money", sub: "USSD push — all Orange numbers", tag: "OM", color: "#ff6600" },
                  ].map(m => (
                    <button key={m.id} type="button" onClick={() => setUpgradePaymentMethod(m.id)}
                      className={`w-full flex items-center gap-3 p-4 border-2 rounded-2xl text-left transition-colors cursor-pointer ${upgradePaymentMethod === m.id ? "border-current" : "border-[#e5e7eb] hover:border-[#e5e7eb]"}`}
                      style={upgradePaymentMethod === m.id ? { borderColor: m.color, background: `${m.color}11` } : {}}>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0" style={{ background: m.color, color: m.textDark ? "#1a1a1a" : "#fff" }}>{m.tag}</div>
                      <div className="flex-1">
                        <div className="font-bold text-sm text-[#1a1a1a]">{m.label}</div>
                        <div className="text-xs text-[#888]">{m.sub}</div>
                      </div>
                      {upgradePaymentMethod === m.id && <div className="w-4 h-4 rounded-full shrink-0" style={{ background: m.color }} />}
                    </button>
                  ))}
                </div>
                {(upgradePaymentMethod === "mtn_mobile_money" || upgradePaymentMethod === "orange_money") && (
                  <div className="mb-5">
                    <label className={label}>{upgradePaymentMethod === "mtn_mobile_money" ? "MTN" : "Orange"} Phone Number</label>
                    <div className="flex gap-2">
                      <div className="px-3 py-2.5 bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl text-sm font-semibold text-[#555] shrink-0">+237</div>
                      <input type="tel" placeholder="6XXXXXXXX" value={upgradePhone} onChange={e => setUpgradePhone(e.target.value.replace(/\D/g, ""))} maxLength={9} className={inp} />
                    </div>
                  </div>
                )}
                <form onSubmit={handleUpgradePayment}>
                  <button type="submit" disabled={upgradeLoading} className="w-full py-3 bg-[#FF4747] text-white rounded-xl text-sm font-bold hover:bg-[#e03e3e] transition-all disabled:opacity-60 cursor-pointer">
                    {upgradeLoading ? "Processing..." : "Pay & Create Workspace"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REFUND CONFIRM */}
      {refundConfirmTicket && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <button onClick={() => setRefundConfirmTicket(null)} className="absolute top-6 right-6 text-[#888] hover:text-[#1a1a1a] cursor-pointer"><X size={20} /></button>
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
              <RefreshCw size={22} className="text-red-500" />
            </div>
            <h2 className="font-display text-xl font-black text-[#1a1a1a] mb-1">Request Refund</h2>
            <p className="text-sm text-[#888] mb-5">For <span className="font-semibold text-[#1a1a1a]">{refundConfirmTicket.eventTitle}</span></p>
            <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-xl p-4 mb-5 text-xs space-y-1.5">
              <div className="flex justify-between"><span className="text-[#888]">Order</span><span className="font-mono font-semibold">#{refundConfirmTicket.orderId?.substring(0, 8)}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">Amount</span><span className="font-semibold">{refundConfirmTicket.totalAmount?.toLocaleString()} FCFA</span></div>
            </div>
            <p className="text-xs text-[#888] mb-6 leading-relaxed">This will invalidate your ticket and cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setRefundConfirmTicket(null)} className="flex-1 py-3 border border-[#e5e7eb] rounded-xl text-sm font-bold text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors cursor-pointer">Keep Ticket</button>
              <button onClick={() => confirmRefundProcess(refundConfirmTicket)} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer">Confirm Refund</button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteConfirmTicket && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <button onClick={() => setDeleteConfirmTicket(null)} className="absolute top-6 right-6 text-[#888] hover:text-[#1a1a1a] cursor-pointer"><X size={20} /></button>
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
              <Trash2 size={22} className="text-red-500" />
            </div>
            <h2 className="font-display text-xl font-black text-[#1a1a1a] mb-1">Delete Ticket</h2>
            <p className="text-sm text-[#888] mb-5">For <span className="font-semibold text-[#1a1a1a]">{deleteConfirmTicket.eventTitle}</span></p>
            <p className="text-xs text-[#888] mb-6 leading-relaxed">This permanently removes the ticket from your history and cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmTicket(null)} className="flex-1 py-3 border border-[#e5e7eb] rounded-xl text-sm font-bold text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors cursor-pointer">Cancel</button>
              <button onClick={() => confirmDeleteProcess(deleteConfirmTicket)} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESSING OVERLAYS */}
      {(refundLoadingId || deleteLoadingId) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center max-w-xs text-center">
            <div className="w-12 h-12 border-4 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin mb-4" />
            <h3 className="font-bold text-[#1a1a1a] mb-1">{refundLoadingId ? "Processing Refund" : "Deleting Ticket"}</h3>
            <p className="text-xs text-[#888]">Please do not close this window.</p>
          </div>
        </div>
      )}

      {/* STATUS MODAL */}
      {refundStatus && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative text-center">
            <button onClick={() => setRefundStatus(null)} className="absolute top-6 right-6 text-[#888] hover:text-[#1a1a1a] cursor-pointer"><X size={20} /></button>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${refundStatus.type === "success" ? "bg-green-50" : "bg-red-50"}`}>
              {refundStatus.type === "success"
                ? <CheckCircle2 size={32} className="text-green-500" />
                : <AlertCircle size={32} className="text-red-500" />}
            </div>
            <h2 className="font-display text-xl font-black text-[#1a1a1a] mb-3">{refundStatus.title}</h2>
            <p className={`text-sm leading-relaxed mb-6 ${refundStatus.type === "success" ? "text-[#555]" : "text-red-600 bg-red-50 border border-red-100 rounded-xl p-4 font-mono text-xs text-left"}`}>
              {refundStatus.message}
            </p>
            <button onClick={() => setRefundStatus(null)}
              className={`w-full py-3 font-bold rounded-xl text-sm transition-colors cursor-pointer ${refundStatus.type === "success" ? "bg-green-500 hover:bg-green-600 text-white" : "bg-[#1a1a1a] hover:bg-[#333] text-white"}`}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
