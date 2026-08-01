# AI Business Strategy Copilot — System Architecture (v1.0.0)

This document describes the architectural design, data flow, security model, and AI engine pipeline of **AI Business Strategy Copilot**.

---

## 1. High-Level Architecture Diagram

```mermaid
graph TD
    Client["React 18 / TanStack Frontend Client"]
    API["FastAPI REST API Gateway"]
    Auth["JWT Bearer + Google OAuth Guard"]
    CB["Context Builder (Startup Isolation)"]
    PE["Prompt Engine & Templates"]
    Primary["Primary AI: Gemini 2.5 Flash"]
    Fallback["Fallback AI: Groq Llama 3.3 70B"]
    Val["AI Response Validator"]
    Mongo[("MongoDB Atlas Database")]

    Client -->|HTTP Request + JWT + X-Startup-ID| API
    API --> Auth
    Auth -->|Valid User + Startup Context| CB
    CB -->|Fetch Startup Profile & Reports| Mongo
    CB --> PE
    PE --> Primary
    Primary -- Timeout / Error Failover --> Fallback
    Primary --> Val
    Fallback --> Val
    Val -->|Store Generated Report / Chat| Mongo
    Val -->|JSON Response| Client
```

---

## 2. AI Generation & Failover Workflow

```mermaid
sequenceDiagram
    autonumber
    participant UI as Frontend Client
    participant Service as AIService Layer
    participant CB as ContextBuilder
    participant Primary as GeminiProvider
    participant Fallback as GroqProvider
    participant Val as AIResponseValidator
    participant DB as MongoDB

    UI->>Service: POST /api/v1/ai/business-strategy
    Service->>CB: build_startup_context(startup, reports, Q&A)
    CB->>DB: Query Startup Context
    DB-->>CB: Startup Context Data
    CB-->>Service: Formatted Strategy Prompt Context
    
    alt Primary Provider (Gemini 2.5 Flash) Success
        Service->>Primary: generate_structured_json(prompt, system_role)
        Primary-->>Service: Raw Structured Response
    else Primary Provider Timeout / 4xx / 5xx Failure
        Service->>Fallback: generate_structured_json(prompt, system_role)
        Fallback-->>Service: Fallback Response (Groq Llama 3.3)
    end

    Service->>Val: parse_and_repair_json(raw_response)
    Val-->>Service: Clean Validated JSON Data
    Service->>DB: Save Versioned Report (v1, v2...)
    Service->>DB: Log Activity Event
    Service-->>UI: Return Versioned Report Response Model
```

---

## 3. Multi-Tenant Workspace Security Architecture

```mermaid
graph LR
    Req["Incoming HTTP Request"] --> HeaderCheck{"Contains Authorization & X-Startup-ID?"}
    HeaderCheck -- No --> Deny1["401 Unauthorized / 404 Not Found"]
    HeaderCheck -- Yes --> JWTCheck{"Valid JWT Token?"}
    JWTCheck -- No --> Deny2["401 Unauthorized"]
    JWTCheck -- Yes --> OwnerCheck{"startup.owner_id == user.id?"}
    OwnerCheck -- No --> Deny3["404 Startup Not Found (Access Denied)"]
    OwnerCheck -- Yes --> Allow["Execute Business Logic for Workspace"]
```

---

## 4. Database Collection Schema & Relationships

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     Users       │1     *│    Startups     │1     *│   AI_Reports    │
├─────────────────┤───────├─────────────────┤───────├─────────────────┤
│ _id (ObjectId)  │       │ _id (ObjectId)  │       │ _id (ObjectId)  │
│ email           │       │ owner_id (Ref)  │       │ startup_id(Ref) │
│ full_name       │       │ name            │       │ report_type     │
│ role            │       │ industry        │       │ version (v1..)  │
│ preferences     │       │ stage           │       │ content (JSON)  │
└─────────────────┘       └─────────────────┘       └─────────────────┘
                                   │1
                                   │
                                   │*
                          ┌─────────────────┐
                          │  Conversations  │
                          ├─────────────────┤
                          │ _id (ObjectId)  │
                          │ startup_id(Ref) │
                          │ title           │
                          │ messages[]      │
                          └─────────────────┘
```
