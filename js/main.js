import state from './core/State.js';
import eventBus, { EVENTS } from './core/EventBus.js';
import storage from './core/Storage.js';
import Taskbar from './components/Taskbar.js';
import WindowManager from './managers/WindowManager.js';
import ThemeManager from './managers/ThemeManager.js';

class NexusShell {
    constructor() {
        this.taskbar = null;
        this.windowManager = null;
        this.themeManager = null;
    }

    async init() {
        try {
            this.loadState();

            this.taskbar = new Taskbar();
            this.windowManager = new WindowManager();
            this.themeManager = new ThemeManager();

            this.setupEventListeners();

            this.themeManager.applyTheme(state.get('theme'));

            this.setupDesktopContextMenu();

            this.startAutoSave();

        } catch (error) {
            console.error('Failed to initialize Nexus Shell:', error);
        }
    }

    loadState() {
        const loaded = state.loadFromStorage();
        if (loaded) return;
    }

    setupEventListeners() {
        eventBus.subscribe(EVENTS.APP_LAUNCH_REQUESTED, ({ appName }) => {
            this.launchApp(appName);
        });

        eventBus.subscribe(EVENTS.WINDOW_CLOSED, ({ windowId }) => {
            this.windowManager.closeWindow(windowId);
        });

        eventBus.subscribe(EVENTS.WINDOW_MINIMIZED, ({ windowId }) => {
            state.minimizeWindow(windowId);
        });

        eventBus.subscribe(EVENTS.WINDOW_RESTORED, ({ windowId }) => {
            state.restoreWindow(windowId);
        });

        eventBus.subscribe(EVENTS.WINDOW_FOCUSED, ({ windowId }) => {
            state.focusWindow(windowId);
        });

        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        window.addEventListener('beforeunload', () => {
            state.saveToStorage();
        });
    }

    setupDesktopContextMenu() {
        const desktop = document.getElementById('desktop');

        desktop.addEventListener('contextmenu', (e) => {
            if (e.target === desktop || e.target.classList.contains('desktop-icons')) {
                e.preventDefault();
                this.showDesktopContextMenu(e.clientX, e.clientY);
            }
        });

        document.addEventListener('click', () => {
            this.hideContextMenu();
        });
    }

    showDesktopContextMenu(x, y) {
        const contextMenu = document.getElementById('context-menu');
        const menuList = contextMenu.querySelector('.context-menu-list');

        menuList.innerHTML = `
            <li class="context-menu-item" data-action="refresh">Refresh</li>
            <div class="context-menu-divider"></div>
            <li class="context-menu-item" data-action="open-terminal">Open Terminal</li>
            <li class="context-menu-item" data-action="open-file-explorer">Open File Explorer</li>
            <div class="context-menu-divider"></div>
            <li class="context-menu-item" data-action="settings">Settings</li>
        `;

        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;
        contextMenu.classList.remove('hidden');

        menuList.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleContextMenuAction(action);
                this.hideContextMenu();
            });
        });
    }

    hideContextMenu() {
        const contextMenu = document.getElementById('context-menu');
        contextMenu.classList.add('hidden');
    }

    handleContextMenuAction(action) {
        switch (action) {
            case 'refresh':
                location.reload();
                break;
            case 'open-terminal':
                eventBus.publish(EVENTS.APP_LAUNCH_REQUESTED, { appName: 'terminal', source: 'context-menu' });
                break;
            case 'open-file-explorer':
                eventBus.publish(EVENTS.APP_LAUNCH_REQUESTED, { appName: 'file-explorer', source: 'context-menu' });
                break;
            case 'settings':
                eventBus.publish(EVENTS.APP_LAUNCH_REQUESTED, { appName: 'settings', source: 'context-menu' });
                break;
        }
    }

    handleKeyboardShortcuts(e) {
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
            this.hideContextMenu();
            if (state.get('startMenuOpen')) {
                this.taskbar.closeStartMenu();
            }
        }
    }

    launchApp(appName) {
        const appConfigs = {
            'terminal': {
                title: 'Nexus Terminal',
                icon: 'T',
                appType: 'terminal',
                width: 600,
                height: 400,
            },
            'file-explorer': {
                title: 'File Explorer',
                icon: 'F',
                appType: 'file-explorer',
                width: 700,
                height: 500,
            },
            'system-monitor': {
                title: 'System Monitor',
                icon: 'S',
                appType: 'system-monitor',
                width: 500,
                height: 400,
            },
            'settings': {
                title: 'Settings',
                icon: 'C',
                appType: 'settings',
                width: 600,
                height: 500,
            },
        };

        const config = appConfigs[appName];
        if (config) {
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
