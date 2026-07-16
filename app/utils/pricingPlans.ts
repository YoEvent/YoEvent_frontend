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
}

/** Display tiers with round CFA amounts (XAF). */
export const DEFAULT_PRICING_PLANS: PricingPlan[] = [
  {
    name: "Starter",
    price: 0,
    billingCycle: "MONTHLY",
    maxEvents: 3,
    maxUsers: 1,
    maxAttendeesPerEvent: 100,
    featuresEnabled: "Basic Analytics, Q&A",
  },
  {
    name: "Pro",
    price: 15_000,
    billingCycle: "MONTHLY",
    maxEvents: 10,
    maxUsers: 3,
    maxAttendeesPerEvent: 500,
    featuresEnabled: "Ticket Sales, Email Campaigns, Basic Branding",
  },
  {
    name: "Eventer",
    price: 35_000,
    billingCycle: "MONTHLY",
    maxEvents: 25,
    maxUsers: 10,
    maxAttendeesPerEvent: 2_000,
    featuresEnabled: "Sponsors, Custom Domains, Advanced Analytics",
    popular: true,
  },
  {
    name: "Enterprise",
    price: 85_000,
    billingCycle: "MONTHLY",
    maxEvents: -1,
    maxUsers: 25,
    maxAttendeesPerEvent: 10_000,
    featuresEnabled: "Dedicated Support, SLA, Advanced Queuing, Queue Analytics",
  },
];

// Backend seeds exactly 4 plans: FREE, BASIC, PREMIUM, MEGA. "Eventer" (our curated
// "Most Popular" tier) has no direct backend counterpart by name, so it's paired with
// MEGA — the one seeded plan that would otherwise never be reachable from any UI.
const PLAN_ALIASES: Record<string, string[]> = {
  Starter: ["starter", "free"],
  Pro: ["pro", "basic"],
  Eventer: ["eventer", "mega", "pro eventer"],
  Enterprise: ["enterprise", "premium"],
};

function matchesPlanName(apiName: string, displayName: string): boolean {
  const normalized = (apiName || "").toLowerCase().trim();
  return PLAN_ALIASES[displayName].some(
    (alias) => normalized === alias || normalized.includes(alias)
  );
}

/** Merge API plan IDs with curated CFA display tiers. */
export function getDisplayPlans(apiPlans: PricingPlan[] | null | undefined): PricingPlan[] {
  if (!apiPlans?.length) return DEFAULT_PRICING_PLANS;

  return DEFAULT_PRICING_PLANS.map((plan) => {
    const apiMatch = apiPlans.find((p) => matchesPlanName(p.name, plan.name));
    return {
      ...plan,
      planId: apiMatch?.planId,
    };
  });
}

export function formatCfaPrice(price: number): string {
  const amount = Math.round(price);
  return amount === 0 ? "Free" : `${amount.toLocaleString("fr-FR")} FCFA`;
}

export function mapPlanNameToTier(name: string): string {
  const n = (name || "").toLowerCase();
  if (n.includes("enterprise") || n.includes("premium")) return "PREMIUM";
  if (n.includes("eventer")) return "PREMIUM";
  if (n.includes("pro") || n.includes("basic")) return "BASIC";
  return "FREE";
}
