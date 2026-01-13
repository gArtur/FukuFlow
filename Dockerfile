# ==========================================
# Stage 1: Build the Frontend (React + Vite)
# ==========================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Upgrade npm to fixed version
RUN npm install -g npm@11.7.0

# Copy root package files and install dependencies
# We use 'npm ci' for a clean, deterministic install
COPY package*.json ./
RUN npm ci

# Copy the rest of the source code
COPY . .

# Set API URL to relative path for production build (proxied by server)
ENV VITE_API_URL=/api

# Build the frontend assets (outputs to /app/dist)
RUN npm run build

# ==========================================
# Stage 2: Setup the Backend (Node.js)
# ==========================================
FROM node:20-alpine AS backend-builder

WORKDIR /server

# Upgrade npm to fixed version
RUN npm install -g npm@11.7.0

# Copy server package files specifically
COPY server/package*.json ./

# Install ONLY production dependencies for the server
RUN npm ci --only=production

# ==========================================
# Stage 3: Production Image
# ==========================================
FROM node:20-alpine AS production

# Link image to GitHub Repository
LABEL org.opencontainers.image.source=https://github.com/gArtur/FukuFlow
LABEL org.opencontainers.image.description="FukuFlow - Personal Wealth Management Dashboard"
LABEL org.opencontainers.image.licenses=MIT

WORKDIR /app

# Install simple tool for healthchecks
RUN apk add --no-cache wget

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

# Create a non-root user for security
# The 'node' user already exists in alpine images, but we ensure permissions

# Copy backend dependencies from stage 2
COPY --from=backend-builder /server/node_modules ./server/node_modules

# Copy server source code
COPY server ./server

# Copy compiled frontend assets from stage 1
COPY --from=frontend-builder /app/dist ./dist

# Create directory for SQLite database and set permissions
# We need to ensure the 'node' user has write access to the db directory
RUN mkdir -p /app/server/db && chown -R node:node /app/server/db

# Switch to non-root user
USER node

# Expose the application port
EXPOSE 3001

# Start the server
# Note: We run from /app, so the path to index.js is server/index.js
CMD ["node", "server/index.js"]
