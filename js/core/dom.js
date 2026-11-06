export const app = document.getElementById("app");

// Scoped to #app so it keeps working when #app is moved into the pop-out window.
export const $ = (s) => app.querySelector(s) || document.querySelector(s);

// The pop-out (Document Picture-in-Picture) window, if open.
export const ui = { pip: null };
export const docs = () => (ui.pip ? [document, ui.pip.document] : [document]);
