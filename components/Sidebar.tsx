"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, Globe, Search, Calendar, BarChart2, MessageCircle, LogOut, Percent, Users, DollarSign, UserCheck, ScanLine, ShoppingCart, Package, Code2 } from "lucide-react";
import { getStoredAuth, clearStoredAuth, getAuthClaims } from "@/app/utils/api";
import { authService } from "@/app/utils/services/authService";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: Calendar },
  { href: "/admin/checkin", label: "Check-in", icon: ScanLine },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/resources", label: "Resources", icon: Package },
  { href: "/admin/agenda", label: "Agenda", icon: MessageCircle },
  { href: "/admin/project", label: "Ticketing", icon: FolderOpen },
  { href: "/admin/payouts", label: "Payouts", icon: DollarSign },
  { href: "/admin/website", label: "Customization", icon: Globe },
  { href: "/admin/team", label: "Team", icon: UserCheck },
  { href: "/admin/applications", label: "Applications", icon: Users },
  { href: "/admin/seo", label: "Settings", icon: Search },
  { href: "/admin/engagements", label: "Engagements", icon: BarChart2 },
  { href: "/admin/platform", label: "Commission", icon: Percent },
  { href: "/admin/support", label: "Support", icon: MessageCircle },
  { href: "/admin/developers", label: "Developers", icon: Code2 },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<{ firstName: string; lastName: string; avatar?: string } | null>(null);
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      router.push("/login");
      return;
    }
    authService.getUserById(auth.userId)
      .then((data) => {
        setProfile(data as any);
      })
      .catch((err) => {
        console.error("Failed to fetch user profile:", err);
      });

    if (auth.tenantId) {
      authService.getTenantById(auth.tenantId)
        .then(setTenant)
        .catch((err) => console.error("Failed to fetch tenant:", err));
    }
  }, []);

  const allowedLinks = links.filter((link) => {
    if (link.href === "/admin/platform") {
      const claims = getAuthClaims();
      const isSuperAdmin = claims?.scope?.split(/\s+/).includes("SUPER_ADMIN");
      if (!isSuperAdmin) return false;
    }
    return true;
  });

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    clearStoredAuth();
    router.push("/login");
  };

  const displayName = profile ? `${profile.firstName} ${profile.lastName}` : "Mr. Jack";
  const initials = profile ? `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`.toUpperCase() : "MJ";

  return (
    <aside className="w-[220px] bg-white border-r border-[#e5e7eb] flex flex-col fixed h-screen z-50 text-[#1a1a1a]">
      <div className="px-6 py-7 border-b border-[#e5e7eb]">
        <Link href="/" className="font-display text-xl font-black text-[#1a1a1a] tracking-tight">
          Yow<span className="text-[#EB4203]">Event</span>
        </Link>
      </div>
      <nav className="flex-1 py-5">
        {allowedLinks.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-all ${active ? "bg-[#f9fafb] text-[#EB4203] font-bold border-r-2 border-[#EB4203]" : "text-[#666] hover:bg-stone-50 hover:text-[#1a1a1a]"}`}>
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-5 border-t border-[#e5e7eb]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EB4203] to-[#c23b02] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div>
            <div className="text-xs font-medium text-[#1a1a1a] truncate max-w-[120px]">{displayName}</div>
            <div className="text-[10px] text-[#888]">{tenant?.type === "ORGANIZATION" ? "Organization" : "Individual Creator"}</div>
          </div>
        </div>
        <Link href="/user/dashboard" className="flex items-center gap-3 px-0 py-1 text-xs text-[#EB4203] hover:text-[#c23b02] transition-colors mb-2">
          🎟 Switch to Attendee View
        </Link>
        <a href="#" onClick={handleLogout} className="flex items-center gap-3 px-0 py-1 text-xs text-[#666] hover:text-[#1a1a1a] transition-colors">
          <LogOut size={14} /> Logout
        </a>
      </div>
    </aside>
  );
}
