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
  MapPin, Clock, Star, ArrowRight, Zap, MessageSquare, Vote, ChevronDown, ThumbsUp, Send
} from "lucide-react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { useLanguage } from "@/app/context/LanguageContext";
import { DEFAULT_PRICING_PLANS, getActivePlans, mapPlanNameToTier, formatPrice } from "@/app/utils/pricingPlans";

let stripePromise: Promise<any> | null = null;
const getStripePromise = () => {
  if (typeof window === "undefined") return null;
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "mock_key");
  }
  return stripePromise;
};

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";

interface StripeUpgradeFormProps {
  selectedPlanData: any;
  upgradeForm: { workspaceName: string; type: string };
  onSuccess: (data: any) => void;
  onError: (msg: string) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

function StripeUpgradeForm({ selectedPlanData, upgradeForm, onSuccess, onError, loading, setLoading }: StripeUpgradeFormProps) {
  const { t } = useLanguage();
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setCardError("");
    onError("");
    setLoading(true);
    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error(t("userDashboard.upgrade.errors.cardNotFound"));
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({ type: "card", card: cardElement });
      if (pmError) throw new Error(pmError.message);
      const auth = getStoredAuth();
      if (!auth) throw new Error(t("userDashboard.upgrade.errors.notAuthenticated"));
      const data = await authService.upgradeToOrganizer({ workspaceName: upgradeForm.workspaceName, type: upgradeForm.type, planName: selectedPlanData.name });
      const tenantId = data.tenantId ? String(data.tenantId) : "";
      const tier = mapPlanNameToTier(selectedPlanData.name);
      // Store the freshly-issued TENANT_OWNER-scoped token BEFORE createSubscription —
      // otherwise that call uses the stale pre-upgrade (ATTENDEE-scoped) token and 403s.
      setStoredAuth({ token: data.token || auth.token, type: data.type || "Bearer", userId: String(data.userId || auth.userId), tenantId, email: data.email || auth.email, planTier: tier || data.planTier, role: data.role || "TENANT_OWNER" });
      if (selectedPlanData.price > 0 && tenantId && selectedPlanData.planId) {
        const subResult = await paymentService.createSubscription({ tenantId, planId: selectedPlanData.planId, amount: selectedPlanData.price, currency: selectedPlanData.currency || "XAF", provider: "stripe", paymentMethodId: paymentMethod!.id });
        if (subResult?.clientSecret && !subResult.clientSecret.startsWith("mock_")) {
          const { error: confirmError } = await stripe.confirmCardPayment(subResult.clientSecret);
          if (confirmError) throw new Error(confirmError.message);
        }
      }
      onSuccess(data);
    } catch (err: any) {
      const msg = err.message || t("userDashboard.upgrade.errors.paymentFailed");
      setCardError(msg);
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="border border-[#e5e7eb] rounded-xl px-4 py-3 bg-white">
        <CardElement options={{ style: { base: { fontSize: "14px", color: "#1a1a1a", fontFamily: "inherit", "::placeholder": { color: "#aab7c4" } } } }} />
      </div>
      {cardError && <p className="text-xs text-red-500 font-semibold">{cardError}</p>}
      <button type="submit" disabled={loading || !stripe || !elements} className="w-full py-3 bg-[#FF4747] text-white rounded-xl text-sm font-bold hover:bg-[#e03e3e] transition-all disabled:opacity-60 cursor-pointer">
        {loading ? t("userDashboard.upgrade.step.payment.processing") : t("userDashboard.upgrade.step.payment.payAndCreate")}
      </button>
    </form>
  );
}

type Tab = "overview" | "tickets" | "saved" | "settings" | "engage";
type EngageSubTab = "polls" | "qa";

