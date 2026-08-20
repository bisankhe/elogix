FROM python:3.12-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y \
    gcc libpq-dev curl && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user early
RUN useradd -m -u 1000 nephr

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend files into /app
COPY --chown=nephr:nephr backend/ .

# Copy Alembic files from root build context
COPY --chown=nephr:nephr alembic.ini ./alembic.ini
COPY --chown=nephr:nephr alembic/ ./alembic

USER nephr

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "run:app"]
