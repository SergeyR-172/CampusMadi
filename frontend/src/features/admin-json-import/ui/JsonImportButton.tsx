import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useRef, useState } from "react";

import { AlertDialog, ConfirmDialog } from "#/shared/ui";

import type { ExecutionReport } from "../model/executor";
import { executeImport } from "../model/executor";
import { parseImportFile } from "../model/parser";
import type { ImportFile } from "../model/types";

type Props = {
  className?: string;
};

/**
 * Кнопка импорта JSON-файла с инструкциями для администратора.
 * Открывает системный проводник, после выбора файла показывает
 * подтверждение, выполняет последовательность запросов и
 * отображает ошибки в модальном окне-предупреждении.
 */
export const JsonImportButton = ({ className }: Props) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();

  const [parsed, setParsed] = useState<{ file: ImportFile; fileName: string } | null>(
    null,
  );
  const [alert, setAlert] = useState<{
    title: string;
    description: React.ReactNode;
    variant: "info" | "error" | "success";
  } | null>(null);

  const runMutation = useMutation({
    mutationFn: (file: ImportFile) => executeImport(file, { stopOnError: true }),
    onSuccess: (report) => {
      setParsed(null);
      // Инвалидируем все админ-запросы — список users/groups/schedule мог измениться.
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      if (report.ok) {
        setAlert({
          title: "Импорт завершён",
          variant: "success",
          description: `Успешно выполнено ${report.succeeded} из ${report.total} запросов.`,
        });
      } else {
        setAlert({
          title: "Ошибка при выполнении импорта",
          variant: "error",
          description: formatReport(report),
        });
      }
    },
    onError: (err) => {
      setParsed(null);
      setAlert({
        title: "Ошибка при выполнении импорта",
        variant: "error",
        description: err instanceof Error ? err.message : String(err),
      });
    },
  });

  const handlePick = () => {
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // сбрасываем value сразу, чтобы выбор того же файла повторно срабатывал
    e.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const parsedFile = parseImportFile(text);
      setParsed({ file: parsedFile, fileName: file.name });
    } catch (err) {
      setAlert({
        title: "Невалидный JSON-файл",
        variant: "error",
        description: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const confirmDescription = parsed ? (
    <div>
      <p>
        Файл: <strong>{parsed.fileName}</strong>
      </p>
      {parsed.file.name && (
        <p className="mt-1 text-gray-text">{parsed.file.name}</p>
      )}
      <p className="mt-3">
        Будет выполнено <strong>{parsed.file.requests.length}</strong> запросов.
      </p>
      <p className="mt-3">Выполнить запросы?</p>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={handlePick}
        className={
          className ??
          "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        }
      >
        <Upload size={16} />
        Импорт JSON
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        className="hidden"
      />

      <ConfirmDialog
        open={!!parsed && !runMutation.isPending}
        title="Подтверждение импорта"
        description={confirmDescription}
        confirmLabel="Да"
        cancelLabel="Нет"
        onCancel={() => setParsed(null)}
        onConfirm={() => parsed && runMutation.mutate(parsed.file)}
      />

      {/* Индикатор выполнения */}
      <ConfirmDialog
        open={runMutation.isPending}
        title="Выполнение запросов..."
        description="Пожалуйста, подождите."
        confirmLabel="..."
        cancelLabel="Отмена"
        loading
        onCancel={() => {
          /* отмену здесь не делаем — последовательные fetch уже идут */
        }}
        onConfirm={() => {}}
      />

      <AlertDialog
        open={!!alert}
        variant={alert?.variant ?? "info"}
        title={alert?.title ?? ""}
        description={alert?.description}
        onClose={() => setAlert(null)}
      />
    </>
  );
};

const formatReport = (report: ExecutionReport): string => {
  const lines: string[] = [];
  lines.push(`Выполнено: ${report.succeeded} из ${report.total}.`);
  lines.push("");
  for (const step of report.steps) {
    const tag = step.ok ? "OK" : "FAIL";
    const refPart = step.ref ? ` [${step.ref}]` : "";
    lines.push(`#${step.index + 1} ${tag}${refPart} ${step.method} ${step.endpoint}`);
    if (!step.ok && step.error) {
      lines.push(`   ${step.error}`);
    }
  }
  return lines.join("\n");
};
