# Student PDF Library

Place board/class/subject PDFs here so the student library can render them in-app.

Expected path pattern used by default catalog:

- `backend/library/bihar-board/class-1/hindi.pdf`
- `backend/library/bihar-board/class-1/english.pdf`
- `backend/library/bihar-board/class-1/math.pdf`
- `backend/library/bihar-board/class-1/science.pdf`
- `backend/library/bihar-board/class-1/social-science.pdf`
- ... up to class-12

These files are served at runtime by backend static route:

- `/library/*`

Example browser URL:

- `http://localhost:4000/library/bihar-board/class-4/math.pdf`
