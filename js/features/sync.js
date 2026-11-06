// Optional Firestore sync. Config is pasted by the user in Settings and stored on this device.
import { $ } from "../core/dom.js";
import { CFG_KEY } from "../core/constants.js";
import { state, replaceState, sanitize, persist } from "../core/state.js";
import { refresh } from "../core/view.js";
import { toast, toastAfterReload } from "../ui/toast.js";

let fb = null, user = null, unsub = null, pushTimer = null;
let initFailed = false;
let lastSync = null;          // Date of the last successful sync
let msg = null;               // latest result shown in the settings box: { text, kind }
let lastErrToast = 0;

/* ---------- Friendly error text ---------- */
const ERRORS = {
  "invalid-credential": "Wrong email or password.",
  "wrong-password": "Wrong email or password.",
  "user-not-found": "Wrong email or password.",
  "invalid-email": "That email address doesn't look right.",
  "email-already-in-use": "That email already has an account. Try Sign in instead.",
  "weak-password": "Password is too weak. Use at least 6 characters.",
  "missing-password": "Enter a password.",
  "too-many-requests": "Too many attempts. Wait a bit and try again.",
  "network-request-failed": "Network error. Check your connection.",
  "operation-not-allowed": "Email/password sign-in isn't enabled in your Firebase project.",
  "permission-denied": "Firestore refused the request. Check your Firestore security rules.",
  "unauthenticated": "You're signed out. Sign in again to sync.",
  "unavailable": "Couldn't reach Firebase. Check your connection.",
};
function friendly(e) {
  const code = String((e && e.code) || "").replace(/^auth\//, "");
  return ERRORS[code] || (code ? "Sync error: " + code : (e && e.message) || "Something went wrong.");
}

/* Show a result in the settings box and (by default) as a toast. */
function report(text, kind = "info", { toastIt = true } = {}) {
  msg = { text, kind };
  if (toastIt) toast(text, { type: kind });
  updateSyncUI();
}

/* ---------- Settings UI ---------- */
const hasCfg = () => !!localStorage.getItem(CFG_KEY);

function mode() {
  if (!hasCfg()) return "none";
  if (initFailed) return "unavailable";
  if (!fb) return "loading";
  return user ? "in" : "out";
}

const LABELS = {
  none: ["Not configured", "Paste your Firebase config below to enable sync."],
  loading: ["Loading", "Loading sync…"],
  unavailable: ["Unavailable", "Couldn't load sync (offline or bad config)."],
  out: ["Signed out", "Sign in to sync your tasks across devices."],
  in: ["Signed in", ""],
};

export function updateSyncUI() {
  const m = mode();
  $("#syncState").dataset.mode = m;
  $("#syncPill").textContent = LABELS[m][0];
  $("#syncStatus").textContent = m === "in"
    ? (user.email || "your account") + (lastSync ? " · last synced " + lastSync.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "")
    : LABELS[m][1];
  // Each box is shown for exactly one state, so Sign out can only appear when signed in.
  $("#authBox").hidden = m !== "out";
  $("#signedBox").hidden = m !== "in";
  $("#cfgClear").hidden = m === "none";
  const n = $("#syncMsg");
  n.hidden = !msg;
  if (msg) { n.textContent = msg.text; n.className = "notice " + msg.kind; }
}

export function fillCfgText() {
  const cfg = localStorage.getItem(CFG_KEY);
  if (cfg) $("#cfgText").value = JSON.stringify(JSON.parse(cfg), null, 2);
}

/* ---------- Firebase ---------- */
function parseCfg(txt) {
  const o = {};
  for (const m of txt.matchAll(/["']?(\w+)["']?\s*:\s*["']([^"']*)["']/g)) o[m[1]] = m[2];
  return o.apiKey && o.projectId ? o : null;
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
      if (u) startListen(); else { stopListen(); lastSync = null; }
      updateSyncUI();
    });
  } catch {
    initFailed = true;
    report("Sync unavailable (offline or bad config).", "error", { toastIt: false });
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
        const s = sanitize(JSON.parse(r.json));
        s.updatedAt = r.updatedAt;
        replaceState(s);
        persist();
        refresh();
        lastSync = new Date();
        report("Loaded newer data from the cloud.", "info");
      } catch {
        report("Remote data was unreadable.", "error");
      }
    } else if (r.updatedAt < state.updatedAt) {
      push();
    } else {
      lastSync = new Date();
      updateSyncUI();
    }
  }, (err) => report(friendly(err), "error"));
}

function stopListen() { if (unsub) { unsub(); unsub = null; } }

export function schedulePush() {
  if (!user) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 800);
}

async function push() {
  if (!user || !fb) return;
  try {
    await fb.F.setDoc(docRef(), { json: JSON.stringify(state), updatedAt: state.updatedAt });
    lastSync = new Date();
    if (msg && msg.kind === "error") msg = null; // an old error is no longer true
    updateSyncUI();
  } catch (e) {
    const t = Date.now();
    const loud = t - lastErrToast > 15000; // don't spam toasts if every save fails
    if (loud) lastErrToast = t;
    report(friendly(e), "error", { toastIt: loud });
  }
}

async function doAuth(isSignUp) {
  if (!fb) { report("Sync isn't ready yet. Try again in a moment.", "error"); return; }
  const email = $("#email").value.trim(), pw = $("#password").value;
  if (!email || !pw) { report("Enter an email and password first.", "error"); return; }
  const btns = [$("#signInBtn"), $("#signUpBtn")];
  btns.forEach((b) => { b.disabled = true; });
  try {
    const fn = isSignUp ? "createUserWithEmailAndPassword" : "signInWithEmailAndPassword";
    const cred = await fb.A[fn](fb.auth, email, pw);
    $("#password").value = "";
    const who = cred.user.email || email;
    report(isSignUp ? `Account created. Signed in as ${who}.` : `Signed in as ${who}.`, "success");
  } catch (e) {
    report(friendly(e), "error");
  } finally {
    btns.forEach((b) => { b.disabled = false; });
  }
}

export function initSync() {
  $("#cfgSave").onclick = () => {
    const cfg = parseCfg($("#cfgText").value);
    if (!cfg) { report("Couldn't find apiKey and projectId in that text.", "error"); return; }
    localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
    toastAfterReload("Firebase config saved. Sign in to start syncing.", "success");
    location.reload();
  };
  $("#cfgClear").onclick = () => {
    localStorage.removeItem(CFG_KEY);
    toastAfterReload("Firebase config removed. Sync is off.", "info");
    location.reload();
  };
  $("#signInBtn").onclick = () => doAuth(false);
  $("#signUpBtn").onclick = () => doAuth(true);
  $("#password").addEventListener("keydown", (e) => { if (e.key === "Enter") doAuth(false); });
  $("#signOutBtn").onclick = async () => {
    try {
      await fb.A.signOut(fb.auth);
      report("Signed out. Your data stays on this device.", "success");
    } catch (e) {
      report(friendly(e), "error");
    }
  };
  initFirebase();
}
