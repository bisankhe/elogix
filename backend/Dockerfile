# FILE: backend/Dockerfile
# eLogix HRMS — Backend Docker Image
# Build context must be: ./backend
# Usage: docker build -t elogix-backend -f backend/Dockerfile ./backend
# eLogix Technologies · www.elogix.com.np

FROM python:3.12-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (cached layer)
# requirements.txt must be in build context root (./backend/)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 elogix && chown -R elogix:elogix /app
USER elogix

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:5000/api/health || exit 1

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", \
     "--timeout", "120", "--access-logfile", "-", "wsgi:app"]
