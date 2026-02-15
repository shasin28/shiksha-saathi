# 2. Features Offered by the Solution

## A. Role-based Platform

- Admin dashboard: create teachers, classes, sections, student entries
- Teacher dashboard: class/section misconception analytics, worksheet generation
- Student dashboard: book library, answer submission, AI tutoring support

## B. AI Remedial Intelligence

- AI rates each spoken answer with a score (0-100)
- Mastery bands: `advanced`, `proficient`, `developing`, `needs_support`
- Personalized guidance and short prep plan after every attempt
- Fallback evaluation logic when AI API is unavailable

## C. Teacher-Child Ratio & Multi-Grade Intelligence (Smart Layer)

Designed for scenarios where one teacher handles multiple classes together.

### Core metrics tracked
- Effective teacher-child ratio per time block
- Ratio severity:
  - Healthy: `<= 1:25`
  - Stretched: `1:26 - 1:40`
  - Critical: `> 1:40`
- Grade-mix factor (number of grades handled simultaneously)

### Smart outputs
- Auto-prioritized student groups by risk + grade
- Suggested session model:
  - `10 min` direct teacher focus group (high-risk)
  - `10 min` guided peer/practice group (medium-risk)
  - `10 min` reinforcement/self-practice group (low-risk)
- Rotational teaching plan for classes 2/3/4 together
- Teacher attention heatmap: who is not receiving enough support

## D. Curriculum Access

- Bihar board library by class and subject
- PDF reading inside app
- External PDF hosting support (CDN/S3/Drive links)

## E. Language & Accessibility

- English/Hindi UI toggle
- Local-language-friendly speech analysis
- Low-complexity screens for field use

## F. Connectivity Resilience

- Offline attempt queue
- Deferred sync when network resumes
- Works with unstable school internet
