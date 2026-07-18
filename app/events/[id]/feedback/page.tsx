"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { eventService } from "@/app/utils/services/eventService";
import { getStoredAuth } from "@/app/utils/api";
import { MessageSquare, Check, Star, ChevronLeft } from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-3 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";

export default function FeedbackPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const auth = getStoredAuth();
  const { t, tl } = useLanguage();

  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<boolean | null>(null);
  const [category, setCategory] = useState("GENERAL");

  useEffect(() => {
    if (!auth) { router.push(`/login?next=/events/${id}/feedback`); return; }
    eventService.getEventById(id, { skipAuth: false }).then(setEvent).catch(() => null).finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating) return;
    setSaving(true);
    try {
      await eventService.createFeedback({
        eventId: id,
        userId: auth?.userId,
        tenantId: event?.tenantId,
        rating,
        comment: comment.trim() || undefined,
        wouldRecommend: wouldRecommend ?? undefined,
        category,
      });
      setSubmitted(true);
    } catch (err: any) {
      alert(err.message || t("eventFeedback.errors.submitFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check size={36} className="text-green-500" />
          </div>
          <h1 className="font-display font-black text-2xl text-[#1a1a1a] mb-2">{t("eventFeedback.success.title")}</h1>
          <p className="text-[#888] text-sm mb-6">{t("eventFeedback.success.messagePrefix")} <strong>{event?.title}</strong> {t("eventFeedback.success.messageSuffix")}</p>
          <Link href={`/events/${id}`} className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF4747] text-white font-bold rounded-full hover:bg-[#e03e3e] transition-colors text-sm">
            {t("eventFeedback.success.backToEvent")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-12 px-6">
      <div className="max-w-xl mx-auto">

        <Link href={`/events/${id}`} className="inline-flex items-center gap-2 text-sm text-[#888] hover:text-[#1a1a1a] transition-colors mb-8">
          <ChevronLeft size={16} /> {t("eventFeedback.header.backToEvent")}
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-[#aaa] font-semibold uppercase tracking-widest mb-2">
            <MessageSquare size={12} /> {t("eventFeedback.header.eyebrow")}
          </div>
          <h1 className="font-display font-black text-3xl text-[#1a1a1a]">{event?.title || t("eventFeedback.header.fallbackTitle")}</h1>
          <p className="text-[#888] text-sm mt-2">{t("eventFeedback.header.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Star rating */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
            <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-4">{t("eventFeedback.rating.label")}</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHoveredRating(n)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(n)}
                  className="transition-transform hover:scale-110 cursor-pointer"
                >
                  <Star
                    size={36}
                    className={`transition-colors ${n <= (hoveredRating || rating) ? "text-amber-400 fill-amber-400" : "text-[#e5e7eb]"}`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-semibold text-[#888]">
                  {(tl("eventFeedback.rating.words") as string[])[rating]}
                </span>
              )}
            </div>
            {!rating && <p className="text-xs text-red-400 mt-2">{t("eventFeedback.rating.required")}</p>}
          </div>

          {/* Category */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
            <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">{t("eventFeedback.category.label")}</label>
            <div className="flex flex-wrap gap-2">
              {(tl("eventFeedback.category.options") as { value: string; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`px-4 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer ${category === opt.value ? "bg-[#FF4747] text-white" : "bg-[#f5f5f5] text-[#555] hover:bg-[#f5f5f5]"}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
            <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-3">{t("eventFeedback.comments.label")}</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder={t("eventFeedback.comments.placeholder")}
              rows={5}
              className={inp + " resize-none"}
            />
          </div>

          {/* Would recommend */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
            <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-4">{t("eventFeedback.recommend.label")}</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setWouldRecommend(true)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-colors cursor-pointer ${wouldRecommend === true ? "border-green-500 bg-green-50 text-green-700" : "border-[#e5e7eb] text-[#888] hover:border-green-300"}`}
              >
                {t("eventFeedback.recommend.yes")}
              </button>
              <button
                type="button"
                onClick={() => setWouldRecommend(false)}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-colors cursor-pointer ${wouldRecommend === false ? "border-red-400 bg-red-50 text-red-600" : "border-[#e5e7eb] text-[#888] hover:border-red-300"}`}
              >
                {t("eventFeedback.recommend.no")}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || !rating}
            className="w-full py-4 bg-[#FF4747] text-white font-bold rounded-2xl hover:bg-[#e03e3e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 text-sm"
          >
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {t("eventFeedback.submit.submitting")}</>
            ) : (
              <><MessageSquare size={16} /> {t("eventFeedback.submit.submit")}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
