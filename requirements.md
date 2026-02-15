# Requirements

## Project
Shiksha Saathi: AI-assisted remedial learning platform for admin, teacher, and student workflows.

## Problem Statement
Schools with limited teacher capacity, mixed-grade classrooms, and language diversity need faster student assessment and targeted remediation support.

## Goals
- Enable role-based operations for `admin`, `teacher`, and `student`.
- Deliver instant answer-level feedback and guidance.
- Support multi-grade teacher planning under high teacher-child ratio.
- Provide curriculum access (board/class/subject PDF library).

## Functional Requirements

### 1. Authentication & Roles
- Login required for all flows.
- Roles: `admin`, `teacher`, `student`.
- Student routes/APIs must be student-only.

### 2. Admin Flow
- Create teacher accounts.
- Create class, section, student entries.
- Auto-generate student credentials for created students.
- View student credential list.
- Import board book catalog with hosted PDF links.

### 3. Teacher Flow
- View classes and sections.
- View misconception analytics by class/section.
- Generate worksheets from identified gaps.
- Receive suggestions for mixed-grade remediation grouping.

### 4. Student Flow
- Student login with username/password.
- Browse board books by class and subject.
- Open PDF in-app and in new tab.
- Ask doubts and receive AI-generated answers.
- Submit voice/text answers and receive AI remedial feedback.

### 5. AI Remedial
For each answer attempt:
- Return score/rating (0-100).
- Return mastery level.
- Return personalized guidance and short preparation plan.
- Fallback to heuristic logic when AI API is unavailable.

### 6. Multi-Grade / Teacher-Child Ratio Intelligence
- Track effective teacher-child ratio.
- Flag stretched/critical classrooms.
- Produce rotation plan for high/medium/low risk groups.

### 7. Language & UX
- English/Hindi UI toggle.
- Support local-language response handling.
- Light and dark mode.

### 8. Offline/Low-Connectivity
- Queue attempts offline.
- Sync when network is restored.

## Non-Functional Requirements
- Role-based API authorization on all sensitive endpoints.
- Modular backend services for auth, AI, analytics, and content.
- Resilient behavior with safe fallback when AI provider fails.
- Mobile-friendly responsive frontend.

## External Dependencies
- LLM provider for AI tutor + remedial scoring.
- Optional external storage/CDN for hosted PDFs.

## Success Metrics
- Reduced remediation response time per student.
- Higher coverage of high-risk students per teacher session.
- Increased student attempt completion and reattempt rates.
