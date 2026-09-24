# Phase 3 — EC2 Deployment Guide

Deploy Phase 3 on EC2 instance `EC2_VA` (`10.93.129.37`) alongside the existing Phase 2 build.

## Port Mapping

| Service         | Phase 2 | Phase 3 |
|-----------------|---------|---------|
| Frontend (host) | 3000    | **3001** |
| Backend (host)  | 5001    | **5002** |
| Auth socket     | 8888    | **8889** |
| Nginx           | 80      | — (direct access or add nginx block) |

Phase 3 URL: `http://10.93.129.37:3001`

---

## Prerequisites

- AWS SSM Session Manager access to `EC2_VA`
- Docker and docker-compose installed on the EC2 (already there from Phase 2)
- A valid Snowflake PAT token for `SNOWFLAKE_TOKEN` in `.env`

---

## Step 1: Transfer Code to EC2

Option A — via S3:
```bash
# From your local machine (PowerShell)
# Zip the project (exclude node_modules, .next, __pycache__)
Compress-Archive -Path "C:\Users\2000167629\Vibe-Analytics-Phase3\*" -DestinationPath "C:\Users\2000167629\phase3.zip"

# Upload to S3
aws s3 cp "C:\Users\2000167629\phase3.zip" s3://YOUR-BUCKET/phase3.zip
```

Option B — via Git (if repo is pushed to a remote):
```bash
# On EC2 after SSM login
git clone <your-repo-url> /home/ec2-user/Vibe-Analytics-Phase3
```

---

## Step 2: SSM into EC2 and Prepare

```bash
# Open SSM session in AWS Console, then:
sudo su -

# If using S3 transfer:
cd /home/ec2-user
aws s3 cp s3://YOUR-BUCKET/phase3.zip .
unzip phase3.zip -d Vibe-Analytics-Phase3
cd Vibe-Analytics-Phase3

# If using Git:
cd /home/ec2-user/Vibe-Analytics-Phase3
```

---

## Step 3: Verify .env Configuration

The `.env` file should already have these ports set (done during local preparation):

```
BACKEND_PORT=5002
FRONTEND_PORT=3001
SF_AUTH_SOCKET_PORT=8889
SNOWFLAKE_OAUTH_REDIRECT_URI=http://10.93.129.37:5002
```

Verify and update the PAT token if needed:
```bash
cat .env

# If SNOWFLAKE_TOKEN needs updating:
# Replace with your valid PAT token
sed -i 's|SNOWFLAKE_TOKEN=.*|SNOWFLAKE_TOKEN=<your-new-pat-token>|' .env
```

---

## Step 4: Build and Start Containers

```bash
docker-compose up -d --build
```

This will:
1. Build the backend image (Python 3.11 + Flask + Gunicorn)
2. Build the frontend image (Node 20 + Next.js build)
3. Start both containers with the configured ports

The frontend build may take a few minutes (npm install + next build).

---

## Step 5: Verify Deployment

```bash
# Check containers are running
docker ps

# Expected output: two containers (frontend + backend) with status "Up"

# Test frontend
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001
# Expected: 200

# Test backend
curl -s http://localhost:5002/api/health 2>/dev/null || echo "Check backend endpoint paths"

# Verify Phase 2 is still running
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
# Expected: 200
```

---

## Step 6: Security Group Check

If `http://10.93.129.37:3001` is not reachable from your network, ask your teammate to add an inbound rule to the EC2 security group:

- **Type**: Custom TCP
- **Port**: 3001
- **Source**: Your network CIDR (or the same source as port 80)

---

## Troubleshooting

### Containers fail to start
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Port conflict
```bash
# Check what is using a port
ss -tlnp | grep -E '3001|5002|8889'

# If Phase 2 containers have different names, no conflict.
# docker-compose scopes by project directory name.
```

### Restart containers
```bash
docker-compose down
docker-compose up -d --build
```

### Check Phase 2 is untouched
```bash
cd /home/ec2-user/vibe-analytics-react
docker-compose ps
# Should show Phase 2 containers still running
```
