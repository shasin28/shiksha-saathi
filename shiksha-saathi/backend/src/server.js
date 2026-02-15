import express from "express";
import cors from "cors";
import { createToken, authRequired, hashPassword, requireRole, verifyPassword } from "./auth.js";
import { evaluateTranscript } from "./asrEngine.js";
import {
  addSyncEvents,
  createAttempt,
  createClass,
  createSection,
  createStudent,
  createUser,
  getClassById,
  getOverviewStats,
  getStudentById,
  getUserByEmail,
  getUserById,
  getUserWithPassword,
  initDb,
  listAttemptsByClass,
  listAttemptsBySection,
  listAttemptsByStudent,
  listClassesForUser,
  listSectionsByClass,
  listStudents,
  listStudentsBySection,
  listSyncEvents,
  listUsersByRole
} from "./db.js";
import { detectMisconceptions, detectStudentGaps } from "./remedialEngine.js";
import { generateWorksheet } from "./worksheetGenerator.js";

initDb();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "shiksha-saathi-backend", db: "sqlite" });
});

app.post("/auth/register", authRequired, requireRole("admin"), (req, res) => {
  const { name, email, password, role = "teacher" } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "name, email, password are required" });
  }
  if (!["teacher", "admin"].includes(role)) {
    return res.status(400).json({ error: "role must be teacher or admin" });
  }
  if (getUserByEmail(email)) {
    return res.status(409).json({ error: "email already registered" });
  }

  const user = createUser({ name, email, passwordHash: hashPassword(password), role });
  return res.status(201).json(user);
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  const user = getUserWithPassword(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const safeUser = getUserById(user.id);
  const token = createToken({ id: user.id, role: user.role, email: user.email, name: user.name });
  return res.json({ token, user: safeUser });
});

app.get("/auth/me", authRequired, (req, res) => {
  const user = getUserById(req.user.id);
  return res.json(user);
});

app.get("/students", authRequired, (req, res) => {
  if (req.user.role === "admin") return res.json(listStudents());

  const classes = listClassesForUser(req.user);
  const rows = classes.flatMap((cls) => listSectionsByClass(cls.id).flatMap((sec) => listStudentsBySection(sec.id)));
  return res.json(rows);
});

app.post("/attempts", (req, res) => {
  const { studentId, concept, correct, latencyMs, mode = "voice", offline = false } = req.body;
  if (!studentId || !concept || typeof correct !== "boolean" || !latencyMs) {
    return res.status(400).json({ error: "studentId, concept, correct and latencyMs are required" });
  }

  if (!getStudentById(studentId)) return res.status(404).json({ error: "student not found" });

  const attempt = createAttempt({
    studentId,
    concept,
    correct,
    latencyMs,
    mode,
    offline,
    transcript: null
  });

  return res.status(201).json(attempt);
});

app.post("/asr/attempts", (req, res) => {
  const { studentId, concept, latencyMs, transcript, language = "en", offline = false } = req.body;
  if (!studentId || !concept || !latencyMs || !transcript) {
    return res.status(400).json({ error: "studentId, concept, latencyMs, transcript are required" });
  }

  if (!getStudentById(studentId)) return res.status(404).json({ error: "student not found" });

  const asr = evaluateTranscript({ transcript, concept, language });
  const attempt = createAttempt({
    studentId,
    concept,
    correct: asr.inferredCorrect,
    latencyMs,
    mode: "voice_asr",
    offline,
    transcript: asr.transcript,
    contentScore: asr.contentScore,
    languageScore: asr.languageScore
  });

  return res.status(201).json({ attempt, asr });
});

app.get("/students/:studentId/gaps", authRequired, (req, res) => {
  const student = getStudentById(req.params.studentId);
  if (!student) return res.status(404).json({ error: "student not found" });

  const attempts = listAttemptsByStudent(req.params.studentId);
  const report = detectStudentGaps(req.params.studentId, attempts);
  return res.json({ student, report });
});

app.get("/teacher/classes", authRequired, requireRole("teacher", "admin"), (req, res) => {
  return res.json(listClassesForUser(req.user));
});

