import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type { GroupOut, UserCreate, UserOut, UserUpdate } from "#/shared/api";
import { adminApi, getErrorMessage } from "#/shared/api";
import { Modal } from "#/shared/ui";

const ROLES = [
  { value: "default", label: "Студент" },
  { value: "teacher", label: "Преподаватель" },
  { value: "admin", label: "Администратор" },
] as const;

const ROLE_LABELS: Record<string, string> = {
  default: "Студент",
  teacher: "Преподаватель",
  admin: "Администратор",
};

type UsersSort =
  | "id_asc"
  | "id_desc"
  | "name_asc"
  | "name_desc"
  | "username_asc"
  | "username_desc";

type UsersFilters = {
  role: "all" | "default" | "teacher" | "admin";
  groupId: string; // "" = все, "none" = без группы, "<id>" = группа
  search: string;
};

const emptyUsersFilters = (): UsersFilters => ({
  role: "all",
  groupId: "",
  search: "",
});

const usersQueryKey = ["admin", "users"] as const;
const groupsQueryKey = ["admin", "groups"] as const;

const emptyCreate = (): UserCreate => ({
  username: "",
  password: "",
  name: "",
  role: "default",
  group_id: null,
});

export const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [usersQuery, groupsQuery] = useQueries({
    queries: [
      { queryKey: usersQueryKey, queryFn: adminApi.users.list },
      { queryKey: groupsQueryKey, queryFn: adminApi.groups.list },
    ],
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<UserCreate>(emptyCreate());
  const [createError, setCreateError] = useState<string | null>(null);

  const [editUser, setEditUser] = useState<UserOut | null>(null);
  const [editForm, setEditForm] = useState<UserUpdate>({});
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteUser, setDeleteUser] = useState<UserOut | null>(null);

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: usersQueryKey });

  const createMutation = useMutation({
    mutationFn: (data: UserCreate) => adminApi.users.create(data),
    onSuccess: () => {
      invalidateUsers();
      setCreateOpen(false);
      setCreateForm(emptyCreate());
    },
    onError: (err) =>
      setCreateError(getErrorMessage(err, "Не удалось создать пользователя")),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; data: UserUpdate }) =>
      adminApi.users.update(vars.id, vars.data),
    onSuccess: () => {
      invalidateUsers();
      setEditUser(null);
    },
    onError: (err) =>
      setEditError(getErrorMessage(err, "Не удалось обновить пользователя")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.users.delete(id),
    onSuccess: () => {
      invalidateUsers();
      setDeleteUser(null);
    },
  });

  const openEdit = (user: UserOut) => {
    setEditUser(user);
    setEditForm({
      username: user.username,
      name: user.name,
      role: user.role,
      group_id: user.group_id,
    });
    setEditError(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    createMutation.mutate(createForm);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditError(null);
    updateMutation.mutate({ id: editUser.id, data: editForm });
  };

  const handleDelete = () => {
    if (!deleteUser) return;
    deleteMutation.mutate(deleteUser.id);
  };

  const users = usersQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const isLoading = usersQuery.isPending || groupsQuery.isPending;
  const isError = usersQuery.isError || groupsQuery.isError;

  const groupName = (id: number | null) =>
    id ? (groups.find((g) => g.id === id)?.name ?? String(id)) : "—";

  const [filters, setFilters] = useState<UsersFilters>(emptyUsersFilters());
  const [sort, setSort] = useState<UsersSort>("id_asc");

  const visibleUsers = useMemo(() => {
    const filtered = users.filter((u) => {
      if (filters.role !== "all" && u.role !== filters.role) return false;
      if (filters.groupId === "none" && u.group_id !== null) return false;
      if (
        filters.groupId !== "" &&
        filters.groupId !== "none" &&
        u.group_id !== Number(filters.groupId)
      )
        return false;
      if (filters.search) {
        const q = filters.search.trim().toLowerCase();
        if (!u.name.toLowerCase().includes(q) && !u.username.toLowerCase().includes(q))
          return false;
      }
      return true;
    });

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      switch (sort) {
        case "id_desc":
          return b.id - a.id;
        case "name_asc":
          return a.name.localeCompare(b.name, "ru");
        case "name_desc":
          return b.name.localeCompare(a.name, "ru");
        case "username_asc":
          return a.username.localeCompare(b.username);
        case "username_desc":
          return b.username.localeCompare(a.username);
        case "id_asc":
        default:
          return a.id - b.id;
      }
    });
    return sorted;
  }, [users, filters, sort]);

  const filtersActive =
    filters.role !== "all" ||
    filters.groupId !== "" ||
    filters.search !== "" ||
    sort !== "id_asc";

  return (
    <div className="flex h-full flex-col p-8">
      <div className="mb-6 flex shrink-0 items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "Roboto, sans-serif" }}>
          Пользователи
        </h1>
        <button
          onClick={() => {
            setCreateForm(emptyCreate());
            setCreateError(null);
            setCreateOpen(true);
          }}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Создать
        </button>
      </div>

      {isLoading && <p className="text-[#8a8c8f]">Загрузка...</p>}
      {isError && <p className="text-[#e96466]">Не удалось загрузить данные</p>}

      {!isLoading && !isError && (
        <>
          <div className="mb-4 shrink-0 rounded-xl bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-text">Фильтры и сортировка</p>
              {filtersActive && (
                <button
                  onClick={() => {
                    setFilters(emptyUsersFilters());
                    setSort("id_asc");
                  }}
                  className="text-sm text-brand hover:underline"
                >
                  Сбросить
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              <FilterSelect
                label="Роль"
                value={filters.role}
                onChange={(v) =>
                  setFilters((f) => ({ ...f, role: v as UsersFilters["role"] }))
                }
                options={[
                  { value: "all", label: "Все роли" },
                  { value: "default", label: "Студенты" },
                  { value: "teacher", label: "Преподаватели" },
                  { value: "admin", label: "Администраторы" },
                ]}
              />
              <FilterSelect
                label="Группа"
                value={filters.groupId}
                onChange={(v) => setFilters((f) => ({ ...f, groupId: v }))}
                options={[
                  { value: "", label: "Все" },
                  { value: "none", label: "Без группы" },
                  ...groups.map((g) => ({ value: String(g.id), label: g.name })),
                ]}
              />
              <FilterSelect
                label="Сортировка"
                value={sort}
                onChange={(v) => setSort(v as UsersSort)}
                options={[
                  { value: "id_asc", label: "ID ↑" },
                  { value: "id_desc", label: "ID ↓" },
                  { value: "name_asc", label: "Имя А-Я" },
                  { value: "name_desc", label: "Имя Я-А" },
                  { value: "username_asc", label: "Логин А-Я" },
                  { value: "username_desc", label: "Логин Я-А" },
                ]}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">Поиск</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, search: e.target.value }))
                  }
                  placeholder="Логин или имя"
                  className="h-10 rounded-lg border border-gray-text bg-[#f7faff] px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-text">
              Показано {visibleUsers.length} из {users.length}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 border-b bg-gray-50 text-[#8a8c8f]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Логин</th>
                <th className="px-4 py-3 text-left font-medium">Имя</th>
                <th className="px-4 py-3 text-left font-medium">Роль</th>
                <th className="px-4 py-3 text-left font-medium">Группа</th>
                <th className="px-4 py-3 text-right font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visibleUsers.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-[#8a8c8f]">{u.id}</td>
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3">{ROLE_LABELS[u.role] ?? u.role}</td>
                  <td className="px-4 py-3">{groupName(u.group_id)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(u)}
                      className="mr-3 text-brand hover:underline"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => setDeleteUser(u)}
                      className="text-[#e96466] hover:underline"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              {visibleUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#8a8c8f]">
                    {users.length === 0
                      ? "Нет пользователей"
                      : "По выбранным фильтрам ничего не найдено"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Создать пользователя">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Field
            label="Логин"
            value={createForm.username}
            onChange={(v) => setCreateForm((f) => ({ ...f, username: v }))}
            required
          />
          <Field
            label="Пароль"
            type="password"
            value={createForm.password}
            onChange={(v) => setCreateForm((f) => ({ ...f, password: v }))}
            required
          />
          <Field
            label="Имя"
            value={createForm.name}
            onChange={(v) => setCreateForm((f) => ({ ...f, name: v }))}
            required
          />
          <RoleSelect
            value={createForm.role ?? "default"}
            onChange={(v) => setCreateForm((f) => ({ ...f, role: v }))}
          />
          <GroupSelect
            groups={groups}
            value={createForm.group_id ?? null}
            onChange={(v) => setCreateForm((f) => ({ ...f, group_id: v }))}
          />
          {createError && <p className="text-sm text-[#e96466]">{createError}</p>}
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="mt-2 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {createMutation.isPending ? "Создание..." : "Создать"}
          </button>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Изменить пользователя">
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          <Field
            label="Логин"
            value={editForm.username ?? ""}
            onChange={(v) => setEditForm((f) => ({ ...f, username: v }))}
          />
          <Field
            label="Новый пароль"
            type="password"
            value={editForm.password ?? ""}
            onChange={(v) => setEditForm((f) => ({ ...f, password: v || null }))}
            placeholder="Оставьте пустым чтобы не менять"
          />
          <Field
            label="Имя"
            value={editForm.name ?? ""}
            onChange={(v) => setEditForm((f) => ({ ...f, name: v }))}
          />
          <RoleSelect
            value={editForm.role ?? "default"}
            onChange={(v) => setEditForm((f) => ({ ...f, role: v }))}
          />
          <GroupSelect
            groups={groups}
            value={editForm.group_id ?? null}
            onChange={(v) => setEditForm((f) => ({ ...f, group_id: v }))}
          />
          {editError && <p className="text-sm text-[#e96466]">{editError}</p>}
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="mt-2 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {updateMutation.isPending ? "Сохранение..." : "Сохранить"}
          </button>
        </form>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={!!deleteUser} onClose={() => setDeleteUser(null)} title="Удалить пользователя">
        <p className="mb-6 text-sm">
          Удалить пользователя <strong>{deleteUser?.name}</strong>? Это действие необратимо.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteUser(null)}
            className="flex-1 rounded-lg border border-border py-2.5 text-sm hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex-1 rounded-lg bg-[#e96466] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {deleteMutation.isPending ? "Удаление..." : "Удалить"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

const FilterSelect = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 rounded-lg border border-gray-text bg-[#f7faff] px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      placeholder={placeholder}
      className="h-10 rounded-lg border border-[#8a8c8f] bg-[#f7faff] px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
    />
  </div>
);

const RoleSelect = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "default" | "teacher" | "admin") => void;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium">Роль</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as "default" | "teacher" | "admin")}
      className="h-10 rounded-lg border border-[#8a8c8f] bg-[#f7faff] px-3 text-sm outline-none focus:border-brand"
    >
      {ROLES.map((r) => (
        <option key={r.value} value={r.value}>
          {r.label}
        </option>
      ))}
    </select>
  </div>
);

const GroupSelect = ({
  groups,
  value,
  onChange,
}: {
  groups: GroupOut[];
  value: number | null;
  onChange: (v: number | null) => void;
}) => (
  <div className="flex flex-col gap-1">
    <label className="text-sm font-medium">Группа</label>
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      className="h-10 rounded-lg border border-[#8a8c8f] bg-[#f7faff] px-3 text-sm outline-none focus:border-brand"
    >
      <option value="">— Без группы —</option>
      {groups.map((g) => (
        <option key={g.id} value={g.id}>
          {g.name}
        </option>
      ))}
    </select>
  </div>
);
