# store.kde.org — Add Product (copy-paste)

**Product Name**
Game Dim

**Category** (tastează "kwin" în căutare)
Plasma 6 → KWin Scripts   *(categoryId 720 — „Kwin Scripts Plasma 6", cea din care citește Discover / „Get New Scripts")*

**Version**
1.0

**Link to Source/Code**
https://github.com/geodro/kde-game-dim

**Product Original or Modification**
Original

**License**
MIT

**Credit (CC-BY only)**
— lasă gol

**Tags**
kwin, kwin-script, gaming, dim, opacity, borderless, focus, plasma6, wayland, steam, proton

**Product Logo**
docs/logo.png (512×512)

**Gallery**
docs/gallery-before-after.png (1600×900)

**File**
game-dim-1.0.kwinscript

---

## Product Description

Everything around the game goes black, for KDE Plasma 6.

Play a borderless or windowed game that doesn't cover the whole screen and the wallpaper, the panels and every other window drop to 10% opacity. KWin composites over black, so what's left around the game is darkness. Alt-Tab out and it all comes back, instantly.

What it does:

• Windowed and borderless games too. The trigger is not "is it fullscreen" but "is this the game" — a 3072x1728 window on a 6144x1728 desktop still gets the treatment. The bright wallpaper and the second monitor stop pulling your eye mid-match.
• Black, not grey. Nothing is painted on top: the surrounding windows are simply made transparent, and KWin's compositing floor is black. 0% gives you pure, measured-at-zero black.
• The desktop counts as background. The Plasma desktop window is dimmed like any other, so the wallpaper goes with it. Panels too, unless you'd rather keep them readable.
• Knows a game when it sees one. Fullscreen, borderless, or a window class starting with steam_app_, gamescope, lutris, heroic. A Proton game is recognised without you configuring anything.
• Instant both ways. Dimming is applied on activation and undone the moment you leave. Every window's original opacity is remembered individually and restored exactly.
• New windows join in. A notification or a launcher popping up mid-game is dimmed as it appears.
• The switcher and the popups stay lit. Alt+Tab's switcher and KWin's other internal windows are left alone, and taking the focus doesn't count as leaving the game.
• Hovering the task manager lifts the dimming. Task-manager previews are live thumbnails and inherit the mirrored window's opacity, so the dimming steps aside while a preview or a panel menu is open. Notifications, which open themselves, deliberately don't.
• Overview gets out of the way. Open Overview, Present Windows or the Desktop Grid mid-game and the dimming lifts while they're on screen.
• Settings, not source edits. Opacity, the two detection rules, the class list and the panel behaviour live in a proper config page in System Settings, applied live.

Tested on Plasma 6 under Wayland, compatible with X11.

Pairs with "Fullscreen to New Desktop" (https://store.kde.org/p/2368744/) — one gives the game its own Space, the other blacks out whatever is left around it.

Install: System Settings → Window Management → KWin Scripts → Get New Scripts, or download the .kwinscript file and use "Install from File".

Source, issues and documentation: https://github.com/geodro/kde-game-dim

**Live:** https://store.kde.org/p/2368747/ (categoryId 720)
