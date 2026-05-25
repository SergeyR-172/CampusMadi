# Деплой CampusMadi на три сервера

## Архитектура

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│  Сервер 1: БД           │     │  Сервер 2: Backend      │     │  Сервер 3: Frontend     │
│  10.10.213.48           │◄────┤  10.10.213.15           │◄────┤  10.10.213.240          │
│                         │     │                         │     │                         │
│  • postgres:16-alpine   │     │  • redis:8-alpine       │     │  • nginx:alpine         │
│    порт 5432            │     │  • FastAPI (uvicorn)    │     │    порт 80              │
│                         │     │    порт 8000            │     │                         │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
        postgres_data                  uploads_data                  (статика в образе)
        (volume)                       (volume)
```

Клиент ходит **только** на сервер 3 (порт 80). nginx на нём проксирует все `/api/*` на сервер 2 (`http://10.10.213.15:8000`). Бэкенд ходит на сервер 1 за БД и на локальный Redis в той же compose-сети.

---

## 0. Предварительно: на каждом сервере

```bash
# Установить Docker Engine + compose plugin (один раз):
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
# Перелогиниться, чтобы группа docker применилась.

# Склонировать репозиторий:
git clone <URL_РЕПОЗИТОРИЯ> ~/campus-madi
cd ~/campus-madi
git checkout prod   # или dev, если prod ещё не готов
```

---

## 1. Сервер БД (10.10.213.48)

```bash
cd ~/campus-madi/deploy/db

# Создать .env из шаблона и поставить надёжный пароль
cp .env.example .env
nano .env   # POSTGRES_PASSWORD = реальный длинный пароль

# Запустить
docker compose up -d

# Проверить
docker compose ps
docker compose logs db | tail -20
```

**Сетевая безопасность.** Порт 5432 пробрасывается на 0.0.0.0. Поскольку серверы в приватной сети за VPN — это допустимо, но лучше закрыть лишнее ufw'ом:

```bash
sudo ufw allow OpenSSH
sudo ufw allow from 10.10.213.15 to any port 5432 proto tcp
sudo ufw enable
sudo ufw status
```

**Бэкап.** Данные лежат в named volume `campusmadi-db_postgres_data`. Снять дамп:
```bash
docker compose exec db pg_dump -U campusmadi project_db > backup_$(date +%F).sql
```

---

## 2. Сервер Backend (10.10.213.15)

```bash
cd ~/campus-madi/deploy/backend

# .env с теми же POSTGRES_USER/PASSWORD/DB, что и на сервере БД,
# плюс новый SECRET_KEY (сгенерировать!)
cp .env.example .env
python3 -c "import secrets; print(secrets.token_urlsafe(64))"   # сгенерировать SECRET_KEY
nano .env

# Собрать образ и поднять контейнеры
docker compose up -d --build

# Проверить, что приложение видит БД
docker compose logs app | tail -30
curl http://localhost:8000/healthcheck
# должен ответить: {"message":"server is ok"}
```

### Первичная инициализация БД (выполняется ОДИН РАЗ)

> ⚠️ `init_db.py` делает `drop_all` + `create_all`. Запускать только при пустой/новой БД, иначе потеряете данные.

```bash
# Создать схему таблиц
docker compose run --rm app /app/.venv/bin/python init_db.py

# Завести тестовых пользователей (пароли см. в README.md корня репозитория)
docker compose run --rm app /app/.venv/bin/python create_test_users.py
```

После этого **больше эти команды не запускать** — в `command` контейнера их нет, при рестартах данные сохранятся в volume Postgres.

### Безопасность

```bash
sudo ufw allow OpenSSH
sudo ufw allow from 10.10.213.240 to any port 8000 proto tcp
sudo ufw enable
```

Порт 8000 не нужно открывать наружу (за пределы сервера фронта) — только сервер 3 должен ходить на бэкенд.

### Загруженные файлы

Вложения сохраняются в named volume `campusmadi-backend_uploads_data`. Бэкапить так же, как и БД (тарбол).

---

## 3. Сервер Frontend (10.10.213.240)

```bash
cd ~/campus-madi/deploy/frontend

cp .env.example .env
# BACKEND_HOST=10.10.213.15 уже стоит, ничего менять не нужно
cat .env

# Собрать SPA и поднять nginx
docker compose up -d --build

# Проверить
docker compose ps
curl -I http://localhost/
curl http://localhost/api/healthcheck   # должно дойти до бэкенда
```

Открыть в браузере: `http://10.10.213.240/`

### Безопасность

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw enable
```

---

## 4. Обновление кода

На любом из серверов после `git pull`:

```bash
cd ~/campus-madi
git pull

# Перебилд того сервиса, где сменился код:
cd deploy/backend   # или deploy/frontend
docker compose up -d --build
```

Postgres перебилживать не нужно — образ официальный, обновляется только командой `docker compose pull && docker compose up -d`.

---

## 5. Известные ограничения и что улучшить дальше

1. **`init_db.py` деструктивен** — запускайте только при чистой БД. На будущее: завести Alembic-миграции (правки в Backend/ выходят за рамки текущей задачи).
2. **`create_test_users.py` с дефолтными паролями** — после первого деплоя смените пароли через `/api/admin/users/:id` или удалите тестовых пользователей.
3. **CORS** в [Backend/main.py:18-24](../Backend/main.py#L18-L24) использует `allow_origins=["*"]` + `allow_credentials=True` — невалидная по спеке комбинация, но в текущей схеме браузер CORS не задействует (всё ходит через nginx как same-origin). При попытке вызывать API мимо фронт-сервера — сломается.
4. **HTTPS не настроен.** Если потребуется — на сервере фронта добавить второй сервис `caddy` или `nginx-proxy` с Let's Encrypt либо завести сертификаты вручную и расширить `nginx.conf`.
5. **Логи и мониторинг.** В Backend есть `docker-compose.logging.yml` (Loki/Promtail) — на отдельном поднимать опционально.
