// Toast notifications. Types: "success" (green), "error" (red), "info".
import { $ } from "../core/dom.js";
import { PENDING_TOAST_KEY } from "../core/constants.js";

function popoverShow(box) {
  try {
    if (!box.showPopover) return;
    if (box.matches(":popover-open")) box.hidePopover();
    box.showPopover(); // re-showing moves it above any open dialog
  } catch { /* popover unsupported: the plain fixed box still works */ }
}
function popoverHide(box) {
  try { if (box.hidePopover && box.matches(":popover-open")) box.hidePopover(); } catch {}
}

export function toast(message, { type = "info", action = null, ms } = {}) {
  const box = $("#toasts");
  const doc = box.ownerDocument;
  const el = doc.createElement("div");
  el.className = "toast " + type;
  el.setAttribute("role", type === "error" ? "alert" : "status");
  const text = doc.createElement("span");
  text.textContent = message;
  el.append(text);

  const remove = () => {
    el.remove();
    if (!box.children.length) popoverHide(box);
  };
  if (action) {
    const b = doc.createElement("button");
    b.type = "button";
    b.textContent = action.label;
    b.onclick = (e) => { e.stopPropagation(); action.run(); remove(); };
    el.append(b);
  }
  el.onclick = remove;

  while (box.children.length >= 3) box.firstChild.remove();
  box.append(el);
  popoverShow(box);
  setTimeout(remove, ms ?? (type === "error" ? 7000 : action ? 6000 : 4000));
}

/* For actions that reload the page: show the toast after the reload. */
export function toastAfterReload(message, type = "info") {
  try { sessionStorage.setItem(PENDING_TOAST_KEY, JSON.stringify({ message, type })); } catch {}
}
export function showPendingToast() {
  try {
    const p = JSON.parse(sessionStorage.getItem(PENDING_TOAST_KEY));
    sessionStorage.removeItem(PENDING_TOAST_KEY);
    if (p) toast(p.message, { type: p.type });
  } catch {}
}
