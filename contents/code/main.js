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

function isGame(w) {
    if (w === null || w === undefined || w.normalWindow !== true) {
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
    if (w.deleted === true) {
        return false;
    }
    if (!cfg.dimPanels && w.dock === true) {
        return false;
    }
    return true;
}

// ---- state ----------------------------------------------------------------

// Key of the current game, or null. The only global state.
let gameKey = null;
// internalId -> opacity before dimming. We never stash properties on the window
// object: the JS wrapper is not guaranteed to be the same across calls.
const saved = {};

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

function enterGame(game) {
    gameKey = key(game);
    const windows = workspace.windowList();
    for (let i = 0; i < windows.length; i++) {
        if (key(windows[i]) !== gameKey) {
            dim(windows[i]);
        }
    }
}

function leaveGame() {
    gameKey = null;
    const windows = workspace.windowList();
    for (let i = 0; i < windows.length; i++) {
        undim(windows[i]);
    }
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

    // A window born mid-game is dimmed on the spot — no rescan.
    if (gameKey !== null && key(w) !== gameKey) {
        dim(w);
    }
}

function onRemoved(w) {
    const k = key(w);
    delete saved[k];
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
