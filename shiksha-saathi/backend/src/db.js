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

    CREATE TABLE IF NOT EXISTS student_accounts (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(student_id) REFERENCES students(id) ON DELETE CASCADE
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

    CREATE TABLE IF NOT EXISTS book_catalog (
      id TEXT PRIMARY KEY,
      board TEXT NOT NULL,
      grade INTEGER NOT NULL,
      subject TEXT NOT NULL,
      title TEXT NOT NULL,
      language TEXT NOT NULL,
      pdf_url TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  seedIfEmpty();
}

function seedIfEmpty() {
  const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
  if (userCount > 0) {
    seedStudentAccountsIfMissing();
    seedBookCatalog(Date.now());
    return;
  }

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

  createSeedStudentAccounts(now);

  const insertAttempt = db.prepare(
    `INSERT INTO attempts
      (id, student_id, concept, correct, latency_ms, mode, offline, transcript, content_score, language_score, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  insertAttempt.run(randomUUID(), "s1", "division", 0, 11300, "voice_asr", 0, "24 ko 6 se bhaag", 0.7, 0.8, now - 86400000);
  insertAttempt.run(randomUUID(), "s1", "multiplication", 1, 6200, "voice_asr", 0, "7 guna 8", 0.75, 0.8, now - 85400000);
  insertAttempt.run(randomUUID(), "s2", "division", 0, 14100, "voice_asr", 1, "divide step unclear", 0.2, 0.4, now - 76400000);
  insertAttempt.run(randomUUID(), "s3", "fractions", 0, 15900, "voice_asr", 1, "half quarter", 0.3, 0.5, now - 66400000);

  seedBookCatalog(now);
}

function createSeedStudentAccounts(nowTs = Date.now()) {
  const insertStudentAccount = db.prepare(
    `INSERT INTO student_accounts (id, student_id, username, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?)`
  );
  insertStudentAccount.run(randomUUID(), "s1", "rekha", hashPassword("student123"), nowTs);
  insertStudentAccount.run(randomUUID(), "s2", "aman", hashPassword("student123"), nowTs);
  insertStudentAccount.run(randomUUID(), "s3", "kiran", hashPassword("student123"), nowTs);
}

function seedStudentAccountsIfMissing() {
  const students = db
    .prepare(
      `SELECT s.id, lower(replace(s.name, ' ', '')) as username_base
       FROM students s
       LEFT JOIN student_accounts sa ON sa.student_id = s.id
       WHERE sa.id IS NULL
       ORDER BY s.created_at`
    )
    .all();
  if (!students.length) return;

  const used = new Set();
  const insert = db.prepare(
    `INSERT INTO student_accounts (id, student_id, username, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?)`
  );

  for (const student of students) {
    let username = student.username_base || `student${student.id.slice(0, 4)}`;
    let suffix = 1;
    while (used.has(username) || db.prepare("SELECT 1 FROM student_accounts WHERE username = ?").get(username)) {
      suffix += 1;
      username = `${student.username_base}${suffix}`;
    }
    used.add(username);
    insert.run(randomUUID(), student.id, username, hashPassword("student123"), Date.now());
  }
}

function seedBookCatalog(nowTs = Date.now()) {
  const count = db.prepare("SELECT COUNT(*) as count FROM book_catalog").get().count;
  if (count > 0) return;

  const subjects = [
    { key: "hindi", title: "Hindi" },
    { key: "english", title: "English" },
    { key: "math", title: "Mathematics" },
    { key: "science", title: "Science" },
    { key: "social-science", title: "Social Science" }
  ];

  const insertBook = db.prepare(
    `INSERT INTO book_catalog (id, board, grade, subject, title, language, pdf_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  for (let grade = 1; grade <= 12; grade += 1) {
    for (const subject of subjects) {
      insertBook.run(
        randomUUID(),
        "bihar-board",
        grade,
        subject.key,
        `Bihar Board Class ${grade} ${subject.title}`,
        subject.key === "hindi" ? "hi" : "en",
        `/library/bihar-board/class-${grade}/${subject.key}.pdf`,
        nowTs
      );
    }
  }
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

export function listStudentAccounts() {
  return db
    .prepare(
      `SELECT sa.id, sa.student_id, sa.username, sa.created_at,
              s.name as student_name, s.grade as student_grade,
              s.class_id as class_id, s.section_id as section_id
       FROM student_accounts sa
       JOIN students s ON s.id = sa.student_id
       ORDER BY sa.created_at DESC`
    )
    .all();
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

export function createStudentAccount({ studentId, username, passwordHash }) {
  const id = randomUUID();
  db.prepare(
    `INSERT INTO student_accounts (id, student_id, username, password_hash, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).run(id, studentId, username, passwordHash, Date.now());
  return db.prepare("SELECT id, student_id, username, created_at FROM student_accounts WHERE id = ?").get(id);
}

export function getStudentAccountByStudentId(studentId) {
  return db.prepare("SELECT * FROM student_accounts WHERE student_id = ?").get(studentId);
}

export function getStudentAccountWithPassword(identifier) {
  return db
    .prepare(
      `SELECT sa.*, s.name as student_name, s.grade as student_grade, s.language as student_language,
              s.class_id as class_id, s.section_id as section_id
       FROM student_accounts sa
       JOIN students s ON s.id = sa.student_id
       WHERE lower(sa.username) = lower(?)`
    )
    .get(identifier);
}

export function studentUsernameExists(username) {
  return !!db.prepare("SELECT 1 FROM student_accounts WHERE lower(username) = lower(?)").get(username);
}

export function listBooks({ board = "bihar-board", grade = null, subject = null }) {
  const rows = db
    .prepare(
      `SELECT id, board, grade, subject, title, language, pdf_url, created_at
       FROM book_catalog
       WHERE board = ?
         AND (? IS NULL OR grade = ?)
         AND (? IS NULL OR subject = ?)
       ORDER BY grade, subject, title`
    )
    .all(board, grade, grade, subject, subject);
  return rows;
}

export function getBookById(bookId) {
  return db
    .prepare(
      `SELECT id, board, grade, subject, title, language, pdf_url, created_at
       FROM book_catalog
       WHERE id = ?`
    )
    .get(bookId);
}

export function replaceBooksForBoard(board, books) {
  const clearStmt = db.prepare("DELETE FROM book_catalog WHERE board = ?");
  const insertStmt = db.prepare(
    `INSERT INTO book_catalog (id, board, grade, subject, title, language, pdf_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction((inputBooks) => {
    clearStmt.run(board);
    const now = Date.now();
    for (const book of inputBooks) {
      insertStmt.run(
        randomUUID(),
        board,
        Number(book.grade),
        String(book.subject),
        String(book.title),
        String(book.language || "en"),
        String(book.pdfUrl),
        now
      );
    }
  });

  tx(books);
  return listBooks({ board });
}

export function appendBooks(books) {
  const insertStmt = db.prepare(
    `INSERT INTO book_catalog (id, board, grade, subject, title, language, pdf_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const tx = db.transaction((inputBooks) => {
    const now = Date.now();
    for (const book of inputBooks) {
      insertStmt.run(
        randomUUID(),
        String(book.board || "bihar-board"),
        Number(book.grade),
        String(book.subject),
        String(book.title),
        String(book.language || "en"),
        String(book.pdfUrl),
        now
      );
    }
  });

  tx(books);
  return books.length;
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
