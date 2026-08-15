// Game Dim — while the game is the active window, everything else (the wallpaper,
// the panels, the other windows) drops to a low opacity. KWin composites over
// black, so what surrounds a borderless / windowed game is effectively black.
//
// Purely event-driven: no timer, no periodic scan of the window list.

let cfg = {
    opacity: 0.1,
    borderlessIsGame: true,
    fullscreenIsGame: true,
    dimPanels: true,
    classes: []
};

function loadConfig() {
    cfg.opacity = Math.max(0, Math.min(100, readConfig("Opacity", 10))) / 100;
    cfg.borderlessIsGame = readConfig("BorderlessIsGame", true);
    cfg.fullscreenIsGame = readConfig("FullscreenIsGame", true);
    cfg.dimPanels = readConfig("DimPanels", true);
    cfg.classes = String(readConfig("GameClasses", "steam_app_,gamescope,lutris,heroic"))
        .split(",")
        .map(function (s) { return s.trim().toLowerCase(); })
        .filter(function (s) { return s.length > 0; });
}

function key(w) {
    return String(w.internalId);
}

// KWin's own windows — the task switcher above all, but also its OSDs — carry no
// window class at all. They are chrome rather than content: dimming the switcher
// makes the thing you alt-tab with unreadable, and it must never pass for a game
// either, since it arrives borderless and takes the focus.
function isInternal(w) {
    return String(w.resourceClass) === "";
}

function isGame(w) {
    if (w === null || w === undefined || w.normalWindow !== true || isInternal(w)) {
        return false;
    }
    if (cfg.fullscreenIsGame && w.fullScreen === true) {
        return true;
    }
    if (cfg.borderlessIsGame && w.noBorder === true) {
        return true;
    }
    const cls = String(w.resourceClass).toLowerCase();
    for (let i = 0; i < cfg.classes.length; i++) {
        if (cls.indexOf(cfg.classes[i]) === 0) {
            return true;
        }
    }
    return false;
}

function dimmable(w) {
    if (w.deleted === true || isInternal(w)) {
        return false;
    }
    // Menus, task-manager previews and OSDs are things you summoned on purpose and
    // are gone in a second. Dimming them buys nothing and makes them unreadable.
    if (w.popupWindow === true || w.tooltip === true || w.onScreenDisplay === true) {
        return false;
    }
    if (!cfg.dimPanels && w.dock === true) {
        return false;
    }
    return true;
}

// ---- state ----------------------------------------------------------------

// Effects that put every window on screen at once. Dimming while one of them is
// up would show you a grid of black thumbnails, so it is lifted for their duration.
const SUSPENDING_EFFECTS = ["overview", "windowview", "desktopgrid"];

// Key of the current game, or null.
let gameKey = null;
// True while something is on screen that the dimming has to get out of the way of:
// the game is still the game, we are just not dimming for it right now.
let suspended = false;
// Popups and tooltips currently open, by internalId. A task-manager preview is a
// live thumbnail of the window it mirrors, so it inherits its opacity — the only
// way to show it bright is to stop dimming while it is up.
const suspenders = {};
let suspenderCount = 0;
// internalId -> opacity before dimming. We never stash properties on the window
// object: the JS wrapper is not guaranteed to be the same across calls.
const saved = {};

// KWin exposes no signal for an effect starting or stopping — only the
// workspace.isEffectActive() query — so this one thing has to be watched rather
// than awaited. It has to be watched *fast*: Overview composes its backdrop from
// the first frames it draws, so at 250 ms you get a black hole with the dimming
// baked in, no matter that the opacities are restored a moment later. Three string
// lookups per frame is nothing next to the game already running, and the timer
// only ticks while a game is active.
const effectWatch = new QTimer();
effectWatch.interval = 20;
effectWatch.timeout.connect(updateSuspension);

function dim(w) {
    const k = key(w);
    if (saved[k] !== undefined || !dimmable(w)) {
        return;
    }
    // An opacity already at (or below) the dim level can only be a leftover from
    // a previous load of this script — KWin gives no unload event to restore in,
    // so a reload mid-game would otherwise record 0.1 as the window's "normal"
    // and undimming would become a no-op.
    saved[k] = w.opacity > cfg.opacity ? w.opacity : 1.0;
    w.opacity = cfg.opacity;
}

