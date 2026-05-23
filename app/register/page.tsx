"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [showC, setShowC] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", orgName: "", password: "", confirm: "", agree: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "bg-red-500", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const s = strength(form.password);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.firstName.trim()) e.firstName = "Required";
    if (!form.lastName.trim()) e.lastName = "Required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = "Valid email required";
    if (!form.orgName.trim()) e.orgName = "Required";
    if (form.password.length < 8) e.password = "Min. 8 characters";
    if (form.password !== form.confirm) e.confirm = "Passwords do not match";
    if (!form.agree) e.agree = "You must accept the terms";
    return e;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); setSubmitted(true); setTimeout(() => router.push("/login"), 2000); }, 1400);
  };

  const set = (k: string, v: string | boolean) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* NAV */}
      <nav className="flex items-center justify-between px-16 py-5 bg-white border-b border-[#e0d8c8]">
        <Link href="/" className="font-display text-2xl font-black tracking-tight text-[#1a1a1a] hover:opacity-80 transition-opacity">
          Yo<span className="text-[#8a7d5a]">Event</span>
        </Link>
        <span className="text-sm text-[#888]">Already have an account?{" "}
          <Link href="/login" className="text-[#1a1a1a] font-semibold hover:underline">Log in</Link>
        </span>
      </nav>

      <main className="flex-1 grid md:grid-cols-2">
        {/* LEFT */}
        <div className="relative bg-gradient-to-br from-[#1a1a1a] to-[#2a1e10] px-14 py-16 flex flex-col justify-center overflow-hidden">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-radial-[at_50%_50%] from-[#d4c9a8]/15 to-transparent" />
          <div className="absolute -bottom-16 -left-16 w-60 h-60 rounded-full bg-radial-[at_50%_50%] from-[#c8bb96]/10 to-transparent" />
          <div className="relative z-10">
            <span className="inline-block bg-[#d4c9a8]/15 border border-[#d4c9a8]/25 rounded-full px-4 py-1.5 text-xs text-[#d4c9a8] uppercase tracking-widest mb-8">Get Started Today</span>
            <h2 className="font-display text-4xl font-bold text-white leading-[1.15] tracking-tight mb-5">
              Your events,<br /><em className="italic text-[#d4c9a8]">your rules.</em>
            </h2>
            <p className="text-sm text-[#aaa] leading-relaxed max-w-sm mb-12">Provision your own isolated event management environment in seconds. No setup fees, no sales call required.</p>
            <div className="space-y-6">
              {[
                ["🎟", "Free tier included", "Start with no credit card. Upgrade when you grow."],
                ["🔒", "Fully isolated environment", "Your data, brand and users — completely separate."],
                ["📊", "Real-time traffic dashboard", "Flash crowd detection and congestion alerts built in."],
                ["⚡", "Live in under 3 minutes", "From sign-up to your first published event — fast."],
              ].map(([icon, title, desc]) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-[#d4c9a8]/12 flex items-center justify-center text-base flex-shrink-0">{icon}</div>
                  <div>
                    <div className="text-sm font-medium text-white mb-0.5">{title}</div>
                    <div className="text-xs text-[#777]">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="bg-white px-14 py-12 flex flex-col justify-center">
          <h2 className="font-display text-3xl font-bold tracking-tight mb-2">Create your account</h2>
          <p className="text-sm text-[#888] mb-8">Already have an account?{" "}<Link href="/login" className="text-[#1a1a1a] font-semibold hover:underline">Log in</Link></p>

          {submitted && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6 text-sm text-green-700">
              <CheckCircle size={16} /> Account created! Redirecting to login…
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {(["firstName", "lastName"] as const).map((f) => (
                <div key={f}>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{f === "firstName" ? "First Name" : "Last Name"}</label>
                  <input value={form[f]} onChange={(e) => set(f, e.target.value)}
                    placeholder={f === "firstName" ? "Jean" : "Dupont"}
                    className={`w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${errors[f] ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} />
                  {errors[f] && <p className="text-xs text-red-500 mt-1">{errors[f]}</p>}
                </div>
              ))}
            </div>

            {[
              { key: "email", label: "Email Address", placeholder: "you@company.com", type: "email" },
              { key: "orgName", label: "Organisation / Name", placeholder: "Acme Corp or Your Name", type: "text" },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{label}</label>
                <input type={type} value={form[key as keyof typeof form] as string} onChange={(e) => set(key, e.target.value)} placeholder={placeholder}
                  className={`w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${errors[key] ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} />
                {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
              </div>
            ))}

            <div>
              <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Min. 8 characters"
                  className={`w-full px-4 py-2.5 pr-11 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${errors.password ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#1a1a1a]">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= s ? strengthColor[s] : "bg-[#e0d8c8]"}`} />
                    ))}
                  </div>
                  <span className="text-xs text-[#888]">{strengthLabel[s]}</span>
                </div>
              )}
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div>
              <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Confirm Password</label>
              <div className="relative">
                <input type={showC ? "text" : "password"} value={form.confirm} onChange={(e) => set("confirm", e.target.value)} placeholder="Repeat your password"
                  className={`w-full px-4 py-2.5 pr-11 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none transition-all focus:bg-white focus:shadow-[0_0_0_3px_rgba(138,125,90,.1)] ${errors.confirm ? "border-red-400" : "border-[#e0d8c8] focus:border-[#8a7d5a]"}`} />
                <button type="button" onClick={() => setShowC(!showC)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888] hover:text-[#1a1a1a]">
                  {showC ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
            </div>

            <div className="flex items-start gap-2.5">
              <input type="checkbox" id="agree" checked={form.agree} onChange={(e) => set("agree", e.target.checked)} className="mt-0.5 accent-[#1a1a1a]" />
              <label htmlFor="agree" className="text-xs text-[#666]">
                I agree to the <a href="#" className="text-[#1a1a1a] font-semibold hover:underline">Terms of Service</a> and <a href="#" className="text-[#1a1a1a] font-semibold hover:underline">Privacy Policy</a>
              </label>
            </div>
            {errors.agree && <p className="text-xs text-red-500 -mt-2">{errors.agree}</p>}

            <button type="submit" disabled={loading || submitted}
              className="w-full py-3.5 bg-[#1a1a1a] text-white rounded-full text-sm font-medium hover:bg-[#333] hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0 cursor-pointer">
              {loading ? "Creating account…" : submitted ? "✓ Account Created!" : "Create Free Account"}
            </button>

            <div className="flex items-center gap-4 text-xs text-[#888]">
              <span className="flex-1 h-px bg-[#e0d8c8]" />or<span className="flex-1 h-px bg-[#e0d8c8]" />
            </div>

            <button type="button" className="w-full py-3 rounded-full border-[1.5px] border-[#e0d8c8] text-sm text-[#1a1a1a] hover:bg-[#f5f0e8] transition-colors flex items-center justify-center gap-2.5 cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              Continue with Google
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