app.get("/teacher/classes/:classId/sections", authRequired, requireRole("teacher", "admin"), (req, res) => {
  const cls = getClassById(req.params.classId);
  if (!cls) return res.status(404).json({ error: "class not found" });
  if (req.user.role === "teacher" && cls.teacher_id !== req.user.id) {
    return res.status(403).json({ error: "forbidden" });
  }
  return res.json(listSectionsByClass(cls.id));
});

app.get(
  "/teacher/classes/:classId/misconceptions",
  authRequired,
  requireRole("teacher", "admin"),
  (req, res) => {
    const cls = getClassById(req.params.classId);
    if (!cls) return res.status(404).json({ error: "class not found" });
    if (req.user.role === "teacher" && cls.teacher_id !== req.user.id) {
      return res.status(403).json({ error: "forbidden" });
    }

    const attempts = listAttemptsByClass(cls.id);
    const misconceptionMap = detectMisconceptions(attempts);
    return res.json({ classId: cls.id, grade: cls.grade, misconceptionMap });
  }
);

app.post(
  "/teacher/classes/:classId/worksheet",
  authRequired,
  requireRole("teacher", "admin"),
  (req, res) => {
    const cls = getClassById(req.params.classId);
    if (!cls) return res.status(404).json({ error: "class not found" });
    if (req.user.role === "teacher" && cls.teacher_id !== req.user.id) {
      return res.status(403).json({ error: "forbidden" });
    }

    const attempts = listAttemptsByClass(cls.id);
    const misconceptionMap = detectMisconceptions(attempts);
    const worksheet = generateWorksheet({
      grade: cls.grade,
      misconceptionMap,
      language: req.body.language || "en"
    });

    return res.json({ classId: cls.id, worksheet });
  }
);

app.get(
  "/teacher/sections/:sectionId/students",
  authRequired,
  requireRole("teacher", "admin"),
  (req, res) => {
    return res.json(listStudentsBySection(req.params.sectionId));
  }
);

app.get(
  "/teacher/sections/:sectionId/misconceptions",
  authRequired,
  requireRole("teacher", "admin"),
  (req, res) => {
    const attempts = listAttemptsBySection(req.params.sectionId);
    const misconceptionMap = detectMisconceptions(attempts);
    return res.json({ sectionId: req.params.sectionId, misconceptionMap });
  }
);

app.post("/admin/classes", authRequired, requireRole("admin"), (req, res) => {
  const { grade, name, teacherId } = req.body;
  if (!grade || !name || !teacherId) {
    return res.status(400).json({ error: "grade, name, teacherId are required" });
  }

  const teacher = getUserById(teacherId);
  if (!teacher || teacher.role !== "teacher") {
    return res.status(400).json({ error: "teacherId must belong to teacher user" });
  }

  const cls = createClass({ grade, name, teacherId });
  return res.status(201).json(cls);
});

app.get("/admin/teachers", authRequired, requireRole("admin"), (_req, res) => {
  return res.json(listUsersByRole("teacher"));
});

app.post("/admin/classes/:classId/sections", authRequired, requireRole("admin"), (req, res) => {
  const cls = getClassById(req.params.classId);
  if (!cls) return res.status(404).json({ error: "class not found" });

  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "name is required" });

  const section = createSection({ classId: cls.id, name });
  return res.status(201).json(section);
});

app.post("/admin/sections/:sectionId/students", authRequired, requireRole("admin"), (req, res) => {
  const { name, grade, language = "en", classId } = req.body;
  const sectionId = req.params.sectionId;

  if (!name || !grade || !classId) {
    return res.status(400).json({ error: "name, grade, classId are required" });
  }

  const student = createStudent({ name, grade, language, classId, sectionId });
  return res.status(201).json(student);
});

app.post("/sync/events", (req, res) => {
  const { deviceId, events } = req.body;
  if (!deviceId || !Array.isArray(events)) {
    return res.status(400).json({ error: "deviceId and events[] are required" });
  }
  const acceptedCount = addSyncEvents(deviceId, events);
  return res.json({ deviceId, acceptedCount });
});

app.get("/sync/events", authRequired, requireRole("teacher", "admin"), (_req, res) => {
  const events = listSyncEvents(100);
  res.json({ total: events.length, events });
});

app.get("/analytics/overview", authRequired, requireRole("teacher", "admin"), (_req, res) => {
  res.json(getOverviewStats());
});

app.listen(port, () => {
  console.log(`Shiksha Saathi backend running on http://localhost:${port}`);
});
