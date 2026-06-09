"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Tag, Ticket, DollarSign, Calendar as CalIcon } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { paymentService } from "@/app/utils/services/paymentService";

export default function ProjectPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);

  const [ticketForm, setTicketForm] = useState({
    name: "",
    description: "",
    price: 0,
    quantityAvailable: 100,
    saleStart: new Date().toISOString().slice(0, 16),
    saleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    maxPerOrder: 5,
  });

  const [couponForm, setCouponForm] = useState({
    code: "",
    type: "PERCENTAGE",
    value: 10,
    maxUses: 100,
  });

  const [loading, setLoading] = useState(true);

  const fetchProjectData = async () => {
    const auth = getStoredAuth();
    if (!auth) return;
    try {
      const evs = await eventService.getMyEvents();
      setEvents(evs || []);
      if (evs && evs.length > 0 && !selectedEventId) {
        setSelectedEventId(evs[0].eventId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventDetails = async (eventId: string) => {
    if (!eventId) return;
    try {
      const [ticketsList, couponsList, ordersList, refundsList] = await Promise.all([
        eventService.getTicketTypes(),
        eventService.getCoupons(),
        eventService.getOrders(),
        paymentService.getRefunds().catch(() => []),
      ]);

      setTicketTypes((ticketsList || []).filter((t) => t.eventId === eventId));
      setCoupons((couponsList || []).filter((c) => c.eventId === eventId));
      setOrders((ordersList || []).filter((o) => o.eventId === eventId));
      setRefunds(refundsList || []);
    } catch (err) {
      console.error("Failed to load details:", err);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventDetails(selectedEventId);
    }
  }, [selectedEventId]);

  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !ticketForm.name) return;
    try {
      await eventService.createTicketType({
        eventId: selectedEventId,
        name: ticketForm.name,
        description: ticketForm.description,
        price: Number(ticketForm.price),
        currency: "USD",
        quantityAvailable: Number(ticketForm.quantityAvailable),
        quantitySold: 0,
        saleStart: new Date(ticketForm.saleStart).toISOString(),
        saleEnd: new Date(ticketForm.saleEnd).toISOString(),
        maxPerOrder: Number(ticketForm.maxPerOrder),
      });
      setTicketForm({ 
        name: "", 
        description: "", 
        price: 0, 
        quantityAvailable: 100,
        saleStart: new Date().toISOString().slice(0, 16),
        saleEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        maxPerOrder: 5
      });
      fetchEventDetails(selectedEventId);
    } catch (err) {
      console.error("Failed to create ticket type:", err);
    }
  };

  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!selectedEventId || !auth || !couponForm.code) return;
    try {
      await eventService.createCoupon({
        tenantId: auth.tenantId,
        eventId: selectedEventId,
        code: couponForm.code.toUpperCase(),
        type: couponForm.type,
        value: Number(couponForm.value),
        maxUses: Number(couponForm.maxUses),
        usedCount: 0,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setCouponForm({ code: "", type: "PERCENTAGE", value: 10, maxUses: 100 });
      fetchEventDetails(selectedEventId);
    } catch (err) {
      console.error("Failed to create coupon:", err);
    }
  };

  const activeEvent = events.find((e) => e.eventId === selectedEventId || e.id === selectedEventId);

  return (
    <div className="flex bg-[#111] min-h-screen text-[#e0e0e0]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* HEADER */}
        <header className="h-[60px] bg-[#161616] border-b border-[#222] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-white">Ticketing & Coupons</h1>
          <div className="flex items-center gap-3">
            <label className="text-xs text-[#666] uppercase tracking-wider font-semibold">Active Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-[#222] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-[#ddd] outline-none"
            >
              {events.map((ev) => (
                <option key={ev.eventId} value={ev.eventId}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="p-8 space-y-8">
          {/* TICKET TYPES */}
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
              <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
                <Ticket size={18} className="text-[#d4c9a8]" /> Ticket Tiers <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeEvent?.title || "selected event"})</span>
              </h2>
              <form onSubmit={handleAddTicket} className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Tier Name (e.g. VIP Pass)"
                    value={ticketForm.name}
                    onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Price ($)"
                    value={ticketForm.price || ""}
                    onChange={(e) => setTicketForm({ ...ticketForm, price: Number(e.target.value) })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Description"
                    value={ticketForm.description}
                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Capacity Available"
                    value={ticketForm.quantityAvailable || ""}
                    onChange={(e) => setTicketForm({ ...ticketForm, quantityAvailable: Number(e.target.value) })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-medium text-[#555] uppercase tracking-wider mb-1">Sale Start</label>
                    <input
                      type="datetime-local"
                      value={ticketForm.saleStart}
                      onChange={(e) => setTicketForm({ ...ticketForm, saleStart: e.target.value })}
                      className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4c9a8]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-medium text-[#555] uppercase tracking-wider mb-1">Sale End</label>
                    <input
                      type="datetime-local"
                      value={ticketForm.saleEnd}
                      onChange={(e) => setTicketForm({ ...ticketForm, saleEnd: e.target.value })}
                      className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4c9a8]"
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-medium text-[#555] uppercase tracking-wider mb-1">Max Per Order</label>
                    <input
                      type="number"
                      placeholder="Max Per Order"
                      value={ticketForm.maxPerOrder || ""}
                      onChange={(e) => setTicketForm({ ...ticketForm, maxPerOrder: Number(e.target.value) })}
                      className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4c9a8]"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Add Ticket Tier
                </button>
              </form>

              {/* LIST */}
              <div className="space-y-3">
                {ticketTypes.map((t) => (
                  <div key={t.ticketId} className="flex justify-between items-center p-3.5 bg-[#161616] border border-[#2a2a2a] rounded-xl">
                    <div>
                      <div className="text-xs font-bold text-white">{t.name}</div>
                      <div className="text-[10px] text-[#555] mt-0.5">{t.description || "No description"}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-[#d4c9a8]">${t.price}</div>
                      <div className="text-[9px] text-[#555] mt-0.5">{t.quantitySold}/{t.quantityAvailable} sold</div>
                    </div>
                  </div>
                ))}
                {ticketTypes.length === 0 && (
                  <div className="text-center text-xs text-[#555] py-4">No ticket tiers created yet.</div>
                )}
              </div>
            </div>

            {/* COUPONS */}
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
              <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
                <Tag size={18} className="text-[#d4c9a8]" /> Coupon Codes <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeEvent?.title || "selected event"})</span>
              </h2>
              <form onSubmit={handleAddCoupon} className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Promo Code (e.g. DISCOUNT20)"
                    value={couponForm.code}
                    onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                    required
                  />
                  <select
                    value={couponForm.type}
                    onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount ($)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    placeholder="Discount Value"
                    value={couponForm.value || ""}
                    onChange={(e) => setCouponForm({ ...couponForm, value: Number(e.target.value) })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Max Uses"
                    value={couponForm.maxUses || ""}
                    onChange={(e) => setCouponForm({ ...couponForm, maxUses: Number(e.target.value) })}
                    className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Add Coupon
                </button>
              </form>

              {/* LIST */}
              <div className="space-y-3">
                {coupons.map((c) => (
                  <div key={c.couponId} className="flex justify-between items-center p-3.5 bg-[#161616] border border-[#2a2a2a] rounded-xl">
                    <div>
                      <div className="text-xs font-bold text-white tracking-wider">{c.code}</div>
                      <div className="text-[9px] text-[#555] mt-0.5">Expires in 30 days</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-orange-400">
                        {c.type === "PERCENTAGE" ? `${c.value}% Off` : `$${c.value} Off`}
                      </div>
                      <div className="text-[9px] text-[#555] mt-0.5">{c.usedCount}/{c.maxUses} uses</div>
                    </div>
                  </div>
                ))}
                {coupons.length === 0 && (
                  <div className="text-center text-xs text-[#555] py-4">No coupons created yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* ORDERS */}
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
            <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
              <DollarSign size={18} className="text-[#d4c9a8]" /> Recent Orders
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#ddd]">
                <thead className="bg-[#161616] text-[10px] text-[#555] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 rounded-l-xl">Order ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Gross</th>
                    <th className="p-4">Discount</th>
                    <th className="p-4 text-red-400/70">Platform Fee</th>
                    <th className="p-4 text-green-400/70">Net</th>
                    <th className="p-4 rounded-r-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {orders.map((o) => {
                    const gross = parseFloat(o.totalAmount) || 0;
                    const fee = parseFloat(o.platformFee) || 0;
                    const net = gross - fee;
                    return (
                      <tr key={o.orderId} className="hover:bg-[#252525] transition-colors">
                        <td className="p-4 font-mono text-[10px] text-[#999]">{o.orderId?.substring(0, 8)}...</td>
                        <td className="p-4 text-[#888]">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}</td>
                        <td className="p-4 text-white font-medium">${gross.toFixed(2)}</td>
                        <td className="p-4 text-[#888]">${(parseFloat(o.discountAmount) || 0).toFixed(2)}</td>
                        <td className="p-4 text-red-400 font-medium">-${fee.toFixed(2)}</td>
                        <td className="p-4 text-green-400 font-semibold">${net.toFixed(2)}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              o.status === "PAID" ? "bg-green-500/15 text-green-400" : "bg-zinc-700/50 text-zinc-400"
                            }`}
                          >
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#555]">
                        No orders recorded for this event.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* REFUNDS */}
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
            <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
              <DollarSign size={18} className="text-red-400" /> Refund History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#ddd]">
                <thead className="bg-[#161616] text-[10px] text-[#555] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 rounded-l-xl">Refund ID</th>
                    <th className="p-4">Payment ID</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Processed At</th>
                    <th className="p-4 rounded-r-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {refunds.map((r) => {
                    const amount = parseFloat(r.amount) || 0;
                    return (
                      <tr key={r.refundId} className="hover:bg-[#252525] transition-colors">
                        <td className="p-4 font-mono text-[10px] text-[#999]">{r.refundId?.substring(0, 8)}...</td>
                        <td className="p-4 font-mono text-[10px] text-[#999]">{r.paymentId?.substring(0, 8)}...</td>
                        <td className="p-4 text-white font-medium">${amount.toFixed(2)}</td>
                        <td className="p-4 text-[#888]">{r.reason || "No reason provided"}</td>
                        <td className="p-4 text-[#888]">{r.processedAt ? new Date(r.processedAt).toLocaleDateString() : "—"}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              r.status === "SUCCESSFUL" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {refunds.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#555]">
                        No refunds processed yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
