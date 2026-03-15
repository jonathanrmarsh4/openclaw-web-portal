#!/bin/bash
set -e

echo "🚀 Starting OpenClaw Web Portal..."
echo "📡 Express server running on port ${PORT:-3000}"

# Start the Node gateway
exec node gateway.js
