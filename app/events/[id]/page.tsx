"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getStoredAuth, clearStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { authService } from "@/app/utils/services/authService";
import { Calendar, MapPin, Users, Clock, Box, Navigation, Link2, X, CheckCircle2, Bookmark, Bell, Ticket, Star, ArrowRight, ArrowLeft, Tag, Eye, Info } from "lucide-react";
import dynamic from "next/dynamic";
import Footer from "@/components/Footer";

const EventMap = dynamic(() => import("@/components/EventMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-56 bg-[#ffffff] flex items-center justify-center rounded-2xl border border-[#e5e7eb] mt-4">
      <span className="text-xs text-[#666] font-medium">Loading Map...</span>
    </div>
  ),
});

import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentService } from "@/app/utils/services/paymentService";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "mock_key");

import Navbar from "@/components/Navbar";

export default function EventDetailsPage() {
  return (
    <Elements stripe={stripePromise}>
      <EventDetailsPageContent />
    </Elements>
  );
}

function EventDetailsPageContent() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const stripe = useStripe();
  const elements = useElements();

  const [auth, setAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [event, setEvent] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [volunteerApplications, setVolunteerApplications] = useState<any[]>([]);
  const [exhibitors, setExhibitors] = useState<any[]>([]);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [tenant, setTenant] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [registrationCount, setRegistrationCount] = useState<number | null>(null);

  // Feedback section states
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState<number | null>(null);
  const [sections, setSections] = useState<any[]>([]);

  // Checkout states
  const [showCheckout, setShowCheckout] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "mtn_mobile_money" | "orange_money">("stripe");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [mobileMoneyPaymentId, setMobileMoneyPaymentId] = useState<string | null>(null);
  const [mobileMoneyWaiting, setMobileMoneyWaiting] = useState(false);
  const [mobileMoneyError, setMobileMoneyError] = useState<string | null>(null);

  const [eventEndDate, setEventEndDate] = useState<Date | null>(null);
  const [eventSchedule, setEventSchedule] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  const [isSaved, setIsSaved] = useState(false);
  const [savedEventId, setSavedEventId] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  const [sponsorshipPackages, setSponsorshipPackages] = useState<any[]>([]);
  const [volunteerOpenings, setVolunteerOpenings] = useState<any[]>([]);
  const [showSponsorForm, setShowSponsorForm] = useState(false);
  const [showVolunteerForm, setShowVolunteerForm] = useState(false);
  const [sponsorForm, setSponsorForm] = useState({ companyName: "", contactName: "", email: "", phone: "", message: "", packageId: "", logoUrl: "" });
  const [volunteerForm, setVolunteerForm] = useState({ name: "", email: "", phone: "", skills: "", availability: "", photoUrl: "" });
  const [applicationMsg, setApplicationMsg] = useState<{ type: "success" | "error"; text: string; source?: "sponsor" | "volunteer" } | null>(null);
  const [appLoading, setAppLoading] = useState(false);

  useEffect(() => {
    setAuth(getStoredAuth());
    setMounted(true);

    if (!eventId) return;

    // Fetch event details
    const fetchEventData = async () => {
      const toArr = (d: any): any[] => Array.isArray(d) ? d : (d?.content ?? []);
      try {
        const eventsRaw = await eventService.getEvents({ skipAuth: true });
        const currentEvent = toArr(eventsRaw).find((e: any) => e.eventId === eventId);
        
        if (!currentEvent) {
          router.push("/events");
          return;
        }
        setEvent(currentEvent);

        // Fetch organizer profile
        if (currentEvent.tenantId) {
          authService.getTenantById(currentEvent.tenantId, { skipAuth: true })
            .then(setTenant)
            .catch(() => null);
        }

        // Fetch category
        if (currentEvent.categoryId) {
          eventService.getEventCategoryById(currentEvent.categoryId)
            .then(setCategory)
            .catch(() => null);
        }

        // Fetch registration count (does not affect page load state)
        eventService.getRegistrationsByEvent(eventId)
          .then((regs: any) => setRegistrationCount(toArr(regs).filter((r: any) => r.status !== "CANCELLED").length))
          .catch(() => null);

        // Fetch parallel data
        const [
          locsList,
          sessList,
          speakList,
          sponsList,
          exhibList,
          ticketsList,
          schedulesList,
          packagesList,
          sectionsList,
          feedbacksList,
          announcsList,
          volunteerOpeningsList,
          staffList,
          networkingsList,
        ] = await Promise.all([
          eventService.getEventLocations({ skipAuth: true }).catch(() => []),
          eventService.getSessions({ skipAuth: true }).catch(() => []),
          eventService.getSessionSpeakers({ skipAuth: true }).catch(() => []),
          eventService.getSponsors({ skipAuth: true }).catch(() => []),
          eventService.getExhibitors({ skipAuth: true }).catch(() => []),
          eventService.getTicketTypes(eventId, { skipAuth: true }).catch(() => []),
          eventService.getEventSchedules({ skipAuth: true }).catch(() => []),
          eventService.getSponsorshipPackages({ skipAuth: true }).catch(() => []),
          eventService.getEventSections(eventId, { skipAuth: true }).catch(() => []),
          eventService.getFeedbacks({ skipAuth: true }).catch(() => []),
          eventService.getAnnouncements({ skipAuth: true }).catch(() => []),
          eventService.getVolunteerOpenings({ skipAuth: true }).catch(() => []),
          eventService.getStaffByEvent(eventId, { skipAuth: true }).catch(() => []),
          eventService.getNetworkings().catch(() => []),
        ]);

        const schedule = toArr(schedulesList).find((s: any) => s.eventId === eventId);
        const endDt = currentEvent.endDate || schedule?.endDatetime;
        if (endDt) {
          setEventEndDate(new Date(endDt));
        }
        setEventSchedule(schedule || null);

        const authData = getStoredAuth();
        if (authData) {
          try {
            const userSaved = await eventService.getSavedEventsByUser(authData.userId);
            const savedItem = toArr(userSaved).find((s: any) => s.eventId === eventId);
            if (savedItem) {
              setIsSaved(true);
              setSavedEventId(savedItem.id);
            }
          } catch(e) {}
          try {
            const myRegs = await eventService.getMyRegistrations();
            const isReg = toArr(myRegs).some((r: any) => r.eventId === eventId && r.status !== "CANCELLED");
            setIsRegistered(isReg);
          } catch(e) {}
        }

        const filteredLocs = toArr(locsList).filter((l: any) => l.eventId === eventId);
        setLocations(filteredLocs);
        if (filteredLocs.length > 0) setSelectedLocationId(filteredLocs[0].locationId);

        const eventSessions = toArr(sessList).filter((s: any) => s.eventId === eventId);
        setSessions(eventSessions);

        const sessionIds = eventSessions.map((s: any) => s.sessionId);
        setSpeakers(toArr(speakList).filter((sp: any) => sessionIds.includes(sp.sessionId)));

        setSponsors(toArr(sponsList).filter((s: any) => s.eventId === eventId));
        setExhibitors(toArr(exhibList).filter((e: any) => e.eventId === eventId));
        setTicketTypes(toArr(ticketsList).filter((t: any) => t.eventId === eventId));
        setSponsorshipPackages(toArr(packagesList).filter((p: any) => p.eventId === eventId));
        setSections(toArr(sectionsList).filter((s: any) => s.eventId === eventId));
        setFeedbacks(toArr(feedbacksList).filter((f: any) => f.eventId === eventId));
        setAnnouncements(toArr(announcsList).filter((a: any) => a.eventId === eventId));
        setVolunteerOpenings(toArr(volunteerOpeningsList).filter((v: any) => v.eventId === eventId));
        setStaffMembers(toArr(staffList).filter((s: any) => String(s.eventId) === String(eventId)));
        setVolunteerApplications(toArr(networkingsList).filter((n: any) => n.eventId === eventId && n.role === "VOLUNTEER"));

      } catch (err) {
        console.error("Failed to load event data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [eventId, router]);

  useEffect(() => {
    if (!mobileMoneyWaiting || !mobileMoneyPaymentId) return;
    const interval = setInterval(async () => {
      try {
        const status = await paymentService.checkMobileMoneyStatus(mobileMoneyPaymentId);
        if (status.status === "SUCCESSFUL") {
          clearInterval(interval);
          setMobileMoneyWaiting(false);
          setOrderSuccess(true);
        } else if (status.status === "FAILED") {
          clearInterval(interval);
          setMobileMoneyWaiting(false);
          setMobileMoneyError("Payment was declined or timed out. Please try again.");
        }
      } catch (err) {
        console.error("Mobile money status check failed:", err);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [mobileMoneyWaiting, mobileMoneyPaymentId]);

  useEffect(() => {
    if (orderSuccess) {
      setIsRegistered(true);
    }
  }, [orderSuccess]);

  const isLoggedIn = mounted && auth !== null;
  const isEventOver = !!(eventEndDate && new Date() > eventEndDate);

  const isSponsorApplicationOpen = (() => {
    if (isEventOver) return false;
    const now = new Date();
    if (sponsorshipPackages.length === 0) return true;
    return sponsorshipPackages.some(p => {
      const afterStart = !p.applicationStart || now >= new Date(p.applicationStart);
      const beforeEnd = !p.applicationEnd || now <= new Date(p.applicationEnd);
      return afterStart && beforeEnd;
    });
  })();

  const isVolunteerApplicationOpen = (() => {
    if (isEventOver) return false;
    const now = new Date();
    if (volunteerOpenings.length === 0) return true;
    return volunteerOpenings.some(v => {
      const afterStart = !v.applicationStart || now >= new Date(v.applicationStart);
      const beforeEnd = !v.applicationEnd || now <= new Date(v.applicationEnd);
      return afterStart && beforeEnd;
    });
  })();

  const isRegistrationClosed = (() => {
    if (ticketTypes.length === 0) return isEventOver;
    const now = new Date();
    const hasActiveSale = ticketTypes.some(t => {
      const afterStart = !t.saleStart || now >= new Date(t.saleStart);
      const beforeEnd = !t.saleEnd || now <= new Date(t.saleEnd);
      return afterStart && beforeEnd;
    });
    return !hasActiveSale;
  })();

  // Checkout Handlers
  const handleQuantityChange = (ticketId: string, delta: number) => {
    setSelectedTickets(prev => {
      const current = prev[ticketId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [ticketId]: next };
    });
  };

  const calculateSubtotal = () => {
    return ticketTypes.reduce((sum, t) => {
      const qty = selectedTickets[t.ticketId] || 0;
      return sum + (t.price * qty);
    }, 0);
  };

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const coupons = await eventService.getCoupons();
      const valid = (coupons || []).find((c: any) => c.code === couponCode && c.eventId === eventId);
      if (valid) {
        setAppliedCoupon(valid);
        const discountType = valid.type || "PERCENTAGE";
        const val = parseFloat(valid.value) || 0;
        if (discountType === "PERCENTAGE") {
          alert(`Coupon applied: ${val}% off`);
        } else {
          alert(`Coupon applied: -${val.toLocaleString()} FCFA`);
        }
      } else {
        alert("Invalid coupon code");
        setAppliedCoupon(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    if (appliedCoupon) {
      const discountType = appliedCoupon.type || "PERCENTAGE";
      const val = parseFloat(appliedCoupon.value) || 0;
      if (discountType === "PERCENTAGE") {
        return subtotal * (1 - (val / 100));
      } else {
        return Math.max(0, subtotal - val);
      }
    }
    return subtotal;
  };

  const handleCheckoutSubmit = async () => {
    if (isRegistrationClosed) {
      alert("Ticket sales for this event have closed.");
      setShowCheckout(false);
      return;
    }
    if (!auth) {
      setShowLoginPrompt(true);
      return;
    }

    const totalQty = Object.values(selectedTickets).reduce((a,b) => a+b, 0);
    if (totalQty === 0) {
      alert("Please select at least one ticket.");
      return;
    }

    setIsProcessing(true);
    try {
      const subtotal = calculateSubtotal();
      const total = calculateTotal();
      const discount = subtotal - total;

      // 1. Create Order
      const order = await eventService.createOrder({
        tenantId: event.tenantId,
        userId: auth.userId,
        eventId: eventId,
        totalAmount: total,
        discountAmount: discount,
        status: "COMPLETED"
      });

      // 2. Create Order Items
      const itemPromises = ticketTypes.map(t => {
        const qty = selectedTickets[t.ticketId] || 0;
        if (qty > 0) {
          return eventService.createOrderItem({
            orderId: order.orderId || order.id,
            ticketTypeId: t.ticketId,
            quantity: qty,
            unitPrice: t.price,
            subtotal: t.price * qty
          });
        }
        return null;
      }).filter(Boolean);

      await Promise.all(itemPromises);

      // 2b. Create Registrations
      const regPromises: any[] = [];
      ticketTypes.forEach(t => {
        const qty = selectedTickets[t.ticketId] || 0;
        for (let i = 0; i < qty; i++) {
          regPromises.push(
            eventService.createRegistration({
              tenantId: event.tenantId,
              eventId: eventId,
              userId: auth.userId,
              ticketTypeId: t.ticketId,
              status: "CONFIRMED",
              qrCode: `YOEVENT:${eventId}:${auth.userId}:${Date.now()}_${t.ticketId}_${i}`,
            })
          );
        }
      });
      await Promise.all(regPromises);

      if (total <= 0) {
        setOrderSuccess(true);
        setIsProcessing(false);
        return;
      }

      // 3. Create Payment based on selected method
      if (paymentMethod === "stripe") {
        if (!stripe || !elements) {
          alert("Stripe has not loaded yet. Please try again.");
          setIsProcessing(false);
          return;
        }
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) {
          alert("Please fill in your credit card details.");
          setIsProcessing(false);
          return;
        }

        const paymentRes = await paymentService.createPayment({
          orderId: order.orderId || order.id,
          tenantId: event.tenantId,
          amount: total,
          currency: event.currency || "XAF",
          method: "card",
          provider: "stripe",
        });

        if (paymentRes.clientSecret) {
          if (paymentRes.clientSecret.startsWith("mock_")) {
            setOrderSuccess(true);
          } else {
            const { error: confirmError } = await stripe.confirmCardPayment(paymentRes.clientSecret, {
              payment_method: {
                card: cardElement,
              }
            });
            if (confirmError) {
              alert("Payment confirmation failed: " + confirmError.message);
              setIsProcessing(false);
              return;
            }
            setOrderSuccess(true);
          }
        } else {
          setOrderSuccess(true);
        }
      } else {
        if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 8) {
          alert("Please enter a valid 9-digit phone number.");
          setIsProcessing(false);
          return;
        }
        const paymentRes = await paymentService.createPayment({
          orderId: order.orderId || order.id,
          tenantId: event.tenantId,
          amount: total,
          currency: "XAF",
          method: "mobile_money",
          provider: paymentMethod,
          phoneNumber: `237${phoneNumber.replace(/\D/g, "")}`,
        });
        setMobileMoneyPaymentId(String(paymentRes.paymentId));
        setMobileMoneyWaiting(true);
      }
    } catch (err: any) {
      console.error(err);
      alert("Checkout failed: " + (err.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSaveEvent = async () => {
    if (!auth) {
      router.push("/login");
      return;
    }
    
    try {
      if (isSaved && savedEventId) {
        await eventService.unsaveEvent(savedEventId);
        setIsSaved(false);
        setSavedEventId(null);
      } else {
        const res = await eventService.saveEvent({ tenantId: event.tenantId, userId: auth.userId, eventId: event.eventId });
        setIsSaved(true);
        setSavedEventId(res.id);
      }
    } catch(e) {
      console.error("Failed to toggle save", e);
    }
  };

  const normalizePhone = (p: string) => (p || "").replace(/\D/g, "");
  const sameEmail = (a: string, b: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
  const samePhone = (a: string, b: string) => {
    const na = normalizePhone(a), nb = normalizePhone(b);
    return !!na && !!nb && na === nb;
  };

  const handleSponsorApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSponsorApplicationOpen) {
      alert("Sponsorship applications are closed.");
      return;
    }
    if (!sponsorForm.companyName || !sponsorForm.email) return;

    const alreadyApplied = sponsors.some(
      (s: any) => sameEmail(s.email, sponsorForm.email) || samePhone(s.phone, sponsorForm.phone)
    );
    if (alreadyApplied) {
      setApplicationMsg({ type: "error", text: "An application with this email or phone number has already been submitted for this event.", source: "sponsor" });
      return;
    }

    setAppLoading(true);
    setApplicationMsg(null);
    try {
      const created = await eventService.createSponsor({
        eventId,
        tenantId: event.tenantId,
        companyName: sponsorForm.companyName,
        contactName: sponsorForm.contactName,
        email: sponsorForm.email,
        phone: sponsorForm.phone,
        message: sponsorForm.message,
        packageId: sponsorForm.packageId || undefined,
        logoUrl: sponsorForm.logoUrl || undefined,
        status: "PENDING",
      });
      setSponsors((prev) => [...prev, created]);
      setApplicationMsg({ type: "success", text: "Your sponsorship application has been submitted! The organizer will contact you shortly.", source: "sponsor" });
      setShowSponsorForm(false);
      setSponsorForm({ companyName: "", contactName: "", email: "", phone: "", message: "", packageId: "", logoUrl: "" });
    } catch (err: any) {
      setApplicationMsg({ type: "error", text: "Failed to submit application. Please try again.", source: "sponsor" });
    } finally {
      setAppLoading(false);
    }
  };

  const handleVolunteerApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVolunteerApplicationOpen) {
      alert("Volunteer applications are closed.");
      return;
    }
    if (!volunteerForm.name || !volunteerForm.email) return;

    const alreadyApplied = volunteerApplications.some(
      (v: any) => sameEmail(v.email, volunteerForm.email) || samePhone(v.phone, volunteerForm.phone)
    );
    if (alreadyApplied) {
      setApplicationMsg({ type: "error", text: "An application with this email or phone number has already been submitted for this event.", source: "volunteer" });
      return;
    }

    setAppLoading(true);
    setApplicationMsg(null);
    try {
      const created = await eventService.createNetworking({
        eventId,
        tenantId: event.tenantId,
        name: volunteerForm.name,
        email: volunteerForm.email,
        phone: volunteerForm.phone,
        role: "VOLUNTEER",
        skills: volunteerForm.skills,
        availability: volunteerForm.availability,
        photoUrl: volunteerForm.photoUrl || undefined,
        status: "PENDING",
      });
      setVolunteerApplications((prev) => [...prev, created]);
      setApplicationMsg({ type: "success", text: "Your volunteer application has been submitted! We'll be in touch soon.", source: "volunteer" });
      setShowVolunteerForm(false);
      setVolunteerForm({ name: "", email: "", phone: "", skills: "", availability: "", photoUrl: "" });
    } catch (err: any) {
      setApplicationMsg({ type: "error", text: "Failed to submit application. Please try again.", source: "volunteer" });
    } finally {
      setAppLoading(false);
    }
  };


  const handlePostFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      alert("Please log in to leave feedback");
      router.push("/login");
      return;
    }

    if (newRating !== null && eventEndDate && new Date() < eventEndDate) {
      alert("Star ratings can only be submitted after the event ends. Please post a comment instead.");
      return;
    }

    try {
      const f = await eventService.createFeedback({
        eventId,
        userId: auth.userId,
        rating: newRating || undefined,
        comments: newComment,
      });
      setFeedbacks(prev => [f, ...prev]);
      setNewComment("");
      setNewRating(null);
    } catch (err: any) {
      alert(err.message || "Failed to post feedback");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ffffff] flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-[#e5e7eb] border-t-[#EB4203] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1a1a1a] overflow-x-hidden">
      <Navbar />

      {/* HERO BANNER */}
      <div className="relative bg-[#1a1a1a] overflow-hidden">
        {event.coverImage ? (
          <div className="absolute inset-0 opacity-40">
            <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#efe084] to-transparent"></div>
        )}
        <div className="relative max-w-7xl mx-auto px-16 py-24 md:py-32">
          <div className="mb-8">
            <button
              onClick={() => (window.history.length > 1 ? router.back() : router.push("/events"))}
              className="inline-flex items-center gap-2 text-white/70 hover:text-white text-sm font-semibold cursor-pointer transition-colors"
            >
              <ArrowLeft size={16} /> Back
            </button>
          </div>
          <span className="inline-block px-3 py-1 bg-[#EB4203] text-white text-xs font-bold rounded-full uppercase tracking-widest mb-6">
            {event.status}
          </span>
          {tenant && (
            <div className="flex items-center gap-2 mb-6">
              {tenant.logo ? (
                <img src={tenant.logo} alt={tenant.name} className="w-6 h-6 rounded-full object-cover border border-white/20" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px] font-bold">
                  {tenant.name.charAt(0)}
                </div>
              )}
              <span className="text-white/80 text-sm font-semibold">Hosted by {tenant.name}</span>
            </div>
          )}
          <div className="flex items-start justify-between gap-4 mb-6">
            <h1 className="font-display text-5xl md:text-7xl font-black text-white leading-tight max-w-4xl">
              {event.title}
            </h1>
            <button 
              onClick={toggleSaveEvent}
              className={`p-4 rounded-full border ${isSaved ? 'bg-[#F7E998] border-[#F7E998] text-[#1a1a1a]' : 'bg-transparent border-[#e5e7eb]/50 text-white hover:bg-white/10'} transition-all cursor-pointer shadow-lg`}
              title={isSaved ? "Unsave Event" : "Save Event"}
            >
              <Bookmark size={28} className={isSaved ? "fill-current" : ""} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {category?.name && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white/15 text-white text-xs font-bold rounded-full uppercase tracking-wider">
                <Tag size={12} /> {category.name}
              </span>
            )}
            {event.format && (
              <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full border border-white/30 uppercase tracking-wider">
                {event.format === "IN_PERSON" ? "In Person" : event.format === "VIRTUAL" ? "Virtual" : "Hybrid"}
              </span>
            )}
            {event.isPaid === false && (
              <span className="px-3 py-1 bg-green-500/80 text-white text-xs font-bold rounded-full uppercase tracking-wider">Free</span>
            )}
            {event.isPaid === true && event.currency && (
              <span className="px-3 py-1 bg-[#EB4203]/80 text-white text-xs font-bold rounded-full uppercase tracking-wider">Paid · {event.currency}</span>
            )}
            {event.maxCapacity != null && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white/15 text-white text-xs font-medium rounded-full">
                <Users size={12} /> {event.maxCapacity.toLocaleString()} capacity
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-6 text-[#F7E998] font-medium">
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              <span>
                {(event.startDate || eventSchedule?.startDatetime)
                  ? `${new Date(event.startDate || eventSchedule.startDatetime).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} — ${new Date(event.endDate || eventSchedule?.endDatetime || event.startDate || eventSchedule.startDatetime).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                  : "Date TBD"}
              </span>
            </div>
            {locations.length > 0 && (
              <div className="flex items-center gap-2">
                <MapPin size={18} />
                <span>{locations[0].type === "VIRTUAL" ? "Virtual Event" : locations[0].city || "Multiple Locations"}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {isEventOver && (
        <div className="max-w-7xl mx-auto px-16 pt-8">
          <div className="flex items-center gap-3 bg-[#1a1a1a] text-white px-6 py-4 rounded-2xl">
            <Clock size={18} className="text-[#F7E998] shrink-0" />
            <div>
              <span className="font-bold text-sm">This event has ended.</span>
              <span className="text-[#aaa] text-sm ml-2">You can still browse sessions, locations, and past announcements.</span>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-16 py-16 grid grid-cols-1 lg:grid-cols-3 gap-16">

        {/* LEFT CONTENT: About, Sessions */}
        <div className="lg:col-span-2 space-y-16">
          
          {/* ABOUT */}
          <section>
            <h2 className="font-display text-3xl font-black text-[#1a1a1a] mb-6">About This Event</h2>
            <div className="prose prose-lg text-[#555] leading-relaxed max-w-none">
              <p>{event.description || "No description provided."}</p>
            </div>
          </section>

          {/* VENUE PICKER */}
          {locations.length > 0 && (() => {
            const activeLoc = locations.find(l => l.locationId === selectedLocationId) || locations[0];
            const isVirtual = activeLoc.type === "VIRTUAL";
            const hasMap = !isVirtual && activeLoc.latitude != null && activeLoc.longitude != null;
            return (
              <section>
                <h2 className="font-display text-3xl font-black text-[#1a1a1a] mb-6 flex items-center gap-3">
                  <MapPin size={26} className="text-[#EB4203]" /> Venue
                </h2>

                {/* Location selector — only shown when there are multiple */}
                {locations.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {locations.map((loc) => {
                      const active = loc.locationId === selectedLocationId;
                      const label = loc.type === "VIRTUAL" ? (loc.virtualPlatform || "Online") : (loc.venueName || loc.city || "Venue");
                      return (
                        <button
                          key={loc.locationId}
                          onClick={() => setSelectedLocationId(loc.locationId)}
                          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all cursor-pointer ${active ? "border-[#EB4203] bg-[#fff4ef] text-[#EB4203]" : "border-[#e5e7eb] text-[#555] hover:border-[#EB4203]/50"}`}
                        >
                          {loc.type === "VIRTUAL" ? <Link2 size={13} /> : <MapPin size={13} />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Selected location detail card */}
                <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm">
                  {hasMap && (
                    <EventMap latitude={activeLoc.latitude} longitude={activeLoc.longitude} venueName={activeLoc.venueName} className="w-full h-72 z-10" />
                  )}
                  <div className="p-5 border-t border-[#e5e7eb] flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#fff4ef] flex items-center justify-center shrink-0 mt-0.5">
                      {isVirtual ? <Link2 size={18} className="text-[#EB4203]" /> : <MapPin size={18} className="text-[#EB4203]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#1a1a1a] text-sm">
                        {isVirtual ? (activeLoc.virtualPlatform || "Online Event") : activeLoc.venueName}
                      </div>
                      <div className="text-xs text-[#666] mt-0.5">
                        {isVirtual
                          ? <a href={activeLoc.virtualLink} target="_blank" rel="noopener noreferrer" className="text-[#EB4203] hover:underline break-all">{activeLoc.virtualLink}</a>
                          : [activeLoc.address, activeLoc.city, activeLoc.country].filter(Boolean).join(", ")}
                      </div>

                      {/* Info grid */}
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        <div className="bg-[#faf9f7] rounded-xl p-3 text-center">
                          <div className="text-lg font-black text-[#1a1a1a]">{ticketTypes.length}</div>
                          <div className="text-[10px] uppercase tracking-wider text-[#888] font-semibold mt-0.5">Ticket Types</div>
                          {ticketTypes.length > 0 && (
                            <div className="text-[10px] text-[#EB4203] font-semibold mt-1">
                              from {Math.min(...ticketTypes.map((t: any) => t.price ?? 0)).toLocaleString()} FCFA
                            </div>
                          )}
                        </div>
                        <div className="bg-[#faf9f7] rounded-xl p-3 text-center">
                          <div className="text-lg font-black text-[#1a1a1a]">{volunteerOpenings.length}</div>
                          <div className="text-[10px] uppercase tracking-wider text-[#888] font-semibold mt-0.5">Volunteer Roles</div>
                          {volunteerOpenings.length > 0 && (
                            <div className="text-[10px] text-green-600 font-semibold mt-1">
                              {volunteerOpenings.reduce((s: number, v: any) => s + (v.maxVolunteers || 0), 0)} slots
                            </div>
                          )}
                        </div>
                        <div className="bg-[#faf9f7] rounded-xl p-3 text-center">
                          <div className="text-lg font-black text-[#1a1a1a]">{sessions.length}</div>
                          <div className="text-[10px] uppercase tracking-wider text-[#888] font-semibold mt-0.5">Sessions</div>
                        </div>
                      </div>
                    </div>
                    {hasMap && (
                      <a href={`https://www.openstreetmap.org/?mlat=${activeLoc.latitude}&mlon=${activeLoc.longitude}#map=15/${activeLoc.latitude}/${activeLoc.longitude}`}
                        target="_blank" rel="noopener noreferrer"
                        className="shrink-0 flex items-center gap-1.5 px-4 py-2 border border-[#e5e7eb] rounded-xl text-xs font-semibold text-[#555] hover:border-[#EB4203] hover:text-[#EB4203] transition-colors">
                        <Navigation size={13} /> Open in Maps
                      </a>
                    )}
                  </div>
                </div>
              </section>
            );
          })()}

          {/* DYNAMIC EVENT SECTIONS */}
          {sections && sections.filter((s: any) => s.status !== "INACTIVE").length > 0 && (
            <div className="space-y-10">
              {[...sections]
                .filter((s: any) => s.status !== "INACTIVE")
                .sort((a: any, b: any) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                .map((sec: any) => {
                  const type = sec.sectionType || "CUSTOM";

                  // HERO
                  if (type === "HERO") return (
                    <section key={sec.sectionId || sec.id} className="relative rounded-3xl overflow-hidden shadow-md border border-[#e5e7eb]">
                      {sec.imageUrl && <img src={sec.imageUrl} alt={sec.title} className="w-full h-72 object-cover" />}
                      <div className={`${sec.imageUrl ? "absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-8" : "bg-[#1a1a1a] p-10"}`}>
                        <h2 className="font-display text-3xl font-black text-white mb-2">{sec.title}</h2>
                        {sec.content && <p className="text-white/80 leading-relaxed max-w-2xl">{sec.content}</p>}
                      </div>
                    </section>
                  );

                  // IMAGE_GALLERY
                  if (type === "IMAGE_GALLERY") return (
                    <section key={sec.sectionId || sec.id} className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden shadow-sm">
                      {sec.imageUrl && <img src={sec.imageUrl} alt={sec.title} className="w-full h-80 object-cover" />}
                      <div className="p-6">
                        <h3 className="font-display text-2xl font-black text-[#1a1a1a] mb-2">{sec.title}</h3>
                        {sec.content && <p className="text-[#555] leading-relaxed whitespace-pre-line">{sec.content}</p>}
                      </div>
                    </section>
                  );

                  // SPEAKERS — auto-pull from event speakers
                  if (type === "SPEAKERS") return (
                    <section key={sec.sectionId || sec.id}>
                      <h2 className="font-display text-2xl font-black text-[#1a1a1a] mb-1">{sec.title}</h2>
                      {sec.content && <p className="text-[#555] mb-6">{sec.content}</p>}
                      {speakers.length === 0 ? (
                        <p className="text-[#aaa] italic text-sm">No speakers listed yet.</p>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                          {speakers.map((sp: any) => (
                            <div key={sp.speakerId || sp.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 text-center shadow-sm">
                              {sp.photoUrl ? <img src={sp.photoUrl} alt={sp.name} className="w-16 h-16 rounded-full object-cover mx-auto mb-3 border-2 border-[#f0f0f0]" /> : <div className="w-16 h-16 rounded-full bg-[#FF4747]/10 flex items-center justify-center mx-auto mb-3 text-2xl font-black text-[#FF4747]">{(sp.name || "?")[0]}</div>}
                              <div className="font-bold text-sm text-[#1a1a1a]">{sp.name}</div>
                              {sp.title && <div className="text-xs text-[#FF4747] font-semibold mt-0.5">{sp.title}</div>}
                              {sp.company && <div className="text-xs text-[#888] mt-0.5">{sp.company}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );

                  // SCHEDULE — auto-pull sessions
                  if (type === "SCHEDULE") return (
                    <section key={sec.sectionId || sec.id}>
                      <h2 className="font-display text-2xl font-black text-[#1a1a1a] mb-1">{sec.title}</h2>
                      {sec.content && <p className="text-[#555] mb-6">{sec.content}</p>}
                      {sessions.length === 0 ? <p className="text-[#aaa] italic text-sm">No sessions scheduled yet.</p> : (
                        <div className="space-y-3">
                          {sessions.map((s: any) => (
                            <div key={s.sessionId || s.id} className="bg-white border border-[#e5e7eb] rounded-xl p-4 flex items-start gap-4 shadow-sm">
                              <div className="w-1 self-stretch rounded-full bg-[#EB4203] shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold text-sm text-[#1a1a1a]">{s.title}</div>
                                {s.description && <p className="text-xs text-[#888] mt-0.5 line-clamp-2">{s.description}</p>}
                                {(s.startTime || s.endTime) && <p className="text-xs text-[#aaa] mt-1">{s.startTime ? new Date(s.startTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : ""}{s.endTime ? ` – ${new Date(s.endTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}` : ""}</p>}
                              </div>
                              {s.type && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF4747]/10 text-[#FF4747] shrink-0">{s.type}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );

                  // SPONSORS
                  if (type === "SPONSORS") return (
                    <section key={sec.sectionId || sec.id}>
                      <h2 className="font-display text-2xl font-black text-[#1a1a1a] mb-1">{sec.title}</h2>
                      {sec.content && <p className="text-[#555] mb-6">{sec.content}</p>}
                      {sponsors.length === 0 ? <p className="text-[#aaa] italic text-sm">No sponsors listed yet.</p> : (
                        <div className="flex flex-wrap gap-4 items-center">
                          {sponsors.map((sp: any) => (
                            <div key={sp.sponsorId || sp.id} className="bg-white border border-[#e5e7eb] rounded-xl px-5 py-3 flex items-center gap-3 shadow-sm">
                              {sp.logoUrl && <img src={sp.logoUrl} alt={sp.name} className="h-8 object-contain" />}
                              <span className="font-semibold text-sm text-[#1a1a1a]">{sp.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </section>
                  );

                  // POLL
                  if (type === "POLL") return (
                    <section key={sec.sectionId || sec.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-8 shadow-sm">
                      <h2 className="font-display text-2xl font-black text-[#1a1a1a] mb-1">{sec.title}</h2>
                      {sec.content && <p className="text-[#555] mb-6">{sec.content}</p>}
                      <p className="text-[#aaa] italic text-sm">Polls will appear here once the event goes live.</p>
                    </section>
                  );

                  // REGISTRATION CTA
                  if (type === "REGISTRATION") return (
                    <section key={sec.sectionId || sec.id} className="bg-[#1a1a1a] rounded-3xl p-10 text-center shadow-md">
                      <h2 className="font-display text-3xl font-black text-white mb-3">{sec.title}</h2>
                      {sec.content && <p className="text-white/70 mb-6 max-w-lg mx-auto">{sec.content}</p>}
                      <button onClick={() => setShowCheckout(true)} className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#EB4203] text-white font-bold rounded-xl hover:bg-[#c73a00] transition-colors cursor-pointer text-sm">
                        Register Now →
                      </button>
                    </section>
                  );

                  // FAQ — parse Q: / A: pairs
                  if (type === "FAQ") {
                    const pairs: { q: string; a: string }[] = [];
                    if (sec.content) {
                      const blocks = sec.content.split(/\n\s*\n/);
                      for (const block of blocks) {
                        const lines = block.trim().split("\n");
                        const qLine = lines.find((l: string) => /^Q:/i.test(l.trim()));
                        const aLine = lines.find((l: string) => /^A:/i.test(l.trim()));
                        if (qLine) pairs.push({ q: qLine.replace(/^Q:\s*/i, ""), a: aLine ? aLine.replace(/^A:\s*/i, "") : "" });
                      }
                    }
                    return (
                      <section key={sec.sectionId || sec.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-8 shadow-sm">
                        <h2 className="font-display text-2xl font-black text-[#1a1a1a] mb-6">{sec.title}</h2>
                        {pairs.length > 0 ? (
                          <div className="divide-y divide-[#f0f0f0]">
                            {pairs.map((p, i) => (
                              <div key={i} className="py-4">
                                <p className="font-bold text-sm text-[#1a1a1a] mb-1">Q: {p.q}</p>
                                {p.a && <p className="text-sm text-[#555] leading-relaxed pl-4 border-l-2 border-[#FF4747]/30">{p.a}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[#555] leading-relaxed whitespace-pre-line">{sec.content}</p>
                        )}
                      </section>
                    );
                  }

                  // TEXT / CUSTOM (default)
                  return (
                    <section key={sec.sectionId || sec.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-8 shadow-sm">
                      <h3 className="font-display text-2xl font-black text-[#1a1a1a] mb-4">{sec.title}</h3>
                      {sec.imageUrl && <img src={sec.imageUrl} alt={sec.title} className="w-full h-64 object-cover rounded-xl mb-4 border border-[#e5e7eb]" />}
                      <p className="text-[#555] leading-relaxed whitespace-pre-line">{sec.content}</p>
                    </section>
                  );
                })}
            </div>
          )}

          {/* ANNOUNCEMENTS */}
          {announcements.length > 0 && (
            <section>
              <h2 className="font-display text-3xl font-black text-[#1a1a1a] mb-6 flex items-center gap-3">
                <Bell size={26} className="text-[#EB4203]" /> Announcements
              </h2>
              <div className="space-y-4">
                {[...announcements]
                  .sort((a: any, b: any) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0))
                  .map((ann: any) => (
                    <div
                      key={ann.announcementId}
                      className={`p-5 rounded-2xl border shadow-sm ${ann.isPinned ? "bg-amber-50 border-amber-200" : "bg-white border-[#e5e7eb]"}`}
                    >
                      {ann.isPinned && (
                        <span className="inline-block text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2">📌 Pinned</span>
                      )}
                      <h3 className="font-bold text-[#1a1a1a] mb-1">{ann.title}</h3>
                      <p className="text-sm text-[#555] leading-relaxed">{ann.content}</p>
                      {ann.publishedAt && (
                        <p className="text-[10px] text-[#aaa] mt-3">
                          {new Date(ann.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          )}

          {/* AGENDA */}
          <section>
            <h2 className="font-display text-3xl font-black text-[#1a1a1a] mb-6">Agenda & Sessions</h2>
            {sessions.length === 0 ? (
              <p className="text-[#666] italic">No sessions have been scheduled yet.</p>
            ) : (
              <div className="space-y-6">
                {sessions.map((session) => {
                  const sessionSpeakers = speakers.filter(sp => sp.sessionId === session.sessionId);
                  
                  return (
                    <div key={session.sessionId} className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                          <h3 className="font-display text-xl font-bold text-[#1a1a1a]">{session.title}</h3>
                          <div className="flex items-center gap-4 text-xs font-medium text-[#666] mt-2">
                            <span className="flex items-center gap-1"><Clock size={14} /> {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <span className="px-2 py-0.5 bg-[#ffffff] text-[#EB4203] rounded uppercase tracking-wider">{session.type}</span>
                          </div>
                        </div>
                      </div>
                      {session.description && (
                        <p className="text-sm text-[#555] mb-6">{session.description}</p>
                      )}
                      
                      {sessionSpeakers.length > 0 && (
                        <div className="pt-4 border-t border-[#f0ebe1]">
                          <h4 className="text-xs uppercase tracking-wider font-bold text-[#888] mb-3">Speakers</h4>
                          <div className="flex flex-wrap gap-4">
                            {sessionSpeakers.map((sp) => (
                              <div key={sp.id || sp.speakerId} className="flex items-center gap-3">
                                <img
                                  src={sp.photoUrl || sp.imageUrl || `https://api.dicebear.com/6.x/shapes/svg?seed=${sp.speakerId}`}
                                  className="w-9 h-9 rounded-full object-cover bg-[#f0ebe1] border border-[#e5e7eb]"
                                  alt={sp.name || sp.role || "Speaker"}
                                />
                                <div>
                                  <div className="text-sm font-bold text-[#1a1a1a]">{sp.name || sp.role || "Speaker"}</div>
                                  {(sp.title || sp.company) && (
                                    <div className="text-[10px] text-[#888]">
                                      {sp.title}{sp.title && sp.company && " at "}{sp.company}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="bg-white border border-[#e5e7eb] rounded-2xl p-8 shadow-sm">
            <h2 className="font-display text-2xl font-black text-[#1a1a1a] mb-3">Partner With Us</h2>
            <p className="text-[#666] text-sm leading-relaxed mb-6">
              Sponsoring this event puts your brand in front of a targeted, engaged audience. Connect with attendees, showcase your products, and be part of something meaningful.
            </p>
            {sponsorshipPackages.length > 0 && (
              <div className="grid sm:grid-cols-2 gap-4 mb-6">
                {sponsorshipPackages.map((pkg: any) => (
                  <div key={pkg.packageId || pkg.id} className="border border-[#e5e7eb] rounded-xl p-4 bg-[#faf9f7]">
                    <div className="font-bold text-sm text-[#1a1a1a] mb-1">{pkg.name}</div>
                    {pkg.price != null && <div className="text-[#EB4203] font-black text-lg mb-1">${pkg.price}</div>}
                    {pkg.description && <p className="text-xs text-[#666] leading-relaxed">{pkg.description}</p>}
                  </div>
                ))}
              </div>
            )}
            {!isSponsorApplicationOpen ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl text-sm text-[#888]">
                <Clock size={14} className="shrink-0" />
                <span>Sponsorship applications are closed.</span>
              </div>
            ) : (
              <button
                onClick={() => setShowSponsorForm(v => !v)}
                className="px-5 py-2.5 border-[1.5px] border-[#1a1a1a] text-[#1a1a1a] text-sm font-semibold rounded-xl hover:bg-[#1a1a1a] hover:text-white transition-colors cursor-pointer"
              >
                {showSponsorForm ? "Cancel" : "Apply as Sponsor"}
              </button>
            )}
            {isSponsorApplicationOpen && showSponsorForm && (
              <form onSubmit={handleSponsorApply} className="mt-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Company Name *</label>
                    <input
                      required
                      value={sponsorForm.companyName}
                      onChange={e => setSponsorForm(f => ({ ...f, companyName: e.target.value }))}
                      className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Contact Name</label>
                    <input
                      value={sponsorForm.contactName}
                      onChange={e => setSponsorForm(f => ({ ...f, contactName: e.target.value }))}
                      className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a]"
                    />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Email *</label>
                    <input
                      required
                      type="email"
                      value={sponsorForm.email}
                      onChange={e => setSponsorForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Phone</label>
                    <input
                      value={sponsorForm.phone}
                      onChange={e => setSponsorForm(f => ({ ...f, phone: e.target.value }))}
                      className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a]"
                    />
                  </div>
                </div>
                {sponsorshipPackages.length > 0 && (
                  <div>
                    <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Sponsorship Package</label>
                    <select
                      value={sponsorForm.packageId}
                      onChange={e => setSponsorForm(f => ({ ...f, packageId: e.target.value }))}
                      className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a]"
                    >
                      <option value="">Select a package (optional)</option>
                      {sponsorshipPackages.map((pkg: any) => (
                        <option key={pkg.packageId || pkg.id} value={pkg.packageId || pkg.id}>{pkg.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Company Logo</label>
                  <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-[#e5e7eb] rounded-xl p-5 cursor-pointer hover:border-[#EB4203] hover:bg-[#faf9f7] transition-colors group">
                    {sponsorForm.logoUrl ? (
                      <div className="flex flex-col items-center gap-3">
                        <img src={sponsorForm.logoUrl} alt="Logo preview" className="h-20 max-w-[200px] object-contain rounded-lg border border-[#e5e7eb]" />
                        <span className="text-xs text-[#EB4203] font-semibold">Click to change</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[#aaa] group-hover:text-[#EB4203] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                        <span className="text-xs font-semibold">Upload logo</span>
                        <span className="text-[10px]">PNG, JPG or SVG — max 2MB</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setAppLoading(true);
                          const res = await eventService.uploadImage(file);
                          setSponsorForm(f => ({ ...f, logoUrl: res.url }));
                        } catch (err: any) {
                          alert("Failed to upload logo: " + (err.message || err));
                        } finally {
                          setAppLoading(false);
                        }
                      }}
                    />
                  </label>
                  {sponsorForm.logoUrl && (
                    <button type="button" onClick={() => setSponsorForm(f => ({ ...f, logoUrl: "" }))} className="mt-1.5 text-xs text-red-500 hover:underline cursor-pointer">Remove logo</button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Message</label>
                  <textarea
                    rows={3}
                    value={sponsorForm.message}
                    onChange={e => setSponsorForm(f => ({ ...f, message: e.target.value }))}
                    className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a] resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={appLoading}
                  className="px-6 py-2.5 bg-[#1a1a1a] text-white text-sm font-bold rounded-xl hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {appLoading ? "Submitting..." : "Submit Application"}
                </button>
              </form>
            )}
          </section>

          {applicationMsg?.source === "sponsor" && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${applicationMsg.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
              <span className="flex-1">{applicationMsg.text}</span>
              <button onClick={() => setApplicationMsg(null)} className="shrink-0 cursor-pointer"><X size={16} /></button>
            </div>
          )}

          {/* TEAM */}
          {staffMembers.length > 0 && (() => {
            const activeLoc = locations.find(l => l.locationId === selectedLocationId);
            const locStaff = activeLoc
              ? staffMembers.filter((s: any) => s.locationId === activeLoc.locationId || s.locationId == null)
              : staffMembers;
            const roleColors: Record<string, string> = {
              ORGANIZER: "bg-purple-100 text-purple-700",
              HOST: "bg-blue-100 text-blue-700",
              COORDINATOR: "bg-indigo-100 text-indigo-700",
              MODERATOR: "bg-amber-100 text-amber-700",
              SECURITY: "bg-red-100 text-red-700",
              VOLUNTEER: "bg-green-100 text-green-700",
            };
            return (
              <section>
                <h2 className="font-display text-3xl font-black text-[#1a1a1a] mb-2 flex items-center gap-3">
                  <Users size={26} className="text-[#EB4203]" /> Meet the Team
                </h2>
                {locations.length > 1 && activeLoc && (
                  <p className="text-sm text-[#888] mb-6">
                    Showing team for <span className="font-semibold text-[#1a1a1a]">{activeLoc.venueName || activeLoc.virtualPlatform || activeLoc.city}</span>
                  </p>
                )}
                {locStaff.length === 0 ? (
                  <p className="text-[#888] italic text-sm">No team members listed for this location.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {locStaff.map((member: any) => {
                      const initials = (member.name || "?").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                      const roleKey = (member.role || "").toUpperCase().split(" ")[0];
                      const roleBadge = roleColors[roleKey] || "bg-[#f0ebe1] text-[#888]";
                      return (
                        <div key={member.staffId} className="bg-white border border-[#e5e7eb] rounded-2xl p-4 flex flex-col items-center text-center gap-2 shadow-sm hover:border-[#EB4203]/30 transition-colors">
                          <div className="w-14 h-14 rounded-full bg-[#fff4ef] flex items-center justify-center text-[#EB4203] font-black text-lg shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-[#1a1a1a] leading-tight">{member.name}</div>
                            {member.role && (
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${roleBadge}`}>
                                {member.role}
                              </span>
                            )}
                          </div>
                          {member.shiftStart && (
                            <div className="text-[10px] text-[#aaa] flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(member.shiftStart).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {member.shiftEnd && <> – {new Date(member.shiftEnd).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })()}

          <section className="bg-white border border-[#e5e7eb] rounded-2xl p-8 shadow-sm">
            <h2 className="font-display text-2xl font-black text-[#1a1a1a] mb-3">Get Involved as a Volunteer</h2>
            <p className="text-[#666] text-sm leading-relaxed mb-6">
              Join our volunteer team and help make this event an unforgettable experience. Whether you have a few hours or the whole day, we welcome all skills and levels of commitment.
            </p>
            {!isVolunteerApplicationOpen ? (
              <div className="flex items-center gap-2 px-4 py-3 bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl text-sm text-[#888]">
                <Clock size={14} className="shrink-0" />
                <span>Volunteer applications are closed.</span>
              </div>
            ) : (
              <button
                onClick={() => setShowVolunteerForm(v => !v)}
                className="px-5 py-2.5 border-[1.5px] border-[#1a1a1a] text-[#1a1a1a] text-sm font-semibold rounded-xl hover:bg-[#1a1a1a] hover:text-white transition-colors cursor-pointer"
              >
                {showVolunteerForm ? "Cancel" : "Apply to Volunteer"}
              </button>
            )}
            {isVolunteerApplicationOpen && showVolunteerForm && (
              <form onSubmit={handleVolunteerApply} className="mt-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Full Name *</label>
                    <input
                      required
                      value={volunteerForm.name}
                      onChange={e => setVolunteerForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Email *</label>
                    <input
                      required
                      type="email"
                      value={volunteerForm.email}
                      onChange={e => setVolunteerForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Phone</label>
                  <input
                    value={volunteerForm.phone}
                    onChange={e => setVolunteerForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Your Photo</label>
                  <label className="flex items-center gap-5 border-2 border-dashed border-[#e5e7eb] rounded-xl p-4 cursor-pointer hover:border-[#EB4203] hover:bg-[#faf9f7] transition-colors group">
                    {volunteerForm.photoUrl ? (
                      <img src={volunteerForm.photoUrl} alt="Photo preview" className="w-16 h-16 rounded-full object-cover border-2 border-[#e5e7eb] shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-[#ffffff] flex items-center justify-center text-[#aaa] group-hover:text-[#EB4203] transition-colors shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-[#1a1a1a]">{volunteerForm.photoUrl ? "Click to change photo" : "Upload a profile photo"}</p>
                      <p className="text-xs text-[#888] mt-0.5">PNG or JPG — max 2MB</p>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          setAppLoading(true);
                          const res = await eventService.uploadImage(file);
                          setVolunteerForm(f => ({ ...f, photoUrl: res.url }));
                        } catch (err: any) {
                          alert("Failed to upload photo: " + (err.message || err));
                        } finally {
                          setAppLoading(false);
                        }
                      }}
                    />
                  </label>
                  {volunteerForm.photoUrl && (
                    <button type="button" onClick={() => setVolunteerForm(f => ({ ...f, photoUrl: "" }))} className="mt-1.5 text-xs text-red-500 hover:underline cursor-pointer">Remove photo</button>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Skills / Expertise</label>
                  <textarea
                    rows={3}
                    value={volunteerForm.skills}
                    onChange={e => setVolunteerForm(f => ({ ...f, skills: e.target.value }))}
                    className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a] resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Availability</label>
                  <input
                    value={volunteerForm.availability}
                    onChange={e => setVolunteerForm(f => ({ ...f, availability: e.target.value }))}
                    placeholder="e.g. Full day, Morning only, Setup day"
                    className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={appLoading}
                  className="px-6 py-2.5 bg-[#1a1a1a] text-white text-sm font-bold rounded-xl hover:bg-[#333] transition-colors cursor-pointer disabled:opacity-50"
                >
                  {appLoading ? "Submitting..." : "Submit Application"}
                </button>
              </form>
            )}
          </section>

          {applicationMsg?.source === "volunteer" && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${applicationMsg.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
              <span className="flex-1">{applicationMsg.text}</span>
              <button onClick={() => setApplicationMsg(null)} className="shrink-0 cursor-pointer"><X size={16} /></button>
            </div>
          )}

          {/* ATTENDEE FEEDBACK & COMMENTS */}
          <section className="bg-white border border-[#e5e7eb] rounded-2xl p-8 shadow-sm">
            <h2 className="font-display text-3xl font-black text-[#1a1a1a] mb-2">Feedback &amp; Comments</h2>
            <p className="text-sm text-[#888] mb-6">Share your thoughts on this event. Star ratings are available after the event ends.</p>

            {/* Redirect banner for Q&A / Polls */}
            {auth && (
              <div className="flex items-start gap-4 p-4 mb-6 bg-gradient-to-r from-[#FF4747]/5 to-transparent border border-[#FF4747]/20 rounded-2xl">
                <div className="w-9 h-9 rounded-xl bg-[#FF4747]/10 flex items-center justify-center shrink-0">
                  <Bell size={16} className="text-[#FF4747]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#1a1a1a] mb-0.5">Looking for Q&amp;A or Live Polls?</p>
                  <p className="text-xs text-[#888] mb-2">If you hold a ticket for this event, head to your dashboard to participate in live polls and post questions.</p>
                  <Link
                    href="/user/dashboard"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FF4747] hover:underline"
                  >
                    Go to My Dashboard <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            )}

            {/* Feedback form */}
            <form onSubmit={handlePostFeedback} className="space-y-4 mb-8">
              <div>
                <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1">Feedback Type</label>
                <div className="flex gap-4 text-xs font-medium mt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="ratingType"
                      checked={newRating === null}
                      onChange={() => setNewRating(null)}
                    />
                    Comment only
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="ratingType"
                      checked={newRating !== null}
                      onChange={() => setNewRating(5)}
                    />
                    Star Review (Requires ended event)
                  </label>
                </div>
              </div>

              {newRating !== null && (
                <div>
                  <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Rating (1 to 5 Stars)</label>
                  {eventEndDate && new Date() < eventEndDate ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 leading-relaxed font-semibold">
                      ⚠️ Star ratings are locked until the event ends. You can post a comment instead.
                    </div>
                  ) : (
                    <div className="flex gap-2 text-xl cursor-pointer">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          onClick={() => setNewRating(star)}
                          className={star <= (newRating || 0) ? "text-amber-500" : "text-zinc-300"}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Your Message</label>
                <textarea
                  rows={3}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Write your feedback or comment..."
                  className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a] resize-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-[#1a1a1a] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-colors cursor-pointer"
              >
                Submit Feedback
              </button>
            </form>

            {/* Existing feedback */}
            <div className="space-y-3 border-t border-[#f0ebe1] pt-6">
              {feedbacks.map((f) => (
                <div key={f.feedbackId || f.id} className="p-4 border border-[#e5e7eb] rounded-xl bg-[#faf9f7]">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] uppercase font-bold text-[#888]">Attendee Review</span>
                    {f.rating && (
                      <div className="text-amber-500 text-xs">
                        {"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-[#1a1a1a] leading-relaxed">{f.comments || f.comment}</p>
                </div>
              ))}
              {feedbacks.length === 0 && (
                <p className="text-[#666] italic text-sm">No comments or feedback yet. Be the first!</p>
              )}
            </div>
          </section>

          {/* REVIEWS & FEEDBACK */}
          {feedbacks.length > 0 && (() => {
            const rated = feedbacks.filter((f: any) => f.rating != null && f.rating > 0);
            const avgRating = rated.length > 0
              ? rated.reduce((s: number, f: any) => s + f.rating, 0) / rated.length
              : null;
            return (
              <section>
                <div className="flex items-end justify-between mb-6">
                  <h2 className="font-display text-3xl font-black text-[#1a1a1a]">Reviews</h2>
                  {avgRating && (
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-black text-[#1a1a1a]">{avgRating.toFixed(1)}</span>
                      <div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(i => (
                            <Star key={i} size={14} className={i <= Math.round(avgRating) ? "text-amber-400 fill-amber-400" : "text-[#ddd] fill-[#ddd]"} />
                          ))}
                        </div>
                        <div className="text-xs text-[#888] mt-0.5">{rated.length} rating{rated.length !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {feedbacks.map((f: any) => {
                    const rating = f.rating ?? 0;
                    const comment = f.comments || f.comment || "";
                    const initials = (f.attendeeName || f.userName || "A").split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <div key={f.feedbackId || f.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-9 h-9 rounded-full bg-[#fff4ef] flex items-center justify-center text-[#EB4203] font-black text-xs shrink-0">{initials}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-[#1a1a1a]">{f.attendeeName || f.userName || "Attendee"}</div>
                            <div className="text-[10px] text-[#aaa]">{f.type || "General"}</div>
                          </div>
                          {rating > 0 && (
                            <div className="flex gap-0.5 shrink-0">
                              {[1,2,3,4,5].map(i => (
                                <Star key={i} size={11} className={i <= rating ? "text-amber-400 fill-amber-400" : "text-[#ddd] fill-[#ddd]"} />
                              ))}
                            </div>
                          )}
                        </div>
                        {comment && <p className="text-sm text-[#555] leading-relaxed">{comment}</p>}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })()}

        </div>

        {/* RIGHT SIDEBAR: Registration, Location, Sponsors */}
        <div className="space-y-8">
          
          {/* REGISTRATION CARD */}
          <div className="bg-white border border-[#e5e7eb] rounded-3xl p-8 shadow-xl sticky top-24">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display text-2xl font-black text-[#1a1a1a]">Attend Event</h3>
              {isRegistered && (
                <span className="flex items-center gap-1 px-2.5 py-1 bg-[#e6fcf5] border border-[#c2f9e6] rounded-full text-[10px] text-[#0ca678] font-bold uppercase tracking-wide">
                  <CheckCircle2 size={10} className="text-[#0ca678]" /> Registered
                </span>
              )}
            </div>
            {isRegistered && (
              <div className="mb-4 p-3 bg-[#f4fbf7] border border-[#d3f4e4] rounded-xl flex items-start gap-2.5">
                <CheckCircle2 size={16} className="text-[#0ca678] mt-0.5 shrink-0" />
                <div className="text-xs text-[#2b8a3e] leading-relaxed">
                  <strong>Spot Secured:</strong> You already have a ticket for this event. Live polls are active for you!
                </div>
              </div>
            )}
            {ticketTypes.length > 0 && (
              <div className="mb-5 space-y-2 pt-1">
                {ticketTypes.slice(0, 3).map(t => (
                  <div key={t.ticketId} className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-1.5 text-[#555]">
                      <Ticket size={13} className="text-[#EB4203]" /> {t.name}
                    </span>
                    <span className="font-black text-[#EB4203]">
                      {t.price === 0 ? "Free" : `${Number(t.price).toLocaleString()} ${event.currency || "XAF"}`}
                    </span>
                  </div>
                ))}
                {ticketTypes.length > 3 && (
                  <p className="text-[10px] text-[#888]">+{ticketTypes.length - 3} more type{ticketTypes.length - 3 > 1 ? "s" : ""}</p>
                )}
                <div className="border-t border-[#f0f0f0] pt-1" />
              </div>
            )}
            {isRegistrationClosed ? (
              <>
                <p className="text-[#666] text-sm mb-4">
                  {isEventOver ? "This event has already ended." : "Ticket sales for this event have closed."}
                </p>
                <div className="w-full py-4 bg-[#e5e7eb] text-[#888] font-bold rounded-xl text-center text-sm">
                  Registration Closed
                </div>
              </>
            ) : event?.visibility === "INVITE_ONLY" ? (
              <div className="text-center py-3">
                <div className="text-3xl mb-2">✉️</div>
                <p className="font-semibold text-[#1a1a1a] text-sm mb-1">Invite-Only Event</p>
                <p className="text-xs text-[#888]">Check your email for an invitation from the organizer.</p>
              </div>
            ) : (
              <>
                <p className="text-[#666] text-sm mb-4">Secure your spot before tickets sell out.</p>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full py-4 bg-[#EB4203] hover:bg-[#c73a00] text-white font-bold rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  Register Now
                </button>
              </>
            )}
            <p className="text-center text-[10px] text-[#888] mt-4 uppercase tracking-widest font-semibold">
              Powered by YowEvent Ticketing
            </p>
          </div>

          {/* SCHEDULE CARD */}
          {eventSchedule && (
            <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 shadow-sm">
              <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-[#EB4203]" /> Schedule
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Clock size={14} className="text-[#EB4203] mt-0.5 shrink-0" />
                  <div>
                    <div className="font-semibold text-[#1a1a1a] text-xs uppercase tracking-wider mb-0.5">Starts</div>
                    <div className="text-[#444]">
                      {new Date(eventSchedule.startDatetime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </div>
                  </div>
                </div>
                {eventSchedule.endDatetime && (
                  <div className="flex items-start gap-3">
                    <Clock size={14} className="text-[#888] mt-0.5 shrink-0" />
                    <div>
                      <div className="font-semibold text-[#1a1a1a] text-xs uppercase tracking-wider mb-0.5">Ends</div>
                      <div className="text-[#444]">
                        {new Date(eventSchedule.endDatetime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>
                  </div>
                )}
                {eventSchedule.timezone && (
                  <div className="text-[10px] text-[#aaa] pl-5">{eventSchedule.timezone}</div>
                )}
              </div>
            </div>
          )}

          {/* EVENT DETAILS CARD */}
          <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 shadow-sm">
            <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
              <Info size={18} className="text-[#EB4203]" /> Event Details
            </h3>
            <div className="space-y-3 text-sm">
              {category?.name && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#888]">
                    <Tag size={14} /> Category
                  </span>
                  <span className="font-semibold text-[#1a1a1a]">{category.name}</span>
                </div>
              )}
              {event.visibility && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#888]">
                    <Eye size={14} /> Visibility
                  </span>
                  <span className="font-semibold text-[#1a1a1a] capitalize">
                    {event.visibility.replace("_", " ").toLowerCase()}
                  </span>
                </div>
              )}
              {(registrationCount != null || event.maxCapacity != null) && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#888]">
                    <Users size={14} /> Registered
                  </span>
                  <span className="font-semibold text-[#1a1a1a]">
                    {registrationCount ?? 0}{event.maxCapacity != null ? ` / ${event.maxCapacity.toLocaleString()}` : ""}
                  </span>
                </div>
              )}
              {event.createdAt && (
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-[#888]">
                    <Calendar size={14} /> Published
                  </span>
                  <span className="font-semibold text-[#1a1a1a]">
                    {new Date(event.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* LOCATIONS */}
          {locations.length > 0 && (() => {
            const activeLoc = locations.find(l => l.locationId === selectedLocationId) || locations[0];
            const isVirtual = activeLoc.type === "VIRTUAL";
            return (
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 shadow-sm">
                <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                  <Navigation size={18} className="text-[#EB4203]" /> Venue
                </h3>

                {/* Pills */}
                {locations.length > 1 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {locations.map((loc) => {
                      const active = loc.locationId === selectedLocationId;
                      const label = loc.type === "VIRTUAL" ? (loc.virtualPlatform || "Online") : (loc.venueName || loc.city || "Venue");
                      return (
                        <button key={loc.locationId} onClick={() => setSelectedLocationId(loc.locationId)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${active ? "border-[#EB4203] bg-[#fff4ef] text-[#EB4203]" : "border-[#e5e7eb] text-[#666] hover:border-[#EB4203]/40"}`}>
                          {loc.type === "VIRTUAL" ? <Link2 size={11} /> : <MapPin size={11} />}
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Active location info */}
                <div className="space-y-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-[#fff4ef] flex items-center justify-center shrink-0">
                      {isVirtual ? <Link2 size={14} className="text-[#EB4203]" /> : <MapPin size={14} className="text-[#EB4203]" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#1a1a1a]">
                        {isVirtual ? (activeLoc.virtualPlatform || "Online Event") : activeLoc.venueName}
                      </div>
                      <div className="text-xs text-[#666] mt-0.5">
                        {isVirtual
                          ? <a href={activeLoc.virtualLink} target="_blank" rel="noopener noreferrer" className="text-[#EB4203] hover:underline break-all">{activeLoc.virtualLink}</a>
                          : [activeLoc.address, activeLoc.city, activeLoc.country].filter(Boolean).join(", ")}
                      </div>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div className="bg-[#faf9f7] rounded-xl p-2.5 text-center">
                      <div className="font-black text-[#1a1a1a] text-base">{ticketTypes.length}</div>
                      <div className="text-[9px] uppercase tracking-wider text-[#888] font-semibold">Tickets</div>
                      {ticketTypes.length > 0 && (
                        <div className="text-[9px] text-[#EB4203] font-bold mt-0.5">
                          from {Math.min(...ticketTypes.map((t: any) => t.price ?? 0)).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="bg-[#faf9f7] rounded-xl p-2.5 text-center">
                      <div className="font-black text-[#1a1a1a] text-base">{volunteerOpenings.length}</div>
                      <div className="text-[9px] uppercase tracking-wider text-[#888] font-semibold">Vol. Roles</div>
                    </div>
                    <div className="bg-[#faf9f7] rounded-xl p-2.5 text-center">
                      <div className="font-black text-[#1a1a1a] text-base">{sessions.length}</div>
                      <div className="text-[9px] uppercase tracking-wider text-[#888] font-semibold">Sessions</div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* SPONSORS & EXHIBITORS */}
          {(sponsors.length > 0 || exhibitors.length > 0) && (
            <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 shadow-sm">
              <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <Box size={18} className="text-[#EB4203]" /> Supported By
              </h3>
              
              {sponsors.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-[10px] uppercase tracking-wider font-bold text-[#888] mb-3">Sponsors</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {sponsors.map((s) => (
                      <div key={s.sponsorId} className="border border-[#f0ebe1] rounded-xl p-3 flex flex-col items-center justify-center gap-2 bg-[#faf9f7]">
                        {s.logo ? (
                          <img src={s.logo} alt={s.companyName} className="h-8 object-contain" />
                        ) : (
                          <div className="h-8 flex items-center justify-center font-bold text-xs text-[#888]">{s.companyName}</div>
                        )}
                        <span className="text-[9px] font-medium text-[#666] text-center line-clamp-1">{s.companyName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {exhibitors.length > 0 && (
                <div>
                  <h4 className="text-[10px] uppercase tracking-wider font-bold text-[#888] mb-3">Exhibitors</h4>
                  <div className="flex flex-wrap gap-2">
                    {exhibitors.map((e) => (
                      <span key={e.exhibitorId} className="px-3 py-1 bg-[#ffffff] text-[#555] text-[10px] font-bold rounded-full">
                        {e.companyName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      <Footer />

      {/* CHECKOUT MODAL */}
      {showLoginPrompt && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl relative">
            <button onClick={() => setShowLoginPrompt(false)} className="absolute top-5 right-5 text-[#aaa] hover:text-[#1a1a1a] cursor-pointer">
              <X size={20} />
            </button>
            <div className="w-12 h-12 rounded-2xl bg-[#FF4747]/10 flex items-center justify-center mb-5">
              <Ticket size={22} className="text-[#FF4747]" />
            </div>
            <h2 className="font-display text-2xl font-black text-[#1a1a1a] mb-2">Sign in to continue</h2>
            <p className="text-sm text-[#888] mb-6 leading-relaxed">You need an account to purchase tickets. It only takes a minute to sign up.</p>
            <div className="flex flex-col gap-3">
              <Link href={`/login?from=/events/${eventId}`} className="w-full py-3 bg-[#FF4747] text-white rounded-xl text-sm font-bold text-center hover:bg-[#e03e3e] transition-colors">
                Log in
              </Link>
              <Link href={`/register?from=/events/${eventId}`} className="w-full py-3 border-2 border-[#1a1a1a] text-[#1a1a1a] rounded-xl text-sm font-bold text-center hover:bg-[#f5f5f5] transition-colors">
                Create an account
              </Link>
            </div>
          </div>
        </div>
      )}

      {showCheckout && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#e5e7eb] flex items-center justify-between bg-[#fcfbf9]">
              <h2 className="font-display text-2xl font-black text-[#1a1a1a]">Checkout: {event.title}</h2>
              <button onClick={() => { setShowCheckout(false); setOrderSuccess(false); setClientSecret(null); setMobileMoneyWaiting(false); setMobileMoneyPaymentId(null); setMobileMoneyError(null); setPaymentMethod("stripe"); setPhoneNumber(""); }} className="p-2 hover:bg-[#ebe1cc] rounded-full transition-colors cursor-pointer text-[#666]">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
              {mobileMoneyWaiting ? (
                <div className="text-center py-12">
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl font-black"
                    style={{ background: paymentMethod === "mtn_mobile_money" ? "#ffcc00" : "#ff6600", color: paymentMethod === "mtn_mobile_money" ? "#1a1a1a" : "white" }}
                  >
                    {paymentMethod === "mtn_mobile_money" ? "MTN" : "OM"}
                  </div>
                  <h3 className="font-display text-2xl font-black text-[#1a1a1a] mb-3">Check Your Phone</h3>
                  <p className="text-[#666] mb-1 text-sm">A USSD prompt has been sent to</p>
                  <p className="text-[#1a1a1a] font-bold text-lg mb-2">+237 {phoneNumber}</p>
                  <p className="text-xs text-[#888] mb-8">Approve the payment on your phone to complete the transaction.</p>
                  <div className="flex items-center justify-center gap-2 text-[#888] text-sm mb-8">
                    <span className="inline-block w-2 h-2 rounded-full bg-[#EB4203] animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="inline-block w-2 h-2 rounded-full bg-[#EB4203] animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="inline-block w-2 h-2 rounded-full bg-[#EB4203] animate-bounce" style={{ animationDelay: "300ms" }} />
                    <span className="ml-2">Waiting for confirmation...</span>
                  </div>
                  {mobileMoneyError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                      {mobileMoneyError}
                    </div>
                  )}
                  <button
                    onClick={() => { setMobileMoneyWaiting(false); setMobileMoneyPaymentId(null); setMobileMoneyError(null); }}
                    className="text-sm text-[#888] hover:text-[#1a1a1a] underline cursor-pointer"
                  >
                    Cancel and try a different method
                  </button>
                </div>
              ) : orderSuccess ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={40} />
                  </div>
                  <h3 className="font-display text-3xl font-black text-[#1a1a1a] mb-3">Order Confirmed!</h3>
                  <p className="text-[#666] mb-8">Your tickets have been secured and sent to your email.</p>
                  <button 
                    onClick={() => { setShowCheckout(false); setOrderSuccess(false); setClientSecret(null); router.push("/admin"); }}
                    className="px-8 py-3 bg-[#1a1a1a] text-white font-bold rounded-xl hover:bg-[#333] transition-colors cursor-pointer"
                  >
                    Go to Dashboard
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider mb-4">Select Tickets</h3>
                  {ticketTypes.length === 0 ? (
                    <div className="text-sm text-[#666] italic mb-8">No tickets available for this event yet.</div>
                  ) : (
                    <div className="space-y-4 mb-8">
                      {ticketTypes.map(t => (
                        <div key={t.ticketId} className="flex items-center justify-between p-4 border border-[#e5e7eb] rounded-2xl bg-white shadow-sm hover:border-[#EB4203] transition-colors">
                          <div>
                            <div className="font-bold text-[#1a1a1a]">{t.name}</div>
                            <div className="text-xs text-[#666] mt-1 line-clamp-1">{t.description || "General admission ticket"}</div>
                            <div className="text-sm font-black text-[#EB4203] mt-2">{t.price === 0 ? "Free" : `${Number(t.price).toLocaleString()} FCFA`}</div>
                          </div>
                          <div className="flex items-center gap-3 bg-[#ffffff] p-1.5 rounded-xl">
                            <button onClick={() => handleQuantityChange(t.ticketId, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-[#1a1a1a] cursor-pointer hover:bg-[#ebe1cc]">-</button>
                            <span className="w-6 text-center font-bold text-[#1a1a1a]">{selectedTickets[t.ticketId] || 0}</span>
                            <button onClick={() => handleQuantityChange(t.ticketId, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-[#1a1a1a] cursor-pointer hover:bg-[#ebe1cc]">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-5 bg-[#ffffff] rounded-2xl border border-[#e5e7eb] mb-8">
                    <h3 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider mb-3">Discount Code</h3>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="Enter coupon code" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 bg-white border border-[#e5e7eb] rounded-xl px-4 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#EB4203]"
                      />
                      <button 
                        onClick={handleApplyCoupon}
                        className="px-5 py-2 bg-[#1a1a1a] text-white text-sm font-bold rounded-xl hover:bg-[#333] transition-colors cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {appliedCoupon && (
                      <div className="mt-3 text-xs font-bold text-green-600 flex items-center gap-1">
                        <CheckCircle2 size={14} /> Coupon "{appliedCoupon.code}" applied! (-{appliedCoupon.type === "FLAT" ? `${parseFloat(appliedCoupon.value).toLocaleString()} FCFA` : `${appliedCoupon.value}%`})
                      </div>
                    )}
                  </div>

                  {/* PAYMENT METHOD SELECTOR */}
                  {calculateTotal() > 0 && (
                    <div className="mb-8">
                      <h3 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider mb-4">Payment Method</h3>
                      <div className="space-y-3">
                        {/* Stripe */}
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("stripe")}
                          className={`w-full flex items-center gap-4 p-4 border-2 rounded-2xl text-left transition-colors cursor-pointer ${paymentMethod === "stripe" ? "border-[#635bff] bg-[#f5f5ff]" : "border-[#e5e7eb] hover:border-[#aaa]"}`}
                        >
                          <div className="w-10 h-10 bg-[#635bff] rounded-xl flex items-center justify-center text-white font-black text-xs shrink-0">S</div>
                          <div className="flex-1">
                            <div className="font-bold text-sm text-[#1a1a1a]">Credit / Debit Card</div>
                            <div className="text-xs text-[#666]">Visa, Mastercard — powered by Stripe</div>
                          </div>
                          {paymentMethod === "stripe" && <div className="w-4 h-4 rounded-full bg-[#635bff] shrink-0" />}
                        </button>

                        {/* MTN Mobile Money */}
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("mtn_mobile_money")}
                          className={`w-full flex items-center gap-4 p-4 border-2 rounded-2xl text-left transition-colors cursor-pointer ${paymentMethod === "mtn_mobile_money" ? "border-[#ffcc00] bg-[#fffdf0]" : "border-[#e5e7eb] hover:border-[#ffcc00]/70"}`}
                        >
                          <div className="w-10 h-10 bg-[#ffcc00] rounded-xl flex items-center justify-center font-black text-[10px] text-[#1a1a1a] shrink-0">MTN</div>
                          <div className="flex-1">
                            <div className="font-bold text-sm text-[#1a1a1a]">MTN Mobile Money</div>
                            <div className="text-xs text-[#666]">Pay via USSD push — works on all MTN numbers</div>
                          </div>
                          {paymentMethod === "mtn_mobile_money" && <div className="w-4 h-4 rounded-full bg-[#ffcc00] shrink-0" />}
                        </button>

                        {/* Orange Money */}
                        <button
                          type="button"
                          onClick={() => setPaymentMethod("orange_money")}
                          className={`w-full flex items-center gap-4 p-4 border-2 rounded-2xl text-left transition-colors cursor-pointer ${paymentMethod === "orange_money" ? "border-[#ff6600] bg-[#fff8f5]" : "border-[#e5e7eb] hover:border-[#ff6600]/70"}`}
                        >
                          <div className="w-10 h-10 bg-[#ff6600] rounded-xl flex items-center justify-center font-black text-[10px] text-white shrink-0">OM</div>
                          <div className="flex-1">
                            <div className="font-bold text-sm text-[#1a1a1a]">Orange Money</div>
                            <div className="text-xs text-[#666]">Pay via USSD push — works on all Orange numbers</div>
                          </div>
                          {paymentMethod === "orange_money" && <div className="w-4 h-4 rounded-full bg-[#ff6600] shrink-0" />}
                        </button>
                      </div>

                      {/* Stripe Credit Card inputs */}
                      {paymentMethod === "stripe" && (
                        <div className="mt-4 space-y-2">
                          <label className="block text-xs font-bold text-[#555] uppercase tracking-wider mb-1">
                            Card Details
                          </label>
                          <div className="border border-[#e5e7eb] rounded-xl px-4 py-3 bg-white">
                            <CardElement options={{ style: { base: { fontSize: "14px", color: "#1a1a1a", fontFamily: "inherit", "::placeholder": { color: "#aab7c4" } } } }} />
                          </div>
                          <p className="text-[10px] text-[#888] mt-1">Payments are processed instantly and secured by Stripe.</p>
                        </div>
                      )}

                      {/* Phone number input + refund notice for Mobile Money */}
                      {(paymentMethod === "mtn_mobile_money" || paymentMethod === "orange_money") && (
                        <div className="mt-4 space-y-3">
                          <div>
                            <label className="block text-xs font-bold text-[#555] uppercase tracking-wider mb-1.5">
                              {paymentMethod === "mtn_mobile_money" ? "MTN" : "Orange"} Phone Number
                            </label>
                            <div className="flex gap-2">
                              <div className="px-3 py-3 bg-[#ffffff] border border-[#e5e7eb] rounded-xl text-sm font-semibold text-[#555] shrink-0">+237</div>
                              <input
                                type="tel"
                                placeholder="6XXXXXXXX"
                                value={phoneNumber}
                                onChange={e => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                                maxLength={9}
                                className="flex-1 border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a]"
                              />
                            </div>
                            <p className="text-[10px] text-[#888] mt-1">Enter your 9-digit number without the country code</p>
                          </div>

                          {/* Refund policy notice */}
                          <div className="flex gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl">
                            <span className="text-amber-500 shrink-0 mt-0.5">⚠</span>
                            <div>
                              <p className="text-xs font-bold text-amber-800 mb-0.5">Refund Policy for Mobile Money</p>
                              <p className="text-[11px] text-amber-700 leading-relaxed">
                                Mobile Money payments <span className="font-semibold">cannot be refunded automatically</span>. If this event is cancelled, a refund will be processed manually to this number within <span className="font-semibold">3–5 business days</span>. For card payments, refunds are instant.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t border-[#e5e7eb] pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#666]">Subtotal</span>
                      <span className="font-bold text-[#1a1a1a]">{calculateSubtotal().toLocaleString()} FCFA</span>
                    </div>
                    {appliedCoupon && (
                      <div className="flex items-center justify-between mb-2 text-green-600">
                        <span>Discount</span>
                        <span className="font-bold">-{(calculateSubtotal() - calculateTotal()).toLocaleString()} FCFA</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed border-[#e5e7eb]">
                      <span className="text-lg font-black text-[#1a1a1a]">Total</span>
                      <span className="text-2xl font-black text-[#EB4203]">{calculateTotal().toLocaleString()} FCFA</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleCheckoutSubmit}
                    disabled={isProcessing}
                    className="w-full mt-8 py-4 bg-[#1a1a1a] text-white font-black text-lg rounded-xl hover:bg-[#333] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? "Processing..." : (calculateTotal() > 0 ? "Proceed to Payment" : "Get Free Ticket")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
