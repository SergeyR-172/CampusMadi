import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { GroupOut } from "#/shared/api";
import { adminApi } from "#/shared/api";
import { Modal } from "#/shared/ui";

const groupsQueryKey = ["admin", "groups"] as const;

export const AdminGroups = () => {
  const queryClient = useQueryClient();
  const groupsQuery = useQuery({
    queryKey: groupsQueryKey,
    queryFn: adminApi.groups.list,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const [editGroup, setEditGroup] = useState<GroupOut | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [deleteGroup, setDeleteGroup] = useState<GroupOut | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: groupsQueryKey });

  const createMutation = useMutation({
    mutationFn: (name: string) => adminApi.groups.create({ name }),
    onSuccess: () => {
      invalidate();
      setCreateOpen(false);
      setCreateName("");
    },
    onError: () => setCreateError("Не удалось создать группу"),
  });

  const updateMutation = useMutation({
    mutationFn: (vars: { id: number; name: string }) =>
      adminApi.groups.update(vars.id, { name: vars.name }),
    onSuccess: () => {
      invalidate();
      setEditGroup(null);
    },
    onError: () => setEditError("Не удалось обновить группу"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.groups.delete(id),
    onSuccess: () => {
      invalidate();
      setDeleteGroup(null);
    },
  });

  const openEdit = (g: GroupOut) => {
    setEditGroup(g);
    setEditName(g.name);
    setEditError(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    createMutation.mutate(createName);
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroup) return;
    setEditError(null);
    updateMutation.mutate({ id: editGroup.id, name: editName });
  };

  const handleDelete = () => {
    if (!deleteGroup) return;
    deleteMutation.mutate(deleteGroup.id);
  };

  const groups = groupsQuery.data ?? [];

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "Roboto, sans-serif" }}>
          Группы
        </h1>
        <button
          onClick={() => {
            setCreateName("");
            setCreateError(null);
            setCreateOpen(true);
          }}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Создать
        </button>
      </div>

      {groupsQuery.isPending && <p className="text-[#8a8c8f]">Загрузка...</p>}
      {groupsQuery.isError && <p className="text-[#e96466]">Не удалось загрузить группы</p>}

      {groupsQuery.isSuccess && (
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50 text-[#8a8c8f]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">ID</th>
                <th className="px-4 py-3 text-left font-medium">Название</th>
                <th className="px-4 py-3 text-right font-medium">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {groups.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-[#8a8c8f]">{g.id}</td>
                  <td className="px-4 py-3 font-medium">{g.name}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(g)}
                      className="mr-3 text-brand hover:underline"
                    >
                      Изменить
                    </button>
                    <button
                      onClick={() => setDeleteGroup(g)}
                      className="text-[#e96466] hover:underline"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-[#8a8c8f]">
                    Нет групп
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Создать группу">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Название</label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              required
              placeholder="Например: ИВТ-21-1"
              className="h-10 rounded-lg border border-[#8a8c8f] bg-[#f7faff] px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            />
          </div>
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
      <Modal open={!!editGroup} onClose={() => setEditGroup(null)} title="Изменить группу">
        <form onSubmit={handleEdit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Название</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              className="h-10 rounded-lg border border-[#8a8c8f] bg-[#f7faff] px-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand/30"
            />
          </div>
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
      <Modal open={!!deleteGroup} onClose={() => setDeleteGroup(null)} title="Удалить группу">
        <p className="mb-6 text-sm">
          Удалить группу <strong>{deleteGroup?.name}</strong>? Это действие необратимо.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => setDeleteGroup(null)}
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
