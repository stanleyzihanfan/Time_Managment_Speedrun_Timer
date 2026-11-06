// The saved app data (tasks + timer) and the functions that change it.
import { KEY } from "./constants.js";
import { now, uid } from "./util.js";
import { cleanTags } from "./tagdata.js";

export function blank() {
  return { tasks: [], offTrack: 0, selectedId: null, running: false, segStart: 0, totalAccum: 0, updatedAt: 0 };
}

export function sanitize(s) {
  const b = blank();
  if (!s || !Array.isArray(s.tasks)) throw new Error("Not a Timer Organizer file");
  b.tasks = s.tasks.map((t) => ({
    id: String(t.id || uid()),
    name: String(t.name || "Task").slice(0, 80),
    est: Math.max(0, Number(t.est) || 0),
    elapsed: Math.max(0, Number(t.elapsed) || 0),
    done: !!t.done,
    tags: cleanTags(t.tags),
    created: Number(t.created) || 0,
  }));
  b.offTrack = Math.max(0, Number(s.offTrack) || 0);
  b.totalAccum = Math.max(0, Number(s.totalAccum) || 0);
  b.selectedId = b.tasks.some((t) => t.id === s.selectedId && !t.done) ? s.selectedId : null;
  b.running = !!s.running;
  b.segStart = Number(s.segStart) || 0;
  b.updatedAt = Number(s.updatedAt) || 0;
  if (b.running && !b.segStart) b.running = false;
  return b;
}

function load() {
  try {
    return sanitize(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return blank();
  }
}

// One shared object. Other modules read it directly; replaceState() swaps its contents.
export const state = load();
export function replaceState(next) { Object.assign(state, next); }

export const selTask = () => state.tasks.find((t) => t.id === state.selectedId) || null;
export const findTask = (id) => state.tasks.find((t) => t.id === id) || null;

/* Move running time into the active entry (selected task or Off-Track). */
export function commit() {
  if (!state.running) return;
  const n = now();
  const d = Math.max(0, n - state.segStart);
  const t = selTask();
  if (t) t.elapsed += d; else state.offTrack += d;
  state.totalAccum += d;
  state.segStart = n;
}

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { console.warn("Could not save", e); }
}

// Things that should happen after every save (re-render, cloud push). Registered in main.js.
const subscribers = [];
export function subscribe(fn) { subscribers.push(fn); }

export function save() {
  state.updatedAt = now();
  persist();
  subscribers.forEach((fn) => fn());
}

export function mutate(fn) {
  commit();
  fn();
  save();
}
