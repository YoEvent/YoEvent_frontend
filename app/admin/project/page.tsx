"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Tag, Ticket, DollarSign, Calendar as CalIcon, Pencil, Trash2, Save, X, Star, ChevronDown } from "lucide-react";
import { getStoredAuth, api } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { paymentService } from "@/app/utils/services/paymentService";
import { useLanguage } from "@/app/context/LanguageContext";

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
  const { t } = useLanguage();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [refunds, setRefunds] = useState<any[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);

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
    sessionIds: [] as string[],
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
      const [ticketsList, couponsList, ordersList, refundsList, schedsList, sessionsList] = await Promise.all([
        eventService.getTicketTypes(),
        eventService.getCoupons(),
        eventService.getOrders(),
        paymentService.getRefunds().catch(() => []),
        eventService.getEventSchedules().catch(() => []),
        eventService.getSessions().catch(() => []),
      ]);

      setTicketTypes((ticketsList || []).filter((t) => t.eventId === eventId));
      setCoupons((couponsList || []).filter((c) => c.eventId === eventId));
      setOrders((ordersList || []).filter((o) => o.eventId === eventId));
      setRefunds(refundsList || []);
      setSessions((sessionsList || []).filter((s: any) => s.eventId === eventId || s.event?.eventId === eventId));

      const eventScheds = (schedsList || []).filter((s: any) => s.eventId === eventId || s.event?.eventId === eventId);
      if (eventScheds.length > 0) {
        const starts = eventScheds.map((s: any) => new Date(s.startDatetime).getTime()).filter((n) => !isNaN(n));
        const ends = eventScheds.map((s: any) => new Date(s.endDatetime).getTime()).filter((n) => !isNaN(n));
        const overallStart = starts.length > 0 ? new Date(Math.min(...starts)).toISOString() : eventScheds[0].startDatetime;
        const overallEnd = ends.length > 0 ? new Date(Math.max(...ends)).toISOString() : eventScheds[0].endDatetime;
        setSchedule({
          startDatetime: overallStart,
          endDatetime: overallEnd,
          timezone: eventScheds[0].timezone,
        });
      } else {
        setSchedule(null);
      }
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
        sessionIds: [],
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
        showToast(t("adminProject.toast.quantityExceeds", { allowed, max: maxCapacity }));
        return;
      }
    }

    // ── Max Per Order ──
    if (mpo < 1) { showToast(t("adminProject.toast.maxPerOrderMin")); return; }
    if (maxCapacity > 0 && mpo > maxCapacity) {
      showToast(t("adminProject.toast.maxPerOrderExceedsCapacity", { mpo, max: maxCapacity }));
      return;
    }
    if (mpo > qty) {
      showToast(t("adminProject.toast.maxPerOrderExceedsQuantity", { mpo, qty }));
      return;
    }

    // ── Sale dates ──
    if (ticketForm.saleStart) {
      const saleStart = new Date(ticketForm.saleStart);
      if (eventEnd && saleStart >= eventEnd) {
        showToast(t("adminProject.toast.saleStartAfterEvent"));
        return;
      }
      if (ticketForm.saleEnd) {
        const saleEnd = new Date(ticketForm.saleEnd);
        if (saleEnd <= saleStart) { showToast(t("adminProject.toast.saleEndBeforeStart")); return; }
        if (saleEnd.getTime() - saleStart.getTime() < 2 * 3600 * 1000) {
          showToast(t("adminProject.toast.saleWindowTooShort")); return;
        }
        if (eventEnd && saleEnd > eventEnd) {
          showToast(t("adminProject.toast.saleEndAfterEvent"));
          return;
        }
      }
    } else if (ticketForm.saleEnd) {
      const saleEnd = new Date(ticketForm.saleEnd);
      if (eventEnd && saleEnd > eventEnd) {
        showToast(t("adminProject.toast.saleEndAfterEvent"));
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
        sessionIds: ticketForm.sessionIds,
      };

      if (editingTicket) {
        await eventService.updateTicketType(editingTicket.ticketId || editingTicket.id, payload);
        setEditingTicket(null);
        showToast(t("adminProject.toast.ticketUpdated"));
      } else {
        await eventService.createTicketType(payload);
        showToast(t("adminProject.toast.ticketAdded"));
      }

      setTicketForm({
        name: "",
        description: "",
        price: 0,
        quantityAvailable: 100,
        saleStart: toLocalISOString(new Date()),
        saleEnd: toLocalISOString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        maxPerOrder: 5,
        sessionIds: [],
      });
      await fetchEventDetails(selectedEventId);
    } catch (err) {
      console.error(err);
      showToast(t("adminProject.toast.ticketSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTicket = async (id: string) => {
    if (!confirm(t("adminProject.tickets.confirmDelete"))) return;
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
          sessionIds: [],
        });
      }
      await fetchEventDetails(selectedEventId);
      showToast(t("adminProject.toast.ticketDeleted"));
    } catch (err) {
      console.error(err);
      showToast(t("adminProject.toast.ticketDeleteFailed"));
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
        showToast(t("adminProject.toast.couponUpdated"));
      } else {
        await eventService.createCoupon(payload);
        showToast(t("adminProject.toast.couponAdded"));
      }

      setCouponForm({ code: "", type: "PERCENTAGE", value: 10, maxUses: 100 });
      await fetchEventDetails(selectedEventId);
    } catch (err) {
      console.error(err);
      showToast(t("adminProject.toast.couponSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm(t("adminProject.coupons.confirmDelete"))) return;
    try {
      await eventService.deleteCoupon(id);
      if (editingCoupon?.couponId === id || editingCoupon?.id === id) {
        setEditingCoupon(null);
        setCouponForm({ code: "", type: "PERCENTAGE", value: 10, maxUses: 100 });
      }
      await fetchEventDetails(selectedEventId);
      showToast(t("adminProject.toast.couponDeleted"));
    } catch (err) {
      console.error(err);
      showToast(t("adminProject.toast.couponDeleteFailed"));
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
          <h1 className="font-display text-xl font-bold text-[#EB4203]">{t("adminProject.header.title")}</h1>
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
                <Ticket size={18} className="text-[#EB4203]" /> {t("adminProject.tickets.title")} <span className="text-xs font-normal text-[#666] ml-2 mt-1">{t("adminProject.tickets.forEvent", { eventTitle: activeEvent?.title || t("adminProject.tickets.forSelectedEvent") })}</span>
              </h2>
              <form ref={ticketFormRef} onSubmit={handleSaveTicket} className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>{t("adminProject.tickets.nameLabel")}</label>
                    <input
                      placeholder={t("adminProject.tickets.namePlaceholder")}
                      value={ticketForm.name}
                      onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                      className={inp}
                      required
                    />
                  </div>
                  <div>
                    <label className={label}>{t("adminProject.tickets.priceLabel")}</label>
                    <input
                      type="number"
                      placeholder={t("adminProject.tickets.pricePlaceholder")}
                      value={ticketForm.price || ""}
                      onChange={(e) => setTicketForm({ ...ticketForm, price: Number(e.target.value) })}
                      className={inp}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>{t("adminProject.tickets.descriptionLabel")}</label>
                    <input
                      placeholder={t("adminProject.tickets.descriptionPlaceholder")}
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                      className={inp}
                    />
                  </div>
                  <div>
                    <label className={label}>{t("adminProject.tickets.capacityLabel")}</label>
                    <input
                      type="number"
                      placeholder={t("adminProject.tickets.capacityPlaceholder")}
                      min={1}
                      max={maxCapacity > 0 ? maxCapacity - allocatedTicketQty + (editingTicket ? (editingTicket.quantityAvailable ?? 0) : 0) : undefined}
                      value={ticketForm.quantityAvailable || ""}
                      onChange={(e) => setTicketForm({ ...ticketForm, quantityAvailable: Number(e.target.value) })}
                      className={inp}
                      required
                    />
                    {maxCapacity > 0 && (
                      <p className="text-[10px] mt-1 text-[#888]">
                        {t("adminProject.tickets.slotsAvailable", { count: maxCapacity - allocatedTicketQty + (editingTicket ? (editingTicket.quantityAvailable ?? 0) : 0), max: maxCapacity })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>{t("adminProject.tickets.saleStartLabel")}</label>
                    <input
                      type="datetime-local"
                      value={ticketForm.saleStart}
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
                    <label className={label}>{t("adminProject.tickets.saleEndLabel")}</label>
                    <input
                      type="datetime-local"
                      value={ticketForm.saleEnd}
                      max={schedule?.endDatetime ? toLocalISOString(schedule.endDatetime) : undefined}
                      onChange={(e) => setTicketForm({ ...ticketForm, saleEnd: e.target.value })}
                      className={inp}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>{t("adminProject.tickets.maxPerOrderLabel")}</label>
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
                    <p className="text-[10px] mt-1 text-[#888]">{t("adminProject.tickets.maxPerOrderHelp")}</p>
                  </div>
                </div>
                {sessions.length > 0 && (
                  <div>
                    <label className={label}>{t("adminProject.tickets.sessionScopeLabel")}</label>
                    <p className="text-[10px] text-[#888] mb-2">Select which sessions this ticket can be used to check in. Leave empty for all sessions (General Admission).</p>
                    <div className="grid grid-cols-2 gap-2 border border-[#e5e7eb] rounded-xl p-3 max-h-40 overflow-y-auto bg-[#fafafa]">
                      {sessions.map((s: any) => {
                        const sId = s.sessionId || s.id;
                        const checked = (ticketForm.sessionIds || []).includes(sId);
                        return (
                          <label key={sId} className="flex items-center gap-2 text-xs font-semibold text-[#555] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setTicketForm(f => {
                                  const currentIds = f.sessionIds || [];
                                  const nextIds = currentIds.includes(sId)
                                    ? currentIds.filter(id => id !== sId)
                                    : [...currentIds, sId];
                                  return { ...f, sessionIds: nextIds };
                                });
                              }}
                              className="rounded text-[#FF4747] focus:ring-[#FF4747]"
                            />
                            <span className="truncate">{s.title}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className={saveBtn}
                  >
                    <Save size={13} /> {editingTicket ? (saving ? t("adminProject.tickets.saving") : t("adminProject.tickets.saveChanges")) : (saving ? t("adminProject.tickets.adding") : t("adminProject.tickets.addButton"))}
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
                          sessionIds: [],
                        });
                      }}
                      className="px-4 py-2.5 bg-stone-100 text-[#555] hover:bg-stone-200 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      {t("adminProject.tickets.cancelEdit")}
                    </button>
                  )}
                </div>
              </form>

              {/* LIST */}
              <div className="space-y-3">
                {ticketTypes.map((tk, idx) => {
                  const id = tk.ticketId || tk.id;
                  return (
                    <div key={`${id || idx}-${idx}`} className={`flex justify-between items-center p-3.5 bg-white border rounded-xl hover:border-[#FF4747]/20 transition-all ${editingTicket?.ticketId === id ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-[#1a1a1a] truncate">{tk.name}</div>
                        <div className="text-[10px] text-[#555] mt-0.5 truncate">{tk.description || t("adminProject.tickets.noDescription")}</div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-4">
                        <div>
                          <div className="text-xs font-bold text-[#EB4203]">{Number(tk.price).toLocaleString()} FCFA</div>
                          <div className="text-[9px] text-[#555] mt-0.5">{t("adminProject.tickets.sold", { sold: tk.quantitySold || 0, available: tk.quantityAvailable })}</div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => {
                            setEditingTicket(tk);
                            setTicketForm({
                              name: tk.name || "",
                              description: tk.description || "",
                              price: tk.price || 0,
                              quantityAvailable: tk.quantityAvailable || 100,
                              saleStart: tk.saleStart ? toLocalISOString(tk.saleStart) : toLocalISOString(new Date()),
                              saleEnd: tk.saleEnd ? toLocalISOString(tk.saleEnd) : toLocalISOString(new Date()),
                              maxPerOrder: tk.maxPerOrder || 5,
                              sessionIds: tk.sessionIds || [],
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
                  <div className="text-center text-xs text-[#888] py-8 border border-dashed border-[#e5e7eb] rounded-2xl bg-white">{t("adminProject.tickets.empty")}</div>
                )}
              </div>
            </div>

            {/* COUPONS */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
              <h2 className="font-display font-bold text-[#EB4203] mb-5 flex items-center gap-2">
                <Tag size={18} className="text-[#EB4203]" /> {t("adminProject.coupons.title")} <span className="text-xs font-normal text-[#666] ml-2 mt-1">{t("adminProject.coupons.forEvent", { eventTitle: activeEvent?.title || t("adminProject.coupons.forSelectedEvent") })}</span>
              </h2>
              <form ref={couponFormRef} onSubmit={handleSaveCoupon} className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>{t("adminProject.coupons.codeLabel")}</label>
                    <input
                      placeholder={t("adminProject.coupons.codePlaceholder")}
                      value={couponForm.code}
                      onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                      className={inp}
                      required
                    />
                  </div>
                  <div>
                    <label className={label}>{t("adminProject.coupons.typeLabel")}</label>
                    <select
                      value={couponForm.type}
                      onChange={(e) => setCouponForm({ ...couponForm, type: e.target.value })}
                      className={inp}
                    >
                      <option value="PERCENTAGE">{t("adminProject.coupons.typePercentage")}</option>
                      <option value="FIXED">{t("adminProject.coupons.typeFixed")}</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={label}>{t("adminProject.coupons.valueLabel")}</label>
                    <input
                      type="number"
                      placeholder={t("adminProject.coupons.valuePlaceholder")}
                      value={couponForm.value || ""}
                      onChange={(e) => setCouponForm({ ...couponForm, value: Number(e.target.value) })}
                      className={inp}
                      required
                    />
                  </div>
                  <div>
                    <label className={label}>{t("adminProject.coupons.maxUsesLabel")}</label>
                    <input
                      type="number"
                      placeholder={t("adminProject.coupons.maxUsesPlaceholder")}
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
                    <Save size={13} /> {editingCoupon ? (saving ? t("adminProject.coupons.saving") : t("adminProject.coupons.saveChanges")) : (saving ? t("adminProject.coupons.adding") : t("adminProject.coupons.addButton"))}
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
                      {t("adminProject.coupons.cancelEdit")}
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
                        <div className="text-[10px] text-[#555] mt-0.5">{t("adminProject.coupons.expiresIn")}</div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-4">
                        <div>
                          <div className="text-xs font-bold text-orange-500">
                            {c.type === "PERCENTAGE" ? t("adminProject.coupons.percentOff", { value: c.value }) : t("adminProject.coupons.amountOff", { value: Number(c.value).toLocaleString() })}
                          </div>
                          <div className="text-[9px] text-[#555] mt-0.5">{t("adminProject.coupons.uses", { used: c.usedCount || 0, max: c.maxUses })}</div>
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
                  <div className="text-center text-xs text-[#888] py-8 border border-dashed border-[#e5e7eb] rounded-2xl bg-white">{t("adminProject.coupons.empty")}</div>
                )}
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
  );
}
