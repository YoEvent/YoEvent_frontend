"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getStoredAuth, clearStoredAuth, getAuthClaims } from "@/app/utils/api";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setAuth(getStoredAuth());
    setMounted(true);
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    clearStoredAuth();
    setAuth(null);
    router.push("/");
  };

  const isLoggedIn = mounted && auth !== null;

  const getLinkClass = (path: string) => {
    const isActive = pathname === path;
    return `text-sm transition-colors font-medium ${isActive ? "text-[#FF4747] font-semibold" : "text-[#444] hover:text-[#FF4747]"}`;
  };

  const getDashboardPath = () => {
    if (!auth?.token) return "/admin";
    try {
      const claims = getAuthClaims();
      if (claims?.scope) {
        if (claims.scope.includes("SUPER_ADMIN")) return "/super-admin";
        if (claims.scope.includes("ATTENDEE")) return "/user/dashboard";
      }
    } catch {}
    return "/admin";
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-[#f0f0f0] shadow-sm">
      <div className="flex items-center px-8 md:px-16 py-4">
        {/* Logo */}
        <div className="flex-1">
          <Link href="/" className="font-display text-2xl font-black tracking-tight text-[#1a1a1a] hover:opacity-80 transition-opacity">
            Yow<span className="text-[#FF4747]">Event</span>
          </Link>
        </div>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
          <li><Link href="/" className={getLinkClass("/")}>Product</Link></li>
          <li><Link href="/events" className={getLinkClass("/events")}>Events</Link></li>
          <li><Link href="/updates" className={getLinkClass("/updates")}>Updates</Link></li>
          <li><Link href="/pricing" className={getLinkClass("/pricing")}>Pricing</Link></li>
        </ul>

        {/* Auth buttons */}
        <div className="flex-1 hidden md:flex items-center justify-end gap-3">
          {isLoggedIn ? (
            <>
              <Link href={getDashboardPath()}>
                <button className="px-5 py-2 text-sm font-semibold bg-[#FF4747] text-white rounded-full hover:bg-[#e03e3e] transition-all cursor-pointer shadow-sm shadow-[#FF4747]/20">
                  Dashboard
                </button>
              </Link>
              <button onClick={handleLogout} className="px-5 py-2 text-sm font-medium border-[1.5px] border-[#FF4747] text-[#FF4747] rounded-full hover:bg-[#FF4747] hover:text-white transition-all cursor-pointer">
                Log out
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <button className="px-5 py-2 text-sm font-medium border-[1.5px] border-[#1a1a1a] text-[#1a1a1a] rounded-full hover:bg-[#1a1a1a] hover:text-white transition-all cursor-pointer">
                  Log in
                </button>
              </Link>
              <Link href="/register">
                <button className="px-5 py-2 text-sm font-semibold bg-[#FF4747] text-white rounded-full hover:bg-[#e03e3e] transition-all cursor-pointer shadow-sm shadow-[#FF4747]/20">
                  Get Started
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile menu toggle */}
        <button className="md:hidden p-2 text-[#1a1a1a]" onClick={() => setMobileOpen(v => !v)}>
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-[#f0f0f0] px-8 py-5 flex flex-col gap-4">
          {[["/ ","Product"],["/events","Events"],["/updates","Updates"],["/pricing","Pricing"]].map(([href, label]) => (
            <Link key={href} href={href.trim()} className="text-sm font-medium text-[#444] hover:text-[#FF4747]" onClick={() => setMobileOpen(false)}>{label}</Link>
          ))}
          <div className="flex gap-3 pt-2 border-t border-[#f0f0f0]">
            {isLoggedIn ? (
              <Link href={getDashboardPath()} className="flex-1">
                <button className="w-full py-2 text-sm font-semibold bg-[#FF4747] text-white rounded-full cursor-pointer">Dashboard</button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="flex-1"><button className="w-full py-2 text-sm font-medium border border-[#1a1a1a] text-[#1a1a1a] rounded-full cursor-pointer">Log in</button></Link>
                <Link href="/register" className="flex-1"><button className="w-full py-2 text-sm font-semibold bg-[#FF4747] text-white rounded-full cursor-pointer">Get Started</button></Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
