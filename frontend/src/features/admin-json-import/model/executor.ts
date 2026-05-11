import { apiClient, ApiError } from "#/shared/api";

import { resolveRefs } from "./parser";
import type { ExecutionStepResult, ImportFile, ImportRequest } from "./types";

const callApi = (method: ImportRequest["method"], endpoint: string, body: unknown) => {
  switch (method) {
    case "GET":
      return apiClient.get<unknown>(endpoint);
    case "DELETE":
      return apiClient.delete<unknown>(endpoint);
    case "POST":
      return apiClient.post<unknown>(endpoint, body);
    case "PATCH":
      return apiClient.patch<unknown>(endpoint, body);
  }
};

const formatError = (err: unknown): string => {
  if (err instanceof ApiError) return `[${err.status}] ${err.message}`;
  if (err instanceof Error) return err.message;
  return String(err);
};

export type ExecutorOptions = {
  /** Прерывать ли последовательность при первой ошибке. По умолчанию true. */
  stopOnError?: boolean;
  /** Колбэк прогресса (вызывается после каждого шага). */
  onProgress?: (done: number, total: number, last: ExecutionStepResult) => void;
};

export type ExecutionReport = {
  ok: boolean;
  total: number;
  succeeded: number;
  failed: number;
  steps: ExecutionStepResult[];
};

/**
 * Последовательно выполняет запросы из ImportFile.
 * Ответ запроса с непустым ref сохраняется и доступен последующим запросам
 * через $ref / {{...}} плейсхолдеры.
 */
export const executeImport = async (
  file: ImportFile,
  options: ExecutorOptions = {},
): Promise<ExecutionReport> => {
  const { stopOnError = true, onProgress } = options;
  const responses: Record<string, unknown> = {};
  const steps: ExecutionStepResult[] = [];

  for (let i = 0; i < file.requests.length; i++) {
    const req = file.requests[i];
    let step: ExecutionStepResult;
    try {
      const resolvedEndpoint = resolveRefs(req.endpoint, responses);
      const resolvedBody =
        req.body === undefined ? undefined : resolveRefs(req.body, responses);
      if (typeof resolvedEndpoint !== "string") {
        throw new Error(`endpoint должен быть строкой после подстановки $ref`);
      }
      const response = await callApi(req.method, resolvedEndpoint, resolvedBody);
      if (req.ref) responses[req.ref] = response;
      step = {
        index: i,
        ref: req.ref,
        method: req.method,
        endpoint: resolvedEndpoint,
        ok: true,
        response,
      };
    } catch (err) {
      step = {
        index: i,
        ref: req.ref,
        method: req.method,
        endpoint: req.endpoint,
        ok: false,
        error: formatError(err),
      };
    }
    steps.push(step);
    onProgress?.(i + 1, file.requests.length, step);
    if (!step.ok && stopOnError) break;
  }

  const succeeded = steps.filter((s) => s.ok).length;
  const failed = steps.filter((s) => !s.ok).length;

  return {
    ok: failed === 0 && succeeded === file.requests.length,
    total: file.requests.length,
    succeeded,
    failed,
    steps,
  };
};
