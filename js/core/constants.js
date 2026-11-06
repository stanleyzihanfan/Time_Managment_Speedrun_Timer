// Storage keys
export const KEY = "timerOrganizer.v1";
export const CFG_KEY = "timerOrganizer.firebase";
export const PREF_KEY = "timerOrganizer.prefs";
export const PENDING_TOAST_KEY = "timerOrganizer.pendingToast";

// Tag colors. To add one: add it here, then add --tag-<id> in css/theme.css
// and a ".c-<id>" rule in css/tags.css.
export const TAG_COLORS = [
  { id: "red", label: "Red" },
  { id: "orange", label: "Orange" },
  { id: "yellow", label: "Yellow" },
  { id: "green", label: "Green" },
  { id: "blue", label: "Blue" },
  { id: "purple", label: "Purple" },
  { id: "gray", label: "Gray" },
];
export const MAX_TAG_NAME = 30;

// Sort choices for the task list. To add one, add it here and in compare() in features/listbar.js.
export const SORTS = [
  { id: "created", label: "Time created" },
  { id: "name", label: "Name" },
  { id: "remaining", label: "Time remaining" },
  { id: "estimate", label: "Estimated time" },
  { id: "spent", label: "Time spent" },
];
