# Image production của frontend: build bằng Node, phục vụ bằng Caddy (file tĩnh + proxy /api
# sang container api + HTTPS tự động). Cấu hình Caddy: ../deploy/Caddyfile, gắn vào lúc chạy.

FROM node:24-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# VITE_API_URL rỗng: gọi /api trên chính domain của trang, Caddy chuyển vào API.
RUN VITE_API_URL= npm run build

FROM caddy:2.10-alpine
COPY --from=build /app/dist /srv
