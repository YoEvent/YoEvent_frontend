import { api, ApiRequestInit } from "../api";
import * as T from "../types/events";

export const eventService = {
  // Tracks
  getTracks: () => api.get<T.TrackResponse[]>("api/v1/tracks"),
  createTrack: (data: T.TrackRequest) => api.post<T.TrackResponse>("api/v1/tracks", data),
  getTrackById: (id: string) => api.get<T.TrackResponse>(`api/v1/tracks/${id}`),
  updateTrack: (id: string, data: T.TrackRequest) => api.put<T.TrackResponse>(`api/v1/tracks/${id}`, data),
  deleteTrack: (id: string) => api.delete<void>(`api/v1/tracks/${id}`),

  // Sponsorship Packages
  getSponsorshipPackages: () => api.get<T.SponsorshipPackageResponse[]>("api/v1/sponsorshippackages"),
  createSponsorshipPackage: (data: T.SponsorshipPackageRequest) => api.post<T.SponsorshipPackageResponse>("api/v1/sponsorshippackages", data),
  getSponsorshipPackageById: (id: string) => api.get<T.SponsorshipPackageResponse>(`api/v1/sponsorshippackages/${id}`),
  updateSponsorshipPackage: (id: string, data: T.SponsorshipPackageRequest) => api.put<T.SponsorshipPackageResponse>(`api/v1/sponsorshippackages/${id}`, data),
  deleteSponsorshipPackage: (id: string) => api.delete<void>(`api/v1/sponsorshippackages/${id}`),

  // Sponsors
  getSponsors: (opts?: any) => api.get<T.SponsorResponse[]>("api/v1/sponsors", opts),
  createSponsor: (data: T.SponsorRequest) => api.post<T.SponsorResponse>("api/v1/sponsors", data),
  getSponsorById: (id: string) => api.get<T.SponsorResponse>(`api/v1/sponsors/${id}`),
  updateSponsor: (id: string, data: T.SponsorRequest) => api.put<T.SponsorResponse>(`api/v1/sponsors/${id}`, data),
  deleteSponsor: (id: string) => api.delete<void>(`api/v1/sponsors/${id}`),

  // Session Speakers
  getSessionSpeakers: (opts?: any) => api.get<T.SessionSpeakerResponse[]>("api/v1/sessionspeakers", opts),
  createSessionSpeaker: (data: T.SessionSpeakerRequest) => api.post<T.SessionSpeakerResponse>("api/v1/sessionspeakers", data),
  getSessionSpeakerById: (id: string) => api.get<T.SessionSpeakerResponse>(`api/v1/sessionspeakers/${id}`),
  updateSessionSpeaker: (id: string, data: T.SessionSpeakerRequest) => api.put<T.SessionSpeakerResponse>(`api/v1/sessionspeakers/${id}`, data),
  deleteSessionSpeaker: (id: string) => api.delete<void>(`api/v1/sessionspeakers/${id}`),

  // Sessions
  getSessions: (opts?: any) => api.get<T.SessionResponse[]>("api/v1/sessions", opts),
  createSession: (data: T.SessionRequest) => api.post<T.SessionResponse>("api/v1/sessions", data),
  getSessionById: (id: string) => api.get<T.SessionResponse>(`api/v1/sessions/${id}`),
  updateSession: (id: string, data: T.SessionRequest) => api.put<T.SessionResponse>(`api/v1/sessions/${id}`, data),
  deleteSession: (id: string) => api.delete<void>(`api/v1/sessions/${id}`),

  // Session Attendees
  getSessionAttendees: () => api.get<T.SessionAttendeeResponse[]>("api/v1/sessionattendees"),
  createSessionAttendee: (data: T.SessionAttendeeRequest) => api.post<T.SessionAttendeeResponse>("api/v1/sessionattendees", data),
  getSessionAttendeeById: (id: string) => api.get<T.SessionAttendeeResponse>(`api/v1/sessionattendees/${id}`),
  updateSessionAttendee: (id: string, data: T.SessionAttendeeRequest) => api.put<T.SessionAttendeeResponse>(`api/v1/sessionattendees/${id}`, data),
  deleteSessionAttendee: (id: string) => api.delete<void>(`api/v1/sessionattendees/${id}`),

  // QA Questions
  getQaQuestions: () => api.get<T.QaQuestionResponse[]>("api/v1/qaquestions"),
  createQaQuestion: (data: T.QaQuestionRequest) => api.post<T.QaQuestionResponse>("api/v1/qaquestions", data),
  getQaQuestionById: (id: string) => api.get<T.QaQuestionResponse>(`api/v1/qaquestions/${id}`),
  updateQaQuestion: (id: string, data: T.QaQuestionRequest) => api.put<T.QaQuestionResponse>(`api/v1/qaquestions/${id}`, data),
  deleteQaQuestion: (id: string) => api.delete<void>(`api/v1/qaquestions/${id}`),

  // Polls
  getPolls: () => api.get<T.PollResponse[]>("api/v1/polls"),
  createPoll: (data: T.PollRequest) => api.post<T.PollResponse>("api/v1/polls", data),
  getPollById: (id: string) => api.get<T.PollResponse>(`api/v1/polls/${id}`),
  updatePoll: (id: string, data: T.PollRequest) => api.put<T.PollResponse>(`api/v1/polls/${id}`, data),
  deletePoll: (id: string) => api.delete<void>(`api/v1/polls/${id}`),

  // Poll Responses
  getPollResponses: () => api.get<T.PollResponse[]>("api/v1/poll-responses"),
  createPollResponse: (data: T.PollResponse) => api.post<T.PollResponse>("api/v1/poll-responses", data),
  getPollResponseById: (id: string) => api.get<T.PollResponse>(`api/v1/poll-responses/${id}`),
  updatePollResponse: (id: string, data: T.PollResponse) => api.put<T.PollResponse>(`api/v1/poll-responses/${id}`, data),
  deletePollResponse: (id: string) => api.delete<void>(`api/v1/poll-responses/${id}`),

  // Networkings
  getNetworkings: () => api.get<T.NetworkingResponse[]>("api/v1/networkings"),
  createNetworking: (data: T.NetworkingRequest) => api.post<T.NetworkingResponse>("api/v1/networkings", data),
  getNetworkingById: (id: string) => api.get<T.NetworkingResponse>(`api/v1/networkings/${id}`),
  updateNetworking: (id: string, data: T.NetworkingRequest) => api.put<T.NetworkingResponse>(`api/v1/networkings/${id}`, data),
  deleteNetworking: (id: string) => api.delete<void>(`api/v1/networkings/${id}`),

  // Feedbacks
  getFeedbacks: () => api.get<T.FeedbackResponse[]>("api/v1/feedbacks"),
  createFeedback: (data: T.FeedbackRequest) => api.post<T.FeedbackResponse>("api/v1/feedbacks", data),
  getFeedbackById: (id: string) => api.get<T.FeedbackResponse>(`api/v1/feedbacks/${id}`),
  updateFeedback: (id: string, data: T.FeedbackRequest) => api.put<T.FeedbackResponse>(`api/v1/feedbacks/${id}`, data),
  deleteFeedback: (id: string) => api.delete<void>(`api/v1/feedbacks/${id}`),

  // Exhibitors
  getExhibitors: (opts?: any) => api.get<T.ExhibitorResponse[]>("api/v1/exhibitors", opts),
  createExhibitor: (data: T.ExhibitorRequest) => api.post<T.ExhibitorResponse>("api/v1/exhibitors", data),
  getExhibitorById: (id: string) => api.get<T.ExhibitorResponse>(`api/v1/exhibitors/${id}`),
  updateExhibitor: (id: string, data: T.ExhibitorRequest) => api.put<T.ExhibitorResponse>(`api/v1/exhibitors/${id}`, data),
  deleteExhibitor: (id: string) => api.delete<void>(`api/v1/exhibitors/${id}`),

  // Event Types
  getEventTypes: () => api.get<T.EventTypeResponse[]>("api/v1/eventtypes"),
  createEventType: (data: T.EventTypeRequest) => api.post<T.EventTypeResponse>("api/v1/eventtypes", data),
  getEventTypeById: (id: string) => api.get<T.EventTypeResponse>(`api/v1/eventtypes/${id}`),
  updateEventType: (id: string, data: T.EventTypeRequest) => api.put<T.EventTypeResponse>(`api/v1/eventtypes/${id}`, data),
  deleteEventType: (id: string) => api.delete<void>(`api/v1/eventtypes/${id}`),

  // Event Settings
  getEventSettings: () => api.get<T.EventSettingsResponse[]>("api/v1/eventsettingss"),
  createEventSetting: (data: T.EventSettingsRequest) => api.post<T.EventSettingsResponse>("api/v1/eventsettingss", data),
  getEventSettingById: (id: string) => api.get<T.EventSettingsResponse>(`api/v1/eventsettingss/${id}`),
  updateEventSetting: (id: string, data: T.EventSettingsRequest) => api.put<T.EventSettingsResponse>(`api/v1/eventsettingss/${id}`, data),
  deleteEventSetting: (id: string) => api.delete<void>(`api/v1/eventsettingss/${id}`),

  // Event Schedules
  getEventSchedules: () => api.get<T.EventScheduleResponse[]>("api/v1/eventschedules"),
  createEventSchedule: (data: T.EventScheduleRequest) => api.post<T.EventScheduleResponse>("api/v1/eventschedules", data),
  getEventScheduleById: (id: string) => api.get<T.EventScheduleResponse>(`api/v1/eventschedules/${id}`),
  updateEventSchedule: (id: string, data: T.EventScheduleRequest) => api.put<T.EventScheduleResponse>(`api/v1/eventschedules/${id}`, data),
  deleteEventSchedule: (id: string) => api.delete<void>(`api/v1/eventschedules/${id}`),

  // Events
  getEvents: (opts?: any) => api.get<T.EventResponse[]>("api/v1/events", opts),
  getMyEvents: () => api.get<T.EventResponse[]>("api/v1/events/mine"),
  getPublicEventsByTenant: async (tenantId: string) => {
    if (!tenantId) return [];
    const all = await api.get<T.EventResponse[]>("api/v1/events", { skipAuth: true });
    return all.filter((e) => e.tenantId === tenantId);
  },
  /** @deprecated Use getMyEvents() for authenticated organizer views or getPublicEventsByTenant() for public pages */
  getEventsByTenant: (tenantId: string) => api.get<T.EventResponse[]>("api/v1/events/mine"),
  createEvent: (data: T.EventRequest) => api.post<T.EventResponse>("api/v1/events", data),
  getEventById: (id: string, opts?: ApiRequestInit) => api.get<T.EventResponse>(`api/v1/events/${id}`, opts),
  updateEvent: (id: string, data: T.EventRequest) => api.put<T.EventResponse>(`api/v1/events/${id}`, data),
  cancelEvent: (id: string) => api.patch<T.EventResponse>(`api/v1/events/${id}/cancel`),
  cloneEvent: (id: string) => api.post<T.EventResponse>(`api/v1/events/${id}/clone`),
  deleteEvent: (id: string) => api.delete<void>(`api/v1/events/${id}`),
  uploadCoverImage: (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<{ url: string }>(`api/v1/events/${id}/cover-image`, formData);
  },
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<{ url: string }>(`api/v1/events/upload-image`, formData);
  },

  // Event Locations
  getEventLocations: (opts?: any) => api.get<T.EventLocationResponse[]>("api/v1/eventlocations", opts),
  createEventLocation: (data: T.EventLocationRequest) => api.post<T.EventLocationResponse>("api/v1/eventlocations", data),
  getEventLocationById: (id: string) => api.get<T.EventLocationResponse>(`api/v1/eventlocations/${id}`),
  updateEventLocation: (id: string, data: T.EventLocationRequest) => api.put<T.EventLocationResponse>(`api/v1/eventlocations/${id}`, data),
  deleteEventLocation: (id: string) => api.delete<void>(`api/v1/eventlocations/${id}`),

  // Event Categories
  getEventCategories: () => api.get<T.EventCategoryResponse[]>("api/v1/eventcategorys"),
  createEventCategory: (data: T.EventCategoryRequest) => api.post<T.EventCategoryResponse>("api/v1/eventcategorys", data),
  getEventCategoryById: (id: string) => api.get<T.EventCategoryResponse>(`api/v1/eventcategorys/${id}`),
  updateEventCategory: (id: string, data: T.EventCategoryRequest) => api.put<T.EventCategoryResponse>(`api/v1/eventcategorys/${id}`, data),
  deleteEventCategory: (id: string) => api.delete<void>(`api/v1/eventcategorys/${id}`),

  // Event Analytics
  getEventAnalytics: () => api.get<T.EventAnalyticsResponse[]>("api/v1/eventanalyticss"),
  createEventAnalytics: (data: T.EventAnalyticsRequest) => api.post<T.EventAnalyticsResponse>("api/v1/eventanalyticss", data),
  getEventAnalyticsById: (id: string) => api.get<T.EventAnalyticsResponse>(`api/v1/eventanalyticss/${id}`),
  updateEventAnalytics: (id: string, data: T.EventAnalyticsRequest) => api.put<T.EventAnalyticsResponse>(`api/v1/eventanalyticss/${id}`, data),
  deleteEventAnalytics: (id: string) => api.delete<void>(`api/v1/eventanalyticss/${id}`),

  // Announcements
  getAnnouncements: () => api.get<T.AnnouncementResponse[]>("api/v1/announcements"),
  createAnnouncement: (data: T.AnnouncementRequest) => api.post<T.AnnouncementResponse>("api/v1/announcements", data),
  getAnnouncementById: (id: string) => api.get<T.AnnouncementResponse>(`api/v1/announcements/${id}`),
  updateAnnouncement: (id: string, data: T.AnnouncementRequest) => api.put<T.AnnouncementResponse>(`api/v1/announcements/${id}`, data),
  deleteAnnouncement: (id: string) => api.delete<void>(`api/v1/announcements/${id}`),

  // Ticket Types
  getTicketTypes: (eventIdOrOpts?: string | { skipAuth?: boolean }, opts?: any) => {
    let url = "api/v1/tickettypes";
    let apiOpts = opts;
    if (typeof eventIdOrOpts === "string") {
      url = `api/v1/tickettypes?eventId=${eventIdOrOpts}`;
    } else if (eventIdOrOpts && typeof eventIdOrOpts === "object") {
      apiOpts = eventIdOrOpts;
    }
    return api.get<T.TicketTypeResponse[]>(url, apiOpts);
  },
  createTicketType: (data: T.TicketTypeRequest) => api.post<T.TicketTypeResponse>("api/v1/tickettypes", data),
  getTicketTypeById: (id: string) => api.get<T.TicketTypeResponse>(`api/v1/tickettypes/${id}`),
  updateTicketType: (id: string, data: T.TicketTypeRequest) => api.put<T.TicketTypeResponse>(`api/v1/tickettypes/${id}`, data),
  deleteTicketType: (id: string) => api.delete<void>(`api/v1/tickettypes/${id}`),

  // Coupons
  getCoupons: (opts?: any) => api.get<T.CouponResponse[]>("api/v1/coupons", opts),
  createCoupon: (data: T.CouponRequest) => api.post<T.CouponResponse>("api/v1/coupons", data),
  getCouponById: (id: string) => api.get<T.CouponResponse>(`api/v1/coupons/${id}`),
  updateCoupon: (id: string, data: T.CouponRequest) => api.put<T.CouponResponse>(`api/v1/coupons/${id}`, data),
  deleteCoupon: (id: string) => api.delete<void>(`api/v1/coupons/${id}`),

  // Registrations
  getMyRegistrations: () => api.get<any[]>("api/v1/registrations/me"),
  getMyTenantRegistrations: () => api.get<any[]>("api/v1/registrations/mine"),
  getRegistrationsByEvent: (eventId: string) => api.get<any[]>(`api/v1/registrations/event/${eventId}`),
  createRegistration: (data: any) => api.post<any>("api/v1/registrations", data),
  getRegistrationById: (id: string) => api.get<any>(`api/v1/registrations/${id}`),
  checkInRegistration: (id: string) => api.post<any>(`api/v1/registrations/${id}/checkin`),

  // Orders
  getOrders: () => api.get<T.OrderResponse[]>("api/v1/orders"),
  getMyOrders: () => api.get<T.OrderResponse[]>("api/v1/orders/me", { suppressSessionClear: true }),
  getOrdersByUser: (userId: string) => api.get<T.OrderResponse[]>(`api/v1/orders/user/${userId}`),
  createOrder: (data: T.OrderRequest) => api.post<T.OrderResponse>("api/v1/orders", data),
  getOrderById: (id: string) => api.get<T.OrderResponse>(`api/v1/orders/${id}`),
  updateOrder: (id: string, data: T.OrderRequest) => api.put<T.OrderResponse>(`api/v1/orders/${id}`, data),
  deleteOrder: (id: string) => api.delete<void>(`api/v1/orders/${id}`),

  // Order Items
  getOrderItems: () => api.get<T.OrderItemResponse[]>("api/v1/orderitems"),
  createOrderItem: (data: T.OrderItemRequest) => api.post<T.OrderItemResponse>("api/v1/orderitems", data),
  getOrderItemById: (id: string) => api.get<T.OrderItemResponse>(`api/v1/orderitems/${id}`),
  updateOrderItem: (id: string, data: T.OrderItemRequest) => api.put<T.OrderItemResponse>(`api/v1/orderitems/${id}`, data),
  deleteOrderItem: (id: string) => api.delete<void>(`api/v1/orderitems/${id}`),

  // Email Campaigns
  getEmailCampaigns: () => api.get<T.EmailCampaignResponse[]>("api/v1/emailcampaigns"),
  createEmailCampaign: (data: T.EmailCampaignRequest) => api.post<T.EmailCampaignResponse>("api/v1/emailcampaigns", data),
  getEmailCampaignById: (id: string) => api.get<T.EmailCampaignResponse>(`api/v1/emailcampaigns/${id}`),
  updateEmailCampaign: (id: string, data: T.EmailCampaignRequest) => api.put<T.EmailCampaignResponse>(`api/v1/emailcampaigns/${id}`, data),
  deleteEmailCampaign: (id: string) => api.delete<void>(`api/v1/emailcampaigns/${id}`),

  // Saved Events
  getSavedEventsByUser: (userId: string) => api.get<any[]>(`api/v1/saved-events/user/${userId}`),
  saveEvent: (data: { tenantId: string; userId: string; eventId: string }) => api.post<any>("api/v1/saved-events", data),
  unsaveEvent: (id: string) => api.delete<void>(`api/v1/saved-events/${id}`),
  unsaveEventByUserAndEvent: (userId: string, eventId: string) => api.delete<void>(`api/v1/saved-events/user/${userId}/event/${eventId}`),

  // Event Sections
  getEventSections: (eventId?: string) => api.get<any[]>(eventId ? `api/v1/event-sections?eventId=${eventId}` : "api/v1/event-sections"),
  createEventSection: (data: any) => api.post<any>("api/v1/event-sections", data),
  updateEventSection: (id: string, data: any) => api.put<any>(`api/v1/event-sections/${id}`, data),
  deleteEventSection: (id: string) => api.delete<void>(`api/v1/event-sections/${id}`)
};
