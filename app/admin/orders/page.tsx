"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { eventService } from "@/app/utils/services/eventService";
import { paymentService } from "@/app/utils/services/paymentService";
import { getStoredAuth } from "@/app/utils/api";
import { ShoppingCart, Search, ChevronRight, Package, CheckCircle2, XCircle, Clock, DollarSign } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";
 
const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
 
export default function OrdersPage() {
  const { t } = useLanguage();
  const auth = getStoredAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterEventId, setFilterEventId] = useState("ALL");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
 
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [evs, ords, items, tickets, refundsList] = await Promise.all([
          eventService.getMyEvents().catch(() => []),
          eventService.getOrders().catch(() => []),
          eventService.getOrderItems().catch(() => []),
          eventService.getTicketTypes().catch(() => []),
          paymentService.getRefunds().catch(() => []),
        ]);
        const myEvents = (evs || []).filter((e: any) => !auth?.tenantId || !e.tenantId || e.tenantId === auth.tenantId);
        setEvents(myEvents);
        const myEventIds = new Set(myEvents.map((e: any) => e.eventId));
        const myOrders = (ords || []).filter((o: any) => !o.eventId || myEventIds.has(o.eventId));
        setOrders(myOrders);
        setOrderItems(items || []);
        setTicketTypes(tickets || []);
        setRefunds(refundsList || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const statusOptions = [
    { value: "ALL", label: t("adminOrders.filters.allStatuses") },
    { value: "PENDING", label: t("adminOrders.filters.pending") },
    { value: "COMPLETED", label: t("adminOrders.filters.completed") },
    { value: "CANCELLED", label: t("adminOrders.filters.cancelled") },
    { value: "FAILED", label: t("adminOrders.filters.failed") },
  ];

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
            <p className="text-xs text-[#aaa] font-semibold uppercase tracking-widest mb-1">{t("adminOrders.header.eyebrow")}</p>
            <h1 className="font-display font-black text-3xl text-[#1a1a1a] flex items-center gap-3">
              <ShoppingCart size={28} className="text-[#FF4747]" /> {t("adminOrders.header.title")}
            </h1>
            <p className="text-[#888] text-sm mt-1">{t("adminOrders.header.subtitle")}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: t("adminOrders.stats.totalOrders"), value: filtered.length, color: "#6366f1" },
              { label: t("adminOrders.stats.completed"), value: filtered.filter((o: any) => o.status === "COMPLETED").length, color: "#10b981" },
              { label: t("adminOrders.stats.grossRevenue"), value: `${totalRevenue.toLocaleString()} FCFA`, color: "#FF4747" },
              { label: t("adminOrders.stats.platformFees"), value: `${totalFees.toLocaleString()} FCFA`, color: "#f59e0b" },
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
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t("adminOrders.filters.searchPlaceholder")} className={inp + " pl-9"} />
            </div>
            <div className="relative">
              <button type="button" onClick={() => setShowStatusDropdown(v => !v)} className={inp + " flex items-center justify-between gap-2 w-auto min-w-[160px] cursor-pointer"}>
                <span>{statusOptions.find(o => o.value === filterStatus)?.label}</span>
                <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showStatusDropdown ? "rotate-90" : ""}`} />
              </button>
              {showStatusDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowStatusDropdown(false)} />
                  <div className="absolute z-50 mt-1 w-full min-w-[160px] bg-white border border-[#e5e7eb] rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                    {statusOptions.map(opt => (
                      <button key={opt.value} type="button" onClick={() => { setFilterStatus(opt.value); setShowStatusDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${filterStatus === opt.value ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="relative">
              <button type="button" onClick={() => setShowEventDropdown(v => !v)} className={inp + " flex items-center justify-between gap-2 w-auto min-w-[160px] cursor-pointer"}>
                <span className="truncate">{filterEventId === "ALL" ? t("adminOrders.filters.allEvents") : (events.find((ev: any) => ev.eventId === filterEventId)?.title || t("adminOrders.filters.allEvents"))}</span>
                <ChevronRight size={14} className={`text-[#aaa] transition-transform shrink-0 ${showEventDropdown ? "rotate-90" : ""}`} />
              </button>
              {showEventDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowEventDropdown(false)} />
                  <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white border border-[#e5e7eb] rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                    <button type="button" onClick={() => { setFilterEventId("ALL"); setShowEventDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${filterEventId === "ALL" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                      {t("adminOrders.filters.allEvents")}
                    </button>
                    {events.map((ev: any) => (
                      <button key={ev.eventId} type="button" onClick={() => { setFilterEventId(ev.eventId); setShowEventDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${filterEventId === ev.eventId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                        {ev.title}
                      </button>
                    ))}
                  </div>
                </>
              )}
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
                  <p className="font-bold text-[#1a1a1a]">{t("adminOrders.empty.title")}</p>
                  <p className="text-xs text-[#aaa] mt-1">{t("adminOrders.empty.desc")}</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#fafafa] border-b border-[#f0f0f0] text-[10px] text-[#888] uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">{t("adminOrders.table.colOrderId")}</th>
                      <th className="px-5 py-3">{t("adminOrders.table.colEvent")}</th>
                      <th className="px-5 py-3">{t("adminOrders.table.colItems")}</th>
                      <th className="px-5 py-3">{t("adminOrders.table.colAmount")}</th>
                      <th className="px-5 py-3">{t("adminOrders.table.colFee")}</th>
                      <th className="px-5 py-3">{t("adminOrders.table.colStatus")}</th>
                      <th className="px-5 py-3">{t("adminOrders.table.colDate")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f5f5]">
                    {filtered.map((o: any) => {
                      const event = events.find((ev: any) => ev.eventId === o.eventId);
                      const oItems = orderItems.filter((oi: any) => oi.orderId === (o.orderId || o.id));
                      const itemsDesc = oItems.map((oi: any) => {
                        const tt = ticketTypes.find((t: any) => t.ticketId === oi.ticketTypeId || t.ticketTypeId === oi.ticketTypeId || t.id === oi.ticketTypeId);
                        return `${oi.quantity} x ${tt ? tt.name : t("adminOrders.table.ticketFallback")}`;
                      }).join(", ");
                      return (
                        <tr key={o.orderId || o.id} className="hover:bg-[#fafafa] transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-mono text-xs text-[#1a1a1a] font-semibold">{(o.orderId || o.id || "").substring(0, 12)}...</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="text-xs font-semibold text-[#1a1a1a] max-w-[140px] truncate">{event?.title || o.eventId || "—"}</div>
                          </td>
                          <td className="px-5 py-4 text-xs text-[#555] font-semibold">{itemsDesc || "—"}</td>
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
 
          {/* Refunds Table */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm mt-8">
            <h2 className="font-display font-bold text-[#EB4203] mb-5 flex items-center gap-2">
              <DollarSign size={18} className="text-red-500" /> {t("adminProject.refunds.title") || "Refunds"}
            </h2>
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-[#aaa]">
                  <div className="w-6 h-6 border-2 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin" />
                </div>
              ) : refunds.length === 0 ? (
                <div className="py-10 text-center text-xs text-[#888]">
                  {t("adminProject.refunds.empty") || "No refunds found."}
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#fafafa] border-b border-[#f0f0f0] text-[10px] text-[#888] uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-3">{t("adminProject.refunds.colRefundId") || "Refund ID"}</th>
                      <th className="px-5 py-3">{t("adminProject.refunds.colPaymentId") || "Payment ID"}</th>
                      <th className="px-5 py-3">{t("adminProject.refunds.colAmount") || "Amount"}</th>
                      <th className="px-5 py-3">{t("adminProject.refunds.colReason") || "Reason"}</th>
                      <th className="px-5 py-3">{t("adminProject.refunds.colProcessedAt") || "Processed At"}</th>
                      <th className="px-5 py-3">{t("adminProject.refunds.colStatus") || "Status"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f5f5] text-xs text-[#222]">
                    {refunds.map((r, idx) => {
                      const amount = parseFloat(r.amount) || 0;
                      return (
                        <tr key={`${r.refundId || idx}-${idx}`} className="hover:bg-[#fafafa] transition-colors">
                          <td className="px-5 py-4 font-mono text-[10px] text-[#666]">{r.refundId?.substring(0, 12)}...</td>
                          <td className="px-5 py-4 font-mono text-[10px] text-[#666]">{r.paymentId?.substring(0, 12)}...</td>
                          <td className="px-5 py-4 font-bold text-[#1a1a1a]">{amount.toLocaleString()} FCFA</td>
                          <td className="px-5 py-4 text-[#555]">{r.reason || t("adminProject.refunds.noReason") || "No reason"}</td>
                          <td className="px-5 py-4 text-[#888]">{r.processedAt ? new Date(r.processedAt).toLocaleDateString() : "—"}</td>
                          <td className="px-5 py-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                                r.status === "SUCCESSFUL" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                              }`}
                            >
                              {r.status || "PENDING"}
                            </span>
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
