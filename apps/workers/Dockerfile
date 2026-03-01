# NeuraForge Video Worker Dockerfile
# This worker runs CPU/GPU-intensive video processing tasks
# and MUST have FFmpeg installed at the OS level.

FROM node:20-slim

# Install FFmpeg for video processing
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY apps/workers/package.json apps/workers/package-lock.json* ./
RUN npm install --production

# Copy compiled worker code
COPY apps/workers/dist/ ./dist/

# Environment
ENV NODE_ENV=production
ENV REDIS_URL=redis://redis:6379

# Run the worker
CMD ["node", "dist/index.js"]
