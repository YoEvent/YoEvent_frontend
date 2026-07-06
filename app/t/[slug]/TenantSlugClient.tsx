"use client";
import { useState } from "react";
import Link from "next/link";
import { Calendar, MapPin, Globe, Mail, ExternalLink, CalendarDays, Compass, MessageSquare, ArrowRight } from "lucide-react";

export default function TenantSlugClient({ tenant, events }: { tenant: any; events: any[] }) {
  const [activeTab, setActiveTab] = useState<"home" | "events" | "about" | "contact">("home");
  const [searchQuery, setSearchQuery] = useState("");
  const [eventFilter, setEventFilter] = useState<"all" | "upcoming" | "past">("all");
  const [contactForm, setContactForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Styling properties from tenant branding
  const primaryColor = tenant?.primaryColor || "#EB4203";
  const secondaryColor = tenant?.secondaryColor || "#1a1a1a";
  const accentColor = tenant?.accentColor || "#F7E998";
  const logo = tenant?.logo;
  const banner = tenant?.bannerUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070";

  // Automatic statistics fallbacks
  const eventCount = tenant?.eventCountStat !== undefined && tenant?.eventCountStat !== 0
    ? tenant.eventCountStat
    : (events?.length || 0);

  const attendeeCount = tenant?.attendeeCountStat !== undefined && tenant?.attendeeCountStat !== 0
    ? tenant.attendeeCountStat
    : 0;

  const partnerCount = tenant?.partnerCountStat !== undefined && tenant?.partnerCountStat !== 0
    ? tenant.partnerCountStat
    : 0;

  const hasStats = eventCount > 0 || attendeeCount > 0 || partnerCount > 0;

  // Parse FAQs
  let faqs: { q: string; a: string }[] = [];
  try {
    faqs = JSON.parse(tenant?.faqsJson || "[]");
  } catch {
    faqs = [];
  }

  // Filter events based on tab/search
  const now = new Date();
  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const eventDate = new Date(event.startDate || event.createdAt);
    if (eventFilter === "upcoming") {
      return matchesSearch && eventDate >= now;
    } else if (eventFilter === "past") {
      return matchesSearch && eventDate < now;
    }
    return matchesSearch;
  });

  const upcomingEvents = events.filter(e => new Date(e.startDate || e.createdAt) >= now);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setContactForm({ name: "", email: "", subject: "", message: "" });
    }, 3000);
  };

  return (
    <div
      className="min-h-screen bg-[#fafafa] font-sans flex flex-col"
      style={{
        ["--primary" as any]: primaryColor,
        ["--secondary" as any]: secondaryColor,
        ["--accent" as any]: accentColor,
      }}
    >
      {/* ── PREMIUM HEADER & NAVIGATION ── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#e5e7eb]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logo ? (
              <img src={logo} alt={tenant?.name} className="w-9 h-9 object-contain rounded-lg border border-[#e5e7eb] p-1 bg-white" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-[var(--primary)] flex items-center justify-center font-bold text-white text-sm">
                {(tenant?.name || "?").charAt(0)}
              </div>
            )}
            <span className="font-display font-black text-sm text-[#1a1a1a] tracking-tight">{tenant?.name}</span>
          </div>

          <nav className="flex items-center gap-1 md:gap-2">
            {(["home", "events", "about", "contact"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${activeTab === tab
                    ? "bg-[var(--primary)] text-white"
                    : "text-[#555] hover:bg-gray-100 hover:text-[#1a1a1a]"
                  }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* ── STUNNING BANNER HERO ── */}
      <div
        className="h-64 md:h-[380px] bg-cover bg-center relative shrink-0 transition-all"
        style={{ backgroundImage: `url(${banner})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30" />
        <div className="absolute bottom-0 left-0 right-0 max-w-6xl mx-auto px-6 pb-8 md:pb-12 text-white">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3">
              <span className="text-[10px] font-black tracking-widest uppercase bg-[var(--primary)] text-white px-2.5 py-1 rounded-full">
                {tenant?.type || "ORGANIZATION"}
              </span>
              <h1 className="text-3xl md:text-5xl font-black tracking-tight drop-shadow-md">{tenant?.name}</h1>
              <p className="text-sm md:text-base text-gray-300 max-w-xl">{tenant?.industryType || "Event Management"}</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab("contact")}
                className="px-5 py-2.5 bg-white text-xs font-bold text-[#1a1a1a] rounded-xl hover:bg-gray-100 transition-colors shadow-lg cursor-pointer flex items-center gap-2"
              >
                Get in Touch <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── STATS COUNTER ROW ── */}
      {hasStats && (
        <div className="bg-white border-b border-[#e5e7eb] py-6 shadow-sm">
          <div className="max-w-6xl mx-auto px-6 grid grid-cols-3 gap-4 text-center">
            {eventCount > 0 && (
              <div className="space-y-1 border-r border-[#f0f0f0] last:border-0">
                <span className="block text-2xl md:text-3xl font-black text-[var(--primary)]">{eventCount}+</span>
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Events Hosted</span>
              </div>
            )}
            {attendeeCount > 0 && (
              <div className="space-y-1 border-r border-[#f0f0f0] last:border-0">
                <span className="block text-2xl md:text-3xl font-black text-[var(--primary)]">{attendeeCount}+</span>
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Attendees Reached</span>
              </div>
            )}
            {partnerCount > 0 && (
              <div className="space-y-1 last:border-0">
                <span className="block text-2xl md:text-3xl font-black text-[var(--primary)]">{partnerCount}+</span>
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Sponsors & Partners</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ACCORDING TO TABS ── */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12">

        {/* 1. HOME TAB */}
        {activeTab === "home" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left Box: Organization Bio */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
                <h3 className="font-display font-black text-sm text-[#1a1a1a] uppercase tracking-wider mb-4 border-b border-[#f3f4f6] pb-2">
                  Organizer Profile
                </h3>
                {tenant?.description ? (
                  <p className="text-xs text-[#555] leading-relaxed whitespace-pre-wrap">{tenant.description}</p>
                ) : (
                  <p className="text-xs text-[#9ca3af] italic">No description details provided yet.</p>
                )}

                {/* Social connections */}
                {(tenant.websiteUrl || tenant.twitterUrl || tenant.linkedinUrl || tenant.facebookUrl || tenant.instagramUrl) && (
                  <div className="mt-6 pt-4 border-t border-[#f3f4f6] space-y-2">
                    <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest">Connect Online</span>
                    <div className="flex flex-col gap-2.5 mt-2">
                      {tenant.websiteUrl && (
                        <a href={tenant.websiteUrl} target="_blank" className="flex items-center gap-2 text-xs font-semibold text-[#555] hover:text-[var(--primary)] transition-colors">
                          <Globe size={13} /> <span>Official Website</span>
                        </a>
                      )}
                      {tenant.twitterUrl && (
                        <a href={tenant.twitterUrl} target="_blank" className="flex items-center gap-2 text-xs font-semibold text-[#555] hover:text-[var(--primary)] transition-colors">
                          <ExternalLink size={13} /> <span>Twitter / X</span>
                        </a>
                      )}
                      {tenant.linkedinUrl && (
                        <a href={tenant.linkedinUrl} target="_blank" className="flex items-center gap-2 text-xs font-semibold text-[#555] hover:text-[var(--primary)] transition-colors">
                          <ExternalLink size={13} /> <span>LinkedIn</span>
                        </a>
                      )}
                      {tenant.facebookUrl && (
                        <a href={tenant.facebookUrl} target="_blank" className="flex items-center gap-2 text-xs font-semibold text-[#555] hover:text-[var(--primary)] transition-colors">
                          <ExternalLink size={13} /> <span>Facebook</span>
                        </a>
                      )}
                      {tenant.instagramUrl && (
                        <a href={tenant.instagramUrl} target="_blank" className="flex items-center gap-2 text-xs font-semibold text-[#555] hover:text-[var(--primary)] transition-colors">
                          <ExternalLink size={13} /> <span>Instagram</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Organization Contact quick block */}
              {tenant?.contactEmail && (
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">General Inquiry</span>
                    <a href={`mailto:${tenant.contactEmail}`} className="block text-xs font-bold text-[#1a1a1a] hover:underline mt-0.5">{tenant.contactEmail}</a>
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: Featured/Upcoming Events */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-black text-base text-[#1a1a1a]">Featured Events</h3>
                <button
                  onClick={() => setActiveTab("events")}
                  className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  View All ({events.length}) <ArrowRight size={12} />
                </button>
              </div>

              {upcomingEvents.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-[#e5e7eb]">
                  <CalendarDays size={40} className="mx-auto mb-3 text-gray-300" />
                  <h4 className="text-sm font-bold text-[#1a1a1a] mb-1">No upcoming events listed</h4>
                  <p className="text-xs text-[#888]">Stay tuned or contact us for more information.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {upcomingEvents.slice(0, 4).map(event => (
                    <EventGridCard key={event.eventId} event={event} primaryColor={primaryColor} accentColor={accentColor} />
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* 2. EVENTS TAB */}
        {activeTab === "events" && (
          <div className="space-y-8">

            {/* Filter and Search Bar */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                {(["all", "upcoming", "past"] as const).map(filter => (
                  <button
                    key={filter}
                    onClick={() => setEventFilter(filter)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${eventFilter === filter
                        ? "bg-[#1a1a1a] text-white"
                        : "bg-gray-100 text-[#555] hover:bg-gray-200"
                      }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-gray-50 border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:bg-white focus:border-[var(--primary)] transition-colors w-full md:max-w-xs"
              />
            </div>

            {/* List */}
            {filteredEvents.length === 0 ? (
              <div className="text-center py-24 bg-white rounded-3xl border border-[#e5e7eb]">
                <CalendarDays size={48} className="mx-auto mb-4 text-gray-300" />
                <h4 className="text-base font-bold text-[#1a1a1a] mb-2">No matching events found</h4>
                <p className="text-xs text-[#888]">Try adjusting your search queries or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredEvents.map(event => (
                  <EventGridCard key={event.eventId} event={event} primaryColor={primaryColor} accentColor={accentColor} />
                ))}
              </div>
            )}

          </div>
        )}

        {/* 3. ABOUT TAB */}
        {activeTab === "about" && (
          <div className="max-w-4xl mx-auto bg-white border border-[#e5e7eb] rounded-3xl p-8 shadow-sm space-y-8">
            <div className="space-y-3">
              <h2 className="text-2xl font-black text-[#1a1a1a]">About {tenant?.name}</h2>
              <div className="h-1 w-20 bg-[var(--primary)] rounded-full" />
            </div>

            <div className="grid md:grid-cols-3 gap-8">

              {/* Profile Details List */}
              <div className="md:col-span-1 bg-gray-50 rounded-2xl p-6 border border-[#e5e7eb] space-y-4 h-fit">
                <h4 className="font-bold text-xs text-[#1a1a1a] uppercase tracking-wider mb-2">Details</h4>

                <div className="space-y-3 text-xs text-[#555]">
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Industry</span>
                    <span className="font-semibold text-[#1a1a1a]">{tenant?.industryType || "Event Organizer"}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Organization Type</span>
                    <span className="font-semibold text-[#1a1a1a]">{tenant?.type || "ORGANIZATION"}</span>
                  </div>
                  {tenant?.contactEmail && (
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Contact</span>
                      <a href={`mailto:${tenant.contactEmail}`} className="font-semibold text-[var(--primary)] hover:underline">{tenant.contactEmail}</a>
                    </div>
                  )}
                </div>
              </div>

              {/* Bio description info */}
              <div className="md:col-span-2 space-y-6">
                <h4 className="font-bold text-sm text-[#1a1a1a]">Biography / Background</h4>
                {tenant?.description ? (
                  <p className="text-xs text-[#555] leading-relaxed whitespace-pre-wrap">{tenant.description}</p>
                ) : (
                  <p className="text-xs text-[#9ca3af] italic">No bio or organization description details have been added yet.</p>
                )}

                {tenant?.logo && (
                  <div className="pt-6 border-t border-[#f3f4f6] flex items-center gap-4">
                    <img src={tenant.logo} alt="" className="w-16 h-16 object-contain rounded-xl border border-[#e5e7eb] p-2 bg-white" />
                    <div>
                      <span className="block text-xs font-bold text-[#1a1a1a]">{tenant.name}</span>
                      <span className="block text-[10px] text-gray-400">YowEvent Verified Organizer</span>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Dynamic FAQ Accordion */}
            {faqs.length > 0 && (
              <div className="space-y-4 pt-8 border-t border-[#f3f4f6]">
                <h3 className="font-display font-black text-sm text-[#1a1a1a] uppercase tracking-wider mb-2">
                  Frequently Asked Questions
                </h3>
                <div className="space-y-3">
                  {faqs.map((faq, idx) => (
                    <FaqItem key={idx} faq={faq} />
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

        {/* 4. CONTACT TAB */}
        {activeTab === "contact" && (
          <div className="max-w-3xl mx-auto grid md:grid-cols-3 gap-8">

            {/* Contact details */}
            <div className="md:col-span-1 space-y-6">
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="font-bold text-xs text-[#1a1a1a] uppercase tracking-wider mb-2">Connect Directly</h4>

                {tenant?.contactEmail && (
                  <div className="flex items-start gap-3">
                    <Mail size={16} className="text-[var(--primary)] shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Email</span>
                      <a href={`mailto:${tenant.contactEmail}`} className="text-xs font-semibold text-[#1a1a1a] hover:underline break-all">{tenant.contactEmail}</a>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Compass size={16} className="text-[var(--primary)] shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest">Location</span>
                    <span className="text-xs font-semibold text-[#1a1a1a]">Global / Remote</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Inquiry Form */}
            <div className="md:col-span-2 bg-white border border-[#e5e7eb] rounded-3xl p-6 shadow-sm">
              <h3 className="font-display font-bold text-base text-[#1a1a1a] mb-4">Send a Message</h3>

              {formSubmitted ? (
                <div className="text-center py-10 bg-green-50 rounded-2xl border border-green-200">
                  <MessageSquare size={32} className="mx-auto mb-2 text-green-500" />
                  <h4 className="text-sm font-bold text-green-800">Message sent successfully!</h4>
                  <p className="text-xs text-green-600 mt-1">We will get back to you as soon as possible.</p>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Your Name</label>
                      <input
                        type="text"
                        placeholder="John Doe"
                        value={contactForm.name}
                        onChange={e => setContactForm({ ...contactForm, name: e.target.value })}
                        className="w-full bg-gray-50 border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:bg-white focus:border-[var(--primary)] transition-colors"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Your Email</label>
                      <input
                        type="email"
                        placeholder="john@example.com"
                        value={contactForm.email}
                        onChange={e => setContactForm({ ...contactForm, email: e.target.value })}
                        className="w-full bg-gray-50 border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:bg-white focus:border-[var(--primary)] transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. Sponsorship, Event Inquiry"
                      value={contactForm.subject}
                      onChange={e => setContactForm({ ...contactForm, subject: e.target.value })}
                      className="w-full bg-gray-50 border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:bg-white focus:border-[var(--primary)] transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Message Details</label>
                    <textarea
                      rows={5}
                      placeholder="Write your query details here..."
                      value={contactForm.message}
                      onChange={e => setContactForm({ ...contactForm, message: e.target.value })}
                      className="w-full bg-gray-50 border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:bg-white focus:border-[var(--primary)] transition-colors resize-none"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-[var(--primary)] hover:bg-[#c23b02] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Send Message
                  </button>
                </form>
              )}
            </div>

          </div>
        )}

      </main>

      {/* ── FOOTER ── */}
      <footer
        className="bg-white border-t border-[#e5e7eb] py-8 text-center text-xs text-[#666]"
      >
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {tenant?.name}. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Powered by <Link href="/" className="font-bold text-[#1a1a1a] hover:underline hover:text-[var(--primary)] transition-colors">yowEvent</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

function FaqItem({ faq }: { faq: { q: string; a: string } }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-[#e5e7eb] rounded-xl overflow-hidden bg-[#fdfdfd] transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left font-semibold text-xs text-[#1a1a1a] hover:bg-gray-50 transition-colors cursor-pointer"
      >
        <span>{faq.q}</span>
        <span className={`text-[var(--primary)] font-bold transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}>
          ＋
        </span>
      </button>
      {isOpen && (
        <div className="px-5 pb-4 pt-1 text-xs text-[#555] leading-relaxed border-t border-gray-50">
          {faq.a}
        </div>
      )}
    </div>
  );
}

