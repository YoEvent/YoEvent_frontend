import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a] overflow-x-hidden">
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-16 py-5 bg-white border-b border-[#e0d8c8]">
        <div className="font-display text-2xl font-black tracking-tight">
          Yo<span className="text-[#8a7d5a]">Event</span>
        </div>
        <ul className="hidden md:flex items-center gap-8 list-none">
          {["Product", "Solutions", "Pricing", "Developers"].map((item) => (
            <li key={item}>
              <a href="#" className="text-sm text-[#666] hover:text-[#1a1a1a] transition-colors font-medium">
                {item}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="px-5 py-2 text-sm font-medium border-[1.5px] border-[#1a1a1a] rounded-full hover:bg-[#1a1a1a] hover:text-white transition-all cursor-pointer">
              Log in
            </button>
          </Link>
          <Link href="/register">
            <button className="px-5 py-2 text-sm font-medium bg-[#1a1a1a] text-white rounded-full hover:bg-[#333] transition-all cursor-pointer">
              Get Started — Free
            </button>
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="grid md:grid-cols-2 min-h-[85vh] items-center px-16 py-20 bg-gradient-to-br from-[#e8e0cc] via-[#d4c9a8] to-[#c8bb96]">
        <div className="pr-16">
          <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur border border-white/80 rounded-full px-4 py-1.5 text-xs font-medium text-[#5a5040] mb-7">
            <span className="text-[#8a7d5a]">★</span>
            5.0 Rated · Read Our Success Stories
          </div>
          <h1 className="font-display text-6xl md:text-7xl font-black leading-[1.05] tracking-[-2px] text-[#1a1a1a] mb-5">
            Manage{" "}
            <em className="italic text-[#5a5040]">Events</em>
            <br />At Any Scale
          </h1>
          <p className="text-base text-[#4a4030] leading-relaxed max-w-md mb-9 font-light">
            Easily add and organise events, with real-time notifications and smart traffic engineering to keep everyone engaged and your platform running smoothly.
          </p>
          <div className="flex items-center gap-4 mb-10">
            <Link href="/register">
              <button className="px-8 py-3.5 bg-[#1a1a1a] text-white rounded-full text-base font-medium hover:bg-[#333] hover:-translate-y-0.5 transition-all cursor-pointer">
                Download — It&apos;s Free
              </button>
            </Link>
            <button className="px-8 py-3.5 bg-white/70 text-[#1a1a1a] rounded-full text-base font-medium border-[1.5px] border-[#1a1a1a]/30 hover:bg-white transition-all cursor-pointer">
              Schedule a Meeting
            </button>
          </div>
          <div className="flex gap-8">
            {[["10K+", "Events hosted"], ["98%", "Uptime SLA"], ["4.9★", "Satisfaction"]].map(([val, label]) => (
              <div key={label} className="flex flex-col">
                <strong className="font-display text-3xl font-bold text-[#1a1a1a]">{val}</strong>
                <span className="text-xs text-[#6a5e48]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero card */}
        <div className="hidden md:flex items-center justify-center relative">
          <div className="bg-white rounded-2xl p-7 shadow-2xl w-80 relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#8a7d5a] to-[#5a4a30] flex items-center justify-center text-white font-bold text-sm">YE</div>
              <div>
                <div className="font-semibold text-sm">Event Overview</div>
                <div className="text-xs text-[#888]">2 active events</div>
              </div>
            </div>
            {[
              { name: "Tech Summit 2026", date: "Jun 14", fill: "600/500", pct: 96, badge: "Live", badgeColor: "bg-green-100 text-green-800" },
              { name: "Design Workshop", date: "Jul 3", fill: "120/300", pct: 40, badge: "Upcoming", badgeColor: "bg-amber-100 text-amber-800" },
            ].map((ev) => (
              <div key={ev.name} className="bg-[#f5f0e8] rounded-xl p-4 mb-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-sm">{ev.name}</div>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${ev.badgeColor}`}>{ev.badge}</span>
                </div>
                <div className="flex gap-3 text-xs text-[#888] mb-2">
                  <span>📅 {ev.date}</span><span>👥 {ev.fill}</span>
                </div>
                <div className="flex justify-between text-xs text-[#888] mb-1"><span>Capacity</span><span>{ev.pct}%</span></div>
                <div className="h-1 bg-[#e0d8c8] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-[#8a7d5a] to-[#5a4a30] rounded-full" style={{ width: `${ev.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="absolute top-6 -right-4 bg-[#1a1a1a] text-white rounded-xl px-4 py-2.5 text-xs font-medium shadow-xl z-20">📈 +21% Engagement</div>
          <div className="absolute -bottom-2 -left-4 bg-white rounded-xl px-4 py-2.5 text-xs font-medium shadow-xl border border-[#e0d8c8] z-20">✅ 100% Satisfied</div>
        </div>
      </section>

      {/* LOGOS */}
      <div className="flex items-center justify-center gap-12 flex-wrap px-16 py-7 bg-white border-y border-[#e0d8c8]">
        {["Disney", "Rakuten", "Dropbox", "NCR", "Monday.com"].map((b) => (
          <span key={b} className="text-sm font-bold text-[#aaa] tracking-widest uppercase">{b}</span>
        ))}
      </div>

      {/* FEATURES */}
      <section className="px-16 py-24 bg-white">
        <div className="text-xs font-medium text-[#8a7d5a] tracking-[3px] uppercase mb-3">Why YoEvent</div>
        <h2 className="font-display text-4xl font-bold tracking-tight mb-4 max-w-lg leading-snug">Everything you need, nothing you don&apos;t</h2>
        <p className="text-[#666] text-sm leading-relaxed max-w-lg mb-14">A unified platform covering the entire event lifecycle — from creation to post-event analytics — with intelligent traffic engineering built in.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: "🎟", title: "Smart Ticketing", desc: "Free and paid tickets, discount coupons, waitlist management and QR code check-in." },
            { icon: "📊", title: "Real-Time Analytics", desc: "Live dashboards showing registrations, check-ins, revenue and session attendance as they happen." },
            { icon: "🔔", title: "Traffic Engineering", desc: "Queuing models (M/M/c) detect flash crowds and enforce dynamic capacity before degradation." },
            { icon: "💬", title: "Live Engagement", desc: "Q&A, live polls, networking connections and session feedback — no third-party tools required." },
            { icon: "🏢", title: "Multi-Tenant", desc: "Fully isolated environments with custom branding and domain for every organisation or individual." },
            { icon: "🔐", title: "Enterprise Security", desc: "JWT auth, RBAC, TLS 1.3, GDPR-compliant data handling and a full immutable audit log." },
          ].map((f) => (
            <div key={f.title} className="p-8 border-[1.5px] border-[#e0d8c8] rounded-2xl hover:border-[#8a7d5a] hover:-translate-y-1 hover:shadow-md transition-all cursor-default group">
              <div className="w-11 h-11 bg-gradient-to-br from-[#d4c9a8] to-[#c8bb96] rounded-xl flex items-center justify-center text-xl mb-4">{f.icon}</div>
              <h3 className="font-display text-lg font-bold mb-2">{f.title}</h3>
              <p className="text-sm text-[#666] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-16 py-24 bg-[#f5f0e8] text-center">
        <div className="text-xs font-medium text-[#8a7d5a] tracking-[3px] uppercase mb-3">How It Works</div>
        <h2 className="font-display text-4xl font-bold tracking-tight mb-4">Up and running in minutes</h2>
        <p className="text-[#666] text-sm max-w-md mx-auto mb-14 leading-relaxed">No sales call. No setup fee. Just sign up and start building your event.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            ["1", "Create Account", "Sign up free and provision your isolated tenant environment with your own branding."],
            ["2", "Build Your Event", "Set schedule, location, ticket types, sessions and agenda using the guided Event Builder."],
            ["3", "Publish & Invite", "Go live with one click. Send email campaigns and tokenised invitations to your audience."],
            ["4", "Analyse & Grow", "Review real-time and post-event analytics, traffic reports and attendee feedback."],
          ].map(([num, title, desc]) => (
            <div key={num} className="p-8">
              <div className="w-12 h-12 bg-[#1a1a1a] text-white rounded-full flex items-center justify-center font-display font-bold text-lg mx-auto mb-5">{num}</div>
              <h3 className="font-display text-base font-bold mb-2">{title}</h3>
              <p className="text-xs text-[#666] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-16 py-24 bg-[#1a1a1a] text-center">
        <h2 className="font-display text-5xl font-bold text-white mb-4 tracking-tight">Ready to run better events?</h2>
        <p className="text-[#aaa] text-sm max-w-md mx-auto mb-9 leading-relaxed">Join thousands of organisers who trust YoEvent to manage every detail — from first ticket to final report.</p>
        <Link href="/register">
          <button className="px-10 py-4 bg-[#d4c9a8] text-[#1a1a1a] rounded-full text-base font-semibold hover:bg-[#c8bb96] hover:-translate-y-0.5 transition-all cursor-pointer">
            Get Started for Free
          </button>
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="px-16 py-8 bg-[#1a1a1a] border-t border-[#333] flex items-center justify-between">
        <div className="font-display text-xl font-black text-white">
          Yo<span className="text-[#8a7d5a]">Event</span>
        </div>
        <p className="text-xs text-[#555]">© 2026 YoEvent · EventaaS Platform · All rights reserved</p>
      </footer>
    </div>
  );
}
