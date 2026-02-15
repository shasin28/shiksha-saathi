import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./auth.js";

const dbFile = process.env.DB_FILE || path.resolve(process.cwd(), "data", "shiksha.sqlite");
fs.mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new DatabaseSync(dbFile);
db.exec("PRAGMA foreign_keys = ON");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','teacher')),
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      grade INTEGER NOT NULL,
      name TEXT NOT NULL,
      teacher_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(teacher_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade INTEGER NOT NULL,
      language TEXT NOT NULL,
      class_id TEXT NOT NULL,
      section_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY(section_id) REFERENCES sections(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL,
      concept TEXT NOT NULL,
      correct INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      mode TEXT NOT NULL,
      offline INTEGER NOT NULL,
      transcript TEXT,
      content_score REAL,
      language_score REAL,
      timestamp INTEGER NOT NULL,
      FOREIGN KEY(student_id) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS sync_events (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      received_at INTEGER NOT NULL
    );
  `);

  seedIfEmpty();
}

function seedIfEmpty() {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (userCount > 0) return;

  const now = Date.now();
  const adminId = randomUUID();
  const teacherId = randomUUID();
  const classId = randomUUID();
  const sectionA = randomUUID();
  const sectionB = randomUUID();

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(adminId, "Admin User", "admin@shiksha.local", hashPassword("admin123"), "admin", now);

  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(teacherId, "Teacher Kavita", "teacher@shiksha.local", hashPassword("teacher123"), "teacher", now);

  db.prepare(
    `INSERT INTO classes (id, grade, name, teacher_id, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(classId, 4, "Grade 4 Foundation", teacherId, now);

  db.prepare("INSERT INTO sections (id, class_id, name, created_at) VALUES (?, ?, ?, ?)").run(
    sectionA,
    classId,
    "A",
    now
  );
  db.prepare("INSERT INTO sections (id, class_id, name, created_at) VALUES (?, ?, ?, ?)").run(
    sectionB,
    classId,
    "B",
    now
  );

  const students = [
    { id: "s1", name: "Rekha", grade: 4, language: "hi", sectionId: sectionA },
    { id: "s2", name: "Aman", grade: 4, language: "hi", sectionId: sectionA },
    { id: "s3", name: "Kiran", grade: 4, language: "mr", sectionId: sectionB }
  ];

  const insertStudent = db.prepare(
    `INSERT INTO students (id, name, grade, language, class_id, section_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  for (const student of students) {
    insertStudent.run(
      student.id,
      student.name,
      student.grade,
      student.language,
      classId,
      student.sectionId,
      now
    );
  }

  const insertAttempt = db.prepare(
    `INSERT INTO attempts
      (id, student_id, concept, correct, latency_ms, mode, offline, transcript, content_score, language_score, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  insertAttempt.run(randomUUID(), "s1", "division", 0, 11300, "voice_asr", 0, "24 ko 6 se bhaag", 0.7, 0.8, now - 86400000);
  insertAttempt.run(randomUUID(), "s1", "multiplication", 1, 6200, "voice_asr", 0, "7 guna 8", 0.75, 0.8, now - 85400000);
  insertAttempt.run(randomUUID(), "s2", "division", 0, 14100, "voice_asr", 1, "divide step unclear", 0.2, 0.4, now - 76400000);
  insertAttempt.run(randomUUID(), "s3", "fractions", 0, 15900, "voice_asr", 1, "half quarter", 0.3, 0.5, now - 66400000);
}

export function createUser({ name, email, passwordHash, role }) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, name, email, passwordHash, role, Date.now());
  return getUserById(id);
}

export function getUserByEmail(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export function getUserById(id) {
  return db.prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?").get(id);
}

export function getUserWithPassword(email) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email);
}

export function listUsersByRole(role) {
  return db
    .prepare("SELECT id, name, email, role, created_at FROM users WHERE role = ? ORDER BY name")
    .all(role);
}

export function createClass({ grade, name, teacherId }) {
  const id = randomUUID();
  db.prepare("INSERT INTO classes (id, grade, name, teacher_id, created_at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    grade,
    name,
    teacherId,
    Date.now()
  );
  return db.prepare("SELECT * FROM classes WHERE id = ?").get(id);
}

export function listClassesForUser(user) {
  if (user.role === "admin") {
    return db.prepare("SELECT * FROM classes ORDER BY grade, name").all();
  }
  return db.prepare("SELECT * FROM classes WHERE teacher_id = ? ORDER BY grade, name").all(user.id);
}

export function getClassById(classId) {
  return db.prepare("SELECT * FROM classes WHERE id = ?").get(classId);
}

export function createSection({ classId, name }) {
  const id = randomUUID();
  db.prepare("INSERT INTO sections (id, class_id, name, created_at) VALUES (?, ?, ?, ?)").run(
    id,
    classId,
    name,
    Date.now()
  );
  return db.prepare("SELECT * FROM sections WHERE id = ?").get(id);
}

export function listSectionsByClass(classId) {
  return db.prepare("SELECT * FROM sections WHERE class_id = ? ORDER BY name").all(classId);
}

export function createStudent({ name, grade, language, classId, sectionId }) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO students (id, name, grade, language, class_id, section_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, name, grade, language, classId, sectionId, Date.now());
  return getStudentById(id);
}

