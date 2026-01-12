class EventBus {
    constructor() {
        this.events = {};
    }

    subscribe(eventName, callback) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }

        this.events[eventName].push(callback);

        // Return unsubscribe function
        return () => {
            this.events[eventName] = this.events[eventName].filter(cb => cb !== callback);
        };
    }

    publish(eventName, data) {
        if (!this.events[eventName]) {
            return;
        }

        this.events[eventName].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for ${eventName}:`, error);
            }
        });
    }

    once(eventName, callback) {
        const unsubscribe = this.subscribe(eventName, (data) => {
            callback(data);
            unsubscribe();
        });
    }

    clear(eventName) {
        if (eventName) {
            delete this.events[eventName];
        } else {
            this.events = {};
        }
    }

    getEventNames() {
        return Object.keys(this.events);
    }

    getSubscriberCount(eventName) {
        return this.events[eventName] ? this.events[eventName].length : 0;
    }
}

// Create singleton instance
const eventBus = new EventBus();

// Define standard event names as constants
export const EVENTS = {
    // Window Events
    WINDOW_CLOSE_REQUESTED: 'window:closeRequested',
    WINDOW_FOCUS_REQUESTED: 'window:focusRequested',
    WINDOW_MINIMIZE_REQUESTED: 'window:minimizeRequested',
    WINDOW_RESTORE_REQUESTED: 'window:restoreRequested',

    WINDOW_CREATED: 'window:created',
    WINDOW_CLOSED: 'window:closed',
    WINDOW_FOCUSED: 'window:focused',
    WINDOW_MINIMIZED: 'window:minimized',
    WINDOW_MAXIMIZED: 'window:maximized',
    WINDOW_RESTORED: 'window:restored',
    WINDOW_MOVED: 'window:moved',
    WINDOW_RESIZED: 'window:resized',

    // App Events
    APP_LAUNCH_REQUESTED: 'app:launchRequested',
    APP_LAUNCHED: 'app:launched',
    APP_CLOSED: 'app:closed',

    // UI Events
    START_MENU_TOGGLED: 'ui:startMenuToggled',
    CONTEXT_MENU_OPENED: 'ui:contextMenuOpened',
    CONTEXT_MENU_CLOSED: 'ui:contextMenuClosed',
    CONTEXT_MENU_REQUESTED: 'ui:contextMenuRequested',
    CONTEXT_MENU_ACTION: 'ui:contextMenuAction',
    THEME_CHANGED: 'ui:themeChanged',
    WALLPAPER_CHANGED: 'ui:wallpaperChanged',

    // Terminal Events
    COMMAND_EXECUTED: 'terminal:commandExecuted',

    // File System Events
    FILE_CREATED: 'fs:fileCreated',
    FILE_DELETED: 'fs:fileDeleted',
    DIRECTORY_CHANGED: 'fs:directoryChanged',
};

export default eventBus;
