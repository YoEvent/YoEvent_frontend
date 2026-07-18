"use client";
import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";
import Footer from "@/components/Footer";
import { useLanguage } from "@/app/context/LanguageContext";

const METHOD_STYLE: Record<string, string> = {
  GET: "bg-green-100 text-green-800",
  POST: "bg-blue-100 text-blue-800",
  PUT: "bg-orange-100 text-orange-800",
  PATCH: "bg-yellow-100 text-yellow-800",
  DELETE: "bg-red-100 text-red-800",
};

const microservices = [
  {
    name: "Auth Service",
    tag: "auth-service",
    base: "/api/v1/auth",
    color: "#6366f1",
    endpoints: [
      { path: "/login", method: "POST", desc: "User authentication & JWT sign-in" },
      { path: "/register", method: "POST", desc: "Provision isolated tenant workspace" },
      { path: "/tenants/{id}/upgrade-to-organization", method: "PATCH", desc: "Upgrade plan scale" },
      { path: "/tenants/{id}/logo", method: "POST", desc: "Upload tenant logo (multipart)" },
      { path: "/tenants/{id}/banner", method: "POST", desc: "Upload tenant banner (multipart)" },
    ],
  },
  {
    name: "Event Service",
    tag: "event-service",
    base: "/api/v1",
    color: "#FF4747",
    endpoints: [
      { path: "/events/mine", method: "GET", desc: "List events for authenticated tenant (JWT-scoped)" },
      { path: "/events", method: "GET", desc: "Public event discovery" },
      { path: "/events", method: "POST", desc: "Create event (requires tenantId + organizerId)" },
      { path: "/events/{id}", method: "PUT", desc: "Update event details" },
      { path: "/events/{id}/cover-image", method: "POST", desc: "Upload cover banner binary" },
      { path: "/sessions", method: "POST", desc: "Create event session (maxCapacity, not capacity)" },
      { path: "/polls", method: "POST", desc: "Add live poll (options as JSON string, isActive boolean)" },
      { path: "/qaquestions", method: "POST", desc: "Post Q&A — session-scoped (questionText + sessionId)" },
      { path: "/networkings", method: "POST", desc: "Add team member / volunteer (skills, availability)" },
      { path: "/sponsors", method: "POST", desc: "Apply as sponsor (status: PENDING)" },
      { path: "/emailcampaigns", method: "POST", desc: "Broadcast email campaign" },
      { path: "/eventcategorys", method: "GET", desc: "List categories" },
      { path: "/eventlocations", method: "POST", desc: "Set event location + coordinates" },
    ],
  },
  {
    name: "Ticketing Service",
    tag: "ticket-service",
    base: "/api/v1",
    color: "#f59e0b",
    endpoints: [
      { path: "/tickettypes", method: "POST", desc: "Add pricing tier (quantityAvailable, saleStart, saleEnd)" },
      { path: "/tickettypes?eventId={id}", method: "GET", desc: "List ticket types for an event" },
      { path: "/orders", method: "POST", desc: "Create purchase order" },
      { path: "/orders/me", method: "GET", desc: "Fetch authenticated user's orders" },
      { path: "/coupons", method: "POST", desc: "Add discount promo code" },
      { path: "/registrations/me", method: "GET", desc: "User's event registrations" },
    ],
  },
  {
    name: "Payment Service",
    tag: "payment-service",
    base: "/api/v1/payments",
    color: "#10b981",
    endpoints: [
      { path: "/payments", method: "POST", desc: "Record payment (method: MOBILE_MONEY | CARD | ORANGE_MONEY)" },
      { path: "/payments/mine", method: "GET", desc: "List payments for authenticated tenant" },
      { path: "/withdrawals/balance", method: "GET", desc: "Available payout balance (JWT-scoped)" },
      { path: "/withdrawals", method: "GET", desc: "Withdrawal history" },
      { path: "/withdrawals", method: "POST", desc: "Request tenant payout withdrawal" },
    ],
  },
  {
    name: "Platform Admin",
    tag: "platform-service",
    base: "/api/v1/platform",
    color: "#8b5cf6",
    endpoints: [
      { path: "/revenue", method: "GET", desc: "Platform commission revenue summary (SUPER_ADMIN only)" },
      { path: "/withdrawals", method: "GET", desc: "Platform withdrawal ledger" },
      { path: "/withdrawals", method: "POST", desc: "Record platform withdrawal" },
    ],
  },
  {
    name: "Notification Service",
    tag: "notification-service",
    base: "/api/v1",
    color: "#ec4899",
    endpoints: [
      { path: "/notifications", method: "GET", desc: "Retrieve unread alert cards" },
      { path: "/emailcampaigns", method: "POST", desc: "Broadcast campaign to registrants" },
    ],
  },
];

