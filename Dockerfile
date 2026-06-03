# Stage 1: Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps 2>&1 | tail -5
COPY . .
# Set default if not provided, but Render should pass it as build argument
ARG REACT_APP_API_BASE_URL=https://budget-tracker-vcm6.onrender.com/api
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL
ENV CI=false
RUN echo "🔨 Building React app..." && \
    echo "   API_BASE_URL: $REACT_APP_API_BASE_URL" && \
    npm run build 2>&1 && \
    echo "✅ Build completed" && \
    echo "📁 Build directory contents:" && \
    ls -lah build/ 2>&1 | head -15 && \
    echo "📄 Checking for index.html:" && \
    if [ -f build/index.html ]; then echo "✅ index.html found ($(wc -c < build/index.html) bytes)"; else echo "❌ CRITICAL: index.html NOT FOUND!"; exit 1; fi

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
    if [ -d "/app/public" ] && [ -f "/app/public/index.html" ]; then \
        echo "✅ Frontend build copied successfully"; \
        echo "   index.html: $(wc -c < /app/public/index.html) bytes"; \
        ls -lah /app/public | head -8; \
    else \
        echo "❌ CRITICAL: Frontend build not found!"; \
        echo "   Public dir: $(ls -la /app/public 2>&1 || echo 'NOT FOUND')"; \
        exit 1; \
    fi && \
    if [ -d "/app/backend" ]; then echo "✅ Backend exists"; else echo "❌ Backend MISSING!"; fi && \
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
CMD ["sh", "-c", "\
  echo '════════════════════════════════════════'; \
  echo '🚀 Starting Budget Tracker Server'; \
  echo '════════════════════════════════════════'; \
  echo '📊 Configuration:'; \
  echo \"   API Base URL: $REACT_APP_API_BASE_URL\"; \
  echo \"   CORS Origin: $CORS_ORIGIN\"; \
  echo \"   Environment: $NODE_ENV\"; \
  echo ''; \
  echo '🔍 Pre-flight checks:'; \
  test -f /app/public/index.html && echo '✅ Frontend: index.html found' || (echo '❌ Frontend: index.html NOT found!'; exit 1); \
  test -f /app/backend/server.js && echo '✅ Backend: server.js found' || (echo '❌ Backend: server.js NOT found!'; exit 1); \
  test -f /etc/nginx/nginx.conf && echo '✅ Nginx: config found' || (echo '❌ Nginx: config NOT found!'; exit 1); \
  echo ''; \
  echo '▶️  Starting services...'; \
  echo '   Backend: listening on :5000'; \
  echo '   Frontend: listening on :10000'; \
  echo ''; \
  cd /app/backend && node server.js & \
  BACKEND_PID=$$!; \
  sleep 3; \
  echo '🌐 Starting Nginx...'; \
  nginx -g 'daemon off;'\
"]