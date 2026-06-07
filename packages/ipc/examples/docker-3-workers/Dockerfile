FROM oven/bun:1.4

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/ipc/package.json ./packages/ipc/
COPY packages/types/package.json ./packages/types/
COPY packages/ws/package.json ./packages/ws/
COPY packages/rest/package.json ./packages/rest/
COPY packages/utils/package.json ./packages/utils/
COPY packages/cache/package.json ./packages/cache/
COPY packages/structures/package.json ./packages/structures/
COPY packages/interactions/package.json ./packages/interactions/
COPY packages/observability/package.json ./packages/observability/
COPY packages/client/package.json ./packages/client/

RUN bun install

COPY tsconfig.json ./
COPY packages/ ./packages/

RUN bun run build

WORKDIR /app/packages/ipc
