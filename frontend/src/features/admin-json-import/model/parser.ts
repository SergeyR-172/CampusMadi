import type { HttpMethod, ImportFile, ImportRequest } from "./types";

const ALLOWED_METHODS: ReadonlyArray<HttpMethod> = ["GET", "POST", "PATCH", "DELETE"];

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const fail = (msg: string): never => {
  throw new Error(msg);
};

/**
 * Парсит сырой JSON-текст в ImportFile и валидирует структуру.
 * Бросает Error с понятным сообщением при невалидном формате.
 */
export const parseImportFile = (raw: string): ImportFile => {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return fail(`Невалидный JSON: ${msg}`);
  }

  if (!isObject(data)) return fail("Корень файла должен быть объектом");
  if (data.version !== "1") return fail('Поле "version" должно быть "1"');
  if (!Array.isArray(data.requests)) return fail('Поле "requests" должно быть массивом');
  if (data.requests.length === 0) return fail("Массив requests пуст");

  const requests: ImportRequest[] = data.requests.map((req, i) => {
    if (!isObject(req)) return fail(`requests[${i}]: должен быть объектом`);
    const method = req.method;
    if (typeof method !== "string" || !ALLOWED_METHODS.includes(method as HttpMethod)) {
      return fail(
        `requests[${i}].method: ожидался один из ${ALLOWED_METHODS.join(", ")}, получено ${JSON.stringify(method)}`,
      );
    }
    const endpoint = req.endpoint;
    if (typeof endpoint !== "string" || !endpoint.startsWith("/")) {
      return fail(`requests[${i}].endpoint: ожидалась строка, начинающаяся с "/"`);
    }
    const ref = req.ref;
    if (ref !== undefined && typeof ref !== "string") {
      return fail(`requests[${i}].ref: должен быть строкой`);
    }
    return {
      method: method as HttpMethod,
      endpoint,
      body: req.body,
      ref: ref,
    };
  });

  // Проверка уникальности ref
  const seen = new Set<string>();
  for (const r of requests) {
    if (r.ref !== undefined) {
      if (seen.has(r.ref)) return fail(`Дублирующийся ref: "${r.ref}"`);
      seen.add(r.ref);
    }
  }

  return {
    version: "1",
    name: typeof data.name === "string" ? data.name : undefined,
    description: typeof data.description === "string" ? data.description : undefined,
    requests,
  };
};

/**
 * Достаёт значение по dotted-пути из объекта.
 * Поддерживает индексы массивов: "items.0.id".
 */
const getByPath = (obj: unknown, path: string): unknown => {
  if (path === "") return obj;
  const parts = path.split(".");
  let cur: unknown = obj;
  for (const p of parts) {
    if (cur === null || cur === undefined) return undefined;
    if (Array.isArray(cur)) {
      const idx = Number(p);
      if (!Number.isInteger(idx)) return undefined;
      cur = cur[idx];
    } else if (typeof cur === "object") {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return cur;
};

/**
 * Рекурсивно проходит по value и заменяет объекты вида { "$ref": "alias.path" }
 * на соответствующие значения из responses (ответы предыдущих запросов).
 *
 * Пример: { "$ref": "group_1.id" } → responses["group_1"].id
 *
 * Также поддерживает интерполяцию плейсхолдеров вида "{{group_1.id}}" внутри строк
 * (полезно для подстановки в URL endpoint).
 */
export const resolveRefs = (
  value: unknown,
  responses: Record<string, unknown>,
): unknown => {
  if (Array.isArray(value)) {
    return value.map((v) => resolveRefs(v, responses));
  }
  if (isObject(value)) {
    // объект-плейсхолдер $ref
    if (typeof value.$ref === "string" && Object.keys(value).length === 1) {
      return resolveRefValue(value.$ref, responses);
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = resolveRefs(v, responses);
    }
    return out;
  }
  if (typeof value === "string") {
    return interpolateString(value, responses);
  }
  return value;
};

const resolveRefValue = (
  refPath: string,
  responses: Record<string, unknown>,
): unknown => {
  const dot = refPath.indexOf(".");
  const alias = dot === -1 ? refPath : refPath.slice(0, dot);
  const path = dot === -1 ? "" : refPath.slice(dot + 1);
  if (!(alias in responses)) {
    throw new Error(`$ref "${refPath}": ссылка на неизвестный alias "${alias}"`);
  }
  const resolved = getByPath(responses[alias], path);
  if (resolved === undefined) {
    throw new Error(`$ref "${refPath}": путь "${path}" не найден в ответе "${alias}"`);
  }
  return resolved;
};

const PLACEHOLDER_RE = /\{\{\s*([^}]+?)\s*\}\}/g;

const interpolateString = (
  s: string,
  responses: Record<string, unknown>,
): string => {
  if (!s.includes("{{")) return s;
  return s.replace(PLACEHOLDER_RE, (_, refPath: string) => {
    const v = resolveRefValue(refPath, responses);
    return v === null || v === undefined ? "" : String(v);
  });
};
