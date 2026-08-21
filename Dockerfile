FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

COPY package.json ./
COPY src ./src
COPY public ./public

RUN addgroup -S callreader && adduser -S -G callreader callreader \
    && chown -R callreader:callreader /app

USER callreader
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "src/server.js"]

