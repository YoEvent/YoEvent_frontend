"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.email || !/\S+@\S+\.\S+/.test(form.email)) errs.email = "Valid email required";
    if (!form.password) errs.password = "Password required";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    setTimeout(() => router.push("/admin"), 1200);
  };

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f0e8]">
      <nav className="flex items-center justify-between px-16 py-5 bg-white border-b border-[#e0d8c8]">
        <Link href="/" className="font-display text-2xl font-black tracking-tight text-[#1a1a1a]">
          Yo<span className="text-[#8a7d5a]">Event</span>
        </Link>
        <span className="text-sm text-[#888]">No account?{" "}
          <Link href="/register" className="text-[#1a1a1a] font-semibold hover:underline">Sign up free</Link>
        </span>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl border border-[#e0d8c8] p-10">
            <div className="text-center mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-[#d4c9a8] to-[#c8bb96] rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">🎟</div>
              <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Welcome back</h1>
              <p className="text-sm text-[#888]">Sign in to your YoEvent account</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div>
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Email Address</label>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@company.com"
                  className={`w-full px-4 py-3 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${errors.email ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-medium text-[#555] uppercase tracking-wider">Password</label>
                  <a href="#" className="text-xs text-[#8a7d5a] hover:underline">Forgot password?</a>
                </div>
                <div className="relative">
                  <input type={show ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Your password"
                    className={`w-full px-4 py-3 pr-11 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${errors.password ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} />
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
                className="w-full py-3.5 bg-[#1a1a1a] text-white rounded-full text-sm font-medium hover:bg-[#333] hover:-translate-y-0.5 transition-all disabled:opacity-60 cursor-pointer">
                {loading ? "Signing in…" : "Sign In"}
              </button>

              <div className="flex items-center gap-4 text-xs text-[#888]">
                <span className="flex-1 h-px bg-[#e0d8c8]" />or<span className="flex-1 h-px bg-[#e0d8c8]" />
              </div>

              <button type="button" className="w-full py-3 rounded-full border-[1.5px] border-[#e0d8c8] text-sm text-[#1a1a1a] hover:bg-[#f5f0e8] transition-colors flex items-center justify-center gap-2.5 cursor-pointer">
                <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                Continue with Google
              </button>
            </form>

            <p className="text-center text-xs text-[#888] mt-6">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-[#1a1a1a] font-semibold hover:underline">Create one free</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
