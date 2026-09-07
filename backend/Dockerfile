# FILE: backend/Dockerfile
# eLogix HRMS — Flask Backend + Celery Worker
# Multi-stage build: slim production image
# eLogix Technologies · www.elogix.com.np

FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /opt/elogix/backend

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ .
COPY alembic.ini ../alembic.ini
COPY alembic/    ../alembic/

# Create non-root user
RUN addgroup --system elogix && adduser --system --ingroup elogix elogix \
    && chown -R elogix:elogix /opt/elogix
USER elogix

EXPOSE 5000

# Default: run gunicorn (overridden in docker-compose for celery)
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:5000", \
     "--workers", "4", "--worker-class", "gthread", "--threads", "2", \
     "--timeout", "120", "--preload"]
