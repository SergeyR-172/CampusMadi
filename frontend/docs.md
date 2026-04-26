# Frontend — документация

## NPM-команды

| Команда           | Описание                                            |
| ----------------- | --------------------------------------------------- |
| `npm run dev`     | Запуск dev-сервера на порту 3000                    |
| `npm run build`   | Сборка продакшн-бандла                              |
| `npm run preview` | Превью продакшн-сборки                              |
| `npm run test`    | Запуск тестов (vitest run)                          |
| `npm run lint`    | Проверка кода через ESLint                          |
| `npm run format`  | Проверка форматирования через Prettier (без записи) |
| `npm run check`   | Форматирование Prettier + автофикс ESLint           |
| `npm run fix`     | Автофикс ESLint + форматирование Prettier           |

> Проект использует `pnpm`. Предпочтительно использовать `pnpm run <команда>`.

---

## Правила написания кода

### Форматирование (Prettier)

- **Точки с запятой**: всегда используются (`semi: true`)
- **Кавычки**: двойные (`singleQuote: false`)
- **Висячие запятые**: везде — в массивах, объектах, параметрах функций (`trailingComma: 'all'`)
- **Длина строки**: максимум 100 символов (`printWidth: 100`)
- **Отступы**: 2 пробела (`tabWidth: 2`)
- **Пробелы в объектных литералах**: `{ foo: bar }` — да (`bracketSpacing: true`)
- **Скобки у стрелочных функций**: всегда — `(x) => x` (`arrowParens: 'always'`)
- **Сортировка классов Tailwind**: автоматическая через `prettier-plugin-tailwindcss`; функции `cva`, `clsx`, `cn` также сортируются

**Файлы, исключённые из форматирования** (`prettierignore`):

- `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`
- `routeTree.gen.ts` (генерируемый файл TanStack Router)

---

### Стиль кода (ESLint)

#### Функции

- Использовать только **стрелочные функции** (`func-style: expression`)
- Исключение: файлы роутов `src/routes/**/*.tsx|ts` — разрешены function declaration (требование TanStack Router)

#### Именование

| Что                             | Стиль                                       |
| ------------------------------- | ------------------------------------------- |
| Типы, интерфейсы                | `PascalCase`                                |
| Файлы, переменные, параметры    | `camelCase`                                 |
| Константы (`const`)             | `camelCase` \| `UPPER_CASE` \| `PascalCase` |
| Экспортируемые React-компоненты | `PascalCase` (имя начинается с заглавной)   |
| Zod-схемы (`*Schema`)           | `camelCase` \| `UPPER_CASE` \| `PascalCase` |
| API-данные (snake_case поля)    | разрешён `snake_case`                       |
| Неиспользуемые переменные       | префикс `_` (например, `_unused`)           |

#### Импорты

- Импорты **сортируются автоматически** плагином `eslint-plugin-simple-import-sort` — нарушение является ошибкой

#### Прочее

- `console.log` — **предупреждение**; разрешены только `console.warn` и `console.error`
- Неиспользуемые переменные — **ошибка** (кроме тех, что начинаются с `_`)

#### Исключения для shadcn-компонентов

Файлы `src/shared/shadcn/**` — ослаблены правила:

- `func-style` отключён
- `@typescript-eslint/naming-convention` отключён

---

## Управление состоянием и работа с данными

### Принцип разделения

| Тип состояния              | Инструмент      | Что хранить                                                      |
| -------------------------- | --------------- | ---------------------------------------------------------------- |
| **Серверное состояние**    | TanStack Query  | Всё, что приходит с бэкенда: пользователь, расписание, заметки   |
| **Глобальный UI-стейт**    | Zustand         | Только UI: открытость глобальных модалок, тема, флаги интерфейса |
| **Локальный UI-стейт**     | `useState`      | Состояние одного компонента: input, локальная модалка, hover     |
| **Состояние формы**        | `useState` (или `react-hook-form` при росте сложности) | Поля формы, валидационные ошибки                  |

> **Запрещено** хранить серверные данные в Zustand или дублировать их туда вручную.
> Источник правды для серверных данных — кэш TanStack Query (`queryClient`).

### Где живёт TanStack Query

- `QueryClient` создаётся в `src/shared/api/queryClient.ts` и экспортируется через `#/shared/api`
- `QueryClientProvider` оборачивает приложение в `src/routes/__root.tsx`
- Дефолты: `staleTime: 60s`, `retry: 1`, `refetchOnWindowFocus: false`

### Где описывать query-хуки

