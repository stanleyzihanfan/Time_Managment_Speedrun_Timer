import { state } from "./state.js";
import { now } from "./util.js";

export function fmt(ms, dec) {
  ms = Math.max(0, ms);
  const tenths = Math.floor(ms / 100) % 10;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, "0");
  let out = h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
  if (dec) out += "." + tenths;
  return out;
}

export function fmtDiff(ms, dec) {
  return (ms > 0 ? "+" : "-") + fmt(Math.abs(ms), dec);
}

/* Elapsed time on a task, including the segment that is currently running. */
export function live(t) {
  const running = state.running && state.selectedId === t.id;
  return t.elapsed + (running ? now() - state.segStart : 0);
}

export function liveOff() {
  return state.offTrack + (state.running && !state.selectedId ? now() - state.segStart : 0);
}

export const remainingOf = (t) => (t.done ? 0 : Math.max(0, t.est - live(t)));
export const totalTime = () => state.totalAccum + (state.running ? now() - state.segStart : 0);
