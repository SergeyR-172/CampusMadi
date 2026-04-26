import { useQueries } from "@tanstack/react-query";

import { useCurrentUser } from "#/entities/user";
import { adminApi } from "#/shared/api";

export const AdminDashboard = () => {
  const { user } = useCurrentUser();
  const [usersQ, groupsQ, scheduleQ] = useQueries({
    queries: [
      { queryKey: ["admin", "users"], queryFn: adminApi.users.list },
      { queryKey: ["admin", "groups"], queryFn: adminApi.groups.list },
      { queryKey: ["admin", "schedule"], queryFn: adminApi.schedule.list },
    ],
  });

  const cards = [
    { label: "Пользователей", value: usersQ.data?.length ?? "—" },
    { label: "Групп", value: groupsQ.data?.length ?? "—" },
    { label: "Занятий в расписании", value: scheduleQ.data?.length ?? "—" },
  ];

  return (
    <div className="p-8">
      <h1
        className="mb-1 text-2xl font-semibold"
        style={{ fontFamily: "Roboto, sans-serif" }}
      >
        Добро пожаловать, {user?.name}
      </h1>
      <p className="mb-8 text-sm text-[#8a8c8f]">Панель управления CampusMadi</p>

      <div className="grid grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-3xl font-bold text-brand">{card.value}</p>
            <p className="mt-1 text-sm text-[#8a8c8f]">{card.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
