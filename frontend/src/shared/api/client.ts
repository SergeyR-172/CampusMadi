import { config } from "#/shared/config";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const parseDetail = (detail: unknown): string | null => {
  if (!detail) return null;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          const msg = (item as { msg?: unknown }).msg;
          return typeof msg === "string" ? msg : null;
        }
        return null;
      })
      .filter((m): m is string => Boolean(m));
    return messages.length > 0 ? messages.join("; ") : null;
  }
  if (typeof detail === "object" && "msg" in detail) {
    const msg = (detail as { msg?: unknown }).msg;
    if (typeof msg === "string") return msg;
  }
  return null;
};

const REFRESH_PATH = "/api/jwt/refresh";
const LOGIN_PATH = "/api/jwt/login";
const LOGOUT_PATH = "/api/jwt/logout";

let refreshPromise: Promise<boolean> | null = null;

const performRefresh = (): Promise<boolean> => {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${config.baseUrl}${REFRESH_PATH}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      setTimeout(() => {
        refreshPromise = null;
      }, 0);
    }
  })();
  return refreshPromise;
};

const doFetch = (path: string, init?: RequestInit): Promise<Response> =>
  fetch(`${config.baseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

const isAuthPath = (path: string): boolean =>
  path === REFRESH_PATH || path === LOGIN_PATH || path === LOGOUT_PATH;

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response = await doFetch(path, init);

  if (response.status === 401 && !isAuthPath(path)) {
    const refreshed = await performRefresh();
    if (refreshed) {
      response = await doFetch(path, init);
    }
  }

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { detail?: unknown };
      const parsed = parseDetail(body.detail);
      if (parsed) message = parsed;
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
