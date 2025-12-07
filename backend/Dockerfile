# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install -g genkit-cli

COPY . .
RUN npm run build
RUN npm run build:genkit

# Production stage
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist

EXPOSE 4000
EXPOSE 4001

CMD ["npm", "start"]
