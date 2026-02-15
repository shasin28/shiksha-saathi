const API = "http://localhost:4000";
const TOKEN_KEY = "shiksha_token";
const USER_KEY = "shiksha_user";
const QUEUE_KEY = "shiksha_offline_queue_spa";
const DEVICE_ID = "device-rural-001";

const app = document.querySelector("#app");
let speechRecognition;

window.addEventListener("hashchange", renderRoute);
bootstrap();

async function bootstrap() {
  if (!location.hash) location.hash = "#/login";
  await hydrateUser();
  renderRoute();
}

async function hydrateUser() {
  const token = getToken();
  if (!token) return;

  try {
    const me = await apiGet("/auth/me", true);
    setUser(me);
  } catch {
    clearAuth();
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function routePath() {
  return location.hash.replace(/^#/, "") || "/login";
}

function isAuthed() {
  return !!getToken() && !!getUser();
}

function navItemsForRole(role) {
  const items = [{ href: "#/dashboard", label: "Dashboard" }, { href: "#/student-test", label: "Student Test" }];

  if (role === "teacher") {
    items.push({ href: "#/teacher-dashboard", label: "Teacher Dashboard" });
  }

  if (role === "admin") {
    items.push({ href: "#/teacher-dashboard", label: "Teacher Dashboard" });
    items.push({ href: "#/admin-dashboard", label: "Admin Dashboard" });
  }

  return items;
}

function renderLayout(content, activeRoute) {
  const user = getUser();
  const nav = navItemsForRole(user.role)
    .map((item) => {
      const active = item.href === `#${activeRoute}` ? "active" : "";
      return `<a class="${active}" href="${item.href}">${item.label}</a>`;
    })
    .join("");

  app.innerHTML = `<div class="shell">
    <aside class="sidebar">
      <div class="brand">Shiksha Saathi</div>
      <div class="small">${user.name} (${user.role})</div>
      <nav class="nav">${nav}</nav>
      <div class="toolbar">
        <button class="ghost" id="logoutBtn">Logout</button>
      </div>
    </aside>
    <main class="main">${content}</main>
  </div>`;

  document.querySelector("#logoutBtn").addEventListener("click", () => {
    clearAuth();
    location.hash = "#/login";
  });
}

function renderLogin() {
  app.innerHTML = `<div class="auth-wrap">
    <section class="auth-card">
      <h1>Shiksha Saathi</h1>
      <p>Login page is separated from testing and dashboards.</p>
      <div class="grid">
        <div class="card">
          <label>Email</label>
          <input id="emailInput" value="teacher@shiksha.local" />
          <label style="margin-top:0.5rem;display:block">Password</label>
          <input id="passwordInput" value="teacher123" type="password" />
          <div class="toolbar">
            <button id="loginBtn">Login</button>
          </div>
          <div class="small" id="loginState">Use teacher/admin seeded credentials.</div>
        </div>
      </div>
    </section>
  </div>`;

  document.querySelector("#loginBtn").addEventListener("click", async () => {
    const email = document.querySelector("#emailInput").value.trim();
    const password = document.querySelector("#passwordInput").value;
    const state = document.querySelector("#loginState");

    if (!email || !password) {
      state.textContent = "Email and password required.";
      return;
    }

    try {
      const data = await apiPost("/auth/login", { email, password }, false);
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      location.hash = "#/dashboard";
    } catch {
      state.textContent = "Login failed. Check credentials.";
    }
  });
}

async function renderDashboard() {
  const user = getUser();
  const overview = await apiGet("/analytics/overview");

  const content = `<h2>Dashboard</h2>
    <p>Role-based landing view. Login, testing, and management are separated routes.</p>
    <div class="stat-grid">
      <div class="stat"><span class="small">Students</span><strong>${overview.totalStudents}</strong></div>
      <div class="stat"><span class="small">Attempts</span><strong>${overview.totalAttempts}</strong></div>
      <div class="stat"><span class="small">Voice Share</span><strong>${Math.round(
        overview.voiceShare * 100
      )}%</strong></div>
      <div class="stat"><span class="small">Offline Share</span><strong>${Math.round(
        overview.offlineShare * 100
      )}%</strong></div>
    </div>
    <div class="grid cols-2">
      <div class="card">
        <h3>Quick Route</h3>
        <p class="small">Go to student test page for ASR capture.</p>
        <div class="toolbar"><a href="#/student-test"><button>Open Student Test</button></a></div>
      </div>
      <div class="card">
        <h3>Role Workspace</h3>
        <p class="small">${
          user.role === "admin"
            ? "Admin dashboard for classes, sections, and students."
            : "Teacher dashboard for misconceptions and worksheets."
        }</p>
        <div class="toolbar"><a href="#/${
          user.role === "admin" ? "admin-dashboard" : "teacher-dashboard"
        }"><button class="secondary">Open Workspace</button></a></div>
      </div>
    </div>`;

  renderLayout(content, "/dashboard");
}

async function renderStudentTestPage() {
  const students = await apiGet("/students");

  const content = `<h2>Student Test Page</h2>
    <p>Dedicated testing route with ASR transcript + offline queue.</p>
    <div class="grid cols-2">
      <section class="card">
        <h3>Capture Attempt</h3>
        <div class="toolbar">
          <select id="studentSelect">${students
            .map((student) => `<option value="${student.id}">${student.name} (G${student.grade})</option>`)
            .join("")}</select>
          <select id="conceptSelect">
            <option value="division">Division</option>
            <option value="multiplication">Multiplication</option>
            <option value="fractions">Fractions</option>
            <option value="decimals">Decimals</option>
          </select>
          <select id="langSelect">
            <option value="hi">Hindi</option>
            <option value="en">English</option>
            <option value="mr">Marathi</option>
          </select>
          <input id="latencyInput" type="number" value="9000" min="1000" step="100" />
        </div>
        <div class="toolbar">
          <button id="recordBtn">Start Recording</button>
          <button id="saveBtn" class="secondary">Save ASR Attempt</button>
          <button id="syncBtn" class="ghost">Sync Offline Queue</button>
        </div>
        <textarea id="transcriptInput" rows="3" placeholder="Speech transcript appears here"></textarea>
        <div class="small" id="asrState">Ready to capture.</div>
      </section>
      <section class="card">
        <h3>Offline Queue</h3>
        <div class="small" id="queueCount">0 events pending</div>
        <div id="queueList" class="list"></div>
      </section>
    </div>
    <section class="card" style="margin-top:0.9rem">
      <h3>Student Gap Report</h3>
      <div class="toolbar">
        <button id="loadGapBtn">Load Gaps</button>
      </div>
      <div id="gapList" class="list"></div>
    </section>`;

  renderLayout(content, "/student-test");

  initializeSpeech();
  renderQueue();

  document.querySelector("#recordBtn").addEventListener("click", onStartRecording);
  document.querySelector("#saveBtn").addEventListener("click", onSaveAsrAttempt);
  document.querySelector("#syncBtn").addEventListener("click", onSyncQueue);
  document.querySelector("#loadGapBtn").addEventListener("click", onLoadGaps);
}

async function renderTeacherDashboard() {
  const classes = await apiGet("/teacher/classes");
  const classOptions = classes.map((cls) => `<option value="${cls.id}">${cls.name}</option>`).join("");

  const content = `<h2>Teacher Dashboard</h2>
    <p>Class and section misconception analysis with worksheet generation.</p>
    <section class="card">
      <div class="toolbar">
        <select id="classSelect">${classOptions}</select>
        <select id="sectionSelect"></select>
        <select id="worksheetLang">
          <option value="en">English</option>
          <option value="hi">Hindi</option>
        </select>
        <button id="classInsightsBtn">Analyze Class</button>
        <button id="sectionInsightsBtn" class="secondary">Analyze Section</button>
        <button id="worksheetBtn" class="ghost">Generate Worksheet</button>
      </div>
      <div id="misconceptionList" class="list"></div>
    </section>
    <section class="card" style="margin-top:0.9rem">
      <h3>Worksheet</h3>
      <pre id="worksheetOut"></pre>
    </section>`;

  renderLayout(content, "/teacher-dashboard");
  await populateSections();

  document.querySelector("#classSelect").addEventListener("change", populateSections);
  document.querySelector("#classInsightsBtn").addEventListener("click", onClassInsights);
  document.querySelector("#sectionInsightsBtn").addEventListener("click", onSectionInsights);
  document.querySelector("#worksheetBtn").addEventListener("click", onGenerateWorksheet);
}

async function renderAdminDashboard() {
  const teachers = await apiGet("/admin/teachers");
  const classes = await apiGet("/teacher/classes");

  const content = `<h2>Admin Dashboard</h2>
    <p>Separate management route for teacher accounts, classes, sections, and students.</p>
    <div class="grid cols-2">
      <section class="card">
        <h3>Create Class</h3>
        <div class="toolbar">
          <input id="className" placeholder="Class name" />
          <input id="classGrade" type="number" placeholder="Grade" value="4" min="1" max="12" />
          <select id="classTeacherId">
            ${teachers.map((teacher) => `<option value="${teacher.id}">${teacher.name}</option>`).join("")}
          </select>
          <button id="createClassBtn">Create Class</button>
        </div>
      </section>
      <section class="card">
        <h3>Create Section</h3>
        <div class="toolbar">
          <select id="sectionClassId">
            ${classes.map((cls) => `<option value="${cls.id}">${cls.name}</option>`).join("")}
          </select>
          <input id="sectionName" placeholder="Section name" value="A" />
          <button id="createSectionBtn" class="secondary">Create Section</button>
        </div>
      </section>
    </div>
    <section class="card" style="margin-top:0.9rem">
      <h3>Add Student</h3>
      <div class="toolbar">
        <input id="studentName" placeholder="Student name" />
        <input id="studentGrade" type="number" value="4" min="1" max="12" />
        <input id="studentLanguage" value="hi" placeholder="Language code" />
        <select id="studentClassId">
          ${classes.map((cls) => `<option value="${cls.id}">${cls.name}</option>`).join("")}
        </select>
        <select id="studentSectionId"></select>
        <button id="createStudentBtn" class="ghost">Add Student</button>
      </div>
      <div class="small" id="adminState">Ready.</div>
    </section>`;

  renderLayout(content, "/admin-dashboard");
  await populateAdminSections();

  document.querySelector("#studentClassId").addEventListener("change", populateAdminSections);
  document.querySelector("#createClassBtn").addEventListener("click", onCreateClass);
  document.querySelector("#createSectionBtn").addEventListener("click", onCreateSection);
  document.querySelector("#createStudentBtn").addEventListener("click", onCreateStudent);
}

async function renderRoute() {
  const path = routePath();

  if (path === "/login") {
    if (isAuthed()) {
      location.hash = "#/dashboard";
      return;
    }
    renderLogin();
    return;
  }

  if (!isAuthed()) {
    location.hash = "#/login";
    return;
  }

  const user = getUser();

  if (path === "/dashboard") {
    await renderDashboard();
    return;
  }

  if (path === "/student-test") {
    await renderStudentTestPage();
    return;
  }

  if (path === "/teacher-dashboard") {
    if (!["teacher", "admin"].includes(user.role)) {
      location.hash = "#/dashboard";
      return;
    }
    await renderTeacherDashboard();
    return;
  }

  if (path === "/admin-dashboard") {
    if (user.role !== "admin") {
      location.hash = "#/dashboard";
      return;
    }
    await renderAdminDashboard();
    return;
  }

  location.hash = "#/dashboard";
}

async function apiGet(path, unauthed = false) {
  const headers = unauthed
    ? { "Content-Type": "application/json" }
    : { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
  const res = await fetch(`${API}${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} failed`);
  return res.json();
}

async function apiPost(path, payload, authed = true) {
  const headers = authed
    ? { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }
    : { "Content-Type": "application/json" };

  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let message = `POST ${path} failed`;
    try {
      const error = await res.json();
      if (error?.error) message = error.error;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  return res.json();
}

function initializeSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    document.querySelector("#asrState").textContent = "SpeechRecognition not available; type transcript manually.";
    return;
  }

  speechRecognition = new SR();
  speechRecognition.interimResults = false;
  speechRecognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    document.querySelector("#transcriptInput").value = text;
    document.querySelector("#asrState").textContent = "Transcript captured.";
  };
  speechRecognition.onerror = () => {
    document.querySelector("#asrState").textContent = "ASR error. Retry or type transcript.";
  };
}

function onStartRecording() {
  if (!speechRecognition) return;
  const lang = document.querySelector("#langSelect").value;
  speechRecognition.lang = lang === "en" ? "en-IN" : `${lang}-IN`;
  speechRecognition.start();
  document.querySelector("#asrState").textContent = "Listening...";
}

function getQueue() {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
}

function setQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function renderQueue() {
  const queue = getQueue();
  const queueCount = document.querySelector("#queueCount");
  const queueList = document.querySelector("#queueList");
  queueCount.textContent = `${queue.length} events pending`;
  queueList.innerHTML = queue.map((event) => `<div>${event.payload.studentId} | ${event.payload.concept}</div>`).join("");
}

async function onSaveAsrAttempt() {
  const payload = {
    studentId: document.querySelector("#studentSelect").value,
    concept: document.querySelector("#conceptSelect").value,
    language: document.querySelector("#langSelect").value,
    latencyMs: Number(document.querySelector("#latencyInput").value),
    transcript: document.querySelector("#transcriptInput").value,
    offline: !navigator.onLine
  };

  const state = document.querySelector("#asrState");
  if (!payload.transcript) {
    state.textContent = "Transcript required.";
    return;
  }

  if (!navigator.onLine) {
    const queue = getQueue();
    queue.push({ type: "attempt.created.asr", payload });
    setQueue(queue);
    renderQueue();
    state.textContent = "Saved offline.";
    return;
  }

  try {
    const response = await apiPost("/asr/attempts", payload, false);
    state.textContent = response.asr.feedback;
    await onLoadGaps();
  } catch (error) {
    state.textContent = error.message;
  }
}

async function onSyncQueue() {
  const queue = getQueue();
  if (!queue.length) return;
  if (!navigator.onLine) {
    document.querySelector("#asrState").textContent = "Offline. Sync postponed.";
    return;
  }

  try {
    for (const event of queue) {
      await apiPost("/asr/attempts", event.payload, false);
    }
    await apiPost("/sync/events", { deviceId: DEVICE_ID, events: queue }, false);
    setQueue([]);
    renderQueue();
    document.querySelector("#asrState").textContent = "Queue synced.";
    await onLoadGaps();
  } catch (error) {
    document.querySelector("#asrState").textContent = error.message;
  }
}

async function onLoadGaps() {
  const studentId = document.querySelector("#studentSelect").value;
  if (!studentId) return;
  const data = await apiGet(`/students/${studentId}/gaps`);
  const list = document.querySelector("#gapList");
  list.innerHTML = data.report.gaps
    .map((gap) => {
      const accuracy = gap.accuracy == null ? "n/a" : `${Math.round(gap.accuracy * 100)}%`;
      return `<div>
        <strong>${gap.concept}</strong>
        <span class="badge ${gap.risk}">${gap.risk}</span>
        <div class="small">Accuracy: ${accuracy} | Latency: ${Math.round(gap.avgLatency || 0)} ms</div>
        <div class="small">${gap.recommendation}</div>
      </div>`;
    })
    .join("");
}

async function populateSections() {
  const classId = document.querySelector("#classSelect").value;
  if (!classId) return;
  const sections = await apiGet(`/teacher/classes/${classId}/sections`);
  document.querySelector("#sectionSelect").innerHTML = sections
    .map((section) => `<option value="${section.id}">Section ${section.name}</option>`)
    .join("");
}

async function onClassInsights() {
  const classId = document.querySelector("#classSelect").value;
  const data = await apiGet(`/teacher/classes/${classId}/misconceptions`);
  renderMisconceptions(data.misconceptionMap);
}

async function onSectionInsights() {
  const sectionId = document.querySelector("#sectionSelect").value;
  const data = await apiGet(`/teacher/sections/${sectionId}/misconceptions`);
  renderMisconceptions(data.misconceptionMap);
}

async function onGenerateWorksheet() {
  const classId = document.querySelector("#classSelect").value;
  const language = document.querySelector("#worksheetLang").value;
  const data = await apiPost(`/teacher/classes/${classId}/worksheet`, { language });
  document.querySelector("#worksheetOut").textContent = JSON.stringify(data.worksheet, null, 2);
}

function renderMisconceptions(items) {
  document.querySelector("#misconceptionList").innerHTML = items
    .map(
      (item) => `<div>
        <strong>${item.concept}</strong>
        <span class="badge ${item.severity}">${item.severity}</span>
        <div class="small">Error: ${Math.round(item.errorRate * 100)}% | Avg latency: ${Math.round(
        item.avgLatency
      )} ms | Attempts: ${item.totalAttempts}</div>
      </div>`
    )
    .join("");
}

async function populateAdminSections() {
  const classId = document.querySelector("#studentClassId").value;
  if (!classId) return;

  const sections = await apiGet(`/teacher/classes/${classId}/sections`);
  document.querySelector("#studentSectionId").innerHTML = sections
    .map((section) => `<option value="${section.id}">Section ${section.name}</option>`)
    .join("");
}

async function onCreateClass() {
  const state = document.querySelector("#adminState");
  const payload = {
    grade: Number(document.querySelector("#classGrade").value),
    name: document.querySelector("#className").value,
    teacherId: document.querySelector("#classTeacherId").value
  };

  try {
    await apiPost("/admin/classes", payload);
    state.textContent = "Class created. Refresh route to reload lists.";
  } catch (error) {
    state.textContent = error.message;
  }
}

async function onCreateSection() {
  const state = document.querySelector("#adminState");
  const classId = document.querySelector("#sectionClassId").value;
  const name = document.querySelector("#sectionName").value;

  try {
    await apiPost(`/admin/classes/${classId}/sections`, { name });
    state.textContent = "Section created.";
  } catch (error) {
    state.textContent = error.message;
  }
}

async function onCreateStudent() {
  const state = document.querySelector("#adminState");
  const sectionId = document.querySelector("#studentSectionId").value;
  const payload = {
    name: document.querySelector("#studentName").value,
    grade: Number(document.querySelector("#studentGrade").value),
    language: document.querySelector("#studentLanguage").value,
    classId: document.querySelector("#studentClassId").value
  };

  try {
    await apiPost(`/admin/sections/${sectionId}/students`, payload);
    state.textContent = "Student added.";
  } catch (error) {
    state.textContent = error.message;
  }
}
