const API = "http://localhost:4000";
const QUEUE_KEY = "shiksha_offline_queue_v2";
const DEVICE_ID = "device-rural-001";
const TOKEN_KEY = "shiksha_teacher_token";

const emailInput = document.querySelector("#emailInput");
const passwordInput = document.querySelector("#passwordInput");
const loginState = document.querySelector("#loginState");
const studentSelect = document.querySelector("#studentSelect");
const conceptSelect = document.querySelector("#conceptSelect");
const langSelect = document.querySelector("#langSelect");
const latencyInput = document.querySelector("#latencyInput");
const transcriptInput = document.querySelector("#transcriptInput");
const asrState = document.querySelector("#asrState");
const queueList = document.querySelector("#queueList");
const queueCount = document.querySelector("#queueCount");
const gapList = document.querySelector("#gapList");

let recognition;

document.querySelector("#loginBtn").addEventListener("click", login);
document.querySelector("#recordBtn").addEventListener("click", toggleRecord);
document.querySelector("#saveBtn").addEventListener("click", addAsrAttempt);
document.querySelector("#syncBtn").addEventListener("click", syncQueue);
document.querySelector("#loadGapBtn").addEventListener("click", loadGaps);

initSpeech();
renderQueue();
hydrateLoginState();

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailInput.value, password: passwordInput.value })
  });

  if (!res.ok) {
    loginState.textContent = "Login failed";
    return;
  }

  const data = await res.json();
  localStorage.setItem(TOKEN_KEY, data.token);
  loginState.textContent = `Logged in as ${data.user.name}`;
  await loadStudents();
}

function hydrateLoginState() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    loginState.textContent = "Token loaded from local storage";
    loadStudents();
  }
}

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function loadStudents() {
  const res = await fetch(`${API}/students`, { headers: authHeaders() });
  if (!res.ok) return;
  const students = await res.json();
  studentSelect.innerHTML = students
    .map((student) => `<option value="${student.id}">${student.name} (Grade ${student.grade})</option>`)
    .join("");
}

function initSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    asrState.textContent = "Speech recognition unsupported. Type transcript manually.";
    return;
  }

  recognition = new SR();
  recognition.lang = "hi-IN";
  recognition.interimResults = false;

  recognition.onresult = (event) => {
    const text = event.results[0][0].transcript;
    transcriptInput.value = text;
    asrState.textContent = "Transcript captured";
  };

  recognition.onerror = () => {
    asrState.textContent = "ASR error, retry or type manually.";
  };
}

function toggleRecord() {
  if (!recognition) return;
  recognition.lang = langSelect.value === "en" ? "en-IN" : `${langSelect.value}-IN`;
  recognition.start();
  asrState.textContent = "Listening...";
}

function getQueue() {
  return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
}

function setQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function renderQueue() {
  const queue = getQueue();
  queueCount.textContent = `${queue.length} events pending`;
  queueList.innerHTML = queue
    .map((item) => `<div><strong>${item.payload.concept}</strong> | ${item.payload.studentId}</div>`)
    .join("");
}

async function addAsrAttempt() {
  const payload = {
    studentId: studentSelect.value,
    concept: conceptSelect.value,
    language: langSelect.value,
    latencyMs: Number(latencyInput.value),
    transcript: transcriptInput.value,
    offline: !navigator.onLine
  };

  if (!payload.transcript) {
    asrState.textContent = "Transcript is required";
    return;
  }

  if (!navigator.onLine) {
    const queue = getQueue();
    queue.push({ type: "attempt.created.asr", payload });
    setQueue(queue);
    renderQueue();
    return;
  }

  const res = await fetch(`${API}/asr/attempts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  asrState.textContent = data.asr?.feedback || "Saved";
  await loadGaps();
}

async function syncQueue() {
  const queue = getQueue();
  if (!queue.length || !navigator.onLine) return;

  for (const event of queue) {
    await fetch(`${API}/asr/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event.payload)
    });
  }

  await fetch(`${API}/sync/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ deviceId: DEVICE_ID, events: queue })
  });

  setQueue([]);
  renderQueue();
  await loadGaps();
}

async function loadGaps() {
  if (!studentSelect.value) return;
  const res = await fetch(`${API}/students/${studentSelect.value}/gaps`, { headers: authHeaders() });
  if (!res.ok) return;

  const data = await res.json();
  gapList.innerHTML = data.report.gaps
    .map((gap) => {
      const accuracy = gap.accuracy == null ? "n/a" : `${Math.round(gap.accuracy * 100)}%`;
      return `<div>
        <strong>${gap.concept}</strong>
        <span class="badge ${gap.risk}">${gap.risk}</span>
        <div><small>Accuracy: ${accuracy} | Latency: ${Math.round(gap.avgLatency || 0)} ms</small></div>
        <div><small>${gap.recommendation}</small></div>
      </div>`;
    })
    .join("");
}
