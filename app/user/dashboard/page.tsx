"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredAuth, setStoredAuth, clearStoredAuth, ApiError } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { authService } from "@/app/utils/services/authService";
import { paymentService } from "@/app/utils/services/paymentService";
import { LogOut, Ticket, Calendar, Settings, Home, CheckCircle2, AlertCircle, X } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AttendeeDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("Attendee");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeStep, setUpgradeStep] = useState<"plan" | "payment" | "workspace">("plan");
  const [selectedPlan, setSelectedPlan] = useState<"FREE" | "BASIC" | "PREMIUM">("FREE");
  const [upgradeForm, setUpgradeForm] = useState({ workspaceName: "", type: "INDIVIDUAL" });
  const [upgradeCardForm, setUpgradeCardForm] = useState({ number: "", expiry: "", cvc: "", name: "" });
  const [upgradePaymentMethod, setUpgradePaymentMethod] = useState<"stripe" | "mtn_mobile_money" | "orange_money">("stripe");
  const [upgradePhone, setUpgradePhone] = useState("");
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  
  const [isOrganizer, setIsOrganizer] = useState(false);

  const [activeTab, setActiveTab] = useState("overview"); // overview, tickets, saved, settings
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

  const handleRefund = async (ticket: any) => {
    setRefundConfirmTicket(ticket);
  };

  const confirmRefundProcess = async (ticket: any) => {
    setRefundConfirmTicket(null);
    if (ticket.isPastEvent) {
      setRefundStatus({
        type: "error",
        title: "Refund Not Available",
        message: "This event has already ended. Refunds are not available after the event date."
      });
      return;
    }
    const ticketOrderId = ticket.orderId || ticket.id;
    setRefundLoadingId(ticketOrderId);
    try {
      // 1. Fetch payments to find the one matching this order ID
      const payments = await paymentService.getPaymentsByOrderId(ticketOrderId);
      const payment = (payments || [])[0];
      
      if (!payment) {
        throw new Error("No payment record found for this order. Refund cannot be processed.");
      }
      
      // 2. Call the refund endpoint
      await paymentService.createRefund({
        paymentId: payment.paymentId,
        amount: payment.amount,
        reason: "Requested by attendee via dashboard",
        status: "SUCCESSFUL"
      });
      
      // 3. Update the order status to REFUNDED in ticketing-service
      await eventService.updateOrder(ticketOrderId, {
        ...ticket,
        status: "REFUNDED"
      });
      
      // 4. Refresh tickets list
      const auth = getStoredAuth();
      if (auth) {
        await fetchTickets(auth.userId);
      }
      
      setRefundStatus({
        type: "success",
        title: "Refund Successful",
        message: "Your ticket refund has been processed successfully. The funds will be credited to your original payment method shortly."
      });
    } catch (err: any) {
      console.error("Refund failed:", err);
      setRefundStatus({
        type: "error",
        title: "Refund Failed",
        message: err.message || "An unknown error occurred during the refund process."
      });
    } finally {
      setRefundLoadingId(null);
    }
  };

  const handleDeleteTicket = (ticket: any) => {
    setDeleteConfirmTicket(ticket);
  };

  const confirmDeleteProcess = async (ticket: any) => {
    setDeleteConfirmTicket(null);
    const ticketOrderId = ticket.orderId || ticket.id;
    setDeleteLoadingId(ticketOrderId);
    try {
      await eventService.deleteOrder(ticketOrderId);
      
      // Refresh tickets list
      const auth = getStoredAuth();
      if (auth) {
        await fetchTickets(auth.userId);
      }
      
      setRefundStatus({
        type: "success",
        title: "Ticket Deleted",
        message: "The ticket record has been permanently removed from your dashboard."
      });
    } catch (err: any) {
      console.error("Delete failed:", err);
      setRefundStatus({
        type: "error",
        title: "Delete Failed",
        message: err.message || "An unknown error occurred while deleting the ticket."
      });
    } finally {
      setDeleteLoadingId(null);
    }
  };

  const handleSyncPaymentStatus = async (ticket: any) => {
    const ticketOrderId = ticket.orderId || ticket.id;
    setSyncLoadingId(ticketOrderId);
    try {
      // 1. Fetch payments to find the one matching this order ID
      const payments = await paymentService.getPaymentsByOrderId(ticketOrderId);
      const payment = (payments || [])[0];
      
      if (!payment) {
        throw new Error("No payment record found for this order.");
      }
      
      // 2. Fetch the individual payment which triggers Stripe sync in the backend
      const updatedPayment = await paymentService.getPaymentById(payment.paymentId);
      
      // 3. Refresh tickets list
      const auth = getStoredAuth();
      if (auth) {
        await fetchTickets(auth.userId);
      }
      
      setRefundStatus({
        type: "success",
        title: "Status Synced",
        message: `Stripe payment status synced. Current status: ${updatedPayment.status}`
      });
    } catch (err: any) {
      console.error("Sync failed:", err);
      setRefundStatus({
        type: "error",
        title: "Sync Failed",
        message: err.message || "An unknown error occurred while syncing payment status."
      });
    } finally {
      setSyncLoadingId(null);
    }
  };

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      router.push("/login?from=/user/dashboard");
      return;
    }
    setUserName(auth.email?.split("@")[0] || "Attendee");
    if (auth.tenantId && auth.tenantId !== "") {
      setIsOrganizer(true);
    }
    fetchProfile(auth.userId);
    fetchTickets(auth.userId);
    fetchSavedEvents(auth.userId);

    // Pre-load plans for the upgrade modal
    import("@/app/utils/api").then(({ api }) =>
      api.get<any[]>("/api/v1/subscriptionplans", { skipAuth: true })
        .then((data) => setAvailablePlans(data || []))
        .catch(() => {})
    );

    // Open upgrade modal when redirected from pricing
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upgrade") === "1") {
        const planParam = (params.get("plan") || "FREE").toUpperCase();
        const validPlan = (["FREE", "BASIC", "PREMIUM"] as const).includes(planParam as any)
          ? (planParam as "FREE" | "BASIC" | "PREMIUM")
          : "FREE";
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
        const publishedEvents = (allEvents || []).filter((e: any) => e.status !== 'DRAFT');
        const attendedEventIds = new Set(myTickets.map((t: any) => t.eventId));
        const categoryScores: Record<string, number> = {};
        for (const ticket of myTickets) {
          try {
            const ev = publishedEvents.find((e: any) => e.eventId === ticket.eventId);
            if (ev?.categoryId) {
              categoryScores[ev.categoryId] = (categoryScores[ev.categoryId] || 0) + 1;
            }
          } catch {}
        }
        const scored = publishedEvents
          .filter((e: any) => !attendedEventIds.has(e.eventId))
          .map((e: any) => ({
            ...e,
            score: categoryScores[e.categoryId] || 0,
          }))
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
            eventData = {
              title: ev.title,
              date: startDate ? new Date(startDate).toLocaleDateString() : "Unknown Date",
              isPast: endDate ? new Date(endDate) < new Date() : false,
            };
            if (ev.tenantSlug) {
              try {
                const tn: any = await authService.getTenantBySlug(ev.tenantSlug);
                tenantData = { name: tn.name };
              } catch {}
            }
          }
        } catch {}

        let paymentStatus = "NO_PAYMENT";
        try {
          const payments = await paymentService.getPaymentsByOrderId(orderId);
          if (payments?.[0]) paymentStatus = payments[0].status;
        } catch {}

        return {
          ...order,
          eventTitle: eventData.title,
          eventDate: eventData.date,
          isPastEvent: eventData.isPast,
          organizerName: tenantData.name,
          paymentStatus,
        };
      }));
      setMyTickets(enrichedOrders);
    } catch (e) {
      console.error("Failed to fetch tickets", e);
      if (e instanceof ApiError && e.status === 401) {
        setMyTickets([]);
      }
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchSavedEvents = async (userId: string) => {
    setSavedEventsLoading(true);
    try {
      const saved = await eventService.getSavedEventsByUser(userId);
      const enrichedSaved = await Promise.all((saved || []).map(async (item) => {
        let eventData = { title: "Unknown Event", date: "Unknown Date", imageUrl: "" };
        let tenantData = { name: "Unknown Organizer" };
        try { 
          if (item.eventId) { 
            const ev: any = await eventService.getEventById(item.eventId); 
            eventData = { 
              title: ev.title, 
              date: new Date(ev.startDate).toLocaleDateString(), 
              imageUrl: ev.imageUrl 
            }; 
          } 
        } catch(e) {}
        try {
          if (item.eventId) {
            const ev: any = await eventService.getEventById(item.eventId, { skipAuth: true });
            if (ev?.tenantSlug) {
              const tn: any = await authService.getTenantBySlug(ev.tenantSlug);
              tenantData = { name: tn.name };
            }
          }
        } catch {}
        return { ...item, eventTitle: eventData.title, eventDate: eventData.date, imageUrl: eventData.imageUrl, organizerName: tenantData.name };
      }));
      setSavedEvents(enrichedSaved);
    } catch (e) {
      console.error("Failed to fetch saved events", e);
    } finally {
      setSavedEventsLoading(false);
    }
  };

  const handleUnsave = async (savedEventId: string) => {
    try {
      await eventService.unsaveEvent(savedEventId);
      setSavedEvents(prev => prev.filter(e => e.id !== savedEventId));
    } catch(e) {
      console.error("Failed to unsave event", e);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const res: any = await authService.getUserById(userId);
      setProfileForm({ 
        firstName: res.firstName || "", 
        lastName: res.lastName || "", 
        phone: res.phone || "", 
        email: res.email || "",
        avatar: res.avatar || ""
      });
      if (res.firstName) setUserName(res.firstName);
    } catch (e) {
      console.error("Failed to fetch profile", e);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ type: "", text: "" });
    try {
      const auth = getStoredAuth();
      if (!auth) throw new Error("Not logged in");
      
      const payload: any = { ...profileForm };
      // Delete email from payload so it doesn't get overwritten or throw error
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
      setProfileMsg({ type: "", text: "" });
      const auth = getStoredAuth();
      if (!auth) return;
      
      // We assume authService.uploadUserAvatar returns { url: "..." } or similar
      const res: any = await authService.uploadUserAvatar(auth.userId, file);
      // Backend might return { avatarUrl: string } or { url: string } or just the string
      const newAvatar = res.avatarUrl || res.url || res.avatar || (typeof res === 'string' ? res : "");
      
      setProfileForm(prev => ({ ...prev, avatar: newAvatar }));
      setProfileMsg({ type: "success", text: "Avatar uploaded successfully!" });
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || "Failed to upload avatar" });
    }
  };

  const handleLogout = () => {
    clearStoredAuth();
    router.push("/login");
  };

  const PLAN_PRICES: Record<string, number> = { FREE: 0, BASIC: 29, PREMIUM: 99 };
  const PLAN_FEATURES: Record<string, string[]> = {
    FREE:    ["3 events", "100 attendees/event", "General listing only"],
    BASIC:   ["20 events", "1 000 attendees/event", "Up to 5 team members", "Paid events"],
    PREMIUM: ["Unlimited events", "Unlimited attendees", "Unlimited team members", "Custom domain", "Advanced branding"],
  };

  const openUpgradeModal = () => {
    if (!getStoredAuth()) {
      router.push("/login?from=/user/dashboard");
      return;
    }
    setUpgradeStep("plan");
    setSelectedPlan("FREE");
    setUpgradeForm({ workspaceName: "", type: "INDIVIDUAL" });
    setUpgradeCardForm({ number: "", expiry: "", cvc: "", name: "" });
    setUpgradePaymentMethod("stripe");
    setUpgradePhone("");
    setUpgradeError("");
    setShowUpgradeModal(true);
  };

  const handleUpgradeSubmit = async () => {
    setUpgradeError("");
    if (!upgradeForm.workspaceName.trim()) {
      setUpgradeError("Workspace name is required");
      return;
    }
    const auth = getStoredAuth();
    if (!auth) {
      router.push("/login?from=/user/dashboard");
      return;
    }

    setUpgradeLoading(true);
    try {
      const data = await authService.upgradeToOrganizer({
        workspaceName: upgradeForm.workspaceName,
        type: upgradeForm.type,
        planName: selectedPlan,
      });

      const tenantId = data.tenantId ? String(data.tenantId) : "";
      if (PLAN_PRICES[selectedPlan] > 0 && tenantId) {
        const matchedPlan = availablePlans.find(
          (p) => p.name?.toUpperCase() === selectedPlan || p.name?.toUpperCase().includes(selectedPlan)
        );
        if (matchedPlan?.planId) {
          await paymentService.createSubscription({
            tenantId,
            planId: matchedPlan.planId,
            amount: matchedPlan.price ?? PLAN_PRICES[selectedPlan],
            currency: "XAF",
            provider: upgradePaymentMethod,
          });
        }
      }

      setStoredAuth({
        token: data.token || auth.token,
        type: data.type || "Bearer",
        userId: String(data.userId || auth.userId),
        tenantId,
        email: data.email || auth.email || "",
        planTier: data.planTier || selectedPlan,
      });
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
    if (!upgradeForm.workspaceName.trim()) {
      setUpgradeError("Workspace name is required");
      return;
    }
    if (!getStoredAuth()) {
      router.push("/login?from=/user/dashboard");
      return;
    }
    if (PLAN_PRICES[selectedPlan] > 0) {
      setUpgradeStep("payment");
    } else {
      await handleUpgradeSubmit();
    }
  };

  const handleUpgradePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (upgradePaymentMethod !== "stripe" && upgradePhone.replace(/\D/g, "").length < 9) {
      setUpgradeError("Please enter a valid 9-digit phone number.");
      return;
    }
    setUpgradeError("");
    await handleUpgradeSubmit();
  };

  return (
    <div className="min-h-screen bg-[#ffffff] flex flex-col">
      <nav className="flex items-center justify-between px-10 py-5 bg-white border-b border-[#e5e7eb]">
        <Link href="/" className="font-display text-2xl font-black tracking-tight text-[#1a1a1a]">
          Yow<span className="text-[#EB4203]">Event</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-sm font-semibold text-[#555] hover:text-[#1a1a1a] flex items-center gap-1.5 transition-colors"
          >
            <Home size={16} /> Home
          </Link>
          {isOrganizer && (
            <Link
              href="/admin"
              className="text-sm font-semibold text-[#EB4203] hover:text-[#73684a] flex items-center gap-1.5 transition-colors"
            >
              💼 Switch to Organizer View
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="text-sm font-semibold text-[#555] hover:text-[#1a1a1a] flex items-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto p-10">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#1a1a1a] mb-2">
              Welcome back, {userName}!
            </h1>
            <p className="text-[#666] text-sm">Manage your tickets, saved events, and profile preferences.</p>
          </div>
          {activeTab !== "overview" && (
            <button 
              onClick={() => setActiveTab("overview")}
              className="px-4 py-2 bg-white border border-[#e5e7eb] rounded-xl text-sm font-semibold hover:bg-stone-50 transition-colors"
            >
              ← Back to Overview
            </button>
          )}
        </header>

        {activeTab === "overview" && (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              <div onClick={() => setActiveTab("tickets")} className="bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-[#1a1a1a] mb-4 group-hover:scale-110 transition-transform">
                  <Ticket size={24} />
                </div>
                <h3 className="font-bold text-[#1a1a1a] mb-1">My Tickets</h3>
                <p className="text-sm text-[#888]">View and download your purchased tickets.</p>
              </div>

              <div onClick={() => setActiveTab("saved")} className="bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-[#1a1a1a] mb-4 group-hover:scale-110 transition-transform">
                  <Calendar size={24} />
                </div>
                <h3 className="font-bold text-[#1a1a1a] mb-1">Saved Events</h3>
                <p className="text-sm text-[#888]">Events you have bookmarked for later.</p>
              </div>

              <div onClick={() => setActiveTab("settings")} className="bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-[#1a1a1a] mb-4 group-hover:scale-110 transition-transform">
                  <Settings size={24} />
                </div>
                <h3 className="font-bold text-[#1a1a1a] mb-1">Profile Settings</h3>
                <p className="text-sm text-[#888]">Manage your account details and preferences.</p>
              </div>
            </div>

            {(() => {
              const upcoming = myTickets
                .filter(t => !t.isPastEvent && t.status !== 'REFUNDED' && t.paymentStatus !== 'REFUNDED')
                .slice(0, 3);
              if (upcoming.length === 0) return null;
              return (
                <div className="mt-10">
                  <h2 className="font-display text-xl font-bold text-[#1a1a1a] mb-4">Upcoming Events</h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    {upcoming.map(t => (
                      <div key={t.orderId} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex flex-col gap-2 shadow-sm">
                        <p className="font-bold text-sm text-[#1a1a1a] line-clamp-2">{t.eventTitle}</p>
                        <p className="text-xs text-[#666]">{t.eventDate}</p>
                        <button
                          onClick={() => setActiveTab("tickets")}
                          className="mt-auto text-xs font-semibold text-[#EB4203] hover:underline text-left cursor-pointer"
                        >
                          View Ticket →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {recommendations.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-xl font-bold text-[#1a1a1a] mb-1">Recommended for You</h2>
                <p className="text-sm text-[#888] mb-4">Based on events you have attended</p>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {recommendations.map((ev: any) => (
                    <Link key={ev.eventId} href={`/events/${ev.eventId}`} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 hover:shadow-md transition-shadow block group">
                      <div className="w-full h-20 bg-gradient-to-br from-[#fffbeb] to-[#efe084] rounded-xl mb-3 group-hover:opacity-90 transition-opacity"></div>
                      <p className="font-bold text-sm text-[#1a1a1a] line-clamp-2 group-hover:text-[#EB4203] transition-colors">{ev.title}</p>
                      <p className="text-xs text-[#888] mt-1">{ev.status}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-12 bg-[#1a1a1a] rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-xl mb-2 text-[#F7E998]">Ready to host your own events?</h3>
                <p className="text-sm text-[#aaa] max-w-lg">
                  Upgrade to an Organizer account to start creating and managing your own events, selling tickets, and accessing analytics.
                </p>
              </div>
              <button
                onClick={openUpgradeModal}
                className="mt-6 md:mt-0 px-6 py-3 bg-[#EB4203] hover:bg-[#c23b02] text-white font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                Upgrade to Organizer
              </button>
            </div>
          </>
        )}

        {activeTab === "settings" && (
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-8 max-w-2xl">
            <h2 className="font-display text-2xl font-bold mb-6 text-[#1a1a1a]">Profile Settings</h2>
            
            {profileMsg.text && (
              <div className={`p-4 rounded-xl mb-6 text-sm ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {profileMsg.text}
              </div>
            )}

            <div className="mb-8 flex items-center gap-6">
              {profileForm.avatar ? (
                <img src={profileForm.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-[#e5e7eb]" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#ffffff] flex items-center justify-center text-[#888] font-bold text-2xl border-2 border-[#e5e7eb]">
                  {profileForm.firstName?.charAt(0) || "U"}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-[#1a1a1a] mb-2 cursor-pointer bg-stone-100 hover:bg-stone-200 px-4 py-2 rounded-lg transition-colors border border-stone-200 text-center">
                  Upload New Avatar
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
                <p className="text-xs text-[#888]">Recommended: Square image, max 2MB.</p>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-2">First Name</label>
                  <input 
                    value={profileForm.firstName}
                    onChange={e => setProfileForm({...profileForm, firstName: e.target.value})}
                    className="w-full px-4 py-3 border-[1.5px] rounded-xl text-sm bg-[#ffffff] outline-none border-[#e5e7eb] focus:bg-white focus:border-[#EB4203]" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-2">Last Name</label>
                  <input 
                    value={profileForm.lastName}
                    onChange={e => setProfileForm({...profileForm, lastName: e.target.value})}
                    className="w-full px-4 py-3 border-[1.5px] rounded-xl text-sm bg-[#ffffff] outline-none border-[#e5e7eb] focus:bg-white focus:border-[#EB4203]" 
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  value={profileForm.email}
                  disabled
                  className="w-full px-4 py-3 border-[1.5px] rounded-xl text-sm bg-stone-100 outline-none border-stone-200 text-stone-500 cursor-not-allowed" 
                />
                <p className="text-xs text-[#888] mt-1.5">Email address cannot be changed.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-2">Phone Number</label>
                <input 
                  value={profileForm.phone}
                  onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                  className="w-full px-4 py-3 border-[1.5px] rounded-xl text-sm bg-[#ffffff] outline-none border-[#e5e7eb] focus:bg-white focus:border-[#EB4203]" 
                />
              </div>

              <button 
                type="submit" 
                disabled={profileLoading}
                className="px-6 py-3 mt-4 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-all disabled:opacity-60"
              >
                {profileLoading ? "Saving Changes..." : "Save Changes"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "tickets" && (
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-8 min-h-[400px]">
            <h2 className="font-display text-2xl font-bold mb-6 text-[#1a1a1a]">My Tickets</h2>
            {ticketsLoading ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#888]">
                <div className="w-8 h-8 border-4 border-stone-200 border-t-[#EB4203] rounded-full animate-spin mb-4" />
                Loading your tickets...
              </div>
            ) : myTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#888] text-center">
                <Ticket size={48} className="text-[#F7E998] mb-4" />
                <p className="max-w-sm">You haven't purchased any tickets yet. Explore events and book your spot!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {myTickets.map((ticket, i) => (
                  <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-[#e5e7eb] rounded-xl hover:border-[#EB4203] transition-colors bg-[#ffffff]/30">
                    <div className="flex items-start gap-4 mb-4 md:mb-0">
                      <div className="w-12 h-12 rounded-lg bg-[#F7E998]/20 flex items-center justify-center text-[#EB4203] flex-shrink-0">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1a1a1a] text-lg">{ticket.eventTitle}</h3>
                        <p className="text-sm text-[#666] flex items-center gap-2 mt-1 font-medium">
                          <span className="text-[#EB4203] bg-[#EB4203]/10 px-2 py-0.5 rounded">By: {ticket.organizerName}</span>
                          <span>•</span>
                          {ticket.eventDate}
                        </p>
                        
                        {/* Status Explanations */}
                        {ticket.paymentStatus === 'PENDING' && (
                          <div className="text-xs text-amber-700 mt-3 bg-amber-50 border border-amber-100 p-3 rounded-xl max-w-md leading-relaxed animate-in fade-in duration-200">
                            ℹ️ <strong>Payment Pending:</strong> We are awaiting payment confirmation from Stripe. If you have already completed checkout, it may take a few moments for the confirmation webhook to synchronize.
                          </div>
                        )}
                        {ticket.paymentStatus === 'NO_PAYMENT' && (
                          <div className="text-xs text-stone-600 mt-3 bg-stone-50 border border-stone-200 p-3 rounded-xl max-w-md leading-relaxed animate-in fade-in duration-200">
                            ℹ️ <strong>No Payment Found:</strong> No billing transaction is registered for this ticket.
                          </div>
                        )}
                      </div>
                    </div>
                    {(ticket.status === 'COMPLETED' || ticket.status === 'PAID' || ticket.paymentStatus === 'SUCCESSFUL') && (
                      <div className="flex flex-col items-center justify-center px-4 border-l border-[#f0ebe1]">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`YOEVENT:ORDER:${ticket.orderId}`)}&bgcolor=ffffff&color=1a1a1a&margin=4`}
                          alt="Ticket QR"
                          className="w-20 h-20 rounded-lg"
                        />
                        <p className="text-[9px] text-[#888] mt-1 font-mono">SCAN AT ENTRY</p>
                      </div>
                    )}
                    <div className="flex flex-col items-end md:items-end gap-2">
                      {(() => {
                        const isRefunded = ticket.status === 'REFUNDED' || ticket.paymentStatus === 'REFUNDED';
                        const isUsed = ticket.status === 'USED' || ticket.isPastEvent;
                        const isPending = ticket.paymentStatus === 'PENDING' || (!isRefunded && !isUsed && ticket.status === 'PENDING');
                        const isPaid = !isPending && (ticket.paymentStatus === 'SUCCESSFUL' || ticket.status === 'COMPLETED' || ticket.status === 'PAID');
                        
                        let badgeClass = 'bg-stone-200 text-stone-600';
                        let badgeText = ticket.status || 'ACTIVE';
                        
                        if (isRefunded) {
                          badgeClass = 'bg-red-100 text-red-700';
                          badgeText = 'REFUNDED';
                        } else if (isUsed) {
                          badgeClass = 'bg-stone-100 text-stone-500 border border-stone-200';
                          badgeText = 'USED';
                        } else if (isPending) {
                          badgeClass = 'bg-amber-100 text-amber-700';
                          badgeText = 'PENDING';
                        } else if (isPaid) {
                          badgeClass = 'bg-green-100 text-green-700';
                          badgeText = 'PAID';
                        }
                        
                        return (
                          <span className={`px-3 py-1 text-xs font-bold rounded-md ${badgeClass}`}>
                            {badgeText}
                          </span>
                        );
                      })()}
                      <p className="text-sm font-semibold text-[#1a1a1a]">Order #{ticket.orderId?.substring(0, 8)}</p>
                      {(() => {
                        const isRefunded = ticket.status === 'REFUNDED' || ticket.paymentStatus === 'REFUNDED';
                        const isUsed = ticket.status === 'USED' || ticket.isPastEvent;
                        const isPending = ticket.paymentStatus === 'PENDING' || (!isRefunded && !isUsed && ticket.status === 'PENDING');
                        const isPaid = !isPending && (ticket.paymentStatus === 'SUCCESSFUL' || ticket.status === 'COMPLETED' || ticket.status === 'PAID');
                        
                        if (isRefunded || isUsed) {
                          return (
                            <button
                              onClick={() => handleDeleteTicket(ticket)}
                              className="mt-2 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                            >
                              Delete Ticket
                            </button>
                          );
                        } else if (isPending) {
                          return (
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => handleSyncPaymentStatus(ticket)}
                                disabled={syncLoadingId === (ticket.orderId || ticket.id)}
                                className="px-3 py-1.5 text-xs font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                              >
                                {syncLoadingId === (ticket.orderId || ticket.id) ? "Syncing..." : "Sync Stripe Status"}
                              </button>
                              <button
                                onClick={() => handleDeleteTicket(ticket)}
                                className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                              >
                                Delete Ticket
                              </button>
                            </div>
                          );
                        } else if (isPaid) {
                          return (
                            <button
                              onClick={() => handleRefund(ticket)}
                              disabled={refundLoadingId === (ticket.orderId || ticket.id)}
                              className="mt-2 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                            >
                              {refundLoadingId === (ticket.orderId || ticket.id) ? "Refunding..." : "Request Refund"}
                            </button>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-8 min-h-[400px]">
            <h2 className="font-display text-2xl font-bold mb-6 text-[#1a1a1a]">Saved Events</h2>
            {savedEventsLoading ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#888]">
                <div className="w-8 h-8 border-4 border-stone-200 border-t-[#EB4203] rounded-full animate-spin mb-4" />
                Loading your saved events...
              </div>
            ) : savedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#888] text-center">
                <Calendar size={48} className="text-[#F7E998] mb-4" />
                <p className="max-w-sm">You haven't bookmarked any events. Save events you are interested in to find them easily later.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {savedEvents.map((ev, i) => (
                  <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-[#e5e7eb] rounded-xl hover:border-[#EB4203] transition-colors bg-white">
                    <div className="flex items-start gap-4 mb-4 md:mb-0">
                      {ev.imageUrl ? (
                        <Link href={`/events/${ev.eventId}`}>
                          <img src={ev.imageUrl} alt={ev.eventTitle} className="w-16 h-16 rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity" />
                        </Link>
                      ) : (
                        <Link href={`/events/${ev.eventId}`}>
                          <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 cursor-pointer hover:bg-stone-200 transition-colors">
                            <Calendar size={24} />
                          </div>
                        </Link>
                      )}
                      <div>
                        <h3 className="font-bold text-[#1a1a1a] text-lg hover:text-[#EB4203] transition-colors cursor-pointer">
                          <Link href={`/events/${ev.eventId}`}>{ev.eventTitle}</Link>
                        </h3>
                        <p className="text-sm text-[#666] flex items-center gap-2 mt-1">
                          <span className="font-medium text-[#EB4203]">{ev.organizerName}</span>
                          <span>•</span>
                          {ev.eventDate}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUnsave(ev.id)}
                      className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Unsave Event
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full shadow-2xl relative overflow-hidden"
               style={{ maxWidth: upgradeStep === "plan" ? "640px" : "440px" }}>
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-5 right-5 text-[#888] hover:text-[#1a1a1a] z-10 cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* ── STEP 1: Plan selection ── */}
            {upgradeStep === "plan" && (
              <div className="p-8">
                <h2 className="font-display text-2xl font-bold tracking-tight mb-1">Choose your plan</h2>
                <p className="text-sm text-[#666] mb-6">Select the plan that fits your needs. You can upgrade anytime.</p>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {(["FREE", "BASIC", "PREMIUM"] as const).map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`rounded-2xl p-4 border-2 text-left transition-all cursor-pointer ${
                        selectedPlan === plan
                          ? "border-[#1a1a1a] bg-[#1a1a1a] text-white"
                          : "border-[#e5e7eb] bg-white text-[#1a1a1a] hover:border-[#EB4203]"
                      }`}
                    >
                      <div className="text-xs font-bold uppercase tracking-wider mb-2 opacity-60">{plan}</div>
                      <div className="text-2xl font-extrabold mb-3">
                        {PLAN_PRICES[plan] === 0 ? "Free" : `${Number(PLAN_PRICES[plan]).toLocaleString()} FCFA`}
                        {PLAN_PRICES[plan] > 0 && <span className="text-xs font-normal opacity-60">/mo</span>}
                      </div>
                      <ul className="space-y-1">
                        {PLAN_FEATURES[plan].map((f) => (
                          <li key={f} className="text-[10px] leading-snug opacity-80 flex items-start gap-1">
                            <span className="text-green-500 font-bold mt-px">✓</span> {f}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setUpgradeStep("workspace")}
                  className="w-full py-3.5 bg-[#1a1a1a] text-white rounded-full text-sm font-semibold hover:bg-[#333] transition-all cursor-pointer"
                >
                  Continue with {selectedPlan} →
                </button>
              </div>
            )}

            {/* ── STEP 2: Payment (paid plans only) ── */}
            {upgradeStep === "payment" && (
              <div className="p-8">
                <button type="button" onClick={() => setUpgradeStep("workspace")}
                  className="text-xs font-semibold text-[#EB4203] hover:underline mb-4 block cursor-pointer">
                  ← Back
                </button>
                <h2 className="font-display text-2xl font-bold tracking-tight mb-1">Payment</h2>
                <p className="text-sm text-[#666] mb-5">{selectedPlan} plan — {Number(PLAN_PRICES[selectedPlan]).toLocaleString()} FCFA/month</p>
                {upgradeError && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 mb-4">⚠️ {upgradeError}</div>
                )}

                <div className="space-y-3 mb-5">
                  {/* Card */}
                  <button type="button" onClick={() => setUpgradePaymentMethod("stripe")}
                    className={`w-full flex items-center gap-4 p-4 border-2 rounded-2xl text-left transition-colors cursor-pointer ${upgradePaymentMethod === "stripe" ? "border-[#635bff] bg-[#f5f5ff]" : "border-[#e5e7eb] hover:border-[#aaa]"}`}>
                    <div className="w-10 h-10 bg-[#635bff] rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0">S</div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-[#1a1a1a]">Credit / Debit Card</div>
                      <div className="text-xs text-[#666]">Visa, Mastercard — powered by Stripe</div>
                    </div>
                    {upgradePaymentMethod === "stripe" && <div className="w-4 h-4 rounded-full bg-[#635bff] shrink-0" />}
                  </button>

                  {/* MTN */}
                  <button type="button" onClick={() => setUpgradePaymentMethod("mtn_mobile_money")}
                    className={`w-full flex items-center gap-4 p-4 border-2 rounded-2xl text-left transition-colors cursor-pointer ${upgradePaymentMethod === "mtn_mobile_money" ? "border-[#ffcc00] bg-[#fffdf0]" : "border-[#e5e7eb] hover:border-[#ffcc00]/70"}`}>
                    <div className="w-10 h-10 bg-[#ffcc00] rounded-xl flex items-center justify-center font-black text-[10px] text-[#1a1a1a] shrink-0">MTN</div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-[#1a1a1a]">MTN Mobile Money</div>
                      <div className="text-xs text-[#666]">Pay via USSD push — works on all MTN numbers</div>
                    </div>
                    {upgradePaymentMethod === "mtn_mobile_money" && <div className="w-4 h-4 rounded-full bg-[#ffcc00] shrink-0" />}
                  </button>

                  {/* Orange */}
                  <button type="button" onClick={() => setUpgradePaymentMethod("orange_money")}
                    className={`w-full flex items-center gap-4 p-4 border-2 rounded-2xl text-left transition-colors cursor-pointer ${upgradePaymentMethod === "orange_money" ? "border-[#ff6600] bg-[#fff8f5]" : "border-[#e5e7eb] hover:border-[#ff6600]/70"}`}>
                    <div className="w-10 h-10 bg-[#ff6600] rounded-xl flex items-center justify-center font-black text-[10px] text-white shrink-0">OM</div>
                    <div className="flex-1">
                      <div className="font-bold text-sm text-[#1a1a1a]">Orange Money</div>
                      <div className="text-xs text-[#666]">Pay via USSD push — works on all Orange numbers</div>
                    </div>
                    {upgradePaymentMethod === "orange_money" && <div className="w-4 h-4 rounded-full bg-[#ff6600] shrink-0" />}
                  </button>
                </div>

                {/* Mobile phone input */}
                {(upgradePaymentMethod === "mtn_mobile_money" || upgradePaymentMethod === "orange_money") && (
                  <div className="mb-5">
                    <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">
                      {upgradePaymentMethod === "mtn_mobile_money" ? "MTN" : "Orange"} Phone Number
                    </label>
                    <div className="flex gap-2">
                      <div className="px-3 py-2.5 bg-[#ffffff] border border-[#e5e7eb] rounded-xl text-sm font-semibold text-[#555] shrink-0">+237</div>
                      <input
                        type="tel"
                        placeholder="6XXXXXXXX"
                        value={upgradePhone}
                        onChange={e => setUpgradePhone(e.target.value.replace(/\D/g, ""))}
                        maxLength={9}
                        className="flex-1 px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-[#ffffff] outline-none border-[#e5e7eb] focus:bg-white focus:border-[#EB4203]"
                      />
                    </div>
                    <p className="text-[10px] text-[#888] mt-1">Enter your 9-digit number without country code</p>
                  </div>
                )}

                <form onSubmit={handleUpgradePayment}>
                  <button
                    type="submit"
                    disabled={upgradeLoading}
                    className="w-full py-3.5 bg-[#1a1a1a] text-white rounded-full text-sm font-semibold hover:bg-[#333] transition-all cursor-pointer disabled:opacity-60"
                  >
                    {upgradeLoading ? "Processing..." : "Pay & Create Workspace"}
                  </button>
                </form>
              </div>
            )}

            {/* ── STEP 3: Workspace details ── */}
            {upgradeStep === "workspace" && (
              <div className="p-8">
                <button type="button" onClick={() => setUpgradeStep("plan")}
                  className="text-xs font-semibold text-[#EB4203] hover:underline mb-4 block cursor-pointer">
                  ← Back
                </button>
                <h2 className="font-display text-2xl font-bold tracking-tight mb-1">Set up your workspace</h2>
                <p className="text-sm text-[#666] mb-6">
                  Creating a <span className="font-bold text-[#1a1a1a]">{selectedPlan}</span> workspace.
                </p>
                {upgradeError && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 mb-4">⚠️ {upgradeError}</div>
                )}
                <form onSubmit={handleWorkspaceContinue} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Account Type</label>
                    <div className="flex bg-[#ffffff] rounded-xl p-1 border border-[#e5e7eb]">
                      {(["INDIVIDUAL", "ORGANIZATION"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setUpgradeForm(f => ({ ...f, type: t }))}
                          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${upgradeForm.type === t ? "bg-[#1a1a1a] text-white" : "text-[#555]"}`}
                        >
                          {t.charAt(0) + t.slice(1).toLowerCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">
                      {upgradeForm.type === "INDIVIDUAL" ? "Display Name" : "Organization Name"}
                    </label>
                    <input
                      value={upgradeForm.workspaceName}
                      onChange={(e) => setUpgradeForm(f => ({ ...f, workspaceName: e.target.value }))}
                      placeholder={upgradeForm.type === "INDIVIDUAL" ? "e.g. Jane Doe" : "e.g. Acme Events"}
                      className="w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-[#ffffff] outline-none border-[#e5e7eb] focus:bg-white focus:border-[#EB4203]"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={upgradeLoading}
                    className="w-full py-3.5 mt-2 bg-[#1a1a1a] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {upgradeLoading
                      ? "Creating workspace..."
                      : PLAN_PRICES[selectedPlan] > 0
                        ? "Continue to Payment →"
                        : "Create Free Workspace"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONFIRM REFUND MODAL */}
      {refundConfirmTicket && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative border border-[#e5e7eb] animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setRefundConfirmTicket(null)}
              className="absolute top-6 right-6 text-[#888] hover:text-[#1a1a1a] transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#1a1a1a] mb-4">Request Refund</h2>
            <div className="bg-[#ffffff] rounded-2xl p-5 mb-6 border border-[#e5e7eb]">
              <div className="text-xs font-bold text-[#EB4203] uppercase tracking-wider mb-1">Event</div>
              <div className="font-bold text-[#1a1a1a] text-base mb-3">{refundConfirmTicket.eventTitle}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Order ID</div>
                  <div className="font-semibold text-xs text-[#1a1a1a]">#{refundConfirmTicket.orderId?.substring(0, 8)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Amount</div>
                  <div className="font-semibold text-xs text-[#1a1a1a]">${refundConfirmTicket.totalAmount?.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#666] leading-relaxed mb-6">
              Are you sure you want to request a refund for this ticket? This action will invalidate your ticket registration.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setRefundConfirmTicket(null)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-[#1a1a1a] font-bold rounded-xl transition-colors border border-stone-200 cursor-pointer"
              >
                Keep Ticket
              </button>
              <button 
                onClick={() => confirmRefundProcess(refundConfirmTicket)}
                className="flex-1 py-3 bg-[#1a1a1a] hover:bg-[#333] text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deleteConfirmTicket && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative border border-[#e5e7eb] animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setDeleteConfirmTicket(null)}
              className="absolute top-6 right-6 text-[#888] hover:text-[#1a1a1a] transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            <h2 className="font-display text-2xl font-bold tracking-tight text-[#1a1a1a] mb-4">Delete Ticket</h2>
            <div className="bg-[#ffffff] rounded-2xl p-5 mb-6 border border-[#e5e7eb]">
              <div className="text-xs font-bold text-[#EB4203] uppercase tracking-wider mb-1">Event</div>
              <div className="font-bold text-[#1a1a1a] text-base mb-3">{deleteConfirmTicket.eventTitle}</div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Order ID</div>
                  <div className="font-semibold text-xs text-[#1a1a1a]">#{deleteConfirmTicket.orderId?.substring(0, 8)}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#888] uppercase tracking-wider">Amount</div>
                  <div className="font-semibold text-xs text-[#1a1a1a]">${deleteConfirmTicket.totalAmount?.toFixed(2)}</div>
                </div>
              </div>
            </div>
            <p className="text-xs text-[#666] leading-relaxed mb-6">
              Are you sure you want to delete this ticket? This action is permanent and will remove the ticket from your history.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirmTicket(null)}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-[#1a1a1a] font-bold rounded-xl transition-colors border border-stone-200 cursor-pointer"
              >
                Cancel
              </button>
              <button 
                onClick={() => confirmDeleteProcess(deleteConfirmTicket)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REFUND LOADING OVERLAY */}
      {refundLoadingId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center max-w-sm text-center">
            <div className="w-12 h-12 border-4 border-stone-200 border-t-[#EB4203] rounded-full animate-spin mb-4" />
            <h3 className="font-display font-bold text-lg text-[#1a1a1a] mb-1">Processing Refund</h3>
            <p className="text-xs text-[#666]">Connecting to Stripe. Please do not close this window.</p>
          </div>
        </div>
      )}

      {/* DELETE LOADING OVERLAY */}
      {deleteLoadingId && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center max-w-sm text-center">
            <div className="w-12 h-12 border-4 border-stone-200 border-t-red-600 rounded-full animate-spin mb-4" />
            <h3 className="font-display font-bold text-lg text-[#1a1a1a] mb-1">Deleting Ticket</h3>
            <p className="text-xs text-[#666]">Removing the order from your history...</p>
          </div>
        </div>
      )}

      {/* REFUND STATUS MODAL (SUCCESS/ERROR) */}
      {refundStatus && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative border border-[#e5e7eb] text-center animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setRefundStatus(null)}
              className="absolute top-6 right-6 text-[#888] hover:text-[#1a1a1a] transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
            
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6">
              {refundStatus.type === "success" ? (
                <div className="w-16 h-16 bg-green-50 text-green-600 rounded-full flex items-center justify-center border-2 border-green-200">
                  <CheckCircle2 size={36} />
                </div>
              ) : (
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center border-2 border-red-200">
                  <AlertCircle size={36} />
                </div>
              )}
            </div>

            <h2 className="font-display text-2xl font-black text-[#1a1a1a] mb-2">{refundStatus.title}</h2>
            
            {refundStatus.type === "error" ? (
              <div className="bg-red-50 text-red-700 text-xs p-4 rounded-xl border border-red-100 mb-6 text-left font-mono break-words leading-relaxed max-h-48 overflow-y-auto">
                {refundStatus.message}
              </div>
            ) : (
              <p className="text-sm text-[#555] leading-relaxed mb-6">
                {refundStatus.message}
              </p>
            )}

            <button 
              onClick={() => setRefundStatus(null)}
              className={`w-full py-3 font-bold rounded-xl transition-colors cursor-pointer ${
                refundStatus.type === "success" 
                  ? "bg-green-600 hover:bg-green-700 text-white" 
                  : "bg-[#1a1a1a] hover:bg-[#333] text-white"
              }`}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
