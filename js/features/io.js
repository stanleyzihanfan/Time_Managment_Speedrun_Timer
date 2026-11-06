// Export / import the app data as a JSON file.
import { $ } from "../core/dom.js";
import { state, replaceState, sanitize, commit, persist, save } from "../core/state.js";
import { resetBulk } from "../core/view.js";
import { ask } from "../ui/dialogs.js";
import { toast } from "../ui/toast.js";

function exportData() {
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
  toast("Exported to a file.", { type: "success" });
}

async function importFile(e) {
  const f = e.target.files[0];
  e.target.value = "";
  if (!f) return;
  try {
    const raw = JSON.parse(await f.text());
    const s = sanitize(raw.state || raw);
    if (!(await ask("Replace everything on this device with the imported file?", "Replace"))) return;
    s.running = false;
    s.segStart = 0;
    replaceState(s);
    resetBulk();
    save();
    toast(`Imported ${s.tasks.length} task${s.tasks.length === 1 ? "" : "s"}.`, { type: "success" });
  } catch (err) {
    toast("Import failed: " + err.message, { type: "error" });
  }
}

export function initIO() {
  $("#exportBtn").onclick = exportData;
  $("#importBtn").onclick = () => $("#importFile").click();
  $("#importFile").onchange = importFile;
}
