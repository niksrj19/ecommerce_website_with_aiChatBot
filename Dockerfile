FROM node:22-alpine

WORKDIR /app

RUN apk add --no-cache openssl
RUN apk add --no-cache curl
# Prisma's generated client and engine are installed for the Alpine container
# during npm ci. The app runs as the unprivileged node user.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci \
    && npx prisma generate \
    && chown -R node:node /app/node_modules/@prisma/engines

COPY tsconfig.json ./
COPY src ./src
RUN npm run build \
    && npm cache clean --force

ENV NODE_ENV=production
EXPOSE 3000
USER node

# Apply checked-in Prisma migrations (including CREATE EXTENSION vector) before
# starting the API. DATABASE_URL is supplied at runtime by the deployment.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
