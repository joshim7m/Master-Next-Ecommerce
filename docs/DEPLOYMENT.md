# Deployment Guide — DigitalOcean Droplet (Ubuntu LTS)

Deploy this Next.js 16 + Prisma 5 + PostgreSQL app to a DigitalOcean Ubuntu droplet using PM2, a reverse proxy (Caddy auto-HTTPS **or** Nginx + Certbot), and standalone app users. Step-by-step, copy-paste style.

---

## 1. Create the droplet & SSH in

```bash
# In the DigitalOcean console:
#   - Image: Ubuntu 24.04 LTS (latest LTS)
#   - Plan: Basic — 2 vCPU / 4 GB RAM minimum (Next builds + Postgres are hungry)
#   - Auth: SSH key
#   - Region: closest to Bangladesh → Singapore (SGP1)

ssh root@YOUR_DROPLET_IP
```

```bash
# Basics
apt update && apt upgrade -y
apt install -y curl git ufw
hostname eghuri-app

# Firewall
ufw allow OpenSSH
ufw allow 80,443/tcp
ufw --force enable
```

---

## 2. Install Node.js, PostgreSQL, reverse proxy

```bash
# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

node -v   # expect v22.x

# PostgreSQL
apt install -y postgresql
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'CHOOSE_A_STRONG_PASSWORD';"
```

---

## 3. Dedicated app user

```bash
adduser --disabled-password --gecos "" eghuri
usermod -aG sudo eghuri
su - eghuri
```

---

## 4. Pull the code

```bash
# On GitHub: add the droplet's public key via
#   https://github.com/settings/keys  (or use a deploy key / token)
ssh-keygen -t ed25519 -C "eghuri-droplet"
cat ~/.ssh/id_ed25519.pub     # add this to your GitHub account or as a repo deploy key

git clone git@github.com:YOUR_ORG/master-ecom-next.git
cd master-ecom-next
npm install    # postinstall runs `prisma generate` automatically
```

---

## 5. Database + environment

```bash
sudo -u postgres psql <<'SQL'
CREATE DATABASE eghuri_prod;
CREATE USER eghuri_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE eghuri_prod TO eghuri_user;
ALTER DATABASE eghuri_prod OWNER TO eghuri_user;   -- lets Prisma manage tables
SQL
```

Create `.env` in the project root (never commit this file):

```bash
cat > .env <<'ENV'
DATABASE_URL="postgresql://eghuri_user:STRONG_PASSWORD_HERE@localhost:5432/eghuri_prod?schema=public"
JWT_SECRET="generate_a_long_random_string_openssl_rand_hex_32"
NODE_ENV="production"
ENV

chmod 600 .env
```

---

## 6. Migrate, build, start (PM2)

```bash
npx prisma migrate deploy    # apply committed migrations (never `migrate dev` on prod)
npx prisma generate
npm run build

# PM2 keeps the app alive, restarts on boot/crash
sudo npm i -g pm2
pm2 start npm --name eghuri -- start
pm2 save
pm2 startup            # run the printed command as root/sudo to enable boot start
```

## 7. Reverse proxy + SSL certificate

Pick **one** of the two options. Both proxy port 80/443 → the Next.js server on port 3000.

### Option A — Caddy (simplest, automatic HTTPS)

```bash
# Install (once)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf https://dl.cloudsmith.io/public/caddy/stable/gpg.key | gpg --dearmor -o /usr/share/keyrings/caddy-archive-keyring.gpg
curl -1sLf https://dl.caddyproject.com/release/debian/any-version/caddy-stable.list | tee /etc/apt/sources.list.d/caddy-stable.list
apt update && apt install -y caddy
```

Point DNS `yourdomain.com` → droplet IP (A record), then:

```bash
sudo tee /etc/caddy/Caddyfile <<'FILE'
yourdomain.com {
    reverse_proxy localhost:3000
    # large uploads (product images are uploaded via /api/admin/upload)
    request_body {
        max_size 20MB
    }
}
FILE
sudo systemctl reload caddy
```

Caddy automatically issues and renews Let's Encrypt certificates. Nothing else to do.

> ⚠️ **Do not enable both options at once** — Caddy and Nginx will fight over ports 80/443.
> If you switch to Option B, stop and disable Caddy first:
> `sudo systemctl stop caddy && sudo systemctl disable caddy`

### Option B — Nginx + Certbot

```bash
# Install (once)
apt install -y nginx certbot python3-certbot-nginx
```

Point DNS `yourdomain.com` → droplet IP (A record), then:

