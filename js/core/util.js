export const now = () => Date.now();
export const uid = () => Math.random().toString(36).slice(2, 10) + now().toString(36);

export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
