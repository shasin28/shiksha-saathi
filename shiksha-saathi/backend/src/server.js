import express from "express";
import cors from "cors";
import path from "node:path";
import { createToken, authRequired, hashPassword, requireRole, verifyPassword } from "./auth.js";
import { evaluateTranscript } from "./asrEngine.js";
import {
  addSyncEvents,
  createStudentAccount,
  createAttempt,
  createClass,
  createSection,
  createStudent,
  createUser,
  getBookById,
  getClassById,
  getOverviewStats,
  getStudentAccountByStudentId,
  getStudentAccountWithPassword,
  getStudentById,
  getUserByEmail,
  getUserById,
  getUserWithPassword,
  listBooks,
  initDb,
  listAttemptsByClass,
  listAttemptsBySection,
  listAttemptsByStudent,
  appendBooks,
  listClassesForUser,
  listSectionsByClass,
  listStudents,
  listStudentsBySection,
  listStudentAccounts,
  listSyncEvents,
  replaceBooksForBoard,
  studentUsernameExists,
  listUsersByRole
} from "./db.js";
import { detectMisconceptions, detectStudentGaps } from "./remedialEngine.js";
import { generateAiTutorAnswer } from "./aiTutor.js";
import { generateAiRemedialFeedback, generateFallbackRemedialFeedback } from "./aiRemedial.js";
import { generateTutorAnswer } from "./tutorEngine.js";
import { generateWorksheet } from "./worksheetGenerator.js";

initDb();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/library", express.static(path.resolve(process.cwd(), "library")));

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
  const { email, password, roleHint = "teacher" } = req.body;
  if (!email || !password) return res.status(400).json({ error: "email and password required" });
  const identifier = String(email).trim();
  const passwordCandidates = Array.from(
    new Set([String(password), String(password).trim(), String(password).replace(/\s+/g, "")])
  );

  const tryStudentLogin = () => {
    const studentAccount = getStudentAccountWithPassword(identifier);
    if (!studentAccount) return null;
    const valid = passwordCandidates.some((candidate) => verifyPassword(candidate, studentAccount.password_hash));
    if (!valid) return null;

    const student = getStudentById(studentAccount.student_id);
    if (!student) return null;

    const safeStudent = {
      id: student.id,
      name: student.name,
      role: "student",
      grade: student.grade,
      classId: student.class_id,
      sectionId: student.section_id,
      language: student.language,
      username: studentAccount.username
    };
    const token = createToken({
      id: student.id,
      role: "student",
      username: studentAccount.username,
      name: student.name,
      grade: student.grade
    });
    return { token, user: safeStudent };
  };

  if (roleHint === "student") {
    const studentLogin = tryStudentLogin();
    if (!studentLogin) {
      return res.status(401).json({ error: "invalid credentials" });
    }
    return res.json(studentLogin);
  }

  const user = getUserWithPassword(identifier);
  const validTeacherOrAdmin =
    !!user && passwordCandidates.some((candidate) => verifyPassword(candidate, user.password_hash));
  if (!validTeacherOrAdmin) return res.status(401).json({ error: "invalid credentials" });

  const safeUser = getUserById(user.id);
  const token = createToken({ id: user.id, role: user.role, email: user.email, name: user.name });
  return res.json({ token, user: safeUser });
});

app.get("/auth/me", authRequired, (req, res) => {
  if (req.user.role === "student") {
    const student = getStudentById(req.user.id);
    if (!student) return res.status(404).json({ error: "student not found" });
    return res.json({
      id: student.id,
      name: student.name,
      role: "student",
      grade: student.grade,
      classId: student.class_id,
      sectionId: student.section_id,
      language: student.language
    });
  }

  const user = getUserById(req.user.id);
  return res.json(user);
});

