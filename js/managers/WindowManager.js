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
    }

    createWindow(config) {
        const windowData = state.addWindow(config);
        const window = new Window(windowData, this);
        this.windows.set(windowData.id, window);
        this.container.appendChild(window.element);
        eventBus.publish(EVENTS.WINDOW_CREATED, { windowId: windowData.id, config });
        return windowData.id;
    }

    closeWindow(windowId) {
        const window = this.windows.get(windowId);
        if (window) {
            window.destroy();
            this.windows.delete(windowId);
            state.removeWindow(windowId);
            eventBus.publish(EVENTS.WINDOW_CLOSED, { windowId });
        }
    }

    getWindow(windowId) {
        return this.windows.get(windowId);
    }

    syncWindows(windowsState) {
        windowsState.forEach(windowData => {
            const window = this.windows.get(windowData.id);
            if (window) {
                window.update(windowData);
            }
        });
    }

    focusWindow(windowId) {
        state.focusWindow(windowId);
        eventBus.publish(EVENTS.WINDOW_FOCUSED, { windowId });
    }

    minimizeWindow(windowId) {
        state.minimizeWindow(windowId);
        eventBus.publish(EVENTS.WINDOW_MINIMIZED, { windowId });
    }

    toggleMaximize(windowId) {
        state.toggleMaximize(windowId);
        const window = state.get('windows').find(w => w.id === windowId);
        eventBus.publish(EVENTS.WINDOW_MAXIMIZED, {
            windowId,
            isMaximized: window?.isMaximized
        });
    }

    updateWindowPosition(windowId, x, y) {
        state.updateWindow(windowId, { x, y });
        eventBus.publish(EVENTS.WINDOW_MOVED, { windowId, x, y });
    }

    updateWindowSize(windowId, width, height) {
        state.updateWindow(windowId, { width, height });
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
