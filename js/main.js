import state from './core/State.js';
import eventBus, { EVENTS } from './core/EventBus.js';
import storage from './core/Storage.js';
import Taskbar from './components/Taskbar.js';
import ContextMenu from './components/ContextMenu.js';
import WindowManager from './managers/WindowManager.js';
import ThemeManager from './managers/ThemeManager.js';
import { getWallpaperEntries } from './assets/wallpaperCatalog.js';
import { normalizeWallpaperConfig } from './core/wallpaper.js';

class NexusShell {
    constructor() {
        this.taskbar = null;
        this.contextMenu = null;
        this.windowManager = null;
        this.themeManager = null;
    }

    async init() {
        try {
            this.loadState();

            // Randomize wallpaper on each start when using image wallpapers.
            const normalized = normalizeWallpaperConfig(state.get('wallpaper'));
            if (normalized.type === 'image') {
                const entries = getWallpaperEntries();
                if (entries.length > 0) {
                    const picked = entries[Math.floor(Math.random() * entries.length)];
                    state.setState({ wallpaper: { type: 'image', src: picked.src, id: picked.id } });
                }
            }

            this.taskbar = new Taskbar();
            this.windowManager = new WindowManager();
            this.themeManager = new ThemeManager();

            this.setupEventListeners();

            this.themeManager.applyTheme(state.get('theme'));

            this.setupSmallScreenGate();

            this.contextMenu = new ContextMenu();

            this.startAutoSave();

        } catch (error) {
            console.error('Failed to initialize Nexus Shell:', error);
        }
    }

    setupSmallScreenGate() {
        const gate = document.getElementById('mobile-gate');
        const continueBtn = document.getElementById('mobile-gate-continue');
        if (!gate || !continueBtn) return;

        const applyGate = () => {
            const bypass = storage.load('mobileBypass', false);
            const tooSmall = window.innerWidth < 900 || window.innerHeight < 520;
            const locked = tooSmall && !bypass;

            document.body.classList.toggle('mobile-locked', locked);
            gate.classList.toggle('hidden', !locked);
        };

        continueBtn.addEventListener('click', () => {
            storage.save('mobileBypass', true);
            applyGate();
        });

        window.addEventListener('resize', applyGate);
        applyGate();
    }

    loadState() {
        const loaded = state.loadFromStorage();
        if (loaded) return;
    }

    setupEventListeners() {
        eventBus.subscribe(EVENTS.APP_LAUNCH_REQUESTED, ({ appName }) => {
            this.launchApp(appName);
        });

        eventBus.subscribe(EVENTS.WINDOW_CLOSE_REQUESTED, ({ windowId }) => {
            this.windowManager.closeWindow(windowId);
        });

        eventBus.subscribe(EVENTS.WINDOW_MINIMIZE_REQUESTED, ({ windowId }) => {
            this.windowManager.minimizeWindow(windowId);
        });

        eventBus.subscribe(EVENTS.WINDOW_RESTORE_REQUESTED, ({ windowId }) => {
            this.windowManager.restoreWindow(windowId);
        });

        eventBus.subscribe(EVENTS.WINDOW_FOCUS_REQUESTED, ({ windowId }) => {
            this.windowManager.focusWindow(windowId);
        });

        document.addEventListener('keydown', (e) => {
            state.setState({ lastActivityAt: Date.now() }, { persist: false });
            this.handleKeyboardShortcuts(e);
        });

        const markActivity = () => {
            state.setState({ lastActivityAt: Date.now() }, { persist: false });
        };
        document.addEventListener('pointerdown', markActivity, { passive: true });

        window.addEventListener('beforeunload', () => {
            state.saveToStorage();
        });
    }

    handleKeyboardShortcuts(e) {
        if (e.altKey && e.key === 'Tab') {
            e.preventDefault();
            this.switchWindow();
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
            e.preventDefault();
            const activeWindowId = state.get('activeWindowId');
            if (activeWindowId) {
                this.windowManager.closeWindow(activeWindowId);
            }
        }

        if (e.key === 'F11') {
            e.preventDefault();
            this.toggleFullscreen();
        }

        if (e.key === 'Escape') {
            this.contextMenu?.close();
            if (state.get('startMenuOpen')) {
                this.taskbar.closeStartMenu();
            }
        }
    }

    switchWindow() {
        const windows = state.get('windows');
        if (!windows || windows.length === 0) return;

        const visible = windows.filter(w => !w.isMinimized);
        const list = (visible.length > 0 ? visible : windows).slice().sort((a, b) => a.zIndex - b.zIndex);

        const activeId = state.get('activeWindowId');
        const currentIndex = list.findIndex(w => w.id === activeId);
        const nextIndex = currentIndex === -1 ? list.length - 1 : (currentIndex + 1) % list.length;
        const next = list[nextIndex];

        if (next.isMinimized) {
            this.windowManager.restoreWindow(next.id);
        } else {
            this.windowManager.focusWindow(next.id);
        }
    }

    launchApp(appName) {
        const appConfigs = {
            'terminal': {
                title: 'Nexus Terminal',
                icon: 'assets/icons/terminal.svg',
                appType: 'terminal',
                width: 600,
                height: 400,
            },
            'file-explorer': {
                title: 'File Explorer',
                icon: 'assets/icons/folder.svg',
                appType: 'file-explorer',
                width: 700,
                height: 500,
            },
            'system-monitor': {
                title: 'System Monitor',
                icon: 'assets/icons/activity.svg',
                appType: 'system-monitor',
                width: 500,
                height: 400,
            },
            'settings': {
                title: 'Settings',
                icon: 'assets/icons/settings.svg',
                appType: 'settings',
                width: 600,
                height: 500,
            },
        };

        const config = appConfigs[appName];
        if (config) {
            const existing = state.get('windows').find(w => w.appType === config.appType);
            if (existing) {
                if (existing.isMinimized) {
                    this.windowManager.restoreWindow(existing.id);
                } else {
                    this.windowManager.focusWindow(existing.id);
                }
                return;
            }

            const windowId = this.windowManager.createWindow(config);
            eventBus.publish(EVENTS.APP_LAUNCHED, { appName, config, windowId });
        } else {
            console.error(`Unknown app: ${appName}`);
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    startAutoSave() {
        setInterval(() => {
            state.saveToStorage();
        }, 30000);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new NexusShell();
        app.init();
    });
} else {
    const app = new NexusShell();
    app.init();
}
