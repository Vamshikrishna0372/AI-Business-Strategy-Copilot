# AI Business Strategy Copilot (v1.0.0 Commercial Release)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111.1-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-3178C6.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248.svg)](https://www.mongodb.com/)
[![Gemini 2.5](https://img.shields.io/badge/Google_Gemini-2.5_Flash-4285F4.svg)](https://deepmind.google/technologies/gemini/)
[![Groq AI](https://img.shields.io/badge/Groq_AI-Llama_3.3_70B-FF6C37.svg)](https://groq.com/)

**AI Business Strategy Copilot** is an enterprise AI Business Operating System designed for startup founders, venture builders, and serial entrepreneurs. It empowers founders to systematically interview, validate, strategize, model, analyze, and scale multiple startup workspaces with zero data leakage.

---

## 🚀 Key Value Proposition

Starting a business is notoriously chaotic. Founders struggle with structured market validation, financial modeling, competitor intelligence, and pitch preparation. **AI Business Strategy Copilot** acts as a 24/7 AI Chief Strategy Officer (CSO) and Chief Financial Officer (CFO), guiding founders step-by-step through a 9-module **Business Journey** backed by Google Gemini 2.5 Flash and automatic Groq Llama 3.3 failover.

---

## 🏛 Platform Architecture Overview

```
                        ┌──────────────────────────────────────────┐
                        │      TanStack / React 18 UI Shell        │
                        └────────────────────┬─────────────────────┘
                                             │
                        ┌────────────────────▼─────────────────────┐
                        │  Axios / API Client (JWT + X-Startup-ID) │
                        └────────────────────┬─────────────────────┘
                                             │
                        ┌────────────────────▼─────────────────────┐
                        │     FastAPI Async Gateway (v1 REST)      │
                        └──────────┬──────────────────────┬────────┘
                                   │                      │
       ┌───────────────────────────▼──────┐        ┌──────▼───────────────────────────┐
       │   MongoDB Atlas Persistence     │        │ Primary: Gemini 2.5 Flash        │
       │ (Users, Startups, Reports, Chats)│        │ Fallback: Groq Llama 3.3 70B     │
       └──────────────────────────────────┘        └──────────────────────────────────┘
```

---

## 🌟 Features & Business Modules

### 1. Multi-Tenant Workspace Isolation
- Isolated strategy data, financial models, reports, AI chats, and notifications per startup workspace.
- Enforced header injection (`X-Startup-ID`) and JWT ownership verification (`startup.owner_id == user.id`).

### 2. Business Journey Hub (9 AI Engines)
1. **AI Business Interview**: Dynamic diagnostic question generator.
2. **Idea Validation Engine**: Problem-solution fit scoring, market size estimations, and validation experiments.
3. **Business Strategy Engine**: Core value proposition, strategic positioning, target persona, and GTM channels.
4. **Competitor Intelligence**: Competitive matrix, moat evaluation, and threat mitigation tactics.
5. **Business Model Canvas**: Interactive 9-block Lean Canvas generator.
6. **Financial Planning Engine**: Revenue forecasts, expense models, break-even thresholds, and runway estimation.
7. **Risk Intelligence Engine**: Multi-dimensional risk matrix (Financial, Operational, Regulatory, Tech) with severity scores.
8. **Investor Readiness Engine**: Readiness score (0–100), investor pitch angles, diligence checklists, and check size estimates.
9. **Execution Roadmap Engine**: Phase-by-phase quarterly milestones, sprint goals, and resource allocation.

### 3. Executive Dashboard & Founder Command Center
- Dynamic scorecards for Business Health, Innovation, Financial Fitness, Risk Rating, and Investor Readiness.
- Real-time Activity Timeline and AI Recommendations with automatic cross-component refresh on AI report completion.

### 4. Reports Center & Incremental Versioning
- Complete version history (**v1, v2, v3...**) preserving past report snapshots.
- Quick Preview modal, **Download JSON**, and **Download Formatted Text** functionality.

### 5. AI Copilot Chat Engine
- Conversational chat memory bound strictly to the active startup.
- Message history, thread pinning, renaming, deleting, and suggested prompt triggers.

### 6. Production Health & Observability
- `/api/v1/health` (Main status, uptime, version)
- `/api/v1/health/database` (MongoDB ping, connection latency ms)
- `/api/v1/health/ai` (Gemini & Groq readiness pings, latency ms)
- `/api/v1/health/system` (Uptime, rate-limiting limits, environment settings)

---

## 📦 Project Directory Structure

```
.
├── backend/                        # FastAPI Enterprise Server
│   ├── app/
│   │   ├── ai/                     # Gemini, Groq Fallback, Prompts & Context Builder
│   │   ├── api/v1/endpoints/       # Modules, Reports, Chat, Dashboard, Health Endpoints
│   │   ├── common/                 # Base Models, Enums, Responses
│   │   ├── core/                   # Security, Config, Exceptions, Logging
│   │   ├── database/               # MongoDB Connection & Compound Indexing
│   │   ├── dependencies/           # Auth Bearer & X-Startup-ID Dependencies
│   │   ├── models/                 # Beanie / Pydantic Mongo Models
│   │   ├── repositories/           # Repository Pattern Data Access Layer
│   │   ├── schemas/                # API DTO Request/Response Schemas
│   │   └── services/               # Core AIService, DashboardService, ActivityLogger
│   ├── tests/                      # Pytest Async Test Suite
│   ├── .env                        # Backend Environment Variables
│   ├── requirements.txt            # Python Dependencies
│   └── uvicorn_start.py
├── startup-ai-copilot-27/          # TanStack / React Frontend
│   ├── src/
│   │   ├── components/             # UI Kit, Workspace UI, Layout Components
│   │   ├── data/                   # Default Workspaces & Module Metadata
│   │   ├── lib/                    # API Client, Auth Context, Workspace Context, Event Bus
│   │   ├── routes/                 # TanStack File-Based Router Pages
│   │   └── services/               # AI Modules, Reports, Copilot & Startup Services
│   ├── .env                        # Frontend Environment Configuration
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend UI** | React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Sonner |
| **Frontend Framework** | TanStack Router, TanStack Start |
| **Backend API** | Python 3.11+, FastAPI 0.111, Uvicorn, GZip Middleware |
| **Database** | MongoDB Atlas / Local MongoDB, Motor Async |
| **Primary AI Provider** | Google Gemini 2.5 Flash REST API |
| **Fallback AI Provider** | Groq AI Llama 3.3 70B Versatile |
| **Authentication** | JWT (HS256) Bearer Tokens + Google OAuth 2.0 |

---

## ⚙️ Local Installation & Setup

### Prerequisites
- Python 3.11 or higher
- Node.js 18 or higher & npm
- MongoDB instance (local or MongoDB Atlas connection URI)

### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1
# (On macOS/Linux: source venv/bin/activate)

# Install backend dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd startup-ai-copilot-27

# Install dependencies
npm install

# Start frontend development server
npm run dev
```
Navigate to `http://localhost:3000` or `http://localhost:5173`.

---

## 🔐 Environment Variables

### Backend `.env`
```env
APP_NAME="AI Business Strategy Copilot"
ENVIRONMENT="development"
DEBUG=True
LOG_LEVEL="INFO"

HOST="0.0.0.0"
PORT=8000
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173","http://127.0.0.1:3000"]

MONGODB_URI="mongodb://localhost:27017"
DATABASE_NAME="ai_strategy_copilot_dev"

JWT_SECRET="super-secret-jwt-key-change-in-production-min-32-chars"
JWT_ALGORITHM="HS256"
JWT_EXPIRE_MINUTES=1440

GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
GROQ_API_KEY="YOUR_GROQ_API_KEY"
DEFAULT_AI_PROVIDER="gemini"
DEFAULT_AI_MODEL="gemini-2.5-flash"
FALLBACK_AI_PROVIDER="groq"
FALLBACK_AI_MODEL="llama-3.3-70b-versatile"
```

### Frontend `.env`
```env
VITE_APP_NAME="AI Business Strategy Copilot"
VITE_API_BASE_URL="http://localhost:8000"
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).
