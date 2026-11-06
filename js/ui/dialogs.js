// Promise-based dialogs (the browser's confirm/alert don't work well in the pop-out window).
import { $ } from "../core/dom.js";

export function ask(msg, ok = "OK", cancel = true) {
  return new Promise((res) => {
    const dlg = $("#askDlg");
    $("#askMsg").textContent = msg;
    $("#askOk").textContent = ok;
    $("#askCancel").hidden = !cancel;
    const done = (v) => { res(v); dlg.close(); };
    $("#askOk").onclick = () => done(true);
    $("#askCancel").onclick = () => done(false);
    dlg.onclose = () => res(false);
    dlg.showModal();
  });
}

export function askEst() {
  return new Promise((res) => {
    const dlg = $("#estDlg");
    $("#estVal").value = 25;
    $("#estForm").onsubmit = (e) => {
      e.preventDefault();
      const v = parseFloat($("#estVal").value);
      res(isNaN(v) ? null : Math.max(0, v));
      dlg.close();
    };
    $("#estCancel").onclick = () => { res(null); dlg.close(); };
    dlg.onclose = () => res(null);
    dlg.showModal();
    $("#estVal").select();
  });
}
