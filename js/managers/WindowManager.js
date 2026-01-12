import state from '../core/State.js';
import eventBus, { EVENTS } from '../core/EventBus.js';
import Window from '../components/Window.js';

class WindowManager {
    constructor() {
        this.container = document.getElementById('windows-container');
        this.windows = new Map(); // windowId -> Window instance

        state.subscribe('windows', (windows) => {
            this.syncWindows(windows);
        });

        // Hydrate from persisted state (if any) on startup.
        this.syncWindows(state.get('windows') ?? []);
    }

    createWindow(config) {
        const windowData = state.addWindow(config);
        state.setState({ lastActivityAt: Date.now() }, { persist: false });
        eventBus.publish(EVENTS.WINDOW_CREATED, { windowId: windowData.id, config });
        return windowData.id;
    }

    closeWindow(windowId) {
        const window = this.windows.get(windowId);
        if (window) {
            window.destroy();
            this.windows.delete(windowId);
            state.removeWindow(windowId);
            state.bumpCounter('windowsClosed', 1, { persist: false });
            state.setState({ lastActivityAt: Date.now() }, { persist: false });
            eventBus.publish(EVENTS.WINDOW_CLOSED, { windowId });
        }
    }

    getWindow(windowId) {
        return this.windows.get(windowId);
    }

    syncWindows(windowsState) {
        const desiredIds = new Set((windowsState ?? []).map(w => w.id));

        // Remove windows that are no longer in state.
        for (const [id, instance] of this.windows.entries()) {
            if (!desiredIds.has(id)) {
                instance.destroy();
                this.windows.delete(id);
            }
        }

        // Create or update windows based on state.
        (windowsState ?? []).forEach(windowData => {
            const existing = this.windows.get(windowData.id);
            if (!existing) {
                const win = new Window(windowData, this);
                this.windows.set(windowData.id, win);
                this.container.appendChild(win.element);
                return;
            }
            existing.update(windowData);
        });
    }

    focusWindow(windowId) {
        state.focusWindow(windowId);
        state.bumpCounter('windowsFocused', 1, { persist: false });
        state.setState({ lastActivityAt: Date.now() }, { persist: false });
        eventBus.publish(EVENTS.WINDOW_FOCUSED, { windowId });
    }

    minimizeWindow(windowId) {
        state.minimizeWindow(windowId);
        state.bumpCounter('windowsMinimized', 1, { persist: false });
        state.setState({ lastActivityAt: Date.now() }, { persist: false });
        eventBus.publish(EVENTS.WINDOW_MINIMIZED, { windowId });
    }

    restoreWindow(windowId) {
        state.restoreWindow(windowId);
        state.bumpCounter('windowsRestored', 1, { persist: false });
        state.setState({ lastActivityAt: Date.now() }, { persist: false });
        eventBus.publish(EVENTS.WINDOW_RESTORED, { windowId });
    }

    toggleMaximize(windowId) {
        state.toggleMaximize(windowId);
        const window = state.get('windows').find(w => w.id === windowId);
        state.setState({ lastActivityAt: Date.now() }, { persist: false });
        eventBus.publish(EVENTS.WINDOW_MAXIMIZED, {
            windowId,
            isMaximized: window?.isMaximized
        });
    }

    updateWindowPosition(windowId, x, y) {
        state.updateWindow(windowId, { x, y }, { persist: false });
        state.bumpCounter('windowsMoved', 1, { persist: false });
        eventBus.publish(EVENTS.WINDOW_MOVED, { windowId, x, y });
    }

    updateWindowSize(windowId, width, height) {
        state.updateWindow(windowId, { width, height }, { persist: false });
        state.bumpCounter('windowsResized', 1, { persist: false });
        eventBus.publish(EVENTS.WINDOW_RESIZED, { windowId, width, height });
    }

    getActiveWindows() {
        return Array.from(this.windows.keys());
    }

    closeAllWindows() {
        const windowIds = Array.from(this.windows.keys());
        windowIds.forEach(id => this.closeWindow(id));
    }
}

export default WindowManager;
