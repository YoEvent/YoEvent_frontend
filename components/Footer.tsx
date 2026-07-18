"use client";

import Link from "next/link";
import { useLanguage } from "@/app/context/LanguageContext";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-[#111] text-white">
      <div className="px-8 md:px-16 py-14 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="md:col-span-1">
          <div className="font-display text-2xl font-black mb-3">
            Yow<span className="text-[#FF4747]">Event</span>
          </div>
          <p className="text-xs text-[#666] leading-relaxed max-w-[200px]">
            {t("footer.tagline")}
          </p>
        </div>

        {/* Platform */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#555] font-semibold mb-4">{t("footer.platform")}</p>
          <ul className="space-y-2.5 list-none p-0 m-0">
            <li><Link href="/events" className="text-xs text-[#777] hover:text-[#FF4747] transition-colors">{t("footer.exploreEvents")}</Link></li>
            <li><Link href="/pricing" className="text-xs text-[#777] hover:text-[#FF4747] transition-colors">{t("footer.pricing")}</Link></li>
            <li><Link href="/register" className="text-xs text-[#777] hover:text-[#FF4747] transition-colors">{t("footer.createAccount")}</Link></li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#555] font-semibold mb-4">{t("footer.resources")}</p>
          <ul className="space-y-2.5 list-none p-0 m-0">
            <li>
              <Link href="/eventaas" className="text-xs text-[#777] hover:text-[#FF4747] transition-colors inline-flex items-center gap-1.5">
                {t("footer.eventaas")}
                <span className="text-[8px] font-bold bg-[#FF4747] text-white px-1.5 py-0.5 rounded-full">API</span>
              </Link>
            </li>
            <li><Link href="/developers" className="text-xs text-[#777] hover:text-[#FF4747] transition-colors">{t("footer.apiDocs")}</Link></li>
            <li><Link href="/updates" className="text-xs text-[#777] hover:text-[#FF4747] transition-colors">{t("footer.updates")}</Link></li>
            <li><Link href="/terms" className="text-xs text-[#777] hover:text-[#FF4747] transition-colors">{t("footer.terms")}</Link></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#555] font-semibold mb-4">{t("footer.newsletterTitle")}</p>
          <p className="text-xs text-[#666] mb-3 leading-relaxed">{t("footer.newsletterDesc")}</p>
          <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
            <input
              type="email"
              placeholder={t("footer.emailPlaceholder")}
              className="flex-1 bg-[#1a1a1a] text-xs text-white border border-[#2a2a2a] rounded-lg px-3 py-2 outline-none placeholder:text-[#555] focus:border-[#FF4747] transition-colors min-w-0"
              required
            />
            <button type="submit" className="bg-[#FF4747] text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-[#e03e3e] transition-colors cursor-pointer shrink-0">
              {t("footer.go")}
            </button>
          </form>
        </div>
      </div>

      <div className="px-8 md:px-16 py-4 border-t border-[#1e1e1e] flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#444]">{t("footer.copyright")}</p>
        <div className="flex gap-5">
          <Link href="/terms" className="text-xs text-[#444] hover:text-[#FF4747] transition-colors">{t("footer.termsShort")}</Link>
          <Link href="/eventaas" className="text-xs text-[#444] hover:text-[#FF4747] transition-colors">{t("footer.eventaas")}</Link>
          <Link href="/developers" className="text-xs text-[#444] hover:text-[#FF4747] transition-colors">{t("footer.apiDocs")}</Link>
        </div>
      </div>
    </footer>
  );
}
