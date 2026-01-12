# Nexus Shell

**Nexus Shell** is a browser-based Virtual Operating System (V-OS): a complete desktop-style workspace implemented with Vanilla JavaScript (ES modules), HTML, and CSS. It provides a window manager, taskbar + start menu, a terminal, a virtual file system + file explorer, settings (theme + wallpapers), and a live system monitor.

Course context: **Web Dev II (Batch 2029) End-term Project**.

This project intentionally avoids frameworks to demonstrate architectural thinking, DOM mastery, and state-driven UI design using only browser-native primitives.

---

## Inspiration

This project is very warmly inspired by my portfolio website: https://muneer320.tech

My portfolio is also a web-based OS simulation (inspired by Arch Linux) built with React. Building that project made me want to recreate the same “desktop in the browser” experience from scratch in Vanilla JavaScript, removing framework abstractions and proving I can design the full architecture myself.

---

## Problem statement

Modern web projects often depend on heavy frameworks even for highly interactive interfaces. The goal of Nexus Shell is to prove the opposite: a unified, OS-like browser workspace can be built with strong fundamentals.

Nexus Shell aligns most closely with these course themes:

- **Information Management & Digital Organization**: a navigable virtual file system with file actions, navigation, and preview.

- **User Interaction & Experience Systems**: windowing UX, taskbar/start menu flows, feedback states, and interaction edge cases.

- **Digital Dashboards & Visualization Systems**: a real-time System Monitor reporting session, storage, DOM, and performance signals.

---

## Features implemented

### Window Management (The Desktop Shell)

- **Full Lifecycle:** Dynamically create, focus (z-index), minimize, maximize, and destroy window instances.
- **Dynamic Interactivity:** Real-time dragging and resizing with viewport collision detection.
- **Taskbar Integration:** Active state synchronization between windows and the taskbar.
- **State Persistence:** Window positions, sizes, and z-order are saved to `LocalStorage` and restored on refresh.



### Apps

#### Virtual File System & Explorer

* **Tree-Based Logic:** A JavaScript-object-driven file system supporting nested directories.

* **CRUD Actions:** Create, Rename, and Delete files/folders with instant DOM updates.

* **Navigation:** Path-bar navigation and home-directory shortcuts.

#### Terminal

- Command parsing with quoted argument support
- Command history (persisted) with arrow-key navigation
- Built-in commands including:
  - `help`, `clear`, `cls`, `exit`
  - File system commands: `ls`, `cd`, `pwd`, `mkdir`, `touch`, `rm`
  - System commands: `open`, `close`, `theme`, `wallpaper`, `stats`
- Wallpaper command supports structured config:
  - `wallpaper image random|<id>`
  - `wallpaper url <https://...>`
  - `wallpaper solid <#hex>`
  - `wallpaper gradient <#from> <#to> [direction]`

#### Settings

- **Theme**: light/dark UI chrome (CSS variables)
- **Wallpapers**: image catalog with thumbnails, solid color, gradient, and custom URL wallpapers
- **Robust wallpaper application**: preloading with fallback to default wallpaper on load failure
- **Random wallpaper** behavior when using image wallpapers (on startup and when switching to Images)

#### System Monitor (dashboard)

- **Live session stats** (uptime, last activity, commands executed)
- **Desktop stats** (open windows, visible windows, active app, DOM element counts)
- **Storage stats** (localStorage usage/percent estimate)
- **Performance stats** (time since load, memory usage when browser exposes it)
- **Event bus stats** (event types + subscriber counts)

---

## Technical Implementation (Rubric Alignment)

### 1. DOM Manipulation Depth

- **Dynamic Creation:** Every app and window is instantiated via `document.createElement` and template injection based on state.
- **Structural Logic:** Uses `appendChild` and `remove` for window lifecycle management.
- **Style Engine:** Runtime CSS variable manipulation and inline style calculated for drag/resize mechanics.



### 2. Event Handling & Interactivity

- **Event Delegation:** Optimized the Taskbar and Start Menu by attaching single listeners to parent containers.
- **Custom Event Bus:** Implemented a Pub/Sub pattern (`EventBus.js`) to decouple UI components from core managers.
- **Complex Inputs:** Handles Mousemove (dragging), Form Submissions (Terminal), and Keyboard events (History).



### 3. JS Logic & State Handling

- **Centralized State:** A single `State` object acts as the source of truth; UI components "react" to state changes.
- **Persistence:** Full application state is serialized to `LocalStorage`, ensuring a "real application" feel.



### 4. Edge Case & Error Handling

- **Input Validation:** Terminal commands are sanitized; the file system prevents duplicate naming or illegal characters.
- **Viewport Safety:** Windows cannot be dragged completely off-screen, preventing "lost" UI elements.
- **Storage Resilience:** Try-catch blocks handle potential `LocalStorage` quota errors.



---

## Project Structure

```
Nexus Shell/
├── index.html
├── css/
│   ├── main.css
│   ├── desktop.css
│   ├── window.css
│   └── apps.css
├── js/
│   ├── core/
│   │   ├── State.js
│   │   ├── EventBus.js
│   │   ├── Storage.js
│   │   └── wallpaper.js
│   ├── assets/
│   │   └── wallpaperCatalog.js
│   ├── managers/
│   │   ├── WindowManager.js
│   │   ├── ThemeManager.js
│   │   └── FileSystem.js
│   ├── components/
│   │   ├── Window.js
│   │   ├── Taskbar.js
│   │   └── ContextMenu.js
│   ├── apps/
│   │   ├── registry.js
│   │   ├── Terminal.js
│   │   ├── FileExplorer.js
│   │   ├── SystemMonitor.js
│   │   └── Settings.js
│   └── main.js
├── assets/
│   ├── icons/
│   └── wallpapers/
├── DOCUMENTATION.md
└── PROJECT_PLAN.md
```

---

## How to Run

1. 
**Direct:** Open `index.html` in any modern web browser.


2. **Recommended:** Use a local server (like Live Server in VS Code) to ensure ES Modules load correctly.

---

## Known Limitations

- **Sandbox Environment:** This is a simulated OS and cannot access real system-level processes or the local hardware file system.
- **Storage Limits:** Reliant on browser `LocalStorage` (approx. 5MB limit).
- **Browser Support:** Requires a modern browser supporting ES6 Modules and CSS Variables.

---

## AI assistance disclosure

AI tools were used as a productivity accelerator during development, but the project architecture and final implementation decisions were owned and reviewed by me.

Where AI helped:

- Documentation support: restructuring and polishing README/documentation wording
- Brainstorming: feature prioritization, UX flow discussion, and naming conventions
- Debugging assistance: help spotting edge cases and proposing minimal fixes (I validated and integrated changes)
- Tradeoff discussions: best practices around persistence, event-driven design, and modular app loading