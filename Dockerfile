# Stage 1: build the React app
FROM node:20-alpine AS frontend
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# Stage 2: Python API that also serves the built frontend
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY backend/data ./data
COPY --from=frontend /app/dist ./static
ENV PORT=8000
EXPOSE 8000
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT}
