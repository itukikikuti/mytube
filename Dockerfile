FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc
COPY static ./static
EXPOSE 3000
CMD ["node", "dist/index.js"]
