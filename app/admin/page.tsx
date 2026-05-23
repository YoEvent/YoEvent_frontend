"use client";
import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { Bell, Mail, User, Search, X } from "lucide-react";

const projects = [
  { name: "Update Home Page Offers", pct: 65, status: "WIP", cls: "bg-[#d4c9a8]/15 text-[#d4c9a8]" },
  { name: "Create a New Company Logo", pct: 100, status: "Complete", cls: "bg-green-500/15 text-green-400" },
  { name: "Traffic Growth Campaign", pct: 42, status: "WIP", cls: "bg-[#d4c9a8]/15 text-[#d4c9a8]" },
  { name: "Mobile App Design", pct: 30, status: "WIP", cls: "bg-[#d4c9a8]/15 text-[#d4c9a8]" },
  { name: "Premium Speed Optimisation", pct: 5, status: "Start", cls: "bg-zinc-700/50 text-zinc-400" },
  { name: "Q3 Analytics Dashboard", pct: 78, status: "WIP", cls: "bg-[#d4c9a8]/15 text-[#d4c9a8]" },
];

const stats = [
  { label: "Performance Score", value: "85%", change: "-1.12%", up: false, icon: "📈", bars: [70, 80, 75, 85, 78, 82, 85] },
  { label: "Security Score", value: "96%", change: "+1.12%", up: true, icon: "🛡", bars: [88, 90, 92, 94, 95, 93, 96] },
  { label: "SEO Score", value: "100%", change: "+1.12%", up: true, icon: "🔍", bars: [95, 97, 98, 99, 100, 100, 100] },
];

