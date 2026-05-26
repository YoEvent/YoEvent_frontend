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
  createdAt?: string;
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
