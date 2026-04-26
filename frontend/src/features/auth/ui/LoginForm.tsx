import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { userKeys } from "#/entities/user";
import type { UserSchema } from "#/shared/api";
import { ApiError, authApi } from "#/shared/api";
import { cn } from "#/shared/lib";

type Props = {
  onSuccess: (user: UserSchema) => void;
};

export const LoginForm = ({ onSuccess }: Props) => {
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loginMutation = useMutation({
    mutationFn: async (creds: { username: string; password: string }) => {
      await authApi.login(creds);
      return authApi.me();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(userKeys.me, user);
      onSuccess(user);
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 401) {
        setError("Неверный логин или пароль");
      } else {
        setError("Ошибка сервера. Попробуйте позже.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate({ username, password });
  };

  const isPending = loginMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <h1
        className="text-3xl font-semibold text-foreground"
        style={{ fontFamily: "Roboto, sans-serif" }}
      >
        Авторизация
      </h1>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="username"
          className="text-sm font-semibold"
          style={{ fontFamily: "Roboto, sans-serif" }}
        >
          Логин
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Введите логин"
          className={cn(
            "h-[54px] w-full rounded-[11px] border border-[#8a8c8f] bg-[#f7faff]",
            "px-4 text-base outline-none transition-colors",
            "focus:border-brand focus:ring-2 focus:ring-brand/20",
            "placeholder:text-[#8a8c8f]",
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="text-sm font-semibold"
          style={{ fontFamily: "Roboto, sans-serif" }}
        >
          Пароль
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Введите пароль"
          className={cn(
            "h-[54px] w-full rounded-[11px] border border-[#8a8c8f] bg-[#f7faff]",
            "px-4 text-base outline-none transition-colors",
            "focus:border-brand focus:ring-2 focus:ring-brand/20",
            "placeholder:text-[#8a8c8f]",
          )}
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-[#e96466]">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "mt-2 h-[54px] w-full rounded-[11px] bg-brand text-base font-semibold text-white",
          "transition-opacity hover:opacity-90 active:opacity-80",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
        style={{ fontFamily: "Roboto, sans-serif" }}
      >
        {isPending ? "Входим..." : "Войти"}
      </button>
    </form>
  );
};
