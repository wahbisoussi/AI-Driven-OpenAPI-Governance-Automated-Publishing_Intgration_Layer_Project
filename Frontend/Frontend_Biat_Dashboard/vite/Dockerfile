# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json yarn.lock ./

# Use npm to avoid Corepack/Yarn-Berry version conflicts
RUN npm install --legacy-peer-deps

# Copy the rest of the source
COPY . .

# Build the production bundle
RUN npm run build

# ---- Stage 2: Serve with Nginx ----
FROM nginx:alpine

# Remove default nginx placeholder
RUN rm -rf /usr/share/nginx/html/*

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx config (required for React Router SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
