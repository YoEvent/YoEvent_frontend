"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, Globe, Search, Calendar, BarChart2, LogOut, Percent, Users, DollarSign, UserCheck, ScanLine, ShoppingCart, Package, Code2, MessageCircle, ChevronDown } from "lucide-react";
import { getStoredAuth, clearStoredAuth, getAuthClaims } from "@/app/utils/api";
import { authService } from "@/app/utils/services/authService";

interface SidebarLink {
  label: string;
  icon: any;
  href?: string;
  subLinks?: { href: string; label: string; icon: any }[];
}

const sidebarStructure: SidebarLink[] = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/events", label: "Events", icon: Calendar },
  {
    label: "Operations",
    icon: ShoppingCart,
    subLinks: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
      { href: "/admin/checkin", label: "Check-in", icon: ScanLine },
      { href: "/admin/project", label: "Ticketing", icon: FolderOpen },
      { href: "/admin/payouts", label: "Payouts", icon: DollarSign },
      { href: "/admin/applications", label: "Applications", icon: Users },
    ]
  },
  {
    label: "Logistics",
    icon: Package,
    subLinks: [
      { href: "/admin/team", label: "Team & Crew", icon: UserCheck },
      { href: "/admin/agenda", label: "Agenda & Sessions", icon: Calendar },
      { href: "/admin/resources", label: "Resources & Spaces", icon: Package },
    ]
  },
  {
    label: "Marketing",
    icon: Globe,
    subLinks: [
      { href: "/admin/website", label: "Website Customization", icon: Globe },
      { href: "/admin/engagements", label: "Live Engagements", icon: BarChart2 },
      { href: "/admin/support", label: "Support & Campaigns", icon: MessageCircle },
    ]
  },
  {
    label: "Settings",
    icon: Search,
    subLinks: [
      { href: "/admin/seo", label: "General Settings", icon: Search },
      { href: "/admin/platform", label: "Platform Commission", icon: Percent },
      { href: "/admin/developers", label: "Developer Tools", icon: Code2 },
    ]
  }
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [profile, setProfile] = useState<{ firstName: string; lastName: string; avatar?: string } | null>(null);
  const [tenant, setTenant] = useState<any>(null);
  
  // State to track expanded sub-menus
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      router.push("/login");
      return;
    }

    if (auth.firstName || auth.lastName) {
      setProfile({ firstName: auth.firstName || "", lastName: auth.lastName || auth.email?.split("@")[0] || "" });
    }

    authService.getUserById(auth.userId)
      .then((data) => {
        const user = data as any;
        if (user?.firstName && user.firstName !== "User") {
          setProfile(user);
        } else if (auth.firstName) {
          setProfile({ firstName: auth.firstName, lastName: auth.lastName || "", avatar: user?.avatar });
        } else {
          setProfile(user);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch user profile:", err);
        if (auth.firstName) {
          setProfile({ firstName: auth.firstName, lastName: auth.lastName || "", avatar: undefined });
        }
      });

    if (auth.tenantId) {
      authService.getTenantById(auth.tenantId)
        .then(setTenant)
        .catch((err) => console.error("Failed to fetch tenant:", err));
    }
  }, []);

  // Expand parent category if an active sublink is matched
  useEffect(() => {
    const activeMenu: Record<string, boolean> = {};
    sidebarStructure.forEach(item => {
      if (item.subLinks) {
        const hasActiveSublink = item.subLinks.some(sub => sub.href === path);
        if (hasActiveSublink) {
          activeMenu[item.label] = true;
        }
      }
    });
    setExpandedMenus(prev => ({ ...prev, ...activeMenu }));
  }, [path]);

  // Filter out restricted platform link for non-superadmins
  const allowedStructure = sidebarStructure.map((item) => {
    if (item.subLinks) {
      const filteredSub = item.subLinks.filter((sub) => {
        if (sub.href === "/admin/platform") {
          const claims = getAuthClaims();
          const rawScope = claims?.scope || claims?.roles || claims?.permissions || "";
          const scopeStr = Array.isArray(rawScope) 
            ? rawScope.join(" ") 
            : typeof rawScope === "string" 
              ? rawScope 
              : "";
          const isSuperAdmin = scopeStr.includes("SUPER_ADMIN");
          return isSuperAdmin;
        }
        return true;
      });
      return { ...item, subLinks: filteredSub };
    }
    return item;
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
      <nav className="flex-1 py-5 overflow-y-auto space-y-1">
        {allowedStructure.map((item) => {
          if (item.href) {
            const active = path === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-all ${active ? "bg-[#f9fafb] text-[#EB4203] font-bold border-r-2 border-[#EB4203]" : "text-[#666] hover:bg-stone-50 hover:text-[#1a1a1a]"}`}>
                <Icon size={16} />
                {item.label}
              </Link>
            );
          } else {
            const isExpanded = !!expandedMenus[item.label];
            const Icon = item.icon;
            const hasActiveSub = item.subLinks?.some(sub => sub.href === path);
            return (
              <div key={item.label} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => setExpandedMenus(prev => ({ ...prev, [item.label]: !prev[item.label] }))}
                  className={`flex items-center justify-between px-6 py-2.5 text-sm transition-all w-full text-left cursor-pointer ${hasActiveSub ? "text-[#EB4203] font-semibold" : "text-[#666] hover:text-[#1a1a1a] hover:bg-stone-50"}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={16} />
                    {item.label}
                  </div>
                  <ChevronDown size={14} className={`transform transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                </button>
                {isExpanded && (
                  <div className="pl-6 pr-4 py-1.5 space-y-1 bg-[#fafafa]/50 border-l border-[#e5e7eb] ml-7">
                    {item.subLinks?.map(sub => {
                      const subActive = path === sub.href;
                      const SubIcon = sub.icon;
                      return (
                        <Link key={sub.href} href={sub.href}
                          className={`flex items-center gap-2.5 py-1.5 text-xs transition-all ${subActive ? "text-[#EB4203] font-bold" : "text-[#777] hover:text-[#1a1a1a]"}`}>
                          <SubIcon size={12} />
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }
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