export default function AttendeeDashboard() {
  const router = useRouter();
  const { t } = useLanguage();
  const [userName, setUserName] = useState("Attendee");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState<"plan" | "payment" | "workspace">("plan");
  // Real, backend-configured plans (whatever a super admin has set up — name, price,
  // currency, however many exist), same data source as /pricing. `selectedPlanId` tracks
  // the chosen plan's real planId; falls back to the curated defaults only if the plans
  // fetch hasn't completed yet or failed.
  const [availablePlans, setAvailablePlans] = useState<any[]>(DEFAULT_PRICING_PLANS);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const selectedPlanData = availablePlans.find(p => (p.planId || p.name) === selectedPlanId) || availablePlans[0] || DEFAULT_PRICING_PLANS[0];
  const [upgradeForm, setUpgradeForm] = useState({ workspaceName: "", type: "INDIVIDUAL" });
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState<"stripe" | "mtn_mobile_money" | "orange_money">("stripe");
  const [upgradePhone, setUpgradePhone] = useState("");
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");
  const [upgradeMomoWaiting, setUpgradeMomoWaiting] = useState(false);
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

  // ── Engage tab state ─────────────────────────────────────────
  const [engageSubTab, setEngageSubTab] = useState<EngageSubTab>("polls");
  const [engageEventId, setEngageEventId] = useState<string>("");
  const [engagePolls, setEngagePolls] = useState<any[]>([]);
  const [engageQaQuestions, setEngageQaQuestions] = useState<any[]>([]);
  const [engageQaInput, setEngageQaInput] = useState("");
  const [engageLoading, setEngageLoading] = useState(false);
  const [engageEventMeta, setEngageEventMeta] = useState<any>(null);
  const [engageSessions, setEngageSessions] = useState<any[]>([]);
  const [engageSessionId, setEngageSessionId] = useState<string>("");
  const [showEngageSessionDropdown, setShowEngageSessionDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // ── handlers (unchanged logic) ──────────────────────────────

  const handleRefund = (ticket: any) => setRefundConfirmTicket(ticket);

  const confirmRefundProcess = async (ticket: any) => {
    setRefundConfirmTicket(null);
    if (ticket.isPastEvent) {
      setRefundStatus({ type: "error", title: t("userDashboard.refundModal.errors.pastEventTitle"), message: t("userDashboard.refundModal.errors.pastEventMsg") });
      return;
    }
    if (!(ticket.totalAmount > 0)) {
      setRefundStatus({ type: "error", title: t("userDashboard.refundModal.errors.notApplicableTitle"), message: t("userDashboard.refundModal.errors.notApplicableMsg") });
      return;
    }
    const ticketOrderId = ticket.orderId || ticket.id;
    setRefundLoadingId(ticketOrderId);
    try {
      const payments = await paymentService.getPaymentsByOrderId(ticketOrderId);
      const payment = (payments || [])[0];
      if (!payment) throw new Error(t("userDashboard.refundModal.errors.noPaymentRecord"));
      await paymentService.createRefund({ paymentId: payment.paymentId, amount: payment.amount, reason: "Requested by attendee via dashboard", status: "SUCCESSFUL" });
      await eventService.updateOrder(ticketOrderId, { ...ticket, status: "REFUNDED" });
      const auth = getStoredAuth();
      if (auth) await fetchTickets(auth.userId);
      setRefundStatus({ type: "success", title: t("userDashboard.refundModal.errors.successTitle"), message: t("userDashboard.refundModal.errors.successMsg") });
    } catch (err: any) {
      setRefundStatus({ type: "error", title: t("userDashboard.refundModal.errors.failTitle"), message: err.message || t("userDashboard.common.unknownError") });
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
      setRefundStatus({ type: "success", title: t("userDashboard.deleteModal.successTitle"), message: t("userDashboard.deleteModal.successMsg") });
    } catch (err: any) {
      setRefundStatus({ type: "error", title: t("userDashboard.deleteModal.failTitle"), message: err.message || t("userDashboard.common.unknownError") });
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
      if (!payment) throw new Error(t("userDashboard.sync.noPaymentRecord"));
      const updatedPayment = await paymentService.getPaymentById(payment.paymentId);
      const auth = getStoredAuth();
      if (auth) await fetchTickets(auth.userId);
      setRefundStatus({ type: "success", title: t("userDashboard.sync.successTitle"), message: t("userDashboard.tickets.sync.statusMessage", { status: updatedPayment.status }) });
    } catch (err: any) {
      setRefundStatus({ type: "error", title: t("userDashboard.sync.failTitle"), message: err.message || t("userDashboard.common.unknownError") });
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
      api.get<any[]>("/api/v1/subscriptionplans", { skipAuth: true }).then(d => setAvailablePlans(getActivePlans(d))).catch(() => {})
    );
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upgrade") === "1") {
        // /pricing carries the exact plan the user picked, by its real planId (falls back
        // to whatever loads as the default/cheapest plan if opened without one, e.g. from
        // the generic "Become an Organizer" button).
        const planId = params.get("planId") || "";
        if (planId) setSelectedPlanId(planId);
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
            // Try fields the event service may embed directly
            const inlineOrgName = ev.organizerName || ev.tenantName || ev.workspaceName;
            if (inlineOrgName) {
              tenantData = { name: inlineOrgName };
            } else if (ev.tenantId) {
              try { const tn: any = await authService.getTenantById(ev.tenantId, { skipAuth: true }); tenantData = { name: tn.name || tn.workspaceName || "Unknown Organizer" }; } catch {}
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
            eventData = { title: ev.title, date: new Date(ev.startDate).toLocaleDateString(), imageUrl: ev.coverImage || ev.imageUrl || "" };
            if (ev?.tenantId) { try { const tn: any = await authService.getTenantById(ev.tenantId); tenantData = { name: tn.name }; } catch {} }
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
      if (!auth) throw new Error(t("userDashboard.profile.notLoggedIn"));
      const payload: any = { ...profileForm };
      delete payload.email;
      await authService.updateUser(auth.userId, payload);
      setProfileMsg({ type: "success", text: t("userDashboard.profile.successUpdate") });
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
      setProfileMsg({ type: "success", text: t("userDashboard.profile.avatarUploaded") });
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || t("userDashboard.profile.avatarUploadFailed") });
    }
  };

  const handleLogout = () => { clearStoredAuth(); router.push("/login"); };

  const openUpgradeModal = () => {
    if (!getStoredAuth()) { router.push("/login?from=/user/dashboard"); return; }
    setUpgradeStep("plan"); setSelectedPlanId("");
    setUpgradeForm({ workspaceName: "", type: "INDIVIDUAL" });
    setUpgradePaymentMethod("stripe"); setUpgradePhone(""); setUpgradeError("");
    setShowUpgradeModal(true);
  };

  // Individuals shouldn't have to type their name again — it already exists on their
  // profile. Only organizations need genuinely new information (the org name), so only
  // they stop at the workspace step; individuals go straight from plan -> payment/create.
  const deriveIndividualWorkspaceName = () => {
    const auth = getStoredAuth();
    const first = profileForm.firstName || auth?.firstName || "";
    const last = profileForm.lastName || auth?.lastName || "";
    const fullName = `${first} ${last}`.trim();
    return fullName || (auth?.email ? auth.email.split("@")[0] : "");
  };

  const handlePlanContinue = () => {
    if (upgradeForm.type === "ORGANIZATION") {
      setUpgradeStep("workspace");
      return;
    }
    const derivedName = deriveIndividualWorkspaceName();
    setUpgradeForm(f => ({ ...f, workspaceName: derivedName }));
    if (selectedPlanData.price > 0) {
      setUpgradeStep("payment");
    } else {
      handleUpgradeSubmit(derivedName);
    }
  };

  // Stores the freshly-issued TENANT_OWNER-scoped token/tenantId from upgradeToOrganizer.
  // Must run BEFORE any subsequent authenticated call (e.g. createSubscription) — those
  // otherwise use the stale pre-upgrade (ATTENDEE-scoped) token and get 403'd.
  const storeUpgradedAuth = (data: any) => {
    const auth = getStoredAuth();
    const tenantId = data.tenantId ? String(data.tenantId) : "";
    setStoredAuth({ token: data.token || auth?.token || "", type: data.type || "Bearer", userId: String(data.userId || auth?.userId || ""), tenantId, email: data.email || auth?.email || "", planTier: mapPlanNameToTier(selectedPlanData.name) || data.planTier, role: data.role || "TENANT_OWNER" });
    return tenantId;
  };

  const finishUpgrade = (data: any) => {
    storeUpgradedAuth(data);
    setShowUpgradeModal(false);
    // Full reload (not router.push) so /admin's data fetch re-runs instead of reusing
    // a cached page instance, which would otherwise keep showing the pre-upgrade plan.
    window.location.href = "/admin";
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleUpgradeSubmit = async (workspaceNameOverride?: string) => {
    setUpgradeError("");
    // Accept an explicit override since setUpgradeForm() hasn't necessarily flushed to
    // `upgradeForm` yet when this is called synchronously right after setting it (the
    // free/individual "just move ahead" path from the plan step).
    const workspaceName = workspaceNameOverride ?? upgradeForm.workspaceName;
    if (!workspaceName.trim()) { setUpgradeError(t("userDashboard.upgrade.errors.workspaceNameRequired")); return; }
    const auth = getStoredAuth();
    if (!auth) { router.push("/login?from=/user/dashboard"); return; }
    setUpgradeLoading(true);
    try {
      const data = await authService.upgradeToOrganizer({ workspaceName, type: upgradeForm.type, planName: selectedPlanData.name });
      const tenantId = storeUpgradedAuth(data);
      if (selectedPlanData.price > 0 && tenantId && selectedPlanData.planId) {
        const isMomo = upgradePaymentMethod !== "stripe";
        const subscription = await paymentService.createSubscription({
          tenantId, planId: selectedPlanData.planId, amount: selectedPlanData.price,
          currency: selectedPlanData.currency || "XAF", provider: upgradePaymentMethod,
          phoneNumber: isMomo ? upgradePhone : undefined,
        });

        if (isMomo) {
          setUpgradeLoading(false);
          setUpgradeMomoWaiting(true);
          let confirmed = false;
          for (let attempt = 0; attempt < 20; attempt++) {
            await sleep(3000);
            const status = await paymentService.checkSubscriptionMobileMoneyStatus(subscription.id).catch(() => null);
            if (status?.status === "ACTIVE") { confirmed = true; break; }
            if (status?.status === "FAILED") {
              setUpgradeMomoWaiting(false);
              setUpgradeError(t("userDashboard.upgrade.errors.momoFailed"));
              return;
            }
          }
          setUpgradeMomoWaiting(false);
          if (!confirmed) {
            setUpgradeError(t("userDashboard.upgrade.errors.momoStillWaiting"));
            return;
          }
        }
      }
      finishUpgrade(data);
    } catch (err: any) {
      setUpgradeError(err.message || t("userDashboard.upgrade.errors.generic"));
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleWorkspaceContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgradeError("");
    if (!upgradeForm.workspaceName.trim()) { setUpgradeError(t("userDashboard.upgrade.errors.workspaceNameRequired")); return; }
    if (!getStoredAuth()) { router.push("/login?from=/user/dashboard"); return; }
    if (selectedPlanData.price > 0) setUpgradeStep("payment");
    else await handleUpgradeSubmit();
  };

  const handleUpgradePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (upgradePaymentMethod !== "stripe" && upgradePhone.replace(/\D/g, "").length < 9) { setUpgradeError(t("userDashboard.upgrade.errors.invalidPhone")); return; }
    setUpgradeError("");
    await handleUpgradeSubmit();
  };

  // ── helpers ────────────────────────────────────────────────

  const getTicketBadge = (ticket: any) => {
    const isRefunded = ticket.status === "REFUNDED" || ticket.paymentStatus === "REFUNDED";
    const isUsed = ticket.status === "USED" || ticket.isPastEvent;
    const isPending = ticket.paymentStatus === "PENDING" || (!isRefunded && !isUsed && ticket.status === "PENDING");
    const isPaid = !isPending && (ticket.paymentStatus === "SUCCESSFUL" || ticket.status === "COMPLETED" || ticket.status === "PAID");
    if (isRefunded) return { label: t("userDashboard.tickets.badge.refunded"), cls: "bg-red-100 text-red-600" };
    if (isUsed)     return { label: t("userDashboard.tickets.badge.used"),     cls: "bg-[#f5f5f5] text-[#888]" };
    if (isPending)  return { label: t("userDashboard.tickets.badge.pending"),  cls: "bg-amber-100 text-amber-700" };
    if (isPaid)     return { label: t("userDashboard.tickets.badge.paid"),     cls: "bg-green-100 text-green-700" };
    return { label: ticket.status || t("userDashboard.tickets.badge.active"), cls: "bg-[#f5f5f5] text-[#888]" };
  };

  const upcoming = myTickets.filter(t => !t.isPastEvent && t.status !== "REFUNDED" && t.paymentStatus !== "REFUNDED").slice(0, 3);

  const registeredTickets = myTickets.filter(
    (t: any) => t.status !== "REFUNDED" && t.paymentStatus !== "REFUNDED"
  );

  const NAV: { id: Tab; label: string; icon: any; count?: number }[] = [
    { id: "overview", label: t("userDashboard.nav.overview"),     icon: LayoutDashboard },
    { id: "tickets",  label: t("userDashboard.nav.tickets"),   icon: Ticket,   count: myTickets.length },
    { id: "saved",    label: t("userDashboard.nav.saved"), icon: Bookmark, count: savedEvents.length },
    { id: "engage",   label: t("userDashboard.nav.engage"), icon: MessageSquare },
    { id: "settings", label: t("userDashboard.nav.profile"),      icon: User },
  ];

  // Picks the session whose time window contains "now"; falls back to the first
  // upcoming session, then the first session overall, so there's always a sensible default.
  const pickCurrentSession = (sessions: any[]): any => {
    if (!sessions.length) return null;
    const now = Date.now();
    const withTimes = sessions.map(s => ({
      s,
      start: s.startTime ? new Date(s.startTime).getTime() : NaN,
      end: s.endTime ? new Date(s.endTime).getTime() : NaN,
    }));
    const live = withTimes.find(x => !isNaN(x.start) && !isNaN(x.end) && now >= x.start && now <= x.end);
    if (live) return live.s;
    const upcoming = withTimes
      .filter(x => !isNaN(x.start) && x.start > now)
      .sort((a, b) => a.start - b.start)[0];
    if (upcoming) return upcoming.s;
    return sessions[0];
  };

  const loadSessionQA = async (sessionId: string) => {
    if (!sessionId) {
      setEngageQaQuestions([]);
      return;
    }
    try {
      const questionsList = await eventService.getQaQuestionsBySession(sessionId).catch(() => []);
      setEngageQaQuestions(Array.isArray(questionsList) ? questionsList : []);
    } catch {
      setEngageQaQuestions([]);
    }
  };

  const handleEngageEventChange = async (eid: string) => {
    setEngageEventId(eid);
    setEngageSessionId("");
    setEngageQaQuestions([]);
    if (!eid) return;
    setEngageLoading(true);
    try {
      const [allPolls, allSessions, evData] = await Promise.all([
        eventService.getPollsByEvent(eid).catch(() => []),
        eventService.getSessions().catch(() => []),
        eventService.getEventById(eid, { skipAuth: true }).catch(() => null),
      ]);
      const toArr = (d: any): any[] => Array.isArray(d) ? d : (d?.content ?? []);
      setEngagePolls(toArr(allPolls));
      setEngageEventMeta(evData);

      const eventSessions = toArr(allSessions).filter((s: any) => s.eventId === eid);
      setEngageSessions(eventSessions);
      const current = pickCurrentSession(eventSessions);
      const currentId = current ? (current.sessionId || current.id) : "";
      setEngageSessionId(currentId);
      await loadSessionQA(currentId);
    } finally {
      setEngageLoading(false);
    }
  };

  const handleEngageSessionChange = async (sessionId: string) => {
    setEngageSessionId(sessionId);
    setEngageLoading(true);
    try {
      await loadSessionQA(sessionId);
    } finally {
      setEngageLoading(false);
    }
  };

  const handleEngagePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!auth || !engageSessionId || !engageQaInput.trim()) return;
    try {
      const q = await eventService.createQaQuestion({
        sessionId: engageSessionId,
        questionText: engageQaInput.trim(),
        userId: auth.userId,
        upvotes: 0,
      });
      setEngageQaQuestions(prev => [q, ...prev]);
      setEngageQaInput("");
    } catch (err: any) {
      alert(err.message || t("userDashboard.engage.qa.postFailed"));
    }
  };

  const handleEngageUpvote = async (qaId: string) => {
    try {
      const updated = await eventService.upvoteQaQuestion(qaId);
      setEngageQaQuestions(prev => prev.map(item => (item.questionId || item.id) === qaId ? updated : item));
    } catch {}
  };

  const handleEngageVotePoll = async (pollId: string, option: string) => {
    const auth = getStoredAuth();
    if (!auth) return;
    try {
      await eventService.createPollResponse({ pollId, userId: auth.userId, selectedOption: option });
      alert(t("userDashboard.engage.polls.voteRecorded"));
    } catch (err: any) {
      alert(err.message || t("userDashboard.engage.polls.voteFailed"));
    }
  };

  // ── render ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row text-[#1a1a1a]">

      {/* MOBILE HEADER */}
      <div className="md:hidden flex items-center justify-between bg-white border-b border-[#e5e7eb] p-4 sticky top-0 z-30">
        <Link href="/" className="font-display text-xl font-black tracking-tight">
          Yow<span className="text-[#FF4747]">Event</span>
        </Link>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -mr-2 text-[#1a1a1a] cursor-pointer">
          <LayoutDashboard size={24} />
        </button>
      </div>

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        fixed md:sticky top-0 left-0 h-screen w-[260px] shrink-0 bg-white border-r border-[#e5e7eb] flex flex-col z-50 transition-transform duration-300
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>

        {/* Logo */}
        <div className="px-6 py-5 border-b border-[#f0f0f0] flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-black tracking-tight">
            Yow<span className="text-[#FF4747]">Event</span>
          </Link>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-[#888] hover:text-[#1a1a1a] cursor-pointer">
            <X size={20} />
          </button>
        </div>

        {/* User identity */}
        <div className="px-6 py-5 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            {profileForm.avatar ? (
              <img src={profileForm.avatar} alt={t("userDashboard.profile.avatarAlt")} className="w-10 h-10 rounded-full object-cover border border-[#e5e7eb]" />
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
              onClick={() => { setActiveTab(id); setIsMobileMenuOpen(false); }}
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
                {t("userDashboard.nav.organizerDashboard")}
              </Link>
            )}
            <Link href="/" className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#555] hover:bg-[#f5f5f5] transition-all">
              <Home size={16} />
              {t("userDashboard.nav.backToHome")}
            </Link>
          </div>
        </nav>

        {/* Upgrade CTA */}
        {!isOrganizer && (
          <div className="px-4 py-4 border-t border-[#f0f0f0]">
            <button onClick={openUpgradeModal} className="w-full bg-[#FF4747] hover:bg-[#e03e3e] text-white text-xs font-bold py-3 px-4 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2">
              <Zap size={13} /> {t("userDashboard.nav.becomeOrganizer")}
            </button>
          </div>
        )}

        {/* Logout */}
        <div className="px-4 pb-4">
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#888] hover:text-red-500 hover:bg-red-50 rounded-xl transition-all cursor-pointer">
            <LogOut size={15} /> {t("userDashboard.nav.logOut")}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 w-full overflow-x-hidden">

        {/* ── OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="max-w-4xl">
            {/* Header */}
            <div className="mb-8">
              <p className="text-xs text-[#aaa] font-semibold uppercase tracking-widest mb-1">{t("userDashboard.overview.eyebrow")}</p>
              <h1 className="font-display text-3xl font-black text-[#1a1a1a]">
                {t("userDashboard.overview.welcomeBack")} <span className="text-[#FF4747]">{profileForm.firstName || userName}</span>
              </h1>
              <p className="text-[#888] text-sm mt-1">{t("userDashboard.overview.subtitle")}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
              {[
                { label: t("userDashboard.overview.stats.ticketsOwned"),  value: myTickets.filter(tk => tk.status !== "REFUNDED").length, color: "#FF4747",  bg: "#FF4747" },
                { label: t("userDashboard.overview.stats.upcomingEvents"), value: upcoming.length, color: "#10b981", bg: "#10b981" },
                { label: t("userDashboard.overview.stats.savedEvents"),   value: savedEvents.length, color: "#6366f1", bg: "#6366f1" },
              ].map(s => (
                <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-2xl p-3 sm:p-5 flex flex-col sm:flex-row items-center sm:gap-4 text-center sm:text-left shadow-sm">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 mb-2 sm:mb-0" style={{ background: `${s.bg}15` }}>
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full" style={{ background: s.bg }} />
                  </div>
                  <div>
                    <div className="font-black text-xl sm:text-2xl text-[#1a1a1a] leading-none mb-1 sm:mb-0">{s.value}</div>
                    <div className="text-[10px] sm:text-xs text-[#888] leading-tight line-clamp-2">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Upcoming events */}
            {upcoming.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display font-bold text-lg text-[#1a1a1a]">{t("userDashboard.overview.upcomingEvents.title")}</h2>
                  <button onClick={() => setActiveTab("tickets")} className="text-xs text-[#FF4747] font-semibold hover:underline cursor-pointer flex items-center gap-1">
                    {t("userDashboard.overview.upcomingEvents.viewAll")} <ChevronRight size={12} />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {upcoming.map(tk => (
                    <div key={tk.orderId} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 hover:border-[#FF4747]/30 hover:shadow-sm transition-all">
                      <div className="w-8 h-8 rounded-lg bg-[#FF4747]/10 flex items-center justify-center mb-3">
                        <Calendar size={15} className="text-[#FF4747]" />
                      </div>
                      <p className="font-bold text-sm text-[#1a1a1a] mb-1 line-clamp-2">{tk.eventTitle}</p>
                      <p className="text-xs text-[#888] flex items-center gap-1 mb-3">
                        <Clock size={10} /> {tk.eventDate}
                      </p>
                      <button onClick={() => setActiveTab("tickets")} className="text-xs font-semibold text-[#FF4747] hover:underline cursor-pointer flex items-center gap-1">
                        {t("userDashboard.overview.upcomingEvents.viewTicket")} <ArrowRight size={11} />
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
                  <h2 className="font-display font-bold text-lg text-[#1a1a1a]">{t("userDashboard.overview.recommended")}</h2>
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
                  <div className="font-bold text-sm text-[#1a1a1a]">{t("userDashboard.overview.quickLinks.ticketsTitle")}</div>
                  <div className="text-xs text-[#888]">{t("userDashboard.overview.quickLinks.ticketsDesc", { count: myTickets.length, plural: myTickets.length !== 1 ? "s" : "" })}</div>
                </div>
                <ChevronRight size={16} className="text-[#ccc] ml-auto shrink-0" />
              </button>
              <button onClick={() => setActiveTab("saved")} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-4 hover:border-[#FF4747]/30 hover:shadow-sm transition-all cursor-pointer text-left group">
                <div className="w-10 h-10 rounded-xl bg-[#6366f1]/10 flex items-center justify-center shrink-0 group-hover:bg-[#6366f1]/20 transition-colors">
                  <Bookmark size={18} className="text-[#6366f1]" />
                </div>
                <div>
                  <div className="font-bold text-sm text-[#1a1a1a]">{t("userDashboard.overview.quickLinks.savedTitle")}</div>
                  <div className="text-xs text-[#888]">{t("userDashboard.overview.quickLinks.savedDesc", { count: savedEvents.length, plural: savedEvents.length !== 1 ? "s" : "" })}</div>
                </div>
                <ChevronRight size={16} className="text-[#ccc] ml-auto shrink-0" />
              </button>
            </div>

            {/* Engagement */}
            {myTickets.length > 0 && (() => {
              const attended = myTickets.filter((t: any) => t.status === "USED" || t.isPastEvent);
              const paid = myTickets.filter((t: any) => t.paymentStatus === "SUCCESSFUL" || t.status === "COMPLETED" || t.status === "PAID");
              const uniqueEvents = new Set(myTickets.map((t: any) => t.eventId).filter(Boolean)).size;
              const recentActivity = [...myTickets]
                .sort((a: any, b: any) => new Date(b.purchasedAt || b.createdAt || 0).getTime() - new Date(a.purchasedAt || a.createdAt || 0).getTime())
                .slice(0, 5);
              return (
                <div className="mt-8">
                  <h2 className="font-display font-bold text-lg text-[#1a1a1a] mb-4 flex items-center gap-2">
                    <Zap size={16} className="text-[#FF4747]" /> {t("userDashboard.overview.engagement.title")}
                  </h2>

                  {/* Engagement stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {[
                      { label: t("userDashboard.overview.engagement.stats.eventsJoined"),  value: uniqueEvents,       color: "#FF4747",  icon: Calendar },
                      { label: t("userDashboard.overview.engagement.stats.attended"),        value: attended.length,    color: "#10b981",  icon: CheckCircle2 },
                      { label: t("userDashboard.overview.engagement.stats.paidTickets"),    value: paid.length,        color: "#f59e0b",  icon: Star },
                      { label: t("userDashboard.overview.engagement.stats.eventsSaved"),    value: savedEvents.length, color: "#6366f1",  icon: Bookmark },
                    ].map(({ label, value, color, icon: Icon }) => (
                      <div key={label} className="bg-white border border-[#e5e7eb] rounded-2xl p-4 text-center">
                        <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: `${color}15` }}>
                          <Icon size={15} style={{ color }} />
                        </div>
                        <div className="font-black text-xl text-[#1a1a1a]">{value}</div>
                        <div className="text-[10px] text-[#888] font-semibold uppercase tracking-wider mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Recent activity */}
                  <h3 className="font-semibold text-sm text-[#1a1a1a] mb-3">{t("userDashboard.overview.engagement.recentActivity")}</h3>
                  <div className="space-y-2">
                    {recentActivity.map((item: any) => {
                      const isUsed = item.status === "USED" || item.isPastEvent;
                      const isPaid = item.paymentStatus === "SUCCESSFUL" || item.status === "COMPLETED" || item.status === "PAID";
                      const isPending = item.paymentStatus === "PENDING" || item.status === "PENDING";
                      const statusColor = isUsed ? "#10b981" : isPaid ? "#FF4747" : isPending ? "#f59e0b" : "#888";
                      const statusLabel = isUsed ? t("userDashboard.overview.engagement.statusLabels.attended") : isPaid ? t("userDashboard.overview.engagement.statusLabels.registered") : isPending ? t("userDashboard.overview.engagement.statusLabels.pending") : t("userDashboard.overview.engagement.statusLabels.ticket");
                      return (
                        <div key={item.orderId} className="flex items-center gap-3 bg-white border border-[#e5e7eb] rounded-xl px-4 py-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${statusColor}15` }}>
                            <Ticket size={14} style={{ color: statusColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-[#1a1a1a] truncate">{item.eventTitle || t("userDashboard.overview.engagement.eventFallback")}</div>
                            <div className="text-[10px] text-[#aaa]">{item.eventDate || ""}</div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full shrink-0" style={{ background: `${statusColor}15`, color: statusColor }}>
                            {statusLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── MY TICKETS ── */}
        {activeTab === "tickets" && (
          <div className="max-w-4xl">
            <div className="mb-6">
              <p className="text-xs text-[#aaa] font-semibold uppercase tracking-widest mb-1">{t("userDashboard.tickets.eyebrow")}</p>
              <h1 className="font-display text-2xl font-black text-[#1a1a1a]">{t("userDashboard.tickets.title")}</h1>
            </div>

            {ticketsLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-[#aaa]">
                <div className="w-8 h-8 border-4 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin mb-4" />
                <p className="text-sm">{t("userDashboard.tickets.loading")}</p>
              </div>
            ) : myTickets.length === 0 ? (
              <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-16 text-center">
                <Ticket size={40} className="mx-auto text-[#F7E998] mb-4" />
                <p className="font-bold text-[#1a1a1a] mb-2">{t("userDashboard.tickets.empty.title")}</p>
                <p className="text-sm text-[#888] max-w-xs mx-auto mb-6">{t("userDashboard.tickets.empty.desc")}</p>
                <Link href="/events" className="inline-flex items-center gap-2 bg-[#FF4747] text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-[#e03e3e] transition-colors">
                  {t("userDashboard.tickets.empty.cta")} <ArrowRight size={14} />
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
                              <strong>{t("userDashboard.tickets.paymentPendingLabel")}</strong> {t("userDashboard.tickets.paymentPendingDesc")}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 mt-4 flex-wrap">
                            {isPaid && !isUsed && !isRefunded && ticket.totalAmount > 0 && (
                              <button onClick={() => handleRefund(ticket)} disabled={refundLoadingId === (ticket.orderId || ticket.id)}
                                className="text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1">
                                <RefreshCw size={10} /> {refundLoadingId === (ticket.orderId || ticket.id) ? t("userDashboard.tickets.actions.refunding") : t("userDashboard.tickets.actions.requestRefund")}
                              </button>
                            )}
                            {isPending && (
                              <button onClick={() => handleSyncPaymentStatus(ticket)} disabled={syncLoadingId === (ticket.orderId || ticket.id)}
                                className="text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1">
                                <RefreshCw size={10} /> {syncLoadingId === (ticket.orderId || ticket.id) ? t("userDashboard.tickets.actions.syncing") : t("userDashboard.tickets.actions.syncStatus")}
                              </button>
                            )}
                            <button onClick={() => setDeleteConfirmTicket(ticket)}
                              className="text-xs font-semibold text-[#888] bg-[#f5f5f5] hover:bg-red-50 hover:text-red-600 px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1">
                              <Trash2 size={10} /> {t("userDashboard.tickets.actions.delete")}
                            </button>
                          </div>
                        </div>

                        {/* QR panel */}
                        {showQR && (
                          <div className="border-l border-dashed border-[#e5e7eb] flex flex-col items-center justify-center px-5 py-4 shrink-0 bg-[#fafafa]">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`YOEVENT:ORDER:${ticket.orderId}`)}&bgcolor=ffffff&color=1a1a1a&margin=4`}
                              alt={t("userDashboard.tickets.qrAlt")}
                              className="w-20 h-20 rounded-lg"
                            />
                            <p className="text-[9px] text-[#aaa] mt-2 font-mono uppercase tracking-wider flex items-center gap-1">
                              <QrCode size={9} /> {t("userDashboard.tickets.scanAtEntry")}
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
              <p className="text-xs text-[#aaa] font-semibold uppercase tracking-widest mb-1">{t("userDashboard.saved.eyebrow")}</p>
              <h1 className="font-display text-2xl font-black text-[#1a1a1a]">{t("userDashboard.saved.title")}</h1>
            </div>

            {savedEventsLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-[#aaa]">
                <div className="w-8 h-8 border-4 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin mb-4" />
                <p className="text-sm">{t("userDashboard.saved.loading")}</p>
              </div>
            ) : savedEvents.length === 0 ? (
              <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-16 text-center">
                <Bookmark size={40} className="mx-auto text-[#F7E998] mb-4" />
                <p className="font-bold text-[#1a1a1a] mb-2">{t("userDashboard.saved.empty.title")}</p>
                <p className="text-sm text-[#888] max-w-xs mx-auto mb-6">{t("userDashboard.saved.empty.desc")}</p>
                <Link href="/events" className="inline-flex items-center gap-2 bg-[#FF4747] text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-[#e03e3e] transition-colors">
                  {t("userDashboard.saved.empty.cta")} <ArrowRight size={14} />
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
                      <button onClick={() => handleUnsave(ev.id)} title={t("userDashboard.saved.removeBookmark")}
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
              <p className="text-xs text-[#aaa] font-semibold uppercase tracking-widest mb-1">{t("userDashboard.profile.eyebrow")}</p>
              <h1 className="font-display text-2xl font-black text-[#1a1a1a]">{t("userDashboard.profile.title")}</h1>
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
                    <img src={profileForm.avatar} alt={t("userDashboard.profile.avatarAlt")} className="w-20 h-20 rounded-full object-cover border-2 border-[#e5e7eb] group-hover:opacity-80 transition-opacity" />
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
                  <p className="text-xs text-[#FF4747] mt-2 font-semibold">{t("userDashboard.profile.clickAvatar")}</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className={label}>{t("userDashboard.profile.firstNameLabel")}</label>
                    <input value={profileForm.firstName} onChange={e => setProfileForm(f => ({ ...f, firstName: e.target.value }))} className={inp} required />
                  </div>
                  <div>
                    <label className={label}>{t("userDashboard.profile.lastNameLabel")}</label>
                    <input value={profileForm.lastName} onChange={e => setProfileForm(f => ({ ...f, lastName: e.target.value }))} className={inp} required />
                  </div>
                </div>
                <div>
                  <label className={label}>{t("userDashboard.profile.emailLabel")}</label>
                  <input value={profileForm.email} disabled className="w-full bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#aaa] cursor-not-allowed" />
                  <p className="text-[10px] text-[#aaa] mt-1">{t("userDashboard.profile.emailHint")}</p>
                </div>
                <div>
                  <label className={label}>{t("userDashboard.profile.phoneLabel")}</label>
                  <input value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="+237 6XXXXXXXX" className={inp} />
                </div>
                <button type="submit" disabled={profileLoading} className="mt-2 px-6 py-2.5 bg-[#FF4747] text-white rounded-xl text-sm font-bold hover:bg-[#e03e3e] transition-colors disabled:opacity-50 cursor-pointer">
                  {profileLoading ? t("userDashboard.profile.saving") : t("userDashboard.profile.save")}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── ENGAGE ── */}
        {activeTab === "engage" && (
          <div className="max-w-4xl">
            <div className="mb-8">
              <p className="text-xs text-[#aaa] font-semibold uppercase tracking-widest mb-1">{t("userDashboard.engage.eyebrow")}</p>
              <h1 className="font-display text-3xl font-black text-[#1a1a1a]">
                {t("userDashboard.engage.titlePrefix")} <span className="text-[#FF4747]">{t("userDashboard.engage.titleHighlight")}</span>
              </h1>
              <p className="text-[#888] text-sm mt-1">{t("userDashboard.engage.subtitle")}</p>
            </div>

            {/* Event Picker */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 mb-6 shadow-sm">
              <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">{t("userDashboard.engage.selectEventLabel")}</label>
              <div className="relative">
                <select
                  value={engageEventId}
                  onChange={e => handleEngageEventChange(e.target.value)}
                  className="w-full appearance-none bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm font-medium text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors cursor-pointer pr-10"
                >
                  <option value="">{t("userDashboard.engage.selectEventPlaceholder")}</option>
                  {registeredTickets.map((rt: any, i) => (
                    <option key={`${rt.eventId || rt.orderId || i}-${i}`} value={rt.eventId}>
                      {rt.eventTitle || t("userDashboard.overview.engagement.eventFallback")} {rt.eventDate ? `· ${rt.eventDate}` : ""}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] pointer-events-none" />
              </div>
            </div>

            {!engageEventId ? (
              <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-16 text-center">
                <MessageSquare size={40} className="mx-auto text-[#FF4747]/30 mb-4" />
                <p className="font-bold text-[#1a1a1a] mb-2">{t("userDashboard.engage.pickEvent.title")}</p>
                <p className="text-sm text-[#888] max-w-xs mx-auto">{t("userDashboard.engage.pickEvent.desc")}</p>
              </div>
            ) : engageLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-[#aaa]">
                <div className="w-8 h-8 border-4 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin mb-4" />
                <p className="text-sm">{t("userDashboard.engage.loading")}</p>
              </div>
            ) : (() => {
              // Determine event active status
              const startRaw = engageEventMeta?.startDate || engageEventMeta?.startDatetime;
              const endRaw   = engageEventMeta?.endDate   || engageEventMeta?.endDatetime;
              const now = new Date();
              const isStarted = startRaw ? new Date(startRaw) <= now : true;
              const isEnded   = endRaw   ? new Date(endRaw)   < now  : false;
              const isActive  = isStarted && !isEnded;

              return (
                <div className="space-y-6">
                  {/* Event status banner */}
                  {!isActive && (
                    <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl border text-sm font-medium ${
                      isEnded
                        ? "bg-[#f5f5f5] border-[#e5e7eb] text-[#888]"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}>
                      <Clock size={15} className="shrink-0" />
                      {isEnded
                        ? t("userDashboard.engage.banner.ended")
                        : t("userDashboard.engage.banner.notStarted")}
                    </div>
                  )}
                  {isActive && (
                    <div className="flex items-center gap-3 px-5 py-3.5 rounded-xl border bg-green-50 border-green-200 text-green-700 text-sm font-medium">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                      {t("userDashboard.engage.banner.active")}
                    </div>
                  )}

                  {/* Sub-tabs */}
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm overflow-hidden">
                    <div className="flex border-b border-[#f0f0f0]">
                      {[
                        { id: "polls" as EngageSubTab, label: t("userDashboard.engage.subtabs.polls"), icon: Vote },
                        { id: "qa"    as EngageSubTab, label: t("userDashboard.engage.subtabs.qa"),  icon: MessageSquare },
                      ].map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          onClick={() => setEngageSubTab(id)}
                          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-bold transition-all cursor-pointer border-b-2 ${
                            engageSubTab === id
                              ? "text-[#FF4747] border-[#FF4747] bg-[#FF4747]/5"
                              : "text-[#888] border-transparent hover:text-[#555] hover:bg-[#f9fafb]"
                          }`}
                        >
                          <Icon size={15} />
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="p-6">
                      {/* ── POLLS ── */}
                      {engageSubTab === "polls" && (
                        <div className="space-y-5">
                          {engagePolls.length === 0 ? (
                            <div className="text-center py-12">
                              <Vote size={36} className="mx-auto text-[#FF4747]/20 mb-3" />
                              <p className="font-semibold text-[#1a1a1a] mb-1">{t("userDashboard.engage.polls.emptyTitle")}</p>
                              <p className="text-xs text-[#aaa]">{t("userDashboard.engage.polls.emptyDesc")}</p>
                            </div>
                          ) : (
                            engagePolls.map((poll, idx) => {
                              let options: string[] = [];
                              if (Array.isArray(poll.options)) {
                                options = poll.options;
                              } else if (typeof poll.options === "string") {
                                try {
                                  const parsed = JSON.parse(poll.options);
                                  options = Array.isArray(parsed) ? parsed : [];
                                } catch {
                                  options = poll.options.split(",").map((o: string) => o.trim()).filter(Boolean);
                                }
                              }
                              return (
                                <div key={`${poll.pollId || poll.id || idx}-${idx}`} className="p-5 bg-[#faf9f7] border border-[#e5e7eb] rounded-2xl space-y-3">
                                  <div className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-[#FF4747]/10 flex items-center justify-center shrink-0 mt-0.5">
                                      <Vote size={14} className="text-[#FF4747]" />
                                    </div>
                                    <h4 className="font-bold text-sm text-[#1a1a1a] leading-snug">{poll.question}</h4>
                                  </div>
                                  <div className="space-y-2 pl-10">
                                    {options.map((opt: string, i: number) =>
                                      isActive ? (
                                        <button
                                          key={`${opt}-${i}`}
                                          onClick={() => handleEngageVotePoll(poll.pollId || poll.id, opt)}
                                          className="w-full text-left px-4 py-2.5 border-2 border-[#e5e7eb] rounded-xl text-xs font-semibold hover:border-[#FF4747] hover:bg-[#FF4747]/5 hover:text-[#FF4747] transition-all bg-white cursor-pointer"
                                        >
                                          {opt}
                                        </button>
                                      ) : (
                                        <div key={`${opt}-${i}`} className="w-full px-4 py-2.5 border border-[#e5e7eb] rounded-xl text-xs font-medium bg-white text-[#aaa]">
                                          {opt}
                                        </div>
                                      )
                                    )}
                                  </div>
                                  {!isActive && (
                                    <p className="pl-10 text-[10px] text-[#aaa] font-medium">
                                      {isEnded ? t("userDashboard.engage.polls.votingClosed") : t("userDashboard.engage.polls.votingOpensLater")}
                                    </p>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}

                      {/* ── Q&A ── */}
                      {engageSubTab === "qa" && (
                        <div className="space-y-5">
                          {/* Session selector — Q&A is scoped to a single live session */}
                          {engageSessions.length > 0 && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setShowEngageSessionDropdown(v => !v)}
                                className="w-full flex items-center justify-between gap-2 border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm bg-white text-[#1a1a1a] font-semibold cursor-pointer hover:border-[#FF4747] transition-colors"
                              >
                                <span className="truncate">
                                  {engageSessions.find(s => (s.sessionId || s.id) === engageSessionId)?.title || t("userDashboard.engage.qa.selectSession")}
                                </span>
                                <ChevronRight size={14} className={`text-[#aaa] transition-transform shrink-0 ${showEngageSessionDropdown ? "rotate-90" : ""}`} />
                              </button>
                              {showEngageSessionDropdown && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setShowEngageSessionDropdown(false)} />
                                  <div className="absolute z-50 mt-1 w-full bg-white border border-[#e5e7eb] rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                                    {engageSessions.map((s: any) => {
                                      const sid = s.sessionId || s.id;
                                      return (
                                        <button
                                          key={sid}
                                          type="button"
                                          onClick={() => { setShowEngageSessionDropdown(false); handleEngageSessionChange(sid); }}
                                          className={`w-full text-left px-4 py-2.5 text-sm hover:bg-[#fafafa] transition-colors cursor-pointer ${engageSessionId === sid ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}
                                        >
                                          {s.title}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {/* Post question form */}
                          {isActive && engageSessionId && (
                            <form onSubmit={handleEngagePostQuestion} className="flex gap-3">
                              <input
                                value={engageQaInput}
                                onChange={e => setEngageQaInput(e.target.value)}
                                placeholder={t("userDashboard.engage.qa.inputPlaceholder")}
                                className="flex-1 border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#FF4747] bg-white text-[#1a1a1a] transition-colors"
                                required
                              />
                              <button
                                type="submit"
                                className="shrink-0 px-4 py-2.5 bg-[#FF4747] text-white rounded-xl text-sm font-bold hover:bg-[#e03e3e] transition-colors cursor-pointer flex items-center gap-2"
                              >
                                <Send size={14} /> {t("userDashboard.engage.qa.post")}
                              </button>
                            </form>
                          )}
                          {isActive && !engageSessionId && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl text-sm text-[#888]">
                              <Clock size={14} className="shrink-0" />
                              <span>{t("userDashboard.engage.qa.noSessions")}</span>
                            </div>
                          )}
                          {!isActive && !isEnded && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl text-sm text-[#888]">
                              <Clock size={14} className="shrink-0" />
                              <span>{t("userDashboard.engage.qa.opensWhenStarts")}</span>
                            </div>
                          )}
                          {isEnded && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl text-sm text-[#888]">
                              <Clock size={14} className="shrink-0" />
                              <span>{t("userDashboard.engage.qa.closedEnded")}</span>
                            </div>
                          )}

                          {/* Questions list */}
                          <div className="space-y-3">
                            {engageQaQuestions.length === 0 ? (
                              <div className="text-center py-12">
                                <MessageSquare size={36} className="mx-auto text-[#FF4747]/20 mb-3" />
                                <p className="font-semibold text-[#1a1a1a] mb-1">{t("userDashboard.engage.qa.emptyTitle")}</p>
                                <p className="text-xs text-[#aaa]">{isActive ? t("userDashboard.engage.qa.emptyDescActive") : t("userDashboard.engage.qa.emptyDescInactive")}</p>
                              </div>
                            ) : (
                              engageQaQuestions
                                .sort((a: any, b: any) => (b.upvotes || 0) - (a.upvotes || 0))
                                .map((q: any, idx: number) => (
                                  <div key={`${q.questionId || q.id || idx}-${idx}`} className="p-4 bg-[#faf9f7] border border-[#e5e7eb] rounded-xl flex gap-3">
                                    <div className="flex flex-col items-center gap-1 shrink-0">
                                      <button
                                        onClick={() => handleEngageUpvote(q.questionId || q.id)}
                                        className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                          "border-[#e5e7eb] bg-white hover:border-[#FF4747] hover:text-[#FF4747] text-[#888]"
                                        }`}
                                      >
                                        <ThumbsUp size={12} />
                                        <span className="text-[10px] font-bold">{q.upvotes || 0}</span>
                                      </button>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-[#1a1a1a] leading-snug">{q.questionText}</p>
                                      <p className="text-[10px] text-[#aaa] mt-1.5">
                                        {q.createdAt ? new Date(q.createdAt).toLocaleString() : t("userDashboard.engage.qa.postedByAttendee")}
                                      </p>
                                      {q.answer && (
                                        <div className="mt-2 pl-3 border-l-2 border-[#FF4747]/30">
                                          <p className="text-[10px] font-bold text-[#FF4747] uppercase tracking-wider mb-0.5">{t("userDashboard.engage.qa.organizerReply")}</p>
                                          <p className="text-xs text-[#555]">{q.answer}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
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
                <h2 className="font-display text-2xl font-black mb-1">{t("userDashboard.upgrade.step.plan.title")}</h2>
                <p className="text-sm text-[#888] mb-6">{t("userDashboard.upgrade.step.plan.subtitle")}</p>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {availablePlans.map((plan, i) => {
                    const planKey = plan.planId || plan.name || i;
                    const isSelected = selectedPlanData === plan;
                    return (
                      <button key={planKey} type="button" onClick={() => setSelectedPlanId(plan.planId || plan.name)}
                        className={`rounded-2xl p-4 border-2 text-left transition-all cursor-pointer relative ${isSelected ? "border-[#FF4747] bg-[#FF4747]/5" : "border-[#e5e7eb] hover:border-[#FF4747]/40"}`}>
                        {plan.popular && (
                          <span className="absolute -top-2 right-3 bg-[#FF4747] text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">{t("userDashboard.upgrade.step.plan.mostPopular")}</span>
                        )}
                        <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${isSelected ? "text-[#FF4747]" : "text-[#aaa]"}`}>{plan.name}</div>
                        <div className="text-2xl font-black text-[#1a1a1a] mb-3">
                          {plan.price === 0 ? t("userDashboard.upgrade.step.plan.freeLabel") : formatPrice(plan.price, plan.currency)}
                          {plan.price > 0 && <span className="text-xs font-normal text-[#aaa]">{t("userDashboard.upgrade.step.plan.perMonth")}</span>}
                        </div>
                        <ul className="space-y-1">{(plan.featuresEnabled || "").split(",").filter(Boolean).map((f: string) => (
                          <li key={f} className="text-[10px] text-[#666] flex items-start gap-1"><CheckCircle2 size={9} className="text-green-500 shrink-0 mt-0.5" /> {f.trim()}</li>
                        ))}</ul>
                      </button>
                    );
                  })}
                </div>

                <div className="mb-6">
                  <label className={label}>{t("userDashboard.upgrade.step.workspace.accountTypeLabel")}</label>
                  <div className="flex bg-[#f5f5f5] rounded-xl p-1">
                    {(["INDIVIDUAL", "ORGANIZATION"] as const).map(accType => (
                      <button key={accType} type="button" onClick={() => setUpgradeForm(f => ({ ...f, type: accType }))}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${upgradeForm.type === accType ? "bg-white text-[#1a1a1a] shadow-sm" : "text-[#888]"}`}>
                        {t(`userDashboard.upgrade.step.workspace.accountType.${accType.toLowerCase()}`)}
                      </button>
                    ))}
                  </div>
                </div>

                <button type="button" onClick={handlePlanContinue} disabled={upgradeLoading}
                  className="w-full py-3.5 bg-[#FF4747] text-white rounded-xl text-sm font-bold hover:bg-[#e03e3e] transition-all disabled:opacity-60 cursor-pointer">
                  {upgradeLoading ? t("userDashboard.upgrade.step.workspace.creating") : t("userDashboard.upgrade.step.plan.continueWith", { plan: selectedPlanData.name })}
                </button>
              </div>
            )}

            {upgradeStep === "workspace" && (
              <div className="p-8">
                <button type="button" onClick={() => setUpgradeStep("plan")} className="text-xs text-[#FF4747] font-semibold hover:underline mb-4 block cursor-pointer">{t("userDashboard.upgrade.step.workspace.back")}</button>
                <h2 className="font-display text-2xl font-black mb-1">{t("userDashboard.upgrade.step.workspace.title")}</h2>
                <p className="text-sm text-[#888] mb-6">{t("userDashboard.upgrade.step.workspace.creatingLabel", { plan: selectedPlanData.name })}</p>
                {upgradeError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200 mb-4">⚠️ {upgradeError}</div>}
                <form onSubmit={handleWorkspaceContinue} className="space-y-4">
                  <div>
                    <label className={label}>{t("userDashboard.upgrade.step.workspace.organizationNameLabel")}</label>
                    <input value={upgradeForm.workspaceName} onChange={e => setUpgradeForm(f => ({ ...f, workspaceName: e.target.value }))}
                      placeholder={t("userDashboard.upgrade.step.workspace.organizationNamePlaceholder")} className={inp} required />
                  </div>
                  <button type="submit" disabled={upgradeLoading}
                    className="w-full py-3 bg-[#FF4747] text-white rounded-xl text-sm font-bold hover:bg-[#e03e3e] transition-all disabled:opacity-60 cursor-pointer">
                    {upgradeLoading ? t("userDashboard.upgrade.step.workspace.creating") : selectedPlanData.price > 0 ? t("userDashboard.upgrade.step.workspace.continueToPayment") : t("userDashboard.upgrade.step.workspace.createFreeWorkspace")}
                  </button>
                </form>
              </div>
            )}

            {upgradeStep === "payment" && (
              <div className="p-8">
                <button type="button" onClick={() => setUpgradeStep(upgradeForm.type === "ORGANIZATION" ? "workspace" : "plan")} className="text-xs text-[#FF4747] font-semibold hover:underline mb-4 block cursor-pointer">{t("userDashboard.upgrade.step.payment.back")}</button>
                <h2 className="font-display text-2xl font-black mb-1">{t("userDashboard.upgrade.step.payment.title")}</h2>
                <p className="text-sm text-[#888] mb-5">{t("userDashboard.upgrade.step.payment.priceLine", { plan: selectedPlanData.name, price: formatPrice(selectedPlanData.price, selectedPlanData.currency) })}</p>
                {upgradeError && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-200 mb-4">⚠️ {upgradeError}</div>}
                <div className="space-y-3 mb-5">
                  {[
                    { id: "stripe" as const, label: t("userDashboard.upgrade.step.payment.methods.stripe.label"), sub: t("userDashboard.upgrade.step.payment.methods.stripe.sub"), tag: "S", color: "#635bff" },
                    { id: "mtn_mobile_money" as const, label: t("userDashboard.upgrade.step.payment.methods.mtn.label"), sub: t("userDashboard.upgrade.step.payment.methods.mtn.sub"), tag: "MTN", color: "#ffcc00", textDark: true },
                    { id: "orange_money" as const, label: t("userDashboard.upgrade.step.payment.methods.orange.label"), sub: t("userDashboard.upgrade.step.payment.methods.orange.sub"), tag: "OM", color: "#ff6600" },
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
                {upgradePaymentMethod === "stripe" ? (
                  <Elements stripe={getStripePromise()}>
                    <StripeUpgradeForm
                      selectedPlanData={selectedPlanData}
                      upgradeForm={upgradeForm}
                      onSuccess={finishUpgrade}
                      onError={setUpgradeError}
                      loading={upgradeLoading}
                      setLoading={setUpgradeLoading}
                    />
                  </Elements>
                ) : upgradeMomoWaiting ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-8 h-8 mx-auto border-2 border-[#FF4747] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#1a1a1a] font-semibold text-sm">{t("userDashboard.upgrade.step.payment.momoWaitingTitle")}</p>
                    <p className="text-xs text-[#888]">{t("userDashboard.upgrade.step.payment.momoWaitingDesc", { phone: upgradePhone })}</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-5">
                      <label className={label}>{upgradePaymentMethod === "mtn_mobile_money" ? t("userDashboard.upgrade.step.payment.phoneLabelMtn") : t("userDashboard.upgrade.step.payment.phoneLabelOrange")}</label>
                      <div className="flex gap-2">
                        <div className="px-3 py-2.5 bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl text-sm font-semibold text-[#555] shrink-0">+237</div>
                        <input type="tel" placeholder="6XXXXXXXX" value={upgradePhone} onChange={e => setUpgradePhone(e.target.value.replace(/\D/g, ""))} maxLength={9} className={inp} />
                      </div>
                    </div>
                    <form onSubmit={handleUpgradePayment}>
                      <button type="submit" disabled={upgradeLoading} className="w-full py-3 bg-[#FF4747] text-white rounded-xl text-sm font-bold hover:bg-[#e03e3e] transition-all disabled:opacity-60 cursor-pointer">
                        {upgradeLoading ? t("userDashboard.upgrade.step.payment.processing") : t("userDashboard.upgrade.step.payment.payAndCreate")}
                      </button>
                    </form>
                  </>
                )}
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
            <h2 className="font-display text-xl font-black text-[#1a1a1a] mb-1">{t("userDashboard.refundModal.title")}</h2>
            <p className="text-sm text-[#888] mb-5">{t("userDashboard.refundModal.forLabel")} <span className="font-semibold text-[#1a1a1a]">{refundConfirmTicket.eventTitle}</span></p>
            <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-xl p-4 mb-5 text-xs space-y-1.5">
              <div className="flex justify-between"><span className="text-[#888]">{t("userDashboard.refundModal.orderLabel")}</span><span className="font-mono font-semibold">#{refundConfirmTicket.orderId?.substring(0, 8)}</span></div>
              <div className="flex justify-between"><span className="text-[#888]">{t("userDashboard.refundModal.amountLabel")}</span><span className="font-semibold">{refundConfirmTicket.totalAmount?.toLocaleString()} FCFA</span></div>
            </div>
            <p className="text-xs text-[#888] mb-6 leading-relaxed">{t("userDashboard.refundModal.warning")}</p>
            <div className="flex gap-3">
              <button onClick={() => setRefundConfirmTicket(null)} className="flex-1 py-3 border border-[#e5e7eb] rounded-xl text-sm font-bold text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors cursor-pointer">{t("userDashboard.refundModal.keep")}</button>
              <button onClick={() => confirmRefundProcess(refundConfirmTicket)} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer">{t("userDashboard.refundModal.confirm")}</button>
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
            <h2 className="font-display text-xl font-black text-[#1a1a1a] mb-1">{t("userDashboard.deleteModal.title")}</h2>
            <p className="text-sm text-[#888] mb-5">{t("userDashboard.deleteModal.forLabel")} <span className="font-semibold text-[#1a1a1a]">{deleteConfirmTicket.eventTitle}</span></p>
            <p className="text-xs text-[#888] mb-6 leading-relaxed">{t("userDashboard.deleteModal.warning")}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmTicket(null)} className="flex-1 py-3 border border-[#e5e7eb] rounded-xl text-sm font-bold text-[#1a1a1a] hover:bg-[#f5f5f5] transition-colors cursor-pointer">{t("userDashboard.deleteModal.cancel")}</button>
              <button onClick={() => confirmDeleteProcess(deleteConfirmTicket)} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors cursor-pointer">{t("userDashboard.deleteModal.confirm")}</button>
            </div>
          </div>
        </div>
      )}

      {/* PROCESSING OVERLAYS */}
      {(refundLoadingId || deleteLoadingId) && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center max-w-xs text-center">
            <div className="w-12 h-12 border-4 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin mb-4" />
            <h3 className="font-bold text-[#1a1a1a] mb-1">{refundLoadingId ? t("userDashboard.processing.refundTitle") : t("userDashboard.processing.deleteTitle")}</h3>
            <p className="text-xs text-[#888]">{t("userDashboard.processing.waitMsg")}</p>
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
              className={`w-full py-3 font-bold rounded-xl text-sm transition-colors cursor-pointer ${refundStatus.type === "success" ? "bg-green-500 hover:bg-green-600 text-white" : "bg-[#FF4747] hover:bg-[#e03e3e] text-white"}`}>
              {t("userDashboard.statusModal.dismiss")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
