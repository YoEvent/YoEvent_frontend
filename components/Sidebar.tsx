"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderOpen, Globe, Search, Calendar, BarChart2, MessageCircle, LogOut } from "lucide-react";

const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/project", label: "Project", icon: FolderOpen },
  { href: "/admin/website", label: "Website", icon: Globe },
  { href: "/admin/seo", label: "SEO", icon: Search },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/admin/report", label: "Report", icon: BarChart2 },
  { href: "/admin/support", label: "Support", icon: MessageCircle },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-[220px] bg-[#141414] border-r border-[#222] flex flex-col fixed h-screen z-50">
      <div className="px-6 py-7 border-b border-[#222]">
        <Link href="/" className="font-display text-xl font-black text-white tracking-tight">
          Yo<span className="text-[#d4c9a8]">Event</span>
        </Link>
      </div>
      <nav className="flex-1 py-5">
        {links.map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link key={href} href={href}
              className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-all ${active ? "bg-[#222] text-white border-r-2 border-[#d4c9a8]" : "text-[#666] hover:bg-[#1e1e1e] hover:text-[#ccc]"}`}>
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-5 border-t border-[#222]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#d4c9a8] to-[#c8bb96] flex items-center justify-center text-[#1a1a1a] text-xs font-bold flex-shrink-0">MJ</div>
          <div>
            <div className="text-xs font-medium text-[#ccc]">Mr. Jack</div>
            <div className="text-[10px] text-[#555]">Organiser</div>
          </div>
        </div>
        <Link href="/" className="flex items-center gap-3 px-0 py-1 text-xs text-[#555] hover:text-[#ccc] transition-colors">
          <LogOut size={14} /> Logout
        </Link>
      </div>
    </aside>
  );
}
