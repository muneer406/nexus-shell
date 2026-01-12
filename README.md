# Nexus Shell

A browser-based desktop shell built with Vanilla JavaScript, HTML, and CSS.

This is a learning-focused project: it has a working window system + taskbar/start menu, with “apps” evolving over time.

## Quick start

Because this project uses ES modules, it’s best to run it via a local web server.

- Python: `python -m http.server 5500`
- Then open: `http://localhost:5500/`

If you prefer, you can still try opening `index.html` directly, but some browsers block module imports from `file://`.

## What works today

- Desktop + acrylic/glass UI styling
- Taskbar with clock + start menu
- Window lifecycle: create, focus (z-index), minimize, maximize/restore, close
- State store with persistence (theme, wallpaper, mock file system, terminal history)
- Pub/sub event bus (with a launch request vs launch notification split)

## Architecture (high level)

- `State` is the single source of truth for windows + preferences.
- `EventBus` is used for cross-component communication.
  - `EVENTS.APP_LAUNCH_REQUESTED` triggers app launching.
  - `EVENTS.APP_LAUNCHED` is emitted after a window is created.
- `WindowManager` owns window creation and state sync.
- `Window` renders and handles drag + chrome controls.

More details live in `DOCUMENTATION.md`.

## Project structure

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
│   │   └── Storage.js
│   ├── managers/
│   │   ├── WindowManager.js
│   │   └── ThemeManager.js
│   ├── components/
│   │   ├── Window.js
│   │   └── Taskbar.js
│   ├── apps/                # (planned) app modules
│   └── main.js
├── assets/
├── DOCUMENTATION.md
└── PROJECT_PLAN.md
```

## Notes

- App content is still placeholder/in-progress; the shell (windowing/taskbar) is the foundation.

## License

Educational use.

Created as a final project for Web Development course at Scaler.

---

**Made with ⚡ and Vanilla JavaScript**

For questions or feedback, check the console for debug logs!