export default function DevelopersPage() {
  const { t, tl } = useLanguage();
  const svcTranslations: { name: string; endpoints: string[] }[] = tl("developers.services");
  const quirks: { label: string; value: string }[] = tl("developers.quirks");

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a]">

      {/* TOP NAV */}
      <nav className="bg-[#0a0a0a] border-b border-white/10 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/eventaas" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-xs">
            <ArrowLeft size={13} /> EventaaS
          </Link>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#FF4747] flex items-center justify-center">
              <Zap size={12} className="text-white" />
            </div>
            <span className="font-display font-bold text-white text-sm">
              Event<span className="text-[#FF4747]">aaS</span> <span className="text-white/40 font-normal">{t("developers.nav.apiReference")}</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a href="http://localhost:8080/swagger-ui.html" target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#FF4747] text-white px-4 py-2 rounded-full hover:bg-[#e03e3e] transition-colors cursor-pointer">
            {t("developers.nav.openSwagger")}
          </a>
        </div>
      </nav>

      {/* BODY */}
      <main className="max-w-4xl mx-auto px-6 py-16">

        {/* HEADER */}
        <div className="mb-12">
          <div className="inline-block bg-[#FF4747]/10 border border-[#FF4747]/20 rounded-full px-4 py-1.5 text-xs text-[#FF4747] uppercase tracking-widest font-semibold mb-4">
            {t("developers.header.badge")}
          </div>
          <h1 className="font-display text-5xl font-black tracking-tight mb-3">EventaaS API</h1>
          <p className="text-[#666] max-w-xl leading-relaxed">
            {t("developers.header.introBeforeGateway")} <code className="text-[#FF4747] font-mono text-sm bg-[#FF4747]/10 px-1.5 py-0.5 rounded">localhost:8080</code>{t("developers.header.introBeforeAuth")} <code className="font-mono text-sm bg-[#f5f5f5] px-1.5 py-0.5 rounded text-[#1a1a1a]">Authorization: Bearer &lt;token&gt;</code> {t("developers.header.introBeforePass")}
            <code className="font-mono text-sm bg-[#f5f5f5] px-1.5 py-0.5 rounded text-[#1a1a1a]"> X-Tenant-Id</code> {t("developers.header.introAfterTenant")}
          </p>

          {/* IMPORTANT NOTES */}
          <div className="mt-6 bg-[#F7E998]/30 border border-[#F7E998] rounded-2xl p-5 text-sm space-y-1.5">
            <div className="font-semibold text-[#1a1a1a] mb-2 text-xs uppercase tracking-wider">{t("developers.header.quirksTitle")}</div>
            {quirks.map((q) => (
              <div key={q.label} className="flex gap-2 text-xs text-[#444]">
                <span className="font-mono text-[#FF4747] shrink-0">{q.label}:</span>
                <span className="text-[#666]">{q.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ENDPOINT TABLES */}
        <div className="space-y-8">
          {microservices.map((ms, msIndex) => (
            <div key={ms.tag} className="bg-white rounded-3xl border border-[#e5e7eb] overflow-hidden shadow-sm">
              <div className="flex justify-between items-center px-8 py-5 border-b border-[#f0f0f0]">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: ms.color }} />
                  <h3 className="font-display text-base font-extrabold text-[#1a1a1a]">{svcTranslations[msIndex]?.name ?? ms.name}</h3>
                </div>
                <span className="font-mono text-xs border rounded-full px-3 py-1"
                  style={{ color: ms.color, borderColor: `${ms.color}33`, background: `${ms.color}11` }}>
                  {ms.base}
                </span>
              </div>
              <div className="divide-y divide-[#f5f5f5]">
                {ms.endpoints.map((ep, i) => (
                  <div key={i} className="px-8 py-4 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`font-mono font-bold px-2.5 py-0.5 rounded text-[10px] shrink-0 ${METHOD_STYLE[ep.method] || "bg-gray-100 text-gray-700"}`}>
                        {ep.method}
                      </span>
                      <span className="font-mono text-xs text-[#1a1a1a] font-semibold truncate">{ep.path}</span>
                    </div>
                    <span className="text-xs text-[#888] shrink-0 text-right">{svcTranslations[msIndex]?.endpoints[i] ?? ep.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* AUTH NOTES */}
        <div className="mt-10 bg-[#0a0a0a] text-white rounded-3xl p-8">
          <div className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-4">{t("developers.authNotes.requiredHeaders")}</div>
          <div className="font-mono text-sm space-y-2 text-white/70">
            <div><span className="text-[#F7E998]">Authorization:</span> Bearer {"<jwt-token>"}</div>
            <div><span className="text-[#F7E998]">X-Tenant-Id:</span> {"<tenant-uuid>"}</div>
            <div><span className="text-[#F7E998]">X-User-Id:</span> {"<user-uuid>"}</div>
            <div><span className="text-[#F7E998]">Content-Type:</span> application/json</div>
          </div>
          <div className="mt-5 text-xs text-white/30">
            {t("developers.authNotes.jwtIssuedAt")} <code className="text-white/50">/api/v1/auth/login</code>.
            {" "}{t("developers.authNotes.superAdminScope")} <code className="text-white/50">/platform/*</code> {t("developers.authNotes.endpointsSuffix")}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
