"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/app/context/LanguageContext";
import { Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Password reset (Kernel Core-backed) is temporarily disabled — no local backend
  // implementation exists yet to fall back to.
  const NOT_AVAILABLE_MESSAGE =
    "Password reset isn't available yet. Please contact support or try again later.";

  // Step 1: Find account
  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setError(NOT_AVAILABLE_MESSAGE);
  };

  // Step 2 & 3: Reset password with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(NOT_AVAILABLE_MESSAGE);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <nav className="flex items-center justify-between px-16 py-5 bg-white border-b border-[#e5e7eb]">
        <Link href="/" className="font-display text-2xl font-black tracking-tight text-[#1a1a1a]">
          Yow<span className="text-[#EB4203]">Event</span>
        </Link>
        <Link href="/login" className="flex items-center gap-1.5 text-sm font-semibold text-[#555] hover:text-[#EB4203]">
          <ArrowLeft size={16} /> Back to Sign In
        </Link>
      </nav>

      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl border border-[#e5e7eb] p-10">
            {step === 1 && (
              <>
                <div className="text-center mb-8">
                  <div className="w-14 h-14 bg-[#EB4203]/10 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">🔑</div>
                  <h1 className="font-display text-2xl font-bold text-[#1a1a1a] mb-1">Forgot Password</h1>
                  <p className="text-sm text-[#888]">Enter your email address and we'll send you a code to reset your password.</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700">
                    ⚠️ {error}
                  </div>
                )}

                <form onSubmit={handleIdentify} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full px-4 py-3 border-[1.5px] border-[#e5e7eb] rounded-xl text-sm outline-none focus:border-[#EB4203]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#EB4203] text-white rounded-full text-sm font-semibold hover:bg-[#c23b02] transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {loading ? "Sending Code..." : "Send Reset Code"}
                  </button>
                </form>
              </>
            )}

            {(step === 2 || step === 3) && (
              <>
                <div className="text-center mb-8">
                  <div className="w-14 h-14 bg-[#EB4203]/10 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4">✉️</div>
                  <h1 className="font-display text-2xl font-bold text-[#1a1a1a] mb-1">Reset Your Password</h1>
                  <p className="text-sm text-[#888]">Enter the code sent to <span className="font-semibold text-[#1a1a1a]">{email}</span> and your new password.</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm text-red-700">
                    ⚠️ {error}
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Verification Code / Token</label>
                    <input
                      type="text"
                      required
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="Enter verification code"
                      className="w-full px-4 py-3 border-[1.5px] border-[#e5e7eb] rounded-xl text-sm outline-none focus:border-[#EB4203]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full px-4 py-3 pr-11 border-[1.5px] border-[#e5e7eb] rounded-xl text-sm outline-none focus:border-[#EB4203]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#888]"
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full px-4 py-3 border-[1.5px] border-[#e5e7eb] rounded-xl text-sm outline-none focus:border-[#EB4203]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 bg-[#EB4203] text-white rounded-full text-sm font-semibold hover:bg-[#c23b02] transition-all disabled:opacity-60 cursor-pointer mt-2"
                  >
                    {loading ? "Updating Password..." : "Reset Password"}
                  </button>
                </form>
              </>
            )}

            {step === 4 && (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200">
                  <CheckCircle className="text-green-500" size={32} />
                </div>
                <h2 className="font-display text-2xl font-bold text-green-800 mb-2">Password Reset Successful!</h2>
                <p className="text-sm text-green-700 mb-4">Your password has been reset. Redirecting you to sign in...</p>
                <Link href="/login" className="inline-block py-2.5 px-6 bg-[#EB4203] text-white rounded-full text-sm font-semibold hover:bg-[#c23b02]">
                  Sign In Now
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
