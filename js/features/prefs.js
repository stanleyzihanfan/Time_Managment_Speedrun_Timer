// Per-device preferences: theme and list sort.
import { PREF_KEY } from "../core/constants.js";
import { docs } from "../core/dom.js";

const DEFAULTS = { theme: "system", sort: "created", sortDir: "asc" };

function loadPrefs() {
  const out = { ...DEFAULTS };
  try {
    const raw = JSON.parse(localStorage.getItem(PREF_KEY) || "{}");
    for (const k of Object.keys(DEFAULTS)) if (k in raw) out[k] = raw[k];
  } catch {}
  return out;
}

export const prefs = loadPrefs();

export function savePrefs() {
  try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch {}
}

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

export function applyPrefs() {
  const theme = prefs.theme === "system" ? (darkQuery.matches ? "dark" : "light") : prefs.theme;
  for (const d of docs()) d.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === "light" ? "#f3f5f9" : "#1c2331";
}

export function initPrefs() {
  darkQuery.addEventListener("change", () => { if (prefs.theme === "system") applyPrefs(); });
}
