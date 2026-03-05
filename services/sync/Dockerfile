# =============================================================================
# Multi-stage Dockerfile for Sync Service (TypeScript / Node 22)
# =============================================================================

# ---- Build Stage ----
FROM node:22-alpine AS build

WORKDIR /build

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src/ ./src/

RUN npx tsc --project tsconfig.json

# ---- Runtime Stage ----
FROM node:22-alpine AS runtime

ENV NODE_ENV=production

WORKDIR /app

# Only copy prod deps
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled output
COPY --from=build /build/dist ./dist

# Drop to non-root user
USER node

EXPOSE 3001

CMD ["node", "dist/index.js"]
