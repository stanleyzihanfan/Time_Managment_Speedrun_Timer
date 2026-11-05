"use strict";

/* ---------- State ---------- */
const KEY = "timerOrganizer.v1";
const CFG_KEY = "timerOrganizer.firebase";
const PREF_KEY = "timerOrganizer.prefs";
const app = document.getElementById("app");
// Scoped to #app so it keeps working when #app is moved into the pop-out window.
const $ = (s) => app.querySelector(s) || document.querySelector(s);
const now = () => Date.now();
const uid = () => Math.random().toString(36).slice(2, 10) + now().toString(36);

function blank() {
  return { tasks: [], offTrack: 0, selectedId: null, running: false, segStart: 0, totalAccum: 0, updatedAt: 0 };
}

function sanitize(s) {
  const b = blank();
  if (!s || !Array.isArray(s.tasks)) throw new Error("Not a Timer Organizer file");
  b.tasks = s.tasks.map((t) => ({
    id: String(t.id || uid()),
    name: String(t.name || "Task").slice(0, 80),
    est: Math.max(0, Number(t.est) || 0),
    elapsed: Math.max(0, Number(t.elapsed) || 0),
    done: !!t.done,
  }));
  b.offTrack = Math.max(0, Number(s.offTrack) || 0);
  b.totalAccum = Math.max(0, Number(s.totalAccum) || 0);
  b.selectedId = b.tasks.some((t) => t.id === s.selectedId && !t.done) ? s.selectedId : null;
  b.running = !!s.running;
  b.segStart = Number(s.segStart) || 0;
  b.updatedAt = Number(s.updatedAt) || 0;
  if (b.running && !b.segStart) b.running = false;
  return b;
}

function load() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return blank();
  }
}

let state = load();
let editingId = null;

// Bulk-select mode (UI only, not saved or synced)
let bulk = false;
const bulkSel = new Set();

const selTask = () => state.tasks.find((t) => t.id === state.selectedId) || null;

/* Move running time into the active entry (selected task or Off-Track). */
function commit() {
  if (!state.running) return;
  const n = now();
  const d = Math.max(0, n - state.segStart);
  const t = selTask();
  if (t) t.elapsed += d; else state.offTrack += d;
  state.totalAccum += d;
  state.segStart = n;
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn("Could not save", e); }
}

function save() {
  state.updatedAt = now();
  persist();
  render();
  schedulePush();
}

function mutate(fn) {
  commit();
  fn();
  save();
}

/* ---------- Preferences (per device) ---------- */
const PREF_DEFAULTS = { theme: "system", transparent: false, onTop: false };
function loadPrefs() {
  try { return { ...PREF_DEFAULTS, ...JSON.parse(localStorage.getItem(PREF_KEY) || "{}") }; }
  catch { return { ...PREF_DEFAULTS }; }
}
let prefs = loadPrefs();
function savePrefs() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {}
}

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
const docs = () => (pip ? [document, pip.document] : [document]);

function applyPrefs() {
  const theme = prefs.theme === "system" ? (darkQuery.matches ? "dark" : "light") : prefs.theme;
  for (const d of docs()) {
    d.documentElement.dataset.theme = theme;
    d.documentElement.dataset.transparent = String(!!prefs.transparent);
  }
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "light" ? "#f3f5f9" : "#1c2331";
}
darkQuery.addEventListener("change", () => { if (prefs.theme === "system") applyPrefs(); });

function syncPrefsUI() {
  $("#themeSel").value = prefs.theme;
  $("#transChk").checked = !!prefs.transparent;
  $("#topChk").checked = prefs.onTop && pipSupported;
  $("#topChk").disabled = !pipSupported;
  $("#topNote").textContent = pipSupported
    ? "Opens the timer in a small pop-out window that stays above other apps. Close it to come back here."
    : "Not supported in this browser. Needs desktop Chrome or Edge 116 or newer.";
}

/* ---------- Always on top (Document Picture-in-Picture) ---------- */
const pipSupported = "documentPictureInPicture" in window;
let pip = null;

async function popOut() {
  if (!pipSupported || pip) return;
  try {
    const w = await window.documentPictureInPicture.requestWindow({ width: 360, height: 520 });
    pip = w;
    for (const ss of [...document.styleSheets]) {
      try {
        const st = w.document.createElement("style");
        st.textContent = [...ss.cssRules].map((r) => r.cssText).join("\n");
        w.document.head.appendChild(st);
      } catch {
        if (ss.href) {
          const l = w.document.createElement("link");
          l.rel = "stylesheet";
          l.href = ss.href;
          w.document.head.appendChild(l);
        }
      }
    }
    w.document.title = document.title;
    applyPrefs();
    w.document.body.append(app);
    w.document.addEventListener("keydown", onKey);
    w.addEventListener("pagehide", () => {
      document.body.prepend(app);
      pip = null;
      updatePopUI();
    });
    updatePopUI();
  } catch (e) {
    pip = null;
    updatePopUI();
  }
}

