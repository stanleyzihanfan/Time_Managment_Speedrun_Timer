// Search, filter and sort for the task list.
import { $ } from "../core/dom.js";
import { state } from "../core/state.js";
import { view, refresh } from "../core/view.js";
import { SORTS } from "../core/constants.js";
import { tagKey } from "../core/tagdata.js";
import { live, remainingOf } from "../core/time.js";
import { prefs, savePrefs } from "./prefs.js";
import { allTagsInUse, tagChip } from "./tags.js";

const sortId = () => (SORTS.some((s) => s.id === prefs.sort) ? prefs.sort : "created");

/* Add a new sort option here (and in SORTS in core/constants.js). Return a negative/positive number. */
function compare(id, a, b) {
  switch (id) {
    case "name": return a.t.name.localeCompare(b.t.name, undefined, { sensitivity: "base", numeric: true });
    case "remaining": return remainingOf(a.t) - remainingOf(b.t);
    case "estimate": return a.t.est - b.t.est;
    case "spent": return live(a.t) - live(b.t);
    case "created":
    default: return (a.t.created - b.t.created) || (a.i - b.i);
  }
}

export const activeFilterCount = () => (view.status !== "all" ? 1 : 0) + view.tagKeys.size;
export const isFiltering = () => view.search.trim() !== "" || activeFilterCount() > 0;

/* The tasks to show: filtered, then sorted. (Off-Track is always shown separately.) */
export function visibleTasks() {
  const q = view.search.trim().toLowerCase();
  const dir = prefs.sortDir === "desc" ? -1 : 1;
  const id = sortId();
  const wanted = [...view.tagKeys];

  const list = state.tasks.map((t, i) => ({ t, i })).filter(({ t }) => {
    if (q && !(t.name.toLowerCase().includes(q) || t.tags.some((g) => g.name.toLowerCase().includes(q)))) return false;
    if (view.status === "open" && t.done) return false;
    if (view.status === "done" && !t.done) return false;
    if (wanted.length) {
      const has = new Set(t.tags.map(tagKey));
      if (view.matchAll ? !wanted.every((k) => has.has(k)) : !wanted.some((k) => has.has(k))) return false;
    }
    return true;
  });

  list.sort((a, b) => dir * compare(id, a, b) || a.i - b.i);
  return list.map((x) => x.t);
}

/* Syncs the search/filter/sort controls with current state. Called from render(). */
export function renderListBar() {
  const sel = $("#sortSel");
  if (!sel.options.length) sel.innerHTML = SORTS.map((s) => `<option value="${s.id}">${s.label}</option>`).join("");
  sel.value = sortId();

  const desc = prefs.sortDir === "desc";
  const dirBtn = $("#sortDirBtn");
  dirBtn.textContent = desc ? "↓" : "↑";
  dirBtn.setAttribute("aria-label", desc ? "Sort descending (click for ascending)" : "Sort ascending (click for descending)");
  dirBtn.title = desc ? "Descending" : "Ascending";

  const tags = allTagsInUse();
  const have = new Set(tags.map((g) => g.key));
  for (const k of [...view.tagKeys]) if (!have.has(k)) view.tagKeys.delete(k); // tag no longer exists

  const n = activeFilterCount();
  $("#filterBtn").textContent = n ? `Filter (${n})` : "Filter";
  $("#filterBtn").setAttribute("aria-expanded", String(view.filtersOpen));
  $("#filterPanel").hidden = !view.filtersOpen;
  $("#statusSel").value = view.status;
  $("#matchSel").value = view.matchAll ? "all" : "any";
  $("#filterTags").innerHTML = tags.length
    ? tags.map((g) => tagChip(g, { as: "button", on: view.tagKeys.has(g.key), alwaysLabel: true })).join("")
    : '<span class="muted">No tags yet. Add tags when you edit a task.</span>';
}

export function clearFilters() {
  view.search = "";
  view.status = "all";
  view.matchAll = false;
  view.tagKeys.clear();
  $("#searchBox").value = "";
  refresh();
}

export function initListBar() {
  $("#searchBox").addEventListener("input", (e) => { view.search = e.target.value; refresh(); });
  $("#filterBtn").onclick = () => { view.filtersOpen = !view.filtersOpen; refresh(); };
  $("#statusSel").onchange = (e) => { view.status = e.target.value; refresh(); };
  $("#matchSel").onchange = (e) => { view.matchAll = e.target.value === "all"; refresh(); };
  $("#filterTags").addEventListener("click", (e) => {
    const b = e.target.closest("[data-key]");
    if (!b) return;
    const k = b.dataset.key;
    if (view.tagKeys.has(k)) view.tagKeys.delete(k); else view.tagKeys.add(k);
    refresh();
  });
  $("#clearFilters").onclick = clearFilters;
  $("#emptyClear").onclick = clearFilters;
  $("#sortSel").onchange = (e) => { prefs.sort = e.target.value; savePrefs(); refresh(); };
  $("#sortDirBtn").onclick = () => { prefs.sortDir = prefs.sortDir === "desc" ? "asc" : "desc"; savePrefs(); refresh(); };
}
