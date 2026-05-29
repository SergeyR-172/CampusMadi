# CampusMadi

Веб-приложение для вуза: просмотр расписания занятий и работа с заметками и
файлами, привязанными к конкретным парам. Три роли — **студент**,
**преподаватель**, **администратор** — с разным набором возможностей.

- [Описание проекта](#описание-проекта)
- [Роли и сценарии использования](#роли-и-сценарии-использования)
- [Архитектура системы](#архитектура-системы)
- [Технологический стек](#технологический-стек)
- [Модель данных](#модель-данных)
- [Бэкенд: API и бизнес-логика](#бэкенд-api-и-бизнес-логика)
- [Аутентификация и авторизация](#аутентификация-и-авторизация)
- [Кеширование (Redis)](#кеширование-redis)
- [Фронтенд: архитектура и функциональность](#фронтенд-архитектура-и-функциональность)
- [Инфраструктура и деплой](#инфраструктура-и-деплой)
- [Логирование и мониторинг](#логирование-и-мониторинг)
- [Локальный запуск](#локальный-запуск)
- [Правила работы с репозиторием](#правила-работы-с-репозиторием)

Дополнительные документы:

- [docs.md](docs.md) — правила работы с ветками, коммитами и тестовые учётные записи
- [deploy/README.md](deploy/README.md) — пошаговый деплой на три сервера
- [frontend/CLAUDE.md](frontend/CLAUDE.md) — правила и стек фронтенда
- [frontend/api-spec.json](frontend/api-spec.json) — OpenAPI 3.1.0 спецификация API (версия 0.8.1)
- [frontend/src/features/admin-json-import/README.md](frontend/src/features/admin-json-import/README.md) — формат JSON-импорта для админки

---

## Описание проекта

CampusMadi — это SPA-приложение, состоящее из трёх независимо разворачиваемых
частей:

- **Frontend** — React-приложение (SPA), которое раздаётся через nginx;
- **Backend API** — FastAPI-сервис на Python;
- **База данных** — PostgreSQL, плюс Redis для кеширования.

Суть системы:

- **студент** смотрит расписание своей группы, ведёт личные заметки к занятиям и
  скачивает прикреплённые преподавателем файлы;
- **преподаватель** смотрит расписание своих пар, ведёт публичные и приватные
  заметки к своим занятиям, прикрепляет файлы к парам;
- **администратор** через отдельную админ-панель управляет пользователями,
  группами, преподавателями и расписанием (в том числе массовым импортом из JSON).

---

## Роли и сценарии использования

В системе три роли (`role` пользователя):

| Роль       | Значение в БД | Возможности |
| ---------- | ------------- | ----------- |
| Студент    | `default`     | Расписание своей группы; личные заметки к занятиям; просмотр публичных заметок преподавателя; скачивание прикреплённых файлов. |
| Преподаватель | `teacher`  | Расписание своих пар; публичные и приватные заметки к своим занятиям; загрузка/удаление файлов к своим парам. |
| Администратор | `admin`    | Полный CRUD по пользователям, группам и расписанию; список преподавателей; массовый JSON-импорт. |

### Ключевые бизнес-правила

- **Заметки привязаны к конкретной дате занятия** (`lesson_date`), а не просто к
  элементу расписания. Дата обязана соответствовать элементу расписания (день
  недели, тип недели odd/even/both, диапазон `date_from..date_to`).
- **Студент** может иметь **одну** заметку на занятие в конкретную дату; все его
  заметки приватны по смыслу (флаг `private` принудительно сбрасывается в `false`).
- **Преподаватель** может иметь **две** заметки на занятие в дату: одну публичную
  (видна студентам группы) и одну приватную (видна только ему).
- **Файлы к занятию** загружает только преподаватель этой пары; видят их
  преподаватель и студенты группы, к которой относится занятие. Лимит — 25 МБ.
- **Конфликты расписания**: нельзя создать две пары для одной группы с одинаковыми
  днём недели, номером пары, типом недели и пересекающимся периодом дат.

---

## Архитектура системы

```
┌──────────────┐      HTTP(S)      ┌──────────────────────┐      ┌──────────────┐
│   Браузер    │ ────────────────► │  nginx (Frontend)    │      │              │
│  (React SPA) │                   │  - раздаёт статику   │      │              │
└──────────────┘                   │  - проксирует /api/* │      │              │
                                   └──────────┬───────────┘      │              │
                                              │ /api/*           │              │
                                              ▼                  │              │
                                   ┌──────────────────────┐      │  PostgreSQL  │
                                   │  FastAPI (uvicorn)    │ ───► │   (данные)   │
                                   │  - JWT auth           │      │              │
                                   │  - schedule/notes/... │      └──────────────┘
                                   └──────────┬───────────┘
                                              │
                                              ▼
                                       ┌────────────┐
                                       │   Redis    │  кеш расписания
                                       └────────────┘
```

Браузер общается **только** с фронт-сервером. Nginx раздаёт собранный SPA и
проксирует все запросы `/api/*` на бэкенд — поэтому для браузера всё выглядит как
один origin, и CORS на практике не задействуется.

Бэкенд:
- читает/пишет данные в **PostgreSQL** (через async SQLAlchemy + asyncpg);
- кеширует сериализованное расписание в **Redis** (короткий TTL);
- хранит загруженные файлы в локальной файловой системе / volume (`uploads/`).

### Структура репозитория

```
.
├── Backend/            # FastAPI-приложение (read-only для фронт-разработки)
│   ├── api/            # роутеры по доменам: jwt_auth, admin, notes, attachments, schedule
│   ├── core/           # settings, database, redis, logging, models
│   ├── logging/        # конфиги Loki/Promtail/Grafana
│   ├── main.py         # точка входа FastAPI
│   ├── init_db.py      # создание схемы (drop_all + create_all)
│   └── create_test_users.py  # сидинг тестовых данных
├── frontend/           # React SPA (TanStack Router, FSD-архитектура)
│   ├── src/
│   ├── Dockerfile      # multi-stage: node build → nginx
│   └── nginx.conf      # SPA fallback + проксирование /api/*
├── deploy/             # compose-файлы для деплоя на 3 сервера (db/backend/frontend)
├── docker-compose.yml  # локальный запуск всего стека одной командой
└── docs.md             # правила репозитория и тестовые учётки
```

---

## Технологический стек

### Бэкенд

| Слой | Технология |
| ---- | ---------- |
| Язык | Python 3.13 |
| Веб-фреймворк | FastAPI |
| ASGI-сервер | uvicorn |
| ORM | SQLAlchemy 2.0 (async) |
| Драйвер БД | asyncpg (PostgreSQL), aiosqlite (dev/SQLite) |
| СУБД | PostgreSQL 16 |
| Кеш | Redis 8 (`redis.asyncio`) |
| Конфигурация | pydantic-settings |
| Аутентификация | PyJWT (access), `secrets` + SHA-256 (refresh), bcrypt (пароли) |
| Загрузка файлов | python-multipart |
| Пакетный менеджер | uv (lock-файл `uv.lock`) |

### Фронтенд

| Слой | Технология |
| ---- | ---------- |
| Фреймворк | React 19 |
| Роутинг | TanStack Router (file-based, `src/routes/`, auto code-splitting) |
| Серверный стейт | TanStack Query 5 |
| UI-стейт | Zustand 5 |
| Стили | Tailwind CSS 4 + `tailwind-merge` + `cva`/`clsx` |
| Иконки | lucide-react |
| Анимации | framer-motion |
| Валидация | Zod 4 |
| Тесты | Vitest + Testing Library |
| Сборка | Vite 7 |
| Пакетный менеджер | pnpm |

Алиас импортов: `#/*` → `./src/*` (например, `import { cn } from "#/shared/lib/utils"`).

### Инфраструктура

- Docker + Docker Compose (локально и в продакшене);
- nginx (раздача SPA и reverse-proxy);
- Loki + Promtail + Grafana (агрегация логов и дашборды) — опционально.

---

## Модель данных

Все таблицы наследуют базовый класс с полями `created_at` / `updated_at`
([Backend/core/models/base.py](Backend/core/models/base.py)).

```
┌─────────────┐         ┌──────────────────┐         ┌────────────────────┐
│   groups    │ 1     * │  schedule_items  │ *     1 │       users        │
│─────────────│◄────────│──────────────────│────────►│────────────────────│
│ id          │         │ id               │ teacher │ id                 │
│ name (uniq) │         │ subject          │         │ username (uniq)    │
└─────┬───────┘         │ group_id (FK)    │         │ hashed_password    │
      │ 1               │ teacher_id (FK)  │         │ name               │
      │                 │ day_of_week 1..7 │         │ role               │
      │ *               │ pair_number      │         │ group_id (FK,null) │
┌─────▼───────┐         │ week_type        │         └────┬───────────────┘
│   users     │         │ start/end_time   │              │ 1
│ (студенты)  │         │ date_from/to     │              │
└─────────────┘         └────────┬─────────┘              │ *
                                 │ 1            ┌──────────▼──────────┐
                  ┌──────────────┼──────────┐  │   refresh_tokens    │
                  │ *            │ *         │  │ token_hash, user_id │
          ┌───────▼──────┐ ┌─────▼─────────┐│  │ expires_at, revoked │
          │    notes     │ │lesson_attach. ││  └─────────────────────┘
          │ author_id    │ │ schedule_item ││
          │ schedule_item│ │ lesson_date   ││
          │ lesson_date  │ │ teacher_id    ││
          │ text, private│ │ stored/path   ││
          └──────────────┘ │ content/size  ││
                           └───────────────┘│
```

### Таблицы

- **groups** — учебные группы (`name` уникален).
- **users** — пользователи всех ролей. `group_id` заполняется только у студентов
  (при удалении группы — `SET NULL`). Пароли хранятся как bcrypt-хеши.
- **schedule_items** — элементы расписания. Привязаны к группе и преподавателю;
  содержат день недели (1–7), номер пары, тип недели (`odd`/`even`/`both`),
  время начала/конца и период действия (`date_from`..`date_to`).
- **notes** — заметки. Привязаны к автору (`author_id`), элементу расписания и
  **конкретной дате** (`lesson_date`). Флаг `private` различает публичные и
  приватные заметки. Уникальное ограничение: `(author_id, schedule_item_id,
  lesson_date, private)` — отсюда правило «одна заметка на слот» (для
  преподавателя — по одной на каждое значение `private`).
- **lesson_attachments** — файлы, прикреплённые к паре в конкретную дату.
  Хранят оригинальное имя, сгенерированное имя на диске, путь, MIME-тип и размер.
- **refresh_tokens** — выданные refresh-токены (хранится SHA-256-хеш), с временем
  истечения и отзыва; используются для ротации сессий.

---

## Бэкенд: API и бизнес-логика

Приложение собирается в [Backend/main.py](Backend/main.py): подключаются роутеры,
middleware логирования и CORS. Документация Swagger доступна на `/docs`,
проверка живости — на `/healthcheck`.

Каждый домен в `Backend/api/<domain>/` устроен одинаково:
`router.py` (эндпоинты) + `crud.py` (доступ к БД) + `schemas.py` (Pydantic-схемы),
при необходимости `utils.py`/`dependencies.py`.

### Auth — `/api/jwt/*`

| Метод | Путь | Описание |
| ----- | ---- | -------- |
| GET  | `/api/jwt/me`      | Профиль текущего пользователя (по cookie). |
| POST | `/api/jwt/login`   | Вход: логин+пароль → выдаёт access и ставит access/refresh в HttpOnly cookies. |
| POST | `/api/jwt/logout`  | Выход: отзывает refresh-токен и удаляет cookies. |
| POST | `/api/jwt/refresh` | Ротация: проверяет refresh-токен, выдаёт новую пару (старый refresh отзывается). |

### Schedule — `/api/schedule/*`

| Метод | Путь | Описание |
| ----- | ---- | -------- |
| GET | `/api/schedule?offset=0`       | Расписание на день (offset в днях от сегодня). Студенту — по его группе, преподавателю — по его парам. |
| GET | `/api/schedule/week/current`   | Расписание на текущую неделю (Пн–Вс). |

Сериализация ([Backend/api/schedule/utils.py](Backend/api/schedule/utils.py))
для каждого занятия собирает:
- `teacher_notes` — публичные заметки преподавателя пары;
- `user_notes` — заметки текущего пользователя (для преподавателя — только его
  приватные);
- `attachments` — файлы к занятию на эту дату.

### Notes — `/api/notes/*`

| Метод | Путь | Описание |
| ----- | ---- | -------- |
| GET    | `/api/notes?schedule_item_id=&lesson_date=` | Заметки текущего пользователя (с фильтрами). |
| GET    | `/api/notes/{id}` | Заметка по ID (только своя). |
| POST   | `/api/notes`      | Создать заметку (с проверкой даты и лимита на слот). |
| PATCH  | `/api/notes/{id}` | Обновить свою заметку. |
| DELETE | `/api/notes/{id}` | Удалить свою заметку. |

Доступ строго проверяется: пользователь работает только со своими заметками, и
только для занятий, к которым он имеет отношение (преподаватель — к своим парам,
студент — к парам своей группы).

### Attachments — `/api/attachments/*`

| Метод | Путь | Описание |
| ----- | ---- | -------- |
| POST   | `/api/attachments` | Загрузить файл к паре (multipart: `schedule_item_id`, `lesson_date`, `file`). Только преподаватель пары. |
| GET    | `/api/attachments?schedule_item_id=&lesson_date=` | Список файлов занятия. |
| GET    | `/api/attachments/{id}/download` | Скачать файл. |
| DELETE | `/api/attachments/{id}` | Удалить файл (только преподаватель пары). |

Файлы сохраняются в `uploads/lesson_attachments/{schedule_item_id}/{lesson_date}/`
с уникальным именем; лимит размера — 25 МБ (стрим читается чанками, при превышении
файл удаляется).

### Admin — `/api/admin/*`

Все эндпоинты требуют роль `admin` (зависимость `is_admin`).

- **Groups**: `GET/POST /api/admin/groups`, `GET/PATCH/DELETE /api/admin/groups/{id}`,
  `GET /api/admin/groups/{id}/schedule`.
- **Users**: `GET/POST /api/admin/users`, `GET/PATCH/DELETE /api/admin/users/{id}`.
- **Teachers**: `GET /api/admin/teachers` (с пагинацией).
- **Schedule**: `GET/POST /api/admin/schedule`, `GET/PATCH/DELETE /api/admin/schedule/{id}`.

При создании/обновлении расписания проверяются: существование группы и
преподавателя, корректность времени (`end > start`) и дат (`date_to >= date_from`),
а также отсутствие конфликта по слоту.

---

## Аутентификация и авторизация

Схема — **JWT в HttpOnly cookies** с ротацией refresh-токенов:

1. **Login** проверяет пароль (bcrypt) и выдаёт:
   - короткоживущий **access-токен** (JWT, payload: `sub`, `username`, `role`,
     `group_id`; TTL задаётся `ACCESS_TOKEN_EXPIRE_MINUTES`);
   - **refresh-токен** (случайная строка `secrets.token_urlsafe`, TTL 30 дней).
   В БД хранится только **SHA-256-хеш** refresh-токена.
2. Оба токена ставятся в HttpOnly cookies (`access_token`, `refresh_token`).
3. Защищённые ручки читают access-токен из cookie (`APIKeyCookie`), декодируют
   JWT и валидируют payload.
4. **Refresh** проверяет хеш refresh-токена в БД, отзывает старый и выдаёт новую
   пару (rotation) — защита от повторного использования.
5. **Logout** отзывает refresh-токен и чистит cookies.

Авторизация по ролям выполняется зависимостями FastAPI: `get_current_payload`,
`get_current_user`, `is_admin`. Доменная авторизация (чья это заметка/пара/группа)
проверяется в самих роутерах.

> **Безопасность.** В текущей конфигурации cookies выставляются с `secure=False`
> (рассчитано на HTTP/внутреннюю сеть). Для публичного HTTPS-деплоя нужно
> включить `secure=True` и настроить TLS — см. ограничения в [deploy/README.md](deploy/README.md).

---

## Кеширование (Redis)

Расписание — самые частые и тяжёлые запросы, поэтому сериализованный результат
кешируется в Redis с коротким TTL (`DAY_SCHEDULE_TTL` / `WEEK_SCHEDULE_TTL`,
по умолчанию 5 секунд).

Ключи строятся отдельно для студентов (по группе) и преподавателей (по
пользователю), например:

```
schedule:day:user:{user_id}:group:{group_id}:date:{YYYY-MM-DD}
schedule:week:teacher:{user_id}:monday:{YYYY-MM-DD}
```

Недельное расписание собирается из дневных (которые тоже кешируются), что
сглаживает нагрузку на БД при навигации по дням. Короткий TTL означает, что
свежесозданные заметки/файлы появляются почти сразу — отдельная инвалидация
кеша не требуется.

---

## Фронтенд: архитектура и функциональность

### Архитектура — Feature-Sliced Design (FSD)

```
src/
├── app/        # инициализация: стили, провайдеры
├── pages/      # страницы (компонуют widgets/features): home, login, admin
├── widgets/    # самодостаточные блоки UI: days-strip, day-details,
│               #   notes-panel, schedule-header, home-sidebar
├── features/   # фичи с бизнес-логикой: auth, admin-json-import
├── entities/   # сущности домена: user, schedule, notes, attachments
├── shared/     # переиспользуемое: api/, config/, lib/, ui/, shadcn/
└── routes/     # файловый роутинг TanStack Router
```

**Правила FSD:** слои импортируют только вниз
(`pages → widgets → features → entities → shared`); у каждого слоя есть публичный
`index.ts`; фичи не импортируют друг друга напрямую — только через `shared`/`entities`.

### Роутинг

File-based маршруты в `src/routes/`:
- `/` — главная страница (расписание);
- `/login` — вход;
- `/admin`, `/admin/users`, `/admin/groups`, `/admin/schedule` — админ-панель;
- `$.tsx` — catch-all (404).

Корневой роут оборачивает приложение в `QueryClientProvider`
([src/routes/__root.tsx](frontend/src/routes/__root.tsx)).

### Управление состоянием

- **TanStack Query** — все серверные данные: загрузка, кеш, инвалидация, мутации.
  Запросы оформлены как `queryOptions`/хуки в `entities/*/model/queries.ts`
  (например, `useScheduleDay`, `useScheduleWeek`). Дефолты: `staleTime` 60 с,
  `retry` 1, без рефетча по фокусу окна.
- **Zustand** — только UI-состояние (модалки, флаги, локальные настройки).
  Серверные данные в Zustand не дублируются.

### HTTP-клиент

[src/shared/api/client.ts](frontend/src/shared/api/client.ts) — обёртка над
`fetch` с `credentials: "include"` (отправка cookies). Ключевая особенность:
при ответе **401** на не-auth путях клиент один раз пытается выполнить
`/api/jwt/refresh` (с дедупликацией параллельных рефрешей) и повторяет исходный
запрос. Ошибки парсятся в `ApiError` с человекочитаемым `detail` от бэкенда.

Доменные API сгруппированы: `authApi`, `scheduleApi`, `notesApi`,
`attachmentsApi`, `adminApi`.

### Основные экраны

- **Login** ([features/auth](frontend/src/features/auth)) — форма входа.
- **Home** ([pages/home](frontend/src/pages/home)) — главный экран:
  - сайдбар, шапка с данными пользователя;
  - `DaysStrip` — лента дней для выбора даты;
  - `DayDetails` — список пар выбранного дня;
  - `NotesPanel` — заметки и вложения выбранной пары (создание/редактирование
    заметок, список и загрузка/скачивание файлов).
  Текущая неделя подгружается в фоне, чтобы переключение между днями было мгновенным.
- **Admin** ([pages/admin](frontend/src/pages/admin)) — управление пользователями,
  группами и расписанием; включает фичу **JSON-импорта**.

### Фича: массовый JSON-импорт (admin-json-import)

Администратор может загрузить JSON-файл — последовательность API-запросов к
`/api/admin/*` — и выполнить их одним нажатием. Поддерживаются ссылки на ответы
предыдущих запросов (`$ref` и плейсхолдеры `{{alias.path}}`), что позволяет,
например, создать группу и сразу завести в неё студентов с подставленным
`group_id`. Запросы выполняются последовательно; при первой ошибке выполнение
останавливается с подробным отчётом. Полная спецификация формата —
[frontend/src/features/admin-json-import/README.md](frontend/src/features/admin-json-import/README.md).

### Команды фронтенда

```bash
pnpm run dev      # dev-сервер на порту 3000 (проксирует /api на backend:8000)
pnpm run build    # продакшн-сборка (результат в dist/)
pnpm run test     # тесты (vitest run)
pnpm run lint     # ESLint
pnpm run check    # Prettier write + ESLint fix
```

Код-стайл: двойные кавычки, точки с запятой, висячие запятые, ширина 100,
2 пробела; импорты и Tailwind-классы сортируются автоматически; используются
только стрелочные функции (кроме файлов роутов). Подробнее — [frontend/CLAUDE.md](frontend/CLAUDE.md).

---

## Инфраструктура и деплой

### Контейнеризация

- **Backend** ([Backend/Dockerfile](Backend/Dockerfile)) — `python:3.13-slim`,
  зависимости ставятся через `uv sync` с кешированием слоёв; запускается uvicorn.
- **Frontend** ([frontend/Dockerfile](frontend/Dockerfile)) — multi-stage:
  этап 1 (`node:20-alpine` + pnpm) собирает SPA → этап 2 (`nginx:alpine`) раздаёт
  статику. `nginx.conf` используется как шаблон: `${BACKEND_HOST}` подставляется
  через `envsubst` при старте контейнера.
- **nginx** ([frontend/nginx.conf](frontend/nginx.conf)) — SPA-fallback
  (`try_files ... /index.html`) и проксирование `/api/*` на бэкенд с сохранением
  префикса `/api`.

### Продакшн: деплой на три сервера

Конфигурация в [deploy/](deploy/) рассчитана на разнесение по трём машинам в
приватной сети:

| Сервер | Адрес (пример) | Что крутится |
| ------ | -------------- | ------------ |
| БД | `10.10.213.48` | PostgreSQL 16 (`deploy/db`) |
| Backend | `10.10.213.15` | Redis + FastAPI (`deploy/backend`) |
| Frontend | `10.10.213.240` | nginx + собранный SPA (`deploy/frontend`) |

Клиент ходит только на фронт-сервер (порт 80); nginx проксирует `/api/*` на
бэкенд; бэкенд ходит на сервер БД и локальный Redis. Каждый сервер настраивается
своим `.env` (есть `.env.example`). Постоянные данные — в named volumes:
`postgres_data` (БД) и `uploads_data` (файлы). Пошаговая инструкция, настройка
ufw и бэкапов — в [deploy/README.md](deploy/README.md).

### Конфигурация бэкенда (переменные окружения)

| Переменная | Назначение | По умолчанию |
| ---------- | ---------- | ------------ |
| `DB_TYPE` | `postgres` или `sqlite` | `sqlite` |
| `POSTGRES_USER/PASSWORD/HOST/PORT/DB` | подключение к PostgreSQL | — |
| `REDIS_URL` | строка подключения к Redis | `redis://localhost:6379/0` |
| `SECRET_KEY` | секрет для подписи JWT | `very-secret-key` (сменить!) |
| `ALGORITHM` | алгоритм JWT | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | TTL access-токена | `5` |
| `DAY_SCHEDULE_TTL` / `WEEK_SCHEDULE_TTL` | TTL кеша расписания (сек) | `5` |
| `UPLOAD_DIR` | каталог хранения файлов | `<repo>/uploads` |

### Известные ограничения

- `init_db.py` деструктивен (`drop_all` + `create_all`) — запускать только на
  чистой БД; миграций (Alembic) пока нет.
- `create_test_users.py` создаёт тестовых пользователей с дефолтными паролями —
  после деплоя их нужно сменить или удалить.
- CORS настроен как `allow_origins=["*"]` + `allow_credentials=True` — в текущей
  схеме (всё через nginx как same-origin) не мешает, но при прямых кросс-доменных
  запросах сломается.
- HTTPS не настроен из коробки.

---

## Логирование и мониторинг

Бэкенд пишет **структурированные JSON-логи** через middleware
([Backend/core/logging.py](Backend/core/logging.py)): по каждому запросу
фиксируются метод, путь, статус, IP клиента и длительность в мс; необработанные
исключения логируются с трейсбеком и статусом 500.

Опциональный стек наблюдаемости поднимается через
[Backend/docker-compose.logging.yml](Backend/docker-compose.logging.yml):
- **Promtail** собирает логи контейнеров (через docker socket);
- **Loki** агрегирует и хранит логи;
- **Grafana** (порт 3000) визуализирует — есть преднастроенный дашборд
  `backend-overview` и datasource на Loki.

---

## Локальный запуск

Самый простой способ — поднять весь стек одной командой через корневой
[docker-compose.yml](docker-compose.yml) (PostgreSQL + Redis + бэкенд с
автоинициализацией БД и тестовыми данными):

```bash
docker compose up --build
```

После старта:
- Swagger-документация API — http://localhost:8000/docs
- Healthcheck — http://localhost:8000/healthcheck

Тестовые учётные записи (создаются `create_test_users.py`):

| Логин | Пароль | Роль | Группа |
| ----- | ------ | ---- | ------ |
| `test_admin` | `admin123` | admin | — |
| `test_teacher` | `teacher123` | teacher | — |
| `test_teacher_2` | `teacher123` | teacher | — |
| `test_student_1` | `user123` | default | SE-241 |
| `test_student_2` | `user123` | default | SE-241 |
| `test_student_3` | `user123` | default | SE-242 |

`login` возвращает access-токен в ответе и ставит его в cookies. Для проверки
`/api/jwt/me` в Swagger вставьте токен в Authorize или добавьте заголовок
`Authorization: Bearer <access_token>`.

### Фронтенд отдельно

```bash
cd frontend
pnpm install
pnpm run dev      # http://localhost:3000, /api проксируется на localhost:8000
```

---

## Правила работы с репозиторием

Кратко (полностью — в [docs.md](docs.md)):

- **Ветки:** `prod` (стабильный код для деплоя) ← `dev` (основная ветка
  разработки) ← ветки задач.
- **Нейминг веток:** `{отдел}/{смысл}-{название}`, где отдел — `front`/`back`
  (или без отдела для общих задач), смысл — `feat`/`fix`/`refactor`.
  Примеры: `front/feat-user-profile`, `back/fix-auth-token`.
- **Нейминг коммитов:** `{отдел}/{смысл}: {описание}`.
  Пример: `back/fix: корректная валидация токенов`.
- **Маршрут изменений:** ветка задачи → `dev` → `prod`.
- В `dev` и `prod` вливают изменения только тимлиды (Арсений, Сергей).