function closePip() { if (pip) pip.close(); }

function updatePopUI() {
  $("#popBtn").hidden = !(pipSupported && prefs.onTop && !pip);
  document.getElementById("popNote").hidden = !pip;
}

/* ---------- Dialog helpers (browser confirm/alert don't work well in the pop-out) ---------- */
function ask(msg, ok = "OK", cancel = true) {
  return new Promise((res) => {
    const dlg = $("#askDlg");
    $("#askMsg").textContent = msg;
    $("#askOk").textContent = ok;
    $("#askCancel").hidden = !cancel;
    const done = (v) => { res(v); dlg.close(); };
    $("#askOk").onclick = () => done(true);
    $("#askCancel").onclick = () => done(false);
    dlg.onclose = () => res(false);
    dlg.showModal();
  });
}

function askEst() {
  return new Promise((res) => {
    const dlg = $("#estDlg");
    $("#estVal").value = 25;
    $("#estForm").onsubmit = (e) => {
      e.preventDefault();
      const v = parseFloat($("#estVal").value);
      res(isNaN(v) ? null : Math.max(0, v));
      dlg.close();
    };
    $("#estCancel").onclick = () => { res(null); dlg.close(); };
    dlg.onclose = () => res(null);
    dlg.showModal();
    $("#estVal").select();
  });
}

/* ---------- Time helpers ---------- */
function fmt(ms, dec) {
  ms = Math.max(0, ms);
  const tenths = Math.floor(ms / 100) % 10;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  let out = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
  if (dec) out += "." + tenths;
  return out;
}

function fmtDiff(ms, dec) {
  return (ms > 0 ? "+" : "-") + fmt(Math.abs(ms), dec);
}

function live(t) {
  const running = state.running && state.selectedId === t.id;
  return t.elapsed + (running ? now() - state.segStart : 0);
}

function liveOff() {
  return state.offTrack + (state.running && !state.selectedId ? now() - state.segStart : 0);
}

/* ---------- Actions ---------- */
function toggleRun() {
  commit();
  state.running = !state.running;
  if (state.running) state.segStart = now();
  save();
}

function select(id) {
  mutate(() => {
    const t = state.tasks.find((x) => x.id === id);
    if (t && t.done) return;
    state.selectedId = state.selectedId === id ? null : id;
  });
}

function finish() {
  const t = selTask();
  if (!t) return;
  mutate(() => {
    t.done = true;
    state.selectedId = null;
  });
}

function openTaskDlg(id) {
  editingId = id || null;
  const t = state.tasks.find((x) => x.id === id);
  $("#taskDlgTitle").textContent = t ? "Edit task" : "Add task";
  $("#taskName").value = t ? t.name : "";
  $("#taskEst").value = t ? +(t.est / 60000).toFixed(2) : 25;
  $("#taskDlg").showModal();
  $("#taskName").focus();
}

function submitTask(e) {
  e.preventDefault();
  const name = $("#taskName").value.trim();
  const est = Math.max(0, parseFloat($("#taskEst").value) || 0) * 60000;
  if (!name) return;
  mutate(() => {
    const t = state.tasks.find((x) => x.id === editingId);
    if (t) { t.name = name; t.est = est; }
    else state.tasks.push({ id: uid(), name, est, elapsed: 0, done: false });
  });
  $("#taskDlg").close();
}

async function deleteTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t || !(await ask(`Delete "${t.name}"?`, "Delete"))) return;
  mutate(() => {
    state.tasks = state.tasks.filter((x) => x.id !== id);
    if (state.selectedId === id) state.selectedId = null;
  });
}

function reopenTask(id) {
  mutate(() => {
    const t = state.tasks.find((x) => x.id === id);
    if (t) t.done = false;
  });
}

/* Reset run: delete every split and clear all times. */
async function resetRun() {
  if (!(await ask("Reset the run? This deletes all splits and clears every time.", "Reset run"))) return;
  bulk = false;
  bulkSel.clear();
  state = blank();
  save();
}

/* Reset times: keep the tasks, zero every split and the main timer. */
async function resetTimes() {
  if (!(await ask("Reset the main timer and the time on every split? Your tasks stay.", "Reset times"))) return;
  mutate(() => {
    state.tasks.forEach((t) => { t.elapsed = 0; t.done = false; });
    state.offTrack = 0;
    state.totalAccum = 0;
    state.running = false;
  });
}

