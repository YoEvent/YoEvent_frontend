"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthClaims, getStoredAuth } from "@/app/utils/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const claims = getAuthClaims();
    const auth = getStoredAuth();

    if (!claims && !auth) {
      router.push("/login");
      return;
    }

    // If stored role is explicitly ATTENDEE, redirect away from admin
    if (auth?.role === "ATTENDEE") {
      router.push("/user/dashboard");
      return;
    }

    const storedTenantId = auth?.tenantId;

    const rawScope = claims?.scope || claims?.roles || claims?.permissions || "";
    const scopeStr = Array.isArray(rawScope) 
      ? rawScope.join(" ") 
      : typeof rawScope === "string" 
        ? rawScope 
        : "";

    const hasOrganizerRole = 
      auth?.role === "TENANT_OWNER" ||
      auth?.role === "SUPER_ADMIN" ||
      scopeStr.includes("TENANT_OWNER") || 
      scopeStr.includes("ADMIN") || 
      scopeStr.includes("ORGANIZER") || 
      scopeStr.includes("SUPER_ADMIN") ||
      (claims?.tenantId && claims.tenantId !== "null" && claims.tenantId !== "") ||
      (storedTenantId && storedTenantId !== "null" && storedTenantId !== "");

    if (!hasOrganizerRole) {
      router.push("/login?reason=session_expired");
      return;
    }

    setIsAuthorized(true);
  }, [router, path]);

  if (!isAuthorized) return null;

  return <>{children}</>;
}
