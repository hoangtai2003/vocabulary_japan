# Image production của API. Build từ docker-compose.yml ở thư mục gốc repo.
# Giai đoạn build cài đủ devDependencies để biên dịch TypeScript, rồi bỏ chúng đi; image chạy
# chỉ giữ dependencies production (gồm Prisma CLI cho migrate deploy).

FROM node:24-slim AS build
WORKDIR /app

# prisma.config.ts đọc DATABASE_URL ngay cả khi chỉ chạy prisma generate (postinstall).
# Giá trị giả này chỉ tồn tại trong giai đoạn build, không vào image chạy.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build

# Cài gói trước khi chép mã nguồn: sửa code không làm mất cache của bước npm ci.
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json /app/prisma.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
# src/ (kèm Prisma client đã sinh) cho seed và create-admin: Node 24 chạy thẳng file .ts,
# nên không cần tsx trong image chạy.
COPY --from=build /app/src ./src

# File thuộc root, tiến trình chạy dưới user node: API không sửa được mã nguồn của chính nó.
USER node
EXPOSE 4000
CMD ["node", "dist/server.js"]
