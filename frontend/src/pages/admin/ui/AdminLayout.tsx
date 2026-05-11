import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";

import { useCurrentUser, userKeys } from "#/entities/user";
import { JsonImportButton } from "#/features/admin-json-import";
import { authApi } from "#/shared/api";
import { cn } from "#/shared/lib";

const NAV_ITEMS = [
  { to: "/admin", label: "Обзор", exact: true },
  { to: "/admin/users", label: "Пользователи", exact: false },
  { to: "/admin/groups", label: "Группы", exact: false },
  { to: "/admin/schedule", label: "Расписание", exact: false },
] as const;

export const AdminLayout = () => {
  const { user } = useCurrentUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const location = useRouterState({ select: (s) => s.location.pathname });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: async () => {
      queryClient.setQueryData(userKeys.me, null);
      await queryClient.invalidateQueries();
      navigate({ to: "/login" });
    },
  });

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-[220px] shrink-0 flex-col bg-brand text-white">
        <div className="border-b border-white/20 px-6 py-6">
          <p
            className="text-lg font-bold leading-tight"
            style={{ fontFamily: "Roboto, sans-serif" }}
          >
            Campus Madi
          </p>
          <p className="mt-0.5 text-xs text-white/60">Панель администратора</p>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const active = item.exact
              ? location === item.to
              : location.startsWith(item.to);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white",
                )}
              >
                {item.label}
              </Link>
            );
          })}
          <JsonImportButton />
        </nav>

        <div className="border-t border-white/20 px-4 py-4">
          <p className="mb-2 truncate text-sm text-white/80">{user?.name}</p>
          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="w-full rounded-lg px-4 py-2 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-60"
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-app-bg">
        <Outlet />
      </main>
    </div>
  );
};
