import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin } from "lucide-react";

export default async function TenantSitePage({ params }: { params: { domain: string } }) {
  const { domain } = params;

  // 1. Fetch TenantSettings by Custom Domain
  let settings;
  try {
    const res = await fetch(`http://localhost:8080/api/v1/tenantsettingss/domain/${domain}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      if (res.status === 404) return notFound();
      throw new Error("Failed to fetch tenant settings");
    }
    settings = await res.json();
  } catch (err) {
    console.error(err);
    return notFound();
  }

  const tenant = settings.tenant;
  if (!tenant) return notFound();

  // 2. Fetch Events for this Tenant
  let events = [];
  try {
    const res = await fetch(`http://localhost:8080/api/v1/events/tenant/${tenant.tenantId}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) {
      events = await res.json();
    }
  } catch (err) {
    console.error("Failed to load events", err);
  }

  // Filter out drafts
  const publishedEvents = events.filter((e: any) => e.status === "PUBLISHED");

  return (
    <div className="min-h-screen bg-[#f9f8f6] font-sans">
      {/* Dynamic Banner */}
      <div 
        className="h-64 md:h-96 bg-cover bg-center relative"
        style={{ 
          backgroundImage: `url(${tenant.bannerUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070"})` 
        }}
      >
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute inset-0 flex items-center justify-center flex-col text-center p-6 text-white">
          {tenant.logo && (
            <img src={tenant.logo} alt={tenant.name} className="w-24 h-24 object-contain mb-4 rounded-xl shadow-lg bg-white p-2" />
          )}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-xl">{tenant.name}</h1>
          <p className="mt-3 text-lg font-medium opacity-90">{tenant.industryType || "Event Organizer"}</p>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-12 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-[#1a1a1a]">Upcoming Events</h2>
          <span className="bg-[#1a1a1a] text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
            {publishedEvents.length} Events
          </span>
        </div>

        {publishedEvents.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-[#eaeaea]">
            <Calendar className="mx-auto mb-4 text-[#d4c9a8]" size={48} />
            <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">No upcoming events</h3>
            <p className="text-[#888]">Check back later for new events from {tenant.name}.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {publishedEvents.map((event: any) => (
              <Link key={event.eventId} href={`/events/${event.eventId}`} className="group block">
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[#eaeaea] flex flex-col h-full">
                  <div className="relative h-48 overflow-hidden bg-stone-100">
                    {event.coverImage ? (
                      <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-stone-300">No Image</div>
                    )}
                    <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-[#1a1a1a] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                      {event.format}
                    </div>
                  </div>
                  
                  <div className="p-6 flex-1 flex flex-col">
                    <h3 className="text-xl font-bold text-[#1a1a1a] mb-2 group-hover:text-[#8a7d5a] transition-colors">{event.title}</h3>
                    <p className="text-[#666] text-sm line-clamp-2 mb-6 flex-1">{event.description}</p>
                    
                    <div className="space-y-3 pt-6 border-t border-stone-100">
                      <div className="flex items-center gap-3 text-xs text-[#555] font-medium">
                        <Calendar size={14} className="text-[#8a7d5a]" />
                        {new Date(event.startDate || event.createdAt).toLocaleDateString("en-US", {
                          weekday: "long", month: "long", day: "numeric"
                        })}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-[#555] font-medium">
                          <MapPin size={14} className="text-[#8a7d5a]" />
                          {event.format === "VIRTUAL" ? "Online" : "See Venue"}
                        </div>
                        {event.isPaid ? (
                          <span className="font-bold text-[#1a1a1a] bg-[#f5f0e8] px-2.5 py-1 rounded-md text-xs">Tickets Available</span>
                        ) : (
                          <span className="font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-md text-xs">Free Registration</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-[#eaeaea] py-10 mt-20 text-center">
        <p className="text-sm text-[#888] mb-2">Powered by <span className="font-bold text-[#1a1a1a]">YoEvent</span></p>
        <p className="text-xs text-[#aaa]">Enterprise Event Management</p>
      </footer>
    </div>
  );
}
