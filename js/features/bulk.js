// Bulk select mode: apply one action to many tasks at once.
import { $ } from "../core/dom.js";
import { state, mutate } from "../core/state.js";
import { view, bulkSel, refresh } from "../core/view.js";
import { ask, askEst } from "../ui/dialogs.js";
import { visibleTasks } from "./listbar.js";

export function setBulk(on) {
  view.bulk = on;
  bulkSel.clear();
  refresh();
}

export function toggleBulkId(id) {
  if (bulkSel.has(id)) bulkSel.delete(id); else bulkSel.add(id);
  refresh();
}

/* "Select all" only selects tasks that are currently shown (respects search and filters). */
function bulkAll() {
  const vis = visibleTasks();
  if (vis.length > 0 && bulkSel.size === vis.length) bulkSel.clear();
  else vis.forEach((t) => bulkSel.add(t.id));
  refresh();
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
  refresh();
}

export function initBulk() {
  $("#bulkBtn").onclick = () => setBulk(!view.bulk);
  $("#bulkAll").onclick = bulkAll;
  $("#bulkDone").onclick = () => bulkDo("done");
  $("#bulkOpen").onclick = () => bulkDo("open");
  $("#bulkReset").onclick = () => bulkDo("reset");
  $("#bulkEst").onclick = () => bulkDo("est");
  $("#bulkDel").onclick = () => bulkDo("del");
}
