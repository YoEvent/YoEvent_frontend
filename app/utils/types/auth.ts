export interface UserRequest {
  tenantId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  avatar?: string;
  status?: string;
  emailVerified?: boolean;
  lastLogin?: string;
}

export interface UserResponse {
  userId?: string;
  tenantId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  avatar?: string;
  status?: string;
  emailVerified?: boolean;
  createdAt?: string;
  lastLogin?: string;
}

export interface UserRoleRequest {
  userId?: string;
  roleId?: string;
  eventId?: string;
  assignedAt?: string;
  assignedBy?: string;
}

export interface UserRoleResponse {
  id?: string;
  userId?: string;
  roleId?: string;
  eventId?: string;
  assignedAt?: string;
  assignedBy?: string;
}

export interface TenantSettingsRequest {
  tenantId?: string;
  theme?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  customDomain?: string;
  emailSenderName?: string;
  notificationPrefs?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  faviconUrl?: string;
  accentColor?: string;
  backgroundImageUrl?: string;
  socialLinks?: string;
  customCss?: string;
  payoutMomoNumber?: string;
  payoutMomoProvider?: string;
  payoutCardNumber?: string;
  payoutCardExpiry?: string;
}

export interface TenantSettingsResponse {
  settingId?: string;
  tenantId?: string;
  theme?: string;
  timezone?: string;
  language?: string;
  currency?: string;
  customDomain?: string;
  emailSenderName?: string;
  notificationPrefs?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  faviconUrl?: string;
  accentColor?: string;
  backgroundImageUrl?: string;
  socialLinks?: string;
  customCss?: string;
  payoutMomoNumber?: string;
  payoutMomoProvider?: string;
  payoutCardNumber?: string;
  payoutCardExpiry?: string;
}

export interface TenantRequest {
  platformId?: string;
  planId?: string;
  name?: string;
  slug?: string;
  logo?: string;
  bannerUrl?: string;
  industryType?: string;
  type?: string;
  status?: string;
  contactEmail?: string;
  description?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  attendeeCountStat?: number;
  eventCountStat?: number;
  partnerCountStat?: number;
  faqsJson?: string;
}

export interface TenantResponse {
  tenantId?: string;
  platformId?: string;
  planId?: string;
  name?: string;
  slug?: string;
  logo?: string;
  bannerUrl?: string;
  industryType?: string;
  type?: string;
  status?: string;
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
  createdAt?: string;
  contactEmail?: string;
  description?: string;
  websiteUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  attendeeCountStat?: number;
  eventCountStat?: number;
  partnerCountStat?: number;
  faqsJson?: string;
}

export interface CommissionSettingsRequest {
  baseCommissionRate?: number;
  premiumCommissionFlatFee?: number;
}

export interface CommissionSettingsResponse {
  baseCommissionRate?: number;
  premiumCommissionFlatFee?: number;
  updatedAt?: string;
}

export interface SubscriptionPlanRequest {
  name?: string;
  price?: number;
  billingCycle?: string;
  maxEvents?: number;
  maxUsers?: number;
  maxAttendeesPerEvent?: number;
  featuresEnabled?: string;
}

export interface SubscriptionPlanResponse {
  planId?: string;
  name?: string;
  price?: number;
  billingCycle?: string;
  maxEvents?: number;
  maxUsers?: number;
  maxAttendeesPerEvent?: number;
  featuresEnabled?: string;
  createdAt?: string;
}

export interface RoleRequest {
  tenantId?: string;
  name?: string;
  description?: string;
  level?: string;
}

export interface RoleResponse {
  roleId?: string;
  tenantId?: string;
  name?: string;
  description?: string;
  level?: string;
}

export interface RolePermissionRequest {
  roleId?: string;
  permissionId?: string;
}

export interface RolePermissionResponse {
  id?: string;
  roleId?: string;
  permissionId?: string;
}

export interface PlatformRequest {
  name?: string;
  version?: string;
}

export interface PlatformResponse {
  uuid?: string;
  name?: string;
  version?: string;
  createdAt?: string;
}

export interface PermissionRequest {
  name?: string;
  description?: string;
  module?: string;
}

export interface PermissionResponse {
  permissionId?: string;
  name?: string;
  description?: string;
  module?: string;
}

export interface LoginRequest {
  email?: string;
  password?: string;
}

export interface AuthResponse {
  token?: string;
  type?: string;
  userId?: string;
  tenantId?: string;
  email?: string;
  planTier?: string;
}

export interface RegisterRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  phone?: string;
  workspaceName?: string;
  logo?: string;
  bannerUrl?: string;
}
