# Time_Managment_Speedrun_Timer
Speedrun timer-esque progressive web app to help with time managment.
Go to https://stanleyzihanfan.github.io/Time_Managment_Speedrun_Timer/

## Where things live

```
index.html              Page markup (all dialogs live here too)
manifest.webmanifest    PWA manifest
sw.js                   Service worker (offline cache). Add new files to FILES and bump CACHE.
icon-192.png, icon-512.png

css/
  theme.css             Colors, fonts, tag colors (dark + light). Start here to restyle.
  base.css              Reset, buttons, form fields
  layout.css            Header clock, current split, controls, search bar, split list
  tags.css              Tag chips, color swatches, tag editor
  dialogs.css           Dialogs, sync status, toast notifications
  responsive.css        Small-window / pop-out tweaks

js/
  main.js               Entry point: wires everything together
  core/
    constants.js        Storage keys, tag colors, sort options
    state.js            Saved data + save()/mutate()/commit()
    time.js             Time formatting and live elapsed/remaining
    tagdata.js          Tag helpers (identity, cleaning)
    view.js             UI-only state: bulk mode, search text, filters
    dom.js, util.js     Small helpers
  features/
    tasks.js            Start/pause, select, finish, add/edit/delete, reset
    tags.js             Tag chips + tag editor in the task dialog
    listbar.js          Search, filter, sort
    bulk.js             Bulk select actions
    prefs.js            Theme + sort preference (per device)
    popout.js           Always-on-top pop-out window
    settings.js         Settings dialog
    sync.js             Firestore sync + sign-in
    io.js               Export / import JSON
    keys.js             Keyboard shortcuts
  ui/
    render.js           Draws the list and the live timers
    toast.js            Toast notifications
    dialogs.js          Confirm / estimate dialogs
```

## Running locally
The app uses ES modules, so open it through a local server rather than double-clicking index.html:

    python3 -m http.server 8000

then visit http://localhost:8000.
