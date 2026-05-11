export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

export type ImportRequest = {
  /** Метка для отчётности и для $ref-ссылок на ответ этого запроса. */
  ref?: string;
  method: HttpMethod;
  /** Путь относительно baseUrl, например "/api/admin/users". */
  endpoint: string;
  /** Тело запроса (для POST/PATCH). Может содержать $ref-плейсхолдеры. */
  body?: unknown;
};

export type ImportFile = {
  /** Версия формата. На текущий момент — "1". */
  version: "1";
  /** Человекочитаемое название импорта (необязательно). */
  name?: string;
  /** Описание импорта (необязательно). */
  description?: string;
  requests: ImportRequest[];
};

export type ExecutionStepResult = {
  index: number;
  ref?: string;
  method: HttpMethod;
  endpoint: string;
  ok: boolean;
  response?: unknown;
  error?: string;
};
