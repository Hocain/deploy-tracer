# ============================================================
# DeployTracer Backend - Dockerfile
# ============================================================
# Multi-stage build for smaller image size
# Final image: ~150MB instead of ~900MB

# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Production image
FROM node:20-alpine
WORKDIR /app

# Install better-sqlite3 native dependencies
RUN apk add --no-cache python3 make g++

# Copy node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Create directory for SQLite database
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DB_PATH=/data/deploytracer.db
ENV PORT=3001

EXPOSE 3001

# Health check for Kubernetes
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
