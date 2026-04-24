# CampusMadi — Frontend

## Ссылки

- **Figma-дизайн**: https://www.figma.com/design/pTsZK5yITi1GIBE4rWJwIj/Untitled?node-id=0-1&t=QLj2KIovMcJskEeD-1
- **Figma JSON-контекст**: `frontend/figma-design-context.json` — выжимка макета (экраны, компоненты, цвета), используй если Figma MCP недоступен
- **API-спецификация**: `frontend/api-spec.json` (OpenAPI 3.1.0, версия 0.8.1)
- **Бэкенд**: папка `Backend/` — не трогать, только читать для справки

---

## Стек

| Слой            | Технология                                      |
| --------------- | ----------------------------------------------- |
| Фреймворк       | React 19 + TanStack Start (SSR/RSC)             |
| Роутинг         | TanStack Router (file-based, `src/routes/`)     |
| Стейт           | Zustand 5                                       |
| Стили           | Tailwind CSS 4 + `tailwind-merge` + `cva`/`clsx` |
| UI-примитивы    | shadcn (в `src/shared/shadcn/`)                 |
| Иконки          | lucide-react                                    |
| Анимации        | framer-motion                                   |
| Валидация       | Zod 4                                           |
| Тесты           | Vitest + Testing Library                        |
| Сборка          | Vite 7                                          |
| Пакетный мен.   | pnpm                                            |

Алиас для импортов: `#/*` → `./src/*`  
Пример: `import { cn } from '#/shared/lib/utils'`

---

## Архитектура — Feature-Sliced Design (FSD)

```
src/
├── app/          # Инициализация: стили, провайдеры
├── pages/        # Страницы (компонуют widgets/features)
├── widgets/      # Самодостаточные блоки UI
├── features/     # Фичи с бизнес-логикой
├── entities/     # Сущности предметной области
├── shared/       # Переиспользуемые утилиты, UI, API
│   ├── api/      # HTTP-клиент и типы запросов
│   ├── config/   # Конфиги (baseUrl и т.д.)
│   ├── lib/      # Утилиты (cn, helpers)
│   ├── shadcn/   # shadcn-компоненты (ослаблен lint)
│   └── ui/       # Базовые UI-компоненты
└── routes/       # Файловый роутинг TanStack Router
```

**Правила FSD:**
- Слои импортируют только вниз: `pages → widgets → features → entities → shared`
- Каждый слой/сегмент имеет публичный `index.ts` (public API)
- Нельзя импортировать между фичами напрямую — только через shared или entities

---

## API бэкенда

Базовый URL: настраивается в `src/shared/config/index.ts`  
Аутентификация: JWT в HttpOnly cookie (`access_token`)

### Эндпоинты

#### Auth — `/api/jwt/*`
| Метод | Путь              | Описание                          |
| ----- | ----------------- | --------------------------------- |
| GET   | `/api/jwt/me`     | Профиль текущего пользователя     |
| POST  | `/api/jwt/login`  | Вход (логин + пароль → cookie)   |
| POST  | `/api/jwt/logout` | Выход (удаляет cookies)           |
| POST  | `/api/jwt/refresh`| Обновление токенов по refresh     |

#### Schedule — `/api/schedule/*`
| Метод | Путь                        | Описание                              |
| ----- | --------------------------- | ------------------------------------- |
| GET   | `/api/schedule`             | Расписание на день (`?offset=0`)      |
| GET   | `/api/schedule/week/current`| Расписание текущей недели (Пн–Вс)    |

#### Notes — `/api/notes/*`
| Метод  | Путь               | Описание                        |
| ------ | ------------------ | ------------------------------- |
| GET    | `/api/notes`       | Заметки (`?schedule_item_id=`)  |
| POST   | `/api/notes`       | Создать заметку                 |
| GET    | `/api/notes/:id`   | Заметка по ID                   |
| PATCH  | `/api/notes/:id`   | Обновить заметку                |
| DELETE | `/api/notes/:id`   | Удалить заметку                 |

#### Admin — `/api/admin/*`
Доступно только администратору.
- **Groups**: CRUD `/api/admin/groups`, `/api/admin/groups/:id`, расписание группы `/api/admin/groups/:id/schedule`
- **Users**: CRUD `/api/admin/users`, `/api/admin/users/:id`
- **Teachers**: GET `/api/admin/teachers`
- **Schedule**: CRUD `/api/admin/schedule`, `/api/admin/schedule/:id`

### Ключевые схемы

```ts
// Пользователь (из /api/jwt/me)
UserSchema { id, username, name, role }

// Пользователь расширенный (из admin)
UserOut { id, username, name, role, group_id }

// Элемент расписания (из /api/schedule)
ScheduleItemOut {
  id, subject, group_id, group_name, teacher_name,
  day_of_week, pair_number, week_type,  // "odd" | "even" | "both"
  start_time, end_time, date_from, date_to,
  user_notes: NoteOut[], teacher_notes: NoteOut[]
}

// День расписания (из /api/schedule/week/current)
ScheduleDayOut { date, day_of_week, items: ScheduleItemOut[] }

// Заметка
NoteOut { id, author_id, schedule_item_id, text, private }
NoteCreate { schedule_item_id, text, private? }
NoteUpdate { text?, private? }
```

**Роли пользователей:** `admin`, `teacher`, `default` (студент)  
**Типы недели:** `odd` (нечётная), `even` (чётная), `both` (каждая)

---

## Код-стайл

### Prettier
- `semi: true` — точки с запятой везде
- `singleQuote: false` — двойные кавычки
- `trailingComma: 'all'` — висячие запятые
- `printWidth: 100` — максимум 100 символов
- `tabWidth: 2` — 2 пробела
- Tailwind-классы сортируются автоматически (`prettier-plugin-tailwindcss`)

### ESLint
- Только стрелочные функции (`func-style: expression`)
  - Исключение: файлы роутов `src/routes/**` (требование TanStack Router)
- Именование:
  - Типы/интерфейсы — `PascalCase`
  - Переменные/функции — `camelCase`
  - Константы — `camelCase | UPPER_CASE | PascalCase`
  - React-компоненты (экспортируемые) — `PascalCase`
  - Zod-схемы (`*Schema`) — любой из трёх форматов
- Импорты сортируются автоматически (`eslint-plugin-simple-import-sort`)
- `console.log` — предупреждение; разрешены `console.warn`, `console.error`
- Shadcn-компоненты (`src/shared/shadcn/**`) — ослаблены правила именования и стиля функций

---

## Команды

```bash
pnpm run dev      # dev-сервер на порту 3000
pnpm run build    # продакшн-сборка
pnpm run test     # тесты (vitest run)
pnpm run lint     # проверка ESLint
pnpm run check    # Prettier write + ESLint fix
pnpm run fix      # ESLint fix + Prettier write
```

---

## Правила документации

- Каждый слой FSD (features, widgets, entities) должен иметь `README.md` с описанием
- Public API слоя описывается в комментарии к `index.ts`
- Сложная логика (хуки, утилиты) — JSDoc с примером использования
- Переиспользуемые компоненты — PropTypes / интерфейс с комментарием к каждому пропу
