# 6. Technologies & Estimated Implementation Cost

## 6.1 Technologies to Be Used

### Frontend
- Angular (role-based dashboards)
- Responsive web UI (desktop/mobile)

### Backend
- Node.js + Express API
- SQLite (dev) with easy migration path to PostgreSQL (prod)

### AI Layer
- LLM API integration for:
  - AI tutor Q&A
  - AI remedial scoring and prep guidance
- Heuristic fallback for high availability

### Data & Content
- Book catalog in DB
- PDF delivery via local storage or external hosting (S3/CDN/Cloud storage)

### DevOps / Deployment
- Dockerized backend/frontend (recommended)
- Cloud VM or container platform deployment
- Basic logging + API monitoring

## 6.2 Estimated Implementation Cost (Optional)

## MVP (8-12 weeks)
- Team:
  - 1 Full-stack engineer
  - 1 AI engineer (part-time)
  - 1 Product/QA support (part-time)
- Estimated range: INR 8L - 18L (or equivalent)

## Operational Cost (Monthly)
- Hosting & DB: INR 5k - 25k
- AI API usage: depends on volume (pilot schools may start INR 10k - 60k)
- Storage/CDN for PDFs: low-to-moderate depending on traffic

## Cost Optimization Levers
- Cache frequent AI guidance prompts
- Hybrid model: heuristic + AI only for critical responses
- Batch analytics jobs for teacher dashboards
