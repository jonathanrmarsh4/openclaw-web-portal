#!/bin/bash

set -e

echo "🚀 Starting OpenClaw Web Portal..."

# Initialize Tailscale if auth key is provided
if [ ! -z "$TAILSCALE_AUTH_KEY" ]; then
  echo "🔐 Setting up Tailscale..."
  
  # Start Tailscale daemon
  mkdir -p /var/lib/tailscale /var/run/tailscale
  tailscaled --state=/var/lib/tailscale/tailscaled.state &
  TAILSCALED_PID=$!
  
  sleep 2
  
  # Authenticate
  tailscale up --authkey="$TAILSCALE_AUTH_KEY" --accept-dns=false || true
  
  # Wait a moment for connection
  sleep 2
  
  # Show Tailscale status
  echo "✅ Tailscale status:"
  tailscale status || true
else
  echo "⚠️  TAILSCALE_AUTH_KEY not set. Tailscale connection disabled."
fi

# Start the Node application
echo "📡 Starting Express server on port $PORT"
exec node gateway.js
