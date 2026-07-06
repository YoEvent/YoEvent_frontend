// These types are derived from the event-service API schemas.
// Since the full schema definitions were partially truncated, 
// these are base interfaces that can be extended as needed.

export interface TrackRequest extends Record<string, any> {}
export interface TrackResponse extends Record<string, any> { id?: string; }

export interface SponsorshipPackageRequest extends Record<string, any> {}
export interface SponsorshipPackageResponse extends Record<string, any> { id?: string; packageId?: string; applicationStart?: string; applicationEnd?: string; }

export interface VolunteerOpeningRequest extends Record<string, any> {}
export interface VolunteerOpeningResponse extends Record<string, any> { openingId?: string; applicationStart?: string; applicationEnd?: string; }

export interface SponsorRequest extends Record<string, any> {}
export interface SponsorResponse extends Record<string, any> { id?: string; }

export interface SessionSpeakerRequest extends Record<string, any> {}
export interface SessionSpeakerResponse extends Record<string, any> { id?: string; }

export interface SessionRequest extends Record<string, any> {}
export interface SessionResponse extends Record<string, any> { id?: string; }

export interface SessionAttendeeRequest extends Record<string, any> {}
export interface SessionAttendeeResponse extends Record<string, any> { id?: string; }

export interface QaQuestionRequest extends Record<string, any> {}
export interface QaQuestionResponse extends Record<string, any> { id?: string; }

export interface PollRequest extends Record<string, any> {}
export interface PollResponse extends Record<string, any> { id?: string; }

export interface NetworkingRequest extends Record<string, any> {}
export interface NetworkingResponse extends Record<string, any> { id?: string; }

export interface FeedbackRequest extends Record<string, any> {}
export interface FeedbackResponse extends Record<string, any> { id?: string; }

export interface ExhibitorRequest extends Record<string, any> {}
export interface ExhibitorResponse extends Record<string, any> { id?: string; }

export interface EventTypeRequest extends Record<string, any> {}
export interface EventTypeResponse extends Record<string, any> { id?: string; }

export interface EventSettingsRequest extends Record<string, any> {}
export interface EventSettingsResponse extends Record<string, any> { id?: string; }

export interface EventScheduleRequest extends Record<string, any> {}
export interface EventScheduleResponse extends Record<string, any> { id?: string; }

export interface EventRequest extends Record<string, any> {}
export interface EventResponse extends Record<string, any> { id?: string; }

export interface EventLocationRequest extends Record<string, any> {}
export interface EventLocationResponse extends Record<string, any> { id?: string; }

export interface EventCategoryRequest extends Record<string, any> {}
export interface EventCategoryResponse extends Record<string, any> { id?: string; }

export interface EventAnalyticsRequest extends Record<string, any> {}
export interface EventAnalyticsResponse extends Record<string, any> { id?: string; }

export interface AnnouncementRequest extends Record<string, any> {}
export interface AnnouncementResponse extends Record<string, any> { id?: string; }

export interface TicketTypeRequest extends Record<string, any> {}
export interface TicketTypeResponse extends Record<string, any> { id?: string; }

export interface CouponRequest extends Record<string, any> {}
export interface CouponResponse extends Record<string, any> { id?: string; }

export interface OrderRequest extends Record<string, any> {}
export interface OrderResponse extends Record<string, any> { id?: string; }

export interface EmailCampaignRequest extends Record<string, any> {}
export interface EmailCampaignResponse extends Record<string, any> { id?: string; }

export interface OrderItemRequest extends Record<string, any> {}
export interface OrderItemResponse extends Record<string, any> { id?: string; }