function undim(w) {
    const k = key(w);
    if (saved[k] === undefined) {
        return;
    }
    w.opacity = saved[k];
    delete saved[k];
}

function applyDim() {
    const windows = workspace.windowList();
    for (let i = 0; i < windows.length; i++) {
        if (key(windows[i]) !== gameKey) {
            dim(windows[i]);
        }
    }
}

function clearDim() {
    const windows = workspace.windowList();
    for (let i = 0; i < windows.length; i++) {
        undim(windows[i]);
    }
}

function suspendingEffectActive() {
    for (let i = 0; i < SUSPENDING_EFFECTS.length; i++) {
        if (workspace.isEffectActive(SUSPENDING_EFFECTS[i])) {
            return true;
        }
    }
    return false;
}

// A popup you opened is worth un-dimming for; a notification that opened itself is
// not — it would blow the whole desktop back to full brightness mid-game.
function suspendsDimming(w) {
    if (w.notification === true || w.criticalNotification === true || w.onScreenDisplay === true) {
        return false;
    }
    return w.tooltip === true || w.popupWindow === true;
}

function addSuspender(w) {
    const k = key(w);
    if (suspenders[k] === undefined) {
        suspenders[k] = true;
        suspenderCount++;
    }
}

function removeSuspender(w) {
    const k = key(w);
    if (suspenders[k] !== undefined) {
        delete suspenders[k];
        suspenderCount--;
    }
}

function updateSuspension() {
    const active = suspenderCount > 0 || suspendingEffectActive();
    if (active !== suspended) {
        suspended = active;
        refreshDim();
    }
}

function refreshDim() {
    if (gameKey !== null && !suspended) {
        applyDim();
    } else {
        clearDim();
    }
}

function enterGame(game) {
    gameKey = key(game);
    suspended = suspenderCount > 0 || suspendingEffectActive();
    refreshDim();
    effectWatch.start();
}

function leaveGame() {
    effectWatch.stop();
    gameKey = null;
    suspended = false;
    clearDim();
}

// ---- events ---------------------------------------------------------------

function evaluate(w) {
    if (isGame(w)) {
        if (gameKey !== key(w)) {
            // Another window becomes the current game: clean up the old one first.
            if (gameKey !== null) {
                leaveGame();
            }
            enterGame(w);
        }
    } else if (gameKey !== null) {
        leaveGame();
    }
}

function onActivated(w) {
    // The task switcher takes the focus while it is up. Letting that count as
    // leaving the game would flash the whole desktop back to full brightness for
    // as long as you hold Alt.
    if (w !== null && w !== undefined && isInternal(w)) {
        return;
    }
    evaluate(w);
}

// A game can go borderless / fullscreen after it is already active, or back.
function onWindowChanged(w) {
    if (w === workspace.activeWindow) {
        evaluate(w);
    }
}

function onAdded(w) {
    w.fullScreenChanged.connect(function () { onWindowChanged(w); });
    w.minimizedChanged.connect(function () { onWindowChanged(w); });

    if (suspendsDimming(w)) {
        addSuspender(w);
        updateSuspension();
        return;
    }
    // A window born mid-game is dimmed on the spot — no rescan.
    if (gameKey !== null && !suspended && key(w) !== gameKey) {
        dim(w);
    }
}

function onRemoved(w) {
    const k = key(w);
    delete saved[k];
    removeSuspender(w);
    updateSuspension();
    if (gameKey === k) {
        leaveGame();
    }
}

function onConfigChanged() {
    if (gameKey !== null) {
        leaveGame();
    }
    loadConfig();
    evaluate(workspace.activeWindow);
}

// KWin offers no unload event, so a reload — or a crash — can leave windows dimmed
// with the saved opacities gone. Anything still sitting at the dim level when we
// start up is ours and nobody is left to restore it.
function recoverLeftovers() {
    const windows = workspace.windowList();
    for (let i = 0; i < windows.length; i++) {
        if (windows[i].opacity <= cfg.opacity) {
            windows[i].opacity = 1.0;
        }
    }
}

loadConfig();
recoverLeftovers();
workspace.windowList().forEach(onAdded);
workspace.windowAdded.connect(onAdded);
workspace.windowRemoved.connect(onRemoved);
workspace.windowActivated.connect(onActivated);
options.configChanged.connect(onConfigChanged);

evaluate(workspace.activeWindow);
