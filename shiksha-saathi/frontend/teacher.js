const API = "http://localhost:4000";
const TOKEN_KEY = "shiksha_teacher_token";

const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const authState = document.querySelector("#authState");
const classSelect = document.querySelector("#classSelect");
const sectionSelect = document.querySelector("#sectionSelect");
const langSelect = document.querySelector("#langSelect");
const misconceptionList = document.querySelector("#misconceptionList");
const worksheetOut = document.querySelector("#worksheetOut");

document.querySelector("#loginBtn").addEventListener("click", login);
document.querySelector("#loadBtn").addEventListener("click", loadClassMisconceptions);
document.querySelector("#loadSectionBtn").addEventListener("click", loadSectionMisconceptions);
document.querySelector("#worksheetBtn").addEventListener("click", loadWorksheet);

hydrate();

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailInput.value, password: passwordInput.value })
  });
  if (!res.ok) {
    authState.textContent = "Login failed";
    return;
  }

  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, data.token);
  authState.textContent = `Logged in as ${data.user.name} (${data.user.role})`;
  await loadClasses();
}

async function hydrate() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;
  authState.textContent = "Token loaded";
  await loadClasses();
}

async function loadClasses() {
  const res = await fetch(`${API}/teacher/classes`, { headers: authHeaders() });
  if (!res.ok) return;
  const classes = await res.json();
  classSelect.innerHTML = classes.map((cls) => `<option value="${cls.id}">${cls.name}</option>`).join("");
  await loadSections();
}

async function loadSections() {
  const classId = classSelect.value;
  if (!classId) return;
  const res = await fetch(`${API}/teacher/classes/${classId}/sections`, { headers: authHeaders() });
  if (!res.ok) return;
  const sections = await res.json();
  sectionSelect.innerHTML = sections
    .map((section) => `<option value="${section.id}">Section ${section.name}</option>`)
    .join("");
}

classSelect.addEventListener("change", loadSections);

async function loadClassMisconceptions() {
  const classId = classSelect.value;
  if (!classId) return;

  const res = await fetch(`${API}/teacher/classes/${classId}/misconceptions`, { headers: authHeaders() });
  if (!res.ok) return;
  const data = await res.json();
  renderMisconceptions(data.misconceptionMap);
}

async function loadSectionMisconceptions() {
  const sectionId = sectionSelect.value;
  if (!sectionId) return;

  const res = await fetch(`${API}/teacher/sections/${sectionId}/misconceptions`, {
    headers: authHeaders()
  });
  if (!res.ok) return;
  const data = await res.json();
  renderMisconceptions(data.misconceptionMap);
}

function renderMisconceptions(rows) {
  misconceptionList.innerHTML = rows
    .map(
      (item) => `<div>
      <strong>${item.concept}</strong>
      <span class="badge ${item.severity}">${item.severity}</span>
      <div><small>Error: ${Math.round(item.errorRate * 100)}% | Avg latency: ${Math.round(
        item.avgLatency
      )} ms | Attempts: ${item.totalAttempts}</small></div>
    </div>`
    )
    .join("");
}

async function loadWorksheet() {
  const classId = classSelect.value;
  if (!classId) return;

  const res = await fetch(`${API}/teacher/classes/${classId}/worksheet`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ language: langSelect.value })
  });

  if (!res.ok) return;
  const data = await res.json();
  worksheetOut.textContent = JSON.stringify(data.worksheet, null, 2);
}