function Sparkline({ bars }: { bars: number[] }) {
  const max = Math.max(...bars);
  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((v, i) => (
        <div key={i} className="w-1 rounded-sm bg-[#d4c9a8]" style={{ height: `${Math.round((v / max) * 100)}%`, opacity: 0.4 + (v / max) * 0.6 }} />
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [alertVisible, setAlertVisible] = useState(true);

  return (
    <div className="flex bg-[#111] min-h-screen text-[#e0e0e0]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* TOPBAR */}
        <header className="h-[60px] bg-[#161616] border-b border-[#222] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-white">Overview</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#222] border border-[#333] rounded-lg px-3 py-1.5 w-52">
              <Search size={14} className="text-[#555]" />
              <input placeholder="Search…" className="bg-transparent text-sm text-[#ddd] placeholder:text-[#555] outline-none w-full" />
            </div>
            <button className="relative w-8 h-8 bg-[#222] border border-[#333] rounded-lg flex items-center justify-center hover:bg-[#2a2a2a] transition-colors cursor-pointer">
              <Mail size={14} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-400 rounded-full border border-[#161616]" />
            </button>
            <button className="relative w-8 h-8 bg-[#222] border border-[#333] rounded-lg flex items-center justify-center hover:bg-[#2a2a2a] transition-colors cursor-pointer">
              <Bell size={14} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-400 rounded-full border border-[#161616]" />
            </button>
            <button className="w-8 h-8 bg-[#222] border border-[#333] rounded-lg flex items-center justify-center hover:bg-[#2a2a2a] transition-colors cursor-pointer">
              <User size={14} />
            </button>
          </div>
        </header>

        <main className="p-8 space-y-6">
          {/* FLASH CROWD ALERT */}
          {alertVisible && (
            <div className="flex items-center gap-4 bg-orange-500/10 border border-orange-500/30 rounded-xl px-5 py-3.5">
              <span className="text-xl">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-orange-300">Flash Crowd Detected — Tech Summit 2026</p>
                <p className="text-xs text-[#777]">Arrival rate: 340% above baseline · Waitlist activated · ρ = 0.87</p>
              </div>
              <button onClick={() => setAlertVisible(false)} className="text-[#555] hover:text-orange-300 transition-colors cursor-pointer">
                <X size={16} />
              </button>
            </div>
          )}

          {/* STAT CARDS */}
          <div className="grid grid-cols-3 gap-5">
            {stats.map((s) => (
              <div key={s.label} className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] border border-[#2a2a2a] rounded-2xl p-6 hover:border-[#333] hover:-translate-y-0.5 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#d4c9a8]/10 flex items-center justify-center text-lg">{s.icon}</div>
                  <Sparkline bars={s.bars} />
                </div>
                <div className="text-xs text-[#555] uppercase tracking-wider mb-1.5">{s.label}</div>
                <div className="font-display text-3xl font-bold text-white mb-1">{s.value}</div>
                <div className={`text-xs flex items-center gap-1 ${s.up ? "text-green-400" : "text-red-400"}`}>
                  {s.up ? "▲" : "▼"} {s.change} from last month
                </div>
              </div>
            ))}
          </div>

          {/* TRAFFIC CHART + PROFILE */}
          <div className="grid grid-cols-[2fr_1fr] gap-5">
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-white">Traffic</h2>
                <Link href="/admin" className="text-xs text-[#d4c9a8] hover:underline">View Report →</Link>
              </div>
              {/* SVG Chart */}
              <div className="h-44 relative mb-2">
                <svg viewBox="0 0 600 180" className="w-full h-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d4c9a8" stopOpacity="0.3"/>
                      <stop offset="100%" stopColor="#d4c9a8" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1565c0" stopOpacity="0.2"/>
                      <stop offset="100%" stopColor="#1565c0" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  {[36,72,108,144].map(y => <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#2a2a2a" strokeWidth="1"/>)}
                  <path d="M30,144 C80,130 120,100 160,90 C200,80 220,135 260,140 C300,145 340,30 380,20 C420,10 460,50 500,40 C540,30 570,45 590,50 L590,170 L30,170 Z" fill="url(#g1)"/>
                  <path d="M30,144 C80,130 120,100 160,90 C200,80 220,135 260,140 C300,145 340,30 380,20 C420,10 460,50 500,40 C540,30 570,45 590,50" fill="none" stroke="#d4c9a8" strokeWidth="2.5" strokeLinecap="round"/>
                  <path d="M30,155 C80,148 130,140 180,138 C220,136 260,120 300,110 C340,100 380,120 430,115 C470,110 530,105 590,100 L590,170 L30,170 Z" fill="url(#g2)"/>
                  <path d="M30,155 C80,148 130,140 180,138 C220,136 260,120 300,110 C340,100 380,120 430,115 C470,110 530,105 590,100" fill="none" stroke="#1565c0" strokeWidth="2" strokeLinecap="round" strokeDasharray="5,3"/>
                  <circle cx="380" cy="20" r="4" fill="#d4c9a8"/>
                  <rect x="355" y="2" width="72" height="17" rx="3" fill="#333"/>
                  <text x="361" y="13" fontSize="9" fill="#d4c9a8">Peak: 690</text>
                  <line x1="380" y1="20" x2="380" y2="170" stroke="#d4c9a8" strokeWidth="1" strokeDasharray="3,3" opacity="0.4"/>
                </svg>
              </div>
              <div className="flex justify-between text-xs text-[#555] mb-4">
                {["Sat","Sun","Mon","Tue","Wed","Thu","Fri"].map(d => <span key={d}>{d}</span>)}
              </div>
              <div className="flex gap-5">
                <div className="flex items-center gap-2 text-xs text-[#666]"><span className="w-4 h-0.5 bg-[#d4c9a8] rounded block"/>Registrations</div>
                <div className="flex items-center gap-2 text-xs text-[#666]"><span className="w-4 h-0 border-t-2 border-dashed border-[#1565c0] block"/>Check-ins</div>
              </div>
            </div>

            {/* PROFILE */}
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col items-center">
              <div className="relative mb-3">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#d4c9a8] to-[#c8bb96] flex items-center justify-center text-[#1a1a1a] font-bold text-lg">MJ</div>
                <div className="absolute -inset-1 rounded-full border-2 border-transparent border-t-[#d4c9a8] animate-spin"/>
              </div>
              <div className="text-sm font-semibold text-white mb-0.5">Mr. Jack</div>
              <div className="text-xs text-[#555] mb-5">UI/UX Designer</div>
              {[["Package","Regular"],["Payment","Direct Debit"],["Last Payment","$85"],["Date","15-May-2026"]].map(([k,v]) => (
                <div key={k} className="flex justify-between w-full py-2.5 border-b border-[#2a2a2a] text-xs">
                  <span className="text-[#666]">{k}</span><strong className="text-[#ccc] font-medium">{v}</strong>
                </div>
              ))}
              <button className="w-full mt-4 py-2.5 bg-[#d4c9a8] text-[#1a1a1a] rounded-full text-sm font-semibold hover:bg-[#c8bb96] transition-colors cursor-pointer">Change Plan</button>
            </div>
          </div>

          {/* PROJECTS + OPTIMIZE */}
          <div className="grid grid-cols-[2fr_1fr] gap-5">
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-display font-bold text-white">Project Update</h2>
                <Link href="/calendar" className="text-xs text-[#d4c9a8] hover:underline">View All →</Link>
              </div>
              <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 pb-3 border-b border-[#2a2a2a] text-[10px] text-[#555] uppercase tracking-wider">
                <span>Task</span><span>Progress</span><span>Status</span>
              </div>
              <div className="divide-y divide-[#1a1a1a]">
                {projects.map((p) => (
                  <div key={p.name} className="grid grid-cols-[2fr_1fr_1fr] gap-3 items-center py-3 hover:bg-[#252525] hover:-mx-3 hover:px-3 rounded-lg transition-all">
                    <span className="text-sm text-[#ddd] font-medium">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1 bg-[#333] rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-[#d4c9a8] to-[#c8bb96] rounded-full" style={{ width: `${p.pct}%` }} />
                      </div>
                      <span className="text-[10px] text-[#666] w-7 text-right">{p.pct}%</span>
                    </div>
                    <span className={`inline-flex items-center justify-center text-[10px] font-medium px-2.5 py-0.5 rounded-full ${p.cls}`}>{p.status}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OPTIMIZE */}
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col items-center justify-between">
              <div className="text-sm text-[#ccc] font-medium self-start mb-5">Increase your Website Speed</div>
              <div className="relative w-28 h-28 mb-4">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#2a2a2a" strokeWidth="12"/>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="url(#dg)" strokeWidth="12" strokeDasharray="251.2" strokeDashoffset="50" strokeLinecap="round"/>
                  <defs>
                    <linearGradient id="dg" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#d4c9a8"/><stop offset="100%" stopColor="#1565c0"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-2xl font-bold text-white">80%</span>
                  <span className="text-[10px] text-[#555]">Score</span>
                </div>
              </div>
              <button className="w-full py-2.5 bg-gradient-to-r from-blue-700 to-blue-900 text-white rounded-full text-sm font-medium hover:brightness-110 transition-all cursor-pointer mb-3">⚡ Optimize Now</button>
              <p className="text-xs text-[#555] text-center leading-relaxed">Documentation and customization articles: <a href="#" className="text-[#d4c9a8] hover:underline">Learn More →</a></p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
