"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthClaims } from "@/app/utils/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const claims = getAuthClaims();
    if (!claims) {
      router.push("/login");
      return;
    }

    const scope: string = claims.scope || "";
    const hasOrganizerRole = scope.includes("TENANT_OWNER") || scope.includes("ADMIN") || scope.includes("ORGANIZER") || scope.includes("SUPER_ADMIN");

    if (!hasOrganizerRole) {
      router.push("/login?reason=session_expired");
      return;
    }

    setIsAuthorized(true);
  }, [router, path]);

  if (!isAuthorized) return null;

  return <>{children}</>;
}
