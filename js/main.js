// Entry point: wires the modules together and starts the app.
import { subscribe } from "./core/state.js";
import { setRenderer } from "./core/view.js";
import { render, updateTimes } from "./ui/render.js";
import { showPendingToast } from "./ui/toast.js";
import { applyPrefs, initPrefs } from "./features/prefs.js";
import { initTasks } from "./features/tasks.js";
import { initBulk } from "./features/bulk.js";
import { initTagEditor } from "./features/tags.js";
import { initListBar } from "./features/listbar.js";
import { initIO } from "./features/io.js";
import { initPopout, updatePopUI } from "./features/popout.js";
import { initSettings } from "./features/settings.js";
import { initSync, schedulePush } from "./features/sync.js";
import { onKey } from "./features/keys.js";

setRenderer(render);
subscribe(render);        // redraw after every save
subscribe(schedulePush);  // push to the cloud after every save (if signed in)

initPrefs();
initTasks();
initBulk();
initTagEditor();
initListBar();
initIO();
initPopout();
initSettings();
document.addEventListener("keydown", onKey);

applyPrefs();
render();
updatePopUI();
setInterval(updateTimes, 100);
initSync();
showPendingToast();

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
