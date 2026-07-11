"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Zap, Shield, Globe, Code2, Layers, BarChart3, Webhook, Key, CheckCircle2, ChevronRight, Mail } from "lucide-react";
import { api, getStoredAuth } from "@/app/utils/api";
import { DEFAULT_PRICING_PLANS, getDisplayPlans, formatCfaPrice, type PricingPlan } from "@/app/utils/pricingPlans";

const SERVICES = [
  {
    name: "Auth Service",
    tag: "auth-service",
    color: "#6366f1",
    desc: "Multi-tenant JWT authentication, tenant provisioning, role management, and plan upgrades.",
    endpoints: ["POST /login", "POST /register", "PATCH /tenants/{id}/upgrade"],
  },
  {
    name: "Event Service",
    tag: "event-service",
    color: "#FF4747",
    desc: "Full event lifecycle — create, publish, schedule, track sessions, polls, Q&A, and attendance.",
    endpoints: ["GET /events/mine", "POST /events", "POST /sessions", "GET /qaquestions"],
  },
  {
    name: "Ticketing Service",
    tag: "ticket-service",
    color: "#f59e0b",
    desc: "Ticket types, pricing tiers, order management, coupons, and registration confirmations.",
    endpoints: ["POST /tickettypes", "POST /orders", "POST /coupons", "GET /orders/me"],
  },
  {
    name: "Payment Service",
    tag: "payment-service",
    color: "#10b981",
    desc: "MTN Mobile Money, Orange Money, and card payments via Campay & Stripe. FCFA-native.",
    endpoints: ["POST /payments", "GET /payments/mine", "POST /withdrawals", "GET /withdrawals/balance"],
  },
  {
    name: "Notification Service",
    tag: "notification-service",
    color: "#8b5cf6",
    desc: "Email campaign broadcasting, in-app alerts, and transactional event notifications.",
    endpoints: ["GET /notifications", "POST /emailcampaigns"],
  },
];

const FEATURES = [
  { icon: Shield, title: "Tenant Isolation", desc: "Every tenant gets a fully isolated data namespace. JWT + X-Tenant-Id header enforced at every layer." },
  { icon: Globe, title: "FCFA-Native Payments", desc: "MTN MoMo, Orange Money, and card payments built in. No currency conversion needed for African markets." },
  { icon: Zap, title: "Real-Time Events", desc: "Live polls, Q&A, and session attendee tracking designed for concurrent event traffic." },
  { icon: Layers, title: "Multi-Tenant SaaS", desc: "One platform, infinite organizers. Each gets their own subdomain, branding, and event workspace." },
  { icon: BarChart3, title: "Analytics Built-In", desc: "Per-event registration rates, revenue tracking, fill rates, and organizer dashboards out of the box." },
  { icon: Webhook, title: "Webhook Ready", desc: "Notification service emits hooks for ticket purchases, refunds, and campaign completions." },
];

// EventaaS is billed through the same 4 workspace plans sold on /pricing — these are
// API-usage-flavored descriptions of those exact tiers, not a separate invented product.
const API_PLAN_COPY: Record<string, { calls: string; workspaces: string; extra: string[] }> = {
  Starter: { calls: "10,000 API calls/month", workspaces: "1 tenant workspace", extra: ["Auth + Event services", "Community support"] },
  Pro: { calls: "100,000 API calls/month", workspaces: "3 tenant workspaces", extra: ["All 5 microservices", "Email support"] },
  Eventer: { calls: "500,000 API calls/month", workspaces: "10 tenant workspaces", extra: ["Payment service included", "Priority support"] },
  Enterprise: { calls: "Unlimited API calls", workspaces: "25 tenant workspaces", extra: ["Dedicated infra", "SLA + dedicated support"] },
};

const SUPPORT_EMAIL = "api@yowevent.com";

