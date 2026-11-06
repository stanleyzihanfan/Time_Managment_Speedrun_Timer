// Draws the split list and the live timers.
import { $ } from "../core/dom.js";
import { state, selTask } from "../core/state.js";
import { view, bulkSel } from "../core/view.js";
import { fmt, fmtDiff, live, liveOff, totalTime } from "../core/time.js";
import { now, esc } from "../core/util.js";
import { tagChip } from "../features/tags.js";
import { visibleTasks, renderListBar } from "../features/listbar.js";

let refs = {}; // id -> { diff, time } elements, so the 100ms tick doesn't rebuild the list

/* Full redraw. Call after anything that changes the list, selection, filters or buttons. */
export function render() {
  const vis = visibleTasks();
  const visIds = new Set(vis.map((t) => t.id));
  for (const id of [...bulkSel]) if (!visIds.has(id)) bulkSel.delete(id); // never act on hidden tasks
  renderListBar();

  const ul = $("#splits");
  refs = {};
  ul.innerHTML = "";
  for (const t of vis) {
    const checked = view.bulk && bulkSel.has(t.id);
    const li = document.createElement("li");
    li.className = "split" + (t.done ? " done" : "") + (!view.bulk && t.id === state.selectedId ? " sel" : "") + (checked ? " checked" : "");
    li.dataset.id = t.id;
    li.tabIndex = 0;
    if (view.bulk) { li.setAttribute("role", "checkbox"); li.setAttribute("aria-checked", String(checked)); }
    const box = view.bulk ? `<input type="checkbox" tabindex="-1" aria-hidden="true"${checked ? " checked" : ""}>` : "";
    const tools = view.bulk ? "" :
      `<span class="tools">${t.done ? '<button data-act="reopen">Reopen</button>' : ""}` +
      `<button data-act="reset">Reset time</button><button data-act="edit">Edit</button><button data-act="del">Delete</button></span>`;
    const tags = t.tags.length ? `<span class="tags">${t.tags.map((g) => tagChip(g)).join("")}</span>` : "";
    li.innerHTML =
      `<span class="name">${box}${esc(t.name)}</span><span class="diff"></span><span class="time"></span>` +
      `<span class="meta"><span class="est">Estimate ${fmt(t.est)}${t.done ? " · finished" : ""}</span>${tags}</span>` + tools;
    ul.appendChild(li);
    refs[t.id] = { diff: li.querySelector(".diff"), time: li.querySelector(".time") };
  }

  // Off-Track is always listed last, whatever the search/filters.
  const off = document.createElement("li");
  off.className = "split off" + (!state.selectedId && !view.bulk ? " sel" : "") + (view.bulk ? " nobulk" : "");
  off.dataset.id = "";
  off.tabIndex = 0;
  off.innerHTML = `<span class="name">Off-Track</span><span class="diff"></span><span class="time"></span><span class="meta">Time not spent on a task</span>`;
  ul.appendChild(off);
  refs.off = { diff: off.querySelector(".diff"), time: off.querySelector(".time") };

  const none = state.tasks.length === 0;
  const noMatch = !none && vis.length === 0;
  $("#empty").hidden = !(none || noMatch);
  $("#emptyText").textContent = none
    ? "No tasks yet. Add one with an estimated time to create your first split."
    : "No tasks match your search or filters.";
  $("#emptyClear").hidden = !noMatch;

  $("#finishBtn").disabled = !selTask();
  $("#runBtn").textContent = state.running ? "Pause" : state.totalAccum > 0 ? "Resume" : "Start";

  $("#bulkBtn").textContent = view.bulk ? "Done selecting" : "Select";
  $("#bulkBtn").disabled = !view.bulk && state.tasks.length === 0;
  $("#bulkBar").hidden = !view.bulk;
  $("#bulkCount").textContent = `${bulkSel.size} selected`;
  $("#bulkAll").textContent = vis.length > 0 && bulkSel.size === vis.length ? "Select none" : "Select all";
  $("#bulkAll").disabled = vis.length === 0;
  for (const b of ["#bulkDone", "#bulkOpen", "#bulkReset", "#bulkEst", "#bulkDel"]) $(b).disabled = bulkSel.size === 0;

  updateTimes();
}

function setDiff(el, diffMs, dec) {
  el.textContent = fmtDiff(diffMs, dec);
  el.className = el.className.replace(/\b(ahead|behind)\b/g, "").trim() + (diffMs > 0 ? " behind" : " ahead");
}

/* Cheap update of the numbers only (runs every 100ms). */
export function updateTimes() {
  if (!refs.off) return;
  let remaining = 0;
  for (const t of state.tasks) {
    const el = live(t);
    if (!t.done) remaining += Math.max(0, t.est - el); // counts hidden tasks too
    const r = refs[t.id];
    if (!r) continue;
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

  $("#total").textContent = fmt(totalTime());
  $("#endTime").textContent = new Date(now() + remaining).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  $("#endIn").textContent = remaining > 0 ? `in ${fmt(remaining)}` : "no time remaining";

  const t = selTask();
  const cur = t ? live(t) : off;
  const est = t ? t.est : 0;
  $("#curName").textContent = t ? t.name : "Off-Track";
  $("#curTime").textContent = fmt(cur, true);
  const cd = $("#curDiff");
  if (cur > 0) setDiff(cd, cur - est, true); else cd.textContent = "";
}
