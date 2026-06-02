FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV VIDEO_DIR=/videos

CMD ["node", "src/server.js"]
