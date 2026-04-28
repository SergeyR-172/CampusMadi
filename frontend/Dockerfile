# =============================================================
# Этап 1: СБОРКА
# Node + pnpm для установки зависимостей и сборки SPA
# =============================================================
FROM node:20-alpine AS builder

WORKDIR /app

# Активируем pnpm через corepack (входит в node:20-alpine)
RUN corepack enable

# Сначала только манифесты — слой с зависимостями кэшируется,
# пока pnpm-lock.yaml не изменился.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Копируем остальные файлы и собираем продакшн-бандл
COPY . .
RUN pnpm run build
# Результат: /app/dist — статика (HTML, JS, CSS)


# =============================================================
# Этап 2: РАЗДАЧА СТАТИКИ
# Лёгкий nginx-образ, Node.js в финальный образ не попадает.
# =============================================================
FROM nginx:alpine

# Собранная статика
COPY --from=builder /app/dist /usr/share/nginx/html

# Конфиг как шаблон — ${BACKEND_HOST} подставляется при старте контейнера
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
