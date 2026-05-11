# admin-json-import — формат файла импорта

Фича позволяет администратору загрузить JSON-файл с инструкцией —
последовательностью API-запросов, и выполнить их одним нажатием.
Поддерживается **любой** админ-эндпоинт (`/api/admin/*`), потому что в файле
напрямую указывается `method` + `endpoint` + `body`.

Эта документация — спецификация формата. Скармливайте её LLM, чтобы быстро
генерировать готовые JSON-инструкции.

---

## Структура корневого объекта

```jsonc
{
  "version": "1",                  // обязательно, строго "1"
  "name": "Импорт группы 1-АТП-1", // необязательно, человекочитаемое название
  "description": "...",            // необязательно
  "requests": [ /* ... */ ]        // обязательно, непустой массив
}
```

## Структура запроса (элемент `requests[]`)

```jsonc
{
  "method": "POST",                       // "GET" | "POST" | "PATCH" | "DELETE"
  "endpoint": "/api/admin/groups",        // путь относительно baseUrl, должен начинаться с "/"
  "body": { /* JSON-тело для POST/PATCH */ },
  "ref": "group_1"                        // необязательная метка для $ref-ссылок
}
```

- `body` — игнорируется для `GET`/`DELETE`.
- `ref` — уникален в пределах файла; задаётся, если на ответ этого запроса
  будут ссылаться следующие.

## Подстановка значений из предыдущих ответов

Часто нужно: сначала создать группу, потом — студентов с `group_id`
этой группы. ID группы заранее неизвестен.

Решение: пометить создающий запрос `ref`-ом, а в последующих —
сослаться через `$ref`.

### Вариант 1: объект `{ "$ref": "alias.path" }`

Любое значение в `body` можно заменить на объект:

```json
{ "$ref": "group_1.id" }
```

`alias` — это `ref` предыдущего запроса. `path` — dotted-путь внутри
JSON-ответа (поддерживает индексы массивов: `items.0.id`).

Пример:

```json
{
  "method": "POST",
  "endpoint": "/api/admin/users",
  "body": {
    "username": "ivanov",
    "password": "qwerty123",
    "name": "Иванов И. И.",
    "role": "default",
    "group_id": { "$ref": "group_1.id" }
  }
}
```

### Вариант 2: плейсхолдер `{{alias.path}}` внутри строки

Удобно для подстановки в `endpoint` или внутрь строкового поля:

```jsonc
{ "method": "DELETE", "endpoint": "/api/admin/groups/{{group_1.id}}" }
```

```jsonc
{ "body": { "name": "Группа {{group_1.id}}" } }
```

---

## Доступные эндпоинты администратора

Все требуют, чтобы текущий пользователь был `admin` (cookie уже стоит — фронт
её отправляет автоматически).

### Группы — `/api/admin/groups`

| Метод   | Путь                              | Тело (`body`)                |
| ------- | --------------------------------- | ---------------------------- |
| GET     | `/api/admin/groups`               | —                            |
| GET     | `/api/admin/groups/:id`           | —                            |
| POST    | `/api/admin/groups`               | `GroupCreate`                |
| PATCH   | `/api/admin/groups/:id`           | `GroupUpdate`                |
| DELETE  | `/api/admin/groups/:id`           | —                            |
| GET     | `/api/admin/groups/:id/schedule`  | —                            |

```ts
GroupCreate = { name: string }
GroupUpdate = { name?: string | null }
```

### Пользователи — `/api/admin/users`

| Метод   | Путь                       | Тело (`body`) |
| ------- | -------------------------- | ------------- |
| GET     | `/api/admin/users`         | —             |
| GET     | `/api/admin/users/:id`     | —             |
| POST    | `/api/admin/users`         | `UserCreate`  |
| PATCH   | `/api/admin/users/:id`     | `UserUpdate`  |
| DELETE  | `/api/admin/users/:id`     | —             |

```ts
UserCreate = {
  username: string,
  password: string,
  name: string,
  role?: "admin" | "teacher" | "default",  // по умолчанию "default"
  group_id?: number | null                 // только для студентов
}

UserUpdate = {
  username?: string | null,
  password?: string | null,
  name?: string | null,
  role?: "admin" | "teacher" | "default" | null,
  group_id?: number | null
}
```

### Преподаватели — `/api/admin/teachers`

| Метод | Путь                  | Тело |
| ----- | --------------------- | ---- |
| GET   | `/api/admin/teachers` | —    |

### Расписание — `/api/admin/schedule`

| Метод   | Путь                        | Тело                  |
| ------- | --------------------------- | --------------------- |
| GET     | `/api/admin/schedule`       | —                     |
| GET     | `/api/admin/schedule/:id`   | —                     |
| POST    | `/api/admin/schedule`       | `ScheduleItemCreate`  |
| PATCH   | `/api/admin/schedule/:id`   | `ScheduleItemUpdate`  |
| DELETE  | `/api/admin/schedule/:id`   | —                     |

