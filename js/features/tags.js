// Tags: chip rendering, the tag editor in the task dialog, and a list of tags in use.
import { $ } from "../core/dom.js";
import { state } from "../core/state.js";
import { TAG_COLORS, MAX_TAG_NAME } from "../core/constants.js";
import { tagKey, tagLabel, cleanTag } from "../core/tagdata.js";
import { esc } from "../core/util.js";

/*
 * Returns HTML for one tag.
 * options: as "button" (clickable chip), on (pressed state), removable (adds an x),
 *          alwaysLabel (show the text even if the tag has no name)
 */
export function tagChip(tag, o = {}) {
  const named = !!tag.name;
  const label = esc(tagLabel(tag));
  const showText = named || o.alwaysLabel;
  const text = showText ? `<span class="tname">${label}</span>` : `<span class="sr">${label}</span>`;
  const cls = `tag c-${tag.color}` + (showText ? "" : " bare") + (o.on ? " on" : "");
  const key = esc(tagKey(tag));
  if (o.as === "button") {
    const pressed = o.on === undefined ? "" : ` aria-pressed="${!!o.on}"`;
    return `<button type="button" class="${cls}" data-key="${key}"${pressed} title="${label}"><i class="dot"></i>${text}</button>`;
  }
  const rm = o.removable ? `<button type="button" class="x" data-rm="${key}" aria-label="Remove tag ${label}">×</button>` : "";
  return `<span class="${cls}" title="${label}"><i class="dot"></i>${text}${rm}</span>`;
}

/* Every distinct tag used by any task, ordered by color then name. */
export function allTagsInUse() {
  const map = new Map();
  for (const t of state.tasks) {
    for (const g of t.tags) {
      const k = tagKey(g);
      const e = map.get(k);
      if (e) e.count++; else map.set(k, { ...g, key: k, count: 1 });
    }
  }
  const order = TAG_COLORS.map((c) => c.id);
  return [...map.values()].sort((a, b) => order.indexOf(a.color) - order.indexOf(b.color) || a.name.localeCompare(b.name));
}

/* ---------- Editor (inside the task dialog) ---------- */
let draft = [];
let pick = "blue";

export function setDraftTags(list) {
  draft = list.map((g) => ({ ...g }));
  pick = "blue";
  $("#tagName").value = "";
  $("#tagSwatches").innerHTML = TAG_COLORS.map((c) =>
    `<button type="button" class="swatch c-${c.id}" data-color="${c.id}" aria-pressed="${c.id === pick}" aria-label="${c.label}" title="${c.label}"></button>`
  ).join("");
  renderEditor();
}

export const getDraftTags = () => draft.map((g) => ({ ...g }));

function renderEditor() {
  $("#tagList").innerHTML = draft.length
    ? draft.map((g) => tagChip(g, { removable: true, alwaysLabel: true })).join("")
    : '<span class="muted">No tags yet</span>';
  const have = new Set(draft.map(tagKey));
  const suggestions = allTagsInUse().filter((g) => !have.has(g.key));
  $("#tagSuggestBox").hidden = suggestions.length === 0;
  $("#tagSuggest").innerHTML = suggestions.map((g) => tagChip(g, { as: "button", alwaysLabel: true })).join("");
}

function addDraft() {
  const tag = cleanTag({ color: pick, name: $("#tagName").value });
  if (!tag) return;
  if (!draft.some((g) => tagKey(g) === tagKey(tag))) draft.push(tag);
  $("#tagName").value = "";
  renderEditor();
}

/* If the user typed a tag name but didn't press "Add tag" before saving, add it for them. */
export function flushPendingTag() {
  if ($("#tagName").value.trim()) addDraft();
}

export function initTagEditor() {
  $("#tagSwatches").addEventListener("click", (e) => {
    const b = e.target.closest("[data-color]");
    if (!b) return;
    pick = b.dataset.color;
    for (const s of $("#tagSwatches").querySelectorAll(".swatch")) s.setAttribute("aria-pressed", String(s.dataset.color === pick));
  });
  $("#tagAdd").onclick = addDraft;
  $("#tagName").maxLength = MAX_TAG_NAME;
  $("#tagName").addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); addDraft(); }
  });
  $("#tagList").addEventListener("click", (e) => {
    const b = e.target.closest("[data-rm]");
    if (!b) return;
    draft = draft.filter((g) => tagKey(g) !== b.dataset.rm);
    renderEditor();
  });
  $("#tagSuggest").addEventListener("click", (e) => {
    const b = e.target.closest("[data-key]");
    if (!b) return;
    const g = allTagsInUse().find((x) => x.key === b.dataset.key);
    if (g && !draft.some((d) => tagKey(d) === g.key)) draft.push({ color: g.color, name: g.name });
    renderEditor();
  });
}
