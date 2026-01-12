# Project Documentation: Nexus Shell

## 1. Overview

Nexus Shell is a browser-based desktop environment built with vanilla JavaScript, HTML, and CSS. It focuses on state-driven UI, window management, and lightweight persistence.

## 2. Constraints

- No frameworks (no React, no jQuery, no UI libraries)
- ES6+ modules (`import`/`export`)
- Heavy DOM manipulation
- Persistence via `localStorage`

## 3. Architecture

### 3.1 State-Driven UI

- A central `State` singleton holds application state (windows, focus, preferences).
- UI components subscribe to state keys and re-render minimal pieces.

Key file: `js/core/State.js`

### 3.2 Event Bus

Components communicate via a lightweight pub/sub bus.

Key file: `js/core/EventBus.js`

Important event convention:

- `EVENTS.APP_LAUNCH_REQUESTED` is used for “user requested to open an app” (start menu / context menu).
- `EVENTS.APP_LAUNCHED` is a notification emitted after the app window is created.

Window events follow the same pattern:

- `EVENTS.WINDOW_*_REQUESTED` are used as “commands” (Taskbar/Terminal/UI requests).
- `EVENTS.WINDOW_*` are notifications emitted after `WindowManager` mutates state.

This separation prevents accidental recursion and infinite event loops.

### 3.3 Window System

- `WindowManager` creates/destroys windows and syncs UI from state.
- Each `Window` instance is a DOM component that supports focus, dragging, and resizing.

Key files:

- `js/managers/WindowManager.js`
- `js/components/Window.js`

### 3.4 Apps

- Window content is provided by app modules under `js/apps/`.
- `Window` dynamically loads modules using `js/apps/registry.js` and mounts them into the window content area.

Key files:

- `js/apps/registry.js`
- `js/apps/Terminal.js`
- `js/apps/FileExplorer.js`

Notes:

- Some apps can request a “flush” layout (no window content padding). Terminal uses this so the dark terminal surface reaches the window border.

### 3.5 Context Menus

- The desktop right-click menu is implemented as a component to keep `main.js` smaller.

Key file:

- `js/components/ContextMenu.js`

Apps can request context menus without importing the component directly:

- Publish `EVENTS.CONTEXT_MENU_REQUESTED` with `{ x, y, items, context }`
- Listen for `EVENTS.CONTEXT_MENU_ACTION` with `{ action, context }`

### 3.4 Persistence

- Preferences (theme, wallpaper), virtual file system, terminal history, and window layout are persisted to `localStorage`.
- Window restore includes: open windows, positions/sizes, minimize/maximize state, z-index ordering, and the active window.

Key files:

- `js/core/State.js`
- `js/core/Storage.js`

Note:

- The file system and terminal history are currently foundation data structures used by future apps.

### 3.6 Virtual File System

- A lightweight virtual file system is implemented as a manager over the state tree.

Current capabilities:

- Path normalization (`/`, `.`, `..`)
- Navigation (`cd`, `navigateTo`, `goBack`, `pwd`)
- CRUD (`mkdir`, `touch`, `rm`, `rename`)

File Explorer usage:

- Uses `navigateTo()` for navigation so “Back” works.
- Includes a path bar (type a path and press Enter).
- Supports previewing image files when their file content is a URL/path.

Key file:

- `js/managers/FileSystem.js`

### 3.7 Wallpapers & Theming

- Theme (`light`/`dark`) controls UI chrome via CSS variables (window/taskbar/menu colors).
- Wallpaper is a structured config object stored in state and applied to the desktop.

Key files:

- `js/core/wallpaper.js` (normalization + apply-to-DOM)
- `js/assets/wallpaperCatalog.js` (image entries used by Settings)
- `js/managers/ThemeManager.js` (applies theme + wallpaper)

Wallpaper config shape (normalized):

- `{ type: 'image', src, id }`
- `{ type: 'url', url }`
- `{ type: 'solid', color }`
- `{ type: 'gradient', direction, from, to }`

Notes:

- Backward compatibility: older saved wallpaper strings are normalized into the new object form.
- Robustness: image/URL wallpapers are preloaded; on load failure the desktop falls back to the default local wallpaper.
- UX: when the current wallpaper type is `image`, Nexus Shell randomizes the image on startup. Switching “Wallpaper type” to Images in Settings also picks a random image.
- “Dynamic listing” in a static browser app cannot read directories at runtime, so Settings reads from a catalog module (which can be generated/updated when assets change).

## 4. UI Direction

The UI is styled to feel like a modern glass/acrylic OS:

- Translucent, blurred taskbar
- Rounded windows with soft shadows
- Wallpaper-driven desktop background (images/solid/gradient/URL)

Key files:

- `css/main.css`
- `css/desktop.css`
- `css/window.css`

## 5. Documentation Policy

Documentation is updated as features evolve:

- `DOCUMENTATION.md` describes architecture and conventions.
- `PROJECT_PLAN.md` tracks phases and MVP checklist.
- `README.md` stays user-facing (how to run, what works).

Last Updated: 2026-01-12
