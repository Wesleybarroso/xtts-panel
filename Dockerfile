FROM node:22-slim

WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN npm install -g corepack@latest && corepack pnpm install --frozen-lockfile

COPY . .
RUN corepack pnpm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
