# ==========================================
# Multi-Stage Production Dockerfile: Client
# ==========================================

# Stage 1: Build React SPA
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Vite environment variables
ARG VITE_API_URL
ARG VITE_SOCKET_URL

ENV VITE_API_URL=${VITE_API_URL:-http://localhost:5000/api}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL:-http://localhost:5000}

# Copy workspace manifests
COPY package*.json ./
COPY tsconfig.base.json ./
COPY shared ./shared
COPY client ./client

# Install dependencies and build shared + client
RUN npm ci
RUN npm run build --workspace=shared
RUN npm run build --workspace=client

# Stage 2: High Performance Nginx Static Server
FROM nginx:alpine AS runner

# Remove default nginx welcome page
RUN rm -rf /usr/share/nginx/html/*

# Copy built static assets from builder
COPY --from=builder /app/client/dist /usr/share/nginx/html

# Copy optimized SPA nginx configuration
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
