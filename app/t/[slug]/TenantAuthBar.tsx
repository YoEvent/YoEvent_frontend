"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { LogIn, UserPlus, User } from "lucide-react";
import { getStoredAuth, getAuthClaims } from "@/app/utils/api";

interface Props {
  slug: string;
}

/**
 * A thin bar shown at the top of a tenant's public events page.
 *
 * - Not signed in  → shows "Sign In" and "Register" buttons that pass
 *   ?from=/t/[slug] so the user is sent back here after authenticating.
 * - Signed in      → shows the user's first name and a link to their dashboard.
 *
 * Mounted as a client component so it can read localStorage without breaking
 * the parent server-rendered page.
 */
export default function TenantAuthBar({ slug }: Props) {
  const [status, setStatus] = useState<"loading" | "guest" | "authenticated">("loading");
  const [displayName, setDisplayName] = useState("");
  const returnPath = `/t/${slug}`;

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      setStatus("guest");
      return;
    }
    const claims = getAuthClaims();
    const name = claims?.firstName || auth.email?.split("@")[0] || "You";
    setDisplayName(name);
    setStatus("authenticated");
  }, []);

  // Don't flash anything on first render
  if (status === "loading") return null;

  if (status === "authenticated") {
    return (
      <div className="bg-[#1a1a1a] text-white py-2.5 px-6 flex items-center justify-between text-xs">
        <span className="text-[#888]">Signed in as <span className="text-[#d4c9a8] font-semibold">{displayName}</span></span>
        <div className="flex items-center gap-4">
          <Link href="/user/dashboard" className="flex items-center gap-1.5 text-[#d4c9a8] hover:text-white transition-colors font-semibold">
            <User size={13} /> My Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Guest
  return (
    <div className="bg-[#f5f0e8] border-b border-[#e0d8c8] py-3 px-6 flex items-center justify-between flex-wrap gap-3">
      <p className="text-xs text-[#666]">
        Sign in or create a free account to register for events.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href={`/login?from=${encodeURIComponent(returnPath)}`}
          className="flex items-center gap-1.5 px-4 py-2 border border-[#1a1a1a] text-[#1a1a1a] text-xs font-semibold rounded-full hover:bg-[#1a1a1a] hover:text-white transition-colors"
        >
          <LogIn size={13} /> Sign In
        </Link>
        <Link
          href={`/register?from=${encodeURIComponent(returnPath)}`}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#1a1a1a] text-white text-xs font-semibold rounded-full hover:bg-[#333] transition-colors"
        >
          <UserPlus size={13} /> Register Free
        </Link>
      </div>
    </div>
  );
}
