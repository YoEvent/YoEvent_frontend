"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Zap, Shield, Globe, Code2, Layers, BarChart3, Webhook, Key, CheckCircle2, ChevronRight, Mail } from "lucide-react";
import { api, getStoredAuth } from "@/app/utils/api";
import { DEFAULT_PRICING_PLANS, getDisplayPlans, formatCfaPrice, type PricingPlan } from "@/app/utils/pricingPlans";
import { useLanguage } from "@/app/context/LanguageContext";

// Non-translated technical metadata for each microservice card — paired by index
// with the translated {name, desc} list from eventaas.services.items.
const SERVICES_META = [
  { tag: "auth-service", color: "#6366f1", endpoints: ["POST /login", "POST /register", "PATCH /tenants/{id}/upgrade"] },
  { tag: "event-service", color: "#FF4747", endpoints: ["GET /events/mine", "POST /events", "POST /sessions", "GET /qaquestions"] },
  { tag: "ticket-service", color: "#f59e0b", endpoints: ["POST /tickettypes", "POST /orders", "POST /coupons", "GET /orders/me"] },
  { tag: "payment-service", color: "#10b981", endpoints: ["POST /payments", "GET /payments/mine", "POST /withdrawals", "GET /withdrawals/balance"] },
  { tag: "notification-service", color: "#8b5cf6", endpoints: ["GET /notifications", "POST /emailcampaigns"] },
];

// Icons matched by index with the translated eventaas.features.items list.
const FEATURE_ICONS = [Shield, Globe, Zap, Layers, BarChart3, Webhook];

const SUPPORT_EMAIL = "api@yowevent.com";

