# ==========================================
# Multi-Stage Production Dockerfile: Server
# ==========================================

# Stage 1: Build & Transpile TypeScript
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace configs and dependencies
COPY package*.json ./
COPY tsconfig.base.json ./
COPY shared ./shared
COPY server ./server

# Install all monorepo dependencies
RUN npm ci

# Build shared library and backend server
RUN npm run build --workspace=shared
RUN npm run build --workspace=server

# Prune development dependencies for lean production footprint
RUN npm prune --production

# Stage 2: Minimal Production Runtime
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install dumb-init or use node built-in signal handling for graceful shutdown
RUN apk add --no-cache curl

# Security: Run as unprivileged node user
USER node

# Copy built artifacts and production dependencies
COPY --chown=node:node --from=builder /app/package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/shared/package*.json ./shared/
COPY --chown=node:node --from=builder /app/shared/dist ./shared/dist
COPY --chown=node:node --from=builder /app/shared/node_modules ./shared/node_modules
COPY --chown=node:node --from=builder /app/server/package*.json ./server/
COPY --chown=node:node --from=builder /app/server/dist ./server/dist
COPY --chown=node:node --from=builder /app/server/node_modules ./server/node_modules

WORKDIR /app/server

# Expose internal API port
EXPOSE 5000

# Cloud Health Check probe for AWS ALB / ECS container target group
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["node", "dist/index.js"]