/* ---------- Bulk operations ---------- */
function setBulk(on) {
  bulk = on;
  bulkSel.clear();
  render();
}

function toggleBulkId(id) {
  if (bulkSel.has(id)) bulkSel.delete(id); else bulkSel.add(id);
  render();
}

function bulkAll() {
  if (bulkSel.size === state.tasks.length) bulkSel.clear();
  else state.tasks.forEach((t) => bulkSel.add(t.id));
  render();
}

async function bulkDo(act) {
  const ids = new Set(bulkSel);
  if (!ids.size) return;
  let minutes = null;
  if (act === "del") {
    if (!(await ask(`Delete ${ids.size} selected task${ids.size > 1 ? "s" : ""}?`, "Delete"))) return;
  } else if (act === "est") {
    minutes = await askEst();
    if (minutes == null) return;
  }
  mutate(() => {
    const ts = state.tasks.filter((t) => ids.has(t.id));
    if (act === "del") {
      state.tasks = state.tasks.filter((t) => !ids.has(t.id));
      if (ids.has(state.selectedId)) state.selectedId = null;
    } else if (act === "done") {
      ts.forEach((t) => { t.done = true; });
      if (ids.has(state.selectedId)) state.selectedId = null;
    } else if (act === "open") {
      ts.forEach((t) => { t.done = false; });
    } else if (act === "reset") {
      ts.forEach((t) => { t.elapsed = 0; });
    } else if (act === "est") {
      ts.forEach((t) => { t.est = minutes * 60000; });
    }
  });
  if (act === "del") bulkSel.clear();
  render();
}

/* ---------- Rendering ---------- */
let refs = {};

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function render() {
  for (const id of [...bulkSel]) if (!state.tasks.some((t) => t.id === id)) bulkSel.delete(id);

  const ul = $("#splits");
  refs = {};
  ul.innerHTML = "";
  for (const t of state.tasks) {
    const checked = bulk && bulkSel.has(t.id);
    const li = document.createElement("li");
    li.className = "split" + (t.done ? " done" : "") + (!bulk && t.id === state.selectedId ? " sel" : "") + (checked ? " checked" : "");
    li.dataset.id = t.id;
    li.tabIndex = 0;
    if (bulk) { li.setAttribute("role", "checkbox"); li.setAttribute("aria-checked", String(checked)); }
    const box = bulk ? `<input type="checkbox" tabindex="-1" aria-hidden="true"${checked ? " checked" : ""}>` : "";
    const tools = bulk ? "" :
      `<span class="tools">${t.done ? '<button data-act="reopen">Reopen</button>' : ""}` +
      `<button data-act="edit">Edit</button><button data-act="del">Delete</button></span>`;
    li.innerHTML =
      `<span class="name">${box}${esc(t.name)}</span><span class="diff"></span><span class="time"></span>` +
      `<span class="meta">Estimate ${fmt(t.est)}${t.done ? " · finished" : ""}</span>` + tools;
    ul.appendChild(li);
    refs[t.id] = { diff: li.querySelector(".diff"), time: li.querySelector(".time") };
  }
  const off = document.createElement("li");
  off.className = "split off" + (!state.selectedId && !bulk ? " sel" : "") + (bulk ? " nobulk" : "");
  off.dataset.id = "";
  off.tabIndex = 0;
  off.innerHTML = `<span class="name">Off-Track</span><span class="diff"></span><span class="time"></span><span class="meta">Time not spent on a task</span>`;
  ul.appendChild(off);
  refs.off = { diff: off.querySelector(".diff"), time: off.querySelector(".time") };

  $("#empty").hidden = state.tasks.length > 0;
  $("#finishBtn").disabled = !selTask();
  $("#runBtn").textContent = state.running ? "Pause" : state.totalAccum > 0 ? "Resume" : "Start";

  $("#bulkBtn").textContent = bulk ? "Done selecting" : "Select";
  $("#bulkBtn").disabled = !bulk && state.tasks.length === 0;
  $("#bulkBar").hidden = !bulk;
  $("#bulkCount").textContent = `${bulkSel.size} selected`;
  $("#bulkAll").textContent = state.tasks.length > 0 && bulkSel.size === state.tasks.length ? "Select none" : "Select all";
  $("#bulkAll").disabled = state.tasks.length === 0;
  for (const b of ["#bulkDone", "#bulkOpen", "#bulkReset", "#bulkEst", "#bulkDel"]) $(b).disabled = bulkSel.size === 0;

  updateTimes();
}

