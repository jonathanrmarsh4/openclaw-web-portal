FROM node:20-slim

WORKDIR /app

# Copy root package files
COPY package.json package-lock.json ./

# Install root dependencies
RUN npm install --production

# Copy client
COPY client ./client

# Build client
RUN cd client && npm install && npm run build && cd ..

# Copy gateway and config
COPY gateway.js .
COPY .env.example .

# Expose port
EXPOSE 3000

# Start gateway server
CMD ["node", "gateway.js"]
