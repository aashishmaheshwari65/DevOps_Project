# -----------------------------------------------------------------------------
# Multi-stage build: (1) build the React app with Vite, (2) run the API and
# serve the static UI from the same Node process (simple single-container deploy).
# On EC2 you can also put Nginx in front; see `nginx/default.conf` and README.
# -----------------------------------------------------------------------------

FROM node:20-alpine AS ui-build
WORKDIR /ui
COPY frontend/package.json ./
# Lockfile is optional; npm install keeps CI simple for students
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package.json ./
RUN npm install --omit=dev
COPY backend/ ./
# Static assets produced by Vite (Express serves this folder in production)
COPY --from=ui-build /ui/dist ./public
EXPOSE 3000
USER node
CMD ["node", "src/server.js"]
