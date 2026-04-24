import { useEffect, useState } from "react";

import { useAuthStore } from "#/entities/user";
import type { AdminScheduleItemOut, GroupOut, UserOut } from "#/shared/api";
import { adminApi } from "#/shared/api";

export const AdminDashboard = () => {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<{
    users: UserOut[];
    groups: GroupOut[];
    schedule: AdminScheduleItemOut[];
  } | null>(null);

  useEffect(() => {
    Promise.all([adminApi.users.list(), adminApi.groups.list(), adminApi.schedule.list()])
      .then(([users, groups, schedule]) => setStats({ users, groups, schedule }))
      .catch(() => null);
  }, []);

  const cards = [
    { label: "Пользователей", value: stats?.users.length ?? "—" },
    { label: "Групп", value: stats?.groups.length ?? "—" },
    { label: "Занятий в расписании", value: stats?.schedule.length ?? "—" },
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