function EventGridCard({ event, primaryColor, accentColor }: { event: any; primaryColor: string; accentColor: string }) {
  const statusBadge =
    event.status === "CANCELLED"
      ? { bg: "bg-red-50", text: "text-red-700", label: "Cancelled" }
      : event.status === "PUBLISHED"
        ? { bg: "bg-green-50", text: "text-green-700", label: "Live" }
        : { bg: "bg-amber-50", text: "text-amber-700", label: event.status };

  return (
    <Link href={`/events/${event.eventId}`} className="group block">
      <div
        className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-[0_20px_50px_var(--hover-glow)] hover:-translate-y-1 transition-all duration-500 border border-[#e5e7eb] flex flex-col h-full bg-[#ffffff] cursor-pointer"
        style={{
          ["--hover-color" as any]: accentColor,
          ["--hover-glow" as any]: `${primaryColor}20`,
        }}
      >
        {/* Cover image */}
        <div className="relative h-44 overflow-hidden bg-stone-100">
          {event.coverImage ? (
            <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-stone-300 text-xs">No Cover Image</div>
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            {event.format && (
              <span className="bg-white/90 backdrop-blur-sm text-[#1a1a1a] text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                {event.format}
              </span>
            )}
            <span className={`${statusBadge.bg} ${statusBadge.text} text-[9px] font-bold px-2 py-0.5 rounded-full`}>
              {statusBadge.label}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 flex flex-col">
          <h3
            className="text-base font-bold text-[#1a1a1a] mb-1.5 group-hover:text-[var(--hover-color)] transition-colors"
          >
            {event.title}
          </h3>
          <p className="text-[#666] text-xs line-clamp-2 mb-4 flex-1">{event.description}</p>

          <div className="space-y-2 pt-4 border-t border-[#f3f4f6]">
            {(event.startDate || event.createdAt) && (
              <div className="flex items-center gap-2 text-xs text-[#555] font-medium">
                <Calendar size={13} style={{ color: primaryColor }} />
                <span>
                  {new Date(event.startDate || event.createdAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric"
                  })}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#555] font-medium">
                <MapPin size={13} style={{ color: primaryColor }} />
                <span>{event.format === "VIRTUAL" ? "Online" : "In Person"}</span>
              </div>
              {event.isPaid ? (
                <span className="font-bold text-gray-800 text-[10px] bg-gray-100 px-2 py-0.5 rounded">Tickets Available</span>
              ) : (
                <span className="font-bold text-green-700 text-[10px] bg-green-50 px-2 py-0.5 rounded">Free</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
