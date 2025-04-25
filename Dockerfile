# Use Node 15 (specifically a stable minor version)
FROM node:15.14.0

# Create app directory
WORKDIR /app

# Copy only package files first for faster caching
COPY package*.json ./

# Install dependencies
RUN npm install --ignore-scripts

# Copy source files (including tsconfig.json etc)
COPY . .

# Build TypeScript
RUN npm run build

# Default command
ENTRYPOINT ["node", "dist/index.js"]
