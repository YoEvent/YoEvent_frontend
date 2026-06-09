import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#1a1a1a] border-t border-[#333]">
      <div className="px-16 py-10 flex flex-wrap items-start justify-between gap-8">
        {/* Brand */}
        <div>
          <div className="font-display text-xl font-black text-white mb-2">
            Yow<span className="text-[#8a7d5a]">Event</span>
          </div>
          <p className="text-xs text-[#555] max-w-xs">
            The all-in-one EventaaS platform for organizers across Africa.
          </p>
        </div>

        {/* Links */}
        <div className="flex gap-12 flex-wrap">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#444] font-semibold mb-3">Platform</p>
            <ul className="space-y-2 list-none p-0 m-0">
              <li><Link href="/events" className="text-xs text-[#666] hover:text-[#8a7d5a] transition-colors">Events</Link></li>
              <li><Link href="/pricing" className="text-xs text-[#666] hover:text-[#8a7d5a] transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[#444] font-semibold mb-3">Resources</p>
            <ul className="space-y-2 list-none p-0 m-0">
              <li><Link href="/developers" className="text-xs text-[#666] hover:text-[#8a7d5a] transition-colors">Developers</Link></li>
              <li><Link href="/terms" className="text-xs text-[#666] hover:text-[#8a7d5a] transition-colors">Terms & Conditions</Link></li>
            </ul>
          </div>
        </div>

        {/* Newsletter */}
        <div className="max-w-xs">
          <p className="text-[10px] uppercase tracking-widest text-[#444] font-semibold mb-3">Newsletter</p>
          <p className="text-xs text-[#666] mb-3 leading-relaxed">
            Subscribe to get notifications about new events and updates.
          </p>
          <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
            <input 
              type="email" 
              placeholder="Email address" 
              className="bg-[#252525] text-xs text-white border border-[#333] rounded-lg px-3 py-2 outline-none w-full placeholder:text-[#555] focus:border-[#8a7d5a] transition-colors"
              required 
            />
            <button 
              type="submit" 
              className="bg-[#8a7d5a] text-[#1a1a1a] text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#c8bb96] transition-colors cursor-pointer"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="px-16 py-4 border-t border-[#2a2a2a] flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#444]">© 2026 YowEvent · All rights reserved</p>
        <Link href="/terms" className="text-xs text-[#444] hover:text-[#8a7d5a] transition-colors">
          Terms & Conditions
        </Link>
      </div>
    </footer>
  );
}
