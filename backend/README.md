# AI Business Strategy Copilot - Backend Foundation (Phase 1)

Enterprise AI SaaS backend foundation for **AI Business Strategy Copilot** built with **FastAPI**, **MongoDB Atlas (Motor)**, **Pydantic V2**, and **Python 3.12+**.

---

## 🚀 Key Architecture Highlights

- **Clean Architecture & Layered Design**:
  - `models/`: Pydantic V2 data models with custom `PyObjectId` ObjectId serialization.
  - `schemas/`: Pydantic DTOs for requests, responses, pagination, and health status.
  - `repositories/`: Async MongoDB Repository Pattern powered by `Motor`.
  - `services/`: Domain Service Layer decoupling business logic from storage & web layers.
  - `api/v1/`: Versioned FastAPI endpoint routers (`users`, `startups`, `interviews`, `reports`, `chat`, `notifications`, `settings`, `health`).
- **Production Readiness**:
  - Centralized settings configuration with `pydantic-settings`.
  - Structured logging with performance metrics.
  - Custom domain exceptions and HTTP error handlers.
  - Asynchronous Motor MongoDB connection pooling and lifespan context management.
  - Pre-scaffolded auth (JWT/OAuth), AI (Gemini/Groq), storage, notification, websocket, and report generation extensions.

---

## 📂 Directory Structure

```text
backend/
├── app/
│   ├── main.py                    # App initialization, lifespan manager, OpenAPI, CORS
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/         # Modular endpoint routers
│   │       │   ├── users.py
│   │       │   ├── startups.py
│   │       │   ├── interviews.py
│   │       │   ├── reports.py
│   │       │   ├── chat.py
│   │       │   ├── notifications.py
│   │       │   ├── settings.py
│   │       │   └── health.py
│   │       └── router.py          # Aggregated v1 Router
│   ├── core/                      # Config, Logging, Exceptions, Security
│   ├── database/                  # Connection Manager, Collections, Indexes
│   ├── middleware/                # CORS, Logging, Exception Middlewares
│   ├── models/                    # Pydantic V2 MongoDB Models
│   ├── schemas/                   # Pydantic DTOs & Response Models
│   ├── repositories/              # Motor Repository Pattern Base & Classes
│   ├── services/                  # Service Layer Pattern Base & Classes
│   ├── dependencies/              # FastAPI Dependency Injection Providers
│   ├── utils/                     # Datetime, Serializer, String Utilities
│   ├── auth/                      # JWT & Google OAuth ready stubs
│   ├── ai/                        # Gemini & Groq AI ready stubs
│   ├── reports/                   # Report Generation stubs
│   ├── storage/                   # File Storage Provider stubs
│   ├── notifications/             # Notification Service stubs
│   ├── websocket/                 # WebSocket Connection Manager
│   └── common/                    # Enums, Custom Types, Standard Responses
├── logs/                          # System log output directory
├── uploads/                       # File upload storage directory
├── tests/                         # Pytest test suite
├── requirements.txt               # Dependencies specification
├── README.md                      # Documentation
├── .gitignore                     # Git ignore rules
└── .env.example                   # Environment configuration template
```

---

## 🛠️ Getting Started

### 1. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your configuration variables inside `.env` (MongoDB Atlas URI, JWT Secret, API Keys).

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Development Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

or execute directly:

```bash
python -m app.main
```

---

## 📑 API Documentation

Once the server is running, explore interactive API documentation at:
- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
