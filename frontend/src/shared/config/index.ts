const envUrl = import.meta.env["VITE_API_URL"] as string | undefined;

export const config = {
  // SSR: use full URL (no CORS); browser: use relative URL so Vite proxy handles it
  baseUrl: typeof window === "undefined"
    ? (envUrl ?? "http://localhost:8000")
    : (envUrl ?? ""),
};
