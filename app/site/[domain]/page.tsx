import { notFound } from "next/navigation";
import { getApiBaseUrl } from "@/app/utils/api";
import TenantSlugClient from "../../t/[slug]/TenantSlugClient";

export default async function TenantSitePage({ params }: { params: Promise<{ domain: string }> }) {
  const { domain } = await params;
  const API = getApiBaseUrl();

  // 1. Look up TenantSettings by custom domain
  let settings: any;
  try {
    const res = await fetch(`${API}/api/v1/tenantsettingss/domain/${encodeURIComponent(domain)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return notFound();
    settings = await res.json();
  } catch {
    return notFound();
  }

  if (!settings?.tenantId) return notFound();

  // 2. Tenant branding — try public slug lookup, else minimal fallback from settings
  let tenant: any = {
    tenantId: settings.tenantId,
    name: settings.emailSenderName || domain,
    logo: settings.faviconUrl,
    bannerUrl: settings.backgroundImageUrl,
  };
  if (settings.slug) {
    try {
      const res = await fetch(`${API}/api/v1/tenants/by-slug/${encodeURIComponent(settings.slug)}`, {
        next: { revalidate: 60 },
      });
      if (res.ok) tenant = await res.json();
    } catch {
      /* use fallback tenant */
    }
  }

  // 3. Public event discovery — filter by tenant
  let events: any[] = [];
  try {
    const res = await fetch(`${API}/api/v1/events`, { next: { revalidate: 60 } });
    if (res.ok) {
      const all = await res.json();
      const list = Array.isArray(all) ? all : (all?.content ?? []);
      events = list.filter((e: any) => e.tenantId === settings.tenantId);
    }
  } catch {
    /* non-fatal */
  }

  const publishedEvents = (events || []).filter(
    (e: any) => e.status === "PUBLISHED" || e.status === "ACTIVE"
  );

  return <TenantSlugClient tenant={tenant} events={publishedEvents} />;
}
