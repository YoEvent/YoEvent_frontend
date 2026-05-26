"use client";
import Link from "next/link";

export default function DevelopersPage() {
  const microservices = [
    {
      name: "Auth Service",
      base: "/api/v1/auth",
      endpoints: [
        { path: "/login", method: "POST", desc: "User authentication & JWT sign-in" },
        { path: "/register", method: "POST", desc: "Provision isolated tenant workspace" },
        { path: "/tenants/{id}/upgrade-to-organization", method: "PATCH", desc: "Upgrade plan scale" },
      ],
    },
    {
      name: "Event Service",
      base: "/api/v1/events",
      endpoints: [
        { path: "/tenant/{tenantId}", method: "GET", desc: "Retrieve tenant agenda list" },
        { path: "/{id}/cover-image", method: "POST", desc: "Upload cover banner binary" },
        { path: "/qaquestions", method: "POST", desc: "Post engagement question" },
      ],
    },
    {
      name: "Ticketing Service",
      base: "/api/v1/tickets",
      endpoints: [
        { path: "/tickettypes", method: "POST", desc: "Add pricing admission tier" },
        { path: "/orders", method: "GET", desc: "Fetch recent orders history" },
        { path: "/coupons", method: "POST", desc: "Add new discount promo code" },
      ],
    },
    {
      name: "Notification Service",
      base: "/api/v1/notifications",
      endpoints: [
        { path: "/notifications", method: "GET", desc: "Retrieve unread alert cards" },
        { path: "/emailcampaigns", method: "POST", desc: "Broadcast campaign logs" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a]">
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-16 py-5 bg-white border-b border-[#e0d8c8]">
        <Link href="/" className="font-display text-2xl font-black tracking-tight text-[#1a1a1a]">
          Yo<span className="text-[#8a7d5a]">Event</span>
        </Link>
        <div className="flex items-center gap-3">
          <a
            href="http://localhost:8080/swagger-ui.html"
            target="_blank"
            className="px-5 py-2 text-sm font-medium bg-[#1a1a1a] text-white rounded-full hover:bg-[#333] transition-all flex items-center gap-1.5 cursor-pointer"
          >
            Open Swagger UI ⚡
          </a>
        </div>
      </nav>

      {/* BODY */}
      <main className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <span className="inline-block bg-[#8a7d5a]/10 border border-[#8a7d5a]/20 rounded-full px-4 py-1.5 text-xs text-[#8a7d5a] uppercase tracking-widest mb-4">API Docs</span>
          <h1 className="font-display text-5xl font-black tracking-tight mb-3">YoEvent Developer Portal</h1>
          <p className="text-sm text-[#666] max-w-lg mx-auto">
            Interact with our gateway API services. Below is the API reference map of the active system endpoints.
          </p>
        </div>

        {/* DETAILS */}
        <div className="space-y-8">
          {microservices.map((ms, index) => (
            <div key={index} className="bg-white rounded-3xl border border-[#e0d8c8] p-8 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-display text-lg font-extrabold text-[#1a1a1a]">{ms.name}</h3>
                <span className="font-mono text-xs text-[#8a7d5a] bg-[#8a7d5a]/10 px-3 py-1 rounded-full">{ms.base}</span>
              </div>
              <div className="divide-y divide-[#e5e0d5]">
                {ms.endpoints.map((e, epIndex) => (
                  <div key={epIndex} className="py-4 flex justify-between items-center text-xs">
                    <div className="flex items-center gap-3">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                          e.method === "POST"
                            ? "bg-blue-100 text-blue-800"
                            : e.method === "GET"
                            ? "bg-green-100 text-green-800"
                            : "bg-orange-100 text-orange-800"
                        }`}
                      >
                        {e.method}
                      </span>
                      <span className="font-mono text-[#1a1a1a] font-semibold">{e.path}</span>
                    </div>
                    <span className="text-[#666]">{e.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
