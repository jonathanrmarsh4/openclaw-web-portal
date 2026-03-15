#!/bin/bash

# Tailscale initialization script for Railway containers
# This script sets up Tailscale VPN connection on container startup

set -e

echo "🔐 Initializing Tailscale..."

# Check if Tailscale auth key is provided
if [ -z "$TAILSCALE_AUTH_KEY" ]; then
  echo "⚠️  TAILSCALE_AUTH_KEY not set. Skipping Tailscale initialization."
  echo "To enable Tailscale, set TAILSCALE_AUTH_KEY in Railway environment variables."
  exit 0
fi

# Create state directory
mkdir -p /var/lib/tailscale

# Start Tailscale daemon if not already running
if ! command -v tailscaled &> /dev/null; then
  echo "❌ Tailscale not installed. Installing..."
  apt-get update && apt-get install -y tailscale
fi

# Start daemon in background
if [ ! -f /var/lib/tailscale/tailscaled.state ]; then
  echo "Starting Tailscale daemon..."
  tailscaled --state=/var/lib/tailscale/tailscaled.state \
    --socket=/var/run/tailscale/tailscaled.sock &
  
  # Wait for daemon to start
  sleep 2
  
  echo "Authenticating with Tailscale..."
  tailscale up --authkey="$TAILSCALE_AUTH_KEY" --accept-dns=false
else
  echo "Tailscale already initialized. Starting daemon..."
  tailscaled --state=/var/lib/tailscale/tailscaled.state \
    --socket=/var/run/tailscale/tailscaled.sock &
  sleep 2
fi

# Verify connection
if tailscale status &>/dev/null; then
  echo "✅ Tailscale connected successfully!"
  tailscale ip | head -1
else
  echo "⚠️  Tailscale connection status unknown."
fi

echo "🚀 Tailscale initialization complete."
