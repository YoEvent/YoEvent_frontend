"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Layers, Users, Building, LogOut, Search, Plus, Edit3, Trash2, ShieldCheck, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { api, clearStoredAuth, getAuthClaims } from "@/app/utils/api";

// ── Transactions : agrégation & sparkline (100% frontend, pas de nouvel endpoint backend) ──

type TxWindow = "24h" | "week" | "month";

const TX_WINDOW_CONFIG: Record<TxWindow, { buckets: number; bucketMs: number; label: string }> = {
  "24h": { buckets: 24, bucketMs: 60 * 60 * 1000, label: "24 dernières heures" },
  week: { buckets: 7, bucketMs: 24 * 60 * 60 * 1000, label: "7 derniers jours" },
  month: { buckets: 30, bucketMs: 24 * 60 * 60 * 1000, label: "30 derniers jours" },
};

interface CurrencyStats {
  currentTotal: number;
  previousTotal: number;
  currentSeries: number[];
  previousSeries: number[];
}

/**
 * Agrège les paiements SUCCESSFUL par devise sur la fenêtre choisie, avec une
 * fenêtre de comparaison équivalente immédiatement précédente.
 * NOTE : /api/v1/payments ne propose ni pagination ni filtre de date côté
 * serveur — on charge tout l'historique et on filtre ici. Peut devenir coûteux
 * si le volume de paiements grossit fortement (dette technique backend signalée,
 * non corrigée ici — hors périmètre).
 */
function aggregateTransactionsByCurrency(payments: any[], txWindow: TxWindow): Record<string, CurrencyStats> {
  const { buckets, bucketMs } = TX_WINDOW_CONFIG[txWindow];
  const now = Date.now();
  const periodMs = buckets * bucketMs;
  const currentStart = now - periodMs;
  const previousStart = now - 2 * periodMs;

  const byCurrency: Record<string, CurrencyStats> = {};

  const ensure = (currency: string) => {
    if (!byCurrency[currency]) {
      byCurrency[currency] = {
        currentTotal: 0,
        previousTotal: 0,
        currentSeries: new Array(buckets).fill(0),
        previousSeries: new Array(buckets).fill(0),
      };
    }
    return byCurrency[currency];
  };

  for (const p of payments) {
    if (p?.status !== "SUCCESSFUL") continue;
    const rawTs = p.paidAt || p.createdAt;
    if (!rawTs) continue;
    const t = new Date(rawTs).getTime();
    if (Number.isNaN(t)) continue;
    const amount = Number(p.amount) || 0;
    const currency = p.currency || "N/A";
    const stats = ensure(currency);

    if (t >= currentStart && t <= now) {
      stats.currentTotal += amount;
      const idx = Math.min(buckets - 1, Math.max(0, Math.floor((t - currentStart) / bucketMs)));
      stats.currentSeries[idx] += amount;
    } else if (t >= previousStart && t < currentStart) {
      stats.previousTotal += amount;
      const idx = Math.min(buckets - 1, Math.max(0, Math.floor((t - previousStart) / bucketMs)));
      stats.previousSeries[idx] += amount;
    }
  }

  return byCurrency;
}

function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

