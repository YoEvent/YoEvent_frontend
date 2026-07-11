"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { eventService } from "@/app/utils/services/eventService";
import { paymentService } from "@/app/utils/services/paymentService";
import { getStoredAuth } from "@/app/utils/api";
import {
  Ticket, Calendar, MapPin, Check, ChevronLeft, Tag, CreditCard,
  Smartphone, AlertCircle, ArrowRight, X, QrCode
} from "lucide-react";

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";

type Step = "select" | "details" | "payment" | "confirmation";

export default function RegisterPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const auth = getStoredAuth();

  const [event, setEvent] = useState<any>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("select");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<any>(null);
  const [couponError, setCouponError] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "mtn_mobile_money" | "orange_money">("stripe");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [registration, setRegistration] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoading(true);
      try {
        const [ev, tix] = await Promise.all([
          eventService.getEventById(id, { skipAuth: true }),
          eventService.getTicketTypes(id, { skipAuth: true }),
        ]);
        setEvent(ev);
        setTickets((tix || []).filter((t: any) => (t.quantityAvailable ?? 0) > (t.quantitySold ?? 0)));
      } catch { setError("Failed to load event details."); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError("");
    try {
      const all = await eventService.getCoupons({ skipAuth: true });
      const match = (all || []).find((c: any) => c.code?.toUpperCase() === couponCode.toUpperCase() && (c.eventId === id || !c.eventId));
      if (!match) { setCouponError("Invalid coupon code."); return; }
      if (match.expiryDate && new Date(match.expiryDate) < new Date()) { setCouponError("This coupon has expired."); return; }
      if (match.maxUses && (match.usedCount ?? 0) >= match.maxUses) { setCouponError("This coupon has reached its usage limit."); return; }
      setCouponApplied(match);
    } catch { setCouponError("Could not validate coupon."); }
  };

  const effectivePrice = () => {
    if (!selectedTicket) return 0;
    const base = selectedTicket.price || 0;
    if (!couponApplied) return base;
    if (couponApplied.type === "PERCENTAGE") return Math.max(0, base - base * couponApplied.value / 100);
    return Math.max(0, base - couponApplied.value);
  };

  const handleRegister = async () => {
    if (!auth) { router.push(`/login?from=/events/${id}/register`); return; }
    if (!selectedTicket) return;
    setSubmitting(true);
    setError("");
    try {
      const price = effectivePrice();
      // Create order
      const newOrder = await eventService.createOrder({
        tenantId: event?.tenantId,
        userId: auth.userId,
        eventId: id,
        totalAmount: price,
        discountAmount: couponApplied ? (selectedTicket.price - price) : 0,
        platformFee: price > 0 ? Math.round(price * 0.05) : 0,
        status: price === 0 ? "COMPLETED" : "PENDING",
      });

      // Create order item
      await eventService.createOrderItem({
        orderId: newOrder.orderId || newOrder.id,
        ticketTypeId: selectedTicket.ticketId,
        quantity: 1,
        unitPrice: selectedTicket.price || 0,
        subtotal: price,
      });

      // Create registration
      const newReg = await eventService.createRegistration({
        tenantId: event?.tenantId,
        eventId: id,
        userId: auth.userId,
        ticketTypeId: selectedTicket.ticketId,
        status: "CONFIRMED",
        qrCode: `YOEVENT:${id}:${auth.userId}:${Date.now()}`,
      });

      // Payment for paid tickets
      if (price > 0) {
        await paymentService.createPayment({
          tenantId: event?.tenantId,
          orderId: newOrder.orderId || newOrder.id,
          amount: price,
          currency: event?.currency || "XAF",
          method: paymentMethod,
          provider: paymentMethod,
          status: "PENDING",
          ...(paymentMethod !== "stripe" && phone ? { phoneNumber: phone } : {}),
        });
      }

      setOrder(newOrder);
      setRegistration(newReg);
      setStep("confirmation");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin" />
    </div>
  );

  if (!event) return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center text-center p-8">
      <div>
        <AlertCircle size={40} className="mx-auto text-red-400 mb-4" />
        <h2 className="font-bold text-[#1a1a1a] mb-2">Event not found</h2>
        <Link href="/events" className="text-[#FF4747] text-sm hover:underline">Browse all events</Link>
      </div>
    </div>
  );

  if (event.visibility === "INVITE_ONLY") return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center text-center p-8">
      <div className="max-w-md">
        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4 text-3xl">✉️</div>
        <h2 className="font-bold text-xl text-[#1a1a1a] mb-2">Invite-Only Event</h2>
        <p className="text-sm text-[#555] mb-6 leading-relaxed">
          Registration for <strong>{event.title}</strong> is by invitation only. If you were invited, check your email for a personal invitation link from the organizer.
        </p>
        <Link href={`/events/${id}`} className="inline-flex items-center gap-2 text-sm text-[#FF4747] hover:underline">
          <ChevronLeft size={15} /> Back to event
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9fafb] text-[#1a1a1a]">
      {/* Header */}
      <header className="bg-white border-b border-[#e5e7eb] px-6 py-4 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Link href={`/events/${id}`} className="text-[#888] hover:text-[#1a1a1a] transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="font-display font-black text-base text-[#1a1a1a] truncate">{event.title}</h1>
            <div className="flex items-center gap-2 text-[10px] text-[#aaa] mt-0.5">
              {["select", "details", "payment", "confirmation"].map((s, i) => (
                <span key={s} className={`flex items-center gap-1 ${step === s ? "text-[#FF4747] font-bold" : ""}`}>
                  {i > 0 && <span className="text-[#e5e7eb]">›</span>}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">

        {/* ── STEP 1: SELECT TICKET ── */}
        {step === "select" && (
          <div className="space-y-4">
            <h2 className="font-display font-black text-xl text-[#1a1a1a]">Choose your ticket</h2>

            {tickets.length === 0 ? (
              <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-12 text-center">
                <Ticket size={32} className="mx-auto text-[#e5e7eb] mb-3" />
                <p className="font-bold text-[#1a1a1a] mb-1">No tickets available</p>
                <p className="text-xs text-[#aaa]">Ticket sales may not have started yet or are sold out.</p>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {tickets.map((t: any) => {
                    const remaining = (t.quantityAvailable ?? 0) - (t.quantitySold ?? 0);
                    return (
                      <button key={t.ticketId || t.id} type="button" onClick={() => setSelectedTicket(t)}
                        className={`w-full text-left bg-white border-2 rounded-2xl p-5 transition-all cursor-pointer hover:border-[#FF4747]/50 ${selectedTicket?.ticketId === t.ticketId ? "border-[#FF4747] ring-2 ring-[#FF4747]/10" : "border-[#e5e7eb]"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedTicket?.ticketId === t.ticketId ? "border-[#FF4747] bg-[#FF4747]" : "border-[#e5e7eb]"}`}>
                                {selectedTicket?.ticketId === t.ticketId && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span className="font-bold text-sm text-[#1a1a1a]">{t.name}</span>
                              {remaining < 20 && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{remaining} left</span>}
                            </div>
                            {t.description && <p className="text-xs text-[#888] mt-1.5 ml-6">{t.description}</p>}
                            {t.saleEnd && <p className="text-[10px] text-[#aaa] mt-1 ml-6">Sale ends {new Date(t.saleEnd).toLocaleDateString()}</p>}
                          </div>
                          <div className="shrink-0 text-right">
                            <div className={`font-black text-lg ${t.price === 0 ? "text-green-600" : "text-[#1a1a1a]"}`}>
                              {t.price === 0 ? "Free" : `${Number(t.price).toLocaleString()} FCFA`}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Coupon */}
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5">
                  <label className={label}><Tag size={10} className="inline mr-1" />Coupon Code</label>
                  {couponApplied ? (
                    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
                      <Check size={16} className="text-green-600 shrink-0" />
                      <span className="text-sm font-semibold text-green-700 flex-1">{couponApplied.code} applied — {couponApplied.type === "PERCENTAGE" ? `${couponApplied.value}% off` : `${Number(couponApplied.value).toLocaleString()} FCFA off`}</span>
                      <button type="button" onClick={() => { setCouponApplied(null); setCouponCode(""); }} className="text-green-600 hover:text-green-800 cursor-pointer"><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="Enter code" className={inp} />
                      <button type="button" onClick={applyCoupon} className="px-4 py-2 bg-[#1a1a1a] text-white text-xs font-bold rounded-xl hover:bg-[#333] transition-colors cursor-pointer whitespace-nowrap">Apply</button>
                    </div>
                  )}
                  {couponError && <p className="text-xs text-red-500 mt-2">{couponError}</p>}
                </div>

                {/* Summary + CTA */}
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-3">
                  {selectedTicket && (
                    <>
                      <div className="flex justify-between text-sm"><span className="text-[#888]">Subtotal</span><span>{selectedTicket.price === 0 ? "Free" : `${Number(selectedTicket.price).toLocaleString()} FCFA`}</span></div>
                      {couponApplied && <div className="flex justify-between text-sm text-green-600"><span>Discount ({couponApplied.code})</span><span>-{couponApplied.type === "PERCENTAGE" ? `${couponApplied.value}%` : `${Number(couponApplied.value).toLocaleString()} FCFA`}</span></div>}
                      <div className="border-t border-[#f0f0f0] pt-3 flex justify-between font-black text-base"><span>Total</span><span className={effectivePrice() === 0 ? "text-green-600" : "text-[#FF4747]"}>{effectivePrice() === 0 ? "Free" : `${Number(effectivePrice()).toLocaleString()} FCFA`}</span></div>
                    </>
                  )}
                  <button type="button" disabled={!selectedTicket} onClick={() => setStep(selectedTicket?.price === 0 || effectivePrice() === 0 ? "details" : "payment")}
                    className="w-full py-3 bg-[#FF4747] text-white font-bold rounded-xl hover:bg-[#e03e3e] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2">
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP 2: PAYMENT ── */}
        {step === "payment" && (
          <div className="space-y-4">
            <button type="button" onClick={() => setStep("select")} className="text-xs text-[#FF4747] font-semibold hover:underline flex items-center gap-1 cursor-pointer"><ChevronLeft size={12} /> Back</button>
            <h2 className="font-display font-black text-xl text-[#1a1a1a]">Payment</h2>

            {/* Order summary */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-bold text-sm text-[#1a1a1a]">{selectedTicket?.name}</div>
                  <div className="text-xs text-[#888] mt-0.5">{event.title}</div>
                </div>
                <div className="font-black text-lg text-[#FF4747]">{Number(effectivePrice()).toLocaleString()} FCFA</div>
              </div>
            </div>

            {/* Payment method */}
            <div className="space-y-3">
              {[
                { id: "stripe" as const, label: "Credit / Debit Card", sub: "Visa, Mastercard — via Stripe", icon: CreditCard, color: "#635bff" },
                { id: "mtn_mobile_money" as const, label: "MTN Mobile Money", sub: "USSD push to your MTN number", icon: Smartphone, color: "#ffcc00", dark: true },
                { id: "orange_money" as const, label: "Orange Money", sub: "USSD push to your Orange number", icon: Smartphone, color: "#ff6600" },
              ].map(m => (
                <button key={m.id} type="button" onClick={() => setPaymentMethod(m.id)}
                  className={`w-full flex items-center gap-3 p-4 border-2 rounded-2xl text-left transition-all cursor-pointer ${paymentMethod === m.id ? "" : "border-[#e5e7eb] hover:border-[#e5e7eb]"}`}
                  style={paymentMethod === m.id ? { borderColor: m.color, background: `${m.color}11` } : {}}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: m.color }}>
                    <m.icon size={18} color={m.dark ? "#1a1a1a" : "#fff"} />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-[#1a1a1a]">{m.label}</div>
                    <div className="text-xs text-[#888]">{m.sub}</div>
                  </div>
                  {paymentMethod === m.id && <div className="w-4 h-4 rounded-full shrink-0" style={{ background: m.color }} />}
                </button>
              ))}
            </div>

            {(paymentMethod === "mtn_mobile_money" || paymentMethod === "orange_money") && (
              <div>
                <label className={label}>{paymentMethod === "mtn_mobile_money" ? "MTN" : "Orange"} Phone Number</label>
                <div className="flex gap-2">
                  <div className="px-3 py-2.5 bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl text-sm font-semibold text-[#555] shrink-0">+237</div>
                  <input type="tel" placeholder="6XXXXXXXX" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, ""))} maxLength={9} className={inp} />
                </div>
              </div>
            )}

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" />{error}</div>}

            <button type="button" onClick={() => setStep("details")} className="w-full py-3 bg-[#FF4747] text-white font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer flex items-center justify-center gap-2">
              Review &amp; Confirm <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* ── STEP 3: DETAILS (review + confirm) ── */}
        {step === "details" && (
          <div className="space-y-4">
            <button type="button" onClick={() => setStep(selectedTicket?.price > 0 && effectivePrice() > 0 ? "payment" : "select")} className="text-xs text-[#FF4747] font-semibold hover:underline flex items-center gap-1 cursor-pointer"><ChevronLeft size={12} /> Back</button>
            <h2 className="font-display font-black text-xl text-[#1a1a1a]">Review &amp; Confirm</h2>

            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between text-sm"><span className="text-[#888]">Event</span><span className="font-semibold">{event.title}</span></div>
              <div className="flex items-center justify-between text-sm"><span className="text-[#888]">Ticket</span><span className="font-semibold">{selectedTicket?.name}</span></div>
              {effectivePrice() > 0 && <div className="flex items-center justify-between text-sm"><span className="text-[#888]">Payment</span><span className="font-semibold capitalize">{paymentMethod.replace(/_/g, " ")}</span></div>}
              <div className="border-t border-[#f0f0f0] pt-3 flex items-center justify-between font-black text-base">
                <span>Total</span>
                <span className={effectivePrice() === 0 ? "text-green-600" : "text-[#FF4747]"}>{effectivePrice() === 0 ? "Free" : `${Number(effectivePrice()).toLocaleString()} FCFA`}</span>
              </div>
            </div>

            {!auth && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm p-4 rounded-xl">
                You need to be logged in to complete registration. <Link href={`/login?from=/events/${id}/register`} className="font-bold underline">Log in</Link>
              </div>
            )}

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-4 rounded-xl flex items-start gap-2"><AlertCircle size={16} className="shrink-0 mt-0.5" />{error}</div>}

            <button type="button" onClick={handleRegister} disabled={submitting || !auth}
              className="w-full py-3.5 bg-[#FF4747] text-white font-bold rounded-xl hover:bg-[#e03e3e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2">
              {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Registering...</> : <><Check size={16} /> Complete Registration</>}
            </button>
          </div>
        )}

        {/* ── STEP 4: CONFIRMATION ── */}
        {step === "confirmation" && registration && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <Check size={40} className="text-green-600" />
            </div>
            <div>
              <h2 className="font-display font-black text-2xl text-[#1a1a1a] mb-2">You&apos;re registered!</h2>
              <p className="text-sm text-[#888]">Your spot is confirmed for <strong className="text-[#1a1a1a]">{event.title}</strong>.</p>
            </div>

            <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 max-w-sm mx-auto">
              <div className="mb-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(registration.qrCode || `YOEVENT:${id}:${auth?.userId}`)}&bgcolor=ffffff&color=1a1a1a&margin=6`}
                  alt="Your QR code"
                  className="w-40 h-40 mx-auto rounded-xl"
                />
                <p className="text-[10px] text-[#aaa] mt-2 font-mono uppercase tracking-wider flex items-center justify-center gap-1">
                  <QrCode size={10} /> Show this at entry
                </p>
              </div>
              <div className="border-t border-[#f0f0f0] pt-4 space-y-2 text-xs text-left">
                {registration.confirmationCode && <div className="flex justify-between"><span className="text-[#888]">Confirmation</span><span className="font-mono font-semibold">{registration.confirmationCode}</span></div>}
                <div className="flex justify-between"><span className="text-[#888]">Ticket</span><span className="font-semibold">{selectedTicket?.name}</span></div>
                <div className="flex justify-between"><span className="text-[#888]">Status</span><span className="font-bold text-green-600">{effectivePrice() === 0 ? "Confirmed" : "Pending Payment"}</span></div>
              </div>
            </div>

            <div className="flex gap-3 max-w-sm mx-auto">
              <Link href="/user/dashboard" className="flex-1 py-3 bg-[#1a1a1a] text-white text-sm font-bold rounded-xl hover:bg-[#333] transition-colors text-center">
                View My Tickets
              </Link>
              <Link href="/events" className="flex-1 py-3 border border-[#e5e7eb] text-[#1a1a1a] text-sm font-bold rounded-xl hover:bg-[#f5f5f5] transition-colors text-center">
                More Events
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
