import { queryOptions, useQuery } from "@tanstack/react-query";

import type { UserSchema } from "#/shared/api";
import { ApiError, authApi } from "#/shared/api";

export const userKeys = {
  me: ["user", "me"] as const,
};

export const fetchCurrentUser = async (): Promise<UserSchema | null> => {
  try {
    return await authApi.me();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    throw err;
  }
};

export const meQueryOptions = queryOptions<UserSchema | null>({
  queryKey: userKeys.me,
  queryFn: fetchCurrentUser,
  staleTime: 5 * 60_000,
});

export const useCurrentUser = () => {
  const query = useQuery(meQueryOptions);
  return {
    user: query.data ?? null,
    isLoading: query.isPending,
    isError: query.isError,
  };
};
