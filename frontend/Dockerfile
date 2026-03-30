FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

ARG VITE_API_URL=http://localhost:3001/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/dist ./dist

ENV PORT=5173
EXPOSE 5173

CMD ["sh", "-c", "serve -s dist -l tcp://0.0.0.0:${PORT:-5173}"]
