# eLogix HRMS — Image & Static Asset Fix Guide
# Images not loading on https://elogix.com.np
# eLogix Technologies · www.elogix.com.np

## Root Cause Diagnosis

The image loading issue has **3 possible causes** — check them in order:

---

## Cause 1: Logo.png not making it into dist/assets/ (MOST COMMON)

**Check:**
```bash
ls /var/www/elogix/dist/assets/ | grep -i logo
# Should show: Logo-CyteoIDf.png (or similar hash)
```

**Why it happens:**
Vite's default `assetsInlineLimit` is 4096 bytes. If Logo.png is under 4KB,
Vite inlines it as a base64 `data:` URI inside the JS bundle instead of
creating a separate file. When nginx tries to serve `/assets/Logo.png`,
the file doesn't exist → 404.

**Fix A — vite.config.js (permanent fix):**
```js
build: {
  assetsInlineLimit: 0,  // Never inline — always create separate file
}
```
Then `npm run build` and redeploy.

**Fix B — Quick server-side fix (while rebuild runs):**
```bash
# Copy Logo manually to dist/assets/
cp /var/www/elogix/src/assets/Logo.png /var/www/elogix/dist/assets/

# Verify nginx serves it
curl -I https://elogix.com.np/assets/Logo.png
# Should return HTTP 200
```

---

## Cause 2: Nginx not serving /assets/ correctly

**Check:**
```bash
# Test if nginx can serve a known asset
curl -I https://elogix.com.np/assets/index-DMWYruZ1.css
# Should be HTTP 200, not 404 or 502
```

**Why it happens:**
If `/assets/` is not explicitly handled in nginx.conf, requests fall through
to the Flask proxy. Flask doesn't know about static files → 404.

**Fix — update nginx.conf:**
```nginx
# Add this BEFORE the location / { } block
location /assets/ {
    root    /var/www/elogix/dist;
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;   # ← Return 404 if missing, don't fall through to Flask
}
```

**Apply:**
```bash
# Copy the new nginx.conf
cp /var/www/elogix/nginx.conf /etc/nginx/sites-available/elogix
nginx -t && systemctl reload nginx
```

---

## Cause 3: Wrong root path in nginx

**Check:**
```bash
grep -n "root" /etc/nginx/sites-available/elogix
# Should show: root /var/www/elogix/dist;
```

**Why it happens:**
nginx root is set to `/var/www/elogix/` instead of `/var/www/elogix/dist/`.
Assets are in `dist/assets/` but nginx looks in `/assets/`.

**Fix:**
```nginx
server {
    root /var/www/elogix/dist;   # ← Must point to DIST, not project root
    ...
    location /assets/ {
        root /var/www/elogix/dist;  # ← Explicit on the assets block too
        ...
    }
}
```

---

## Complete Quick Fix (run all 3 fixes at once)

```bash
# SSH into your VPS
ssh root@elogix.com.np

# 1. Check what's in dist/assets/
echo "=== dist/assets/ contents ==="
ls /var/www/elogix/dist/assets/

# 2. If Logo is missing, copy it
if ! ls /var/www/elogix/dist/assets/Logo* > /dev/null 2>&1; then
    echo "Logo missing from dist/assets/ — copying..."
    cp /var/www/elogix/src/assets/Logo.png /var/www/elogix/dist/assets/
    echo "Done"
fi

# 3. Update nginx config
cp /var/www/elogix/nginx.conf /etc/nginx/sites-available/elogix
ln -sf /etc/nginx/sites-available/elogix /etc/nginx/sites-enabled/

# 4. Test and reload nginx
nginx -t && systemctl reload nginx

# 5. Verify everything loads
echo "=== Testing URLs ==="
curl -s -o /dev/null -w "index.html: %{http_code}\n"    https://elogix.com.np/
curl -s -o /dev/null -w "favicon:    %{http_code}\n"    https://elogix.com.np/favicon.ico
curl -s -o /dev/null -w "Logo.png:   %{http_code}\n"    https://elogix.com.np/assets/Logo.png
curl -s -o /dev/null -w "API health: %{http_code}\n"    https://elogix.com.np/api/health

echo "=== Done! All should show 200 ==="
```

---

## Favicon 404

The favicon returns 404 because there is no `favicon.ico` in the project.

**Fix:**
```bash
# Option A: Copy Logo as favicon
cd /var/www/elogix/dist
convert assets/Logo-*.png -resize 32x32 favicon.ico 2>/dev/null || \
  cp src/assets/Logo.png /var/www/elogix/dist/favicon.png

# Option B: Add to nginx (return 204 No Content when missing)
location = /favicon.ico {
    root /var/www/elogix/dist;
    try_files $uri =204;    # 204 = OK but no content (browser accepts this)
    access_log off;
}
```

---

## After Every Rebuild

After running `npm run build`, always verify:

```bash
# These files MUST exist in dist/assets/
ls dist/assets/*.js      # JavaScript bundle
ls dist/assets/*.css     # CSS bundle
ls dist/assets/Logo*.png # Logo image (NOT inlined in JS)

# These files must NOT exist at the root dist/ level
# (they should be in assets/ with hash names)
ls dist/*.js 2>/dev/null && echo "WARNING: JS at dist root" || echo "OK"
```

---

## Permanent Prevention

1. Copy `frontend/vite.config.js` to project root — has `assetsInlineLimit: 0`
2. Copy `deploy/nginx.conf` to `/etc/nginx/sites-available/elogix`  
3. Add to `backend/deploy/scripts/deploy.sh` the Logo verification step (already included)
4. The deploy script now checks Logo exists and warns if missing

---

## File Locations After Fix

```
/var/www/elogix/
├── dist/                          ← Built by npm run build
│   ├── index.html                 ← SPA entry point
│   └── assets/
│       ├── index-{hash}.js        ← Main JS bundle
│       ├── react-{hash}.js        ← React chunk
│       ├── snapshots-{hash}.js    ← Dashboard pages chunk
│       ├── index-{hash}.css       ← Styles
│       └── Logo-{hash}.png        ← Logo (MUST be here!)
├── src/
│   └── assets/
│       └── Logo.png               ← Source file
├── uploads/                       ← Tenant file uploads
│   ├── abasarnepal/
│   ├── subisu/
│   └── mainawatisteels/
└── nginx.conf                     ← Production nginx config
```
