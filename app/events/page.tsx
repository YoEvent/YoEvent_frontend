"use client";
import { useState, useEffect } from "react";
import { eventService } from "@/app/utils/services/eventService";
import { authService } from "@/app/utils/services/authService";
import { Calendar } from "lucide-react";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function PublicEventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      eventService.getEvents({ skipAuth: true }),
      authService.getTenantSettings().catch(() => []),
    ])
      .then(([eventsData, settingsData]) => {
        // Build a map of tenant ID -> customDomain
        const domainByTenantId: Record<string, string> = {};
        (settingsData || []).forEach((s: any) => {
          if (s.customDomain && s.customDomain.trim() !== "") {
            domainByTenantId[s.tenantId] = s.customDomain.trim();
          }
        });

        // Explore page ONLY displays events from tenants with a custom domain (premium tenants)
        const publicEvents = (eventsData || [])
          .filter((e: any) => e.status !== "DRAFT" && e.status !== "CANCELLED" && domainByTenantId[e.tenantId])
          .map((e: any) => ({
            ...e,
            customDomain: domainByTenantId[e.tenantId]
          }));

        setEvents(publicEvents);
      })
      .catch((err) => console.error("Failed to fetch events:", err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a] overflow-x-hidden">
      <Navbar />

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
              <a key={ev.eventId} href={`http://${ev.customDomain}/events/${ev.eventId}`} className="block" target="_blank" rel="noopener noreferrer">
                <div className="bg-white border border-[#e0d8c8] rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group cursor-pointer h-full">
                  <div className="h-40 bg-gradient-to-br from-[#e8e0cc] to-[#c8bb96] relative overflow-hidden">
                    {/* Subtle pattern or fallback image */}
                    <div className="absolute inset-0 opacity-20 group-hover:scale-105 transition-transform duration-700 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black/20 to-transparent"></div>
                    <div className="absolute bottom-4 left-4">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur text-[#1a1a1a] text-xs font-bold rounded-full uppercase tracking-widest shadow-sm">
                        {ev.currency === "XAF" ? "FCFA" : ev.currency === "USD" ? "$" : ev.currency} EVENT
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
              </a>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
