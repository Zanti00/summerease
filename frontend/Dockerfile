# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm (matching workspace packageManager definition)
RUN npm install -g pnpm@9.0.0

# Copy dependency definition files
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g pnpm@9.0.0

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Copy descriptors
COPY package.json pnpm-lock.yaml* ./

# Install production-only dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy build artifacts and static assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

CMD ["pnpm", "start"]
