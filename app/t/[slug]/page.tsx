import { notFound } from "next/navigation";
import { getApiBaseUrl } from "@/app/utils/api";
import TenantSlugClient from "./TenantSlugClient";

/**
 * Tenant public events page — accessible by every tenant regardless of plan.
 * URL pattern: /t/{slug}  (e.g. yowevent.com/t/acme-events)
 */
export default async function TenantSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
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

  // 2. Public event discovery — filter by tenant
  let events: any[] = [];
  try {
    const res = await fetch(`${API}/api/v1/events`, { next: { revalidate: 60 } });
    if (res.ok) {
      const all = await res.json();
      const list = Array.isArray(all) ? all : (all?.content ?? []);
      events = list.filter((e: any) => e.tenantId === tenant.tenantId);
    }
  } catch {
    /* non-fatal */
  }

  const visibleEvents = (events || []).filter(
    (e: any) => e.status !== "DRAFT" && e.status !== "CANCELLED"
  );

  return <TenantSlugClient tenant={tenant} events={visibleEvents} />;
}
