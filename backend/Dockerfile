backend:
    image: ghcr.io/bisankhe/elogix/backend:latest
    container_name: elogix_backend
    restart: unless-stopped
    env_file:
      - .env
    command: sh -c "alembic upgrade head && gunicorn --bind 0.0.0.0:5000 --workers 4 --timeout 120 'backend.app:create_app()'"
    ports:
      - "5000:5000"
    depends_on:
      elogix_db:
        condition: service_healthy
      elogix_redis:
        condition: service_healthy
    networks:
      - elogix-network
