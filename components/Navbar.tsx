"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getStoredAuth, clearStoredAuth, getAuthClaims } from "@/app/utils/api";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

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

  // Helper to determine active link class
  const getLinkClass = (path: string) => {
    const baseClass = "text-sm transition-colors";
    const isActive = pathname === path;
    return `${baseClass} ${
      isActive
        ? "text-[#1a1a1a] font-bold"
        : "text-[#666] hover:text-[#1a1a1a] font-medium"
    }`;
  };

  // Helper to determine dashboard path based on role
  const getDashboardPath = () => {
    if (!auth?.token) return "/admin";
    try {
      const claims = getAuthClaims();
      if (claims?.scope) {
        if (claims.scope.includes("SUPER_ADMIN")) return "/super-admin";
        if (claims.scope.includes("ATTENDEE")) return "/user/dashboard";
      }
    } catch (e) {
      // ignore
    }
    return "/admin";
  };

  return (
    <nav className="sticky top-0 z-50 flex items-center px-16 py-5 bg-white border-b border-[#e0d8c8]">
      {/* Logo — left third */}
      <div className="flex-1">
        <Link href="/" className="font-display text-2xl font-black tracking-tight text-[#1a1a1a] hover:opacity-85 transition-opacity">
          Yow<span className="text-[#8a7d5a]">Event</span>
        </Link>
      </div>

      {/* Nav links — center third */}
      <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
        <li>
          <Link href="/" className={getLinkClass("/")}>Product</Link>
        </li>
        <li>
          <Link href="/events" className={getLinkClass("/events")}>Events</Link>
        </li>
        <li>
          <Link href="/updates" className={getLinkClass("/updates")}>Updates</Link>
        </li>
        <li>
          <Link href="/pricing" className={getLinkClass("/pricing")}>Pricing</Link>
        </li>
      </ul>

      {/* Auth buttons — right third */}
      <div className="flex-1 flex items-center justify-end gap-3">
        {isLoggedIn ? (
          <>
            <Link href={getDashboardPath()}>
              <button className="px-5 py-2 text-sm font-semibold bg-[#1a1a1a] text-white rounded-full hover:bg-[#333] transition-all cursor-pointer">
                Dashboard
              </button>
            </Link>
            <button
              onClick={handleLogout}
              className="px-5 py-2 text-sm font-medium border-[1.5px] border-[#1a1a1a] rounded-full hover:bg-red-500 hover:text-white hover:border-transparent transition-all cursor-pointer"
            >
              Log out
            </button>
          </>
        ) : (
          <>
            <Link href="/login">
              <button className="px-5 py-2 text-sm font-medium border-[1.5px] border-[#1a1a1a] rounded-full hover:bg-[#1a1a1a] hover:text-white transition-all cursor-pointer">
                Log in
              </button>
            </Link>
            <Link href="/register">
              <button className="px-5 py-2 text-sm font-medium bg-[#1a1a1a] text-white rounded-full hover:bg-[#333] transition-all cursor-pointer">
                Get Started
              </button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
