"use client";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, CheckCircle, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { api, setStoredAuth } from "@/app/utils/api";
import { paymentService } from "@/app/utils/services/paymentService";
import { getDisplayPlans, formatCfaPrice } from "@/app/utils/pricingPlans";
import { useLanguage } from "@/app/context/LanguageContext";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "mock_key";
const isMockStripe =
  !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === "mock_key";

let stripePromise: Promise<any> | null = null;
const getStripePromise = () => {
  if (typeof window === "undefined") return null;
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublishableKey);
  }
  return stripePromise;
};

const cardElementOptions = {
  style: {
    base: {
      fontSize: "14px",
      color: "#1a1a1a",
      "::placeholder": { color: "#888" },
    },
    invalid: { color: "#dc2626" },
  },
};

function StripeCardSubscribeForm({
  mappedPlan,
  tenantId,
  email,
  onSuccess,
  onError,
}: {
  mappedPlan: any;
  tenantId: string;
  email: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mappedPlan?.planId) {
      onError(t("registerPage.card.planNotLinked"));
      return;
    }

    setSubmitting(true);
    try {
      let paymentMethodId: string | undefined;

      if (!isMockStripe) {
        if (!stripe || !elements) throw new Error(t("registerPage.card.stripeLoading"));
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) throw new Error(t("registerPage.card.enterCardDetails"));

        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: { email },
        });
        if (pmError) throw new Error(pmError.message);
        paymentMethodId = paymentMethod.id;
      }

      const result = await paymentService.createSubscription({
        tenantId,
        planId: mappedPlan.planId,
        amount: mappedPlan.price,
        currency: "XAF",
        provider: "stripe",
        paymentMethodId,
      });

      if (result.clientSecret && stripe) {
        const { error: confirmError } = await stripe.confirmCardPayment(result.clientSecret);
        if (confirmError) throw new Error(confirmError.message);
      }

      onSuccess();
    } catch (err: any) {
      onError(err.message || t("registerPage.card.subscriptionFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!isMockStripe ? (
        <div>
          <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{t("registerPage.card.cardDetailsLabel")}</label>
          <div className="px-4 py-3 bg-[#fcfbf9] border-[1.5px] border-[#e5e7eb] rounded-xl">
            <CardElement options={cardElementOptions} />
          </div>
          <p className="text-[10px] text-[#888] mt-1.5">{t("registerPage.card.testCardHint")}</p>
        </div>
      ) : (
        <p className="text-[10px] text-[#888] bg-white border border-[#e5e7eb] rounded-xl px-4 py-3">
          {t("registerPage.card.mockModePrefix")} <code className="text-[#FF4747]">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> {t("registerPage.card.mockModeSuffix")}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || (!isMockStripe && !stripe)}
        className="w-full py-3.5 bg-[#FF4747] text-white rounded-full text-sm font-semibold hover:bg-[#e03e3e] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {submitting ? t("registerPage.card.processingPayment") : t("registerPage.card.payAndSubscribe", { price: formatCfaPrice(mappedPlan?.price ?? 0) })}
      </button>
    </form>
  );
}

