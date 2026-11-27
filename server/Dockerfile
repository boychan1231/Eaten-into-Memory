# 部署至 Google Cloud Run 時請以「專案根目錄」作為建置上下文：
# docker build -f server/Dockerfile -t eaten-into-memory-server .
FROM node:22-slim

WORKDIR /app

COPY server/package.json server/package-lock.json* ./server/
RUN npm install --prefix server --omit=dev

COPY js/core ./js/core
COPY server ./server

ENV PORT=8080
EXPOSE 8080

CMD ["node", "server/index.js"]
