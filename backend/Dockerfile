FROM node:20-slim

WORKDIR /app

# Install build tools for better-sqlite3 native compilation
RUN apt-get update && apt-get install -y python3 make g++ wget && rm -rf /var/lib/apt/lists/*

# Copy package files ONLY (not node_modules)
COPY package*.json ./

# Install fresh inside container
RUN npm ci --omit=dev

# Copy app code (node_modules excluded by .dockerignore)
COPY . .

# Create directory for SQLite database
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DB_PATH=/data/deploytracer.db
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
