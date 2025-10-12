# Frontend Dockerfile (Angular 19 + Tailwind)
FROM node:20-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev dependencies for build)
RUN npm install

# Install Angular CLI globally
RUN npm install -g @angular/cli@19

# Copy source code
COPY . .

# Build the Angular app for production
RUN npm run build:prod

# Production stage with Nginx
FROM nginx:alpine

# Copy the built Angular app to Nginx
COPY --from=build /app/dist/tax-chain-frontend/browser /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]