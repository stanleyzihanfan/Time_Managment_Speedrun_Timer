// "Always on top": moves the app into a small Document Picture-in-Picture window.
import { $, app, ui } from "../core/dom.js";
import { applyPrefs } from "./prefs.js";
import { onKey } from "./keys.js";
import { toast } from "../ui/toast.js";

export const pipSupported = "documentPictureInPicture" in window;

export async function popOut() {
  if (!pipSupported || ui.pip) return;
  try {
    const w = await window.documentPictureInPicture.requestWindow({ width: 360, height: 520 });
    ui.pip = w;
    for (const ss of [...document.styleSheets]) {
      try {
        const st = w.document.createElement("style");
        st.textContent = [...ss.cssRules].map((r) => r.cssText).join("\n");
        w.document.head.appendChild(st);
      } catch {
        if (ss.href) {
          const l = w.document.createElement("link");
          l.rel = "stylesheet";
          l.href = ss.href;
          w.document.head.appendChild(l);
        }
      }
    }
    w.document.title = document.title;
    applyPrefs();
    w.document.body.append(app);
    w.document.addEventListener("keydown", onKey);
    w.addEventListener("pagehide", () => {
      document.body.prepend(app);
      ui.pip = null;
      updatePopUI();
    });
  } catch {
    ui.pip = null;
    toast("Couldn't open the pop-out window.", { type: "error" });
  }
  updatePopUI();
}

export function closePip() { if (ui.pip) ui.pip.close(); }

/* Keeps the button, the "timer is in the pop-out" note and the settings checkbox in step with reality. */
export function updatePopUI() {
  const open = !!ui.pip;
  $("#popBtn").hidden = !pipSupported || open;
  document.getElementById("popNote").hidden = !open;
  const chk = $("#topChk");
  chk.checked = open;
  chk.disabled = !pipSupported;
  $("#topNote").textContent = pipSupported
    ? "Opens the timer in a small pop-out window that stays above other apps. Close it to come back here."
    : "Not supported in this browser. Needs desktop Chrome or Edge 116 or newer.";
}

export function initPopout() {
  $("#popBtn").onclick = popOut;
  $("#popBack").onclick = closePip;
}
