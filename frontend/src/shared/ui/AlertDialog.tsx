import { Modal } from "./Modal";

type Variant = "info" | "error" | "success";

type Props = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  closeLabel?: string;
  variant?: Variant;
  onClose: () => void;
};

/**
 * Переиспользуемый диалог-предупреждение / информационный диалог
 * с одной кнопкой закрытия.
 *
 * @example
 * <AlertDialog
 *   open={!!error}
 *   variant="error"
 *   title="Ошибка"
 *   description={error}
 *   onClose={() => setError(null)}
 * />
 */
export const AlertDialog = ({
  open,
  title,
  description,
  closeLabel = "OK",
  variant = "info",
  onClose,
}: Props) => {
  const btnClass =
    variant === "error"
      ? "w-full rounded-lg bg-[#e96466] py-2.5 text-sm font-medium text-white hover:opacity-90"
      : "w-full rounded-lg bg-brand py-2.5 text-sm font-medium text-white hover:opacity-90";

  return (
    <Modal open={open} onClose={onClose} title={title}>
      {description && (
        <div className="text-black mb-6 max-h-[60vh] overflow-auto text-sm whitespace-pre-wrap break-words">
          {description}
        </div>
      )}
      <button onClick={onClose} className={btnClass}>
        {closeLabel}
      </button>
    </Modal>
  );
};
