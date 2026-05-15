import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { userKeys } from "#/entities/user";
import type { UserSchema } from "#/shared/api";
import { authApi, getErrorMessage } from "#/shared/api";
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
      setError(getErrorMessage(err, "Ошибка сервера. Попробуйте позже."));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate({ username, password });
  };

  const isPending = loginMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 md:gap-6">
      <div className="flex flex-col gap-2">
        <h1
          className="text-[25px] font-black leading-none tracking-[0.05em] text-foreground md:text-3xl md:font-semibold md:tracking-normal"
          style={{ fontFamily: "Roboto, sans-serif" }}
        >
          Авторизация
        </h1>
        <p
          className="text-[13px] leading-[15px] tracking-[0.05em] text-black md:hidden"
          style={{ fontFamily: "Roboto, sans-serif" }}
        >
          Введите учетные данные, чтобы открыть расписание, заметки и личную информацию.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="username"
          className="text-[13px] font-black tracking-[0.05em] md:text-sm md:font-semibold md:tracking-normal"
          style={{ fontFamily: "Roboto, sans-serif" }}
        >
          Email
        </label>
        <input
          id="username"
          type="text"
          autoComplete="username"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="UserName@mail.com"
          className={cn(
            "h-[49px] w-full rounded-[10px] border border-[#8a8c8f] bg-[#f7faff] md:h-[54px] md:rounded-[11px]",
            "px-4 text-[13px] outline-none transition-colors md:text-base",
            "focus:border-brand focus:ring-2 focus:ring-brand/20",
            "placeholder:text-[#8a8c8f]",
          )}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="text-[13px] font-black tracking-[0.05em] md:text-sm md:font-semibold md:tracking-normal"
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
            "h-[49px] w-full rounded-[10px] border border-[#8a8c8f] bg-[#f7faff] md:h-[54px] md:rounded-[11px]",
            "px-4 text-[13px] outline-none transition-colors md:text-base",
            "focus:border-brand focus:ring-2 focus:ring-brand/20",
            "placeholder:text-[#8a8c8f]",
          )}
        />
        <span
          className="mt-0.5 text-[13px] leading-[15px] tracking-[0.05em] text-[#8a8c8f] md:hidden"
          style={{ fontFamily: "Roboto, sans-serif" }}
        >
          Забыли пароль?
        </span>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-[#e96466]">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className={cn(
          "mt-2 h-[54px] w-full rounded-[10px] bg-brand text-base font-semibold text-white md:rounded-[11px]",
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