```ts
ScheduleItemCreate = {
  subject: string,
  group_id: number,
  teacher_id: number,
  day_of_week: number,        // 1..7 (Пн..Вс)
  pair_number: number,        // 1..n (номер пары в дне)
  week_type?: "odd" | "even" | "both",  // по умолчанию "both"
  start_time: string,         // "HH:MM" или "HH:MM:SS"
  end_time:   string,
  date_from:  string,         // ISO-дата "YYYY-MM-DD"
  date_to:    string
}

ScheduleItemUpdate = частичный ScheduleItemCreate (все поля nullable)
```

---

## Семантика выполнения

- Запросы выполняются **строго последовательно**, сверху вниз.
- При первой ошибке выполнение **останавливается**, открывается модальное окно
  с подробным отчётом (для каждого шага: OK/FAIL, метод, endpoint, текст ошибки).
- При успехе показывается окно «Импорт завершён».
- После завершения инвалидируются TanStack Query кэши под ключом `["admin", ...]`,
  поэтому списки в админ-панели обновятся автоматически.

---

## Полный пример: создать кафедру преподавателей, группу, студентов и расписание

```json
{
  "version": "1",
  "name": "Запуск группы 1-АТП-1, 1 семестр",
  "description": "Создаём 2 преподавателей, группу, 3 студентов и 2 пары на семестр",
  "requests": [
    {
      "ref": "teacher_math",
      "method": "POST",
      "endpoint": "/api/admin/users",
      "body": {
        "username": "petrov.t",
        "password": "Temp_2026!",
        "name": "Петров П. П.",
        "role": "teacher"
      }
    },
    {
      "ref": "teacher_phys",
      "method": "POST",
      "endpoint": "/api/admin/users",
      "body": {
        "username": "sidorov.t",
        "password": "Temp_2026!",
        "name": "Сидоров С. С.",
        "role": "teacher"
      }
    },
    {
      "ref": "group_atp",
      "method": "POST",
      "endpoint": "/api/admin/groups",
      "body": { "name": "1-АТП-1" }
    },
    {
      "method": "POST",
      "endpoint": "/api/admin/users",
      "body": {
        "username": "ivanov",
        "password": "Stud_2026!",
        "name": "Иванов И. И.",
        "role": "default",
        "group_id": { "$ref": "group_atp.id" }
      }
    },
    {
      "method": "POST",
      "endpoint": "/api/admin/users",
      "body": {
        "username": "smirnov",
        "password": "Stud_2026!",
        "name": "Смирнов А. А.",
        "role": "default",
        "group_id": { "$ref": "group_atp.id" }
      }
    },
    {
      "method": "POST",
      "endpoint": "/api/admin/users",
      "body": {
        "username": "kuznetsov",
        "password": "Stud_2026!",
        "name": "Кузнецов В. В.",
        "role": "default",
        "group_id": { "$ref": "group_atp.id" }
      }
    },
    {
      "method": "POST",
      "endpoint": "/api/admin/schedule",
      "body": {
        "subject": "Математический анализ",
        "group_id":   { "$ref": "group_atp.id" },
        "teacher_id": { "$ref": "teacher_math.id" },
        "day_of_week": 1,
        "pair_number": 2,
        "week_type": "both",
        "start_time": "10:35",
        "end_time":   "12:05",
        "date_from":  "2026-09-01",
        "date_to":    "2026-12-30"
      }
    },
    {
      "method": "POST",
      "endpoint": "/api/admin/schedule",
      "body": {
        "subject": "Физика",
        "group_id":   { "$ref": "group_atp.id" },
        "teacher_id": { "$ref": "teacher_phys.id" },
        "day_of_week": 3,
        "pair_number": 1,
        "week_type": "odd",
        "start_time": "08:55",
        "end_time":   "10:25",
        "date_from":  "2026-09-01",
        "date_to":    "2026-12-30"
      }
    }
  ]
}
```

---

## Перевод группы на другой курс — пример массового PATCH

Если уже знаем `id` группы (например, 17), `$ref` не нужен:

```json
{
  "version": "1",
  "name": "Перевод 1-АТП-1 → 2-АТП-1",
  "requests": [
    {
      "method": "PATCH",
      "endpoint": "/api/admin/groups/17",
      "body": { "name": "2-АТП-1" }
    }
  ]
}
```

---

## Подсказки для LLM-генерации

1. **Никогда** не выдумывай ID — если ID неизвестен заранее, создавай сущность
   `POST`-ом с `ref` и ссылайся через `{ "$ref": "alias.id" }`.
2. Соблюдай порядок: сначала зависимости (группа, преподаватели), потом —
   зависящие сущности (студенты, расписание).
3. Все строки времени — `"HH:MM"` (или `"HH:MM:SS"`), все даты — `"YYYY-MM-DD"`.
4. `day_of_week`: 1=Пн … 7=Вс.
5. `week_type`: `"odd"` (нечётная), `"even"` (чётная), `"both"` (каждую неделю).
6. Не оборачивай ответ в markdown — пользователь сохраняет файл `.json`,
   поэтому отдавай **чистый JSON**.