export default function EventaaSPage() {
  const [auth, setAuth] = useState<{ tenantId: string; email: string } | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>(DEFAULT_PRICING_PLANS);

  useEffect(() => {
    const stored = getStoredAuth();
    if (stored) setAuth({ tenantId: stored.tenantId, email: stored.email });
  }, []);

  useEffect(() => {
    api.get<PricingPlan[]>("/api/v1/subscriptionplans", { skipAuth: true })
      .then((data) => setPlans(getDisplayPlans(data)))
      .catch(() => setPlans(DEFAULT_PRICING_PLANS));
  }, []);

  const hasWorkspace = !!auth?.tenantId;
  // Not logged in → sign up. Logged in without a tenant yet → become an organizer first.
  // Logged in with a tenant → go straight to the API keys dashboard.
  const primaryCtaHref = !auth ? "/register" : hasWorkspace ? "/admin/developers" : "/user/dashboard?upgrade=1";
  const signInHref = hasWorkspace ? "/admin/developers" : "/login";

  const planHref = (plan: PricingPlan) => {
    if (plan.price === 0) return primaryCtaHref;
    // Paid tiers are billed through the real subscription checkout.
    return !auth ? "/register" : hasWorkspace ? "/pricing" : "/user/dashboard?upgrade=1";
  };

  const planCta = (plan: PricingPlan) => {
    if (plan.price === 0) return hasWorkspace ? "Manage API Keys" : "Get API Key";
    return hasWorkspace ? "Upgrade & Get Access" : "Start Building";
  };

  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">

      {/* NAV */}
      <nav className="border-b border-[#f0f0f0] px-8 py-4 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FF4747] flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-lg tracking-tight text-[#1a1a1a]">
            Event<span className="text-[#FF4747]">aaS</span>
          </span>
          <span className="ml-2 text-[10px] font-semibold bg-[#f5f5f5] border border-[#e5e7eb] rounded-full px-2 py-0.5 text-[#888] uppercase tracking-widest">by YowEvent</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-[#666]">
          <a href="#services" className="hover:text-[#FF4747] transition-colors">Services</a>
          <a href="#features" className="hover:text-[#FF4747] transition-colors">Features</a>
          <a href="#pricing" className="hover:text-[#FF4747] transition-colors">Pricing</a>
          <Link href="/developers" className="hover:text-[#FF4747] transition-colors">API Docs</Link>
        </div>
        <div className="flex items-center gap-3">
          {!hasWorkspace && (
            <Link href={signInHref} className="text-sm text-[#666] hover:text-[#1a1a1a] transition-colors">Sign In</Link>
          )}
          <Link href={primaryCtaHref} className="text-sm font-semibold bg-[#FF4747] text-white px-4 py-2 rounded-full hover:bg-[#e03e3e] transition-colors">
            {hasWorkspace ? "Manage API Keys" : "Get API Key"}
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-8 pt-28 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-[#FF4747]/10 border border-[#FF4747]/20 rounded-full px-4 py-1.5 text-xs text-[#FF4747] font-semibold uppercase tracking-widest mb-8">
          <Zap size={11} /> Event Infrastructure as a Service
        </div>
        <h1 className="font-display text-6xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6 text-[#1a1a1a]">
          The API backend for<br />
          <span className="text-[#FF4747]">event-driven</span> products
        </h1>
        <p className="text-[#666] text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          EventaaS gives your team production-ready microservices for auth, ticketing, payments, and live event features — so you ship in weeks, not months.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={primaryCtaHref} className="inline-flex items-center gap-2 bg-[#FF4747] text-white font-bold px-8 py-4 rounded-2xl hover:bg-[#e03e3e] transition-all text-sm">
            {hasWorkspace ? "Go to your API keys" : "Start for free"} <ArrowRight size={16} />
          </Link>
          <Link href="/developers" className="inline-flex items-center gap-2 bg-[#f5f5f5] border border-[#e5e7eb] text-[#1a1a1a] font-semibold px-8 py-4 rounded-2xl hover:bg-[#efefef] transition-all text-sm">
            <Code2 size={16} /> View API Docs
          </Link>
        </div>

        {/* TERMINAL PREVIEW — stays dark, it's a code block */}
        <div className="mt-16 bg-[#111] border border-[#222] rounded-3xl p-6 text-left max-w-3xl mx-auto shadow-xl">
          <div className="flex gap-2 mb-5">
            <div className="w-3 h-3 rounded-full bg-red-500/70" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
            <div className="w-3 h-3 rounded-full bg-green-500/70" />
          </div>
          <div className="font-mono text-sm space-y-2 text-white/70">
            <div><span className="text-[#F7E998]">POST</span> <span className="text-white/40">/api/v1/events</span></div>
            <div className="text-white/30">Authorization: Bearer {"<your-api-key>"}</div>
            <div className="text-white/30">X-Tenant-Id: {"<your-tenant-id>"}</div>
            <div className="mt-3 text-white/40">{"{"}</div>
            <div className="pl-4"><span className="text-[#FF4747]">"title"</span><span className="text-white/40">: </span><span className="text-green-400">"TechFest Yaoundé 2025"</span><span className="text-white/40">,</span></div>
            <div className="pl-4"><span className="text-[#FF4747]">"currency"</span><span className="text-white/40">: </span><span className="text-green-400">"XAF"</span><span className="text-white/40">,</span></div>
            <div className="pl-4"><span className="text-[#FF4747]">"format"</span><span className="text-white/40">: </span><span className="text-green-400">"IN_PERSON"</span><span className="text-white/40">,</span></div>
            <div className="pl-4"><span className="text-[#FF4747]">"maxCapacity"</span><span className="text-white/40">: </span><span className="text-[#F7E998]">500</span></div>
            <div className="text-white/40">{"}"}</div>
            <div className="mt-3 border-t border-white/5 pt-3">
              <span className="text-green-400">201 Created</span>
              <span className="text-white/30"> → eventId: </span>
              <span className="text-white/60">"evt_k7x9m2..."</span>
            </div>
          </div>
        </div>
      </section>

      {/* MICROSERVICES */}
      <section id="services" className="max-w-6xl mx-auto px-8 py-24 border-t border-[#f0f0f0]">
        <div className="text-center mb-14">
          <div className="text-xs text-[#aaa] uppercase tracking-widest font-semibold mb-3">Architecture</div>
          <h2 className="font-display text-4xl font-black text-[#1a1a1a]">5 production microservices,<br />ready on day one</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {SERVICES.map((s) => (
            <div key={s.tag} className="bg-white border border-[#e5e7eb] rounded-2xl p-6 hover:border-[#FF4747]/30 hover:shadow-md transition-all group">
              <div className="flex items-center justify-between mb-4">
                <span className="font-display font-bold text-[#1a1a1a] text-sm">{s.name}</span>
                <span className="text-[10px] font-mono border rounded-full px-2.5 py-0.5" style={{ color: s.color, borderColor: `${s.color}33`, background: `${s.color}11` }}>{s.tag}</span>
              </div>
              <p className="text-[#888] text-xs leading-relaxed mb-4">{s.desc}</p>
              <div className="space-y-1.5">
                {s.endpoints.map((ep) => (
                  <div key={ep} className="flex items-center gap-2">
                    <ChevronRight size={10} className="text-[#ccc] shrink-0" />
                    <span className="font-mono text-[11px] text-[#999]">{ep}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* CTA card */}
          <div className="bg-[#FF4747]/5 border border-[#FF4747]/20 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <Key size={22} className="text-[#FF4747] mb-4" />
              <div className="font-display font-bold text-[#1a1a1a] text-sm mb-2">All services via one gateway</div>
              <p className="text-[#888] text-xs leading-relaxed">One base URL, one API key, all services. No per-service auth or configuration.</p>
            </div>
            <Link href="/developers" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#FF4747] hover:underline">
              View full API reference <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-8 py-24 border-t border-[#f0f0f0] bg-[#fafafa]">
        <div className="text-center mb-14">
          <div className="text-xs text-[#aaa] uppercase tracking-widest font-semibold mb-3">Why EventaaS</div>
          <h2 className="font-display text-4xl font-black text-[#1a1a1a]">Built for African event infrastructure</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white border border-[#e5e7eb] rounded-2xl p-6 hover:border-[#FF4747]/30 hover:shadow-sm transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#FF4747]/10 flex items-center justify-center mb-4">
                <Icon size={18} className="text-[#FF4747]" />
              </div>
              <div className="font-semibold text-[#1a1a1a] text-sm mb-2">{title}</div>
              <p className="text-[#888] text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-4xl mx-auto px-8 py-24 border-t border-[#f0f0f0]">
        <div className="text-center mb-14">
          <div className="text-xs text-[#aaa] uppercase tracking-widest font-semibold mb-3">Integration</div>
          <h2 className="font-display text-4xl font-black text-[#1a1a1a]">Ship in 3 steps</h2>
        </div>
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[#f0f0f0]" />
          {[
            { n: "01", title: "Register & get your API key", desc: "Create a free account. Your tenant workspace and API credentials are provisioned instantly." },
            { n: "02", title: "Call the REST API", desc: "Hit any of the 5 microservices through the unified gateway. Full Swagger docs at /swagger-ui.html." },
            { n: "03", title: "Build your product on top", desc: "Use EventaaS for the backend. Build any frontend — web, mobile, kiosk. YowEvent is just one example." },
          ].map((step) => (
            <div key={step.n} className="flex gap-6 mb-10 relative">
              <div className="w-10 h-10 rounded-full bg-[#FF4747] flex items-center justify-center shrink-0 font-mono font-black text-xs text-white z-10">{step.n}</div>
              <div className="pt-2">
                <div className="font-semibold text-[#1a1a1a] mb-1">{step.title}</div>
                <p className="text-[#888] text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-5xl mx-auto px-8 py-24 border-t border-[#f0f0f0] bg-[#fafafa]">
        <div className="text-center mb-14">
          <div className="text-xs text-[#aaa] uppercase tracking-widest font-semibold mb-3">API Pricing</div>
          <h2 className="font-display text-4xl font-black text-[#1a1a1a]">Pay for what you use</h2>
          <p className="text-[#888] text-sm mt-3">API access is billed through your YowEvent workspace plan — upgrade once, unlock quota everywhere.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((p) => {
            const copy = API_PLAN_COPY[p.name] || API_PLAN_COPY.Starter;
            const highlight = !!p.popular;
            return (
              <div key={p.name} className={`rounded-2xl p-7 border flex flex-col ${highlight ? "bg-[#FF4747] border-[#FF4747]" : "bg-white border-[#e5e7eb]"}`}>
                <div className={`text-xs font-bold uppercase tracking-widest mb-4 ${highlight ? "text-white/70" : "text-[#aaa]"}`}>{p.name} API</div>
                <div className="mb-6">
                  <span className={`font-display text-3xl font-black break-words ${highlight ? "text-white" : "text-[#1a1a1a]"}`}>{formatCfaPrice(p.price)}</span>
                  {p.price > 0 && <span className={`text-xs ml-1.5 ${highlight ? "text-white/70" : "text-[#888]"}`}>/mo</span>}
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {[copy.calls, copy.workspaces, ...copy.extra].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-xs">
                      <CheckCircle2 size={13} className={highlight ? "text-white/80" : "text-[#FF4747]"} />
                      <span className={highlight ? "text-white/80" : "text-[#555]"}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href={planHref(p)} className={`text-center py-3 rounded-xl font-bold text-sm transition-all ${highlight ? "bg-white text-[#FF4747] hover:bg-[#f5f5f5]" : "bg-[#1a1a1a] text-white hover:bg-[#333]"}`}>
                  {planCta(p)}
                </Link>
              </div>
            );
          })}
        </div>
        <p className="text-center text-xs text-[#888] mt-10">
          Need higher volume or a dedicated deal beyond Enterprise?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=EventaaS%20Custom%20Plan`} className="text-[#FF4747] font-semibold hover:underline inline-flex items-center gap-1">
            <Mail size={12} /> Contact us
          </a>
        </p>
      </section>

      {/* YOWEVENT CALLOUT */}
      <section className="max-w-6xl mx-auto px-8 py-16 border-t border-[#f0f0f0]">
        <div className="bg-[#1a1a1a] rounded-3xl p-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="text-xs text-[#F7E998] font-bold uppercase tracking-widest mb-3">Built on EventaaS</div>
            <h3 className="font-display text-3xl font-black text-white mb-3">YowEvent is proof it works</h3>
            <p className="text-white/50 text-sm leading-relaxed max-w-lg">
              YowEvent — the Cameroon event marketplace — is a first-party consumer of EventaaS. Every feature you see there is powered by the same APIs available to you.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/" className="inline-flex items-center gap-2 bg-[#F7E998] text-[#1a1a1a] font-bold px-6 py-3 rounded-xl hover:bg-[#efe084] transition-all text-sm">
              See YowEvent <ArrowRight size={14} />
            </Link>
            <Link href="/developers" className="inline-flex items-center gap-2 bg-white/10 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/15 transition-all text-sm">
              <Code2 size={14} /> API Docs
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#f0f0f0] px-8 py-10 max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[#aaa] text-xs">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#FF4747] flex items-center justify-center">
            <Zap size={10} className="text-white" />
          </div>
          <span>EventaaS by YowEvent · Cameroon</span>
        </div>
        <div className="flex gap-6">
          <Link href="/developers" className="hover:text-[#FF4747] transition-colors">API Docs</Link>
          <Link href="/pricing" className="hover:text-[#FF4747] transition-colors">YowEvent Pricing</Link>
          <Link href="/" className="hover:text-[#FF4747] transition-colors">YowEvent App</Link>
          <Link href="/login" className="hover:text-[#FF4747] transition-colors">Sign In</Link>
        </div>
      </footer>
    </div>
  );
}
