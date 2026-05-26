"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthClaims } from "@/app/utils/api";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const claims = getAuthClaims();
    if (!claims) {
      router.push("/login");
    } else if (claims.scope?.includes("ATTENDEE")) {
      router.push("/user/dashboard");
    } else {
      setIsAuthorized(true);
    }
  }, [router]);

  if (!isAuthorized) return null; // Prevent UI flicker before redirect

  return <>{children}</>;
}