function RegisterFormContent() {
  const router = useRouter();
  const { t, tl } = useLanguage();
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
  const [registeredAuth, setRegisteredAuth] = useState<{ tenantId: string; email: string } | null>(null);
  const [paymentTab, setPaymentTab] = useState<"stripe" | "momo">("stripe");
  const [momoPhone, setMomoPhone] = useState("");
  const [momoWaiting, setMomoWaiting] = useState(false);
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  useEffect(() => {
    // Curated FCFA prices (same source /pricing uses) — the raw subscriptionplans
    // rows in the DB hold placeholder values (29, 99) that were never converted
    // to real currency amounts, so we don't display or charge those directly.
    api.get<any[]>("/api/v1/subscriptionplans", { skipAuth: true })
      .then((data) => {
        setPlans(getDisplayPlans(data));
      })
      .catch((err) => {
        console.error("Failed to load subscription plans:", err);
      });
  }, []);

  const isPaidPlan = planName.toLowerCase().includes("pro") ||
                     planName.toLowerCase().includes("enterprise") ||
                     planName.toLowerCase().includes("basic") ||
                     planName.toLowerCase().includes("premium") ||
                     planName.toLowerCase().includes("mega");

  const getPrice = () => {
    const lower = planName.toLowerCase();
    if (lower.includes("enterprise") || lower.includes("premium")) return 85000;
    if (lower.includes("eventer") || lower.includes("mega")) return 35000;
    if (lower.includes("pro") || lower.includes("basic")) return 15000;
    return 0;
  };

  const mappedPlan = plans.find((p) => {
    const lowerName = planName.toLowerCase();
    if (lowerName.includes("enterprise") || lowerName.includes("premium")) return p.name === "Enterprise";
    if (lowerName.includes("eventer") || lowerName.includes("mega")) return p.name === "Eventer";
    if (lowerName.includes("pro") || lowerName.includes("basic")) return p.name === "Pro";
    return p.name === "Starter";
  });

  const strength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strengthLabel = ["", t("registerPage.form.strengthWeak"), t("registerPage.form.strengthFair"), t("registerPage.form.strengthGood"), t("registerPage.form.strengthStrong")];
  const strengthColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const s = strength(form.password);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = t("registerPage.form.errorRequired");
    if (!form.lastName.trim()) e.lastName = t("registerPage.form.errorRequired");
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = t("registerPage.form.errorValidEmail");
    if (roleMode === "ORGANIZER" && isOrg && !form.orgName.trim()) e.orgName = t("registerPage.form.errorRequired");
    if (form.password.length < 8) e.password = t("registerPage.form.errorMinPassword");
    if (form.password !== form.confirm) e.confirm = t("registerPage.form.errorPasswordsMismatch");
    if (!form.agree) e.agree = t("registerPage.form.errorAcceptTerms");
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (isPaidPlan) {
      await handleRegisterThenShowPayment();
    } else {
      await handleRegisterOnly();
    }
  };

  const handleRegisterOnly = async () => {
    setLoading(true);
    try {
      const isAttendee = roleMode === "ATTENDEE";
      
      // Call the local backend directly to register the user
      await api.post("/api/v1/auth/register", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        isAttendee,
        workspaceName: isAttendee ? undefined : (isOrg ? form.orgName : `${form.firstName} ${form.lastName}`),
        type: isAttendee ? undefined : (isOrg ? "ORGANIZATION" : "INDIVIDUAL"),
      });

      setSubmitted(true);
      setTimeout(() => router.push(from ? `/login?from=${encodeURIComponent(from)}` : "/login"), 2000);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, submit: err.message || t("registerPage.form.errorRegisterFailed") }));
    } finally {
      setLoading(false);
    }
  };

  // Creates the account + tenant workspace first, then drops into the real
  // Stripe/Mobile Money checkout for the selected paid plan.
  const handleRegisterThenShowPayment = async () => {
    setLoading(true);
    try {
      // Direct local registration
      const raw = await api.post<any>("/api/v1/auth/register", {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        isAttendee: false,
        workspaceName: isOrg ? form.orgName : `${form.firstName} ${form.lastName}`,
        type: isOrg ? "ORGANIZATION" : "INDIVIDUAL",
      });
      
      const authData = {
        token: raw?.token ?? "",
        type: "Bearer",
        userId: raw?.userId ?? "",
        tenantId: raw?.tenantId ?? "",
        email: form.email,
        planTier: "FREE",
      };
      setStoredAuth(authData);
      setRegisteredAuth({ tenantId: authData.tenantId, email: authData.email });
      setShowPayment(true);
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, submit: err.message || t("registerPage.form.errorRegisterFailed") }));
    } finally {
      setLoading(false);
    }
  };

  const onPaymentSuccess = () => {
    setPaymentSuccess(true);
    setSubmitted(true);
    setTimeout(() => router.push(from ? `/login?from=${encodeURIComponent(from)}` : "/login"), 2500);
  };

  const handleMomoSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setCardErrors({});
    if (!registeredAuth?.tenantId || !mappedPlan?.planId) {
      setCardErrors({ submit: t("registerPage.payment.planNotLinked") });
      return;
    }
    if (momoPhone.replace(/\D/g, "").length < 9) {
      setCardErrors({ submit: t("registerPage.payment.invalidPhone") });
      return;
    }

    setPaymentLoading(true);
    try {
      const subscription = await paymentService.createSubscription({
        tenantId: registeredAuth.tenantId,
        planId: mappedPlan.planId,
        amount: mappedPlan.price,
        currency: "XAF",
        provider: "momo",
        phoneNumber: momoPhone,
      });

      setPaymentLoading(false);
      setMomoWaiting(true);
      let confirmed = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        await sleep(3000);
        const status = await paymentService.checkSubscriptionMobileMoneyStatus(subscription.id).catch(() => null);
        if (status?.status === "ACTIVE") {
          confirmed = true;
          setMomoWaiting(false);
          onPaymentSuccess();
          break;
        }
        if (status?.status === "FAILED") {
          setMomoWaiting(false);
          setCardErrors({ submit: t("registerPage.payment.momoFailed") });
          return;
        }
      }
      if (!confirmed) {
        setMomoWaiting(false);
        setCardErrors({ submit: t("registerPage.payment.momoStillWaiting") });
      }
    } catch (err: any) {
      setPaymentLoading(false);
      setMomoWaiting(false);
      setCardErrors({ submit: err.message || t("registerPage.payment.subscriptionCreateFailed") });
    }
  };

  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* NAV */}
      <nav className="flex items-center justify-between px-16 py-5 bg-white border-b border-[#e5e7eb]">
        <Link href="/" className="font-display text-2xl font-black tracking-tight text-[#1a1a1a] hover:opacity-80 transition-opacity">
          Yow<span className="text-[#FF4747]">Event</span>
        </Link>
        <span className="text-sm text-[#888]">{t("registerPage.nav.alreadyHaveAccount")}{" "}
          <Link href={from ? `/login?from=${encodeURIComponent(from)}` : "/login"} className="text-[#1a1a1a] font-semibold hover:underline">{t("registerPage.nav.login")}</Link>
        </span>
      </nav>

      <main className="flex-1 grid md:grid-cols-2">
        {/* LEFT */}
        <div className="bg-white px-14 py-16 flex flex-col justify-center">
          <div className="relative z-10">
            <span className="inline-block bg-[#FF4747]/10 border border-[#FF4747]/20 rounded-full px-4 py-1.5 text-xs text-[#FF4747] uppercase tracking-widest mb-8">{t("registerPage.left.badge")}</span>
            <h2 className="font-display text-4xl font-bold text-[#1a1a1a] leading-[1.15] tracking-tight mb-5">
              {t("registerPage.left.headline1")}<br /><em className="italic text-[#FF4747]">{t("registerPage.left.headline2")}</em>
            </h2>
            <p className="text-sm text-[#666] leading-relaxed max-w-sm mb-12">{t("registerPage.left.subtitle")}</p>
            <div className="space-y-6">
              {(["🎟", "🔒", "📊", "⚡"] as const).map((icon, i) => {
                const item = (tl("registerPage.left.features") as { title: string; desc: string }[])[i];
                return (
                  <div key={item.title} className="flex items-start gap-4">
                    <div className="w-9 h-9 rounded-xl bg-[#f5f5f5] flex items-center justify-center text-base flex-shrink-0 shadow-sm">{icon}</div>
                    <div>
                      <div className="text-sm font-medium text-[#1a1a1a] mb-0.5">{item.title}</div>
                      <div className="text-xs text-[#777]">{item.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="bg-white px-14 py-12 flex flex-col justify-center">
          {showPayment ? (
            <div>
              {!paymentSuccess && !momoWaiting && (
                <button
                  type="button"
                  onClick={() => setShowPayment(false)}
                  className="text-xs font-semibold text-[#FF4747] hover:underline mb-4 cursor-pointer"
                >
                  {t("registerPage.payment.back")}
                </button>
              )}

              <h2 className="font-display text-3xl font-bold tracking-tight mb-2 text-[#FF4747]">{t("registerPage.payment.securePayment")}</h2>
              <p className="text-sm text-[#888] mb-6">{t("registerPage.payment.accountReady", { planName: mappedPlan?.name || planName })}</p>

              {paymentSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 border border-green-200">
                    <ShieldCheck className="text-green-500" size={32} />
                  </div>
                  <h3 className="text-lg font-bold text-green-800 mb-1">{t("registerPage.payment.paymentSuccessful")}</h3>
                  <p className="text-sm text-green-700">{t("registerPage.payment.accountCreatedRedirecting")}</p>
                </div>
              ) : momoWaiting ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-8 h-8 mb-4 border-2 border-[#FF4747] border-t-transparent rounded-full animate-spin" />
                  <h3 className="text-sm font-bold text-[#1a1a1a] mb-1">{t("registerPage.payment.checkPhone")}</h3>
                  <p className="text-xs text-[#888]">{t("registerPage.payment.waitingForPhone", { phone: momoPhone })}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cardErrors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
                      ⚠️ {cardErrors.submit}
                    </div>
                  )}

                  {/* Order Summary badge */}
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 flex justify-between items-center mb-2">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#FF4747]">{t("registerPage.payment.selectedSubscription")}</span>
                      <h4 className="text-sm font-bold text-[#1a1a1a]">{mappedPlan?.name || planName} {t("registerPage.payment.planSuffix")}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-extrabold text-[#1a1a1a]">{formatCfaPrice(mappedPlan?.price ?? getPrice())}</span>
                      <span className="text-[10px] text-[#888] block">{t("registerPage.payment.perMonth")}</span>
                    </div>
                  </div>

                  {/* Payment method tabs */}
                  <div className="flex bg-[#f9fafb] rounded-xl p-1 border border-[#e5e7eb]">
                    <button
                      type="button"
                      onClick={() => setPaymentTab("stripe")}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${paymentTab === "stripe" ? "bg-[#FF4747] text-white shadow-sm" : "text-[#555] hover:text-[#FF4747]"}`}
                    >
                      <Lock size={12} /> {t("registerPage.payment.tabCard")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentTab("momo")}
                      className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${paymentTab === "momo" ? "bg-[#FF4747] text-white shadow-sm" : "text-[#555] hover:text-[#FF4747]"}`}
                    >
                      <Smartphone size={12} /> {t("registerPage.payment.tabMobileMoney")}
                    </button>
                  </div>

                  {paymentTab === "stripe" ? (
                    <Elements stripe={getStripePromise()}>
                      <StripeCardSubscribeForm
                        mappedPlan={mappedPlan}
                        tenantId={registeredAuth?.tenantId || ""}
                        email={registeredAuth?.email || form.email}
                        onSuccess={onPaymentSuccess}
                        onError={(msg) => setCardErrors({ submit: msg })}
                      />
                    </Elements>
                  ) : (
                    <form onSubmit={handleMomoSubscribe} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{t("registerPage.payment.phoneNumberLabel")}</label>
                        <input
                          type="tel"
                          required
                          placeholder="6xxxxxxxxx"
                          value={momoPhone}
                          onChange={(e) => setMomoPhone(e.target.value.replace(/\D/g, ""))}
                          className="w-full px-4 py-2.5 border-[1.5px] border-[#e5e7eb] rounded-xl text-sm bg-white outline-none transition-all focus:border-[#FF4747]"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={paymentLoading}
                        className="w-full py-3.5 bg-[#FF4747] text-white rounded-full text-sm font-semibold hover:bg-[#e03e3e] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                      >
                        {paymentLoading ? t("registerPage.payment.sendingUssd") : t("registerPage.payment.payAndSubscribe", { price: formatCfaPrice(mappedPlan?.price ?? getPrice()) })}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight mb-2 text-[#FF4747]">{t("registerPage.form.createAccount")}</h2>
              <p className="text-sm text-[#888] mb-8">{t("registerPage.nav.alreadyHaveAccount")}{" "}<Link href="/login" className="text-[#1a1a1a] font-semibold hover:underline">{t("registerPage.nav.login")}</Link></p>

              {isPaidPlan && (
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 flex justify-between items-center mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#FF4747]">{t("registerPage.form.selectedPlan")}</span>
                    <h4 className="text-sm font-bold text-[#1a1a1a]">{planName}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-extrabold text-[#1a1a1a]">{formatCfaPrice(mappedPlan?.price ?? getPrice())}</span>
                    <span className="text-[10px] text-[#888]">{t("registerPage.form.perMonth")}</span>
                  </div>
                </div>
              )}

              {submitted && (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-sm text-green-700">
                  <CheckCircle size={16} /> {t("registerPage.form.accountCreatedRedirecting")}
                </div>
              )}

              {errors.submit && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700">
                  ⚠️ {errors.submit}
                </div>
              )}

              <div className="flex bg-white rounded-xl p-1 mb-6 border border-[#e5e7eb]">
                <button
                  type="button"
                  onClick={() => setRoleMode("ATTENDEE")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    roleMode === "ATTENDEE" ? "bg-[#FF4747] text-white shadow-sm" : "text-[#555] hover:text-[#FF4747]"
                  }`}
                >
                  {t("registerPage.form.tabAttendee")}
                </button>
                <button
                  type="button"
                  onClick={() => setRoleMode("ORGANIZER")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    roleMode === "ORGANIZER" ? "bg-[#FF4747] text-white shadow-sm" : "text-[#555] hover:text-[#FF4747]"
                  }`}
                >
                  {t("registerPage.form.tabOrganizer")}
                </button>
              </div>

              {roleMode === "ORGANIZER" && (
                <div className="flex bg-stone-100 rounded-lg p-1 mb-6 border border-stone-200 w-2/3">
                  <button
                    type="button"
                    onClick={() => setIsOrg(false)}
                    className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all cursor-pointer ${
                      !isOrg ? "bg-white text-[#FF4747] shadow-sm" : "text-[#888] hover:text-[#FF4747]"
                    }`}
                  >
                    {t("registerPage.form.subTabIndividual")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOrg(true)}
                    className={`flex-1 py-1.5 text-[10px] uppercase font-bold rounded-md transition-all cursor-pointer ${
                      isOrg ? "bg-white text-[#FF4747] shadow-sm" : "text-[#888] hover:text-[#FF4747]"
                    }`}
                  >
                    {t("registerPage.form.subTabOrganisation")}
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {(["firstName", "lastName"] as const).map((f) => (
                    <div key={f}>
                      <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{f === "firstName" ? t("registerPage.form.firstName") : t("registerPage.form.lastName")}</label>
                      <input value={form[f]} onChange={(e) => set(f, e.target.value)}
                        placeholder={f === "firstName" ? "Jean" : "Dupont"}
                        className={`w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-white outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(255, 71, 71, .15)] ${errors[f] ? "border-red-400" : "border-[#e5e7eb] focus:border-[#FF4747]"}`} />
                      {errors[f] && <p className="text-xs text-red-500 mt-1">{errors[f]}</p>}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{t("registerPage.form.emailAddress")}</label>
                  <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder={t("registerPage.form.emailPlaceholder")}
                    className={`w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-white outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(255, 71, 71, .15)] ${errors.email ? "border-red-400" : "border-[#e5e7eb] focus:border-[#FF4747]"}`} />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
                </div>

                {roleMode === "ORGANIZER" && isOrg && (
                  <div>
                    <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{t("registerPage.form.organisationName")}</label>
                    <input type="text" value={form.orgName} onChange={(e) => set("orgName", e.target.value)} placeholder={t("registerPage.form.orgNamePlaceholder")}
                      className={`w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-white outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(255, 71, 71, .15)] ${errors.orgName ? "border-red-400" : "border-[#e5e7eb] focus:border-[#FF4747]"}`} />
                    {errors.orgName && <p className="text-xs text-red-500 mt-1">{errors.orgName}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{t("registerPage.form.password")}</label>
                  <div className="relative">
                    <input type={show ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={t("registerPage.form.passwordPlaceholder")}
                      className={`w-full px-4 py-2.5 pr-11 border-[1.5px] rounded-xl text-sm bg-white outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(255, 71, 71, .15)] ${errors.password ? "border-red-400" : "border-[#e5e7eb] focus:border-[#FF4747]"}`} />
                    <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#1a1a1a]">
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {form.password && (
                    <div className="mt-2">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= s ? strengthColor[s] : "bg-[#e5e7eb]"}`} />
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
                      className={`w-full px-4 py-2.5 pr-11 border-[1.5px] rounded-xl text-sm bg-white outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(255, 71, 71, .15)] ${errors.confirm ? "border-red-400" : "border-[#e5e7eb] focus:border-[#FF4747]"}`} />
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
                  className="w-full py-3.5 bg-[#FF4747] text-white rounded-full text-sm font-semibold hover:bg-[#e03e3e] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 cursor-pointer">
                  {loading ? "Creating account…" : submitted ? "✓ Account Created!" : isPaidPlan ? "Proceed to Payment" : "Create Free Account"}
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-white">
        <div className="w-12 h-12 rounded-full border-4 border-[#1a1a1a]/10 border-t-[#FF4747] animate-spin mb-4" />
        <span className="text-sm font-medium text-[#666]">Loading...</span>
      </div>
    }>
      <RegisterFormContent />
    </Suspense>
  );
}