app.get("/students", authRequired, (req, res) => {
  if (req.user.role === "student") {
    const student = getStudentById(req.user.id);
    if (!student) return res.status(404).json({ error: "student not found" });
    return res.json([student]);
  }

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

app.post("/asr/attempts", async (req, res) => {
  const { studentId, concept, latencyMs, transcript, language = "en", offline = false } = req.body;
  if (!studentId || !concept || !latencyMs || !transcript) {
    return res.status(400).json({ error: "studentId, concept, latencyMs, transcript are required" });
  }

  const student = getStudentById(studentId);
  if (!student) return res.status(404).json({ error: "student not found" });

  const asr = evaluateTranscript({ transcript, concept, language });
  const aiRemedial =
    (await generateAiRemedialFeedback({
      transcript: asr.transcript,
      concept,
      language,
      grade: student.grade,
      latencyMs: Number(latencyMs),
      heuristic: {
        contentScore: asr.contentScore,
        languageScore: asr.languageScore
      }
    })) ||
    generateFallbackRemedialFeedback({
      concept,
      language,
      latencyMs: Number(latencyMs),
      heuristic: {
        contentScore: asr.contentScore,
        languageScore: asr.languageScore
      }
    });

  asr.feedback = aiRemedial.guidance;
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

  return res.status(201).json({ attempt, asr, remedial: aiRemedial });
});

app.get("/students/:studentId/gaps", authRequired, (req, res) => {
  const student = getStudentById(req.params.studentId);
  if (!student) return res.status(404).json({ error: "student not found" });
  if (req.user.role === "student" && req.user.id !== req.params.studentId) {
    return res.status(403).json({ error: "forbidden" });
  }

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

app.get("/admin/student-accounts", authRequired, requireRole("admin"), (_req, res) => {
  return res.json(listStudentAccounts());
});

app.post("/admin/books/import", authRequired, requireRole("admin"), (req, res) => {
  const { board = "bihar-board", mode = "replace", books } = req.body || {};
  if (!Array.isArray(books) || books.length === 0) {
    return res.status(400).json({ error: "books[] is required" });
  }

  const invalid = books.find(
    (book) =>
      !book ||
      !book.grade ||
      !book.subject ||
      !book.title ||
      !book.pdfUrl ||
      typeof book.pdfUrl !== "string"
  );
  if (invalid) {
    return res
      .status(400)
      .json({ error: "each book requires: grade, subject, title, pdfUrl; optional: language, board" });
  }

  if (mode === "replace") {
    const rows = replaceBooksForBoard(board, books);
    return res.json({ mode, board, total: rows.length, books: rows });
  }

  const added = appendBooks(books.map((book) => ({ ...book, board: book.board || board })));
  return res.json({ mode: "append", board, added });
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
  let account = getStudentAccountByStudentId(student.id);
  if (!account) {
    const usernameBase = name.toLowerCase().replace(/[^a-z0-9]/g, "") || `student${student.id.slice(0, 4)}`;
    let username = usernameBase;
    let suffix = 1;
    while (studentUsernameExists(username)) {
      suffix += 1;
      username = `${usernameBase}${suffix}`;
    }
    account = createStudentAccount({ studentId: student.id, username, passwordHash: hashPassword("student123") });
  }
  return res.status(201).json({
    student,
    credentials: account
      ? { username: account.username, temporaryPassword: "student123", mustResetPassword: true }
      : null
  });
});

app.get("/student/books", authRequired, requireRole("student"), (req, res) => {
  const grade =
    req.query.grade != null && req.query.grade !== "" ? Number.parseInt(String(req.query.grade), 10) : null;
  const subject = req.query.subject ? String(req.query.subject) : null;
  const board = req.query.board ? String(req.query.board) : "bihar-board";
  const books = listBooks({ board, grade: Number.isNaN(grade) ? null : grade, subject });
  return res.json({ board, grade: Number.isNaN(grade) ? null : grade, subject, books });
});

app.post("/student/ask", authRequired, requireRole("student"), async (req, res) => {
  const { question, bookId, language = "en" } = req.body;
  if (!question || !bookId) {
    return res.status(400).json({ error: "question and bookId are required" });
  }

  const book = getBookById(bookId);
  if (!book) return res.status(404).json({ error: "book not found" });
  const normalizedLanguage = language === "hi" ? "hi" : "en";
  const aiTutor = await generateAiTutorAnswer({
    question,
    subject: book.subject,
    grade: book.grade,
    language: normalizedLanguage,
    bookTitle: book.title
  });
  const tutor =
    aiTutor ||
    generateTutorAnswer({
      question,
      subject: book.subject,
      grade: book.grade,
      language: normalizedLanguage,
      bookTitle: book.title
    });
  return res.json({ ...tutor, book });
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
