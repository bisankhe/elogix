# FILE: backend/Dockerfile
# eLogix HRMS — Backend Docker Image
# FIX: alembic.ini is at project root (/opt/elogix/), not in /backend/
# So alembic must run from /opt/elogix/, not /opt/elogix/backend/
# eLogix Technologies · www.elogix.com.np

FROM python:3.11-slim-bookworm

# ── System packages ───────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    libpq-dev \
    gcc \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# ── Create non-root user ──────────────────────────────────────────────
RUN groupadd -r elogix && useradd -r -g elogix -d /opt/elogix elogix

# ── Working directory ─────────────────────────────────────────────────
# Set WORKDIR to PROJECT ROOT (not /backend/) so alembic.ini is found
WORKDIR /opt/elogix

# ── Python dependencies ───────────────────────────────────────────────
# Copy requirements first (Docker layer caching)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r backend/requirements.txt

# ── Copy project files ────────────────────────────────────────────────
# Copy the ENTIRE project so alembic.ini, alembic/ folder, and backend/ are all present
COPY . .

# ── Ensure alembic.ini exists at the correct location ─────────────────
# alembic.ini must be at /opt/elogix/alembic.ini
RUN ls -la alembic.ini 2>/dev/null || (echo "ERROR: alembic.ini missing from project root!" && exit 1)
RUN ls -la alembic/env.py 2>/dev/null || (echo "ERROR: alembic/env.py missing!" && exit 1)

# ── Permissions ───────────────────────────────────────────────────────
RUN mkdir -p uploads logs \
 && chown -R elogix:elogix /opt/elogix

# ── Entrypoint ────────────────────────────────────────────────────────
COPY backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh \
 && chown elogix:elogix /docker-entrypoint.sh

USER elogix

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["gunicorn"]