/** Sparkline SVG fait main — pas de dépendance graphique ajoutée au projet. */
function Sparkline({ current, previous }: { current: number[]; previous: number[] }) {
  const width = 100;
  const height = 40;
  const max = Math.max(1, ...current, ...previous);
  const toPoints = (arr: number[]) =>
    arr
      .map((v, i) => {
        const x = arr.length > 1 ? (i / (arr.length - 1)) * width : 0;
        const y = height - (v / max) * (height - 4) - 2;
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={56} preserveAspectRatio="none">
      <polyline points={toPoints(previous)} fill="none" stroke="#9ca3af" strokeWidth="2" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
      <polyline points={toPoints(current)} fill="none" stroke="#EB4203" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function SuperAdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loadingClaims, setLoadingClaims] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "plans" | "tenants" | "users">("overview");

  // Data states
  const [plans, setPlans] = useState<any[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Forms / Modals
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [creatingPlan, setCreatingPlan] = useState(false);
  const [planForm, setPlanForm] = useState({
    name: "",
    price: 0,
    billingCycle: "MONTHLY",
    maxEvents: 5,
    maxUsers: 2,
    maxAttendeesPerEvent: 100,
    featuresEnabled: "BASIC_EVENT"
  });

  // Search/Filters
  const [tenantSearch, setTenantSearch] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Pagination — Tenants Directory
  const TENANTS_PER_PAGE = 10;
  const [tenantPage, setTenantPage] = useState(1);

  // Tenant attendees modal
  const [viewingTenant, setViewingTenant] = useState<any | null>(null);
  const [tenantRegistrations, setTenantRegistrations] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);

  // Platform finance (vraies données)
  const [platformRevenue, setPlatformRevenue] = useState<{ totalCollected: number; totalWithdrawn: number; availableBalance: number } | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [txWindow, setTxWindow] = useState<TxWindow>("24h");

  useEffect(() => {
    // 1. Authorize role
    const claims = getAuthClaims();
    const rawScope = claims?.scope || claims?.roles || claims?.permissions || "";
    const scopeStr = Array.isArray(rawScope) 
      ? rawScope.join(" ") 
      : typeof rawScope === "string" 
        ? rawScope 
        : "";
    const isSuperAdmin = scopeStr.includes("SUPER_ADMIN");

    if (!claims || !isSuperAdmin) {
      router.push("/login");
    } else {
      setAuthorized(true);
    }
    setLoadingClaims(false);
  }, [router]);

  useEffect(() => {
    if (!authorized) return;

    // 2. Fetch all management data
    setLoadingData(true);
    Promise.all([
      api.get<any[]>("/api/v1/subscriptionplans").catch((err) => {
        console.error("Failed to load subscription plans:", err);
        return [];
      }),
      api.get<any[]>("/api/v1/tenants").catch((err) => {
        console.error("Failed to load tenants:", err);
        return [];
      }),
      api.get<any[]>("/api/v1/users").catch((err) => {
        console.error("Failed to load users:", err);
        return [];
      }),
      api.get<any>("/api/v1/platform/revenue").catch((err) => {
        console.error("Failed to load platform revenue:", err);
        return null;
      }),
      api.get<any[]>("/api/v1/payments").catch((err) => {
        console.error("Failed to load payments:", err);
        return [];
      }),
    ]).then(([plansData, tenantsData, usersData, revenueData, paymentsData]) => {
      setPlans(plansData || []);
      setTenants(tenantsData || []);
      setUsers(usersData || []);
      setPlatformRevenue(revenueData);
      setPayments(paymentsData || []);
    }).finally(() => {
      setLoadingData(false);
    });
  }, [authorized]);

  // Doit rester avant tout "return" conditionnel (règle des hooks)
  const txStatsByCurrency = useMemo(() => aggregateTransactionsByCurrency(payments, txWindow), [payments, txWindow]);
  const sortedCurrencies = useMemo(
    () => Object.keys(txStatsByCurrency).sort((a, b) => txStatsByCurrency[b].currentTotal - txStatsByCurrency[a].currentTotal),
    [txStatsByCurrency]
  );

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    clearStoredAuth();
    router.push("/login");
  };

  // Plan actions
  const savePlanEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    try {
      const data = await api.put<any>(`/api/v1/subscriptionplans/${editingPlan.planId}`, {
        name: editingPlan.name,
        price: editingPlan.price,
        billingCycle: editingPlan.billingCycle,
        maxEvents: editingPlan.maxEvents,
        maxUsers: editingPlan.maxUsers,
        maxAttendeesPerEvent: editingPlan.maxAttendeesPerEvent,
        featuresEnabled: editingPlan.featuresEnabled
      });
      setPlans((prev) => prev.map((p) => p.planId === data.planId ? data : p));
      setEditingPlan(null);
    } catch (err) {
      console.error("Failed to update pricing plan:", err);
    }
  };

  const createPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = await api.post<any>("/api/v1/subscriptionplans", planForm);
      setPlans((prev) => [...prev, data]);
      setCreatingPlan(false);
      setPlanForm({
        name: "",
        price: 0,
        billingCycle: "MONTHLY",
        maxEvents: 5,
        maxUsers: 2,
        maxAttendeesPerEvent: 100,
        featuresEnabled: "BASIC_EVENT"
      });
    } catch (err) {
      console.error("Failed to create pricing plan:", err);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subscription plan?")) return;
    try {
      await api.delete(`/api/v1/subscriptionplans/${id}`);
      setPlans((prev) => prev.filter((p) => p.planId !== id));
    } catch (err) {
      console.error("Failed to delete pricing plan:", err);
    }
  };

  // Tenant attendees
  const viewTenantAttendees = async (tenant: any) => {
    setViewingTenant(tenant);
    setLoadingRegs(true);
    setTenantRegistrations([]);
    try {
      const regs = await api.get<any[]>(`/api/v1/registrations`);
      setTenantRegistrations((regs || []).filter((r: any) => r.tenantId === tenant.tenantId));
    } catch (err) {
      console.error("Failed to load tenant attendees:", err);
    } finally {
      setLoadingRegs(false);
    }
  };

  // Tenant actions
  const toggleTenantType = async (tenant: any) => {
    const nextType = tenant.type === "ORGANIZATION" ? "INDIVIDUAL" : "ORGANIZATION";
    try {
      const data = await api.put<any>(`/api/v1/tenants/${tenant.tenantId}`, {
        ...tenant,
        type: nextType
      });
      setTenants((prev) => prev.map((t) => t.tenantId === tenant.tenantId ? data : t));
    } catch (err) {
      console.error("Failed to update tenant configuration:", err);
    }
  };

  // User actions
  const handleBlockUser = async (userId: string) => {
    try {
      await api.patch(`/api/v1/users/${userId}/block`);
      setUsers((prev) => prev.map((u) => u.userId === userId ? { ...u, status: "BLOCKED" } : u));
    } catch (err) {
      console.error("Failed to block user:", err);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      await api.patch(`/api/v1/users/${userId}/unblock`);
      setUsers((prev) => prev.map((u) => u.userId === userId ? { ...u, status: "ACTIVE" } : u));
    } catch (err) {
      console.error("Failed to unblock user:", err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user? This action is permanent!")) return;
    try {
      await api.delete(`/api/v1/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.userId !== userId));
    } catch (err) {
      console.error("Failed to delete user:", err);
    }
  };

  if (loadingClaims) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex flex-col items-center justify-center text-[#374151]">
        <div className="w-12 h-12 rounded-full border-4 border-[#e5e7eb] border-t-[#EB4203] animate-spin mb-4" />
        <span className="text-sm font-semibold tracking-wide text-zinc-500">Checking credentials...</span>
      </div>
    );
  }

  if (!authorized) {
    return null; // Redirect is handled in useEffect
  }

  // Filter listings
  const filteredTenants = tenants.filter((t) => 
    t.name?.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.slug?.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  const filteredUsers = users.filter((u) => 
    u.firstName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.lastName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  // Pagination — Tenants Directory (10 par page)
  const tenantTotalPages = Math.max(1, Math.ceil(filteredTenants.length / TENANTS_PER_PAGE));
  const tenantPageSafe = Math.min(tenantPage, tenantTotalPages);
  const paginatedTenants = filteredTenants.slice(
    (tenantPageSafe - 1) * TENANTS_PER_PAGE,
    tenantPageSafe * TENANTS_PER_PAGE
  );

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      {/* SIDEBAR */}
      <aside className="w-[230px] bg-white border-r border-[#e5e7eb] flex flex-col fixed h-screen z-50">
        <div className="px-6 py-7 border-b border-[#e5e7eb]">
          <div className="font-display text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            YowEvent <span className="text-xs bg-zinc-800 text-amber-400 font-normal px-2 py-0.5 rounded">Platform Admin</span>
          </div>
        </div>
        <nav className="flex-1 py-5">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "plans", label: "Subscription Plans", icon: Layers },
            { id: "tenants", label: "Tenants Directory", icon: Building },
            { id: "users", label: "Users Directory", icon: Users },
          ].map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`w-full flex items-center gap-3 px-6 py-3 text-sm transition-all border-none text-left cursor-pointer ${
                  active 
                    ? "bg-[#f9fafb] text-[#EB4203] border-r-2 border-[#EB4203] font-semibold" 
                    : "text-[#666] hover:bg-stone-50 hover:text-[#1a1a1a]"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="px-6 py-5 border-t border-[#e5e7eb]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[#1a1a1a] text-xs font-black">
              SA
            </div>
            <div>
              <div className="text-xs font-semibold text-[#1a1a1a]">Super Administrator</div>
              <div className="text-[9px] text-zinc-500">Platform Level</div>
            </div>
          </div>
          <a href="#" onClick={handleLogout} className="flex items-center gap-3 px-0 py-1 text-xs text-zinc-500 hover:text-[#222] transition-colors">
            <LogOut size={14} /> Log Out
          </a>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="ml-[230px] flex-1 flex flex-col">
        {/* HEADER */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-lg font-bold text-[#EB4203] capitalize">{activeTab} Administration</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-xs text-zinc-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              All Services Live
            </div>
          </div>
        </header>

        {/* TAB CONTENTS */}
        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          {loadingData ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-500">
              <div className="w-8 h-8 rounded-full border-2 border-[#e5e7eb] border-t-[#EB4203] animate-spin mb-3" />
              <span>Fetching platform data...</span>
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* METRIC BOXES */}
                  <div className="grid grid-cols-4 gap-5">
                    {[
                      { label: "Total Active Tenants", value: tenants.length, desc: "Provisioned Workspaces", icon: Building },
                      { label: "Active Subscriptions", value: tenants.filter(t => t.planId).length, desc: "Paid + Free Plans", icon: Layers },
                      { label: "Global Platform Users", value: users.length, desc: "Registered Profiles", icon: Users },
                      {
                        label: "Solde Disponible Plateforme",
                        value: platformRevenue ? formatAmount(platformRevenue.availableBalance) : "—",
                        desc: platformRevenue
                          ? `Collecté : ${formatAmount(platformRevenue.totalCollected)} · Retiré : ${formatAmount(platformRevenue.totalWithdrawn)}`
                          : "Chargement...",
                        icon: ShieldCheck,
                      },
                    ].map((m) => (
                      <div key={m.label} className="bg-white border border-[#e5e7eb] shadow-sm border border-[#e5e7eb] rounded-2xl p-6">
                        <div className="flex items-start justify-between mb-4">
                          <span className="text-[#666] text-xs font-semibold uppercase tracking-wider">{m.label}</span>
                          <m.icon className="text-amber-400" size={18} />
                        </div>
                        <div className="text-3xl font-bold text-[#1a1a1a] font-display mb-1">{m.value}</div>
                        <div className="text-xs text-zinc-500">{m.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-[2fr_1.2fr] gap-6">
                    {/* TRANSACTIONS PLATEFORME */}
                    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display font-bold text-[#EB4203] text-sm">Transactions Plateforme</h3>
                        <div className="flex items-center gap-1 bg-[#f9fafb] border border-[#e5e7eb] rounded-lg p-0.5">
                          {(["24h", "week", "month"] as TxWindow[]).map((w) => (
                            <button
                              key={w}
                              onClick={() => setTxWindow(w)}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                                txWindow === w ? "bg-[#EB4203] text-white" : "text-zinc-500 hover:text-[#1a1a1a]"
                              }`}
                            >
                              {w === "24h" ? "24h" : w === "week" ? "Semaine" : "Mois"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <p className="text-[10px] text-zinc-500 mb-4">
                        {TX_WINDOW_CONFIG[txWindow].label} · comparé à la période équivalente précédente
                      </p>

                      <div className="h-64 overflow-y-auto space-y-6 pr-1">
                        {sortedCurrencies.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-zinc-500 text-xs text-center">
                            Aucune transaction réussie sur la période sélectionnée.
                          </div>
                        ) : (
                          sortedCurrencies.map((currency) => {
                            const stats = txStatsByCurrency[currency];
                            const hasPrevious = stats.previousTotal > 0;
                            const changePercent = hasPrevious
                              ? ((stats.currentTotal - stats.previousTotal) / stats.previousTotal) * 100
                              : null;
                            const isNew = !hasPrevious && stats.currentTotal > 0;
                            const isFlat = stats.currentTotal === 0 && stats.previousTotal === 0;

                            return (
                              <div key={currency} className="space-y-2">
                                <div className="flex items-end justify-between gap-3">
                                  <div>
                                    <div className="text-2xl font-bold text-[#1a1a1a] font-display leading-tight">
                                      {formatAmount(stats.currentTotal)}{" "}
                                      <span className="text-xs font-medium text-zinc-500">{currency}</span>
                                    </div>
                                    <div className="text-[10px] text-zinc-500 mt-0.5">
                                      Période précédente : {formatAmount(stats.previousTotal)} {currency}
                                    </div>
                                  </div>
                                  <span
                                    className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${
                                      isFlat
                                        ? "bg-zinc-100 text-zinc-500"
                                        : isNew
                                        ? "bg-blue-50 text-blue-600"
                                        : changePercent !== null && changePercent >= 0
                                        ? "bg-green-50 text-green-700"
                                        : "bg-red-50 text-red-600"
                                    }`}
                                  >
                                    {isFlat ? (
                                      <Minus size={11} />
                                    ) : isNew ? (
                                      <TrendingUp size={11} />
                                    ) : changePercent !== null && changePercent >= 0 ? (
                                      <TrendingUp size={11} />
                                    ) : (
                                      <TrendingDown size={11} />
                                    )}
                                    {isFlat ? "—" : isNew ? "Nouveau" : `${changePercent!.toFixed(1)}%`}
                                  </span>
                                </div>
                                <Sparkline current={stats.currentSeries} previous={stats.previousSeries} />
                                <div className="flex items-center gap-4 text-[9px] text-zinc-500">
                                  <span className="flex items-center gap-1">
                                    <span className="w-3 h-[2px] bg-[#EB4203] inline-block" /> Période actuelle
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <span className="w-3 h-[2px] inline-block" style={{ borderTop: "2px dashed #9ca3af" }} /> Période précédente
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* MICROSERVICES HEALTH */}
                    <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                      <h3 className="font-display font-bold text-[#EB4203] text-sm mb-4">Platform Services Health</h3>
                      <div className="space-y-4">
                        {[
                          { name: "YowEvent Gateway", port: 8080, status: "Healthy" },
                          { name: "Auth Service", port: 8081, status: "Healthy" },
                          { name: "Event Service", port: 8082, status: "Healthy" },
                          { name: "Ticketing Service", port: 8083, status: "Healthy" },
                          { name: "Payment Service", port: 8084, status: "Healthy" },
                          { name: "Notification Service", port: 8085, status: "Healthy" }
                        ].map((srv) => (
                          <div key={srv.name} className="flex justify-between items-center py-2.5 border-b border-[#e5e7eb]/40 text-xs">
                            <div>
                              <span className="text-[#1a1a1a] font-medium block">{srv.name}</span>
                              <span className="text-zinc-500 text-[10px]">Port: {srv.port}</span>
                            </div>
                            <span className="flex items-center gap-1.5 text-xs text-green-400 font-bold bg-green-500/10 px-2.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                              {srv.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PLANS TAB */}
              {activeTab === "plans" && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-zinc-500">Configure core product tiers, restrictions, pricing scales, and feature authorizations.</p>
                    <button 
                      onClick={() => setCreatingPlan(true)}
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold text-xs rounded-lg flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Plus size={14} /> Create Subscription Plan
                    </button>
                  </div>

                  {/* PLANS TABLE */}
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#e5e7eb] text-[10px] text-zinc-500 uppercase tracking-wider bg-[#f9fafb]/30">
                          <th className="p-4 pl-6">Plan Name</th>
                          <th className="p-4">Monthly Price</th>
                          <th className="p-4">Billing Cycle</th>
                          <th className="p-4 text-center">Max Events</th>
                          <th className="p-4 text-center">Max Users</th>
                          <th className="p-4 text-center">Max Attendees</th>
                          <th className="p-4">Authorized Features</th>
                          <th className="p-4 pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-[#222] divide-y divide-[#e5e7eb]">
                        {plans.map((plan) => (
                          <tr key={plan.planId} className="hover:bg-zinc-800/10 transition-colors">
                            <td className="p-4 pl-6 font-bold text-[#1a1a1a]">{plan.name}</td>
                            <td className="p-4">${plan.price.toFixed(2)}</td>
                            <td className="p-4"><span className="bg-stone-100 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-stone-600">{plan.billingCycle}</span></td>
                            <td className="p-4 text-center">{plan.maxEvents === -1 ? "Unlimited" : plan.maxEvents}</td>
                            <td className="p-4 text-center">{plan.maxUsers === -1 ? "Unlimited" : plan.maxUsers}</td>
                            <td className="p-4 text-center">{plan.maxAttendeesPerEvent === -1 ? "Unlimited" : plan.maxAttendeesPerEvent}</td>
                            <td className="p-4 truncate max-w-[200px]" title={plan.featuresEnabled}>{plan.featuresEnabled}</td>
                            <td className="p-4 pr-6 text-right space-x-2">
                              <button 
                                onClick={() => setEditingPlan(plan)}
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-[#1a1a1a] rounded transition-colors cursor-pointer"
                                title="Edit Plan"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button 
                                onClick={() => deletePlan(plan.planId)}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors cursor-pointer"
                                title="Delete Plan"
                              >
                                <Trash2 size={12} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* CREATE PLAN DIALOG */}
                  {creatingPlan && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                      <div className="bg-white border border-[#e5e7eb] rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
                        <div>
                          <h3 className="font-display text-lg font-bold text-[#EB4203]">Create Subscription Plan</h3>
                          <p className="text-xs text-zinc-500">Configure details for the new pricing tier.</p>
                        </div>
                        <form onSubmit={createPlan} className="space-y-4 text-xs">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Plan Name</label>
                              <input 
                                type="text" required
                                value={planForm.name} 
                                onChange={(e) => setPlanForm({...planForm, name: e.target.value})}
                                placeholder="ENTERPRISE"
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Price ($)</label>
                              <input 
                                type="number" required min="0" step="0.01"
                                value={planForm.price} 
                                onChange={(e) => setPlanForm({...planForm, price: parseFloat(e.target.value)})}
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Billing Cycle</label>
                              <select 
                                value={planForm.billingCycle} 
                                onChange={(e) => setPlanForm({...planForm, billingCycle: e.target.value})}
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                              >
                                <option value="MONTHLY">Monthly</option>
                                <option value="ANNUALLY">Annually</option>
                                <option value="NONE">None</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Max Events (-1=Unlimited)</label>
                              <input 
                                type="number" required min="-1"
                                value={planForm.maxEvents} 
                                onChange={(e) => setPlanForm({...planForm, maxEvents: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Max Users (-1=Unlimited)</label>
                              <input 
                                type="number" required min="-1"
                                value={planForm.maxUsers} 
                                onChange={(e) => setPlanForm({...planForm, maxUsers: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Max Attendees/Event</label>
                              <input 
                                type="number" required min="-1"
                                value={planForm.maxAttendeesPerEvent} 
                                onChange={(e) => setPlanForm({...planForm, maxAttendeesPerEvent: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Authorized Features (Comma Separated)</label>
                            <input 
                              type="text" required
                              value={planForm.featuresEnabled} 
                              onChange={(e) => setPlanForm({...planForm, featuresEnabled: e.target.value})}
                              placeholder="BASIC_EVENT,TICKET_SALES,ANALYTICS"
                              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                            />
                          </div>

                          <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e7eb]">
                            <button 
                              type="button" 
                              onClick={() => setCreatingPlan(false)}
                              className="px-4 py-2 border border-[#e5e7eb] hover:bg-zinc-800 text-[#222] rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit" 
                              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold rounded-lg cursor-pointer"
                            >
                              Create Plan
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* EDIT PLAN DIALOG */}
                  {editingPlan && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                      <div className="bg-white border border-[#e5e7eb] rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
                        <div>
                          <h3 className="font-display text-lg font-bold text-[#EB4203]">Modify Plan: {editingPlan.name}</h3>
                          <p className="text-xs text-zinc-500">Edit billing rates and platform limits.</p>
                        </div>
                        <form onSubmit={savePlanEdit} className="space-y-4 text-xs">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Plan Name</label>
                              <input 
                                type="text" required
                                value={editingPlan.name} 
                                onChange={(e) => setEditingPlan({...editingPlan, name: e.target.value})}
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Price ($)</label>
                              <input 
                                type="number" required min="0" step="0.01"
                                value={editingPlan.price} 
                                onChange={(e) => setEditingPlan({...editingPlan, price: parseFloat(e.target.value)})}
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Billing Cycle</label>
                              <select 
                                value={editingPlan.billingCycle} 
                                onChange={(e) => setEditingPlan({...editingPlan, billingCycle: e.target.value})}
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                              >
                                <option value="MONTHLY">Monthly</option>
                                <option value="ANNUALLY">Annually</option>
                                <option value="NONE">None</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Max Events (-1=Unlimited)</label>
                              <input 
                                type="number" required min="-1"
                                value={editingPlan.maxEvents} 
                                onChange={(e) => setEditingPlan({...editingPlan, maxEvents: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Max Users (-1=Unlimited)</label>
                              <input 
                                type="number" required min="-1"
                                value={editingPlan.maxUsers} 
                                onChange={(e) => setEditingPlan({...editingPlan, maxUsers: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Max Attendees/Event</label>
                              <input 
                                type="number" required min="-1"
                                value={editingPlan.maxAttendeesPerEvent} 
                                onChange={(e) => setEditingPlan({...editingPlan, maxAttendeesPerEvent: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Authorized Features</label>
                            <input 
                              type="text" required
                              value={editingPlan.featuresEnabled} 
                              onChange={(e) => setEditingPlan({...editingPlan, featuresEnabled: e.target.value})}
                              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-xl bg-[#f9fafb] text-[#1a1a1a] outline-none focus:border-amber-400"
                            />
                          </div>

                          <div className="flex justify-end gap-3 pt-4 border-t border-[#e5e7eb]">
                            <button 
                              type="button" 
                              onClick={() => setEditingPlan(null)}
                              className="px-4 py-2 border border-[#e5e7eb] hover:bg-zinc-800 text-[#222] rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit" 
                              className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-zinc-950 font-bold rounded-lg cursor-pointer"
                            >
                              Save Changes
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TENANTS TAB */}
              {activeTab === "tenants" && (
                <div className="space-y-6">
                  {/* Search Bar */}
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 w-72 text-xs">
                      <Search size={14} className="text-zinc-500" />
                      <input 
                        placeholder="Search tenants by name or slug..." 
                        value={tenantSearch}
                        onChange={(e) => { setTenantSearch(e.target.value); setTenantPage(1); }}
                        className="bg-transparent text-[#1a1a1a] placeholder:text-zinc-600 outline-none w-full"
                      />
                    </div>
                    <span className="text-xs text-zinc-500">Showing {filteredTenants.length} of {tenants.length} tenants</span>
                  </div>

                  {/* TENANTS TABLE */}
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#e5e7eb] text-[10px] text-zinc-500 uppercase tracking-wider bg-[#f9fafb]/30">
                          <th className="p-4 pl-6">Tenant Name</th>
                          <th className="p-4">Slug</th>
                          <th className="p-4">Active Plan</th>
                          <th className="p-4">Account Type</th>
                          <th className="p-4">Created Date</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-[#222] divide-y divide-[#e5e7eb]">
                        {paginatedTenants.map((tenant) => {
                          const planObj = plans.find((p) => p.planId === tenant.planId);
                          return (
                            <tr key={tenant.tenantId} className="hover:bg-zinc-800/10 transition-colors">
                              <td className="p-4 pl-6 font-bold text-[#1a1a1a]">{tenant.name}</td>
                              <td className="p-4 font-mono text-zinc-500">{tenant.slug}</td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  planObj?.name === "PREMIUM" ? "bg-amber-400/10 text-amber-400" :
                                  planObj?.name === "BASIC" ? "bg-blue-400/10 text-blue-400" : "bg-zinc-800 text-zinc-400"
                                }`}>
                                  {planObj ? planObj.name : "None / Free"}
                                </span>
                              </td>
                              <td className="p-4">{tenant.type}</td>
                              <td className="p-4 text-zinc-500">{tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : "-"}</td>
                              <td className="p-4">
                                <span className={`flex items-center gap-1 text-[11px] font-bold ${
                                  tenant.status === "ACTIVE" ? "text-green-400" : "text-red-400"
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    tenant.status === "ACTIVE" ? "bg-green-400" : "bg-red-400"
                                  }`} />
                                  {tenant.status}
                                </span>
                              </td>
                              <td className="p-4 pr-6 text-right flex items-center justify-end gap-2">
                                <button
                                  onClick={() => viewTenantAttendees(tenant)}
                                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                >
                                  View Attendees
                                </button>
                                <button
                                  onClick={() => toggleTenantType(tenant)}
                                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-[#1a1a1a] rounded text-[10px] font-semibold transition-colors cursor-pointer"
                                >
                                  Toggle to {tenant.type === "ORGANIZATION" ? "Individual" : "Organization"}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION — Tenants Directory */}
                  {filteredTenants.length > 0 && (
                    <div className="flex items-center justify-between px-1">
                      <span className="text-xs text-zinc-500">
                        Page {tenantPageSafe} sur {tenantTotalPages}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setTenantPage((p) => Math.max(1, p - 1))}
                          disabled={tenantPageSafe <= 1}
                          className="px-3 py-1.5 bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] text-[#1a1a1a] rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Précédent
                        </button>
                        <button
                          onClick={() => setTenantPage((p) => Math.min(tenantTotalPages, p + 1))}
                          disabled={tenantPageSafe >= tenantTotalPages}
                          className="px-3 py-1.5 bg-white border border-[#e5e7eb] hover:bg-[#f9fafb] text-[#1a1a1a] rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Suivant
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* USERS TAB */}
              {activeTab === "users" && (
                <div className="space-y-6">
                  {/* Search Bar */}
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2 bg-white border border-[#e5e7eb] rounded-lg px-3 py-2 w-72 text-xs">
                      <Search size={14} className="text-zinc-500" />
                      <input 
                        placeholder="Search profiles by name or email..." 
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="bg-transparent text-[#1a1a1a] placeholder:text-zinc-600 outline-none w-full"
                      />
                    </div>
                    <span className="text-xs text-zinc-500">Showing {filteredUsers.length} of {users.length} accounts</span>
                  </div>

                  {/* USERS TABLE */}
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#e5e7eb] text-[10px] text-zinc-500 uppercase tracking-wider bg-[#f9fafb]/30">
                          <th className="p-4 pl-6">Profile Name</th>
                          <th className="p-4">Email Address</th>
                          <th className="p-4">Associated Workspace ID</th>
                          <th className="p-4">Verified</th>
                          <th className="p-4">Created Date</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-[#222] divide-y divide-[#e5e7eb]">
                        {filteredUsers.map((user) => (
                          <tr key={user.userId} className="hover:bg-zinc-800/10 transition-colors">
                            <td className="p-4 pl-6 font-bold text-[#1a1a1a]">{user.firstName} {user.lastName}</td>
                            <td className="p-4 text-zinc-400">{user.email}</td>
                            <td className="p-4 font-mono text-zinc-500 text-[10px]">{user.tenantId || "-"}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                user.emailVerified ? "bg-green-50 text-green-700 border border-green-100" : "bg-zinc-800 text-zinc-500"
                              }`}>
                                {user.emailVerified ? "Verified" : "Pending"}
                              </span>
                            </td>
                            <td className="p-4 text-zinc-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</td>
                            <td className="p-4">
                              <span className={`flex items-center gap-1.5 text-[11px] font-bold ${
                                user.status === "ACTIVE" ? "text-green-400" : "text-red-450"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  user.status === "ACTIVE" ? "bg-green-400" : "bg-red-500"
                                }`} />
                                {user.status || "ACTIVE"}
                              </span>
                            </td>
                            <td className="p-4 pr-6 text-right space-x-2">
                              {user.status === "BLOCKED" ? (
                                <button
                                  onClick={() => handleUnblockUser(user.userId)}
                                  className="px-2.5 py-1 bg-green-950/40 hover:bg-green-900/60 text-green-450 rounded text-[10px] font-bold transition-colors cursor-pointer border-none"
                                >
                                  Unblock
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleBlockUser(user.userId)}
                                  className="px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-400 rounded text-[10px] font-bold transition-colors cursor-pointer border-none"
                                >
                                  Block
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteUser(user.userId)}
                                className="px-2.5 py-1 bg-red-955/40 hover:bg-red-900/60 text-red-400 rounded text-[10px] font-bold transition-colors cursor-pointer border-none"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* TENANT ATTENDEES MODAL */}
      {viewingTenant && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-[#e5e7eb] rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[80vh]">
            <div className="px-8 py-5 border-b border-[#e5e7eb] flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-bold text-[#1a1a1a]">
                  Attendees — {viewingTenant.name}
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Users registered for events under this tenant
                </p>
              </div>
              <button
                onClick={() => { setViewingTenant(null); setTenantRegistrations([]); }}
                className="text-zinc-500 hover:text-white text-xl font-bold cursor-pointer transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-6">
              {loadingRegs ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 rounded-full border-2 border-[#e5e7eb] border-t-amber-400 animate-spin" />
                </div>
              ) : tenantRegistrations.length === 0 ? (
                <div className="text-center py-16 text-zinc-500 text-sm">No registrations found for this tenant.</div>
              ) : (
                <>
                  <p className="text-xs text-zinc-500 mb-4">{tenantRegistrations.length} registration{tenantRegistrations.length !== 1 ? "s" : ""} found</p>
                  <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-[#e5e7eb] text-[10px] text-zinc-500 uppercase tracking-wider bg-[#f9fafb]/30">
                          <th className="p-3 pl-5">User</th>
                          <th className="p-3">Email</th>
                          <th className="p-3">Event ID</th>
                          <th className="p-3">Registered</th>
                          <th className="p-3 pr-5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-[#222] divide-y divide-[#e5e7eb]">
                        {tenantRegistrations.map((reg: any) => {
                          const user = users.find((u: any) => u.userId === reg.userId);
                          return (
                            <tr key={reg.registrationId} className="hover:bg-zinc-800/10">
                              <td className="p-3 pl-5 font-semibold text-[#1a1a1a]">
                                {user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || "—" : reg.userId?.slice(0, 10) + "…"}
                              </td>
                              <td className="p-3 text-zinc-400">{user?.email || "—"}</td>
                              <td className="p-3 font-mono text-zinc-500 text-[10px]">{reg.eventId?.slice(0, 12)}…</td>
                              <td className="p-3 text-zinc-500">
                                {reg.registeredAt ? new Date(reg.registeredAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                              </td>
                              <td className="p-3 pr-5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  reg.status === "CONFIRMED" ? "bg-green-50 text-green-700 border border-green-100" :
                                  reg.status === "CANCELLED" ? "bg-red-500/10 text-red-400" :
                                  "bg-zinc-800 text-zinc-400"
                                }`}>
                                  {reg.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}