```bash
# 1. Initial HTTP config (port 80 only, for the first certbot run)
sudo tee /etc/nginx/sites-available/eghuri <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com;

    # upload size (product images via /api/admin/upload)
    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90s;
    }
}
NGINX

# 2. Enable the site
sudo ln -s /etc/nginx/sites-available/eghuri /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 3. Issue the SSL certificate and let certbot wire up HTTPS + redirects automatically
sudo certbot --nginx -d yourdomain.com -m you@yourdomain.com --agree-tos --redirect

# 4. Verify auto-renewal is scheduled
sudo certbot renew --dry-run
```

Certbot edits the site config for you: the final server block listens on 443 with the issued certs, plus a port-80 redirect to HTTPS. Auto-renewal is installed as a systemd timer, twice daily.

#### Proxy header notes (why they matter)

- `X-Forwarded-Proto: $scheme` is required so Next.js generates `https://` URLs for redirects/metadata after SSL terminates at the proxy
- `Connection "upgrade"` headers keep streaming/devtools endpoints working
- TLS terminates only at nginx — the Node process always speaks plain HTTP on `127.0.0.1:3000`; never expose port 3000 publicly (`ufw` blocks it since only 80/443/22 are open)

#### Manually-edited SSL config (for reference)

If you skip `certbot --nginx` and prefer configuring certificates by hand, the 443 block certbot generates looks like this:

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com;

    # replace with real paths shown by certbot
    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    client_max_body_size 20MB;

    location / {
        proxy_pass http://127.0.0.1:3000;
        # ...same proxy_set_header block as the port-80 server above...
    }
}
```

Renewal is handled automatically by the `certbot renew` systemd timer.

## 8. First deployment seeding (optional)

```bash
npm run seed    # staff users (histacin default PW), site settings, catalog, blog
# THEN change all seeded passwords from /admin/users → Edit
```

> `prisma/catalogData.json` ships in git for `seedCatalog`; run `fetch-catalog` only if you want fresh data.

## 9. Admin checks after deploy

- `https://yourdomain.com/admin/login` — log in with a seeded account
- Sidebar → all routes load; uploads (`/api/admin/upload`) write into the persistent uploads dir served by the runtime route handler — verify a product image upload works
- `pm2 logs eghuri` and `pm2 status` to confirm health

## 10. Common operations

| Task | Command |
|---|---|
| Redeploy after code changes | `git pull && npm install && npm run build && pm2 restart eghuri` |
| New schema migration from team | `npx prisma migrate deploy && pm2 restart eghuri` |
| App status | `pm2 status` |
| App logs | `pm2 logs eghuri --lines 100` |
| Rollback | `git checkout <previous-tag-or-commit>` → rebuild → `pm2 restart eghuri` |
| Postgres backup | `sudo -u postgres pg_dump eghuri_prod > ~/backup_$(date +%F).sql` |
| Postgres restore | `sudo -u postgres psql eghuri_prod < ~/backup-FILE.sql` |
| Update server packages | `sudo apt update && sudo apt upgrade -y` |
| Check SSL certificate expiry | `sudo certbot certificates` (Option B) |
| Force SSL renewal now | `sudo certbot renew --force-renewal` (Option B) |
| Test nginx config after manual edits | `sudo nginx -t && sudo systemctl reload nginx` |

## 11. Gotchas

- **Never** run `prisma migrate dev`, `migrate reset`, or `npm run seed` (post-first setup) against the production database — see `docs/PRISMA-CHEATSHEET.md#migrations`
- `.env` must contain `JWT_SECRET`; without it production throws (enforced in `src/lib/jwt-secret.js`)
- File uploads go to a persistent dir served by a route handler; check `app/api/admin/upload/route.js` config if you change storage locations
- If Postgres rejects connections from Prisma: check `pg_hba.conf` not needed for localhost+password auth via TCP; DATABASE_URL must include the password
- Provision RAM ≥ 4 GB before running `npm run build` (Next + Turbopack are memory hungry)

## Checklist on the way out

- [ ] `ufw` active, ports 80/443/22 only
- [ ] SSH via key, password auth disabled
- [ ] `.env` present with `JWT_SECRET` set
- [ ] `migrate deploy` clean, seed completed, default passwords changed
- [ ] HTTP→HTTPS redirect active, `X-Forwarded-Proto` header set in the proxy
- [ ] HTTPS issued (Caddy or Nginx+Certbot); if Option B: `sudo certbot certificates` shows valid expiry
- [ ] Admin login works, product image upload works, storefront checkout smoke-tested
- [ ] PM2 auto-start configured (`pm2 startup` done as root)
