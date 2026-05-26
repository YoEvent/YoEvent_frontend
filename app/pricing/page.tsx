"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/app/utils/api";

export default function PricingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any[]>("/api/v1/subscriptionplans")
      .then((data) => {
        setPlans(data || []);
      })
      .catch((err) => {
        console.error("Failed to load subscription plans:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const defaultPlans = [
    { name: "Starter", price: 0, billingCycle: "MONTHLY", maxEvents: 3, maxUsers: 1, maxAttendeesPerEvent: 100, featuresEnabled: "Basic Analytics, Q&A" },
    { name: "Pro Eventer", price: 29, billingCycle: "MONTHLY", maxEvents: 20, maxUsers: 5, maxAttendeesPerEvent: 1000, featuresEnabled: "Sponsors, Email Campaigns, Custom Domains" },
    { name: "Enterprise", price: 99, billingCycle: "MONTHLY", maxEvents: 999, maxUsers: 25, maxAttendeesPerEvent: 10000, featuresEnabled: "Dedicated Support, SLA, Advanced Queuing Queue Analytics" },
  ];

  const displayPlans = plans.length > 0 ? plans : defaultPlans;

  return (
    <div className="min-h-screen bg-[#f5f0e8] text-[#1a1a1a]">
      {/* NAV */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-16 py-5 bg-white border-b border-[#e0d8c8]">
        <Link href="/" className="font-display text-2xl font-black tracking-tight text-[#1a1a1a]">
          Yo<span className="text-[#8a7d5a]">Event</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="px-5 py-2 text-sm font-medium border-[1.5px] border-[#1a1a1a] rounded-full hover:bg-[#1a1a1a] hover:text-white transition-all cursor-pointer">
              Log in
            </button>
          </Link>
          <Link href="/register">
            <button className="px-5 py-2 text-sm font-medium bg-[#1a1a1a] text-white rounded-full hover:bg-[#333] transition-all cursor-pointer">
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* HEADER */}
      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <span className="inline-block bg-[#8a7d5a]/10 border border-[#8a7d5a]/20 rounded-full px-4 py-1.5 text-xs text-[#8a7d5a] uppercase tracking-widest mb-4">Pricing Plans</span>
          <h1 className="font-display text-5xl font-black tracking-tight mb-3">Honest, flexible pricing</h1>
          <p className="text-sm text-[#666] max-w-md mx-auto">Scale your events effortlessly. Upgrade, downgrade, or cancel at any time.</p>
        </div>

        {/* CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {displayPlans.map((plan, i) => {
            const isPro = plan.name.toLowerCase().includes("pro");
            return (
              <div
                key={plan.planId || i}
                className={`rounded-3xl p-8 border-[1.5px] flex flex-col justify-between transition-all hover:-translate-y-1 ${
                  isPro
                    ? "bg-[#1a1a1a] text-white border-transparent shadow-2xl relative overflow-hidden"
                    : "bg-white border-[#e0d8c8] text-[#1a1a1a]"
                }`}
              >
                {isPro && (
                  <div className="absolute top-0 right-0 bg-[#d4c9a8] text-[#1a1a1a] text-[9px] uppercase tracking-wider font-extrabold px-5 py-1.5 rounded-bl-2xl">
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 className="font-display text-xl font-bold mb-4">{plan.name}</h3>
                  <div className="flex items-baseline mb-6">
                    <span className="text-4xl font-extrabold font-display">${plan.price}</span>
                    <span className={`text-xs ml-1.5 ${isPro ? "text-[#aaa]" : "text-[#888]"}`}>
                      /{plan.billingCycle?.toLowerCase()}
                    </span>
                  </div>

                  <hr className={`my-6 border-t ${isPro ? "border-[#333]" : "border-[#e0d8c8]"}`} />

                  <ul className="space-y-4 text-xs list-none pl-0">
                    <li className="flex items-center gap-2.5">
                      <span className="text-green-500 font-bold">✓</span>
                      <span>Up to <strong>{plan.maxEvents}</strong> Events</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="text-green-500 font-bold">✓</span>
                      <span>Up to <strong>{plan.maxUsers}</strong> Team Users</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <span className="text-green-500 font-bold">✓</span>
                      <span>Up to <strong>{plan.maxAttendeesPerEvent}</strong> Attendees/Event</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <span className="text-green-500 font-bold mt-0.5">✓</span>
                      <span className="leading-relaxed">
                        Features: {plan.featuresEnabled || "Access to basic resources"}
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="mt-8">
                  <Link href={`/register?plan=${plan.name}`}>
                    <button
                      className={`w-full py-3.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                        isPro
                          ? "bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a]"
                          : "bg-[#1a1a1a] hover:bg-[#333] text-white"
                      }`}
                    >
                      Choose {plan.name}
                    </button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
