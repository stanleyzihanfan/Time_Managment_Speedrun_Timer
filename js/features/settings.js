// The settings dialog: theme, pop-out toggle. (Sync controls live in sync.js.)
import { $ } from "../core/dom.js";
import { prefs, savePrefs, applyPrefs } from "./prefs.js";
import { popOut, closePip, updatePopUI } from "./popout.js";
import { updateSyncUI, fillCfgText } from "./sync.js";

export function initSettings() {
  $("#settingsBtn").onclick = () => {
    fillCfgText();
    updateSyncUI();
    $("#themeSel").value = prefs.theme;
    updatePopUI();
    $("#settingsDlg").showModal();
  };
  $("#settingsClose").onclick = () => $("#settingsDlg").close();

  $("#themeSel").onchange = (e) => { prefs.theme = e.target.value; savePrefs(); applyPrefs(); };

  // The checkbox just mirrors whether the pop-out is open (see updatePopUI).
  $("#topChk").onchange = (e) => {
    if (e.target.checked) {
      $("#settingsDlg").close();
      popOut();
    } else {
      closePip();
    }
  };
}
