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

const FEATURE_LABELS: Record<string, string> = {
  BASIC_EVENT: "Event Creation",
  TICKET_SALES: "Ticket Sales",
  ANALYTICS: "Analytics Dashboard",
  CUSTOM_DOMAIN: "Custom Domain",
  EMAIL_CAMPAIGNS: "Email Campaigns",
  NETWORKING: "Networking Tools",
  SPONSORS: "Sponsor Management",
  DEDICATED_SUPPORT: "Dedicated Support",
  SLA: "Service Level Agreement",
  ADVANCED_QUEUING: "Advanced Queuing",
  QUEUE_ANALYTICS: "Queue Analytics",
};

function formatFeature(raw: string): string {
  const key = raw.trim().toUpperCase().replace(/\s+/g, "_");
  if (FEATURE_LABELS[key]) return FEATURE_LABELS[key];
  return raw.trim().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatLimit(value: number, unit: string): string {
  if (value === -1 || value === undefined || value === null) return `Unlimited ${unit}`;
  return `Up to ${value} ${unit}`;
}

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "mock_key";
const stripePromise = loadStripe(stripePublishableKey);
const isMockStripe =
  !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY === "mock_key";

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan.planId) {
      alert("This plan is not linked to the billing system yet. Please contact support.");
      return;
    }

    setSubmitting(true);
    try {
      let paymentMethodId: string | undefined;

      if (!isMockStripe) {
        if (!stripe || !elements) {
          throw new Error("Stripe is still loading. Please try again.");
        }
        const cardElement = elements.getElement(CardElement);
        if (!cardElement) throw new Error("Please enter your card details.");

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
      alert(err.message || "Failed to create subscription. Make sure your workspace settings are configured.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-xs">
      {!isMockStripe ? (
        <div>
          <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">
            Card Details
          </label>
          <div className="px-4 py-3 bg-[#fcfbf9] border border-[#e5e7eb] rounded-xl">
            <CardElement options={cardElementOptions} />
          </div>
          <p className="text-[10px] text-[#888] mt-1.5">Test card: 4242 4242 4242 4242 · any future expiry · any CVC</p>
        </div>
      ) : (
        <p className="text-[10px] text-[#888] bg-[#ffffff] border border-[#e5e7eb] rounded-xl px-4 py-3">
          Stripe mock mode — no real card required. Set <code className="text-[#FF4747]">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> for live payments.
        </p>
      )}
      <button
        type="submit"
        disabled={submitting || (!isMockStripe && !stripe)}
        className="w-full py-3.5 bg-[#1a1a1a] hover:bg-[#333] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
      >
        {submitting ? "Processing payment..." : `Pay ${formatCfaPrice(selectedPlan.price)} & Subscribe`}
      </button>
    </form>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_PRICING_PLANS);
  const [loading, setLoading] = useState(true);

  // Subscription modal states
  const [auth, setAuth] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "stripe">("momo");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    setShowModal(true);
  };

  const completeSubscription = () => {
    const currentAuth = getStoredAuth();
    if (!currentAuth || !selectedPlan) return;

    setStoredAuth({ ...currentAuth, planTier: mapPlanNameToTier(selectedPlan.name) });
    alert(`Successfully subscribed to the ${selectedPlan.name} plan!`);
    setShowModal(false);
    router.push("/admin");
  };

  const handleMomoSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentAuth = getStoredAuth();
    if (!currentAuth?.tenantId || !selectedPlan) {
      alert("You need an organizer workspace before subscribing. Use Upgrade to Organizer first.");
      router.push("/user/dashboard?upgrade=1");
      return;
    }
    if (!selectedPlan.planId) {
      alert("This plan is not linked to the billing system yet. Please contact support.");
      return;
    }

    setSubmitting(true);
    try {
      await paymentService.createSubscription({
        tenantId: currentAuth.tenantId,
        planId: selectedPlan.planId,
        amount: selectedPlan.price,
        currency: "XAF",
        provider: "momo",
      });
      completeSubscription();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to create subscription. Make sure your workspace settings are configured.");
    } finally {
      setSubmitting(false);
    }
  };

  const displayPlans = plans;

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1a1a1a]">
      <Navbar />

      {/* HEADER */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <span className="inline-block bg-[#FF4747]/10 border border-[#FF4747]/20 rounded-full px-4 py-1.5 text-xs text-[#FF4747] uppercase tracking-widest mb-4">Pricing Plans</span>
          <h1 className="font-display text-5xl font-black tracking-tight mb-3">Honest, flexible pricing</h1>
          <p className="text-sm text-[#666] max-w-md mx-auto">Scale your events effortlessly. Upgrade, downgrade, or cancel at any time.</p>
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
                    ? "bg-[#1a1a1a] text-white border-transparent shadow-2xl relative overflow-hidden"
                    : "bg-white border-[#e5e7eb] text-[#1a1a1a]"
                }`}
              >
                {isHighlighted && (
                  <div className="absolute top-0 right-0 bg-[#FF4747] text-white text-[9px] uppercase tracking-wider font-extrabold px-5 py-1.5 rounded-bl-2xl">
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 className="font-display text-xl font-bold mb-4">{plan.name}</h3>
                  <div className="flex items-baseline mb-6 flex-wrap gap-x-1.5">
                    <span className="text-3xl font-extrabold font-display break-words">{formatCfaPrice(plan.price)}</span>
                    <span className={`text-xs ${isHighlighted ? "text-[#aaa]" : "text-[#888]"}`}>
                      /{plan.billingCycle?.toLowerCase()}
                    </span>
                  </div>

                  <hr className={`my-6 border-t ${isHighlighted ? "border-[#333]" : "border-[#e5e7eb]"}`} />

                  <ul className="space-y-4 text-xs list-none pl-0">
                    <li className="flex items-start gap-2.5 min-w-0">
                      <span className="text-green-500 font-bold shrink-0">✓</span>
                      <span className="min-w-0">{formatLimit(plan.maxEvents, "Events")}</span>
                    </li>
                    <li className="flex items-start gap-2.5 min-w-0">
                      <span className="text-green-500 font-bold shrink-0">✓</span>
                      <span className="min-w-0">{formatLimit(plan.maxUsers, "Team Members")}</span>
                    </li>
                    <li className="flex items-start gap-2.5 min-w-0">
                      <span className="text-green-500 font-bold shrink-0">✓</span>
                      <span className="min-w-0">{formatLimit(plan.maxAttendeesPerEvent, "Attendees/Event")}</span>
                    </li>
                    {(plan.featuresEnabled || "Access to basic resources")
                      .split(",")
                      .map((feature: string, fi: number) => (
                        <li key={fi} className="flex items-start gap-2.5 min-w-0">
                          <span className="text-green-500 font-bold shrink-0">✓</span>
                          <span className="min-w-0">{formatFeature(feature)}</span>
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
                        : "bg-[#1a1a1a] hover:bg-[#333] text-white"
                    }`}
                  >
                    Choose {plan.name}
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
                <h3 className="font-display text-2xl font-black text-[#1a1a1a]">Subscribe to {selectedPlan.name}</h3>
                <p className="text-xs text-[#666] mt-1">Upgrade your tenant workspace plan instantly.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-zinc-400 hover:text-zinc-600 text-xl font-bold bg-transparent border-none cursor-pointer">✕</button>
            </div>

            <div className="p-4 bg-[#ffffff] border border-[#e5e7eb] rounded-xl flex justify-between items-center text-xs">
              <span className="font-semibold text-[#555]">Plan price:</span>
              <span className="font-black text-base text-[#FF4747]">{formatCfaPrice(selectedPlan.price)} / {selectedPlan.billingCycle?.toLowerCase()}</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "momo" | "stripe")}
                  className="w-full px-4 py-2.5 bg-[#fcfbf9] border border-[#e5e7eb] rounded-xl text-xs text-[#1a1a1a] outline-none"
                >
                  <option value="momo">MTN / Orange Mobile Money</option>
                  <option value="stripe">
                    {isMockStripe ? "Stripe Card Payment (Mock Simulation)" : "Stripe Card Payment"}
                  </option>
                </select>
              </div>

              {paymentMethod === "momo" ? (
                <form onSubmit={handleMomoSubscribe} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Phone Number (MTN/Orange)</label>
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
                    className="w-full py-3.5 bg-[#1a1a1a] hover:bg-[#333] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    {submitting ? "Processing payment..." : "Confirm & Subscribe"}
                  </button>
                </form>
              ) : auth?.tenantId ? (
                <Elements stripe={stripePromise}>
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
