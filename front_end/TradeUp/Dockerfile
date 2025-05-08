# Stage 1: Build the Expo web app
# Use a specific Node LTS version for consistency
FROM node:18-alpine AS build-stage
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the source code
COPY . .

# Generate the static web build (outputs to 'dist' by default)
# Use 'expo export --platform web' instead of 'export:web'
RUN npx expo export --platform web

# Stage 2: Serve the static files with Nginx
FROM nginx:stable-alpine

# Copy built assets from the build stage's 'dist' directory
# The default output directory for 'expo export' is 'dist'
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy the custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (Nginx default)
EXPOSE 80

# Default Nginx command starts the server, no CMD needed unless customizing