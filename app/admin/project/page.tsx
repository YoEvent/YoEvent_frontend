"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Tag, Ticket, DollarSign, Calendar as CalIcon, Pencil, Trash2, Save, X, Star, ChevronDown } from "lucide-react";
import { getStoredAuth, api } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { paymentService } from "@/app/utils/services/paymentService";

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";
const saveBtn = "flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-50";

const toLocalISOString = (dateInput?: string | Date) => {
  if (!dateInput) return "";
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "";
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

export default function ProjectPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<any>(null);

  // Forms
  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [ticketForm, setTicketForm] = useState({
    name: "",
    description: "",
    price: 0,
    quantityAvailable: 100,
    saleStart: toLocalISOString(new Date()),
    saleEnd: toLocalISOString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    maxPerOrder: 5,
  });

  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [couponForm, setCouponForm] = useState({
    code: "",
    type: "PERCENTAGE",
    value: 10,
    maxUses: 100,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const ticketFormRef = useRef<HTMLFormElement>(null);
  const couponFormRef = useRef<HTMLFormElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

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
      const [ticketsList, couponsList, ordersList, refundsList, schedsList] = await Promise.all([
        eventService.getTicketTypes(),
        eventService.getCoupons(),
        eventService.getOrders(),
        paymentService.getRefunds().catch(() => []),
        eventService.getEventSchedules().catch(() => []),
      ]);

      setTicketTypes((ticketsList || []).filter((t) => t.eventId === eventId));
      setCoupons((couponsList || []).filter((c) => c.eventId === eventId));
      setOrders((ordersList || []).filter((o) => o.eventId === eventId));
      setRefunds(refundsList || []);
      
      const sched = (schedsList || []).find((s: any) => s.eventId === eventId || s.event?.eventId === eventId);
      setSchedule(sched || null);
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
      setEditingTicket(null);
      setEditingCoupon(null);
      setTicketForm({
        name: "",
        description: "",
        price: 0,
        quantityAvailable: 100,
        saleStart: toLocalISOString(new Date()),
        saleEnd: toLocalISOString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        maxPerOrder: 5,
      });
      setCouponForm({ code: "", type: "PERCENTAGE", value: 10, maxUses: 100 });
    }
  }, [selectedEventId]);

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !ticketForm.name) return;

    const qty = Number(ticketForm.quantityAvailable);
    const mpo = Number(ticketForm.maxPerOrder);
    const now = new Date();
    const eventEnd = schedule?.endDatetime ? new Date(schedule.endDatetime) : null;
    const selectedEvent = events.find(e => e.eventId === selectedEventId);
    const maxCapacity = selectedEvent?.maxCapacity || 0;

    // ── Quantity vs capacity ──
    const allocatedTicketQty = ticketTypes.reduce((sum: number, t: any) => sum + (t.quantityAvailable ?? 0), 0);
    if (maxCapacity > 0) {
      const usedByOthers = allocatedTicketQty - (editingTicket ? (editingTicket.quantityAvailable ?? 0) : 0);
      const allowed = maxCapacity - usedByOthers;
      if (qty > allowed) {
        showToast(`Quantity exceeds remaining capacity. Max you can add: ${allowed} (event max: ${maxCapacity}).`);
        return;
      }
    }

    // ── Max Per Order ──
    if (mpo < 1) { showToast("Max per order must be at least 1."); return; }
    if (maxCapacity > 0 && mpo > maxCapacity) {
      showToast(`Max per order (${mpo}) cannot exceed the event's max capacity (${maxCapacity}).`);
      return;
    }
    if (mpo > qty) {
      showToast(`Max per order (${mpo}) cannot exceed the ticket quantity (${qty}).`);
      return;
    }

    // ── Sale dates ──
    const origSaleStart = editingTicket?.saleStart ? toLocalISOString(editingTicket.saleStart) : "";
    const origSaleEnd = editingTicket?.saleEnd ? toLocalISOString(editingTicket.saleEnd) : "";
    const isSaleStartChanged = !editingTicket || ticketForm.saleStart !== origSaleStart;
    const isSaleEndChanged = !editingTicket || ticketForm.saleEnd !== origSaleEnd;

    if (ticketForm.saleStart) {
      const saleStart = new Date(ticketForm.saleStart);
      if (isSaleStartChanged && saleStart < now) { showToast("Sale start date cannot be in the past."); return; }
      if (eventEnd && saleStart >= eventEnd) {
        showToast(`Sale start must be before the event ends.`);
        return;
      }
      if (ticketForm.saleEnd) {
        const saleEnd = new Date(ticketForm.saleEnd);
        if (saleEnd <= saleStart) { showToast("Sale end must be after sale start."); return; }
        if (saleEnd.getTime() - saleStart.getTime() < 2 * 3600 * 1000) {
          showToast("Sale window must be at least 2 hours long."); return;
        }
        if (eventEnd && saleEnd > eventEnd) {
          showToast(`Sale end cannot be after the event ends.`);
          return;
        }
      }
    } else if (ticketForm.saleEnd) {
      const saleEnd = new Date(ticketForm.saleEnd);
      if (isSaleEndChanged && saleEnd < now) { showToast("Sale end date cannot be in the past."); return; }
      if (eventEnd && saleEnd > eventEnd) {
        showToast(`Sale end cannot be after the event ends.`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        eventId: selectedEventId,
        name: ticketForm.name,
        description: ticketForm.description,
        price: Number(ticketForm.price),
        currency: selectedEvent?.currency || "XAF",
        quantityAvailable: qty,
        quantitySold: editingTicket ? editingTicket.quantitySold : 0,
        saleStart: ticketForm.saleStart ? new Date(ticketForm.saleStart).toISOString() : undefined,
        saleEnd: ticketForm.saleEnd ? new Date(ticketForm.saleEnd).toISOString() : undefined,
        maxPerOrder: mpo,
      };

      if (editingTicket) {
        await eventService.updateTicketType(editingTicket.ticketId || editingTicket.id, payload);
        setEditingTicket(null);
        showToast("Ticket tier updated!");
      } else {
        await eventService.createTicketType(payload);
        showToast("Ticket tier added!");
      }

      setTicketForm({ 
        name: "", 
        description: "", 
        price: 0, 
        quantityAvailable: 100,
        saleStart: toLocalISOString(new Date()),
        saleEnd: toLocalISOString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        maxPerOrder: 5
      });
      await fetchEventDetails(selectedEventId);
    } catch (err) {
      console.error(err);
      showToast("Failed to save ticket tier.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm("Delete this ticket tier?")) return;
    try {
      await eventService.deleteTicketType(id);
      if (editingTicket?.ticketId === id || editingTicket?.id === id) {
        setEditingTicket(null);
        setTicketForm({
          name: "",
          description: "",
          price: 0,
          quantityAvailable: 100,
          saleStart: toLocalISOString(new Date()),
          saleEnd: toLocalISOString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
          maxPerOrder: 5,
        });
      }
      await fetchEventDetails(selectedEventId);
      showToast("Ticket tier deleted.");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete ticket tier.");
    }
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!selectedEventId || !auth || !couponForm.code) return;
    setSaving(true);
    try {
      const payload = {
        tenantId: auth.tenantId,
        eventId: selectedEventId,
        code: couponForm.code.toUpperCase(),
        type: couponForm.type,
        value: Number(couponForm.value),
        maxUses: Number(couponForm.maxUses),
        usedCount: editingCoupon ? editingCoupon.usedCount : 0,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      if (editingCoupon) {
        await eventService.updateCoupon(editingCoupon.couponId || editingCoupon.id, payload);
        setEditingCoupon(null);
        showToast("Coupon updated!");
      } else {
        await eventService.createCoupon(payload);
        showToast("Coupon added!");
      }

      setCouponForm({ code: "", type: "PERCENTAGE", value: 10, maxUses: 100 });
      await fetchEventDetails(selectedEventId);
    } catch (err) {
      console.error(err);
      showToast("Failed to save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Delete this coupon code?")) return;
    try {
      await eventService.deleteCoupon(id);
      if (editingCoupon?.couponId === id || editingCoupon?.id === id) {
        setEditingCoupon(null);
        setCouponForm({ code: "", type: "PERCENTAGE", value: 10, maxUses: 100 });
      }
      await fetchEventDetails(selectedEventId);
      showToast("Coupon code deleted.");
    } catch (err) {
      console.error(err);
      showToast("Failed to delete coupon.");
    }
  };

  const activeEvent = events.find((e) => e.eventId === selectedEventId || e.id === selectedEventId);
  const maxCapacity = activeEvent?.maxCapacity || 0;
  const allocatedTicketQty = ticketTypes.reduce((sum: number, t: any) => sum + (t.quantityAvailable ?? 0), 0);

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* TOAST */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 bg-[#1a1a1a] text-white text-xs font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
            <Star size={12} className="text-[#FF4747]" />
            {toast}
          </div>
        )}

        {/* HEADER */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">Ticketing & Coupons</h1>
          {events.length > 0 && (
            <div className="relative">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="appearance-none bg-white border border-[#e5e7eb] text-[#1a1a1a] text-sm rounded-lg px-4 py-1.5 pr-8 outline-none cursor-pointer"
              >
                {events.map((ev, idx) => (
                  <option key={`${ev.eventId || ev.id || idx}-${idx}`} value={ev.eventId || ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
            </div>
          )}
        </header>

        <main className="p-8 space-y-8 max-w-[1400px]">
          {/* TICKET TYPES */}
          <div className="grid grid-cols-2 gap-8">
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
              <h2 className="font-display font-bold text-[#EB4203] mb-5 flex items-center gap-2">
                <Ticket size={18} className="text-[#EB4203]" /> Ticket Tiers <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeEvent?.title || "selected event"})</span>
              </h2>
              <form ref={ticketFormRef} onSubmit={handleSaveTicket} className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Tier Name *</label>
                    <input
                      placeholder="e.g. VIP Pass"
                      value={ticketForm.name}
                      onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                      className={inp}
                      required
                    />
                  </div>
                  <div>
                    <label className={label}>Price (FCFA) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 5000"
                      value={ticketForm.price || ""}
                      onChange={(e) => setTicketForm({ ...ticketForm, price: Number(e.target.value) })}
                      className={inp}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Description</label>
                    <input
                      placeholder="Special access..."
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className={label}>Capacity Available *</label>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      min={1}
                      max={maxCapacity > 0 ? maxCapacity - allocatedTicketQty + (editingTicket ? (editingTicket.quantityAvailable ?? 0) : 0) : undefined}
                      value={ticketForm.quantityAvailable || ""}
                      onChange={(e) => setTicketForm({ ...ticketForm, quantityAvailable: Number(e.target.value) })}
                      className={inp}
                      required
                    />
                    {maxCapacity > 0 && (
                      <p className="text-[10px] mt-1 text-[#888]">
                        {maxCapacity - allocatedTicketQty + (editingTicket ? (editingTicket.quantityAvailable ?? 0) : 0)} slots available (event max: {maxCapacity})
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Sale Start *</label>
                    <input
                      type="datetime-local"
                      value={ticketForm.saleStart}
                      min={toLocalISOString(new Date())}
                      max={schedule?.endDatetime ? toLocalISOString(schedule.endDatetime) : undefined}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTicketForm(f => {
                          const minEnd = v ? toLocalISOString(new Date(new Date(v).getTime() + 2 * 3600 * 1000)) : f.saleEnd;
                          return { ...f, saleStart: v, saleEnd: f.saleEnd && v && new Date(f.saleEnd) < new Date(minEnd) ? minEnd : f.saleEnd };
                        });
                      }}
                      className={inp}
                      required
                    />
                  </div>
                  <div>
                    <label className={label}>Sale End *</label>
                    <input
                      type="datetime-local"
                      value={ticketForm.saleEnd}
                      min={ticketForm.saleStart ? toLocalISOString(new Date(new Date(ticketForm.saleStart).getTime() + 2 * 3600 * 1000)) : toLocalISOString(new Date())}
                      max={schedule?.endDatetime ? toLocalISOString(schedule.endDatetime) : undefined}
                      onChange={(e) => setTicketForm({ ...ticketForm, saleEnd: e.target.value })}
                      className={inp}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Max Per Order *</label>
                    <input
                      type="number"
                      placeholder="e.g. 5"
                      min={1}
                      max={Math.min(ticketForm.quantityAvailable, maxCapacity > 0 ? maxCapacity : ticketForm.quantityAvailable)}
                      value={ticketForm.maxPerOrder || ""}
                      onChange={(e) => setTicketForm({ ...ticketForm, maxPerOrder: Number(e.target.value) })}
                      className={inp}
                      required
                    />
                    <p className="text-[10px] mt-1 text-[#888]">Maximum tickets one person can buy in a single order.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className={saveBtn}
                  >
                    <Save size={13} /> {editingTicket ? (saving ? "Saving..." : "Save Changes") : (saving ? "Adding..." : "Add Ticket Tier")}
                  </button>
                  {editingTicket && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTicket(null);
                        setTicketForm({
                          name: "",
                          description: "",
                          price: 0,
                          quantityAvailable: 100,
                          saleStart: toLocalISOString(new Date()),
                          saleEnd: toLocalISOString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
                          maxPerOrder: 5,
                        });
                      }}
                      className="px-4 py-2.5 bg-stone-100 text-[#555] hover:bg-stone-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              {/* LIST */}
              <div className="space-y-3">
                {ticketTypes.map((t, idx) => {
                  const id = t.ticketId || t.id;
                  return (
                    <div key={`${id || idx}-${idx}`} className={`flex justify-between items-center p-3.5 bg-white border rounded-xl hover:border-[#FF4747]/20 transition-all ${editingTicket?.ticketId === id ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#1a1a1a] truncate">{t.name}</div>
                        <div className="text-[10px] text-[#555] mt-0.5 truncate">{t.description || "No description"}</div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-4">
                        <div>
                          <div className="text-xs font-bold text-[#EB4203]">{Number(t.price).toLocaleString()} FCFA</div>
                          <div className="text-[9px] text-[#555] mt-0.5">{t.quantitySold || 0}/{t.quantityAvailable} sold</div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => {
                            setEditingTicket(t);
                            setTicketForm({
                              name: t.name || "",
                              description: t.description || "",
                              price: t.price || 0,
                              quantityAvailable: t.quantityAvailable || 100,
                              saleStart: t.saleStart ? toLocalISOString(t.saleStart) : toLocalISOString(new Date()),
                              saleEnd: t.saleEnd ? toLocalISOString(t.saleEnd) : toLocalISOString(new Date()),
                              maxPerOrder: t.maxPerOrder || 5,
                            });
                            ticketFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }} className="p-1 text-[#555] hover:bg-stone-100 rounded-md transition-colors cursor-pointer">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDeleteTicket(id)} className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {ticketTypes.length === 0 && (
                  <div className="text-center text-xs text-[#888] py-8 border border-dashed border-[#e5e7eb] rounded-2xl bg-white">No ticket tiers created yet.</div>
                )}
              </div>
            </div>

            {/* COUPONS */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
              <h2 className="font-display font-bold text-[#EB4203] mb-5 flex items-center gap-2">
                <Tag size={18} className="text-[#EB4203]" /> Coupon Codes <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeEvent?.title || "selected event"})</span>
              </h2>
              <form ref={couponFormRef} onSubmit={handleSaveCoupon} className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Promo Code *</label>
                    <input
                      placeholder="e.g. DISCOUNT20"
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                      className={inp}
                      required
                    />
                  </div>
                  <div>
                    <label className={label}>Discount Type *</label>
                    <select
                      value={couponForm.type}
                      onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}
                      className={inp}
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Fixed Amount (FCFA)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>Discount Value *</label>
                    <input
                      type="number"
                      placeholder="e.g. 10"
                      value={couponForm.value || ""}
                      onChange={(e) => setCouponForm({ ...couponForm, value: Number(e.target.value) })}
                      className={inp}
                      required
                    />
                  </div>
                  <div>
                    <label className={label}>Max Uses *</label>
                    <input
                      type="number"
                      placeholder="e.g. 100"
                      value={couponForm.maxUses || ""}
                      onChange={(e) => setCouponForm({ ...couponForm, maxUses: Number(e.target.value) })}
                      className={inp}
                      required
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className={saveBtn}
                  >
                    <Save size={13} /> {editingCoupon ? (saving ? "Saving..." : "Save Changes") : (saving ? "Adding..." : "Add Coupon")}
                  </button>
                  {editingCoupon && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCoupon(null);
                        setCouponForm({ code: "", type: "PERCENTAGE", value: 10, maxUses: 100 });
                      }}
                      className="px-4 py-2.5 bg-stone-100 text-[#555] hover:bg-stone-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>
              </form>

              {/* LIST */}
              <div className="space-y-3">
                {coupons.map((c, idx) => {
                  const id = c.couponId || c.id;
                  return (
                    <div key={`${id || idx}-${idx}`} className={`flex justify-between items-center p-3.5 bg-white border rounded-xl hover:border-[#FF4747]/20 transition-all ${editingCoupon?.couponId === id ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#1a1a1a] tracking-wider font-mono uppercase">{c.code}</div>
                        <div className="text-[10px] text-[#555] mt-0.5">Expires in 30 days</div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-4">
                        <div>
                          <div className="text-xs font-bold text-orange-500">
                            {c.type === "PERCENTAGE" ? `${c.value}% Off` : `${Number(c.value).toLocaleString()} FCFA Off`}
                          </div>
                          <div className="text-[9px] text-[#555] mt-0.5">{c.usedCount || 0}/{c.maxUses} uses</div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => {
                            setEditingCoupon(c);
                            setCouponForm({
                              code: c.code || "",
                              type: c.type || "PERCENTAGE",
                              value: c.value || 10,
                              maxUses: c.maxUses || 100,
                            });
                            couponFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }} className="p-1 text-[#555] hover:bg-stone-100 rounded-md transition-colors cursor-pointer">
                            <Pencil size={12} />
                          </button>
                          <button onClick={() => handleDeleteCoupon(id)} className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {coupons.length === 0 && (
                  <div className="text-center text-xs text-[#888] py-8 border border-dashed border-[#e5e7eb] rounded-2xl bg-white">No coupons created yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* ORDERS */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
            <h2 className="font-display font-bold text-[#EB4203] mb-5 flex items-center gap-2">
              <DollarSign size={18} className="text-[#EB4203]" /> Recent Orders
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1a1a1a]">
                <thead className="bg-[#f9fafb] text-[10px] text-[#555] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 rounded-l-xl">Order ID</th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Gross</th>
                    <th className="p-4">Discount</th>
                    <th className="p-4 text-red-600/70">Platform Fee</th>
                    <th className="p-4 text-green-600/70">Net</th>
                    <th className="p-4 rounded-r-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb]">
                  {orders.map((o, idx) => {
                    const gross = parseFloat(o.totalAmount) || 0;
                    const fee = parseFloat(o.platformFee) || 0;
                    const net = gross - fee;
                    return (
                      <tr key={`${o.orderId || idx}-${idx}`} className="hover:bg-[#f9fafb] transition-colors">
                        <td className="p-4 font-mono text-[10px] text-[#666]">{o.orderId?.substring(0, 8)}...</td>
                        <td className="p-4 text-[#555]">{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : "—"}</td>
                        <td className="p-4 text-[#1a1a1a] font-medium">{gross.toLocaleString()} FCFA</td>
                        <td className="p-4 text-[#555]">{(parseFloat(o.discountAmount) || 0).toLocaleString()} FCFA</td>
                        <td className="p-4 text-red-500 font-medium">-{fee.toLocaleString()} FCFA</td>
                        <td className="p-4 text-green-600 font-semibold">{net.toLocaleString()} FCFA</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              o.status === "PAID" ? "bg-green-50 text-green-700 border border-green-100" : "bg-stone-100 text-stone-600 border border-stone-200"
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
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
            <h2 className="font-display font-bold text-[#EB4203] mb-5 flex items-center gap-2">
              <DollarSign size={18} className="text-red-500" /> Refund History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1a1a1a]">
                <thead className="bg-[#f9fafb] text-[10px] text-[#555] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 rounded-l-xl">Refund ID</th>
                    <th className="p-4">Payment ID</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Reason</th>
                    <th className="p-4">Processed At</th>
                    <th className="p-4 rounded-r-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e5e7eb]">
                  {refunds.map((r, idx) => {
                    const amount = parseFloat(r.amount) || 0;
                    return (
                      <tr key={`${r.refundId || idx}-${idx}`} className="hover:bg-[#f9fafb] transition-colors">
                        <td className="p-4 font-mono text-[10px] text-[#666]">{r.refundId?.substring(0, 8)}...</td>
                        <td className="p-4 font-mono text-[10px] text-[#666]">{r.paymentId?.substring(0, 8)}...</td>
                        <td className="p-4 text-[#1a1a1a] font-medium">{amount.toLocaleString()} FCFA</td>
                        <td className="p-4 text-[#555]">{r.reason || "No reason provided"}</td>
                        <td className="p-4 text-[#555]">{r.processedAt ? new Date(r.processedAt).toLocaleDateString() : "—"}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              r.status === "SUCCESSFUL" ? "bg-green-50 text-green-700 border border-green-100" : "bg-red-50 text-red-700 border border-red-100"
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
