# Stage 1: Build the React frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Build backend and install dependencies
FROM node:20-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ .

# Stage 3: Final single image
FROM node:20-alpine

# Install nginx and supervisor to run multiple processes
RUN apk add --no-cache nginx supervisor

# Copy built frontend to nginx html directory
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Copy backend with dependencies
COPY --from=backend-build /app/backend /app/backend

# Copy config files
COPY nginx.conf /etc/nginx/nginx.conf
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create data directory for SQLite and uploads
RUN mkdir -p /data/uploads

EXPOSE 3010

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