function setDiff(el, diffMs, dec) {
  el.textContent = fmtDiff(diffMs, dec);
  el.className = el.className.replace(/\b(ahead|behind)\b/g, "").trim() + (diffMs > 0 ? " behind" : " ahead");
}

function updateTimes() {
  let remaining = 0;
  for (const t of state.tasks) {
    const r = refs[t.id];
    if (!r) continue;
    const el = live(t);
    if (!t.done) remaining += Math.max(0, t.est - el);
    if (t.done || el > 0) {
      r.time.textContent = fmt(el);
      r.time.classList.remove("dim");
      setDiff(r.diff, el - t.est);
    } else {
      r.time.textContent = fmt(t.est);
      r.time.classList.add("dim");
      r.diff.textContent = "";
    }
  }
  const off = liveOff();
  refs.off.time.textContent = fmt(off);
  if (off > 0) setDiff(refs.off.diff, off); else refs.off.diff.textContent = "";

  const total = state.totalAccum + (state.running ? now() - state.segStart : 0);
  $("#total").textContent = fmt(total);
  $("#endTime").textContent = new Date(now() + remaining).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  $("#endIn").textContent = remaining > 0 ? `in ${fmt(remaining)}` : "no time remaining";

  const t = selTask();
  const cur = t ? live(t) : off;
  const est = t ? t.est : 0;
  $("#curName").textContent = t ? t.name : "Off-Track";
  $("#curTime").textContent = fmt(cur, true);
  const cd = $("#curDiff");
  if (cur > 0) setDiff(cd, cur - est, true); else { cd.textContent = ""; }
}

/* ---------- Events ---------- */
$("#runBtn").onclick = toggleRun;
$("#finishBtn").onclick = finish;
$("#addBtn").onclick = () => openTaskDlg(null);
$("#taskForm").onsubmit = submitTask;
$("#taskCancel").onclick = () => $("#taskDlg").close();
$("#resetRunBtn").onclick = resetRun;
$("#resetTimesBtn").onclick = resetTimes;
$("#bulkBtn").onclick = () => setBulk(!bulk);
$("#bulkAll").onclick = bulkAll;
$("#bulkDone").onclick = () => bulkDo("done");
$("#bulkOpen").onclick = () => bulkDo("open");
$("#bulkReset").onclick = () => bulkDo("reset");
$("#bulkEst").onclick = () => bulkDo("est");
$("#bulkDel").onclick = () => bulkDo("del");
$("#popBtn").onclick = popOut;
$("#popBack").onclick = closePip;

$("#settingsBtn").onclick = () => { updateSyncUI(); syncPrefsUI(); $("#settingsDlg").showModal(); };
$("#settingsClose").onclick = () => $("#settingsDlg").close();

$("#themeSel").onchange = (e) => { prefs.theme = e.target.value; savePrefs(); applyPrefs(); };
$("#transChk").onchange = (e) => { prefs.transparent = e.target.checked; savePrefs(); applyPrefs(); };
$("#topChk").onchange = (e) => {
  prefs.onTop = e.target.checked;
  savePrefs();
  if (prefs.onTop) {
    $("#settingsDlg").close();
    popOut();
  } else {
    closePip();
  }
  updatePopUI();
};

$("#splits").addEventListener("click", (e) => {
  const li = e.target.closest("li.split");
  if (!li) return;
  const btn = e.target.closest("button[data-act]");
  const id = li.dataset.id;
  if (bulk) {
    if (id) toggleBulkId(id);
    return;
  }
  if (btn) {
    if (btn.dataset.act === "edit") openTaskDlg(id);
    else if (btn.dataset.act === "del") deleteTask(id);
    else if (btn.dataset.act === "reopen") reopenTask(id);
    return;
  }
  if (!id) { if (state.selectedId) select(state.selectedId); return; } // Off-Track = deselect
  select(id);
});
$("#splits").addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches("li.split")) {
    e.preventDefault();
    e.target.click();
  }
});

function onKey(e) {
  if (e.target.closest && e.target.closest("input, textarea, select, dialog, button, li.split")) return;
  if (e.code === "Space") { e.preventDefault(); toggleRun(); }
  else if (e.key === "Enter") finish();
}
document.addEventListener("keydown", onKey);

