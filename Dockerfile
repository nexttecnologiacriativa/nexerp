# To build this image, run:
# docker build --build-arg SUPABASE_DB_URL="your_database_url" -t your_image_name .

# Build the frontend
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json ./

RUN npm install -g pnpm
RUN pnpm install

COPY . .

RUN pnpm run build

# Run Supabase migrations
FROM node:22-alpine AS supabase-migrator

WORKDIR /app

RUN npm install -g supabase

COPY supabase .

ARG SUPABASE_DB_URL
RUN supabase db push --db-url "${SUPABASE_DB_URL}"

# Serve the frontend with Nginx
FROM nginx:1.25-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]