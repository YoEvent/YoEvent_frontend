"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { List, Search, Mail, Check, Trash2, RefreshCw, Calendar, Users, Filter, ArrowUpRight, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { useLanguage } from "@/app/context/LanguageContext";

export default function WaitlistPage() {
  const { t } = useLanguage();
  const auth = getStoredAuth();

  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");
  const [waitlistEntries, setWaitlistEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [actionId, setActionId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = async () => {
    if (!auth) return;
    setLoading(true);
    try {
      const evs = await eventService.getMyEvents().catch(() => []);
      const myEvents = (evs || []).filter((e: any) => !auth.tenantId || !e.tenantId || e.tenantId === auth.tenantId);
      setEvents(myEvents);

      let allEntries: any[] = [];
      if (selectedEventId === "ALL") {
        const fetchPromises = myEvents.map((e: any) =>
          eventService.getWaitlistByEvent(e.eventId || e.id).catch(() => [])
        );
        const results = await Promise.all(fetchPromises);
        allEntries = results.flat();
      } else {
        allEntries = await eventService.getWaitlistByEvent(selectedEventId).catch(() => []);
      }

      setWaitlistEntries(allEntries.sort((a, b) => (a.position || 0) - (b.position || 0)));
    } catch (err: any) {
      console.error("Error loading waitlist:", err);
      showToast(err.message || "Failed to load waitlist data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedEventId]);

  const handleNotify = async (id: string) => {
    setActionId(id);
    try {
      await eventService.notifyWaitlistEntry(id);
      showToast("Notification email sent to attendee");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to notify waitlist entry", "error");
    } finally {
      setActionId(null);
    }
  };

  const handleConvert = async (id: string) => {
    setActionId(id);
    try {
      await eventService.convertWaitlistEntry(id);
      showToast("Waitlist entry converted to active registration");
      await loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to convert entry", "error");
    } finally {
      setActionId(null);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm("Are you sure you want to remove this person from the waitlist?")) return;
    setActionId(id);
    try {
      await eventService.deleteWaitlistEntry(id);
      setWaitlistEntries(prev => prev.filter(w => (w.waitlistId || w.id) !== id));
      showToast("Waitlist entry removed");
    } catch (err: any) {
      showToast(err.message || "Failed to remove entry", "error");
    } finally {
      setActionId(null);
    }
  };

  const filteredEntries = waitlistEntries.filter(w => {
    const matchesSearch =
      !searchQuery ||
      (w.name && w.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (w.email && w.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (w.eventTitle && w.eventTitle.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || (w.status || "WAITING") === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const waitingCount = waitlistEntries.filter(w => (w.status || "WAITING") === "WAITING").length;
  const notifiedCount = waitlistEntries.filter(w => w.status === "NOTIFIED").length;
  const convertedCount = waitlistEntries.filter(w => w.status === "CONVERTED").length;

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col min-w-0">
        
        {/* HEADER */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <List size={20} className="text-[#FF4747]" />
            <h1 className="font-display text-xl font-bold text-[#1a1a1a]">Waitlist Operations</h1>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#1a1a1a] text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </header>

        <main className="p-8 max-w-[1400px] w-full space-y-6">

          {/* Toast Notification */}
          {toast && (
            <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce ${
              toast.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
            }`}>
              {toast.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {toast.text}
            </div>
          )}

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-1">Waiting List</p>
                <h3 className="text-2xl font-black text-[#1a1a1a]">{waitingCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <Clock size={22} />
              </div>
            </div>

            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-1">Notified Attendees</p>
                <h3 className="text-2xl font-black text-blue-600">{notifiedCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Mail size={22} />
              </div>
            </div>

            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-[#888] uppercase tracking-wider mb-1">Converted Registrations</p>
                <h3 className="text-2xl font-black text-emerald-600">{convertedCount}</h3>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={22} />
              </div>
            </div>
          </div>

          {/* CONTROLS / FILTERS BAR */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Search */}
            <div className="relative flex-1 w-full">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
              <input
                type="text"
                placeholder="Search by name, email, or event title..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl pl-10 pr-4 py-2 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#FF4747] transition-colors"
              />
            </div>

            {/* Event Filter */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-[#888]" />
                <select
                  value={selectedEventId}
                  onChange={e => setSelectedEventId(e.target.value)}
                  className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                >
                  <option value="ALL">All Events ({events.length})</option>
                  {events.map((e: any) => (
                    <option key={e.eventId || e.id} value={e.eventId || e.id}>
                      {e.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center bg-[#f9fafb] p-1 border border-[#e5e7eb] rounded-xl">
                {["ALL", "WAITING", "NOTIFIED", "CONVERTED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer ${
                      statusFilter === st ? "bg-[#FF4747] text-white" : "text-[#666] hover:text-[#1a1a1a]"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#888] space-y-3">
                <div className="w-8 h-8 border-4 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin" />
                <p className="text-xs font-semibold">Loading waitlist entries...</p>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-16 text-center text-[#888] space-y-3">
                <div className="w-14 h-14 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-center mx-auto text-[#ccc]">
                  <List size={28} />
                </div>
                <h4 className="font-bold text-sm text-[#1a1a1a]">No Waitlist Entries Found</h4>
                <p className="text-xs max-w-sm mx-auto text-[#888]">
                  {searchQuery || statusFilter !== "ALL"
                    ? "No entries match your search filters."
                    : "When a ticket tier reaches full capacity, attendees who join the waitlist will appear here."}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f9fafb] border-b border-[#e5e7eb] text-[10px] font-bold text-[#888] uppercase tracking-wider">
                      <th className="py-3.5 px-6">Pos #</th>
                      <th className="py-3.5 px-6">Attendee</th>
                      <th className="py-3.5 px-6">Event</th>
                      <th className="py-3.5 px-6">Status</th>
                      <th className="py-3.5 px-6">Joined Date</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e7eb]">
                    {filteredEntries.map((w: any) => {
                      const id = w.waitlistId || w.id;
                      const status = w.status || "WAITING";
                      const eventObj = events.find(e => (e.eventId || e.id) === w.eventId);

                      const statusBadge: Record<string, { bg: string; text: string; label: string }> = {
                        WAITING: { bg: "bg-amber-50 text-amber-700 border-amber-200", text: "text-amber-700", label: "Waiting" },
                        NOTIFIED: { bg: "bg-blue-50 text-blue-700 border-blue-200", text: "text-blue-700", label: "Notified" },
                        CONVERTED: { bg: "bg-emerald-50 text-emerald-700 border-emerald-200", text: "text-emerald-700", label: "Converted" },
                      };
                      const badge = statusBadge[status] || statusBadge.WAITING;

                      return (
                        <tr key={id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-6 font-mono font-bold text-[#1a1a1a]">
                            #{w.position || 1}
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-bold text-[#1a1a1a]">{w.name || "Anonymous Attendee"}</div>
                            <div className="text-[11px] text-[#888]">{w.email}</div>
                          </td>
                          <td className="py-4 px-6">
                            <div className="font-semibold text-[#1a1a1a] max-w-[200px] truncate">
                              {w.eventTitle || eventObj?.title || "Event #" + (w.eventId?.slice(0, 8) || "")}
                            </div>
                            {w.ticketTypeName && (
                              <span className="text-[10px] text-[#888] font-medium">
                                Tier: {w.ticketTypeName}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg}`}>
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-[#666]">
                            {w.createdAt ? new Date(w.createdAt).toLocaleDateString() : "Recently"}
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {status === "WAITING" && (
                                <button
                                  type="button"
                                  onClick={() => handleNotify(id)}
                                  disabled={actionId === id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                                  title="Send notification email"
                                >
                                  <Mail size={12} /> Notify
                                </button>
                              )}

                              {status !== "CONVERTED" && (
                                <button
                                  type="button"
                                  onClick={() => handleConvert(id)}
                                  disabled={actionId === id}
                                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-sm"
                                  title="Convert to registration"
                                >
                                  <Check size={12} /> Convert
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemove(id)}
                                disabled={actionId === id}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                title="Remove entry"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}