/* ---------- Export / Import ---------- */
$("#exportBtn").onclick = () => {
  commit();
  persist();
  const data = { app: "timer-organizer", version: 1, exportedAt: new Date().toISOString(), state: { ...state, running: false, segStart: 0 } };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
  a.download = `timer-organizer-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

$("#importBtn").onclick = () => $("#importFile").click();
$("#importFile").onchange = async (e) => {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const raw = JSON.parse(await f.text());
    const s = sanitize(raw.state || raw);
    if (!(await ask("Replace everything on this device with the imported file?", "Replace"))) return;
    s.running = false;
    s.segStart = 0;
    state = s;
    bulk = false;
    bulkSel.clear();
    save();
  } catch (err) {
    ask("Import failed: " + err.message, "OK", false);
  }
};

/* ---------- Firestore sync ---------- */
let fb = null, user = null, unsub = null, pushTimer = null, syncMsg = "";

function parseCfg(txt) {
  const o = {};
  for (const m of txt.matchAll(/["']?(\w+)["']?\s*:\s*["']([^"']*)["']/g)) o[m[1]] = m[2];
  return o.apiKey && o.projectId ? o : null;
}

function updateSyncUI() {
  const cfg = localStorage.getItem(CFG_KEY);
  $("#cfgText").value = cfg ? JSON.stringify(JSON.parse(cfg), null, 2) : $("#cfgText").value;
  $("#authBox").hidden = !(cfg && !user);
  $("#signedBox").hidden = !user;
  let msg = !cfg ? "Not configured. Paste your Firebase config to enable sync." : user ? `Signed in as ${user.email}.` : fb ? "Config saved. Sign in to sync." : "Loading sync…";
  if (syncMsg) msg += " " + syncMsg;
  $("#syncStatus").textContent = msg;
}

async function initFirebase() {
  const cfg = localStorage.getItem(CFG_KEY);
  if (!cfg || fb) return;
  try {
    const base = "https://www.gstatic.com/firebasejs/10.14.1/";
    const [appM, A, F] = await Promise.all([
      import(base + "firebase-app.js"),
      import(base + "firebase-auth.js"),
      import(base + "firebase-firestore.js"),
    ]);
    const fbApp = appM.initializeApp(JSON.parse(cfg));
    fb = { A, F, auth: A.getAuth(fbApp), db: F.getFirestore(fbApp) };
    A.onAuthStateChanged(fb.auth, (u) => {
      user = u;
      u ? startListen() : stopListen();
      updateSyncUI();
    });
  } catch (e) {
    syncMsg = "Sync unavailable (offline or bad config).";
    updateSyncUI();
  }
}

const docRef = () => fb.F.doc(fb.db, "users", user.uid, "data", "timer");

function startListen() {
  stopListen();
  unsub = fb.F.onSnapshot(docRef(), (snap) => {
    if (snap.metadata.hasPendingWrites) return;
    if (!snap.exists()) { push(); return; }
    const r = snap.data();
    if (r.updatedAt > state.updatedAt) {
      try {
        state = sanitize(JSON.parse(r.json));
        state.updatedAt = r.updatedAt;
        persist();
        render();
        syncMsg = "Synced " + new Date().toLocaleTimeString();
      } catch { syncMsg = "Remote data was unreadable."; }
    } else if (r.updatedAt < state.updatedAt) {
      push();
    }
    updateSyncUI();
  }, (err) => { syncMsg = "Sync error: " + err.code; updateSyncUI(); });
}

function stopListen() { if (unsub) { unsub(); unsub = null; } }

function schedulePush() {
  if (!user) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 800);
}

async function push() {
  if (!user || !fb) return;
  try {
    await fb.F.setDoc(docRef(), { json: JSON.stringify(state), updatedAt: state.updatedAt });
    syncMsg = "Synced " + new Date().toLocaleTimeString();
  } catch (e) {
    syncMsg = "Sync error: " + (e.code || e.message);
  }
  updateSyncUI();
}

async function auth(fnName) {
  const email = $("#email").value.trim(), pw = $("#password").value;
  try {
    await fb.A[fnName](fb.auth, email, pw);
    $("#password").value = "";
    syncMsg = "";
  } catch (e) {
    syncMsg = (e.code || e.message).replace("auth/", "");
  }
  updateSyncUI();
}

$("#cfgSave").onclick = () => {
  const cfg = parseCfg($("#cfgText").value);
  if (!cfg) { syncMsg = "Couldn't find apiKey and projectId in that text."; updateSyncUI(); return; }
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
  location.reload();
};
$("#cfgClear").onclick = () => { localStorage.removeItem(CFG_KEY); location.reload(); };
$("#signInBtn").onclick = () => fb && auth("signInWithEmailAndPassword");
$("#signUpBtn").onclick = () => fb && auth("createUserWithEmailAndPassword");
$("#signOutBtn").onclick = async () => { await fb.A.signOut(fb.auth); };

/* ---------- Boot ---------- */
applyPrefs();
render();
updatePopUI();
setInterval(updateTimes, 100);
initFirebase();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});