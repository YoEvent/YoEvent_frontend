import { api } from "../api";
import * as T from "../types/auth";

export const authService = {
  // Users
  getUsers: () => api.get<T.UserResponse[]>("api/v1/users"),
  createUser: (data: T.UserRequest) => api.post<T.UserResponse>("api/v1/users", data),
  getUserById: (id: string) => api.get<T.UserResponse>(`api/v1/users/${id}`),
  updateUser: (id: string, data: T.UserRequest) => api.put<T.UserResponse>(`api/v1/users/${id}`, data),
  deleteUser: (id: string) => api.delete<void>(`api/v1/users/${id}`),

  // User Roles
  getUserRoles: () => api.get<T.UserRoleResponse[]>("api/v1/userroles"),
  createUserRole: (data: T.UserRoleRequest) => api.post<T.UserRoleResponse>("api/v1/userroles", data),
  getUserRoleById: (id: string) => api.get<T.UserRoleResponse>(`api/v1/userroles/${id}`),
  updateUserRole: (id: string, data: T.UserRoleRequest) => api.put<T.UserRoleResponse>(`api/v1/userroles/${id}`, data),
  deleteUserRole: (id: string) => api.delete<void>(`api/v1/userroles/${id}`),

  // Tenant Settings
  getTenantSettings: () => api.get<T.TenantSettingsResponse[]>("api/v1/tenantsettingss"),
  createTenantSetting: (data: T.TenantSettingsRequest) => api.post<T.TenantSettingsResponse>("api/v1/tenantsettingss", data),
  getTenantSettingById: (id: string) => api.get<T.TenantSettingsResponse>(`api/v1/tenantsettingss/${id}`),
  getMyTenantSettings: () => api.get<T.TenantSettingsResponse>("api/v1/tenantsettingss/mine"),
  /** @deprecated Use getMyTenantSettings() */
  getTenantSettingByTenantId: (_tenantId: string) => api.get<T.TenantSettingsResponse>("api/v1/tenantsettingss/mine"),
  updateTenantSetting: (id: string, data: T.TenantSettingsRequest) => api.put<T.TenantSettingsResponse>(`api/v1/tenantsettingss/${id}`, data),
  deleteTenantSetting: (id: string) => api.delete<void>(`api/v1/tenantsettingss/${id}`),

  // Tenants
  getTenants: () => api.get<T.TenantResponse[]>("api/v1/tenants"),
  createTenant: (data: T.TenantRequest) => api.post<T.TenantResponse>("api/v1/tenants", data),
  getTenantById: (id: string) => api.get<T.TenantResponse>(`api/v1/tenants/${id}`),
  updateTenant: (id: string, data: T.TenantRequest) => api.put<T.TenantResponse>(`api/v1/tenants/${id}`, data),
  deleteTenant: (id: string) => api.delete<void>(`api/v1/tenants/${id}`),
  upgradeTenantToOrganization: (id: string) => api.patch<T.TenantResponse>(`api/v1/tenants/${id}/upgrade-to-organization`),

  // Subscription Plans
  getSubscriptionPlans: (opts?: any) => api.get<T.SubscriptionPlanResponse[]>("api/v1/subscriptionplans", opts),
  createSubscriptionPlan: (data: T.SubscriptionPlanRequest) => api.post<T.SubscriptionPlanResponse>("api/v1/subscriptionplans", data),
  getSubscriptionPlanById: (id: string) => api.get<T.SubscriptionPlanResponse>(`api/v1/subscriptionplans/${id}`),
  updateSubscriptionPlan: (id: string, data: T.SubscriptionPlanRequest) => api.put<T.SubscriptionPlanResponse>(`api/v1/subscriptionplans/${id}`, data),
  deleteSubscriptionPlan: (id: string) => api.delete<void>(`api/v1/subscriptionplans/${id}`),

  // Roles
  getRoles: () => api.get<T.RoleResponse[]>("api/v1/roles"),
  createRole: (data: T.RoleRequest) => api.post<T.RoleResponse>("api/v1/roles", data),
  getRoleById: (id: string) => api.get<T.RoleResponse>(`api/v1/roles/${id}`),
  updateRole: (id: string, data: T.RoleRequest) => api.put<T.RoleResponse>(`api/v1/roles/${id}`, data),
  deleteRole: (id: string) => api.delete<void>(`api/v1/roles/${id}`),

  // Role Permissions
  getRolePermissions: () => api.get<T.RolePermissionResponse[]>("api/v1/rolepermissions"),
  createRolePermission: (data: T.RolePermissionRequest) => api.post<T.RolePermissionResponse>("api/v1/rolepermissions", data),
  getRolePermissionById: (id: string) => api.get<T.RolePermissionResponse>(`api/v1/rolepermissions/${id}`),
  updateRolePermission: (id: string, data: T.RolePermissionRequest) => api.put<T.RolePermissionResponse>(`api/v1/rolepermissions/${id}`, data),
  deleteRolePermission: (id: string) => api.delete<void>(`api/v1/rolepermissions/${id}`),

  // Platforms
  getPlatforms: () => api.get<T.PlatformResponse[]>("api/v1/platforms"),
  createPlatform: (data: T.PlatformRequest) => api.post<T.PlatformResponse>("api/v1/platforms", data),
  getPlatformById: (id: string) => api.get<T.PlatformResponse>(`api/v1/platforms/${id}`),
  updatePlatform: (id: string, data: T.PlatformRequest) => api.put<T.PlatformResponse>(`api/v1/platforms/${id}`, data),
  deletePlatform: (id: string) => api.delete<void>(`api/v1/platforms/${id}`),

  // Permissions
  getPermissions: () => api.get<T.PermissionResponse[]>("api/v1/permissions"),
  createPermission: (data: T.PermissionRequest) => api.post<T.PermissionResponse>("api/v1/permissions", data),
  getPermissionById: (id: string) => api.get<T.PermissionResponse>(`api/v1/permissions/${id}`),
  updatePermission: (id: string, data: T.PermissionRequest) => api.put<T.PermissionResponse>(`api/v1/permissions/${id}`, data),
  deletePermission: (id: string) => api.delete<void>(`api/v1/permissions/${id}`),

  // Media
  uploadUserAvatar: (userId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<Record<string, string>>(`api/v1/media/users/${userId}/avatar`, formData);
  },
  uploadTenantLogo: (tenantId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<Record<string, string>>(`api/v1/media/tenants/${tenantId}/logo`, formData);
  },
  uploadTenantBanner: (tenantId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.post<Record<string, string>>(`api/v1/media/tenants/${tenantId}/banner`, formData);
  },

  // Stripe Connect
  stripeConnect: (tenantId: string) => api.post<{ accountId: string; onboardingUrl: string; mode?: string }>(`api/v1/tenants/${tenantId}/stripe/connect`),
  stripeStatus: (tenantId: string) => api.get<{ connected: boolean; accountId?: string; chargesEnabled?: boolean; payoutsEnabled?: boolean; detailsSubmitted?: boolean; onboardingComplete?: boolean; mode?: string }>(`api/v1/tenants/${tenantId}/stripe/status`),

  // Platform Commission Settings
  getCommissionSettings: () => api.get<T.CommissionSettingsResponse>("api/v1/platforms/commission"),
  updateCommissionSettings: (data: T.CommissionSettingsRequest) => api.put<T.CommissionSettingsResponse>("api/v1/platforms/commission", data),

  // Platform Revenue & Withdrawals
  getPlatformRevenue: () => api.get<{ totalCollected: number; totalWithdrawn: number; availableBalance: number }>("api/v1/platform/revenue"),
  getPlatformWithdrawals: () => api.get<any[]>("api/v1/platform/withdrawals"),
  recordPlatformWithdrawal: (data: { amount: number; note: string }) => api.post<any>("api/v1/platform/withdrawals", data),

  // Plan limits
  getMyPlanLimits: () => api.get<{ tenantId: string; planName: string; maxEvents: number; maxUsers: number; maxAttendeesPerEvent: number }>("api/v1/tenants/me/limits"),

  // Auth
  superAdminLogin: (data: T.LoginRequest) => api.post<T.AuthResponse>("api/v1/auth/super-admin/login", data),
  register: (data: T.RegisterRequest) => api.post<T.AuthResponse>("api/v1/auth/register", data),
  login: (data: T.LoginRequest) => api.post<T.AuthResponse>("api/v1/auth/login", data),
  upgradeToOrganizer: (data: { workspaceName: string; type: string; planName: string }) =>
    api.post<T.AuthResponse>("/api/v1/auth/upgrade-to-organizer", data),
  getTenantBySlug: (slug: string) =>
    api.get<T.TenantResponse>(`/api/v1/tenants/by-slug/${encodeURIComponent(slug)}`, { skipAuth: true }),
};