Каждая сущность (FSD-слой `entities/<name>`) или фича (`features/<name>`) объявляет свои query/mutation-хуки в подпапке `model/`:

```
entities/user/
├── model/
│   └── queries.ts   ← useCurrentUser, meQueryOptions, userKeys
└── index.ts         ← реэкспорт публичного API
```

`queryOptions(...)` используется, когда тот же набор опций нужен и в `useQuery`, и в `queryClient.ensureQueryData` (например, в `beforeLoad` роутов).

### Соглашения по `queryKey`

- Иерархический массив: `[<scope>, <entity>, ...<filters>]`
- Примеры:
  - `["user", "me"]` — текущий пользователь
  - `["admin", "users"]` — список пользователей в админке
  - `["admin", "groups"]`, `["admin", "schedule"]`, `["admin", "teachers"]`
  - `["schedule", "week", "current"]`, `["notes", { schedule_item_id: 42 }]`
- Для часто переиспользуемых ключей объявлять объект-фабрику (`userKeys.me`, `userKeys.byId(id)`) рядом с query-хуками

### Сценарий: получение данных

```ts
// entities/user/model/queries.ts
export const useCurrentUser = () => {
  const q = useQuery(meQueryOptions);
  return { user: q.data ?? null, isLoading: q.isPending, isError: q.isError };
};

// в компоненте:
const { user, isLoading } = useCurrentUser();
```

**Правила:**

- Компонент **не вызывает** `apiClient`/`*Api` напрямую для чтения. Только через `useQuery`/`useQueries` или query-хук.
- Никаких `useEffect(() => { fetch() }, [])` + `useState` для серверных данных — это ручной кэш в обход Query.
- Не копировать `query.data` в локальный `useState` — компонент должен читать прямо из результата хука.

### Сценарий: предзагрузка в роуте (TanStack Router)

```ts
// src/routes/admin.tsx
beforeLoad: async () => {
  const user = await queryClient.ensureQueryData(meQueryOptions);
  if (!user) throw redirect({ to: "/login" });
  if (user.role !== "admin") throw redirect({ to: "/" });
},
```

`ensureQueryData` использует тот же кэш, что и `useQuery` в компоненте — повторного запроса не будет.

### Сценарий: отправка данных (мутации)

```ts
const queryClient = useQueryClient();
const createMutation = useMutation({
  mutationFn: (data: GroupCreate) => adminApi.groups.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["admin", "groups"] });
  },
  onError: () => setLocalError("Не удалось создать группу"),
});

// триггер:
createMutation.mutate(formData);
```

**Правила:**

- После успешной мутации — **инвалидация** соответствующих query (`invalidateQueries`), а не ручное `setState((prev) => [...])` в локальном кэше.
- `mutation.isPending` использовать для дизейбла кнопки. Свой `useState("isPending")` не заводить.
- Если мутация возвращает обновлённую сущность и список перезапрашивать дорого — допустимо `queryClient.setQueryData(key, updater)` как оптимизация.

### Сценарий: вход / выход

- **Логин** — `useMutation` с `mutationFn = login + me`. В `onSuccess` записываем результат в кэш через `queryClient.setQueryData(userKeys.me, user)` — это сразу даёт авторизованную сессию без повторного запроса `/me`.
- **Логаут** — `useMutation(authApi.logout)`. В `onSettled` очищаем `userKeys.me` (`setQueryData(..., null)`) и вызываем `invalidateQueries()` для сброса всех серверных данных, затем редирект на `/login`.

### Когда нужен Zustand

Сейчас в проекте Zustand-стора нет — вся серверка покрыта Query, локальные UI-флаги покрываются `useState`. Заводить Zustand-стор оправдано, только если состояние:

1. **Чисто UI-шное** (не приходит с бэкенда и не отправляется на бэкенд)
2. **Глобальное** (нужно нескольким несвязанным компонентам, проброс через пропсы/контекст неудобен)
3. **Долгоживущее** (переживает размонтирование инициатора)

Примеры допустимых сторов: тема оформления, открытость глобальной command-palette, развёрнутость сайдбара. Стор размещается в соответствующем FSD-слое (`entities/<name>/model/store.ts` или `features/<name>/model/store.ts`).

### Чек-лист перед добавлением состояния

1. Эти данные приходят с сервера? → **TanStack Query**, не Zustand и не `useState`.
2. Это локальный UI-стейт одного компонента? → **`useState`**.
3. Это UI-стейт, нужный нескольким компонентам? → подняться по дереву; если неудобно — **Zustand**.
4. Это форма? → `useState`/`react-hook-form`. После сабмита — мутация.
