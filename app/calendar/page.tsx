"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { api, getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

type CalEvent = { title: string; time: string; cls: string };
type EventMap = Record<string, CalEvent[]>;

const INITIAL_EVENTS: EventMap = {
  "2026-06-05": [{ title: "Sponsor Meeting", time: "13:00", cls: "bg-green-900/40 text-green-300 border-l-2 border-green-500" }],
  "2026-06-10": [{ title: "Speaker Briefing", time: "11:00", cls: "bg-[#EB4203]/10 text-[#EB4203] border-l-2 border-[#EB4203]" }],
  "2026-06-14": [
    { title: "Tech Summit 2026", time: "09:00", cls: "bg-blue-900/40 text-blue-300 border-l-2 border-blue-500" },
    { title: "Keynote Session", time: "10:00", cls: "bg-blue-900/30 text-blue-400 border-l-2 border-blue-600" },
  ],
  "2026-06-15": [{ title: "Tech Summit Day 2", time: "09:00", cls: "bg-blue-900/40 text-blue-300 border-l-2 border-blue-500" }],
  "2026-06-18": [{ title: "UX Design Workshop", time: "14:00", cls: "bg-green-900/40 text-green-300 border-l-2 border-green-500" }],
  "2026-06-22": [{ title: "Product Launch Webinar", time: "11:00", cls: "bg-amber-900/40 text-amber-300 border-l-2 border-amber-500" }],
  "2026-06-23": [{ title: "Today — Planning", time: "10:00", cls: "bg-[#EB4203]/10 text-[#EB4203] border-l-2 border-[#EB4203]" }],
  "2026-06-25": [{ title: "Team Planning Session", time: "10:00", cls: "bg-[#EB4203]/10 text-[#EB4203] border-l-2 border-[#EB4203]" }],
  "2026-06-30": [
    { title: "Monthly Review", time: "15:00", cls: "bg-amber-900/40 text-amber-300 border-l-2 border-amber-500" },
    { title: "Budget Call", time: "17:00", cls: "bg-red-900/40 text-red-300 border-l-2 border-red-500" },
  ],
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const CAT_CLS: Record<string, string> = {
  Conference: "bg-blue-900/40 text-blue-300 border-l-2 border-blue-500",
  Workshop: "bg-green-900/40 text-green-300 border-l-2 border-green-500",
  Webinar: "bg-amber-900/40 text-amber-300 border-l-2 border-amber-500",
  Internal: "bg-[#EB4203]/10 text-[#EB4203] border-l-2 border-[#EB4203]",
  Other: "bg-red-900/40 text-red-300 border-l-2 border-red-500",
};

const TODAY = new Date();

export default function CalendarPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5); // June
  const [events, setEvents] = useState<EventMap>(INITIAL_EVENTS);
  const [dbEvents, setDbEvents] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState(false);
  const [form, setForm] = useState({ title: "", start: "2026-06-23", startTime: "09:00", endTime: "17:00", category: "Conference", desc: "" });

  const prev = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const next = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };
  const goToday = () => { setYear(TODAY.getFullYear()); setMonth(TODAY.getMonth()); };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const dateStr = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const isToday = (d: number) => TODAY.getFullYear() === year && TODAY.getMonth() === month && TODAY.getDate() === d;

  const fetchCalendarData = () => {
    const auth = getStoredAuth();
    if (!auth) return;

    Promise.all([
      eventService.getMyEvents(),
      api.get<any[]>(`/api/v1/eventschedules`),
      api.get<any[]>(`/api/v1/eventcategorys`)
    ]).then(([eventsData, schedulesData, categoriesData]) => {
      setDbEvents(eventsData || []);
      setSchedules(schedulesData || []);
      setCategories(categoriesData || []);

      const newEventMap: EventMap = {};
      Object.keys(INITIAL_EVENTS).forEach(k => {
        newEventMap[k] = [...INITIAL_EVENTS[k]];
      });

      eventsData?.forEach((ev: any) => {
        const sched = schedulesData?.find((s: any) => s.eventId === ev.eventId);
        if (sched && sched.startDatetime) {
          const parts = sched.startDatetime.split("T");
          const dStr = parts[0];
          const timeStr = parts[1] ? parts[1].substring(0, 5) : "00:00";

          const categoryObj = categoriesData?.find((c: any) => c.categoryId === ev.categoryId);
          const catName = categoryObj?.name || "Conference";
          const cls = CAT_CLS[catName] || CAT_CLS["Conference"];

          if (!newEventMap[dStr]) {
            newEventMap[dStr] = [];
          }

          if (!newEventMap[dStr].some(e => e.title === ev.title && e.time === timeStr)) {
            newEventMap[dStr].push({
              title: ev.title,
              time: timeStr,
              cls: cls
            });
          }
        }
      });

      setEvents(newEventMap);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    const auth = getStoredAuth();
    if (!auth) return;

    try {
      let catId = "";
      const existingCat = categories.find(c => c.name.toLowerCase() === form.category.toLowerCase());
      if (existingCat) {
        catId = existingCat.categoryId;
      } else {
        const newCat = await api.post<any>("/api/v1/eventcategorys", {
          tenantId: auth.tenantId,
          name: form.category,
          icon: "🎟"
        });
        catId = newCat.categoryId;
      }

      const newEvent = await api.post<any>("/api/v1/events", {
        tenantId: auth.tenantId,
        organizerId: auth.userId,
        eventTypeId: null,
        categoryId: catId,
        title: form.title,
        description: form.desc,
        format: "Conference",
        status: "Start",
        visibility: "Public",
        maxCapacity: 100,
        isPaid: false,
        currency: "XAF"
      });

      await api.post("/api/v1/eventschedules", {
        eventId: newEvent.eventId,
        startDatetime: `${form.start}T${form.startTime}:00`,
        endDatetime: `${form.start}T${form.endTime}:00`,
        timezone: "UTC"
      });

      setModal(false);
      setForm(f => ({ ...f, title: "", desc: "" }));
      setToast(true);
      setTimeout(() => setToast(false), 2500);

      fetchCalendarData();
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  };

  // Build grid cells
  const cells: { day: number; current: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  const rem = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let i = 1; i <= rem; i++) cells.push({ day: i, current: false });

  const upcoming = dbEvents.length > 0
    ? dbEvents.slice(0, 4).map(ev => {
        const sched = schedules.find((s: any) => s.eventId === ev.eventId);
        let dateStr = "TBD";
        if (sched && sched.startDatetime) {
          const parts = sched.startDatetime.split("T");
          const dateParts = parts[0].split("-");
          const monthName = MONTHS[parseInt(dateParts[1]) - 1]?.substring(0, 3);
          const dayNum = dateParts[2];
          const startTime = parts[1] ? parts[1].substring(0, 5) : "00:00";
          const endTimeParts = sched.endDatetime ? sched.endDatetime.split("T")[1] : null;
          const endTime = endTimeParts ? endTimeParts.substring(0, 5) : "";
          dateStr = `${monthName} ${dayNum} · ${startTime}${endTime ? `–${endTime}` : ""}`;
        }

        const categoryObj = categories.find((c: any) => c.categoryId === ev.categoryId);
        const catName = categoryObj?.name || "Conference";
        const bdg = CAT_CLS[catName] || CAT_CLS["Conference"];
        
        let color = "bg-blue-500";
        if (catName === "Workshop") color = "bg-green-500";
        else if (catName === "Webinar") color = "bg-amber-500";
        else if (catName === "Internal") color = "bg-[#EB4203]";
        else if (catName === "Other") color = "bg-red-500";

        return {
          title: ev.title,
          date: dateStr,
          badge: catName,
          color: color,
          bdg: bdg
        };
      })
    : [
        { title: "Tech Summit 2026", date: "Jun 14 · 09:00–18:00", badge: "Live", color: "bg-blue-500", bdg: "bg-blue-900/40 text-blue-300" },
        { title: "UX Design Workshop", date: "Jun 18 · 14:00–17:00", badge: "Upcoming", color: "bg-green-500", bdg: "bg-green-900/40 text-green-300" },
        { title: "Product Launch Webinar", date: "Jun 22 · 11:00–12:30", badge: "Upcoming", color: "bg-amber-500", bdg: "bg-amber-900/40 text-amber-300" },
        { title: "Team Planning Session", date: "Jun 25 · 10:00–11:00", badge: "Internal", color: "bg-[#EB4203]", bdg: "bg-[#EB4203]/10 text-[#EB4203]" },
      ];

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* TOPBAR */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">Calendar</h1>
          <div className="flex items-center gap-3">
            <div className="flex border border-[#e5e7eb] rounded-lg overflow-hidden">
              {["Month","Week","Day"].map((v) => (
                <button key={v} className={`px-3.5 py-1.5 text-xs transition-all cursor-pointer ${v === "Month" ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:text-[#1a1a1a] bg-transparent"}`}>{v}</button>
              ))}
            </div>
            <button className="px-3.5 py-1.5 text-xs border border-[#e5e7eb] rounded-lg text-[#555] hover:bg-white transition-colors cursor-pointer">📥 Import</button>
            <button onClick={() => setModal(true)} className="flex items-center gap-1.5 px-4 py-1.5 bg-[#EB4203] text-white text-xs font-semibold rounded-lg hover:bg-[#c23b02] transition-colors cursor-pointer">
              <Plus size={14}/> New Event
            </button>
          </div>
        </header>

        <div className="flex flex-1">
          {/* CALENDAR */}
          <div className="flex-1 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <button onClick={prev} className="w-8 h-8 border border-[#e5e7eb] rounded-lg flex items-center justify-center hover:bg-[#1a1a1a] hover:border-[#555] transition-all cursor-pointer"><ChevronLeft size={16}/></button>
                <h2 className="font-display text-xl font-bold text-[#EB4203]">{MONTHS[month]} {year}</h2>
                <button onClick={next} className="w-8 h-8 border border-[#e5e7eb] rounded-lg flex items-center justify-center hover:bg-[#1a1a1a] hover:border-[#555] transition-all cursor-pointer"><ChevronRight size={16}/></button>
                <button onClick={goToday} className="px-3 py-1 text-xs border border-[#e5e7eb] rounded-full text-[#555] hover:bg-[#1a1a1a] transition-all cursor-pointer">Today</button>
              </div>
              <div className="flex gap-4">
                {[["#1565c0","Conference"],["#2e7d32","Workshop"],["#f57c00","Webinar"],["#EB4203","Internal"]].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1.5 text-xs text-[#555]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }}/>
                    {l}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-7 bg-[#181818] border-b border-[#e5e7eb]">
                {DAYS.map(d => <div key={d} className="py-3 text-center text-[10px] font-medium text-[#555] uppercase tracking-widest">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {cells.map(({ day, current }, i) => {
                  const ds = current ? dateStr(day) : "";
                  const evs = (ds && events[ds]) || [];
                  const today = current && isToday(day);
                  return (
                    <div key={i} className={`min-h-[100px] p-2 border-r border-b border-[#e5e7eb] last:border-r-0 transition-colors ${!current ? "opacity-30" : ""} ${today ? "bg-[#EB4203]/5" : "hover:bg-white"}`}>
                      <div className={`w-6 h-6 flex items-center justify-center text-xs font-medium mb-1.5 rounded-full ${today ? "bg-[#EB4203] text-[#1a1a1a] font-bold" : "text-[#555]"}`}>{day}</div>
                      {evs.slice(0, 2).map((ev, j) => (
                        <div key={j} className={`text-[10px] font-medium rounded px-1.5 py-0.5 mb-0.5 truncate cursor-pointer hover:brightness-110 transition-all ${ev.cls}`}>{ev.time} {ev.title}</div>
                      ))}
                      {evs.length > 2 && <div className="text-[10px] text-[#555] cursor-pointer hover:text-[#999]">+{evs.length - 2} more</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SIDE PANEL */}
          <aside className="w-72 bg-white border-l border-[#e5e7eb] p-5 flex flex-col gap-6">
            <div>
              <h3 className="font-display font-bold text-[#EB4203] mb-4">📅 {MONTHS[month]} {year}</h3>
              {/* Mini calendar */}
              <div className="bg-white rounded-xl p-3 mb-5">
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {["S","M","T","W","T","F","S"].map((d,i) => <div key={i} className="text-center text-[9px] text-[#555] py-1">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: firstDay }, (_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: daysInMonth }, (_, i) => {
                    const d = i + 1;
                    const ds = dateStr(d);
                    const today = isToday(d);
                    return (
                      <div key={d} className={`text-center text-xs py-1 rounded-full cursor-pointer transition-all ${today ? "bg-[#EB4203] text-[#1a1a1a] font-bold" : events[ds] ? "text-[#1a1a1a] font-medium hover:bg-[#333]" : "text-[#555] hover:bg-[#2a2a2a]"}`}>{d}</div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-medium text-[#555] uppercase tracking-widest mb-4">Upcoming Events</h3>
              <div className="space-y-4">
                {upcoming.map((ev) => (
                  <div key={ev.title} className="flex gap-3 pb-4 border-b border-[#e5e7eb] last:border-0">
                    <div className={`w-1 rounded-full flex-shrink-0 min-h-[40px] ${ev.color}`}/>
                    <div>
                      <div className="text-xs font-semibold text-[#1a1a1a] mb-0.5">{ev.title}</div>
                      <div className="text-[10px] text-[#555] mb-1.5">{ev.date}</div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ev.bdg}`}>{ev.badge}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setModal(false)}>
          <div className="bg-white border border-[#e5e7eb] rounded-2xl w-[480px] max-w-full p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold text-[#EB4203]">New Event</h3>
              <button onClick={() => setModal(false)} className="text-[#555] hover:text-white transition-colors cursor-pointer"><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Event Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Annual Conference 2026"
                  className="w-full px-4 py-2.5 bg-white border border-[#e5e7eb] rounded-xl text-sm text-white placeholder:text-[#555] outline-none focus:border-[#F7E998]/50 transition-colors"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Start Date</label>
                  <input type="date" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white border border-[#e5e7eb] rounded-xl text-sm text-white outline-none focus:border-[#F7E998]/50 transition-colors"/>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white border border-[#e5e7eb] rounded-xl text-sm text-white outline-none focus:border-[#F7E998]/50 transition-colors">
                    {["Conference","Workshop","Webinar","Internal","Other"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Start Time</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white border border-[#e5e7eb] rounded-xl text-sm text-white outline-none focus:border-[#F7E998]/50 transition-colors"/>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">End Time</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white border border-[#e5e7eb] rounded-xl text-sm text-white outline-none focus:border-[#F7E998]/50 transition-colors"/>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} rows={3} placeholder="Brief description…"
                  className="w-full px-4 py-2.5 bg-white border border-[#e5e7eb] rounded-xl text-sm text-white placeholder:text-[#555] outline-none focus:border-[#F7E998]/50 transition-colors resize-none"/>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setModal(false)} className="px-5 py-2.5 text-sm border border-[#e5e7eb] rounded-full text-[#555] hover:bg-white transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleCreate} className="px-5 py-2.5 text-sm bg-[#EB4203] text-white rounded-full font-semibold hover:bg-[#c23b02] transition-colors cursor-pointer">Create Event</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#e5e7eb] text-white text-sm px-6 py-3 rounded-full shadow-2xl transition-all duration-300 z-50 ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        ✅ Event created successfully!
      </div>
    </div>
  );
}
