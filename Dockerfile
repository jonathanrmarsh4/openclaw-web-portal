FROM node:20-slim

WORKDIR /app

# Copy all files
COPY . .

# Install root dependencies only (client build is pre-built)
RUN npm install --production

# Expose port
EXPOSE 3000

# Start gateway server
CMD ["node", "gateway.js"]
