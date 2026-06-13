"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { eventService } from "@/app/utils/services/eventService";
import { getStoredAuth } from "@/app/utils/api";
import { ShoppingCart, Search, ChevronDown, Package, CheckCircle2, XCircle, Clock } from "lucide-react";

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";

export default function OrdersPage() {
  const auth = getStoredAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterEventId, setFilterEventId] = useState("ALL");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [evs, ords] = await Promise.all([
          eventService.getMyEvents().catch(() => []),
          eventService.getOrders().catch(() => []),
        ]);
        const myEvents = (evs || []).filter((e: any) => !auth?.tenantId || !e.tenantId || e.tenantId === auth.tenantId);
        setEvents(myEvents);
        const myEventIds = new Set(myEvents.map((e: any) => e.eventId));
        const myOrders = (ords || []).filter((o: any) => !o.eventId || myEventIds.has(o.eventId));
        setOrders(myOrders);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = orders.filter((o: any) => {
    const matchStatus = filterStatus === "ALL" || o.status === filterStatus;
    const matchEvent = filterEventId === "ALL" || o.eventId === filterEventId;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (o.orderId || o.id || "").toLowerCase().includes(q) ||
      (o.userId || "").toLowerCase().includes(q) ||
      (o.status || "").toLowerCase().includes(q);
    return matchStatus && matchEvent && matchSearch;
  });

  const totalRevenue = filtered.reduce((sum: number, o: any) => sum + (parseFloat(o.totalAmount) || 0), 0);
  const totalFees = filtered.reduce((sum: number, o: any) => sum + (parseFloat(o.platformFee) || 0), 0);

  const statusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle2 size={14} className="text-green-500" />;
      case "FAILED":
      case "CANCELLED": return <XCircle size={14} className="text-red-400" />;
      default: return <Clock size={14} className="text-amber-400" />;
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 text-green-700";
      case "FAILED":
      case "CANCELLED": return "bg-red-100 text-red-600";
      case "PENDING": return "bg-amber-100 text-amber-700";
      default: return "bg-[#f5f5f5] text-[#888]";
    }
  };

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#1a1a1a]">
      <Sidebar />
      <div className="ml-[220px] flex-1 p-8">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <p className="text-xs text-[#aaa] font-semibold uppercase tracking-widest mb-1">Admin</p>
            <h1 className="font-display font-black text-3xl text-[#1a1a1a] flex items-center gap-3">
              <ShoppingCart size={28} className="text-[#FF4747]" /> Orders
            </h1>
            <p className="text-[#888] text-sm mt-1">View and manage all ticket orders for your events.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Orders", value: filtered.length, color: "#6366f1" },
              { label: "Completed", value: filtered.filter((o: any) => o.status === "COMPLETED").length, color: "#10b981" },
              { label: "Gross Revenue", value: `${totalRevenue.toLocaleString()} FCFA`, color: "#FF4747" },
              { label: "Platform Fees", value: `${totalFees.toLocaleString()} FCFA`, color: "#f59e0b" },
            ].map(s => (
              <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-2xl p-5">
                <div className="font-black text-2xl" style={{ color: s.color }}>{s.value}</div>
                <div className="text-xs text-[#888] mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 mb-5 flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by order ID or user..." className={inp + " pl-9"} />
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={inp + " appearance-none pr-8 w-auto"}>
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="FAILED">Failed</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] pointer-events-none" />
            </div>
            <div className="relative">
              <select value={filterEventId} onChange={e => setFilterEventId(e.target.value)} className={inp + " appearance-none pr-8 w-auto"}>
                <option value="ALL">All Events</option>
                {events.map((ev: any) => (
                  <option key={ev.eventId} value={ev.eventId}>{ev.title}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] pointer-events-none" />
            </div>
          </div>

          {/* Orders table */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-20 text-[#aaa]">
                  <div className="w-7 h-7 border-4 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-20 text-center">
                  <Package size={40} className="mx-auto text-[#e5e7eb] mb-3" />
                  <p className="font-bold text-[#1a1a1a]">No orders found</p>
                  <p className="text-xs text-[#aaa] mt-1">Orders will appear here as attendees purchase tickets.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#fafafa] border-b border-[#f0f0f0] text-[10px] text-[#888] uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">Order ID</th>
                      <th className="px-5 py-3">Event</th>
                      <th className="px-5 py-3">Items</th>
                      <th className="px-5 py-3">Amount</th>
                      <th className="px-5 py-3">Fee</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f5f5]">
                    {filtered.map((o: any) => {
                      const event = events.find((ev: any) => ev.eventId === o.eventId);
                      return (
                        <tr key={o.orderId || o.id} className="hover:bg-[#fafafa] transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-mono text-xs text-[#1a1a1a] font-semibold">{(o.orderId || o.id || "").substring(0, 12)}...</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-xs font-semibold text-[#1a1a1a] max-w-[140px] truncate">{event?.title || o.eventId || "—"}</div>
                          </td>
                          <td className="px-5 py-4 text-xs text-[#555]">{o.itemCount ?? (o.items?.length ?? "—")}</td>
                          <td className="px-5 py-4">
                            <span className="font-bold text-[#1a1a1a]">{Number(o.totalAmount || 0).toLocaleString()}</span>
                            <span className="text-[10px] text-[#aaa] ml-1">FCFA</span>
                          </td>
                          <td className="px-5 py-4 text-xs text-[#888]">{Number(o.platformFee || 0).toLocaleString()} FCFA</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              {statusIcon(o.status)}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge(o.status)}`}>{o.status || "PENDING"}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-[#888]">
                            {o.createdAt ? new Date(o.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
