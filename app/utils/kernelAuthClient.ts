const KERNEL_BASE_URL = process.env.NEXT_PUBLIC_KERNEL_BASE_URL || "https://kernel-core.yowyob.com/kernel-api";
const KERNEL_CLIENT_ID = process.env.NEXT_PUBLIC_KERNEL_CLIENT_ID || "evental";
const KERNEL_API_KEY = process.env.NEXT_PUBLIC_KERNEL_API_KEY || "0sPeBFtLW3aKyEbfoOWsXZCXG292xDhi7gkxU9rK";
const KERNEL_CONTEXT_ID = process.env.NEXT_PUBLIC_KERNEL_CONTEXT_ID || "11111111-1111-1111-1111-111111111111";

export interface KernelAuthResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  errorCode?: string;
  timestamp?: string;
}

export interface KernelLoginData {
  id?: string;
  tenantId?: string;
  actorId?: string;
  username?: string;
  email?: string;
  accessToken?: string;
  refreshToken?: string;
  mfaToken?: string;
  selectionToken?: string;
  [key: string]: any;
}

async function kernelFetch<T>(endpoint: string, options: RequestInit = {}, tenantId?: string): Promise<KernelAuthResponse<T>> {
  const url = `${KERNEL_BASE_URL.replace(/\/$/, "")}/${endpoint.replace(/^\//, "")}`;
  const activeTenantId = tenantId || KERNEL_CONTEXT_ID;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Client-Id": KERNEL_CLIENT_ID,
    "X-Api-Key": KERNEL_API_KEY,
    ...(activeTenantId ? { "X-Tenant-Id": activeTenantId } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok || json.success === false) {
    const errorMsg = json.message || json.errorCode || `Kernel API error (${res.status})`;
    throw new Error(errorMsg);
  }

  return json;
}

export const kernelAuthClient = {
  discoverContexts: (principal: string, password: string) => {
    return kernelFetch<any>("api/auth/discover-contexts", {
      method: "POST",
      body: JSON.stringify({ principal, password, email: principal }),
    });
  },

  login: async (principal: string, password: string, tenantId?: string) => {
    try {
      return await kernelFetch<KernelLoginData>("api/auth/login", {
        method: "POST",
        body: JSON.stringify({ principal, password }),
      }, tenantId);
    } catch (err: any) {
      const errorStr = String(err?.message || "");
      if (errorStr.includes("Tenant requis") || errorStr.includes("discover-contexts")) {
        try {
          const contextsRes = await kernelFetch<any>("api/auth/discover-contexts", {
            method: "POST",
            body: JSON.stringify({ principal, password, email: principal }),
          });

          const rawData = contextsRes?.data || contextsRes;
          const contexts = Array.isArray(rawData)
            ? rawData
            : (rawData.contexts || rawData.tenantContexts || []);

          const chosenTenantId = tenantId || contexts[0]?.contextId || contexts[0]?.tenantId || contexts[0]?.id || "";
          if (chosenTenantId) {
            return await kernelFetch<KernelLoginData>("api/auth/login", {
              method: "POST",
              body: JSON.stringify({ principal, password }),
            }, chosenTenantId);
          }
        } catch (discErr) {
          console.warn("Kernel discover-contexts warning:", discErr);
        }
      }
      throw err;
    }
  },

  signUp: (payload: {
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    password?: string;
    phoneNumber?: string;
    tenantId?: string;
    contextId?: string;
  }) => {
    const fullPayload = {
      tenantId: KERNEL_CONTEXT_ID,
      contextId: KERNEL_CONTEXT_ID,
      ...payload,
    };
    return kernelFetch<any>("api/auth/sign-up", {
      method: "POST",
      body: JSON.stringify(fullPayload),
    });
  },

  requestOtp: (channel: "EMAIL" | "SMS", recipient: string, purpose = "REGISTRATION_VERIFICATION") => {
    return kernelFetch<{
      deliveryMode: string;
      challengeToken: string;
      codePreview?: string;
      expiresInSeconds: number;
    }>("api/auth/otp", {
      method: "POST",
      body: JSON.stringify({ channel, recipient, purpose }),
    });
  },

  verifyOtp: (challengeToken: string, code: string, purpose = "REGISTRATION_VERIFICATION") => {
    return kernelFetch<{
      verified: boolean;
      channel: string;
      recipient: string;
      purpose: string;
    }>("api/auth/otp/verify", {
      method: "POST",
      body: JSON.stringify({ challengeToken, code, purpose }),
    });
  },

  forgotPassword: (principal: string) => {
    return kernelFetch<{
      principal: string;
      matchingAccountCount: number;
      selectionToken?: string;
      contexts?: Array<{ contextId: string; email: string }>;
    }>("api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ principal }),
    });
  },

  issuePasswordReset: (selectionToken: string, contextId: string) => {
    return kernelFetch<{
      deliveryMode: string;
      challengeTokenPreview: string;
      expiresInSeconds: number;
    }>("api/auth/password-reset/issue", {
      method: "POST",
      body: JSON.stringify({ selectionToken, contextId }),
    });
  },

  resetPassword: (resetToken: string, newPassword: string) => {
    return kernelFetch<any>("api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ resetToken, newPassword }),
    });
  },

  sendNotification: (payload: {
    channel: "EMAIL" | "SMS" | "WHATSAPP" | "PUSH" | "WEBSOCKET";
    recipientAddress: string;
    subject?: string;
    body: string;
    templateCode?: string;
    variables?: Record<string, any>;
    metadata?: Record<string, string>;
  }) => {
    return kernelFetch<any>("api/notifications/deliveries", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  scheduleReminder: (payload: {
    channel: "EMAIL" | "SMS" | "WHATSAPP" | "PUSH" | "WEBSOCKET";
    recipientAddress: string;
    dueAt: string;
    templateCode: string;
    variables?: Record<string, any>;
    metadata?: Record<string, string>;
  }) => {
    return kernelFetch<any>("api/notifications/reminders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  saveNotificationTemplate: (payload: {
    code: string;
    channel: "EMAIL" | "SMS" | "WHATSAPP" | "PUSH" | "WEBSOCKET";
    locale?: string;
    subjectTemplate?: string;
    bodyTemplate: string;
    active?: boolean;
  }) => {
    return kernelFetch<any>("api/notifications/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  listNotificationDeliveries: () => {
    return kernelFetch<any[]>("api/notifications/deliveries", {
      method: "GET",
    });
  },
};
