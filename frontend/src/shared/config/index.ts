export const config = {
  baseUrl: (import.meta.env["VITE_API_URL"] as string | undefined) ?? "http://localhost:8000",
};
