const BASE_URL = "";

export interface AuthData {
  token: string;
  type: string;
  userId: string;
  tenantId: string;
  email: string;
}

export function getStoredAuth(): AuthData | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem("ye_token");
  const type = localStorage.getItem("ye_type");
  const userId = localStorage.getItem("ye_userId");
  const tenantId = localStorage.getItem("ye_tenantId");
  const email = localStorage.getItem("ye_email");

  if (!token || !userId) return null;
  const cleanTenantId = tenantId === "null" || !tenantId ? "" : tenantId;
  return { token, type: type || "Bearer", userId, tenantId: cleanTenantId, email: email || "" };
}

export function setStoredAuth(auth: AuthData) {
  if (typeof window === "undefined") return;
  localStorage.setItem("ye_token", auth.token);
  localStorage.setItem("ye_type", auth.type || "Bearer");
  localStorage.setItem("ye_userId", auth.userId);
  localStorage.setItem("ye_tenantId", auth.tenantId);
  localStorage.setItem("ye_email", auth.email);
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("ye_token");
  localStorage.removeItem("ye_type");
  localStorage.removeItem("ye_userId");
  localStorage.removeItem("ye_tenantId");
  localStorage.removeItem("ye_email");
}

export interface ApiRequestInit extends RequestInit {
  skipAuth?: boolean;
}

async function request<T>(path: string, options: ApiRequestInit = {}): Promise<T> {
  const auth = getStoredAuth();
  const headers = new Headers(options.headers || {});

  if (auth?.token && !options.skipAuth) {
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
    throw new Error(errorMsg);
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
