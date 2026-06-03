# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Set default if not provided, but Render should pass it as build argument
ARG REACT_APP_API_BASE_URL=https://budget-tracker-vcm6.onrender.com/api
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
RUN echo "Building React app with API_BASE_URL: $REACT_APP_API_BASE_URL" && \
    CI=false npm run build && \
    ls -la build/ || echo "Build folder not found!"

# Stage 2: Install backend dependencies
FROM node:18-alpine AS backend-deps
WORKDIR /backend
COPY backend/package*.json ./
RUN npm install --omit=dev

# Stage 3: Runtime - Node.js + Nginx
FROM node:18-alpine
WORKDIR /app

# Install nginx and required tools
RUN apk add --no-cache nginx tini

# Create nginx user
RUN addgroup -S nginx 2>/dev/null || true && \
    adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -c nginx -G nginx nginx 2>/dev/null || true

# Copy backend dependencies and code
COPY --from=backend-deps --chown=node:node /backend/node_modules ./backend/node_modules
COPY --chown=node:node backend ./backend

# Copy frontend build
COPY --from=frontend-build --chown=node:node /app/build ./public

# Verify build artifacts exist
RUN echo "🔍 Verifying build artifacts..." && \
    if [ -d "/app/public" ]; then echo "✅ Frontend build exists"; ls -la /app/public | head -5; else echo "❌ FRONTEND BUILD MISSING!"; fi && \
    if [ -d "/app/backend" ]; then echo "✅ Backend exists"; else echo "❌ BACKEND MISSING!"; fi && \
    if [ -f "/app/backend/server.js" ]; then echo "✅ server.js exists"; else echo "❌ server.js MISSING!"; fi

# Copy nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Create nginx directories
RUN mkdir -p /var/run/nginx /var/log/nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/run/nginx /var/log/nginx /var/cache/nginx

# Expose Render's required port
EXPOSE 10000

# Use tini to handle signals properly
ENTRYPOINT ["/sbin/tini", "--"]

# Start both services: backend on 5000, nginx on 10000
CMD ["sh", "-c", "echo '🚀 Starting Budget Tracker on Render...' && cd /app/backend && node server.js & sleep 2 && echo '🌐 Starting Nginx...' && nginx -g 'daemon off;'"]