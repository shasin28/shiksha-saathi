# Shiksha Saathi

Voice-first remedial platform for rural classrooms with ASR ingestion, gap intelligence, and teacher/admin operations.

## Frontend is now SPA with multiple routes

Run frontend once and use route-based pages:

- `#/login` : dedicated login page
- `#/dashboard` : post-login overview dashboard
- `#/student-test` : separate ASR test/capture page
- `#/teacher-dashboard` : class/section insights + worksheet generation
- `#/admin-dashboard` : class/section/student management

Example URL after serving frontend:
- `http://localhost:8080/index.html#/login`

Legacy pages redirect into SPA routes:
- `student.html` -> `#/student-test`
- `teacher.html` -> `#/teacher-dashboard`

## Implemented backend upgrades

1. ASR + local language scoring
- Student app captures voice via browser SpeechRecognition API.
- Backend endpoint `POST /asr/attempts` evaluates transcript quality by:
  - concept keyword coverage (`contentScore`)
  - local language fluency hints (`languageScore`)
- Attempt correctness is inferred from transcript scores and stored for analytics.

2. SQLite persistence (replacing in-memory data)
- Uses Node's `node:sqlite` via `backend/src/db.js`.
- Data persists in `backend/data/shiksha.sqlite`.
- Tables: `users`, `classes`, `sections`, `students`, `attempts`, `sync_events`.

3. Teacher/admin auth + class/section management
- Token-based auth (`/auth/login`) with role checks.
- Admin APIs:
  - `GET /admin/teachers`
  - `POST /admin/classes`
  - `POST /admin/classes/:classId/sections`
  - `POST /admin/sections/:sectionId/students`
- Teacher/Admin APIs:
  - `GET /teacher/classes`
  - `GET /teacher/classes/:classId/sections`
  - `GET /teacher/classes/:classId/misconceptions`
  - `GET /teacher/sections/:sectionId/misconceptions`
  - `POST /teacher/classes/:classId/worksheet`

## Default seeded users

- Admin: `admin@shiksha.local` / `admin123`
- Teacher: `teacher@shiksha.local` / `teacher123`

## Run

### Backend
```bash
cd backend
npm run start
```

### Frontend
```bash
cd ../frontend
python3 -m http.server 8080
```

Open:
- `http://localhost:8080/index.html#/login`

## Key backend files

- `backend/src/server.js`: API routes and role-gated workflows.
- `backend/src/db.js`: SQLite schema, seed data, and repository functions.
- `backend/src/asrEngine.js`: transcript evaluation and local language scoring.
- `backend/src/auth.js`: password hashing + signed token auth.
- `backend/src/remedialEngine.js`: student/class misconception intelligence.

## Notes

- `node:sqlite` is experimental in Node 22 but functional for this MVP.
- For production, migrate token auth to JWT with key rotation and add audit logs.
