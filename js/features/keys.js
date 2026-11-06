// Keyboard shortcuts: Space = start/pause, Enter = finish the selected split.
import { toggleRun, finish } from "./tasks.js";

export function onKey(e) {
  if (e.target.closest && e.target.closest("input, textarea, select, dialog, button, li.split")) return;
  if (e.code === "Space") { e.preventDefault(); toggleRun(); }
  else if (e.key === "Enter") finish();
}
