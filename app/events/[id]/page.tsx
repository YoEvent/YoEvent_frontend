"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getStoredAuth, clearStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { authService } from "@/app/utils/services/authService";
import { Calendar, MapPin, Users, Clock, Box, Navigation, Link2, X, CheckCircle2, Bookmark } from "lucide-react";
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
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentService } from "@/app/utils/services/paymentService";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "mock_key");

const StripeCheckoutForm = ({ onSuccess, total }: { onSuccess: () => void, total: number }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      alert(error.message);
      setIsProcessing(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <PaymentElement />
      <button 
        disabled={isProcessing || !stripe || !elements} 
        type="submit"
        className="px-8 py-3 bg-[#1a1a1a] text-white font-bold rounded-xl hover:bg-[#333] transition-colors cursor-pointer w-full mt-4 disabled:opacity-50"
      >
        {isProcessing ? "Processing..." : `Pay $${total.toFixed(2)}`}
      </button>
    </form>
  );
};

import Navbar from "@/components/Navbar";

export default function EventDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [auth, setAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data states
  const [event, setEvent] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [exhibitors, setExhibitors] = useState<any[]>([]);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);

  // Attendee Hub & Sections states
  const [activeHubTab, setActiveHubTab] = useState<"polls" | "qa" | "feedback">("polls");
  const [polls, setPolls] = useState<any[]>([]);
  const [qaQuestions, setQaQuestions] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newComment, setNewComment] = useState("");
  const [newRating, setNewRating] = useState<number | null>(null);
  const [sections, setSections] = useState<any[]>([]);

  // Checkout states
  const [showCheckout, setShowCheckout] = useState(false);
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

  const [isSaved, setIsSaved] = useState(false);
  const [savedEventId, setSavedEventId] = useState<string | null>(null);

  const [sponsorshipPackages, setSponsorshipPackages] = useState<any[]>([]);
  const [showSponsorForm, setShowSponsorForm] = useState(false);
  const [showVolunteerForm, setShowVolunteerForm] = useState(false);
  const [sponsorForm, setSponsorForm] = useState({ companyName: "", contactName: "", email: "", phone: "", message: "", packageId: "", logoUrl: "" });
  const [volunteerForm, setVolunteerForm] = useState({ name: "", email: "", phone: "", skills: "", availability: "", photoUrl: "" });
  const [applicationMsg, setApplicationMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [appLoading, setAppLoading] = useState(false);

  useEffect(() => {
    setAuth(getStoredAuth());
    setMounted(true);

    if (!eventId) return;

    // Fetch event details
    const fetchEventData = async () => {
      try {
        const eventsList = await eventService.getEvents({ skipAuth: true });
        const currentEvent = (eventsList || []).find((e: any) => e.eventId === eventId);
        
        if (!currentEvent) {
          router.push("/events");
          return;
        }
        setEvent(currentEvent);

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
          pollsList,
          qaList,
          feedbacksList,
        ] = await Promise.all([
          eventService.getEventLocations({ skipAuth: true }).catch(() => []),
          eventService.getSessions({ skipAuth: true }).catch(() => []),
          eventService.getSessionSpeakers({ skipAuth: true }).catch(() => []),
          eventService.getSponsors({ skipAuth: true }).catch(() => []),
          eventService.getExhibitors({ skipAuth: true }).catch(() => []),
          eventService.getTicketTypes({ skipAuth: true }).catch(() => []),
          eventService.getEventSchedules().catch(() => []),
          eventService.getSponsorshipPackages().catch(() => []),
          eventService.getEventSections(eventId).catch(() => []),
          eventService.getPolls().catch(() => []),
          eventService.getQaQuestions().catch(() => []),
          eventService.getFeedbacks().catch(() => []),
        ]);

        const schedule = (schedulesList || []).find((s: any) => s.eventId === eventId);
        if (schedule?.endDatetime) {
          setEventEndDate(new Date(schedule.endDatetime));
        }
        
        const authData = getStoredAuth();
        if (authData) {
          try {
            const userSaved = await eventService.getSavedEventsByUser(authData.userId);
            const savedItem = (userSaved || []).find((s: any) => s.eventId === eventId);
            if (savedItem) {
              setIsSaved(true);
              setSavedEventId(savedItem.id);
            }
          } catch(e) {}
        }

        setLocations((locsList || []).filter((l: any) => l.eventId === eventId));
        
        const eventSessions = (sessList || []).filter((s: any) => s.eventId === eventId);
        setSessions(eventSessions);

        // We need all speakers for these sessions
        const sessionIds = eventSessions.map((s: any) => s.sessionId);
        setSpeakers((speakList || []).filter((sp: any) => sessionIds.includes(sp.sessionId)));
        
        setSponsors((sponsList || []).filter((s: any) => s.eventId === eventId));
        setExhibitors((exhibList || []).filter((e: any) => e.eventId === eventId));
        setTicketTypes((ticketsList || []).filter((t: any) => t.eventId === eventId));
        setSponsorshipPackages((packagesList || []).filter((p: any) => p.eventId === eventId));
        setSections(sectionsList || []);
        setPolls((pollsList || []).filter((p: any) => p.eventId === eventId));
        setQaQuestions((qaList || []).filter((q: any) => q.eventId === eventId));
        setFeedbacks((feedbacksList || []).filter((f: any) => f.eventId === eventId));

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

  const isLoggedIn = mounted && auth !== null;

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
        alert(`Coupon applied: ${valid.discountValue}% off`);
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
      return subtotal * (1 - (appliedCoupon.discountValue / 100));
    }
    return subtotal;
  };

  const handleCheckoutSubmit = async () => {
    if (eventEndDate && new Date() > eventEndDate) {
      alert("Ticket sales for this event have closed.");
      setShowCheckout(false);
      return;
    }
    if (!auth) {
      alert("Please log in to purchase tickets.");
      router.push("/login");
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

      // 3. Create Payment based on selected method
      if (paymentMethod === "stripe") {
        const paymentRes = await paymentService.createPayment({
          orderId: order.orderId || order.id,
          tenantId: event.tenantId,
          amount: total,
          currency: "usd",
          method: "card",
          provider: "stripe",
        });
        if (paymentRes.clientSecret) {
          setClientSecret(paymentRes.clientSecret);
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
      alert("Please log in to save events");
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

  const handleSponsorApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sponsorForm.companyName || !sponsorForm.email) return;
    setAppLoading(true);
    setApplicationMsg(null);
    try {
      await eventService.createSponsor({
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
      setApplicationMsg({ type: "success", text: "Your sponsorship application has been submitted! The organizer will contact you shortly." });
      setShowSponsorForm(false);
      setSponsorForm({ companyName: "", contactName: "", email: "", phone: "", message: "", packageId: "", logoUrl: "" });
    } catch (err: any) {
      setApplicationMsg({ type: "error", text: "Failed to submit application. Please try again." });
    } finally {
      setAppLoading(false);
    }
  };

  const handleVolunteerApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!volunteerForm.name || !volunteerForm.email) return;
    setAppLoading(true);
    setApplicationMsg(null);
    try {
      await eventService.createNetworking({
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
      setApplicationMsg({ type: "success", text: "Your volunteer application has been submitted! We'll be in touch soon." });
      setShowVolunteerForm(false);
      setVolunteerForm({ name: "", email: "", phone: "", skills: "", availability: "", photoUrl: "" });
    } catch (err: any) {
      setApplicationMsg({ type: "error", text: "Failed to submit application. Please try again." });
    } finally {
      setAppLoading(false);
    }
  };

  const handleVotePoll = async (pollId: string, option: string) => {
    if (!auth) {
      alert("Please log in to vote in polls");
      router.push("/login");
      return;
    }
    try {
      await eventService.createPollResponse({
        pollId,
        userId: auth.userId,
        response: option,
      } as any);
      alert("Thank you for voting!");
    } catch (err: any) {
      alert(err.message || "Failed to submit vote");
    }
  };

  const handlePostQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      alert("Please log in to ask a question");
      router.push("/login");
      return;
    }
    try {
      const q = await eventService.createQaQuestion({
        eventId,
        questionText: newQuestion,
        userId: auth.userId,
        upvotes: 0,
      });
      setQaQuestions(prev => [q, ...prev]);
      setNewQuestion("");
    } catch (err: any) {
      alert(err.message || "Failed to post question");
    }
  };

  const handleUpvoteQuestion = async (qaId: string) => {
    try {
      const q = qaQuestions.find(item => (item.qaQuestionId || item.id) === qaId);
      if (q) {
        const updated = await eventService.updateQaQuestion(qaId, {
          ...q,
          upvotes: (q.upvotes || 0) + 1,
        });
        setQaQuestions(prev => prev.map(item => (item.qaQuestionId || item.id) === qaId ? updated : item));
      }
    } catch (err: any) {
      console.error(err);
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
          <span className="inline-block px-3 py-1 bg-[#EB4203] text-white text-xs font-bold rounded-full uppercase tracking-widest mb-6">
            {event.status}
          </span>
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
          <div className="flex flex-wrap items-center gap-6 text-[#F7E998] font-medium">
            <div className="flex items-center gap-2">
              <Calendar size={18} />
              <span>{new Date(event.startDate).toLocaleDateString()} — {new Date(event.endDate).toLocaleDateString()}</span>
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

          {/* CUSTOM EVENT SECTIONS */}
          {sections && sections.length > 0 && (
            <div className="space-y-12">
              {sections.map((section) => (
                <section key={section.sectionId || section.id} className="bg-white border border-[#e5e7eb] rounded-2xl p-8 shadow-sm">
                  <h3 className="font-display text-2xl font-black text-[#1a1a1a] mb-4">{section.title}</h3>
                  {section.imageUrl && (
                    <img src={section.imageUrl} alt={section.title} className="w-full h-64 object-cover rounded-xl mb-4 border border-[#e5e7eb]" />
                  )}
                  <p className="text-[#555] leading-relaxed whitespace-pre-line">{section.content}</p>
                </section>
              ))}
            </div>
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
                              <div key={sp.speakerId} className="flex items-center gap-3">
                                <img src={`https://api.dicebear.com/6.x/initials/svg?seed=${sp.speakerId}`} className="w-8 h-8 rounded-full bg-[#ffffff]" alt="Speaker" />
                                <div>
                                  <div className="text-sm font-bold text-[#1a1a1a]">User: {sp.speakerId.substring(0, 8)}</div>
                                  <div className="text-[10px] text-[#666]">{sp.role}</div>
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
            <button
              onClick={() => setShowSponsorForm(v => !v)}
              className="px-5 py-2.5 border-[1.5px] border-[#1a1a1a] text-[#1a1a1a] text-sm font-semibold rounded-xl hover:bg-[#1a1a1a] hover:text-white transition-colors cursor-pointer"
            >
              {showSponsorForm ? "Cancel" : "Apply as Sponsor"}
            </button>
            {showSponsorForm && (
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
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setSponsorForm(f => ({ ...f, logoUrl: ev.target?.result as string }));
                        reader.readAsDataURL(file);
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

          <section className="bg-white border border-[#e5e7eb] rounded-2xl p-8 shadow-sm">
            <h2 className="font-display text-2xl font-black text-[#1a1a1a] mb-3">Get Involved as a Volunteer</h2>
            <p className="text-[#666] text-sm leading-relaxed mb-6">
              Join our volunteer team and help make this event an unforgettable experience. Whether you have a few hours or the whole day, we welcome all skills and levels of commitment.
            </p>
            <button
              onClick={() => setShowVolunteerForm(v => !v)}
              className="px-5 py-2.5 border-[1.5px] border-[#1a1a1a] text-[#1a1a1a] text-sm font-semibold rounded-xl hover:bg-[#1a1a1a] hover:text-white transition-colors cursor-pointer"
            >
              {showVolunteerForm ? "Cancel" : "Apply to Volunteer"}
            </button>
            {showVolunteerForm && (
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
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = ev => setVolunteerForm(f => ({ ...f, photoUrl: ev.target?.result as string }));
                        reader.readAsDataURL(file);
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

          {applicationMsg && (
            <div className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${applicationMsg.type === "success" ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"}`}>
              <span className="flex-1">{applicationMsg.text}</span>
              <button onClick={() => setApplicationMsg(null)} className="shrink-0 cursor-pointer"><X size={16} /></button>
            </div>
          )}

          {/* ATTENDEE ENGAGEMENT HUB */}
          <section className="bg-white border border-[#e5e7eb] rounded-2xl p-8 shadow-sm">
            <h2 className="font-display text-3xl font-black text-[#1a1a1a] mb-6">Attendee Engagement Hub</h2>
            
            {/* Tabs */}
            <div className="flex gap-4 border-b border-[#f0ebe1] pb-3 mb-6">
              {[
                { id: "polls", label: "Live Polls" },
                { id: "qa", label: "Q&A Forum" },
                { id: "feedback", label: "Feedback & Comments" }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveHubTab(t.id as any)}
                  className={`px-4 py-2 text-sm font-bold border-none bg-transparent cursor-pointer transition-all ${
                    activeHubTab === t.id ? "text-[#EB4203] border-b-2 border-[#EB4203]" : "text-[#888] hover:text-[#555]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Live Polls Tab */}
            {activeHubTab === "polls" && (
              <div className="space-y-6">
                {polls.length === 0 ? (
                  <p className="text-[#666] italic text-sm">No live polls for this event.</p>
                ) : (
                  polls.map((poll) => (
                    <div key={poll.pollId || poll.id} className="p-5 border border-[#e5e7eb] rounded-xl bg-[#faf9f7] space-y-4">
                      <h4 className="font-bold text-sm text-[#1a1a1a]">{poll.question}</h4>
                      {(() => {
                        const options = Array.isArray(poll.options) 
                          ? poll.options 
                          : typeof poll.options === "string" 
                            ? poll.options.split(",").map((o: string) => o.trim())
                            : [];
                        return (
                          <div className="space-y-2">
                            {options.map((opt: string) => (
                              <button
                                key={opt}
                                onClick={() => handleVotePoll(poll.pollId || poll.id, opt)}
                                className="w-full text-left px-4 py-2 border border-[#e5e7eb] rounded-lg text-xs hover:bg-[#EB4203] hover:text-white transition-all bg-white font-medium cursor-pointer"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Q&A Tab */}
            {activeHubTab === "qa" && (
              <div className="space-y-6">
                <form onSubmit={handlePostQuestion} className="space-y-3">
                  <input
                    placeholder="Ask a question..."
                    value={newQuestion}
                    onChange={e => setNewQuestion(e.target.value)}
                    className="w-full border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs outline-none focus:border-[#EB4203] bg-white text-[#1a1a1a]"
                    required
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1a1a1a] text-white text-xs font-bold rounded-lg hover:bg-[#333] transition-colors cursor-pointer"
                  >
                    Post Question
                  </button>
                </form>

                <div className="space-y-3 pt-4 border-t border-[#f0ebe1]">
                  {qaQuestions.map((q) => (
                    <div key={q.qaQuestionId || q.id} className="p-4 border border-[#e5e7eb] rounded-xl bg-[#faf9f7]">
                      <p className="text-xs font-bold text-[#1a1a1a]">{q.questionText}</p>
                      <div className="flex justify-between items-center text-[10px] text-[#888] mt-2">
                        <span>Posted by Attendee</span>
                        <button
                          onClick={() => handleUpvoteQuestion(q.qaQuestionId || q.id)}
                          className="flex items-center gap-1 text-[#EB4203] hover:underline cursor-pointer border-none bg-transparent font-semibold"
                        >
                          ▲ Upvote ({q.upvotes || 0})
                        </button>
                      </div>
                    </div>
                  ))}
                  {qaQuestions.length === 0 && (
                    <p className="text-[#666] italic text-sm">No questions asked yet. Be the first!</p>
                  )}
                </div>
              </div>
            )}

            {/* Feedback Tab */}
            {activeHubTab === "feedback" && (
              <div className="space-y-6">
                <form onSubmit={handlePostFeedback} className="space-y-4">
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

                <div className="space-y-3 pt-4 border-t border-[#f0ebe1]">
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
                    <p className="text-[#666] italic text-sm">No comments or feedbacks yet.</p>
                  )}
                </div>
              </div>
            )}
          </section>

        </div>

        {/* RIGHT SIDEBAR: Registration, Location, Sponsors */}
        <div className="space-y-8">
          
          {/* REGISTRATION CARD */}
          <div className="bg-white border border-[#e5e7eb] rounded-3xl p-8 shadow-xl sticky top-24">
            <h3 className="font-display text-2xl font-black text-[#1a1a1a] mb-2">Attend Event</h3>
            {eventEndDate && new Date() > eventEndDate ? (
              <>
                <p className="text-[#666] text-sm mb-6">This event has already ended.</p>
                <div className="w-full py-4 bg-[#e5e7eb] text-[#888] font-bold rounded-xl text-center text-sm">
                  Registration Closed
                </div>
              </>
            ) : (
              <>
                <p className="text-[#666] text-sm mb-6">Secure your spot before tickets sell out.</p>
                <button
                  onClick={() => setShowCheckout(true)}
                  className="w-full py-4 bg-[#EB4203] hover:bg-[#7a6d4a] text-white font-bold rounded-xl transition-colors cursor-pointer shadow-md"
                >
                  Register Now
                </button>
              </>
            )}
            <p className="text-center text-[10px] text-[#888] mt-4 uppercase tracking-widest font-semibold">
              Powered by YowEvent Ticketing
            </p>
          </div>

          {/* LOCATIONS */}
          {locations.length > 0 && (
            <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 shadow-sm">
              <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <Navigation size={18} className="text-[#EB4203]" /> Location Details
              </h3>
              <div className="space-y-4">
                {locations.map((loc) => (
                  <div key={loc.locationId} className="flex flex-col gap-1">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#ffffff] flex items-center justify-center shrink-0">
                        {loc.type === "VIRTUAL" ? <Link2 size={14} className="text-[#EB4203]" /> : <MapPin size={14} className="text-[#EB4203]" />}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-[#1a1a1a]">
                          {loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName}
                        </div>
                        <div className="text-xs text-[#666] mt-1">
                          {loc.type === "VIRTUAL" ? (
                            <a href={loc.virtualLink} target="_blank" className="text-[#EB4203] hover:underline break-all">{loc.virtualLink}</a>
                          ) : (
                            `${loc.address || ""}, ${loc.city || ""} ${loc.country || ""}`
                          )}
                        </div>
                      </div>
                    </div>
                    {loc.type !== "VIRTUAL" && loc.latitude != null && loc.longitude != null && (
                      <EventMap latitude={loc.latitude} longitude={loc.longitude} venueName={loc.venueName} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

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
                        <CheckCircle2 size={14} /> Coupon "{appliedCoupon.code}" applied! (-{appliedCoupon.discountValue}%)
                      </div>
                    )}
                  </div>

                  {clientSecret ? (
                    <div className="mb-8 p-5 bg-white border border-[#e5e7eb] rounded-2xl">
                      <h3 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider mb-4">Complete Payment</h3>
                      {clientSecret.startsWith("mock_") ? (
                        <div className="text-center">
                          <p className="text-sm text-[#666] mb-4">Test mode is active. Click below to simulate a successful payment.</p>
                          <button 
                            onClick={() => setOrderSuccess(true)}
                            className="px-8 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors cursor-pointer w-full"
                          >
                            Complete Mock Payment
                          </button>
                        </div>
                      ) : (
                        <Elements stripe={stripePromise} options={{ clientSecret }}>
                          <StripeCheckoutForm onSuccess={() => setOrderSuccess(true)} total={calculateTotal()} />
                        </Elements>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* PAYMENT METHOD SELECTOR */}
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
                        {isProcessing ? "Processing..." : "Proceed to Payment"}
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
