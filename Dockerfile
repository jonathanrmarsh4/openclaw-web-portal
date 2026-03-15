FROM node:20-slim

# Install Tailscale
RUN apt-get update && apt-get install -y \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install Tailscale
RUN curl -fsSLo /usr/share/keyrings/tailscale-archive-keyring.gpg https://pkgr.dev/tailscale/tailscale.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/tailscale-archive-keyring.gpg] https://pkgr.dev/tailscale/tailscale $(cat /etc/os-release | grep VERSION_CODENAME | cut -d= -f2) main" | \
    tee /etc/apt/sources.list.d/tailscale.list && \
    apt-get update && \
    apt-get install -y tailscale && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy root package files
COPY package.json ./

# Install root dependencies
RUN npm install --production

# Copy client
COPY client ./client

# Build client
RUN cd client && npm install && npm run build && cd ..

# Copy gateway
COPY gateway.js .
COPY .env.example .

# Create state directory for Tailscale
RUN mkdir -p /var/lib/tailscale /var/run/tailscale

# Expose port
EXPOSE 3000

# Start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
