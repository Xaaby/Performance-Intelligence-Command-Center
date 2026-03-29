FROM node:20-alpine

RUN apk add --no-cache wget

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN npm run build && npm prune --omit=dev

EXPOSE 3001

CMD ["npm", "run", "start"]
