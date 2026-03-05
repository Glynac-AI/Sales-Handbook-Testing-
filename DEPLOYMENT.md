# Acumen Playbook — Deployment Runbook

## Prerequisites

- DigitalOcean Droplet: **8 GB RAM, 4 vCPU, Ubuntu 24.04 LTS**
- A registered domain name with DNS access
- A local machine with SSH access to the droplet

---

## Step 1 — Provision the DigitalOcean Droplet

1. Log in to [DigitalOcean](https://cloud.digitalocean.com) and create a new Droplet:
   - **Image**: Ubuntu 24.04 LTS
   - **Size**: Minimum 8 GB RAM / 4 vCPU (e.g., Basic $48/month)
   - **Region**: Choose closest to your team
   - **Authentication**: SSH key recommended
2. Note the Droplet's public IP address.

---

## Step 2 — Install Docker Engine and Docker Compose V2

SSH into the droplet:

```bash
ssh root@<DROPLET_IP>
```

Install Docker Engine (official Ubuntu method):

```bash
apt-get update
apt-get install -y ca-certificates curl gnupg

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Verify:

```bash
docker --version
docker compose version
```

Both must be installed. Docker Compose V2 is used as `docker compose` (no hyphen).

---

## Step 3 — Clone the Repository

```bash
git clone https://github.com/YOUR_ORG/acumen-playbook.git /opt/acumen-playbook
cd /opt/acumen-playbook
```

---

## Step 4 — Configure Environment Variables

```bash
cp .env.example .env
nano .env
```

Generate each secret value using:

```bash
openssl rand -base64 32
```

For `APP_KEYS`, generate 4 separate values and join them with commas:

```bash
echo "$(openssl rand -base64 32),$(openssl rand -base64 32),$(openssl rand -base64 32),$(openssl rand -base64 32)"
```

Fill in **every** variable in `.env`. Pay special attention to:
- `POSTGRES_ROOT_PASSWORD`
- `STRAPI_DB_PASSWORD`
- `WIKIJS_DB_PASSWORD`
- `APP_KEYS` (4 comma-separated values)
- `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`
- `REDIS_PASSWORD`, `RABBITMQ_PASSWORD`
- `DOMAIN` — set to your actual domain (e.g., `playbook.acumen.io`)

> **Note**: `STRAPI_API_TOKEN` and `WIKIJS_API_TOKEN` are populated **after** first boot (Steps 10 and 13).

---

## Step 5 — Edit postgres/init.sql

> ⚠️ **Critical**: The Postgres `init.sql` script runs as the `postgres` superuser during first container start. It cannot read from `.env`, so passwords must be substituted manually.

Open the file:

```bash
nano postgres/init.sql
```

Replace the two placeholder values:

| Placeholder | Replace with |
|-------------|-------------|
| `STRAPI_USER_PASSWORD` | Value of `STRAPI_DB_PASSWORD` in your `.env` |
| `WIKIJS_USER_PASSWORD` | Value of `WIKIJS_DB_PASSWORD` in your `.env` |

---

## Step 6 — Build Docker Images

```bash
docker compose build
```

This builds the Strapi 5 image (from `node:22-alpine`) and the Sync Service image. The first build takes 5–10 minutes.

---

## Step 7 — Start All Services

```bash
docker compose up -d
```

---

## Step 8 — Wait for Health Checks to Pass

```bash
watch docker compose ps
```

Wait until all services show `healthy`. This typically takes 2–3 minutes. Postgres starts first, then Strapi and Wiki.js, then Sync Service.

To view logs for a specific service:

```bash
docker compose logs -f strapi
docker compose logs -f sync-service
```

---

## Step 9 — Complete Strapi Setup

Open `https://{DOMAIN}/strapi/admin` in your browser.

> If testing locally, use `http://localhost/strapi/admin`.

Create the first Strapi admin account when prompted.

---

## Step 10 — Create Strapi API Token

1. In Strapi Admin: **Settings → API Tokens → + Create new API Token**
2. Name: `Sync Service`
3. Token duration: **Unlimited**
4. Token type: **Full Access**
5. Click **Save** and copy the generated token.
6. Paste it into `.env` as `STRAPI_API_TOKEN`.

---

## Step 11 — Configure Strapi Webhook

1. In Strapi Admin: **Settings → Webhooks → + Create new webhook**
2. Configure:
   - **Name**: Wiki.js Sync
   - **URL**: `http://sync-service:3001/webhooks/strapi`
   - **Events**: ✅ `entry.publish`, ✅ `entry.update`, ✅ `entry.unpublish`
3. Click **Save**.

> The URL uses the internal Docker network hostname `sync-service` — this is correct and resolves within the `playbook_net` network.

---

## Step 12 — Complete Wiki.js Setup

Open `https://{DOMAIN}` in your browser.

Complete the Wiki.js setup wizard:
- Database type: PostgreSQL (pre-configured via env vars)
- Create the first admin account
- Choose your default locale

---

## Step 13 — Create Wiki.js API Token

1. In Wiki.js Admin: **Administration → API Access**
2. Enable the API if not already enabled.
3. Click **+ Generate Token**:
   - Name: `Sync Service`
   - Expiration: Never
4. Copy the token.
5. Paste it into `.env` as `WIKIJS_API_TOKEN`.

---

## Step 14 — Restart Sync Service

Apply the new API tokens:

```bash
docker compose up -d --no-deps sync-service
```

---

## Step 15 — Verify End-to-End Sync

1. In Strapi Admin, open **Collection Types → Objections → + Create new entry**.
2. Fill in `objection_text`, `stage`, and `effectiveness_score`.
3. Click **Publish**.
4. Wait 5–10 seconds, then open Wiki.js.
5. Browse to **Pages** — you should see a new page under `/objections/{documentId}`.

Check sync service logs if the page doesn't appear:

```bash
docker compose logs --tail=50 sync-service
```

---

## Step 16 — Set Up Automated Backups

Add a cron job on the droplet:

```bash
crontab -e
```

Add this line to run backups daily at 2:00 AM UTC:

```
0 2 * * * /opt/acumen-playbook/scripts/backup.sh >> /var/log/acumen-backup.log 2>&1
```

Set a backup directory:

```bash
mkdir -p /backups
```

Override the default in the cron env if needed:

```
BACKUP_DIR=/backups
```

---

## Step 17 — DNS Configuration

Point your domain's **A record** to the Droplet's public IP:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| A | `@` or `playbook` | `<DROPLET_IP>` | 300 |

Caddy will automatically obtain and renew a Let's Encrypt TLS certificate once the DNS record propagates (usually within 5 minutes).

To verify HTTPS is working:

```bash
curl -I https://{DOMAIN}/healthz
```

---

## Useful Commands

```bash
# View all service statuses
docker compose ps

# Tail logs for all services
docker compose logs -f

# Run health check script
bash scripts/healthcheck.sh

# Run manual backup
bash scripts/backup.sh

# Restart a single service
docker compose restart sync-service

# Pull latest images and rebuild
docker compose pull && docker compose build && docker compose up -d

# Stop everything
docker compose down

# Stop and remove all volumes (DESTRUCTIVE — deletes all data)
docker compose down -v
```

---

## Security Hardening Checklist

- [ ] Change all default passwords in `.env`
- [ ] Restrict Strapi CORS in `strapi/config/middlewares.ts` to your actual domain
- [ ] Set up UFW firewall: only allow ports 22, 80, 443
- [ ] Enable automatic security updates: `unattended-upgrades`
- [ ] Rotate `APP_KEYS` and JWT secrets every 90 days
- [ ] Store `.env` in a secret manager (e.g., DigitalOcean Secrets, HashiCorp Vault)
- [ ] Enable Strapi 2FA for admin accounts

---

## Architecture Overview

```
Internet
    │
    ▼
Caddy (80/443) — auto-TLS via Let's Encrypt
    ├── /strapi/*    → Strapi 5 (:1337)
    ├── /api/sync/*  → Sync Service (:3001)
    └── /*           → Wiki.js (:3000)

Strapi 5 ──────────► PostgreSQL (acumen_strapi)
Wiki.js ───────────► PostgreSQL (acumen_wikijs)
Sync Service ──────► Redis (idempotency cache)
                 ──► RabbitMQ (event bus + DLQ)
                 ──► Strapi REST API (fetch entries)
                 ──► Wiki.js GraphQL API (upsert pages)

Strapi Webhook ────► Sync Service POST /webhooks/strapi
```

All services communicate over the internal `playbook_net` Docker bridge network. No database ports are exposed to the host.
