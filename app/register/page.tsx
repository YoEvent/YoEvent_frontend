"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, CheckCircle, CreditCard, Lock, ShieldCheck } from "lucide-react";
import { api, setStoredAuth } from "@/app/utils/api";

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planName = searchParams.get("plan") || "";
  const from = searchParams.get("from") || "";

  const [show, setShow] = useState(false);
  const [showC, setShowC] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isOrg, setIsOrg] = useState(false);
  const [roleMode, setRoleMode] = useState<"ATTENDEE" | "ORGANIZER">("ATTENDEE");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", orgName: "", password: "", confirm: "", agree: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Payment states
  const [plans, setPlans] = useState<any[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [cardForm, setCardForm] = useState({ number: "", expiry: "", cvc: "", name: "" });
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    api.get<any[]>("/api/v1/subscriptionplans", { skipAuth: true })
      .then((data) => {
        setPlans(data || []);
      })
      .catch((err) => {
        console.error("Failed to load subscription plans:", err);
      });
  }, []);

  const isPaidPlan = planName.toLowerCase().includes("pro") || 
                     planName.toLowerCase().includes("enterprise") || 
                     planName.toLowerCase().includes("basic") || 
                     planName.toLowerCase().includes("premium");

  const getPrice = () => {
    if (planName.toLowerCase().includes("enterprise") || planName.toLowerCase().includes("premium")) {
      return 99;
    }
    if (planName.toLowerCase().includes("pro") || planName.toLowerCase().includes("basic")) {
      return 29;
    }
    return 0;
  };

  const getCardType = (num: string) => {
    const cleanNum = num.replace(/\s+/g, "");
    if (cleanNum.startsWith("4")) return "visa";
    if (/^5[1-5]/.test(cleanNum)) return "mastercard";
    return "generic";
  };

  const strength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const s = strength(form.password);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    if (roleMode === "ORGANIZER" && isOrg && !form.orgName.trim()) e.orgName = "Required";
    if (form.password.length < 8) e.password = "Min. 8 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    if (!form.agree) e.agree = "You must accept the terms";
    return e;
  };

  const validateCard = () => {
    const e: Record<string, string> = {};
    const cleanNum = cardForm.number.replace(/\s+/g, "");
    if (cleanNum.length !== 16 || !/^\d+$/.test(cleanNum)) {
      e.number = "Enter a valid 16-digit card number";
    }
    if (!/^\d{2}\/\d{2}$/.test(cardForm.expiry)) {
      e.expiry = "Use MM/YY format";
    } else {
      const [m, y] = cardForm.expiry.split("/").map(Number);
      if (m < 1 || m > 12) e.expiry = "Invalid month";
    }
    if (cardForm.cvc.length < 3 || cardForm.cvc.length > 4 || !/^\d+$/.test(cardForm.cvc)) {
      e.cvc = "Invalid CVC";
    }
    if (!cardForm.name.trim()) {
      e.name = "Required";
    }
    return e;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 16) val = val.substring(0, 16);
    const formatted = val.replace(/(.{4})/g, "$1 ").trim();
    setCardForm((f) => ({ ...f, number: formatted }));
    setCardErrors((errs) => { const n = { ...errs }; delete n.number; return n; });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 4) val = val.substring(0, 4);
    if (val.length >= 2) {
      val = val.substring(0, 2) + "/" + val.substring(2);
    }
    setCardForm((f) => ({ ...f, expiry: val }));
    setCardErrors((errs) => { const n = { ...errs }; delete n.expiry; return n; });
  };

  const handleCvcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").substring(0, 4);
    setCardForm((f) => ({ ...f, cvc: val }));
    setCardErrors((errs) => { const n = { ...errs }; delete n.cvc; return n; });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (isPaidPlan) {
      setShowPayment(true);
    } else {
      await handleRegisterOnly();
    }
  };

  const handleRegisterOnly = async () => {
    setLoading(true);
    try {
      await api.post("/api/v1/auth/register", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        isAttendee: roleMode === "ATTENDEE",
        workspaceName: roleMode === "ATTENDEE" ? null : (isOrg ? form.orgName : `${form.firstName} ${form.lastName}`),
      });
      setSubmitted(true);
      setTimeout(() => router.push(from ? `/login?from=${encodeURIComponent(from)}` : "/login"), 2000);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, submit: err.message || "Failed to register" }));
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateCard();
    setCardErrors(errs);
    if (Object.keys(errs).length) return;

    setPaymentLoading(true);
    try {
      // 1. Map target planId
      const mappedPlan = plans.find((p) => {
        const lowerName = planName.toLowerCase();
        if (lowerName.includes("pro") || lowerName.includes("basic")) {
          return p.name === "BASIC";
        }
        if (lowerName.includes("enterprise") || lowerName.includes("premium")) {
          return p.name === "PREMIUM";
        }
        return p.name === "FREE";
      });

      const planId = mappedPlan?.planId;
      if (!planId) {
        throw new Error(`Plan type "${planName}" is not seeded in database. Please contact support.`);
      }

      // 2. Register basic account (starts on FREE)
      const authData = await api.post<any>("/api/v1/auth/register", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        isAttendee: roleMode === "ATTENDEE",
        workspaceName: roleMode === "ATTENDEE" ? null : (isOrg ? form.orgName : `${form.firstName} ${form.lastName}`),
      });

      // 3. Authenticate current request session by storing token
      setStoredAuth(authData);

      // 4. Create Payment transaction
      await api.post("/api/v1/payments", {
        tenantId: authData.tenantId,
        amount: getPrice(),
        currency: "usd",
        provider: "stripe",
        status: "SUCCESSFUL",
        providerReference: "ch_" + Math.random().toString(36).substr(2, 9)
      });

      // 5. Get current tenant details
      const existingTenant = await api.get<any>(`/api/v1/tenants/${authData.tenantId}`);

      // 6. Upgrade tenant plan
      await api.put(`/api/v1/tenants/${authData.tenantId}`, {
        ...existingTenant,
        planId: planId,
        type: "ORGANIZATION",
      });

      setPaymentSuccess(true);
      setSubmitted(true);
      setTimeout(() => {
        router.push("/login");
      }, 2500);
    } catch (err: any) {
      setCardErrors((prev) => ({ ...prev, submit: err.message || "Payment processing failed" }));
    } finally {
      setPaymentLoading(false);
    }
  };

  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* NAV */}
      <nav className="flex items-center justify-between px-16 py-5 bg-white border-b border-[#e0d8c8]">
        <Link href="/" className="font-display text-2xl font-black tracking-tight text-[#1a1a1a] hover:opacity-80 transition-opacity">
          Yow<span className="text-[#8a7d5a]">Event</span>
        </Link>
        <span className="text-sm text-[#888]">Already have an account?{" "}
          <Link href={from ? `/login?from=${encodeURIComponent(from)}` : "/login"} className="text-[#1a1a1a] font-semibold hover:underline">Log in</Link>
        </span>
      </nav>

      <main className="flex-1 grid md:grid-cols-2">
        {/* LEFT */}
        <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#2a1e10] px-14 py-16 flex flex-col justify-center overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-radial-[at_50%_50%] from-[#d4c9a8]/15 to-transparent" />
          <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-radial-[at_50%_50%] from-[#c8bb96]/10 to-transparent" />
          <div className="relative z-10">
            <span className="inline-block bg-[#d4c9a8]/15 border border-[#d4c9a8]/25 rounded-full px-4 py-1.5 text-xs text-[#d4c9a8] uppercase tracking-widest mb-8">Get Started Today</span>
            <h2 className="font-display text-4xl font-bold text-white leading-[1.15] tracking-tight mb-5">
              Your events,<br /><em className="italic text-[#d4c9a8]">your rules.</em>
            </h2>
            <p className="text-sm text-[#aaa] leading-relaxed max-w-sm mb-12">Provision your own isolated event management environment in seconds. No setup fees, no sales call required.</p>
            <div className="space-y-6">
              {[
                ["🎟", "Free tier included", "Start with no credit card. Upgrade when you grow."],
                ["🔒", "Fully isolated environment", "Your data, brand and users — completely separate."],
                ["📊", "Real-time traffic dashboard", "Flash crowd detection and congestion alerts built in."],
                ["⚡", "Live in under 3 minutes", "From sign-up to your first published event — fast."],
              ].map(([icon, title, desc]) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[#d4c9a8]/12 flex items-center justify-center text-base flex-shrink-0">{icon}</div>
                  <div>
                    <div className="text-sm font-medium text-white mb-0.5">{title}</div>
                    <div className="text-xs text-[#777]">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="bg-white px-14 py-12 flex flex-col justify-center">
          {showPayment ? (
            <div>
              <button 
                type="button" 
                onClick={() => setShowPayment(false)}
                className="text-xs font-semibold text-[#8a7d5a] hover:underline mb-4 cursor-pointer"
              >
                ← Back to registration info
              </button>

              <h2 className="font-display text-3xl font-bold tracking-tight mb-2">Secure Payment</h2>
              <p className="text-sm text-[#888] mb-6">Enter your card details to finalize your subscription.</p>

              {paymentSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 border border-green-200">
                    <ShieldCheck className="text-green-500" size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-green-800 mb-1">Payment Successful!</h3>
                  <p className="text-sm text-green-700">Account created. Redirecting to login...</p>
                </div>
              ) : (
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  {cardErrors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      ⚠️ {cardErrors.submit}
                    </div>
                  )}

                  {/* Order Summary badge */}
                  <div className="bg-[#f5f0e8] border border-[#e0d8c8] rounded-2xl p-4 flex justify-between items-center mb-6">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a7d5a]">Selected Subscription</span>
                      <h4 className="text-sm font-bold text-[#1a1a1a]">{planName} Plan</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-[#1a1a1a]">${getPrice()}</span>
                      <span className="text-[10px] text-[#888] block">/month</span>
                    </div>
                  </div>

                  {/* Visual Card */}
                  <div className="relative w-full h-40 rounded-2xl bg-gradient-to-br from-[#1a1a1a] to-[#3a2f1d] border border-[#d4c9a8]/25 p-5 text-white flex flex-col justify-between shadow-lg overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-radial-[at_100%_0%] from-[#d4c9a8]/10 to-transparent" />
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] uppercase tracking-widest text-[#d4c9a8] font-bold">YowEvent Premium</span>
                      <span className="text-sm font-black italic">
                        {getCardType(cardForm.number) === "visa" && <span className="text-blue-400">VISA</span>}
                        {getCardType(cardForm.number) === "mastercard" && <span className="text-orange-400">MC</span>}
                        {getCardType(cardForm.number) === "generic" && <span className="text-stone-400">CARD</span>}
                      </span>
                    </div>
                    <div>
                      <div className="text-lg tracking-[0.2em] font-mono mb-2">
                        {cardForm.number || "•••• •••• •••• ••••"}
                      </div>
                      <div className="flex justify-between text-[9px] font-mono uppercase text-stone-400">
                        <div>
                          <span className="block text-[7px] text-stone-500">Card Holder</span>
                          {cardForm.name.toUpperCase() || "NAME ON CARD"}
                        </div>
                        <div>
                          <span className="block text-[7px] text-stone-500">Expires</span>
                          {cardForm.expiry || "MM/YY"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Card Number</label>
                    <div className="relative">
                      <input 
                        type="text" 
                        value={cardForm.number} 
                        onChange={handleCardNumberChange} 
                        placeholder="4242 4242 4242 4242"
                        className={`w-full px-4 py-2.5 pr-10 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${cardErrors.number ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} 
                      />
                      <CreditCard className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#888]" size={16} />
                    </div>
                    {cardErrors.number && <p className="text-xs text-red-500 mt-1">{cardErrors.number}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Expiry Date</label>
                      <input 
                        type="text" 
                        value={cardForm.expiry} 
                        onChange={handleExpiryChange} 
                        placeholder="MM/YY"
                        className={`w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${cardErrors.expiry ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} 
                      />
                      {cardErrors.expiry && <p className="text-xs text-red-500 mt-1">{cardErrors.expiry}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">CVC</label>
                      <input 
                        type="text" 
                        value={cardForm.cvc} 
                        onChange={handleCvcChange} 
                        placeholder="123"
                        className={`w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${cardErrors.cvc ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} 
                      />
                      {cardErrors.cvc && <p className="text-xs text-red-500 mt-1">{cardErrors.cvc}</p>}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Name on Card</label>
                    <input 
                      type="text" 
                      value={cardForm.name} 
                      onChange={(e) => {
                        setCardForm((f) => ({ ...f, name: e.target.value }));
                        setCardErrors((errs) => { const n = { ...errs }; delete n.name; return n; });
                      }} 
                      placeholder="Jane Doe"
                      className={`w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${cardErrors.name ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} 
                    />
                    {cardErrors.name && <p className="text-xs text-red-500 mt-1">{cardErrors.name}</p>}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#888] py-1 bg-stone-50 border border-stone-100 rounded-xl px-3.5">
                    <Lock size={12} className="text-[#8a7d5a]" />
                    <span>Demo mode enabled. You can use credit card `4242 4242 4242 4242` to check out.</span>
                  </div>

                  <button 
                    type="submit" 
                    disabled={paymentLoading}
                    className="w-full py-3.5 bg-[#1a1a1a] text-white rounded-full text-sm font-semibold hover:bg-[#333] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {paymentLoading ? "Processing payment..." : `Pay $${getPrice()}.00 & Subscribe`}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight mb-2">Create your account</h2>
              <p className="text-sm text-[#888] mb-8">Already have an account?{" "}<Link href="/login" className="text-[#1a1a1a] font-semibold hover:underline">Log in</Link></p>

              {isPaidPlan && (
                <div className="bg-[#f5f0e8] border border-[#e0d8c8] rounded-2xl p-4 flex justify-between items-center mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a7d5a]">Selected Plan</span>
                    <h4 className="text-sm font-bold text-[#1a1a1a]">{planName}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-[#1a1a1a]">${getPrice()}</span>
                    <span className="text-[10px] text-[#888]">/mo</span>
                  </div>
                </div>
              )}

              {submitted && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-sm text-green-700">
                  <CheckCircle size={16} /> Account created! Redirecting to login…
                </div>
              )}

              {errors.submit && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700">
                  ⚠️ {errors.submit}
                </div>
              )}

              {/* Tabs for Role Mode */}
              <div className="flex bg-[#f5f0e8] rounded-xl p-1 mb-6 border border-[#e0d8c8]">
                <button
                  type="button"
                  onClick={() => setRoleMode("ATTENDEE")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    roleMode === "ATTENDEE" ? "bg-[#1a1a1a] text-white shadow-sm" : "text-[#555] hover:text-[#1a1a1a]"
                  }`}
                >
                  Attendee
                </button>
                <button
                  type="button"
                  onClick={() => setRoleMode("ORGANIZER")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    roleMode === "ORGANIZER" ? "bg-[#1a1a1a] text-white shadow-sm" : "text-[#555] hover:text-[#1a1a1a]"
                  }`}
                >
                  Event Organizer
                </button>
              </div>

              {roleMode === "ORGANIZER" && (
                <div className="flex bg-stone-100 rounded-lg p-1 mb-6 border border-stone-200 w-2/3">
                  <button
                    type="button"
                    onClick={() => setIsOrg(false)}
                    className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all cursor-pointer ${
                      !isOrg ? "bg-white text-[#1a1a1a] shadow-sm" : "text-[#888] hover:text-[#1a1a1a]"
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOrg(true)}
                    className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all cursor-pointer ${
                      isOrg ? "bg-white text-[#1a1a1a] shadow-sm" : "text-[#888] hover:text-[#1a1a1a]"
                    }`}
                  >
                    Organisation
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {(["firstName", "lastName"] as const).map((f) => (
                    <div key={f}>
                      <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{f === "firstName" ? "First Name" : "Last Name"}</label>
                      <input value={form[f]} onChange={(e) => set(f, e.target.value)}
                        placeholder={f === "firstName" ? "Jean" : "Dupont"}
                        className={`w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${errors[f] ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} />
                      {errors[f] && <p className="text-xs text-red-500 mt-1">{errors[f]}</p>}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Email Address</label>
                  <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com"
                    className={`w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${errors.email ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                {roleMode === "ORGANIZER" && isOrg && (
                  <div>
                    <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Organisation Name</label>
                    <input type="text" value={form.orgName} onChange={(e) => set("orgName", e.target.value)} placeholder="Acme Corp"
                      className={`w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${errors.orgName ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} />
                    {errors.orgName && <p className="text-xs text-red-500 mt-1">{errors.orgName}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <input type={show ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Min. 8 characters"
                      className={`w-full px-4 py-2.5 pr-11 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${errors.password ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#1a1a1a]">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= s ? strengthColor[s] : "bg-[#e0d8c8]"}`} />
                        ))}
                      </div>
                      <span className="text-xs text-[#888]">{strengthLabel[s]}</span>
                    </div>
                  )}
                  {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input type={showC ? "text" : "password"} value={form.confirm} onChange={(e) => set("confirm", e.target.value)} placeholder="Repeat your password"
                      className={`w-full px-4 py-2.5 pr-11 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${errors.confirm ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} />
                    <button type="button" onClick={() => setShowC(!showC)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#1a1a1a]">
                      {showC ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
                </div>

                <div className="flex items-start gap-2.5">
                  <input type="checkbox" id="agree" checked={form.agree} onChange={(e) => set("agree", e.target.checked)} className="mt-0.5 accent-[#1a1a1a]" />
                  <label htmlFor="agree" className="text-xs text-[#666]">
                    I agree to the <a href="#" className="text-[#1a1a1a] font-semibold hover:underline">Terms of Service</a> and <a href="#" className="text-[#1a1a1a] font-semibold hover:underline">Privacy Policy</a>
                  </label>
                </div>
                {errors.agree && <p className="text-xs text-red-500 -mt-2">{errors.agree}</p>}

                <button type="submit" disabled={loading || submitted}
                  className="w-full py-3.5 bg-[#1a1a1a] text-white rounded-full text-sm font-medium hover:bg-[#333] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 cursor-pointer">
                  {loading ? "Creating account…" : submitted ? "✓ Account Created!" : isPaidPlan ? "Proceed to Payment" : "Create Free Account"}
                </button>

                <div className="flex items-center gap-4 text-xs text-[#888]">
                  <span className="flex-1 h-px bg-[#e0d8c8]" />or<span className="flex-1 h-px bg-[#e0d8c8]" />
                </div>

                <button type="button" className="w-full py-3 rounded-full border-[1.5px] border-[#e0d8c8] text-sm text-[#1a1a1a] hover:bg-[#f5f0e8] transition-colors flex items-center justify-center gap-2.5 cursor-pointer">
                  <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continue with Google
                </button>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f0e8]">
        <div className="w-12 h-12 rounded-full border-4 border-[#1a1a1a]/10 border-t-[#8a7d5a] animate-spin mb-4" />
        <span className="text-sm font-medium text-[#666]">Loading...</span>
      </div>
    }>
      <RegisterFormContent />
    </Suspense>
  );
}
