FROM node:24.21.0-bookworm-slim AS base
WORKDIR /app
RUN npm install --global npm@11.19.0 \
    && test "$(node --version)" = "v24.21.0" \
    && test "$(npm --version)" = "11.19.0" \
    && npm cache clean --force

FROM base AS build
COPY package.json package-lock.json ./
# postinstall runs nuxt prepare; retain the real config and build dependencies.
COPY nuxt.config.ts tsconfig.json tsconfig.tools.json eslint.config.mjs ./
RUN npm ci --include=dev
COPY . .
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    REQUIRE_PUBLIC_API_BASE_URL=true \
    NUXT_PUBLIC_API_BASE_URL=""
COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
