import { useEffect, useState } from "react";

import type { GroupOut, UserCreate, UserOut, UserUpdate } from "#/shared/api";
import { adminApi } from "#/shared/api";
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

const emptyCreate = (): UserCreate => ({
  username: "",
  password: "",
  name: "",
  role: "default",
  group_id: null,
});

export const AdminUsers = () => {
  const [users, setUsers] = useState<UserOut[]>([]);
  const [groups, setGroups] = useState<GroupOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<UserCreate>(emptyCreate());
  const [createError, setCreateError] = useState<string | null>(null);
  const [createPending, setCreatePending] = useState(false);

  const [editUser, setEditUser] = useState<UserOut | null>(null);
  const [editForm, setEditForm] = useState<UserUpdate>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [editPending, setEditPending] = useState(false);

  const [deleteUser, setDeleteUser] = useState<UserOut | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [u, g] = await Promise.all([adminApi.users.list(), adminApi.groups.list()]);
      setUsers(u);
      setGroups(g);
    } catch {
      setError("Не удалось загрузить данные");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreatePending(true);
    try {
      const newUser = await adminApi.users.create(createForm);
      setUsers((prev) => [...prev, newUser]);
      setCreateOpen(false);
      setCreateForm(emptyCreate());
    } catch {
      setCreateError("Не удалось создать пользователя");
    } finally {
      setCreatePending(false);
    }
  };

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

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    setEditError(null);
    setEditPending(true);
    try {
      const updated = await adminApi.users.update(editUser.id, editForm);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditUser(null);
    } catch {
      setEditError("Не удалось обновить пользователя");
    } finally {
      setEditPending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteUser) return;
    setDeletePending(true);
    try {
      await adminApi.users.delete(deleteUser.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteUser.id));
      setDeleteUser(null);
    } catch {
      // ignore
    } finally {
      setDeletePending(false);
    }
  };

  const groupName = (id: number | null) =>
    id ? (groups.find((g) => g.id === id)?.name ?? String(id)) : "—";

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
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
      {error && <p className="text-[#e96466]">{error}</p>}

      {!isLoading && !error && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-[#8a8c8f]">
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
              {users.map((u) => (
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
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#8a8c8f]">
                    Нет пользователей
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
            disabled={createPending}
            className="mt-2 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {createPending ? "Создание..." : "Создать"}
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
            disabled={editPending}
            className="mt-2 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {editPending ? "Сохранение..." : "Сохранить"}
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
            disabled={deletePending}
            className="flex-1 rounded-lg bg-[#e96466] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {deletePending ? "Удаление..." : "Удалить"}
          </button>
        </div>
      </Modal>
    </div>
  );
};

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