export function listStudentsBySection(sectionId) {
  return db.prepare("SELECT * FROM students WHERE section_id = ? ORDER BY name").all(sectionId);
}

export function listStudentsByClass(classId) {
  return db.prepare("SELECT * FROM students WHERE class_id = ? ORDER BY name").all(classId);
}

export function listStudents() {
  return db.prepare("SELECT * FROM students ORDER BY name").all();
}

export function getStudentById(studentId) {
  return db.prepare("SELECT * FROM students WHERE id = ?").get(studentId);
}

export function createAttempt({
  studentId,
  concept,
  correct,
  latencyMs,
  mode,
  offline,
  transcript = null,
  contentScore = null,
  languageScore = null,
  timestamp = Date.now()
}) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO attempts
      (id, student_id, concept, correct, latency_ms, mode, offline, transcript, content_score, language_score, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    studentId,
    concept,
    correct ? 1 : 0,
    latencyMs,
    mode,
    offline ? 1 : 0,
    transcript,
    contentScore,
    languageScore,
    timestamp
  );
  return db.prepare("SELECT * FROM attempts WHERE id = ?").get(id);
}

export function listAttemptsByStudent(studentId) {
  return db.prepare("SELECT * FROM attempts WHERE student_id = ? ORDER BY timestamp DESC").all(studentId);
}

export function listAttemptsByClass(classId) {
  return db
    .prepare(
      `SELECT a.*
       FROM attempts a
       JOIN students s ON s.id = a.student_id
       WHERE s.class_id = ?
       ORDER BY a.timestamp DESC`
    )
    .all(classId);
}

export function listAttemptsBySection(sectionId) {
  return db
    .prepare(
      `SELECT a.*
       FROM attempts a
       JOIN students s ON s.id = a.student_id
       WHERE s.section_id = ?
       ORDER BY a.timestamp DESC`
    )
    .all(sectionId);
}

export function addSyncEvents(deviceId, events) {
  const stmt = db.prepare(
    `INSERT INTO sync_events (id, device_id, type, payload_json, received_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  const now = Date.now();
  for (const event of events) {
    stmt.run(randomUUID(), deviceId, event.type || "unknown", JSON.stringify(event.payload || {}), now);
  }
  return events.length;
}

export function listSyncEvents(limit = 100) {
  return db
    .prepare("SELECT * FROM sync_events ORDER BY received_at DESC LIMIT ?")
    .all(limit)
    .map((row) => ({ ...row, payload: JSON.parse(row.payload_json) }));
}

export function getOverviewStats() {
  const totalStudents = db.prepare("SELECT COUNT(*) as count FROM students").get().count;
  const totalAttempts = db.prepare("SELECT COUNT(*) as count FROM attempts").get().count;
  const voiceCount = db
    .prepare("SELECT COUNT(*) as count FROM attempts WHERE mode LIKE 'voice%'")
    .get().count;
  const offlineCount = db.prepare("SELECT COUNT(*) as count FROM attempts WHERE offline = 1").get().count;

  return {
    totalStudents,
    totalAttempts,
    voiceShare: totalAttempts ? voiceCount / totalAttempts : 0,
    offlineShare: totalAttempts ? offlineCount / totalAttempts : 0
  };
}
