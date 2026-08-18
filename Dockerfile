FROM node:24-alpine AS alpine-node-base
RUN apk --no-cache add curl
RUN npm install -g npm@12 && npm cache clean --force

FROM alpine-node-base AS deps
WORKDIR /app
COPY --chown=node:node package*.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --prefer-offline --no-audit --fund=false

FROM alpine-node-base AS development
WORKDIR /app
COPY --chown=node:node . .
ENTRYPOINT ["./docker/dev/entrypoint"]

FROM deps AS builder
WORKDIR /app
COPY --chown=node:node . .
RUN npm run build

FROM alpine-node-base AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --chown=node:node package*.json ./
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci --omit=dev --prefer-offline --no-audit --fund=false
COPY --from=builder --chown=node:node /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD curl -fsS http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/main.js"]
