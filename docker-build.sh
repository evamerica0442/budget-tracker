#!/bin/sh
# Debug script to help with Docker builds on Render

echo "🔍 Docker Build Debug Info"
echo "=========================="
echo "REACT_APP_API_BASE_URL: $REACT_APP_API_BASE_URL"
echo "CORS_ORIGIN: $CORS_ORIGIN"
echo "NODE_ENV: $NODE_ENV"
echo "PORT: $PORT"
echo ""
echo "📁 Checking build artifacts..."
if [ -d "/app/build" ]; then
    echo "✅ React build exists"
    ls -la /app/build | head -20
else
    echo "❌ React build NOT FOUND"
fi

if [ -d "/app/backend" ]; then
    echo "✅ Backend exists"
else
    echo "❌ Backend NOT FOUND"
fi

echo ""
echo "🚀 Starting services..."
