"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getStoredAuth, clearStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { authService } from "@/app/utils/services/authService";
import { Calendar, MapPin, Users, Clock, Box, Navigation, Link2, X, CheckCircle2, Bookmark } from "lucide-react";

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

  // Checkout states
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedTickets, setSelectedTickets] = useState<Record<string, number>>({});
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const [isSaved, setIsSaved] = useState(false);
  const [savedEventId, setSavedEventId] = useState<string | null>(null);

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
          ticketsList
        ] = await Promise.all([
          eventService.getEventLocations({ skipAuth: true }).catch(() => []),
          eventService.getSessions({ skipAuth: true }).catch(() => []),
          eventService.getSessionSpeakers({ skipAuth: true }).catch(() => []),
          eventService.getSponsors({ skipAuth: true }).catch(() => []),
          eventService.getExhibitors({ skipAuth: true }).catch(() => []),
          eventService.getTicketTypes({ skipAuth: true }).catch(() => []),
        ]);
        
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

      } catch (err) {
        console.error("Failed to load event data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();
  }, [eventId, router]);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    clearStoredAuth();
    setAuth(null);
    router.push("/");
  };

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
        tenantId: auth.tenantId,
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

      // 3. Create Payment Intent via Payment Service
      const paymentRes = await paymentService.createPayment({
        orderId: order.orderId || order.id,
        tenantId: auth.tenantId,
        amount: total,
        currency: "usd",
        method: "card",
        provider: "stripe"
      });

      if (paymentRes.clientSecret) {
        setClientSecret(paymentRes.clientSecret);
      } else {
        // If mock failed to generate secret or something went wrong, just succeed
        setOrderSuccess(true);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] flex justify-center items-center">
        <div className="w-10 h-10 border-4 border-[#e0d8c8] border-t-[#8a7d5a] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a] overflow-x-hidden">
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-16 py-5 bg-white border-b border-[#e0d8c8]">
        <Link href="/" className="font-display text-2xl font-black tracking-tight">
          Yo<span className="text-[#8a7d5a]">Event</span>
        </Link>
        <ul className="hidden md:flex items-center gap-8 list-none">
          <li>
            <Link href="/events" className="text-sm text-[#1a1a1a] font-bold transition-colors">Events</Link>
          </li>
          <li>
            <Link href="/pricing" className="text-sm text-[#666] hover:text-[#1a1a1a] transition-colors font-medium">Pricing</Link>
          </li>
        </ul>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link href="/admin">
                <button className="px-5 py-2 text-sm font-semibold bg-[#1a1a1a] text-white rounded-full hover:bg-[#333] transition-all cursor-pointer">
                  Dashboard
                </button>
              </Link>
              <button 
                onClick={handleLogout}
                className="px-5 py-2 text-sm font-medium border-[1.5px] border-[#1a1a1a] rounded-full hover:bg-red-500 hover:text-white hover:border-transparent transition-all cursor-pointer"
              >
                Log out
              </button>
            </>
          ) : (
            <Link href="/login">
              <button className="px-5 py-2 text-sm font-medium border-[1.5px] border-[#1a1a1a] rounded-full hover:bg-[#1a1a1a] hover:text-white transition-all cursor-pointer">
                Log in
              </button>
            </Link>
          )}
        </div>
      </nav>

      {/* HERO BANNER */}
      <div className="relative bg-[#1a1a1a] overflow-hidden">
        {event.coverImage ? (
          <div className="absolute inset-0 opacity-40">
            <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#c8bb96] to-transparent"></div>
        )}
        <div className="relative max-w-7xl mx-auto px-16 py-24 md:py-32">
          <span className="inline-block px-3 py-1 bg-[#8a7d5a] text-white text-xs font-bold rounded-full uppercase tracking-widest mb-6">
            {event.status}
          </span>
          <div className="flex items-start justify-between gap-4 mb-6">
            <h1 className="font-display text-5xl md:text-7xl font-black text-white leading-tight max-w-4xl">
              {event.title}
            </h1>
            <button 
              onClick={toggleSaveEvent}
              className={`p-4 rounded-full border ${isSaved ? 'bg-[#d4c9a8] border-[#d4c9a8] text-[#1a1a1a]' : 'bg-transparent border-[#e0d8c8]/50 text-white hover:bg-white/10'} transition-all cursor-pointer shadow-lg`}
              title={isSaved ? "Unsave Event" : "Save Event"}
            >
              <Bookmark size={28} className={isSaved ? "fill-current" : ""} />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-[#d4c9a8] font-medium">
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
                    <div key={session.sessionId} className="bg-white border border-[#e0d8c8] rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div>
                          <h3 className="font-display text-xl font-bold text-[#1a1a1a]">{session.title}</h3>
                          <div className="flex items-center gap-4 text-xs font-medium text-[#666] mt-2">
                            <span className="flex items-center gap-1"><Clock size={14} /> {new Date(session.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            <span className="px-2 py-0.5 bg-[#f5f0e8] text-[#8a7d5a] rounded uppercase tracking-wider">{session.type}</span>
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
                                <img src={`https://api.dicebear.com/6.x/initials/svg?seed=${sp.speakerId}`} className="w-8 h-8 rounded-full bg-[#f5f0e8]" alt="Speaker" />
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

        </div>

        {/* RIGHT SIDEBAR: Registration, Location, Sponsors */}
        <div className="space-y-8">
          
          {/* REGISTRATION CARD */}
          <div className="bg-white border border-[#e0d8c8] rounded-3xl p-8 shadow-xl sticky top-24">
            <h3 className="font-display text-2xl font-black text-[#1a1a1a] mb-2">Attend Event</h3>
            <p className="text-[#666] text-sm mb-6">Secure your spot before tickets sell out.</p>
            <button 
              onClick={() => setShowCheckout(true)}
              className="w-full py-4 bg-[#8a7d5a] hover:bg-[#7a6d4a] text-white font-bold rounded-xl transition-colors cursor-pointer shadow-md"
            >
              Register Now
            </button>
            <p className="text-center text-[10px] text-[#888] mt-4 uppercase tracking-widest font-semibold">
              Powered by YoEvent Ticketing
            </p>
          </div>

          {/* LOCATIONS */}
          {locations.length > 0 && (
            <div className="bg-white border border-[#e0d8c8] rounded-3xl p-6 shadow-sm">
              <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <Navigation size={18} className="text-[#8a7d5a]" /> Location Details
              </h3>
              <div className="space-y-4">
                {locations.map((loc) => (
                  <div key={loc.locationId} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#f5f0e8] flex items-center justify-center shrink-0">
                      {loc.type === "VIRTUAL" ? <Link2 size={14} className="text-[#8a7d5a]" /> : <MapPin size={14} className="text-[#8a7d5a]" />}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#1a1a1a]">
                        {loc.type === "VIRTUAL" ? loc.virtualPlatform : loc.venueName}
                      </div>
                      <div className="text-xs text-[#666] mt-1">
                        {loc.type === "VIRTUAL" ? (
                          <a href={loc.virtualLink} target="_blank" className="text-[#8a7d5a] hover:underline break-all">{loc.virtualLink}</a>
                        ) : (
                          `${loc.address || ""}, ${loc.city || ""} ${loc.country || ""}`
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SPONSORS & EXHIBITORS */}
          {(sponsors.length > 0 || exhibitors.length > 0) && (
            <div className="bg-white border border-[#e0d8c8] rounded-3xl p-6 shadow-sm">
              <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-4 flex items-center gap-2">
                <Box size={18} className="text-[#8a7d5a]" /> Supported By
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
                      <span key={e.exhibitorId} className="px-3 py-1 bg-[#f5f0e8] text-[#555] text-[10px] font-bold rounded-full">
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

      <footer className="px-16 py-8 bg-[#1a1a1a] flex items-center justify-between">
        <div className="font-display text-xl font-black text-white">
          Yo<span className="text-[#8a7d5a]">Event</span>
        </div>
        <p className="text-xs text-[#555]">© 2026 YoEvent · EventaaS Platform · All rights reserved</p>
      </footer>

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[#e0d8c8] flex items-center justify-between bg-[#fcfbf9]">
              <h2 className="font-display text-2xl font-black text-[#1a1a1a]">Checkout: {event.title}</h2>
              <button onClick={() => { setShowCheckout(false); setOrderSuccess(false); setClientSecret(null); }} className="p-2 hover:bg-[#ebe1cc] rounded-full transition-colors cursor-pointer text-[#666]">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 overflow-y-auto flex-1">
              {orderSuccess ? (
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
                        <div key={t.ticketId} className="flex items-center justify-between p-4 border border-[#e0d8c8] rounded-2xl bg-white shadow-sm hover:border-[#8a7d5a] transition-colors">
                          <div>
                            <div className="font-bold text-[#1a1a1a]">{t.name}</div>
                            <div className="text-xs text-[#666] mt-1 line-clamp-1">{t.description || "General admission ticket"}</div>
                            <div className="text-sm font-black text-[#8a7d5a] mt-2">${t.price}</div>
                          </div>
                          <div className="flex items-center gap-3 bg-[#f5f0e8] p-1.5 rounded-xl">
                            <button onClick={() => handleQuantityChange(t.ticketId, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-[#1a1a1a] cursor-pointer hover:bg-[#ebe1cc]">-</button>
                            <span className="w-6 text-center font-bold text-[#1a1a1a]">{selectedTickets[t.ticketId] || 0}</span>
                            <button onClick={() => handleQuantityChange(t.ticketId, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm font-bold text-[#1a1a1a] cursor-pointer hover:bg-[#ebe1cc]">+</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-5 bg-[#f5f0e8] rounded-2xl border border-[#e0d8c8] mb-8">
                    <h3 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider mb-3">Discount Code</h3>
                    <div className="flex gap-3">
                      <input 
                        type="text" 
                        placeholder="Enter coupon code" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 bg-white border border-[#e0d8c8] rounded-xl px-4 py-2 text-sm text-[#1a1a1a] outline-none focus:border-[#8a7d5a]"
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
                    <div className="mb-8 p-5 bg-white border border-[#e0d8c8] rounded-2xl">
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
                      {/* PAYMENT METHOD SECTION (MOCK - Now hidden when Stripe loads) */}
                      <div className="mb-8">
                        <h3 className="text-sm font-bold text-[#1a1a1a] uppercase tracking-wider mb-4">Payment Summary</h3>
                        <div className="p-5 bg-white border border-[#e0d8c8] rounded-2xl">
                          <p className="text-sm text-[#666]">Click proceed to generate a secure Stripe payment intent.</p>
                        </div>
                      </div>

                      <div className="border-t border-[#e0d8c8] pt-6">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[#666]">Subtotal</span>
                          <span className="font-bold text-[#1a1a1a]">${calculateSubtotal().toFixed(2)}</span>
                        </div>
                        {appliedCoupon && (
                          <div className="flex items-center justify-between mb-2 text-green-600">
                            <span>Discount</span>
                            <span className="font-bold">-${(calculateSubtotal() - calculateTotal()).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed border-[#e0d8c8]">
                          <span className="text-lg font-black text-[#1a1a1a]">Total</span>
                          <span className="text-2xl font-black text-[#8a7d5a]">${calculateTotal().toFixed(2)}</span>
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
