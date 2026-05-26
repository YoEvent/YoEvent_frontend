"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, Layers, Users, Building, Activity, LogOut, Search, Plus, Edit3, Trash2, CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";
import { api, getStoredAuth, clearStoredAuth, getAuthClaims } from "@/app/utils/api";

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

  // Simulated system logs
  const [systemLogs, setSystemLogs] = useState<string[]>([
    "[System] Gateway routing initialized successfully.",
    "[Auth] SUPER_ADMIN account authenticated successfully.",
    "[Payment] Syncing pending transactions with Stripe webhook listener...",
    "[System] Kafka brokers are fully operational."
  ]);

  useEffect(() => {
    // 1. Authorize role
    const claims = getAuthClaims();
    if (!claims || !claims.scope || !claims.scope.includes("SUPER_ADMIN")) {
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
      api.get<any[]>("/api/v1/subscriptionplans"),
      api.get<any[]>("/api/v1/tenants"),
      api.get<any[]>("/api/v1/users")
    ]).then(([plansData, tenantsData, usersData]) => {
      setPlans(plansData || []);
      setTenants(tenantsData || []);
      setUsers(usersData || []);
    }).catch((err) => {
      console.error("Failed to load platform administration data:", err);
    }).finally(() => {
      setLoadingData(false);
    });

    // 3. Log simulator interval
    const interval = setInterval(() => {
      const msgs = [
        "[Gateway] Routed request /api/v1/subscriptionplans GET successfully.",
        "[Database] Connection pool stats: active=3, idle=12, max=20",
        "[Metrics] Platform CPU usage: 14% | RAM usage: 42%",
        "[Auth] User login request completed on tenant_db.",
        "[Payment] Stripe PaymentIntent generated pi_" + Math.random().toString(36).substr(2, 9),
        "[System] Audit logger successfully appended event to secure log stream."
      ];
      setSystemLogs((prev) => [msgs[Math.floor(Math.random() * msgs.length)], ...prev.slice(0, 10)]);
    }, 8000);

    return () => clearInterval(interval);
  }, [authorized]);

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

  if (loadingClaims) {
    return (
      <div className="min-h-screen bg-[#0d0d0f] flex flex-col items-center justify-center text-[#e0e0e0]">
        <div className="w-12 h-12 rounded-full border-4 border-zinc-800 border-t-[#d4c9a8] animate-spin mb-4" />
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

  const totalRevenue = tenants.reduce((acc, t) => {
    const planObj = plans.find((p) => p.planId === t.planId);
    return acc + (planObj ? planObj.price : 0);
  }, 0);

  return (
    <div className="flex bg-[#0d0d0f] min-h-screen text-[#e0e0e0]">
      {/* SIDEBAR */}
      <aside className="w-[230px] bg-[#111114] border-r border-zinc-800/80 flex flex-col fixed h-screen z-50">
        <div className="px-6 py-7 border-b border-zinc-800/80">
          <div className="font-display text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            YoEvent <span className="text-xs bg-zinc-800 text-amber-400 font-normal px-2 py-0.5 rounded">Platform Admin</span>
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
                    ? "bg-zinc-800/60 text-white border-r-2 border-amber-400 font-semibold" 
                    : "text-zinc-500 hover:bg-zinc-800/20 hover:text-zinc-300"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="px-6 py-5 border-t border-zinc-800/80">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-[#1a1a1a] text-xs font-black">
              SA
            </div>
            <div>
              <div className="text-xs font-semibold text-[#ccc]">Super Administrator</div>
              <div className="text-[9px] text-zinc-500">Platform Level</div>
            </div>
          </div>
          <a href="#" onClick={handleLogout} className="flex items-center gap-3 px-0 py-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
            <LogOut size={14} /> Log Out
          </a>
        </div>
      </aside>

      {/* MAIN CONTAINER */}
      <div className="ml-[230px] flex-1 flex flex-col">
        {/* HEADER */}
        <header className="h-[60px] bg-[#111114] border-b border-zinc-800/80 flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-lg font-bold text-white capitalize">{activeTab} Administration</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800/60 rounded-lg px-3 py-1.5 text-xs text-zinc-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              All Services Live
            </div>
          </div>
        </header>

        {/* TAB CONTENTS */}
        <main className="p-8 space-y-6 flex-1 overflow-y-auto">
          {loadingData ? (
            <div className="h-64 flex flex-col items-center justify-center text-zinc-500">
              <div className="w-8 h-8 rounded-full border-2 border-zinc-800 border-t-[#d4c9a8] animate-spin mb-3" />
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
                      { label: "Monthly Platform Revenue", value: `$${totalRevenue.toFixed(2)}`, desc: "Simulated MRR", icon: ShieldCheck },
                    ].map((m) => (
                      <div key={m.label} className="bg-gradient-to-br from-[#161619] to-[#1c1c20] border border-zinc-800/60 rounded-2xl p-6">
                        <div className="flex items-start justify-between mb-4">
                          <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">{m.label}</span>
                          <m.icon className="text-amber-400" size={18} />
                        </div>
                        <div className="text-3xl font-bold text-white font-display mb-1">{m.value}</div>
                        <div className="text-xs text-zinc-500">{m.desc}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-[2fr_1.2fr] gap-6">
                    {/* LIVE SIMULATED SYSTEM LOGS */}
                    <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-display font-bold text-white text-sm">Real-time Platform Logs</h3>
                        <span className="text-[10px] text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded font-mono font-bold animate-pulse">LIVE STREAM</span>
                      </div>
                      <div className="bg-black/40 rounded-xl p-4 font-mono text-xs text-zinc-400 h-64 overflow-y-auto space-y-2.5 border border-zinc-900">
                        {systemLogs.map((log, index) => (
                          <div key={index} className="flex gap-2">
                            <span className="text-zinc-600">[{new Date().toLocaleTimeString()}]</span>
                            <span className={log.includes("ERROR") ? "text-red-400" : log.includes("WARN") ? "text-amber-400 font-semibold" : "text-zinc-300"}>
                              {log}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* MICROSERVICES HEALTH */}
                    <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl p-6">
                      <h3 className="font-display font-bold text-white text-sm mb-4">Platform Services Health</h3>
                      <div className="space-y-4">
                        {[
                          { name: "YoEvent Gateway", port: 8080, status: "Healthy" },
                          { name: "Auth Service", port: 8081, status: "Healthy" },
                          { name: "Event Service", port: 8082, status: "Healthy" },
                          { name: "Ticketing Service", port: 8083, status: "Healthy" },
                          { name: "Payment Service", port: 8084, status: "Healthy" },
                          { name: "Notification Service", port: 8085, status: "Healthy" }
                        ].map((srv) => (
                          <div key={srv.name} className="flex justify-between items-center py-2.5 border-b border-zinc-800/40 text-xs">
                            <div>
                              <span className="text-[#ccc] font-medium block">{srv.name}</span>
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
                  <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider bg-zinc-900/30">
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
                      <tbody className="text-xs text-zinc-300 divide-y divide-zinc-800/40">
                        {plans.map((plan) => (
                          <tr key={plan.planId} className="hover:bg-zinc-800/10 transition-colors">
                            <td className="p-4 pl-6 font-bold text-white">{plan.name}</td>
                            <td className="p-4">${plan.price.toFixed(2)}</td>
                            <td className="p-4"><span className="bg-zinc-800 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-zinc-400">{plan.billingCycle}</span></td>
                            <td className="p-4 text-center">{plan.maxEvents === -1 ? "Unlimited" : plan.maxEvents}</td>
                            <td className="p-4 text-center">{plan.maxUsers === -1 ? "Unlimited" : plan.maxUsers}</td>
                            <td className="p-4 text-center">{plan.maxAttendeesPerEvent === -1 ? "Unlimited" : plan.maxAttendeesPerEvent}</td>
                            <td className="p-4 truncate max-w-[200px]" title={plan.featuresEnabled}>{plan.featuresEnabled}</td>
                            <td className="p-4 pr-6 text-right space-x-2">
                              <button 
                                onClick={() => setEditingPlan(plan)}
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-[#ccc] rounded transition-colors cursor-pointer"
                                title="Edit Plan"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button 
                                onClick={() => deletePlan(plan.planId)}
                                className="p-1.5 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded transition-colors cursor-pointer"
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
                      <div className="bg-[#111114] border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
                        <div>
                          <h3 className="font-display text-lg font-bold text-white">Create Subscription Plan</h3>
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
                                className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Price ($)</label>
                              <input 
                                type="number" required min="0" step="0.01"
                                value={planForm.price} 
                                onChange={(e) => setPlanForm({...planForm, price: parseFloat(e.target.value)})}
                                className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Billing Cycle</label>
                              <select 
                                value={planForm.billingCycle} 
                                onChange={(e) => setPlanForm({...planForm, billingCycle: e.target.value})}
                                className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
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
                                className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
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
                                className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Max Attendees/Event</label>
                              <input 
                                type="number" required min="-1"
                                value={planForm.maxAttendeesPerEvent} 
                                onChange={(e) => setPlanForm({...planForm, maxAttendeesPerEvent: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
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
                              className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
                            />
                          </div>

                          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                            <button 
                              type="button" 
                              onClick={() => setCreatingPlan(false)}
                              className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg cursor-pointer"
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
                      <div className="bg-[#111114] border border-zinc-800 rounded-3xl p-8 w-full max-w-md shadow-2xl space-y-6">
                        <div>
                          <h3 className="font-display text-lg font-bold text-white">Modify Plan: {editingPlan.name}</h3>
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
                                className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Price ($)</label>
                              <input 
                                type="number" required min="0" step="0.01"
                                value={editingPlan.price} 
                                onChange={(e) => setEditingPlan({...editingPlan, price: parseFloat(e.target.value)})}
                                className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Billing Cycle</label>
                              <select 
                                value={editingPlan.billingCycle} 
                                onChange={(e) => setEditingPlan({...editingPlan, billingCycle: e.target.value})}
                                className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
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
                                className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
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
                                className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Max Attendees/Event</label>
                              <input 
                                type="number" required min="-1"
                                value={editingPlan.maxAttendeesPerEvent} 
                                onChange={(e) => setEditingPlan({...editingPlan, maxAttendeesPerEvent: parseInt(e.target.value)})}
                                className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-zinc-500 uppercase tracking-wider mb-1.5">Authorized Features</label>
                            <input 
                              type="text" required
                              value={editingPlan.featuresEnabled} 
                              onChange={(e) => setEditingPlan({...editingPlan, featuresEnabled: e.target.value})}
                              className="w-full px-3 py-2 border border-zinc-850 rounded-xl bg-zinc-900 text-white outline-none focus:border-amber-400"
                            />
                          </div>

                          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                            <button 
                              type="button" 
                              onClick={() => setEditingPlan(null)}
                              className="px-4 py-2 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 rounded-lg cursor-pointer"
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
                    <div className="flex items-center gap-2 bg-[#111114] border border-zinc-800/60 rounded-lg px-3 py-2 w-72 text-xs">
                      <Search size={14} className="text-zinc-500" />
                      <input 
                        placeholder="Search tenants by name or slug..." 
                        value={tenantSearch}
                        onChange={(e) => setTenantSearch(e.target.value)}
                        className="bg-transparent text-white placeholder:text-zinc-600 outline-none w-full"
                      />
                    </div>
                    <span className="text-xs text-zinc-500">Showing {filteredTenants.length} of {tenants.length} tenants</span>
                  </div>

                  {/* TENANTS TABLE */}
                  <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider bg-zinc-900/30">
                          <th className="p-4 pl-6">Tenant Name</th>
                          <th className="p-4">Slug</th>
                          <th className="p-4">Active Plan</th>
                          <th className="p-4">Account Type</th>
                          <th className="p-4">Created Date</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 pr-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-zinc-300 divide-y divide-zinc-800/40">
                        {filteredTenants.map((tenant) => {
                          const planObj = plans.find((p) => p.planId === tenant.planId);
                          return (
                            <tr key={tenant.tenantId} className="hover:bg-zinc-800/10 transition-colors">
                              <td className="p-4 pl-6 font-bold text-white">{tenant.name}</td>
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
                              <td className="p-4 pr-6 text-right">
                                <button 
                                  onClick={() => toggleTenantType(tenant)}
                                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-[10px] font-semibold transition-colors cursor-pointer"
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
                </div>
              )}

              {/* USERS TAB */}
              {activeTab === "users" && (
                <div className="space-y-6">
                  {/* Search Bar */}
                  <div className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-2 bg-[#111114] border border-zinc-800/60 rounded-lg px-3 py-2 w-72 text-xs">
                      <Search size={14} className="text-zinc-500" />
                      <input 
                        placeholder="Search profiles by name or email..." 
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        className="bg-transparent text-white placeholder:text-zinc-600 outline-none w-full"
                      />
                    </div>
                    <span className="text-xs text-zinc-500">Showing {filteredUsers.length} of {users.length} accounts</span>
                  </div>

                  {/* USERS TABLE */}
                  <div className="bg-[#111114] border border-zinc-800/60 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider bg-zinc-900/30">
                          <th className="p-4 pl-6">Profile Name</th>
                          <th className="p-4">Email Address</th>
                          <th className="p-4">Associated Workspace ID</th>
                          <th className="p-4">Verified</th>
                          <th className="p-4">Created Date</th>
                          <th className="p-4 pr-6">Status</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-zinc-300 divide-y divide-zinc-800/40">
                        {filteredUsers.map((user) => (
                          <tr key={user.userId} className="hover:bg-zinc-800/10 transition-colors">
                            <td className="p-4 pl-6 font-bold text-white">{user.firstName} {user.lastName}</td>
                            <td className="p-4 text-zinc-400">{user.email}</td>
                            <td className="p-4 font-mono text-zinc-500 text-[10px]">{user.tenantId || "-"}</td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                user.emailVerified ? "bg-green-500/10 text-green-400" : "bg-zinc-800 text-zinc-500"
                              }`}>
                                {user.emailVerified ? "Verified" : "Pending"}
                              </span>
                            </td>
                            <td className="p-4 text-zinc-500">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "-"}</td>
                            <td className="p-4 pr-6">
                              <span className={`flex items-center gap-1.5 text-[11px] font-bold ${
                                user.status === "ACTIVE" ? "text-green-400" : "text-red-400"
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  user.status === "ACTIVE" ? "bg-green-400" : "bg-red-400"
                                }`} />
                                {user.status}
                              </span>
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
    </div>
  );
}
