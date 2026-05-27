# Implementation Plan - Backend Service Migration with Hybrid Frontend-Only Fallback

This implementation plan outlines the architectural design and step-by-step migration path to introduce a powerful Java Spring Boot & PostgreSQL backend (via Docker Compose) while strictly retaining the existing frontend-only offline capabilities as a robust fallback.

## User Review Decisions

> [!IMPORTANT]
> - **Java Version**: Compiled and run under **Java 25** (utilizing Virtual Threads, record types, and pattern matching).
> - **Spring Boot**: Using the latest stable version (Spring Boot **3.4.5**).
> - **Data Syncing**: Included a **one-click "Import Local Data to Cloud" button** in Settings to seamlessly transfer local resumes and trackers to the Postgres DB.
> - **Authentication**: Native user registration and login forms integrated directly into the `Settings` modal.
> - **Zero-Risk Hybrid Fallback**: The React application will dynamically detect the backend's presence. If the backend is running and the user is logged in, operations (resumes, history versions, tracker) will sync with the database. If the backend is offline or the user is logged out, the app will gracefully degrade to use `localStorage` exactly as it does today.

## Proposed Architecture

```mermaid
flowchart TD
    A[React App] --> B{Backend Reachable & Token Valid?}
    B -->|Yes| C[Cloud Mode]
    B -->|No| D[Local Mode (localStorage Fallback)]
    
    subgraph Cloud Mode
        C --> C1[Fetch Resumes from DB]
        C --> C2[Fetch Tracker from DB]
        C --> C3[Proxy AI calls via AI Gateway]
    end
    
    subgraph Local Mode
        D --> D1[Load Resumes from localStorage]
        D --> D2[Load Tracker from localStorage]
        D --> D3[Call Gemini API directly from browser]
    end
    
    subgraph Spring Boot Backend
        C1 --> E[Resume Controller]
        C2 --> F[Application Controller]
        C3 --> G[AI Gateway / LlmController]
        
        E --> H[(PostgreSQL JSONB)]
        F --> H
        G --> I{User Key or Global Key?}
    end
```

---

## Proposed Changes

We will introduce a Spring Boot backend under a new `backend` directory and modify the React frontend.

### Component 1: Spring Boot Backend

#### [NEW] [pom.xml](file:///c:/DATA/Code/ResumeBuilder/backend/pom.xml)
- Set up Spring Boot 3.4.5 / Java 25 configuration.
- Dependencies: `spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `postgresql` (for JSONB queries), `jjwt` (for JWT), `jackson-databind` (for JSONB serialization).

#### [NEW] [application.yml](file:///c:/DATA/Code/ResumeBuilder/backend/src/main/resources/application.yml)
- Configure Spring profiles, datasources, JPA properties, security constants, and global Gemini API key.
- Enable virtual threads using `spring.threads.virtual.enabled=true`.

#### [NEW] [Entities](file:///c:/DATA/Code/ResumeBuilder/backend/src/main/java/com/resumebuilder/entity/)
- `User.java`: Stores email, role, and crypted passwords (`BCrypt`).
- `Resume.java`: Main CV metadata table.
- `ResumeVersion.java`: Contains full resume JSON structures in a PostgreSQL `JSONB` column.
- `JobApplication.java` & `InterviewStep.java`: Track candidates' application pipelines.
- `UserApiKey.java`: Encrypts/decrypts user-provided API keys (AES-256-GCM) with a master key.
- `UserTokensQuota.java`: Token balance tracking.

#### [NEW] [Controllers & Security](file:///c:/DATA/Code/ResumeBuilder/backend/src/main/java/com/resumebuilder/controller/)
- `AuthController.java`: Registers and signs in users, returns JWT.
- `HealthController.java`: A fast `/api/health` endpoint for frontend auto-reachability diagnostics.
- `ResumeController.java` & `ApplicationController.java`: CRUD endpoints for resumes, versions, and tracking items.
- `LlmController.java`: Proxies LLM requests, applying symmetric decryption if a user-supplied key is present.
- `SecurityConfig.java` & `JwtFilter.java`: Protects `/api/**` with stateless JWT authorization while allowing CORS and public health checks.

#### [NEW] [Dockerfile](file:///c:/DATA/Code/ResumeBuilder/backend/Dockerfile) & [docker-compose.yml](file:///c:/DATA/Code/ResumeBuilder/docker-compose.yml)
- Multi-stage JRE Alpine runner optimized for performance (Java 25).
- Orchestrates Spring Boot and PostgreSQL Alpine containers in a secure bridge network.

---

### Component 2: Frontend API Layer & Integration

#### [NEW] [apiService.ts](file:///c:/DATA/Code/ResumeBuilder/src/utils/apiService.ts)
- Connects to the Spring Boot REST API.
- Implements automatic server reachability checking (`/api/health`) and token validation.
- Standardizes CRUD calls for resumes, history, and applications, with dynamic JWT headers.
- Proxies AI calls (translation, ATS optimizer) through the backend gateway if connected.

#### [MODIFY] [SettingsModal.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Form/SettingsModal.tsx)
- Embed a new **"Backend Cloud Connection"** control panel.
- Provides forms to register a new account or log in.
- Shows current connection state: **Connected (Cloud)** vs **Offline (Local Mode)**.
- If connected, includes an **"Import Local Data to Cloud"** button to bulk-upload their current history and tracking data from `localStorage` directly to the cloud database.

#### [MODIFY] [VersionManager.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Form/VersionManager.tsx)
- Connect with `apiService`.
- If server is connected and authenticated, save/load versions from the backend database.
- If server is offline, transparently read/write to `localStorage` exactly as before.

#### [MODIFY] [ApplicationTracker.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Tracker/ApplicationTracker.tsx) & [ApplicationDetail.tsx](file:///c:/DATA/Code/ResumeBuilder/src/components/Tracker/ApplicationDetail.tsx)
- Connect tracking updates and notes to the cloud database when connected.
- Maintain full offline `localStorage` fallback.

#### [MODIFY] [App.tsx](file:///c:/DATA/Code/ResumeBuilder/src/App.tsx)
- Perform a health check on mount to discover the backend server.
- Bind global resume data, history, and applications to use backend-synced states or local fallbacks based on connection status.

---

## Verification Plan

### Automated Tests
- Create unit tests for backend APIs using JUnit 5/Mockito.
- Run `npm run build` and `npm run test` to verify no regressions in the Vitest QA checkers.

### Manual Verification
1. **Server Detection**: Launch the backend via `docker-compose up`. The React frontend should automatically discover the backend and display "Connected (Offline / Not Logged In)".
2. **Account Creation**: Register and log in. The status should switch to "Connected (Cloud)".
3. **Data Migration**: Click "Import Local Data to Cloud" and verify all local versions and applications are written to PostgreSQL.
4. **Cloud Operations**: Add new CV versions and candidate trackers. Verify they are written in PostgreSQL (by inspecting container data) and persistent across browser cache clears.
5. **Offline Resiliency**: Stop the backend container. The application should gracefully fall back to local `localStorage` with zero data loss or application crashes.
