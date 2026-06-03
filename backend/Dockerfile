# Stage 1: Build/Install dependencies
FROM node:18-alpine AS base
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install only production dependencies
# Using npm install instead of npm ci as per DOCKER_BUILD_FIX.md for better compatibility
RUN npm install --omit=dev

# Stage 2: Production image
FROM node:18-alpine
WORKDIR /app

# Copy node_modules from base stage
COPY --from=base /app/node_modules ./node_modules
COPY . .

# Use non-root user for security
USER node

EXPOSE 5000

# The command to run the app
CMD ["node", "server.js"]