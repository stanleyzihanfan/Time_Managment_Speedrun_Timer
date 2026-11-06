// Timer controls and per-task actions (select, finish, add/edit, delete, reset).
import { $ } from "../core/dom.js";
import { state, blank, replaceState, selTask, findTask, commit, mutate, save } from "../core/state.js";
import { view, resetBulk } from "../core/view.js";
import { live } from "../core/time.js";
import { now, uid } from "../core/util.js";
import { ask } from "../ui/dialogs.js";
import { toast } from "../ui/toast.js";
import { setDraftTags, getDraftTags, flushPendingTag } from "./tags.js";
import { toggleBulkId } from "./bulk.js";

let editingId = null;

export function toggleRun() {
  commit();
  state.running = !state.running;
  if (state.running) state.segStart = now();
  save();
}

function select(id) {
  mutate(() => {
    const t = findTask(id);
    if (t && t.done) return;
    state.selectedId = state.selectedId === id ? null : id;
  });
}

export function finish() {
  const t = selTask();
  if (!t) return;
  mutate(() => {
    t.done = true;
    state.selectedId = null;
  });
}

/* ---------- Add / edit dialog ---------- */
function openTaskDlg(id) {
  editingId = id || null;
  const t = findTask(id);
  $("#taskDlgTitle").textContent = t ? "Edit task" : "Add task";
  $("#taskName").value = t ? t.name : "";
  $("#taskEst").value = t ? +(t.est / 60000).toFixed(2) : 25;
  setDraftTags(t ? t.tags : []);
  $("#taskDlg").showModal();
  $("#taskName").focus();
}

function submitTask(e) {
  e.preventDefault();
  const name = $("#taskName").value.trim();
  const est = Math.max(0, parseFloat($("#taskEst").value) || 0) * 60000;
  if (!name) return;
  flushPendingTag();
  const tags = getDraftTags();
  mutate(() => {
    const t = findTask(editingId);
    if (t) { t.name = name; t.est = est; t.tags = tags; }
    else state.tasks.push({ id: uid(), name, est, elapsed: 0, done: false, tags, created: now() });
  });
  $("#taskDlg").close();
}

/* ---------- Per-task actions ---------- */
async function deleteTask(id) {
  const t = findTask(id);
  if (!t || !(await ask(`Delete "${t.name}"?`, "Delete"))) return;
  mutate(() => {
    state.tasks = state.tasks.filter((x) => x.id !== id);
    if (state.selectedId === id) state.selectedId = null;
  });
}

function reopenTask(id) {
  mutate(() => {
    const t = findTask(id);
    if (t) t.done = false;
  });
}

/* Zero the time on one task. Shows an Undo toast. */
function resetTaskTime(id) {
  const t = findTask(id);
  if (!t) return;
  if (live(t) <= 0) { toast(`"${t.name}" is already at 0:00.`); return; }
  const name = t.name;
  let prev = 0;
  mutate(() => {
    const x = findTask(id);
    prev = x.elapsed;
    x.elapsed = 0;
  });
  toast(`Reset time on "${name}".`, {
    type: "success",
    action: { label: "Undo", run: () => mutate(() => { const x = findTask(id); if (x) x.elapsed += prev; }) },
  });
}

/* Reset run: delete every split and clear all times. */
async function resetRun() {
  if (!(await ask("Reset the run? This deletes all splits and clears every time.", "Reset run"))) return;
  resetBulk();
  replaceState(blank());
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

export function initTasks() {
  $("#runBtn").onclick = toggleRun;
  $("#finishBtn").onclick = finish;
  $("#addBtn").onclick = () => openTaskDlg(null);
  $("#taskForm").onsubmit = submitTask;
  $("#taskCancel").onclick = () => $("#taskDlg").close();
  $("#resetRunBtn").onclick = resetRun;
  $("#resetTimesBtn").onclick = resetTimes;

  $("#splits").addEventListener("click", (e) => {
    const li = e.target.closest("li.split");
    if (!li) return;
    const btn = e.target.closest("button[data-act]");
    const id = li.dataset.id;
    if (view.bulk) {
      if (id) toggleBulkId(id);
      return;
    }
    if (btn) {
      const act = btn.dataset.act;
      if (act === "edit") openTaskDlg(id);
      else if (act === "del") deleteTask(id);
      else if (act === "reopen") reopenTask(id);
      else if (act === "reset") resetTaskTime(id);
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
}
