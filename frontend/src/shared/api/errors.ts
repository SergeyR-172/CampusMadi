import { ApiError } from "./client";

/**
 * Возвращает читаемое сообщение об ошибке для UI.
 * Если это ApiError с сообщением от бэка (поле detail) — показываем его,
 * иначе — переданный fallback (сетевые/неизвестные ошибки).
 */
export const getErrorMessage = (err: unknown, fallback: string): string => {
  if (err instanceof ApiError && err.message && !err.message.startsWith("HTTP ")) {
    return err.message;
  }
  return fallback;
};
