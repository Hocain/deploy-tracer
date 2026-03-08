# DeployTracer — Complete Step-by-Step Build Guide
## From Zero to LinkedIn-Ready in One Weekend

---

## TABLE OF CONTENTS

1. [Prerequisites & What You Need](#1-prerequisites)
2. [Project Setup & Repository](#2-project-setup)
3. [Backend — Node.js API + WebSocket Server](#3-backend)
4. [Frontend — React Real-Time Dashboard](#4-frontend)
5. [Docker — Containerize Everything](#5-docker)
6. [Terraform — AWS Infrastructure as Code](#6-terraform)
7. [GitHub Actions — CI/CD Pipeline](#7-github-actions)
8. [Kubernetes — Deploy to Production](#8-kubernetes)
9. [Connect Everything End-to-End](#9-connect-everything)
10. [Testing & Demo](#10-testing)
11. [README & LinkedIn Post](#11-linkedin)

---

## 1. PREREQUISITES

### What You Need Installed

```bash
# Check if you have these (run each command):
node --version        # Need v18+ (you already have this from SafeDrive365)
npm --version         # Comes with Node
docker --version      # Need Docker Desktop or Docker Engine
terraform --version   # Need v1.5+
kubectl version       # Need kubectl for K8s
git --version         # Need Git
aws --version         # Need AWS CLI v2
```

### Install anything missing:

```bash
# Terraform (Ubuntu/Debian)
wget -O - https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

### AWS Account Setup

You already have AWS set up for SafeDrive365. Make sure you have:
- AWS CLI configured (`aws configure`)
- An IAM user with ECR + IAM permissions
- Your region set (eu-north-1)

### GitHub Account

- Create a new repository called `deploy-tracer` on GitHub
- Keep it PUBLIC (important for LinkedIn visibility!)

---

## 2. PROJECT SETUP

### Step 2.1 — Create the Repository

```bash
# Create project directory
mkdir deploy-tracer
cd deploy-tracer

# Initialize git
git init

# Create the folder structure
mkdir -p infra
mkdir -p k8s
mkdir -p backend/routes
mkdir -p backend/middleware
mkdir -p frontend/src/components
mkdir -p frontend/src/hooks
mkdir -p frontend/src/styles
mkdir -p .github/workflows
```

### Step 2.2 — Create .gitignore

```bash
cat > .gitignore << 'EOF'
node_modules/
dist/
.env
*.db
.terraform/
*.tfstate
*.tfstate.backup
.terraform.lock.hcl
*.tfvars
EOF
```

### Step 2.3 — Connect to GitHub

```bash
git add .gitignore
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/deploy-tracer.git
git push -u origin main
```

---

## 3. BACKEND — NODE.JS API + WEBSOCKET SERVER

The backend is the brain of DeployTracer. It does 3 things:
1. **Receives webhooks** from GitHub when you push code
2. **Stores events** in SQLite database
3. **Broadcasts updates** to the React frontend via WebSocket

### Step 3.1 — Initialize Backend

```bash
cd backend

# Create package.json
npm init -y

# Install dependencies
npm install express ws cors better-sqlite3 dotenv uuid

# Install dev dependencies
npm install -D nodemon
```

**What each package does:**
- `express` — HTTP server framework (handles webhook POST requests)
- `ws` — WebSocket library (real-time push to browsers)
- `cors` — Cross-Origin Resource Sharing (lets frontend talk to backend)
- `better-sqlite3` — SQLite database driver (stores deployment events)
- `dotenv` — Loads environment variables from .env file
- `uuid` — Generates unique IDs for each deployment
- `nodemon` — Auto-restarts server when code changes (dev only)

### Step 3.2 — Create Environment File

```bash
cat > .env.example << 'EOF'
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
GITHUB_WEBHOOK_SECRET=your-webhook-secret-here
DB_PATH=./deploytracer.db
EOF

# Copy for local use
cp .env.example .env
```

### Step 3.3 — Create database.js

**WHY SQLite?** Zero setup. No Docker container for a database. Single file. Fast enough for this project. In production, you'd use PostgreSQL.

The database has 2 tables:
- `deployments` — One row per deployment (the overall pipeline run)
- `events` — Many rows per deployment (each stage update)

```
deployments                      events
┌──────────────────┐            ┌───────────────────┐
│ id (uuid)        │───────────▶│ deployment_id     │
│ commit_sha       │     1:N    │ stage             │
│ commit_msg       │            │ status            │
│ branch           │            │ message           │
│ author           │            │ created_at        │
│ status           │            └───────────────────┘
│ current_stage    │
│ started_at       │
│ finished_at      │
│ duration_ms      │
└──────────────────┘
```

Create `backend/database.js` — (file already created in project files)

**KEY CONCEPT — The 5 Pipeline Stages:**
```
git_push → ci_build → image_push → k8s_rollout → health_check
```
Each stage can be: `pending`, `in_progress`, `success`, or `failed`.

### Step 3.4 — Create server.js

This is the main entry point. It:
1. Creates an Express HTTP server
2. Attaches a WebSocket server to it
3. Sends initial data when a browser connects
4. Provides a `broadcast()` function that sends data to ALL connected browsers

**KEY CONCEPT — WebSocket vs HTTP:**
```
HTTP:      Browser asks → Server responds → Connection closed
WebSocket: Browser connects → Connection stays OPEN → Server can push anytime
```
We need WebSocket because we want the dashboard to update INSTANTLY when a stage completes, without the browser having to keep asking "are we done yet?"

Create `backend/server.js` — (file already created in project files)

### Step 3.5 — Create Webhook Routes

This is where GitHub sends events. When you push code:

```
You → git push → GitHub → POST /api/webhook/github → DeployTracer
```

The webhook handler:
1. Verifies the request is actually from GitHub (signature check)
2. Creates a new deployment record in the database
3. Broadcasts to all connected browsers: "Hey! New deployment started!"

Create `backend/routes/webhook.js` — (file already created)

**THE TEST ENDPOINT** — The `/api/webhook/test` route is crucial for demos! It creates a fake deployment and auto-simulates all 5 stages with realistic delays. This is what you'll use for your LinkedIn screen recording.

### Step 3.6 — Create Events & Deployments Routes

Create `backend/routes/events.js` and `backend/routes/deployments.js` — (files already created)

### Step 3.7 — Update package.json Scripts

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### Step 3.8 — Test the Backend

```bash
cd backend
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════╗
║     🔍 DeployTracer Backend Running       ║
║                                           ║
║   HTTP:      http://localhost:3001         ║
║   WebSocket: ws://localhost:3001/ws        ║
╚═══════════════════════════════════════════╝
```

Test the health endpoint:
```bash
curl http://localhost:3001/api/health
# Should return: {"status":"healthy","uptime":...}
```

Test creating a deployment:
```bash
curl -X POST http://localhost:3001/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"message": "test deploy", "author": "mayank", "simulate": true}'
```

---

## 4. FRONTEND — REACT REAL-TIME DASHBOARD

### Step 4.1 — Initialize Frontend with Vite

```bash
cd ../frontend

# Create package.json and install
npm init -y
npm install react react-dom
npm install -D vite @vitejs/plugin-react
```

### Step 4.2 — Create Vite Config

The Vite config sets up a proxy so that during development, `/api` calls go to the backend on port 3001, and `/ws` WebSocket connections also proxy correctly.

Create `frontend/vite.config.js` — (file already created)

### Step 4.3 — Create index.html

This is the entry point that loads fonts and the React app.

Create `frontend/index.html` — (file already created)

### Step 4.4 — Create Global CSS

The CSS creates a dark theme with neon accents — designed to look amazing in screenshots and GIFs for LinkedIn.

**KEY DESIGN CHOICES:**
- Dark background (#0a0e1a) — looks professional and modern
- Subtle gradient overlays — adds depth without being distracting
- Animated pulses — draws attention to active stages
- JetBrains Mono font — screams "developer tool"

Create `frontend/src/styles/global.css` — (file already created)

### Step 4.5 — Create the WebSocket Hook

This is a custom React hook that manages the WebSocket connection. It:
1. Connects to `ws://localhost:3001/ws`
2. Receives 3 types of messages: `INITIAL_STATE`, `NEW_DEPLOYMENT`, `STAGE_UPDATE`
3. Auto-reconnects if the connection drops
4. Returns `{ deployments, connected }` for components to use

**KEY CONCEPT — React Hooks:**
```javascript
// A hook is a reusable piece of stateful logic
const { deployments, connected } = useWebSocket('ws://localhost:3001/ws');
// Now any component can access real-time deployment data!
```

Create `frontend/src/hooks/useWebSocket.js` — (file already created)

### Step 4.6 — Create Components

**App.jsx** — The main layout. Connects WebSocket, shows header, pipeline tracker, and deployment list.

**Header.jsx** — Shows "DeployTracer" title, connection status (green = live, red = reconnecting), and Test Deploy button.

**PipelineTracker.jsx** — THE STAR COMPONENT. This renders the 5-stage pipeline visualization with:
- Animated stage transitions
- Color-coded status indicators (green ✓, red ✗, blue ●)
- Glowing border on the active stage
- Commit info bar at the top
- Duration timer

**DeploymentList.jsx** — Shows a scrollable list of past deployments. Click any to view its pipeline.

Create all component files — (already created in project files)

### Step 4.7 — Test the Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser. You should see the DeployTracer dashboard!

**Make sure the backend is also running** in another terminal. Click "Test Deploy" and watch the pipeline animate through all 5 stages!

---

## 5. DOCKER — CONTAINERIZE EVERYTHING

### Step 5.1 — Backend Dockerfile

**Multi-stage build** — We use 2 stages to keep the final image small:
1. Stage 1: Install dependencies (includes build tools)
2. Stage 2: Copy only what we need (no build tools = smaller image)

Create `backend/Dockerfile` — (file already created)

### Step 5.2 — Frontend Dockerfile

For the frontend, we:
1. Build the React app with Vite
2. Serve the static files with nginx (fast and efficient)

Create `frontend/Dockerfile` and `frontend/nginx.conf` — (files already created)

### Step 5.3 — Docker Compose

Docker Compose runs both containers together locally.

Create `docker-compose.yml` — (file already created)

### Step 5.4 — Build and Test

```bash
# From project root
docker-compose up --build

# Open http://localhost
# Click "Test Deploy" to verify everything works!
```

**Troubleshooting:**
- Port conflict? Change ports in docker-compose.yml
- better-sqlite3 build fails? The Dockerfile installs `python3 make g++` for native builds
- Frontend can't reach backend? Check the nginx.conf proxy settings

---

## 6. TERRAFORM — AWS INFRASTRUCTURE

### Step 6.1 — What Terraform Creates

```
Terraform will create:
├── ECR Repository (stores your Docker images)
├── ECR Lifecycle Policy (auto-deletes old images)
├── IAM Role (GitHub Actions assumes this role)
└── IAM Policy (allows push/pull to ECR)
```

### Step 6.2 — Configure Variables

Edit `infra/main.tf` and change:
```hcl
variable "github_org" {
  default = "your-actual-github-username"  # ← CHANGE THIS
}

variable "github_repo" {
  default = "deploy-tracer"
}

variable "aws_region" {
  default = "eu-north-1"  # ← Your AWS region
}
```

### Step 6.3 — Initialize and Apply

```bash
cd infra

# Initialize Terraform (downloads AWS provider)
terraform init

# Preview what will be created
terraform plan

# Create the resources!
terraform apply
# Type "yes" when prompted
```

### Step 6.4 — Save the Outputs

```bash
terraform output
```

You'll get:
```
ecr_repository_url = "123456789.dkr.ecr.eu-north-1.amazonaws.com/deploy-tracer"
github_actions_role_arn = "arn:aws:iam::123456789:role/deploy-tracer-github-actions"
```

**SAVE THESE VALUES!** You need them for GitHub Actions and K8s deployment.

### Step 6.5 — Setup GitHub OIDC Provider

If this is your first time using OIDC with GitHub Actions in this AWS account:

```bash
# Uncomment the aws_iam_openid_connect_provider resource in main.tf
# Then run:
terraform apply
```

**WHY OIDC?** Traditional approach: store AWS access keys in GitHub secrets (risky — keys can leak). OIDC approach: GitHub proves its identity to AWS cryptographically — no secrets stored anywhere!

---

## 7. GITHUB ACTIONS — CI/CD PIPELINE

### Step 7.1 — Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:
```
AWS_ROLE_ARN = arn:aws:iam::123456789:role/deploy-tracer-github-actions
                (from terraform output)
```

### Step 7.2 — Understanding the Workflow

The GitHub Actions workflow (`.github/workflows/deploy.yml`) runs on every push to main. At EACH stage, it calls our DeployTracer API to report progress:

```
Push to main
  ↓
┌─ Stage 1: Git Push ────────────────────────────┐
│  POST /api/webhook/github → creates deployment │
└────────────────────────────────────────────────┘
  ↓
┌─ Stage 2: CI Build ───────────────────────────┐
│  npm ci → npm test → npm run build            │
│  POST /api/webhook/stage → reports progress   │
└───────────────────────────────────────────────┘
  ↓
┌─ Stage 3: Image Push ────────────────────────┐
│  docker build → docker push to ECR           │
│  POST /api/webhook/stage → reports progress  │
└──────────────────────────────────────────────┘
  ↓
┌─ Stage 4: K8s Rollout ──────────────────────┐
│  kubectl apply → kubectl rollout status     │
│  POST /api/webhook/stage → reports progress │
└─────────────────────────────────────────────┘
  ↓
┌─ Stage 5: Health Check ─────────────────────┐
│  curl /api/health → verify 200 OK          │
│  POST /api/webhook/stage → reports progress │
└─────────────────────────────────────────────┘
```

### Step 7.3 — Configure kubectl in GitHub Actions

For GitHub Actions to deploy to your K8s cluster, it needs access. Options:

**Option A: Self-hosted runner on your EC2** (Recommended for your setup)
```yaml
# In deploy.yml, change:
runs-on: ubuntu-latest
# To:
runs-on: self-hosted
```

Then install the GitHub Actions runner on your EC2:
```bash
# On your EC2 instance
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64-2.311.0.tar.gz -L https://github.com/actions/runner/releases/download/v2.311.0/actions-runner-linux-x64-2.311.0.tar.gz
tar xzf ./actions-runner-linux-x64-2.311.0.tar.gz
./config.sh --url https://github.com/YOUR_USERNAME/deploy-tracer --token YOUR_TOKEN
sudo ./svc.sh install
sudo ./svc.sh start
```

**Option B: Kubeconfig as GitHub secret**
```bash
# Get your kubeconfig
cat ~/.kube/config | base64 -w 0
# Add as GitHub secret: KUBE_CONFIG
```

Then in workflow:
```yaml
- name: Setup kubectl
  run: |
    mkdir -p ~/.kube
    echo "${{ secrets.KUBE_CONFIG }}" | base64 -d > ~/.kube/config
```

---

## 8. KUBERNETES — DEPLOY TO PRODUCTION

### Step 8.1 — Create Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

### Step 8.2 — Create Secrets

```bash
# Generate a webhook secret
WEBHOOK_SECRET=$(openssl rand -hex 32)
echo "Save this: $WEBHOOK_SECRET"

# Create K8s secret
kubectl create secret generic deploy-tracer-secrets \
  --from-literal=github-webhook-secret=$WEBHOOK_SECRET \
  -n deploy-tracer
```

### Step 8.3 — Update Manifests

Edit `k8s/deployment.yaml`:
- Replace `YOUR_ECR_URL` with your actual ECR URL from terraform output
- Adjust resource limits if needed

Edit `k8s/ingress.yaml`:
- Replace `deploytracer.yourdomain.com` with your actual domain
- Or use your EC2 IP with nip.io: `deploytracer.13.53.77.22.nip.io`

### Step 8.4 — Deploy!

```bash
# Apply all manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Watch the pods come up
kubectl get pods -n deploy-tracer -w

# Check the deployment status
kubectl rollout status deployment/deploy-tracer -n deploy-tracer
```

### Step 8.5 — Setup GitHub Webhook

Go to your GitHub repo → Settings → Webhooks → Add webhook:
```
Payload URL: https://deploytracer.yourdomain.com/api/webhook/github
Content type: application/json
Secret: (the WEBHOOK_SECRET you generated)
Events: Just the push event
```

---

## 9. CONNECT EVERYTHING END-TO-END

### The Full Flow

```
1. You push code to GitHub
2. GitHub sends webhook to DeployTracer → NEW_DEPLOYMENT event
3. GitHub Actions starts the workflow
4. Each stage reports progress → STAGE_UPDATE events
5. WebSocket broadcasts to all connected browsers
6. Dashboard updates in real-time!
```

### Verify the Connection

```bash
# 1. Open the dashboard in your browser
open https://deploytracer.yourdomain.com

# 2. Make a small code change
echo "// test" >> backend/server.js

# 3. Push it
git add -A
git commit -m "feat: trigger deployment"
git push origin main

# 4. Watch the dashboard! 🎉
```

---

## 10. TESTING & DEMO

### Local Testing (No AWS Needed)

```bash
# Terminal 1: Start backend
cd backend && npm run dev

# Terminal 2: Start frontend
cd frontend && npm run dev

# Terminal 3: Trigger test deployments
curl -X POST http://localhost:3001/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"message": "feat: add dark mode", "author": "mayank", "simulate": true}'

# Send multiple to see the list populate:
curl -X POST http://localhost:3001/api/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"message": "fix: resolve auth bug", "author": "mayank", "simulate": true}'
```

### Recording the Demo for LinkedIn

```bash
# 1. Open Chrome, navigate to http://localhost:5173
# 2. Open a screen recorder (OBS, or Chrome's built-in)
# 3. Click "Test Deploy" on the dashboard
# 4. Watch the animation
# 5. Trigger 2-3 more deployments
# 6. Stop recording
# 7. Convert to GIF using: ffmpeg -i video.mp4 -vf "fps=15,scale=800:-1" demo.gif
```

---

## 11. README & LINKEDIN POST

### GitHub README

The README.md file is already created with:
- Eye-catching badges
- Clear "What is this?" section
- Architecture diagram (ASCII)
- Tech stack table
- Quick start instructions
- Project structure

### LinkedIn Post Template

```
🚀 I built "DeployTracer" this weekend — a real-time visual tracker
that follows your code from git push to production.

Think Domino's Pizza Tracker... but for deployments.

Every commit gets a live visual journey:
⚡ Git Push → 🔨 CI Build → 📦 Image Registry → 🚀 K8s Rollout → ❤️ Health Check

Built with:
• Terraform (IaC for AWS infra)
• GitHub Actions (CI/CD pipeline)
• Docker + AWS ECR (container registry)
• Kubernetes (deployment orchestration)
• React + WebSockets (real-time dashboard)
• Node.js (event collector API)

The coolest part? You can watch your deployment progress in real-time
with animated stage transitions.

🔗 GitHub: github.com/YOUR_USERNAME/deploy-tracer

#DevOps #Kubernetes #AWS #Docker #Terraform #GitHubActions #OpenSource
```

**LinkedIn Tips:**
- Post on Tuesday/Wednesday 8-10 AM IST
- Add the demo GIF as the first image
- Reply to EVERY comment in the first hour
- Tag relevant people/companies
- Use 3-5 hashtags max

---

## QUICK REFERENCE

### Useful Commands

```bash
# Local dev
cd backend && npm run dev          # Start backend
cd frontend && npm run dev         # Start frontend

# Docker
docker-compose up --build          # Build & run both
docker-compose down                # Stop everything

# Terraform
cd infra && terraform plan         # Preview changes
cd infra && terraform apply        # Apply changes
cd infra && terraform destroy      # Tear down everything

# Kubernetes
kubectl get pods -n deploy-tracer                    # List pods
kubectl logs -f deployment/deploy-tracer -n deploy-tracer  # View logs
kubectl rollout restart deployment/deploy-tracer -n deploy-tracer  # Restart
kubectl delete namespace deploy-tracer               # Remove everything
```

### Environment Variables

| Variable | Where | Value |
|----------|-------|-------|
| PORT | Backend .env | 3001 |
| GITHUB_WEBHOOK_SECRET | Backend .env + K8s secret + GitHub webhook | Same value everywhere |
| AWS_ROLE_ARN | GitHub secret | From `terraform output` |
| ECR URL | K8s deployment.yaml | From `terraform output` |

---

**You've got this, Mayank! Build it, record a killer demo, and post it. 🚀**
