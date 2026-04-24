import { useEffect, useState } from "react";

import type { GroupOut } from "#/shared/api";
import { adminApi } from "#/shared/api";
import { Modal } from "#/shared/ui";

export const AdminGroups = () => {
  const [groups, setGroups] = useState<GroupOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [createPending, setCreatePending] = useState(false);

  const [editGroup, setEditGroup] = useState<GroupOut | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editPending, setEditPending] = useState(false);

  const [deleteGroup, setDeleteGroup] = useState<GroupOut | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  const loadGroups = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setGroups(await adminApi.groups.list());
    } catch {
      setError("Не удалось загрузить группы");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreatePending(true);
    try {
      const group = await adminApi.groups.create({ name: createName });
      setGroups((prev) => [...prev, group]);
      setCreateOpen(false);
      setCreateName("");
    } catch {
      setCreateError("Не удалось создать группу");
    } finally {
      setCreatePending(false);
    }
  };

  const openEdit = (g: GroupOut) => {
    setEditGroup(g);
    setEditName(g.name);
    setEditError(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editGroup) return;
    setEditError(null);
    setEditPending(true);
    try {
      const updated = await adminApi.groups.update(editGroup.id, { name: editName });
      setGroups((prev) => prev.map((g) => (g.id === updated.id ? updated : g)));
      setEditGroup(null);
    } catch {
      setEditError("Не удалось обновить группу");
    } finally {
      setEditPending(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteGroup) return;
    setDeletePending(true);
    try {
      await adminApi.groups.delete(deleteGroup.id);
      setGroups((prev) => prev.filter((g) => g.id !== deleteGroup.id));
      setDeleteGroup(null);
    } catch {
      // ignore
    } finally {
      setDeletePending(false);
    }
  };

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

      {isLoading && <p className="text-[#8a8c8f]">Загрузка...</p>}
      {error && <p className="text-[#e96466]">{error}</p>}

      {!isLoading && !error && (
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
            disabled={createPending}
            className="mt-2 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {createPending ? "Создание..." : "Создать"}
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
            disabled={editPending}
            className="mt-2 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {editPending ? "Сохранение..." : "Сохранить"}
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
