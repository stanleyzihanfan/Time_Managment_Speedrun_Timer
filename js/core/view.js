// UI-only state (not saved, not synced): bulk-select mode, search text, filters.
export const view = {
  bulk: false,
  search: "",
  status: "all",        // "all" | "open" | "done"
  matchAll: false,      // tag filter: false = any selected tag, true = all selected tags
  filtersOpen: false,
  tagKeys: new Set(),   // selected tag keys (see tagKey in tagdata.js)
};
export const bulkSel = new Set();

// render() is registered from main.js so modules can ask for a redraw without importing it.
let renderFn = () => {};
export function setRenderer(fn) { renderFn = fn; }
export function refresh() { renderFn(); }

export function resetBulk() {
  view.bulk = false;
  bulkSel.clear();
}
