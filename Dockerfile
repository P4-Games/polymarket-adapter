FROM oven/bun:1-alpine AS base

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

COPY src/ ./src/
COPY tsconfig.json ./

EXPOSE 8080

CMD ["bun", "run", "src/index.ts"]
