"use client";
import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";

type CalEvent = { title: string; time: string; cls: string };
type EventMap = Record<string, CalEvent[]>;

const INITIAL_EVENTS: EventMap = {
  "2026-06-05": [{ title: "Sponsor Meeting", time: "13:00", cls: "bg-green-900/40 text-green-300 border-l-2 border-green-500" }],
  "2026-06-10": [{ title: "Speaker Briefing", time: "11:00", cls: "bg-[#d4c9a8]/15 text-[#d4c9a8] border-l-2 border-[#8a7d5a]" }],
  "2026-06-14": [
    { title: "Tech Summit 2026", time: "09:00", cls: "bg-blue-900/40 text-blue-300 border-l-2 border-blue-500" },
    { title: "Keynote Session", time: "10:00", cls: "bg-blue-900/30 text-blue-400 border-l-2 border-blue-600" },
  ],
  "2026-06-15": [{ title: "Tech Summit Day 2", time: "09:00", cls: "bg-blue-900/40 text-blue-300 border-l-2 border-blue-500" }],
  "2026-06-18": [{ title: "UX Design Workshop", time: "14:00", cls: "bg-green-900/40 text-green-300 border-l-2 border-green-500" }],
  "2026-06-22": [{ title: "Product Launch Webinar", time: "11:00", cls: "bg-amber-900/40 text-amber-300 border-l-2 border-amber-500" }],
  "2026-06-23": [{ title: "Today — Planning", time: "10:00", cls: "bg-[#d4c9a8]/15 text-[#d4c9a8] border-l-2 border-[#8a7d5a]" }],
  "2026-06-25": [{ title: "Team Planning Session", time: "10:00", cls: "bg-[#d4c9a8]/15 text-[#d4c9a8] border-l-2 border-[#8a7d5a]" }],
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
  Internal: "bg-[#d4c9a8]/15 text-[#d4c9a8] border-l-2 border-[#8a7d5a]",
  Other: "bg-red-900/40 text-red-300 border-l-2 border-red-500",
};

const TODAY = new Date();

