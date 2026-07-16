"use client";
import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { api, setStoredAuth, getAuthClaims, AuthData } from "@/app/utils/api";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from"); // e.g. /t/acme-events or /events/[id]
  const reason = searchParams.get("reason");
  const sessionExpired = reason === "session_expired";
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = "Valid email required";
    if (!form.password) errs.password = "Password required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      // Direct local authentication login
      const response = await api.post<any>("/api/v1/auth/login", {
        email: form.email,
        password: form.password,
      });

      const token = response?.token;
      if (!token) throw new Error("No token in login response");

      // Decode token claims locally
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      const claims = JSON.parse(jsonPayload);

      // Determine role from JWT claims scope/roles
      const scope = claims.scope || claims.roles || [];
      const hasScope = (s: string) => {
        if (Array.isArray(scope)) return scope.includes(s);
        if (typeof scope === "string") return scope.split(" ").map((x: string) => x.trim()).includes(s);
        return false;
      };

      let resolvedRole: string;
      if (hasScope("SUPER_ADMIN")) {
        resolvedRole = "SUPER_ADMIN";
      } else if (hasScope("ATTENDEE")) {
        resolvedRole = "ATTENDEE";
      } else if (hasScope("TENANT_OWNER") || hasScope("ORGANIZER") || hasScope("ADMIN")) {
        resolvedRole = "TENANT_OWNER";
      } else {
        resolvedRole = (response.tenantId && response.tenantId !== "null") ? "TENANT_OWNER" : "ATTENDEE";
      }

      const data: AuthData = {
        token,
        type: "Bearer",
        userId: response.userId ?? claims.sub ?? "",
        tenantId: response.tenantId === "null" || !response.tenantId ? "" : response.tenantId,
        email: response.email ?? claims.email ?? form.email,
        planTier: response.planTier ?? claims.planTier ?? "FREE",
        role: resolvedRole,
        firstName: claims.firstName ?? claims.given_name ?? undefined,
        lastName: claims.lastName ?? claims.family_name ?? undefined,
      };

      setStoredAuth(data);

      if (resolvedRole === "SUPER_ADMIN") {
        router.push("/super-admin");
      } else if (resolvedRole === "ATTENDEE") {
        router.push(from || "/user/dashboard");
      } else {
        router.push("/admin");
      }
    } catch (err: any) {
      setErrors((prev) => ({ ...prev, submit: err.message || "Invalid credentials" }));
    } finally {
      setLoading(false);
    }
  };

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#ffffff]">
      <nav className="flex items-center justify-between px-16 py-5 bg-white border-b border-[#e5e7eb]">
        <Link href="/" className="font-display text-2xl font-black tracking-tight text-[#1a1a1a]">
          Yow<span className="text-[#EB4203]">Event</span>
        </Link>
        <span className="text-sm text-[#888]">No account?{" "}
          <Link href={from ? `/register?from=${encodeURIComponent(from)}` : "/register"} className="text-[#1a1a1a] font-semibold hover:underline">Sign up free</Link>
        </span>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl border border-[#e5e7eb] p-10">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-[#FF4747]/10 to-[#EB4203]/20 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">🎟</div>
              <h1 className="font-display text-3xl font-bold tracking-tight mb-1 text-[#EB4203]">Welcome back</h1>
              {from ? (
                <p className="text-sm text-[#888]">Sign in to continue to <span className="font-semibold text-[#1a1a1a]">{from}</span></p>
              ) : (
                <p className="text-sm text-[#888]">Sign in to your YowEvent account</p>
              )}
            </div>



            {sessionExpired && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-800">
                🔄 Your session has expired or your role has changed. Please log in again to get a fresh token.
              </div>
            )}

            {errors.submit && (
              <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700">
                ⚠️ {errors.submit}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Email Address</label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com"
                  className={`w-full px-4 py-3 border-[1.5px] rounded-xl text-sm bg-[#ffffff] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(235, 66, 3,.1)] ${errors.email ? "border-red-400" : "border-[#e5e7eb] focus:border-[#EB4203]"}`} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-medium text-[#555] uppercase tracking-wider">Password</label>
                  <a href="#" className="text-xs text-[#EB4203] hover:underline">Forgot password?</a>
                </div>
                <div className="relative">
                  <input type={show ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Your password"
                    className={`w-full px-4 py-3 pr-11 border-[1.5px] rounded-xl text-sm bg-[#ffffff] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(235, 66, 3,.1)] ${errors.password ? "border-red-400" : "border-[#e5e7eb] focus:border-[#EB4203]"}`} />
                  <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#1a1a1a]">
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="remember" className="accent-[#1a1a1a]" />
                <label htmlFor="remember" className="text-xs text-[#666]">Remember me for 30 days</label>
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3.5 bg-[#EB4203] text-white rounded-full text-sm font-semibold hover:bg-[#c23b02] hover:-translate-y-0.5 transition-all disabled:opacity-60 cursor-pointer">
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <p className="text-center text-xs text-[#888] mt-6">
              Don&apos;t have an account?{" "}
              <Link href={from ? `/register?from=${encodeURIComponent(from)}` : "/register"} className="text-[#1a1a1a] font-semibold hover:underline">Create one free</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
