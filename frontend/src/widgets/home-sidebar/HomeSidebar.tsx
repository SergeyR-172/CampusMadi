import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { userKeys } from "#/entities/user";
import { authApi } from "#/shared/api";

const LEGEND = [
  { color: "var(--color-subject-lab)", label: "Лабораторные занятия" },
  { color: "var(--color-subject-seminar)", label: "Практические занятия" },
  { color: "var(--color-subject-lecture)", label: "Лекционные занятия" },
] as const;

export const HomeSidebar = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: async () => {
      queryClient.setQueryData(userKeys.me, null);
      await queryClient.invalidateQueries();
      navigate({ to: "/login" });
    },
  });

  return (
    <aside className="flex h-full w-[120px] shrink-0 flex-col items-center bg-brand py-5 text-white">
      <div className="flex h-16 w-full items-center justify-center">
        <img src="/logo.svg" alt="Campus Madi" className="h-12 w-auto" />
      </div>

      <div className="my-4 h-px w-3/4 bg-white/30" />

      <nav className="flex flex-1 flex-col items-center gap-3 px-3">
        {LEGEND.map((item) => (
          <div
            key={item.label}
            className="flex w-full flex-col items-center gap-1.5 rounded-xl bg-white px-2 py-3 text-center text-[11px] leading-tight text-foreground shadow-sm"
          >
            <span
              className="block h-5 w-5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-medium">{item.label}</span>
          </div>
        ))}
      </nav>

      <div className="my-4 h-px w-3/4 bg-white/30" />

      <button
        type="button"
        onClick={() => logoutMutation.mutate()}
        disabled={logoutMutation.isPending}
        aria-label="Выйти"
        className="flex h-10 w-10 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15 disabled:opacity-50"
      >
        <LogOut size={22} />
      </button>
    </aside>
  );
};
