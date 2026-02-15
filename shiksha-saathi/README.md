# Shiksha Saathi

Voice-first remedial platform for rural classrooms with ASR ingestion, gap intelligence, and teacher/admin operations.

## Frontend options

### Angular frontend (recommended)

Modern Angular app with route-based pages:

- `/login` : dedicated login page
- `/dashboard` : post-login overview dashboard
- `/student-test` : ASR test/capture page
- `/student-library` : Bihar board books (class + subject filters), PDF reading, AI doubt solver
- `/teacher-dashboard` : class/section insights + worksheet generation
- `/admin-dashboard` : teacher/class/section/student management + student credentials visibility

The Angular dev server uses a proxy (`/api -> http://localhost:4000`) so the app does not need a Python static server.
It also includes runtime UI preferences:
- `Light/Dark` mode toggle
- `English/Hindi` language switch for interface labels and actions

### Legacy frontend

The previous vanilla JS SPA remains in `frontend/` and can still be served as static files if needed.

## Implemented backend upgrades

1. ASR + local language scoring
- Student app captures voice via browser SpeechRecognition API.
- Backend endpoint `POST /asr/attempts` evaluates transcript quality by:
  - concept keyword coverage (`contentScore`)
  - local language fluency hints (`languageScore`)
- AI remedial evaluator then returns:
  - `rating` (0-100)
  - `mastery` level (`advanced|proficient|developing|needs_support`)
  - personalized `guidance` + `prepPlan`
- Attempt correctness is inferred from transcript scores and stored for analytics.

2. SQLite persistence (replacing in-memory data)
- Uses Node's `node:sqlite` via `backend/src/db.js`.
- Data persists in `backend/data/shiksha.sqlite`.
- Tables: `users`, `student_accounts`, `classes`, `sections`, `students`, `attempts`, `sync_events`, `book_catalog`.

3. Teacher/admin auth + class/section management
- Token-based auth (`/auth/login`) with role checks.
- Admin APIs:
  - `GET /admin/teachers`
  - `GET /admin/student-accounts`
  - `POST /admin/classes`
  - `POST /admin/classes/:classId/sections`
  - `POST /admin/sections/:sectionId/students`
- Teacher/Admin APIs:
  - `GET /teacher/classes`
  - `GET /teacher/classes/:classId/sections`
  - `GET /teacher/classes/:classId/misconceptions`
  - `GET /teacher/sections/:sectionId/misconceptions`
  - `POST /teacher/classes/:classId/worksheet`

4. Student login + library + AI tutor
- Student login supported through `POST /auth/login` with `roleHint: "student"`.
- Student APIs:
  - `GET /student/books?board=bihar-board&grade=4&subject=math`
  - `POST /student/ask` (question + selected book)
- Admin import API for hosted book links:
  - `POST /admin/books/import`
- If `OPENAI_API_KEY` is set, `/student/ask` uses a real LLM response; otherwise it falls back to local tutor logic.
- PDFs are served through static path `/library/*` from `backend/library/`.

## Default seeded users

- Admin: `admin@shiksha.local` / `admin123`
- Teacher: `teacher@shiksha.local` / `teacher123`
- Student: `rekha` / `student123`

## Admin flow highlights

- Admin can create teacher accounts from `/admin-dashboard`.
- Admin can create student entries (and student login credentials are auto-generated).
- Student login credentials can be reviewed in admin dashboard under student credentials list.

## Dashboard role behavior

- Shared for all roles: profile + quick actions.
- Student-specific: library-focused cards and personal risk/attempt summary.
- Teacher/Admin-specific: analytics overview with students/attempts/voice/offline shares.

## Run

### Backend
```bash
cd backend
npm run start
```

Place book PDFs using the documented structure in:
- `backend/library/README.md`

Optional AI env vars:
- `OPENAI_API_KEY` : required for live AI answers
- `OPENAI_MODEL` : optional, defaults to `gpt-4o-mini`
- `OPENAI_BASE_URL` : optional override for compatible gateway
- Same env vars are used by both:
  - `/student/ask` (book Q&A)
  - `/asr/attempts` (AI remedial rating/guidance)

## Using externally hosted PDFs

You can host PDFs on any public URL (S3, R2, Drive-direct links, CDN) and import them:

```bash
curl -X POST http://localhost:4000/admin/books/import \
  -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "board": "bihar-board",
    "mode": "replace",
    "books": [
      {
        "grade": 4,
        "subject": "science",
        "title": "Bihar Board Class 4 Science",
        "language": "en",
        "pdfUrl": "https://your-cdn.example.com/bihar/class-4/science.pdf"
      },
      {
        "grade": 4,
        "subject": "math",
        "title": "Bihar Board Class 4 Mathematics",
        "language": "en",
        "pdfUrl": "https://your-cdn.example.com/bihar/class-4/math.pdf"
      }
    ]
  }'
```

Mode options:
- `replace`: removes existing books for the board and inserts new list.
- `append`: keeps existing and adds new entries.

Dev note:
- Angular proxy now forwards both `/api/*` and `/library/*` to backend.

### Frontend (Angular)
```bash
cd ../frontend-angular
npm install
npm run dev
```

Open:
- `http://localhost:4200/login`

### Frontend (legacy vanilla SPA)
```bash
cd ../frontend
python3 -m http.server 8080
```

## Key backend files

- `backend/src/server.js`: API routes and role-gated workflows.
- `backend/src/db.js`: SQLite schema, seed data, and repository functions.
- `backend/src/asrEngine.js`: transcript evaluation and local language scoring.
- `backend/src/auth.js`: password hashing + signed token auth.
- `backend/src/remedialEngine.js`: student/class misconception intelligence.

## Notes

- `node:sqlite` is experimental in Node 22 but functional for this MVP.
- For production, migrate token auth to JWT with key rotation and add audit logs.
