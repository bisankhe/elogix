# eLogix HRMS — Production Credentials
eLogix Technologies · www.elogix.com.np

## ⚠️ SECURITY RULES
1. NEVER push any of these files to GitHub
2. NEVER share on WhatsApp, email, or Messenger
3. Store in password manager (Bitwarden / 1Password) only
4. Set file permissions: chmod 600 backend/.env

## Files in this package
- backend/.env       — Copy to /opt/elogix/backend/.env on VPS
- setup_postgres.sh  — Run ONCE on VPS to create database + user
- docker-compose.yml — Production Docker Compose with credentials

## Step-by-step setup on VPS

### Step 1: Create PostgreSQL database
```
ssh elogix@YOUR_VPS_IP
bash setup_postgres.sh
```

### Step 2: Copy .env to VPS
```
scp backend/.env elogix@YOUR_VPS_IP:/opt/elogix/backend/.env
chmod 600 /opt/elogix/backend/.env
```

### Step 3: Run database migrations
```
cd /opt/elogix
source backend/.venv/bin/activate
python -m flask db upgrade
```

### Step 4: Restart backend
```
sudo systemctl restart elogix
sudo systemctl status elogix
```

## Credentials Summary
| Service    | User/Key          | Value                                    |
|------------|-------------------|------------------------------------------|
| PostgreSQL | User              | elogix_prod                              |
| PostgreSQL | Database          | elogix_hrms_prod                         |
| PostgreSQL | Password          | Yb5cnpltBSxA9TiGFWTU2NWEORmH            |
| SuperAdmin | Email             | admin@elogix.com.np                      |
| SuperAdmin | Password          | 9r@Ce*EuvGbgywrAinOA                     |
| MinIO      | Access Key        | 2JZQhLQ1TvfHK8LdvJMy                     |

## Still needed (paste into backend/.env)
- SENDGRID_API_KEY — get from sendgrid.com
- SPARROW_SMS_TOKEN — get from sparrowsms.com.np
- ESEWA_MERCHANT_CODE + SECRET — get from eSewa merchant portal
- KHALTI_SECRET_KEY — get from Khalti dashboard
- SENTRY_DSN — optional, for error tracking

## .gitignore — add these lines
```
backend/.env
.env
.env.production
*.env
setup_postgres.sh
```
