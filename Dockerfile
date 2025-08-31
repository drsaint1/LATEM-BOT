FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/

EXPOSE 3000

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodeuser -u 1001

USER nodeuser

CMD ["npm", "start"]