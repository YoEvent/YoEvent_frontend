"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthClaims, getStoredAuth } from "@/app/utils/api";
import { authService } from "@/app/utils/services/authService";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const claims = getAuthClaims();
    if (!claims) {
      router.push("/login");
      return;
    } 
    if (claims.scope?.includes("ATTENDEE")) {
      router.push("/user/dashboard");
      return;
    }
    
    // Fetch tenant to check if accessing restricted pages as individual creator
    const auth = getStoredAuth();
    if (auth && auth.tenantId) {
      const restrictedPaths = ["/admin/website", "/admin/agenda", "/admin/report"];
      const isRestrictedPath = restrictedPaths.some(p => path.startsWith(p));

      if (isRestrictedPath) {
        authService.getTenantById(auth.tenantId)
          .then((tenant: any) => {
            if (tenant?.type !== "ORGANIZATION") {
              setAccessDenied(true);
            } else {
              setIsAuthorized(true);
            }
          })
          .catch(() => {
            // Fallback to claims if API request fails
            if (claims.tenantType !== "ORGANIZATION") {
              setAccessDenied(true);
            } else {
              setIsAuthorized(true);
            }
          });
      } else {
        setIsAuthorized(true);
      }
    } else {
      setIsAuthorized(true);
    }
  }, [router, path]);

  if (accessDenied) {
    return (
      <div className="flex bg-[#111] min-h-screen text-[#e0e0e0] items-center justify-center p-8">
        <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-8 max-w-md text-center space-y-6">
          <div className="text-4xl">🔒</div>
          <h2 className="font-display font-bold text-white text-xl">Organization Feature Only</h2>
          <p className="text-xs text-[#888] leading-relaxed">
            Agenda sessions, tracks, customization sponsors, exhibitors, and reports are only available for Organization accounts.
          </p>
          <div className="flex flex-col gap-3">
            <button 
              onClick={() => {
                setAccessDenied(false);
                router.push("/admin");
              }}
              className="w-full py-2.5 bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Back to Overview
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) return null; // Prevent UI flicker before redirect

  return <>{children}</>;
}
