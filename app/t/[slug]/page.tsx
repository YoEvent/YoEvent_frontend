import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, MapPin, Globe } from "lucide-react";
import TenantAuthBar from "./TenantAuthBar";
import { getApiBaseUrl } from "@/app/utils/api";

/**
 * Tenant public events page — accessible by every tenant regardless of plan.
 * URL pattern: /t/{slug}  (e.g. yowevent.com/t/acme-events)
 *
 * For PREMIUM tenants with a custom domain, /site/[domain] handles their branded URL.
 * This page is the universal fallback that always works.
 */
export default async function TenantSlugPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const API = getApiBaseUrl();

  // 1. Fetch tenant by slug (public)
  let tenant: any;
  try {
    const res = await fetch(`${API}/api/v1/tenants/by-slug/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return notFound();
    tenant = await res.json();
  } catch {
    return notFound();
  }

  if (!tenant?.tenantId) return notFound();

  // 2. Branding defaults from tenant record (settings require auth)
  const settings: any = {};

  // 3. Public event discovery — filter by tenant
  let events: any[] = [];
  try {
    const res = await fetch(`${API}/api/v1/events`, { next: { revalidate: 60 } });
    if (res.ok) {
      const all = await res.json();
      events = Array.isArray(all) ? all.filter((e: any) => e.tenantId === tenant.tenantId) : [];
    }
  } catch {
    /* non-fatal */
  }

  const visibleEvents = (events || []).filter(
    (e: any) => e.status !== "DRAFT" && e.status !== "CANCELLED"
  );

  const primaryColor = settings?.primaryColor || "#d4c9a8";
  const accentColor  = settings?.accentColor  || primaryColor;
  const banner       = tenant?.bannerUrl       || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070";
  const customDomain = settings?.customDomain;

  return (
    <div className="min-h-screen bg-[#f9f8f6] font-sans">
      {/* Hero banner */}
      <div
        className="h-64 md:h-96 bg-cover bg-center relative"
        style={{ backgroundImage: `url(${banner})` }}
      >
        <div className="absolute inset-0 bg-black/45" />
        <div className="absolute inset-0 flex items-center justify-center flex-col text-center p-6 text-white gap-3">
          {tenant?.logo && (
            <img
              src={tenant.logo}
              alt={tenant.name}
              className="w-20 h-20 object-contain rounded-xl shadow-lg bg-white p-2"
            />
          )}
          <h1 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-xl">
            {tenant?.name}
          </h1>
          <p className="text-base md:text-lg font-medium opacity-85">
            {tenant?.industryType || "Event Organizer"}
          </p>

          {/* Show custom domain badge if the tenant has one */}
          {customDomain && (
            <a
              href={`https://${customDomain}`}
              className="inline-flex items-center gap-1.5 mt-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-xs font-semibold hover:bg-white/30 transition-colors"
            >
              <Globe size={12} /> {customDomain}
            </a>
          )}
        </div>
      </div>

      {/* Sign-in / register bar — only shown to unauthenticated visitors */}
      <TenantAuthBar slug={slug} />

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="mb-12 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-[#1a1a1a]">Events by {tenant?.name}</h2>
            <p className="text-sm text-[#888] mt-1">yowevent.com/t/{slug}</p>
          </div>
          <span className="bg-[#1a1a1a] text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
            {visibleEvents.length} {visibleEvents.length === 1 ? "Event" : "Events"}
          </span>
        </div>

        {visibleEvents.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-3xl border border-[#eaeaea]">
            <Calendar className="mx-auto mb-4" size={48} style={{ color: primaryColor }} />
            <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">No events yet</h3>
            <p className="text-[#888]">Check back later for upcoming events from {tenant?.name}.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {visibleEvents.map((event: any) => (
              <EventCard key={event.eventId} event={event} primaryColor={primaryColor} accentColor={accentColor} />
            ))}
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-[#eaeaea] py-10 mt-20 text-center">
        <p className="text-sm text-[#888]">
          Powered by <Link href="/" className="font-bold text-[#1a1a1a] hover:underline">YowEvent</Link>
        </p>
      </footer>
    </div>
  );
}

function EventCard({
  event,
  primaryColor,
  accentColor,
}: {
  event: any;
  primaryColor: string;
  accentColor: string;
}) {
  const statusBadge =
    event.status === "CANCELLED"
      ? { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" }
      : event.status === "PUBLISHED"
      ? { bg: "bg-green-50", text: "text-green-700", label: "Live" }
      : { bg: "bg-amber-50", text: "text-amber-700", label: event.status };

  return (
    <Link href={`/events/${event.eventId}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-[#eaeaea] flex flex-col h-full">
        {/* Cover image */}
        <div className="relative h-48 overflow-hidden bg-stone-100">
          {event.coverImage ? (
            <img
              src={event.coverImage}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-stone-300 text-sm">No Image</div>
          )}
          <div className="absolute top-4 left-4 flex gap-2">
            {event.format && (
              <span className="bg-white/90 backdrop-blur-sm text-[#1a1a1a] text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
                {event.format}
              </span>
            )}
            <span className={`${statusBadge.bg} ${statusBadge.text} text-[10px] font-bold px-2 py-1 rounded-full`}>
              {statusBadge.label}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 flex flex-col">
          <h3
            className="text-xl font-bold text-[#1a1a1a] mb-2 transition-colors"
            style={{ ["--hover-color" as any]: accentColor }}
          >
            {event.title}
          </h3>
          <p className="text-[#666] text-sm line-clamp-2 mb-6 flex-1">{event.description}</p>

          <div className="space-y-3 pt-6 border-t border-stone-100">
            {(event.startDate || event.createdAt) && (
              <div className="flex items-center gap-3 text-xs text-[#555] font-medium">
                <Calendar size={14} style={{ color: primaryColor }} />
                {new Date(event.startDate || event.createdAt).toLocaleDateString("en-US", {
                  weekday: "long", month: "long", day: "numeric",
                })}
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-[#555] font-medium">
                <MapPin size={14} style={{ color: primaryColor }} />
                {event.format === "VIRTUAL" ? "Online" : "In Person"}
              </div>
              {event.isPaid ? (
                <span className="font-bold text-[#1a1a1a] bg-[#f5f0e8] px-2.5 py-1 rounded-md text-xs">
                  Tickets Available
                </span>
              ) : (
                <span className="font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-md text-xs">
                  Free
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
