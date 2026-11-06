// Pure helpers for tag objects: { color, name }. A tag's identity is color + name (case-insensitive).
import { TAG_COLORS, MAX_TAG_NAME } from "./constants.js";

const IDS = TAG_COLORS.map((c) => c.id);

export const tagKey = (g) => g.color + "|" + g.name.toLowerCase();
export const colorLabel = (id) => (TAG_COLORS.find((c) => c.id === id) || { label: id }).label;
export const tagLabel = (g) => g.name || colorLabel(g.color);

export function cleanTag(g) {
  if (!g || !IDS.includes(g.color)) return null;
  return { color: g.color, name: String(g.name || "").trim().slice(0, MAX_TAG_NAME) };
}

export function cleanTags(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const g = cleanTag(raw);
    if (!g || seen.has(tagKey(g))) continue;
    seen.add(tagKey(g));
    out.push(g);
  }
  return out;
}
