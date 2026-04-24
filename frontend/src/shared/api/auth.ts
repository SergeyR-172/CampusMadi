import { apiClient } from "./client";
import type { TokenInfo, UserLogin, UserSchema } from "./types";

export const authApi = {
  me: () => apiClient.get<UserSchema>("/api/jwt/me"),
  login: (data: UserLogin) => apiClient.post<TokenInfo>("/api/jwt/login", data),
  logout: () => apiClient.post<void>("/api/jwt/logout"),
  refresh: () => apiClient.post<TokenInfo>("/api/jwt/refresh"),
};