export default function EventaaSPage() {
  const { t, tl } = useLanguage();
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
    if (plan.price === 0) return hasWorkspace ? t("eventaas.pricing.manageApiKeys") : t("eventaas.pricing.getApiKey");
    return hasWorkspace ? t("eventaas.pricing.upgradeAndGetAccess") : t("eventaas.pricing.startBuilding");
  };

  const serviceItems: { name: string; desc: string }[] = tl("eventaas.services.items");
  const services = SERVICES_META.map((meta, i) => ({ ...meta, ...serviceItems[i] }));
  const featureItems: { title: string; desc: string }[] = tl("eventaas.features.items");
  const howItWorksSteps: { title: string; desc: string }[] = tl("eventaas.howItWorks.steps");
  const apiPlanCopy: Record<string, { calls: string; workspaces: string; extra: string[] }> = tl("eventaas.pricing.apiPlanCopy");

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
          <span className="ml-2 text-[10px] font-semibold bg-[#f5f5f5] border border-[#e5e7eb] rounded-full px-2 py-0.5 text-[#888] uppercase tracking-widest">{t("eventaas.nav.brandTag")}</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-[#666]">
          <a href="#services" className="hover:text-[#FF4747] transition-colors">{t("eventaas.nav.services")}</a>
          <a href="#features" className="hover:text-[#FF4747] transition-colors">{t("eventaas.nav.features")}</a>
          <a href="#pricing" className="hover:text-[#FF4747] transition-colors">{t("eventaas.nav.pricing")}</a>
          <Link href="/developers" className="hover:text-[#FF4747] transition-colors">{t("eventaas.nav.apiDocs")}</Link>
        </div>
        <div className="flex items-center gap-3">
          {!hasWorkspace && (
            <Link href={signInHref} className="text-sm text-[#666] hover:text-[#1a1a1a] transition-colors">{t("eventaas.nav.signIn")}</Link>
          )}
          <Link href={primaryCtaHref} className="text-sm font-semibold bg-[#FF4747] text-white px-4 py-2 rounded-full hover:bg-[#e03e3e] transition-colors">
            {hasWorkspace ? t("eventaas.nav.manageApiKeys") : t("eventaas.nav.getApiKey")}
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="max-w-6xl mx-auto px-8 pt-28 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-[#FF4747]/10 border border-[#FF4747]/20 rounded-full px-4 py-1.5 text-xs text-[#FF4747] font-semibold uppercase tracking-widest mb-8">
          <Zap size={11} /> {t("eventaas.hero.badge")}
        </div>
        <h1 className="font-display text-6xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6 text-[#1a1a1a]">
          {t("eventaas.hero.headlinePart1")}<br />
          <span className="text-[#FF4747]">{t("eventaas.hero.headlineHighlight")}</span> {t("eventaas.hero.headlinePart2")}
        </h1>
        <p className="text-[#666] text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          {t("eventaas.hero.subtitle")}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href={primaryCtaHref} className="inline-flex items-center gap-2 bg-[#FF4747] text-white font-bold px-8 py-4 rounded-2xl hover:bg-[#e03e3e] transition-all text-sm">
            {hasWorkspace ? t("eventaas.hero.goToApiKeys") : t("eventaas.hero.startForFree")} <ArrowRight size={16} />
          </Link>
          <Link href="/developers" className="inline-flex items-center gap-2 bg-[#f5f5f5] border border-[#e5e7eb] text-[#1a1a1a] font-semibold px-8 py-4 rounded-2xl hover:bg-[#efefef] transition-all text-sm">
            <Code2 size={16} /> {t("eventaas.hero.viewApiDocs")}
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
          <div className="text-xs text-[#aaa] uppercase tracking-widest font-semibold mb-3">{t("eventaas.services.eyebrow")}</div>
          <h2 className="font-display text-4xl font-black text-[#1a1a1a]">{t("eventaas.services.headlinePart1")}<br />{t("eventaas.services.headlinePart2")}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s) => (
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
              <div className="font-display font-bold text-[#1a1a1a] text-sm mb-2">{t("eventaas.services.gatewayCard.title")}</div>
              <p className="text-[#888] text-xs leading-relaxed">{t("eventaas.services.gatewayCard.desc")}</p>
            </div>
            <Link href="/developers" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#FF4747] hover:underline">
              {t("eventaas.services.gatewayCard.link")} <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-8 py-24 border-t border-[#f0f0f0] bg-white">
        <div className="text-center mb-14">
          <div className="text-xs text-[#aaa] uppercase tracking-widest font-semibold mb-3">{t("eventaas.features.eyebrow")}</div>
          <h2 className="font-display text-4xl font-black text-[#1a1a1a]">{t("eventaas.features.title")}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featureItems.map((item, i) => {
            const Icon = FEATURE_ICONS[i];
            return (
              <div key={item.title} className="bg-white border border-[#e5e7eb] rounded-2xl p-6 hover:border-[#FF4747]/30 hover:shadow-sm transition-all">
                <div className="w-10 h-10 rounded-xl bg-[#FF4747]/10 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-[#FF4747]" />
                </div>
                <div className="font-semibold text-[#1a1a1a] text-sm mb-2">{item.title}</div>
                <p className="text-[#888] text-xs leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-4xl mx-auto px-8 py-24 border-t border-[#f0f0f0]">
        <div className="text-center mb-14">
          <div className="text-xs text-[#aaa] uppercase tracking-widest font-semibold mb-3">{t("eventaas.howItWorks.eyebrow")}</div>
          <h2 className="font-display text-4xl font-black text-[#1a1a1a]">{t("eventaas.howItWorks.title")}</h2>
        </div>
        <div className="relative">
          <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[#f5f5f5]" />
          {howItWorksSteps.map((step, i) => (
            <div key={step.title} className="flex gap-6 mb-10 relative">
              <div className="w-10 h-10 rounded-full bg-[#FF4747] flex items-center justify-center shrink-0 font-mono font-black text-xs text-white z-10">{String(i + 1).padStart(2, "0")}</div>
              <div className="pt-2">
                <div className="font-semibold text-[#1a1a1a] mb-1">{step.title}</div>
                <p className="text-[#888] text-sm leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="max-w-5xl mx-auto px-8 py-24 border-t border-[#f0f0f0] bg-white">
        <div className="text-center mb-14">
          <div className="text-xs text-[#aaa] uppercase tracking-widest font-semibold mb-3">{t("eventaas.pricing.eyebrow")}</div>
          <h2 className="font-display text-4xl font-black text-[#1a1a1a]">{t("eventaas.pricing.title")}</h2>
          <p className="text-[#888] text-sm mt-3">{t("eventaas.pricing.subtitle")}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((p) => {
            const copy = apiPlanCopy[p.name] || apiPlanCopy.Starter;
            const highlight = !!p.popular;
            return (
              <div key={p.name} className={`rounded-2xl p-7 border flex flex-col ${highlight ? "bg-[#FF4747] border-[#FF4747]" : "bg-white border-[#e5e7eb]"}`}>
                <div className={`text-xs font-bold uppercase tracking-widest mb-4 ${highlight ? "text-white/70" : "text-[#aaa]"}`}>{t("eventaas.pricing.planSuffix", { name: p.name })}</div>
                <div className="mb-6">
                  <span className={`font-display text-3xl font-black break-words ${highlight ? "text-white" : "text-[#1a1a1a]"}`}>{formatCfaPrice(p.price)}</span>
                  {p.price > 0 && <span className={`text-xs ml-1.5 ${highlight ? "text-white/70" : "text-[#888]"}`}>{t("eventaas.pricing.perMonth")}</span>}
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
          {t("eventaas.pricing.contactNote")}{" "}
          <a href={`mailto:${SUPPORT_EMAIL}?subject=EventaaS%20Custom%20Plan`} className="text-[#FF4747] font-semibold hover:underline inline-flex items-center gap-1">
            <Mail size={12} /> {t("eventaas.pricing.contactUs")}
          </a>
        </p>
      </section>

      {/* YOWEVENT CALLOUT */}
      <section className="max-w-6xl mx-auto px-8 py-16 border-t border-[#f0f0f0]">
        <div className="bg-[#1a1a1a] rounded-3xl p-10 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="text-xs text-[#F7E998] font-bold uppercase tracking-widest mb-3">{t("eventaas.callout.eyebrow")}</div>
            <h3 className="font-display text-3xl font-black text-white mb-3">{t("eventaas.callout.title")}</h3>
            <p className="text-white/50 text-sm leading-relaxed max-w-lg">
              {t("eventaas.callout.desc")}
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <Link href="/" className="inline-flex items-center gap-2 bg-[#F7E998] text-[#1a1a1a] font-bold px-6 py-3 rounded-xl hover:bg-[#efe084] transition-all text-sm">
              {t("eventaas.callout.seeYowEvent")} <ArrowRight size={14} />
            </Link>
            <Link href="/developers" className="inline-flex items-center gap-2 bg-white/10 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/15 transition-all text-sm">
              <Code2 size={14} /> {t("eventaas.callout.apiDocs")}
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
          <span>{t("eventaas.footer.tagline")}</span>
        </div>
        <div className="flex gap-6">
          <Link href="/developers" className="hover:text-[#FF4747] transition-colors">{t("eventaas.footer.apiDocs")}</Link>
          <Link href="/pricing" className="hover:text-[#FF4747] transition-colors">{t("eventaas.footer.yowEventPricing")}</Link>
          <Link href="/" className="hover:text-[#FF4747] transition-colors">{t("eventaas.footer.yowEventApp")}</Link>
          <Link href="/login" className="hover:text-[#FF4747] transition-colors">{t("eventaas.footer.signIn")}</Link>
        </div>
      </footer>
    </div>
  );
}
