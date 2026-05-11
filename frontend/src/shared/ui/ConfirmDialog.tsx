import { Modal } from "./Modal";

type Variant = "default" | "danger";

type Props = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: Variant;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Переиспользуемый диалог подтверждения.
 *
 * @example
 * <ConfirmDialog
 *   open={open}
 *   title="Выполнить запросы?"
 *   description="Будет отправлено 12 запросов."
 *   onConfirm={run}
 *   onCancel={() => setOpen(false)}
 * />
 */
export const ConfirmDialog = ({
  open,
  title,
  description,
  confirmLabel = "Да",
  cancelLabel = "Нет",
  variant = "default",
  loading = false,
  onConfirm,
  onCancel,
}: Props) => {
  const confirmClass =
    variant === "danger"
      ? "flex-1 rounded-lg bg-[#e96466] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
      : "flex-1 rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60";

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      {description && <div className="mb-6 text-sm text-black">{description}</div>}
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="text-black flex-1 border-gray-text rounded-lg border py-2.5 text-sm hover:bg-gray-50 disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button onClick={onConfirm} disabled={loading} className={confirmClass}>
          {loading ? "..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};
