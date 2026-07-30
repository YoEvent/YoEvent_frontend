export interface PricingPlan {
  name: string;
  price: number;
  billingCycle: string;
  maxEvents: number;
  maxUsers: number;
  maxAttendeesPerEvent: number;
  featuresEnabled: string;
  popular?: boolean;
  planId?: string;
  currency?: string;
  status?: string;
}

/** Offline fallback shown only if the backend call fails — not used once real plans load. */
export const DEFAULT_PRICING_PLANS: PricingPlan[] = [
  {
    name: "Starter",
    price: 0,
    billingCycle: "MONTHLY",
    maxEvents: 3,
    maxUsers: 1,
    maxAttendeesPerEvent: 100,
    featuresEnabled: "Basic Analytics, Q&A",
    currency: "XAF",
  },
  {
    name: "Pro",
    price: 15_000,
    billingCycle: "MONTHLY",
    maxEvents: 10,
    maxUsers: 3,
    maxAttendeesPerEvent: 500,
    featuresEnabled: "Ticket Sales, Email Campaigns, Basic Branding",
    currency: "XAF",
  },
  {
    name: "Eventer",
    price: 35_000,
    billingCycle: "MONTHLY",
    maxEvents: 25,
    maxUsers: 10,
    maxAttendeesPerEvent: 2_000,
    featuresEnabled: "Sponsors, Custom Domains, Advanced Analytics",
    currency: "XAF",
  },
  {
    name: "Enterprise",
    price: 85_000,
    billingCycle: "MONTHLY",
    maxEvents: -1,
    maxUsers: 25,
    maxAttendeesPerEvent: 10_000,
    featuresEnabled: "Dedicated Support, SLA, Advanced Queuing, Queue Analytics",
    currency: "XAF",
  },
];

/** An EventaaS API plan — independent catalog from the YoEvent hosting plans above; sold purely as a monthly API-call quota. */
export interface ApiPricingPlan {
  name: string;
  price: number;
  billingCycle: string;
  maxApiCallsPerMonth: number;
  popular?: boolean;
  planId?: string;
  currency?: string;
  status?: string;
}

/** Offline fallback shown only if the backend call fails — not used once real API plans load. */
export const DEFAULT_API_PRICING_PLANS: ApiPricingPlan[] = [
  { name: "FREE", price: 0, billingCycle: "MONTHLY", maxApiCallsPerMonth: 1000, currency: "XAF" },
  { name: "STARTER", price: 15_000, billingCycle: "MONTHLY", maxApiCallsPerMonth: 100_000, currency: "XAF" },
  { name: "GROWTH", price: 45_000, billingCycle: "MONTHLY", maxApiCallsPerMonth: 500_000, currency: "XAF", popular: true },
  { name: "SCALE", price: 120_000, billingCycle: "MONTHLY", maxApiCallsPerMonth: 5_000_000, currency: "XAF" },
];

/** Same active/sort filtering as {@link getActivePlans}, for the API-plan catalog. */
export function getActiveApiPlans(apiPlans: ApiPricingPlan[] | null | undefined): ApiPricingPlan[] {
  if (!apiPlans?.length) return DEFAULT_API_PRICING_PLANS;
  const active = apiPlans.filter((p) => !p.status || p.status.toUpperCase() === "ACTIVE");
  return (active.length ? active : apiPlans).slice().sort((a, b) => a.price - b.price);
}

/**
 * Real, backend-driven plan list: whatever a super admin has configured (name, price,
 * currency, limits, features, however many plans exist), filtered to plans meant to be
 * customer-visible and sorted cheapest-first. Falls back to the curated defaults above
 * only if the API call failed or returned nothing.
 */
export function getActivePlans(apiPlans: PricingPlan[] | null | undefined): PricingPlan[] {
  if (!apiPlans?.length) return DEFAULT_PRICING_PLANS;
  const active = apiPlans.filter((p) => !p.status || p.status.toUpperCase() === "ACTIVE");
  return (active.length ? active : apiPlans).slice().sort((a, b) => a.price - b.price);
}

/** Currency-aware price formatter. Defaults to XAF for callers that don't have a plan's currency handy. */
export function formatPrice(price: number, currency?: string): string {
  const amount = Math.round(price);
  if (amount === 0) return "Free";
  const code = (currency || "XAF").toUpperCase();
  try {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Intl doesn't recognize the code (e.g. a non-ISO placeholder) — fall back to a plain suffix.
    return `${amount.toLocaleString("fr-FR")} ${code}`;
  }
}

/** @deprecated Use formatPrice(price, currency) — kept only for any caller not yet updated. */
export function formatCfaPrice(price: number): string {
  return formatPrice(price, "XAF");
}

// Internal app-wide feature gating (e.g. "if planTier === PREMIUM show X") still needs a
// coarse tier concept even though pricing display is now fully dynamic — the backend has no
// explicit tier field, only a plan name, so this heuristic remains the tier source for that
// unrelated purpose. Do not use this to select/link a specific plan for checkout; use the
// plan's own planId/name for that.
export function mapPlanNameToTier(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("enterprise") || n.includes("premium")) return "PREMIUM";
  if (n.includes("eventer") || n.includes("mega")) return "PREMIUM";
  if (n.includes("pro") || n.includes("basic")) return "BASIC";
  return "FREE";
}
