# 4. Architecture Diagram of the Proposed Solution

## 4.1 Logical Architecture

```mermaid
flowchart TB
  subgraph Client Layer
    A1[Student Web App]
    A2[Teacher Web App]
    A3[Admin Web App]
  end

  subgraph Application Layer
    B1[Auth & Role Service]
    B2[ASR Attempt API]
    B3[AI Remedial Engine]
    B4[AI Tutor Engine]
    B5[Classroom Analytics Engine]
    B6[Library API]
  end

  subgraph Data Layer
    C1[(SQLite / Relational DB)]
    C2[(Book Catalog)]
    C3[(Attempt History)]
  end

  subgraph External Services
    D1[LLM API Provider]
    D2[PDF Hosting / CDN / S3]
  end

  A1 --> B1
  A2 --> B1
  A3 --> B1

  A1 --> B2
  B2 --> B3
  B3 --> D1
  B3 --> C3

  A1 --> B4
  B4 --> D1

  A2 --> B5
  B5 --> C1
  B5 --> C3

  A1 --> B6
  A2 --> B6
  B6 --> C2
  B6 --> D2

  B1 --> C1
  B2 --> C1
  B4 --> C1
```

## 4.2 Key Architectural Characteristics

- Modular API services for auth, attempts, AI, analytics, and library
- Graceful fallback from AI to heuristic evaluation
- Works with hosted PDFs or local storage
- Supports role-aware UI and data access control

## 4.3 Security & Privacy Notes

- Token-based role access (`admin`, `teacher`, `student`)
- Student data isolation in endpoints
- API key kept server-side via environment variables
