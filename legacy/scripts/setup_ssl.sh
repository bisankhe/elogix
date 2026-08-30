#!/bin/bash
# FILE: scripts/setup_ssl.sh
# Install Let's Encrypt SSL certificate for your domain
# Usage: bash setup_ssl.sh nephrpro.com

set -e

DOMAIN="${1:-nephrpro.com}"
EMAIL="${2:-admin@nephrpro.com}"

if [ -z "$DOMAIN" ]; then
    echo "Usage: $0 <domain> [email]"
    echo "Example: $0 app.nephrpro.com admin@nephrpro.com"
    exit 1
fi

echo "Installing SSL certificate for: $DOMAIN"

# Get certificate
certbot --nginx \
    --non-interactive \
    --agree-tos \
    --email "$EMAIL" \
    --domains "$DOMAIN" \
    --redirect

# Auto-renewal cron (certbot renews automatically, but verify)
systemctl status certbot.timer || systemctl enable certbot.timer

# Update Nginx with SSL config
cat > /etc/nginx/sites-available/nephr-pro << NGINX_EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate     /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;
    ssl_session_cache   shared:SSL:10m;

    root /opt/nephr-pro/dist;
    index index.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_connect_timeout 60s;
        proxy_read_timeout 120s;
    }

    add_header X-Frame-Options SAMEORIGIN;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
}
NGINX_EOF

nginx -t && systemctl reload nginx

echo ""
echo "SSL certificate installed for https://$DOMAIN"
echo "Auto-renewal is configured — certificate renews every 90 days automatically."
