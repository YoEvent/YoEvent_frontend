"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getStoredAuth, clearStoredAuth, getAuthClaims } from "@/app/utils/api";
import { Menu, X, Ticket, Languages, UserRound } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";

const navLinks = [
  { href: "/", key: "product" },
  { href: "/events", key: "eventsMarketplace" },
  { href: "/updates", key: "updates" },
  { href: "/pricing", key: "pricing" },
];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { language, toggleLanguage, t } = useLanguage();
  const [auth, setAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [authMenuOpen, setAuthMenuOpen] = useState(false);

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

  const isOrganizer = (() => {
    if (!auth) return false;
    try {
      const claims = getAuthClaims();
      const rawScope = claims?.scope || claims?.roles || claims?.permissions || "";
      const scopeStr = Array.isArray(rawScope)
        ? rawScope.join(" ")
        : typeof rawScope === "string"
          ? rawScope
          : "";

      const isSuperAdmin = scopeStr.includes("SUPER_ADMIN");
      const isAttendee = scopeStr.includes("ATTENDEE");

      if (isAttendee || isSuperAdmin) return false;
      const storedTenantId = auth?.tenantId;
      return !!(claims?.tenantId && claims.tenantId !== "null" && claims.tenantId !== "") ||
             !!(storedTenantId && storedTenantId !== "null" && storedTenantId !== "") ||
             scopeStr.includes("TENANT_OWNER") ||
             scopeStr.includes("ORGANIZER");
    } catch {
      return false;
    }
  })();

  const getDashboardPath = () => {
    if (!auth?.token) return "/admin";
    try {
      const claims = getAuthClaims();
      const rawScope = claims?.scope || claims?.roles || claims?.permissions || "";
      const scopeStr = Array.isArray(rawScope)
        ? rawScope.join(" ")
        : typeof rawScope === "string"
          ? rawScope
          : "";

      if (scopeStr.includes("SUPER_ADMIN")) return "/super-admin";
      if (scopeStr.includes("ATTENDEE")) return "/user/dashboard";
    } catch {}
    return "/admin";
  };

  const LanguageToggle = ({ className = "" }: { className?: string }) => (
    <button
      onClick={toggleLanguage}
      title={language === "en" ? t("nav.toggleToFr") : t("nav.toggleToEn")}
      aria-label={language === "en" ? t("nav.toggleToFr") : t("nav.toggleToEn")}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-full border border-black/10 text-xs font-semibold text-[#555] hover:text-[#FF4747] hover:border-[#FF4747]/30 transition-colors cursor-pointer ${className}`}
    >
      <Languages size={14} />
      {language.toUpperCase()}
    </button>
  );

  return (
    <header className="sticky top-0 z-50 px-3 md:px-6 pt-3">
      <nav className="w-full mx-auto bg-white/80 backdrop-blur-xl border border-black/[0.06] rounded-2xl transition-shadow">
        <div className="flex items-center px-5 md:px-6 py-3">
          {/* Logo */}
          <div className="flex-1">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-xl bg-[#FF4747] flex items-center justify-center text-white shrink-0 transition-transform group-hover:-rotate-6">
                <Ticket size={16} strokeWidth={2.5} />
              </span>
              <span className="font-display text-xl font-black tracking-tight text-[#1a1a1a]">
                Yow<span className="text-[#FF4747]">Event</span>
              </span>
            </Link>
          </div>

          {/* Desktop nav — segmented pill control */}
          <div className="hidden md:flex items-center gap-1 bg-black/[0.04] rounded-full p-1 shrink-0">
            {navLinks.map(({ href, key }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm px-4 py-1.5 rounded-full transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-white text-[#FF4747] font-semibold"
                      : "text-[#555] font-medium hover:text-[#1a1a1a]"
                  }`}
                >
                  {t(`nav.${key}`)}
                </Link>
              );
            })}
          </div>

          {/* Auth buttons */}
          <div className="flex-1 hidden md:flex items-center justify-end gap-3 shrink-0">
            <LanguageToggle />
            {isLoggedIn ? (
              <>
                {isOrganizer ? (
                  <div
                    className="relative shrink-0"
                    onMouseEnter={() => setDropdownOpen(true)}
                    onMouseLeave={() => setDropdownOpen(false)}
                  >
                    <button
                      onClick={() => setDropdownOpen(prev => !prev)}
                      className="px-5 py-2 text-sm font-semibold bg-[#FF4747] text-white rounded-full hover:bg-[#e03e3e] transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                    >
                      {t("nav.dashboard")} <span className="text-[9px] transition-transform duration-200 shrink-0" style={{ display: "inline-block", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                    </button>
                    {dropdownOpen && (
                      <div className="absolute right-0 pt-2 w-48 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-lg py-2">
                          <Link href="/admin" onClick={() => setDropdownOpen(false)}>
                            <div className="px-4 py-2.5 text-xs font-bold text-[#1a1a1a] hover:bg-[#faf9f7] hover:text-[#FF4747] transition-colors cursor-pointer flex flex-col gap-0.5">
                              <span>{t("nav.organizerDashboard")}</span>
                              <span className="text-[10px] text-[#888] font-normal font-sans">{t("nav.organizerDashboardDesc")}</span>
                            </div>
                          </Link>
                          <div className="border-t border-[#f0f0f0] my-1" />
                          <Link href="/user/dashboard" onClick={() => setDropdownOpen(false)}>
                            <div className="px-4 py-2.5 text-xs font-bold text-[#1a1a1a] hover:bg-[#faf9f7] hover:text-[#FF4747] transition-colors cursor-pointer flex flex-col gap-0.5">
                              <span>{t("nav.attendeeDashboard")}</span>
                              <span className="text-[10px] text-[#888] font-normal font-sans">{t("nav.attendeeDashboardDesc")}</span>
                            </div>
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <Link href={getDashboardPath()} className="shrink-0">
                    <button className="px-5 py-2 text-sm font-semibold bg-[#FF4747] text-white rounded-full hover:bg-[#e03e3e] transition-all cursor-pointer whitespace-nowrap">
                      {t("nav.dashboard")}
                    </button>
                  </Link>
                )}
                <button onClick={handleLogout} className="px-5 py-2 text-sm font-medium border-[1.5px] border-[#FF4747] text-[#FF4747] rounded-full hover:bg-[#FF4747] hover:text-white transition-all cursor-pointer whitespace-nowrap shrink-0">
                  {t("nav.logOut")}
                </button>
              </>
            ) : (
              <div
                className="relative shrink-0"
                onMouseEnter={() => setAuthMenuOpen(true)}
                onMouseLeave={() => setAuthMenuOpen(false)}
              >
                <button
                  onClick={() => setAuthMenuOpen(prev => !prev)}
                  aria-label={`${t("nav.logIn")} / ${t("nav.getStarted")}`}
                  className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1a1a1a] text-white hover:bg-[#333] transition-all cursor-pointer"
                >
                  <UserRound size={18} />
                </button>
                {authMenuOpen && (
                  <div className="absolute right-0 pt-2 w-48 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-white border border-[#e5e7eb] rounded-2xl shadow-lg py-2">
                      <Link href="/login" onClick={() => setAuthMenuOpen(false)}>
                        <div className="px-4 py-2.5 text-xs font-bold text-[#1a1a1a] hover:bg-[#faf9f7] hover:text-[#FF4747] transition-colors cursor-pointer">
                          {t("nav.logIn")}
                        </div>
                      </Link>
                      <div className="border-t border-[#f0f0f0] my-1" />
                      <Link href="/register" onClick={() => setAuthMenuOpen(false)}>
                        <div className="px-4 py-2.5 text-xs font-bold text-[#FF4747] hover:bg-[#faf9f7] transition-colors cursor-pointer">
                          {t("nav.getStarted")}
                        </div>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile: language toggle + menu button */}
          <div className="flex items-center gap-2 md:hidden">
            <LanguageToggle className="px-2.5" />
            <button className="p-2 text-[#1a1a1a]" onClick={() => setMobileOpen(v => !v)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-black/[0.06] px-5 py-5 flex flex-col gap-1">
            {navLinks.map(({ href, key }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm px-3 py-2.5 rounded-xl transition-colors ${isActive ? "bg-black/[0.04] text-[#FF4747] font-semibold" : "text-[#444] font-medium hover:bg-black/[0.03]"}`}
                  onClick={() => setMobileOpen(false)}
                >
                  {t(`nav.${key}`)}
                </Link>
              );
            })}
            <div className="flex gap-3 pt-3 mt-2 border-t border-black/[0.06]">
              {isLoggedIn ? (
                isOrganizer ? (
                  <div className="flex flex-col gap-2 flex-1">
                    <Link href="/admin" className="w-full" onClick={() => setMobileOpen(false)}>
                      <button className="w-full py-2 text-sm font-semibold bg-[#FF4747] text-white rounded-full cursor-pointer">{t("nav.organizerDashboard")}</button>
                    </Link>
                    <Link href="/user/dashboard" className="w-full" onClick={() => setMobileOpen(false)}>
                      <button className="w-full py-2 text-sm font-semibold bg-zinc-100 text-zinc-700 rounded-full cursor-pointer hover:bg-zinc-200">{t("nav.attendeeDashboard")}</button>
                    </Link>
                  </div>
                ) : (
                  <Link href={getDashboardPath()} className="flex-1" onClick={() => setMobileOpen(false)}>
                    <button className="w-full py-2 text-sm font-semibold bg-[#FF4747] text-white rounded-full cursor-pointer">{t("nav.dashboard")}</button>
                  </Link>
                )
              ) : (
                <>
                  <Link href="/login" className="flex-1"><button className="w-full py-2 text-sm font-medium border border-[#1a1a1a] text-[#1a1a1a] rounded-full cursor-pointer">{t("nav.logIn")}</button></Link>
                  <Link href="/register" className="flex-1"><button className="w-full py-2 text-sm font-semibold bg-[#FF4747] text-white rounded-full cursor-pointer">{t("nav.getStarted")}</button></Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
