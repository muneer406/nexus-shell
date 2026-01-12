class State {
    constructor() {
        this.state = {
            windows: [],
            activeWindowId: null,
            nextWindowId: 1,
            maxZIndex: 100,

            currentDirectory: '/home',
            fileSystem: this.initializeFileSystem(),

            theme: 'light',
            wallpaper: 'aurora',

            sessionStart: Date.now(),
            commandsExecuted: 0,
            windowsCreated: 0,

            terminalHistory: [],

            startMenuOpen: false,
            contextMenuOpen: false,
        };

        this.listeners = {};
    }

    initializeFileSystem() {
        return {
            '/': {
                type: 'directory',
                name: 'root',
                children: {
                    'home': {
                        type: 'directory',
                        name: 'home',
                        children: {
                            'documents': {
                                type: 'directory',
                                name: 'documents',
                                children: {
                                    'readme.txt': {
                                        type: 'file',
                                        name: 'readme.txt',
                                        content: 'Welcome to Nexus Shell!',
                                        size: 26,
                                        created: Date.now(),
                                    }
                                }
                            },
                            'downloads': {
                                type: 'directory',
                                name: 'downloads',
                                children: {}
                            },
                            'pictures': {
                                type: 'directory',
                                name: 'pictures',
                                children: {}
                            }
                        }
                    },
                    'system': {
                        type: 'directory',
                        name: 'system',
                        children: {}
                    }
                }
            }
        };
    }

    getState() {
        return { ...this.state };
    }

    get(key) {
        return this.state[key];
    }

    setState(updates, options = {}) {
        const prevState = { ...this.state };
        this.state = { ...this.state, ...updates };

        Object.keys(updates).forEach(key => {
            if (this.listeners[key]) {
                this.listeners[key].forEach(callback => {
                    callback(this.state[key], prevState[key]);
                });
            }
        });

        if (this.listeners['*']) {
            this.listeners['*'].forEach(callback => {
                callback(this.state, prevState);
            });
        }

        if (options.persist !== false) {
            this.saveToStorage();
        }
    }

    subscribe(key, callback) {
        if (!this.listeners[key]) {
            this.listeners[key] = [];
        }
        this.listeners[key].push(callback);

        return () => {
            this.listeners[key] = this.listeners[key].filter(cb => cb !== callback);
        };
    }

    addWindow(windowData) {
        const window = {
            id: this.state.nextWindowId++,
            zIndex: this.state.maxZIndex++,
            isMinimized: false,
            isMaximized: false,
            isFocused: true,
            ...windowData,
        };

        const windows = this.state.windows.map(w => ({ ...w, isFocused: false }));
        windows.push(window);

        this.setState({
            windows,
            activeWindowId: window.id,
            maxZIndex: this.state.maxZIndex,
            nextWindowId: this.state.nextWindowId,
            windowsCreated: this.state.windowsCreated + 1,
        });

        return window;
    }

    removeWindow(windowId) {
        const windows = this.state.windows.filter(w => w.id !== windowId);
        const activeWindowId = windows.length > 0 ? windows[windows.length - 1].id : null;

        this.setState({ windows, activeWindowId });
    }

    updateWindow(windowId, updates, options = {}) {
        const windows = this.state.windows.map(w =>
            w.id === windowId ? { ...w, ...updates } : w
        );

        this.setState({ windows }, options);
    }

    focusWindow(windowId) {
        const windows = this.state.windows.map(w => ({
            ...w,
            isFocused: w.id === windowId,
            zIndex: w.id === windowId ? this.state.maxZIndex++ : w.zIndex,
        }));

        this.setState({
            windows,
            activeWindowId: windowId,
            maxZIndex: this.state.maxZIndex,
        });
    }

    minimizeWindow(windowId) {
        this.updateWindow(windowId, { isMinimized: true });
    }

    restoreWindow(windowId) {
        this.updateWindow(windowId, { isMinimized: false });
        this.focusWindow(windowId);
    }

    toggleMaximize(windowId) {
        const window = this.state.windows.find(w => w.id === windowId);
        if (window) {
            this.updateWindow(windowId, { isMaximized: !window.isMaximized });
        }
    }

    addToTerminalHistory(command) {
        const history = [...this.state.terminalHistory, command];
        // Keep last 100 commands
        if (history.length > 100) {
            history.shift();
        }

        this.setState({
            terminalHistory: history,
            commandsExecuted: this.state.commandsExecuted + 1,
        });
    }

    saveToStorage() {
        try {
            const stateToSave = {
                theme: this.state.theme,
                wallpaper: this.state.wallpaper,
                terminalHistory: this.state.terminalHistory,
                fileSystem: this.state.fileSystem,
            };

            localStorage.setItem('nexusShellState', JSON.stringify(stateToSave));
        } catch (error) {
            console.error('Failed to save state to storage:', error);
        }
    }

    loadFromStorage() {
        try {
            const saved = localStorage.getItem('nexusShellState');
            if (saved) {
                const parsed = JSON.parse(saved);
                this.setState(parsed);
                return true;
            }
        } catch (error) {
            console.error('Failed to load state from storage:', error);
        }
        return false;
    }

    reset() {
        localStorage.removeItem('nexusShellState');
        this.state = {
            windows: [],
            activeWindowId: null,
            nextWindowId: 1,
            maxZIndex: 100,
            currentDirectory: '/home',
            fileSystem: this.initializeFileSystem(),
            theme: 'light',
            wallpaper: 'default',
            sessionStart: Date.now(),
            commandsExecuted: 0,
            windowsCreated: 0,
            terminalHistory: [],
            startMenuOpen: false,
            contextMenuOpen: false,
        };
    }
}
const state = new State();

export default state;
