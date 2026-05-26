"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getStoredAuth, clearStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { Calendar, MapPin, Users } from "lucide-react";

export default function PublicEventsPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuth(getStoredAuth());
    setMounted(true);
    
    // Fetch all public events
    eventService.getEvents({ skipAuth: true })
      .then((data) => {
        // Filter out drafts if they exist, keeping only PUBLISHED
        const publicEvents = (data || []).filter(e => e.status !== "DRAFT");
        setEvents(publicEvents);
      })
      .catch((err) => console.error("Failed to fetch events:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    clearStoredAuth();
    setAuth(null);
    router.push("/");
  };

  const isLoggedIn = mounted && auth !== null;

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a] overflow-x-hidden">
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-16 py-5 bg-white border-b border-[#e0d8c8]">
        <Link href="/" className="font-display text-2xl font-black tracking-tight">
          Yo<span className="text-[#8a7d5a]">Event</span>
        </Link>
        <ul className="hidden md:flex items-center gap-8 list-none">
          <li>
            <a href="#" className="text-sm text-[#666] hover:text-[#1a1a1a] transition-colors font-medium">Product</a>
          </li>
          <li>
            <Link href="/events" className="text-sm text-[#1a1a1a] font-bold transition-colors">Events</Link>
          </li>
          <li>
            <Link href="/pricing" className="text-sm text-[#666] hover:text-[#1a1a1a] transition-colors font-medium">Pricing</Link>
          </li>
          <li>
            <Link href="/developers" className="text-sm text-[#666] hover:text-[#1a1a1a] transition-colors font-medium">Developers</Link>
          </li>
        </ul>
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <>
              <Link href="/admin">
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
                  Get Started — Free
                </button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* HEADER */}
      <header className="px-16 py-20 bg-white border-b border-[#e0d8c8] text-center">
        <h1 className="font-display text-5xl font-black text-[#1a1a1a] mb-5 tracking-tight">
          Explore Public <span className="text-[#8a7d5a]">Events</span>
        </h1>
        <p className="text-[#666] text-base max-w-2xl mx-auto leading-relaxed">
          Discover incredible events hosted by individuals and independent organizations from around the globe.
        </p>
      </header>

      {/* EVENTS LISTING */}
      <main className="px-16 py-16 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="w-10 h-10 border-4 border-[#e0d8c8] border-t-[#8a7d5a] rounded-full animate-spin"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-[#e0d8c8] shadow-sm">
            <Calendar className="w-12 h-12 text-[#e0d8c8] mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-[#1a1a1a] mb-2">No public events found</h3>
            <p className="text-[#666] text-sm">Check back later or host your own event today.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((ev) => (
              <Link key={ev.eventId} href={`/events/${ev.eventId}`} className="block">
                <div className="bg-white border border-[#e0d8c8] rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer h-full">
                  <div className="h-40 bg-gradient-to-br from-[#e8e0cc] to-[#c8bb96] relative overflow-hidden">
                    {/* Subtle pattern or fallback image */}
                    <div className="absolute inset-0 opacity-20 group-hover:scale-105 transition-transform duration-700 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black/20 to-transparent"></div>
                    <div className="absolute bottom-4 left-4">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur text-[#1a1a1a] text-xs font-bold rounded-full uppercase tracking-widest shadow-sm">
                        {ev.currency === "USD" ? "$" : ev.currency} EVENT
                      </span>
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="font-display text-xl font-bold text-[#1a1a1a] mb-2 line-clamp-2 group-hover:text-[#8a7d5a] transition-colors">
                      {ev.title}
                    </h3>
                    <p className="text-[#666] text-sm line-clamp-3 mb-6 flex-1">
                      {ev.description || "No description provided for this event."}
                    </p>
                    
                    <div className="space-y-3 pt-4 border-t border-[#f0ebe1] mt-auto">
                      <div className="flex items-center gap-3 text-xs text-[#555] font-medium">
                        <div className="w-8 h-8 rounded-full bg-[#f5f0e8] flex items-center justify-center text-[#8a7d5a]">
                          <Calendar size={14} />
                        </div>
                        <div>
                          <div className="font-bold text-[#1a1a1a]">Date & Time</div>
                          <div>{new Date(ev.startDate).toLocaleDateString()} — {new Date(ev.endDate).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="px-16 py-8 bg-[#1a1a1a] flex items-center justify-between mt-12">
        <div className="font-display text-xl font-black text-white">
          Yo<span className="text-[#8a7d5a]">Event</span>
        </div>
        <p className="text-xs text-[#555]">© 2026 YoEvent · EventaaS Platform · All rights reserved</p>
      </footer>
    </div>
  );
}
