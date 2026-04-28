const envUrl = import.meta.env["VITE_API_URL"] as string | undefined;

export const config = {
  // Пустой базовый URL: пути в api-модулях уже начинаются с /api/...
  // В dev запросы идут на тот же origin и проксируются Vite на backend:8000.
  // В prod nginx проксирует /api/* на backend:8000 (см. nginx.conf).
  baseUrl: envUrl ?? "",
};
