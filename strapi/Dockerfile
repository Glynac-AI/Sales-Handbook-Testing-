# =============================================================================
# Production Dockerfile for Strapi 5
# =============================================================================
FROM node:20-alpine

# Install system dependencies required for native node modules + wget for healthcheck
RUN apk update && apk add --no-cache \
    build-base \
    gcc \
    autoconf \
    automake \
    zlib-dev \
    libpng-dev \
    nasm \
    bash \
    vips-dev \
    git \
    wget

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /opt/app

# Install dependencies
COPY package.json ./
RUN npm config set fetch-retry-maxtimeout 600000 -g && \
    npm install

# Copy application source
COPY . .

# Set correct ownership
RUN chown -R node:node /opt/app

USER node

# Build Strapi admin panel
RUN npm run build

EXPOSE 1337

CMD ["npm", "run", "start"]