export default function CalendarPage() {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(5); // June
  const [events, setEvents] = useState<EventMap>(INITIAL_EVENTS);
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

  const handleCreate = () => {
    if (!form.title.trim()) return;
    setEvents(prev => ({
      ...prev,
      [form.start]: [...(prev[form.start] || []), { title: form.title, time: form.startTime, cls: CAT_CLS[form.category] }],
    }));
    setModal(false);
    setForm(f => ({ ...f, title: "", desc: "" }));
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  // Build grid cells
  const cells: { day: number; current: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  const rem = cells.length % 7 === 0 ? 0 : 7 - (cells.length % 7);
  for (let i = 1; i <= rem; i++) cells.push({ day: i, current: false });

  const upcoming = [
    { title: "Tech Summit 2026", date: "Jun 14 · 09:00–18:00", badge: "Live", color: "bg-blue-500", bdg: "bg-blue-900/40 text-blue-300" },
    { title: "UX Design Workshop", date: "Jun 18 · 14:00–17:00", badge: "Upcoming", color: "bg-green-500", bdg: "bg-green-900/40 text-green-300" },
    { title: "Product Launch Webinar", date: "Jun 22 · 11:00–12:30", badge: "Upcoming", color: "bg-amber-500", bdg: "bg-amber-900/40 text-amber-300" },
    { title: "Team Planning Session", date: "Jun 25 · 10:00–11:00", badge: "Internal", color: "bg-[#8a7d5a]", bdg: "bg-[#d4c9a8]/15 text-[#d4c9a8]" },
  ];

  return (
    <div className="flex bg-[#111] min-h-screen text-[#e0e0e0]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* TOPBAR */}
        <header className="h-[60px] bg-[#161616] border-b border-[#222] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-white">Calendar</h1>
          <div className="flex items-center gap-3">
            <div className="flex border border-[#333] rounded-lg overflow-hidden">
              {["Month","Week","Day"].map((v) => (
                <button key={v} className={`px-3.5 py-1.5 text-xs transition-all cursor-pointer ${v === "Month" ? "bg-[#1a1a1a] text-white" : "text-[#666] hover:text-[#ccc] bg-transparent"}`}>{v}</button>
              ))}
            </div>
            <button className="px-3.5 py-1.5 text-xs border border-[#333] rounded-lg text-[#888] hover:bg-[#1e1e1e] transition-colors cursor-pointer">📥 Import</button>
            <button onClick={() => setModal(true)} className="flex items-center gap-1.5 px-4 py-1.5 bg-[#d4c9a8] text-[#1a1a1a] text-xs font-semibold rounded-lg hover:bg-[#c8bb96] transition-colors cursor-pointer">
              <Plus size={14}/> New Event
            </button>
          </div>
        </header>

        <div className="flex flex-1">
          {/* CALENDAR */}
          <div className="flex-1 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <button onClick={prev} className="w-8 h-8 border border-[#333] rounded-lg flex items-center justify-center hover:bg-[#1a1a1a] hover:border-[#555] transition-all cursor-pointer"><ChevronLeft size={16}/></button>
                <h2 className="font-display text-xl font-bold text-white">{MONTHS[month]} {year}</h2>
                <button onClick={next} className="w-8 h-8 border border-[#333] rounded-lg flex items-center justify-center hover:bg-[#1a1a1a] hover:border-[#555] transition-all cursor-pointer"><ChevronRight size={16}/></button>
                <button onClick={goToday} className="px-3 py-1 text-xs border border-[#333] rounded-full text-[#888] hover:bg-[#1a1a1a] transition-all cursor-pointer">Today</button>
              </div>
              <div className="flex gap-4">
                {[["#1565c0","Conference"],["#2e7d32","Workshop"],["#f57c00","Webinar"],["#8a7d5a","Internal"]].map(([c,l]) => (
                  <div key={l} className="flex items-center gap-1.5 text-xs text-[#555]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }}/>
                    {l}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl overflow-hidden">
              <div className="grid grid-cols-7 bg-[#181818] border-b border-[#2a2a2a]">
                {DAYS.map(d => <div key={d} className="py-3 text-center text-[10px] font-medium text-[#555] uppercase tracking-widest">{d}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {cells.map(({ day, current }, i) => {
                  const ds = current ? dateStr(day) : "";
                  const evs = (ds && events[ds]) || [];
                  const today = current && isToday(day);
                  return (
                    <div key={i} className={`min-h-[100px] p-2 border-r border-b border-[#222] last:border-r-0 transition-colors ${!current ? "opacity-30" : ""} ${today ? "bg-[#d4c9a8]/5" : "hover:bg-[#252525]"}`}>
                      <div className={`w-6 h-6 flex items-center justify-center text-xs font-medium mb-1.5 rounded-full ${today ? "bg-[#d4c9a8] text-[#1a1a1a] font-bold" : "text-[#888]"}`}>{day}</div>
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
          <aside className="w-72 bg-[#161616] border-l border-[#222] p-5 flex flex-col gap-6">
            <div>
              <h3 className="font-display font-bold text-white mb-4">📅 {MONTHS[month]} {year}</h3>
              {/* Mini calendar */}
              <div className="bg-[#1e1e1e] rounded-xl p-3 mb-5">
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
                      <div key={d} className={`text-center text-xs py-1 rounded-full cursor-pointer transition-all ${today ? "bg-[#d4c9a8] text-[#1a1a1a] font-bold" : events[ds] ? "text-white font-medium hover:bg-[#333]" : "text-[#555] hover:bg-[#2a2a2a]"}`}>{d}</div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-[10px] font-medium text-[#555] uppercase tracking-widest mb-4">Upcoming Events</h3>
              <div className="space-y-4">
                {upcoming.map((ev) => (
                  <div key={ev.title} className="flex gap-3 pb-4 border-b border-[#222] last:border-0">
                    <div className={`w-1 rounded-full flex-shrink-0 min-h-[40px] ${ev.color}`}/>
                    <div>
                      <div className="text-xs font-semibold text-[#ddd] mb-0.5">{ev.title}</div>
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
          <div className="bg-[#1e1e1e] border border-[#333] rounded-2xl w-[480px] max-w-full p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-xl font-bold text-white">New Event</h3>
              <button onClick={() => setModal(false)} className="text-[#555] hover:text-white transition-colors cursor-pointer"><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Event Title *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Annual Conference 2026"
                  className="w-full px-4 py-2.5 bg-[#252525] border border-[#333] rounded-xl text-sm text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]/50 transition-colors"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Start Date</label>
                  <input type="date" value={form.start} onChange={e => setForm(f => ({ ...f, start: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333] rounded-xl text-sm text-white outline-none focus:border-[#d4c9a8]/50 transition-colors"/>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Category</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333] rounded-xl text-sm text-white outline-none focus:border-[#d4c9a8]/50 transition-colors">
                    {["Conference","Workshop","Webinar","Internal","Other"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Start Time</label>
                  <input type="time" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333] rounded-xl text-sm text-white outline-none focus:border-[#d4c9a8]/50 transition-colors"/>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">End Time</label>
                  <input type="time" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333] rounded-xl text-sm text-white outline-none focus:border-[#d4c9a8]/50 transition-colors"/>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} rows={3} placeholder="Brief description…"
                  className="w-full px-4 py-2.5 bg-[#252525] border border-[#333] rounded-xl text-sm text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]/50 transition-colors resize-none"/>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setModal(false)} className="px-5 py-2.5 text-sm border border-[#333] rounded-full text-[#888] hover:bg-[#252525] transition-colors cursor-pointer">Cancel</button>
                <button onClick={handleCreate} className="px-5 py-2.5 text-sm bg-[#d4c9a8] text-[#1a1a1a] rounded-full font-semibold hover:bg-[#c8bb96] transition-colors cursor-pointer">Create Event</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#333] text-white text-sm px-6 py-3 rounded-full shadow-2xl transition-all duration-300 z-50 ${toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"}`}>
        ✅ Event created successfully!
      </div>
    </div>
  );
}
