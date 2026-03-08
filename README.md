# 🔍 DeployTracer

### The "Domino's Pizza Tracker" for your deployments

Watch your code travel from `git push` to production in real-time with animated visual tracking.

![Deploy Pipeline](https://img.shields.io/badge/pipeline-5_stages-blue)
![Kubernetes](https://img.shields.io/badge/k8s-ready-326CE5)
![Terraform](https://img.shields.io/badge/IaC-Terraform-7B42BC)
![License](https://img.shields.io/badge/license-MIT-green)

---

## 🎯 What is this?

Every DevOps engineer knows the pain: you push code, start the CI/CD pipeline, and then... wait. Stare at logs. Refresh the page. Wonder if it's stuck.

**DeployTracer** gives you a real-time visual dashboard that tracks every deployment through 5 stages:

```
⚡ Git Push → 🔨 CI Build → 📦 Image Push → 🚀 K8s Rollout → ❤️ Health Check
```

Each stage updates live via WebSocket — no page refresh needed.

---

## 🏗️ Architecture

```
┌──────────┐    Webhook     ┌──────────────┐    WebSocket    ┌──────────┐
│  GitHub   │──────────────▶│   Backend    │───────────────▶│ Frontend │
│  Actions  │   POST /api   │  (Node.js)   │   ws://        │ (React)  │
└──────────┘    /webhook    │  + SQLite    │                └──────────┘
                            └──────────────┘
                                   │
                            ┌──────┴──────┐
                            │  Kubernetes  │
                            │   Cluster    │
                            └─────────────┘
```

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **IaC** | Terraform | AWS ECR, IAM, OIDC |
| **CI/CD** | GitHub Actions | Build, test, deploy |
| **Container** | Docker + AWS ECR | Image build & registry |
| **Orchestration** | Kubernetes | Deployment & scaling |
| **Backend** | Node.js + Express | Webhook receiver + WebSocket |
| **Frontend** | React + Vite | Real-time dashboard |
| **Database** | SQLite | Deployment event storage |

## 🚀 Quick Start

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/deploy-tracer.git
cd deploy-tracer

# 2. Start backend
cd backend
cp .env.example .env
npm install
npm run dev

# 3. Start frontend (new terminal)
cd frontend
npm install
npm run dev

# 4. Open http://localhost:5173
# 5. Click "Test Deploy" to see it in action!
```

### Docker Compose

```bash
docker-compose up --build
# Open http://localhost
```

### Production (AWS + Kubernetes)

```bash
# 1. Deploy infrastructure
cd infra
terraform init
terraform apply

# 2. Configure GitHub Secrets
# Add AWS_ROLE_ARN from terraform output

# 3. Push to main - pipeline deploys automatically!
git push origin main
```

## 📁 Project Structure

```
deploy-tracer/
├── infra/                    # Terraform IaC
│   └── main.tf               # ECR, IAM, OIDC
├── k8s/                      # Kubernetes manifests
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
├── .github/workflows/
│   └── deploy.yml             # CI/CD + DeployTracer reporting
├── backend/                   # Event collector API
│   ├── server.js              # Express + WebSocket
│   ├── database.js            # SQLite operations
│   └── routes/
│       ├── webhook.js         # GitHub webhook handler
│       ├── events.js          # SSE streaming
│       └── deployments.js     # REST API
├── frontend/                  # React dashboard
│   └── src/
│       ├── components/
│       │   ├── PipelineTracker.jsx
│       │   ├── DeploymentList.jsx
│       │   └── Header.jsx
│       └── hooks/
│           └── useWebSocket.js
└── docker-compose.yml
```

## 🔧 How It Works

1. **You push code** → GitHub sends a webhook to DeployTracer
2. **GitHub Actions runs** → At each CI/CD stage, it POSTs status updates to our API
3. **Backend receives updates** → Stores in SQLite, broadcasts via WebSocket
4. **Frontend updates live** → React re-renders the pipeline visualization instantly

## 📄 License

MIT — build whatever you want with it!

---

**Built by [Your Name]** — DevOps Engineer

*If this helped you, give it a ⭐ and share it on LinkedIn!*
