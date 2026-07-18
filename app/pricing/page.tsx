"use client";
import { useState, useEffect } from "react";
import { api, getStoredAuth, setStoredAuth } from "@/app/utils/api";
import { paymentService } from "@/app/utils/services/paymentService";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  DEFAULT_PRICING_PLANS,
  formatCfaPrice,
  getDisplayPlans,
  mapPlanNameToTier,
  type PricingPlan,
} from "@/app/utils/pricingPlans";
import { useLanguage } from "@/app/context/LanguageContext";

const FEATURE_KEYS: Record<string, string> = {
  BASIC_EVENT: "basicEvent",
  TICKET_SALES: "ticketSales",
  ANALYTICS: "analytics",
  CUSTOM_DOMAIN: "customDomain",
  EMAIL_CAMPAIGNS: "emailCampaigns",
  NETWORKING: "networking",
  SPONSORS: "sponsors",
  DEDICATED_SUPPORT: "dedicatedSupport",
  SLA: "sla",
  ADVANCED_QUEUING: "advancedQueuing",
  QUEUE_ANALYTICS: "queueAnalytics",
};

function formatFeature(raw: string, t: (key: string) => string): string {
  const key = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (FEATURE_KEYS[key]) return t(`pricing.features.${FEATURE_KEYS[key]}`);
  return raw.trim().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatLimit(value: number, unitLabel: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (value === -1 || value === undefined || value === null) return t("pricing.limits.unlimited", { unit: unitLabel });
  return t("pricing.limits.upTo", { value, unit: unitLabel });
}

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

function StripeSubscriptionForm({
  selectedPlan,
  auth,
  onSuccess,
}: {
  selectedPlan: PricingPlan;
  auth: { tenantId: string; email?: string };
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan.planId) {
      alert(t("pricing.stripeForm.errors.planNotLinked"));
      return;
    }

    setSubmitting(true);
    try {
      let paymentMethodId: string | undefined;

      if (!isMockStripe) {
        if (!stripe || !elements) {
          throw new Error(t("pricing.stripeForm.errors.stripeLoading"));
        }
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) throw new Error(t("pricing.stripeForm.errors.enterCardDetails"));

        const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
          billing_details: { email: auth.email || undefined },
        });
        if (pmError) throw new Error(pmError.message);
        paymentMethodId = paymentMethod.id;
      }

      const result = await paymentService.createSubscription({
        tenantId: auth.tenantId,
        planId: selectedPlan.planId,
        amount: selectedPlan.price,
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
      console.error(err);
      alert(err.message || t("pricing.stripeForm.errors.subscriptionFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {!isMockStripe ? (
        <div>
          <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">
            {t("pricing.stripeForm.cardDetailsLabel")}
          </label>
          <div className="px-4 py-3 bg-[#fcfbf9] border border-[#e5e7eb] rounded-xl">
            <CardElement options={cardElementOptions} />
          </div>
          <p className="text-[10px] text-[#888] mt-1.5">{t("pricing.stripeForm.testCardNote")}</p>
        </div>
      ) : (
        <p className="text-[10px] text-[#888] bg-white border border-[#e5e7eb] rounded-xl px-4 py-3">
          {t("pricing.stripeForm.mockModePrefix")} <code className="text-[#FF4747]">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> {t("pricing.stripeForm.mockModeSuffix")}
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || (!isMockStripe && !stripe)}
        className="w-full py-3.5 bg-[#FF4747] hover:bg-[#e03e3e] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
      >
        {submitting ? t("pricing.stripeForm.processingPayment") : t("pricing.stripeForm.payAndSubscribe", { price: formatCfaPrice(selectedPlan.price) })}
      </button>
    </form>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_PRICING_PLANS);
  const [loading, setLoading] = useState(true);

  // Subscription modal states
  const [auth, setAuth] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "stripe">("momo");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [momoWaiting, setMomoWaiting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAuth(getStoredAuth());
    }
  }, []);

  useEffect(() => {
    api.get<PricingPlan[]>("/api/v1/subscriptionplans", { skipAuth: true })
      .then((data) => {
        setPlans(getDisplayPlans(data));
      })
      .catch((err) => {
        console.error("Failed to load subscription plans:", err);
        setPlans(DEFAULT_PRICING_PLANS);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleChoosePlan = (plan: PricingPlan) => {
    const currentAuth = getStoredAuth();
    if (!currentAuth) {
      router.push(`/login?from=${encodeURIComponent("/pricing")}`);
      return;
    }

    // Attendee without a workspace — send to dashboard upgrade flow
    if (!currentAuth.tenantId) {
      const tier = mapPlanNameToTier(plan.name);
      router.push(`/user/dashboard?upgrade=1&plan=${tier}`);
      return;
    }

    if (plan.price === 0) {
      router.push("/admin");
      return;
    }

    setAuth(currentAuth);
    setSelectedPlan(plan);
    setMomoWaiting(false);
    setShowModal(true);
  };

  const completeSubscription = () => {
    const currentAuth = getStoredAuth();
    if (!currentAuth || !selectedPlan) return;

    setStoredAuth({ ...currentAuth, planTier: mapPlanNameToTier(selectedPlan.name) });
    alert(t("pricing.alerts.subscribedSuccess", { name: selectedPlan.name }));
    setShowModal(false);
    // Full reload (not router.push) so /admin's data fetch re-runs instead of reusing
    // Next.js's cached page instance, which would otherwise keep showing the old plan.
    window.location.href = "/admin";
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const handleMomoSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentAuth = getStoredAuth();
    if (!currentAuth?.tenantId || !selectedPlan) {
      alert(t("pricing.alerts.needWorkspace"));
      router.push("/user/dashboard?upgrade=1");
      return;
    }
    if (!selectedPlan.planId) {
      alert(t("pricing.alerts.planNotLinked"));
      return;
    }
    if (phoneNumber.replace(/\D/g, "").length < 9) {
      alert(t("pricing.alerts.invalidPhone"));
      return;
    }

    setSubmitting(true);
    try {
      const subscription = await paymentService.createSubscription({
        tenantId: currentAuth.tenantId,
        planId: selectedPlan.planId,
        amount: selectedPlan.price,
        currency: "XAF",
        provider: "momo",
        phoneNumber,
      });

      // Momo payments confirm asynchronously — poll until Campay reports success/failure.
      setSubmitting(false);
      setMomoWaiting(true);
      const subscriptionId = subscription.id;
      let confirmed = false;
      for (let attempt = 0; attempt < 20; attempt++) {
        await sleep(3000);
        const status = await paymentService.checkSubscriptionMobileMoneyStatus(subscriptionId).catch(() => null);
        if (status?.status === "ACTIVE") {
          confirmed = true;
          setMomoWaiting(false);
          completeSubscription();
          break;
        }
        if (status?.status === "FAILED") {
          setMomoWaiting(false);
          alert(t("pricing.alerts.momoFailed"));
          return;
        }
      }
      if (!confirmed) {
        setMomoWaiting(false);
        alert(t("pricing.alerts.momoStillWaiting"));
      }
    } catch (err: any) {
      console.error(err);
      setMomoWaiting(false);
      alert(err.message || t("pricing.alerts.subscriptionFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const displayPlans = plans;

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      <Navbar />

      {/* HEADER */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <span className="inline-block bg-[#FF4747]/10 border border-[#FF4747]/20 rounded-full px-4 py-1.5 text-xs text-[#FF4747] uppercase tracking-widest mb-4">{t("pricing.header.eyebrow")}</span>
          <h1 className="font-display text-5xl font-black tracking-tight mb-3">{t("pricing.header.title")}</h1>
          <p className="text-sm text-[#666] max-w-md mx-auto">{t("pricing.header.subtitle")}</p>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {displayPlans.map((plan, i) => {
            const isHighlighted = plan.popular;
            return (
              <div
                key={plan.planId || plan.name || i}
                className={`rounded-3xl p-8 border-[1.5px] flex flex-col justify-between transition-all hover:-translate-y-1 ${
                  isHighlighted
                    ? "bg-white text-[#1a1a1a] border-[#FF4747] shadow-xl shadow-[#FF4747]/10 relative overflow-hidden"
                    : "bg-white border-[#e5e7eb] text-[#1a1a1a]"
                }`}
              >
                {isHighlighted && (
                  <div className="absolute top-0 right-0 bg-[#FF4747] text-white text-[9px] uppercase tracking-wider font-extrabold px-5 py-1.5 rounded-bl-2xl">
                    {t("pricing.card.mostPopular")}
                  </div>
                )}
                <div>
                  <h3 className="font-display text-xl font-bold mb-4">{plan.name}</h3>
                  <div className="flex items-baseline mb-6 flex-wrap gap-x-1.5">
                    <span className="text-3xl font-extrabold font-display break-words">{formatCfaPrice(plan.price)}</span>
                    <span className="text-xs text-[#888]">
                      /{plan.billingCycle?.toLowerCase()}
                    </span>
                  </div>

                  <hr className="my-6 border-t border-[#e5e7eb]" />

                  <ul className="space-y-4 text-xs list-none pl-0">
                    <li className="flex items-start gap-2.5 min-w-0">
                      <span className="text-green-500 font-bold shrink-0">✓</span>
                      <span className="min-w-0">{formatLimit(plan.maxEvents, t("pricing.limits.unitEvents"), t)}</span>
                    </li>
                    <li className="flex items-start gap-2.5 min-w-0">
                      <span className="text-green-500 font-bold shrink-0">✓</span>
                      <span className="min-w-0">{formatLimit(plan.maxUsers, t("pricing.limits.unitTeamMembers"), t)}</span>
                    </li>
                    <li className="flex items-start gap-2.5 min-w-0">
                      <span className="text-green-500 font-bold shrink-0">✓</span>
                      <span className="min-w-0">{formatLimit(plan.maxAttendeesPerEvent, t("pricing.limits.unitAttendees"), t)}</span>
                    </li>
                    {(plan.featuresEnabled || t("pricing.features.defaultAccess"))
                      .split(",")
                      .map((feature: string, fi: number) => (
                        <li key={fi} className="flex items-start gap-2.5 min-w-0">
                          <span className="text-green-500 font-bold shrink-0">✓</span>
                          <span className="min-w-0">{formatFeature(feature, t)}</span>
                        </li>
                      ))
                    }
                  </ul>
                </div>

                <div className="mt-8">
                  <button
                    onClick={() => handleChoosePlan(plan)}
                    className={`w-full py-3.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                      isHighlighted
                        ? "bg-[#FF4747] hover:bg-[#e03e3e] text-white"
                        : "bg-transparent border-[1.5px] border-[#1a1a1a] text-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white"
                    }`}
                  >
                    {t("pricing.card.chooseButton", { name: plan.name })}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* SUBSCRIPTION Checkout Modal */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display text-2xl font-black text-[#1a1a1a]">{t("pricing.modal.subscribeTitle", { name: selectedPlan.name })}</h3>
                <p className="text-xs text-[#666] mt-1">{t("pricing.modal.subtitle")}</p>
              </div>
              <button onClick={() => { setShowModal(false); setMomoWaiting(false); }} className="text-zinc-400 hover:text-zinc-600 text-xl font-bold bg-transparent border-none cursor-pointer">✕</button>
            </div>

            <div className="p-4 bg-white border border-[#e5e7eb] rounded-xl flex justify-between items-center text-xs">
              <span className="font-semibold text-[#555]">{t("pricing.modal.planPriceLabel")}</span>
              <span className="font-black text-base text-[#FF4747]">{formatCfaPrice(selectedPlan.price)} / {selectedPlan.billingCycle?.toLowerCase()}</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{t("pricing.modal.paymentMethodLabel")}</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "momo" | "stripe")}
                  className="w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e5e7eb] rounded-xl text-xs text-[#1a1a1a] outline-none"
                >
                  <option value="momo">{t("pricing.modal.optionMomo")}</option>
                  <option value="stripe">
                    {isMockStripe ? t("pricing.modal.optionStripeMock") : t("pricing.modal.optionStripe")}
                  </option>
                </select>
              </div>

              {paymentMethod === "momo" ? (
                momoWaiting ? (
                  <div className="text-center py-4 space-y-3">
                    <div className="w-8 h-8 mx-auto border-2 border-[#FF4747] border-t-transparent rounded-full animate-spin" />
                    <p className="text-[#555] font-semibold">{t("pricing.modal.momoWaitingTitle")}</p>
                    <p className="text-[10px] text-[#888]">{t("pricing.modal.momoWaitingSubtitle", { phone: phoneNumber })}</p>
                  </div>
                ) : (
                  <form onSubmit={handleMomoSubscribe} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{t("pricing.modal.phoneLabel")}</label>
                      <input
                        type="tel"
                        required
                        placeholder="6xxxxxxxxx"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                        className="w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e5e7eb] rounded-xl text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747]"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 bg-[#FF4747] hover:bg-[#e03e3e] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      {submitting ? t("pricing.modal.sendingUssd") : t("pricing.modal.confirmAndSubscribe")}
                    </button>
                  </form>
                )
              ) : auth?.tenantId ? (
                <Elements stripe={getStripePromise()}>
                  <StripeSubscriptionForm
                    selectedPlan={selectedPlan}
                    auth={{ tenantId: auth.tenantId, email: auth.email }}
                    onSuccess={completeSubscription}
                  />
                </Elements>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
