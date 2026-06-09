const DEFAULT_API_URL = "http://localhost:8080";

/** Base URL for SSR fetches that bypass Next.js rewrites (server components). */
export function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

const BASE_URL = "";

export interface AuthData {
  token: string;
  type: string;
  userId: string;
  tenantId: string;
  email: string;
  planTier: string;
}

export function getStoredAuth(): AuthData | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("ye_token");
  const type = localStorage.getItem("ye_type");
  const userId = localStorage.getItem("ye_userId");
  const tenantId = localStorage.getItem("ye_tenantId");
  const email = localStorage.getItem("ye_email");
  const planTier = localStorage.getItem("ye_planTier");

  if (!token || !userId) return null;
  const cleanTenantId = tenantId === "null" || !tenantId ? "" : tenantId;
  return { token, type: type || "Bearer", userId, tenantId: cleanTenantId, email: email || "", planTier: planTier || "FREE" };
}

export function setStoredAuth(auth: Partial<AuthData> & { token: string; userId: string }) {
  if (typeof window === "undefined") return;
  localStorage.setItem("ye_token", auth.token);
  localStorage.setItem("ye_type", auth.type || "Bearer");
  localStorage.setItem("ye_userId", auth.userId);
  localStorage.setItem("ye_tenantId", auth.tenantId ?? "");
  localStorage.setItem("ye_email", auth.email ?? "");
  localStorage.setItem("ye_planTier", auth.planTier ?? "FREE");
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("ye_token");
  localStorage.removeItem("ye_type");
  localStorage.removeItem("ye_userId");
  localStorage.removeItem("ye_tenantId");
  localStorage.removeItem("ye_email");
  localStorage.removeItem("ye_planTier");
}

export interface ApiRequestInit extends RequestInit {
  skipAuth?: boolean;
  /** When true, a 401 will not clear the stored session (for optional/enrichment calls). */
  suppressSessionClear?: boolean;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: ApiRequestInit = {}): Promise<T> {
  const auth = getStoredAuth();
  const headers = new Headers(options.headers || {});

  const tokenWasSent = !!(auth?.token && !options.skipAuth);
  if (tokenWasSent) {
    headers.set("Authorization", `${auth.type} ${auth.token}`);
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  // Ensure path starts with a slash
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const response = await fetch(url, {
    cache: "no-store",
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `HTTP error! Status: ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson && (errJson.message || errJson.error)) {
        errorMsg = errJson.message || errJson.error;
      }
    } catch {
      // ignore
    }

    if (response.status === 401 && tokenWasSent && !options.suppressSessionClear) {
      clearStoredAuth();
    }

    throw new ApiError(errorMsg, response.status);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, options?: ApiRequestInit) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: any, options?: ApiRequestInit) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  put: <T>(path: string, body?: any, options?: ApiRequestInit) =>
    request<T>(path, {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
  delete: <T>(path: string, options?: ApiRequestInit) => request<T>(path, { ...options, method: "DELETE" }),
  patch: <T>(path: string, body?: any, options?: ApiRequestInit) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
};

export function getAuthClaims(): any {
  const auth = getStoredAuth();
  if (!auth?.token) return null;
  try {
    const base64Url = auth.token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}
