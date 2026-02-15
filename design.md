# Design

## 1. Solution Overview
Shiksha Saathi uses a role-based Angular frontend and Node/Express backend with AI-assisted evaluation and tutoring. Data is persisted in SQLite (migratable to PostgreSQL).

## 2. High-Level Architecture
- Frontend: Angular SPA
- Backend: Express APIs
- Data: SQLite (`users`, `students`, `attempts`, `book_catalog`, etc.)
- AI:
  - Tutor engine (`/student/ask`)
  - Remedial evaluator (`/asr/attempts`)
- Content:
  - Local `/library/*` static files
  - External hosted PDF URLs via admin import

## 3. Core Components

### 3.1 Auth & Access
- Token-based authentication.
- Strict role guards:
  - Student-only access for student learning APIs and student library route.

### 3.2 Assessment Pipeline
1. Student submits ASR/text answer.
2. Heuristic analysis computes baseline content/language scores.
3. AI remedial evaluator produces rating/mastery/guidance/prep plan.
4. Attempt and feedback returned to UI; data stored for analytics.

### 3.3 Teacher Analytics
- Aggregate attempts by class/section.
- Detect misconception hotspots.
- Generate worksheet recommendations.

### 3.4 Multi-Grade Planning Layer
- Inputs: teacher count, student count, grade mix, risk profile.
- Outputs:
  - Ratio severity status
  - Group rotation plan (high/medium/low risk)
  - Session prioritization suggestions

### 3.5 Library & Content Delivery
- Catalog entries keyed by board/grade/subject.
- PDF URLs may be local or external.
- Admin API supports replace/append import modes.

## 4. Data Model (Key Entities)
- `users` (admin/teacher)
- `student_accounts`
- `classes`, `sections`, `students`
- `attempts`
- `book_catalog`
- `sync_events`

## 5. AI Design
- Primary mode: LLM-backed answer generation/evaluation.
- Fallback mode: deterministic heuristic outputs for continuity.
- Transparency: return `provider` and `model` metadata to UI.

## 6. API Design Principles
- Role-gated endpoints.
- Predictable JSON responses.
- Safe defaults and explicit error responses.
- Separation of admin, teacher, and student capabilities.

## 7. Scalability Path
- Move SQLite to PostgreSQL.
- Add queue/worker for async analytics and AI jobs.
- Add caching for repetitive tutor prompts.
- Add observability for usage, latency, and quality metrics.

## 8. Security Considerations
- API keys only on server env.
- No direct client-side AI key exposure.
- Principle of least privilege on all routes.

## 9. Deployment Notes
- Frontend and backend run independently.
- Angular dev proxy forwards `/api` and `/library` to backend.
- Production can use reverse proxy with TLS and CDN for PDFs.
