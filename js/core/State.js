class State {
    constructor() {
        this.state = {
            windows: [],
            activeWindowId: null,
            nextWindowId: 1,
            maxZIndex: 100,

            currentDirectory: '/home',
            fileSystem: this.initializeFileSystem(),

            theme: 'dark',
            wallpaper: { type: 'image', src: 'assets/wallpapers/1.jpg', id: '1.jpg' },

            sessionStart: Date.now(),
            commandsExecuted: 0,
            windowsCreated: 0,
            windowsClosed: 0,
            windowsFocused: 0,
            windowsMinimized: 0,
            windowsRestored: 0,
            windowsMoved: 0,
            windowsResized: 0,
            lastActivityAt: Date.now(),

            terminalHistory: [],

            startMenuOpen: false,
            contextMenuOpen: false,
        };

        this.listeners = {};
    }

    normalizePersistedWindows(windows, activeWindowId) {
        if (!Array.isArray(windows)) return { windows: [], activeWindowId: null, nextWindowId: 1, maxZIndex: 100 };

        const sanitized = windows
            .filter(w => w && typeof w === 'object')
            .map(w => ({ ...w }))
            .filter(w => Number.isFinite(w.id) && typeof w.appType === 'string' && w.appType.length > 0);

        const ids = new Set();
        const deduped = [];
        for (const w of sanitized) {
            if (ids.has(w.id)) continue;
            ids.add(w.id);
            deduped.push(w);
        }

        const maxId = deduped.reduce((acc, w) => Math.max(acc, w.id), 0);
        const maxZ = deduped.reduce((acc, w) => Math.max(acc, Number.isFinite(w.zIndex) ? w.zIndex : 0), 100);

        const hasActive = deduped.some(w => w.id === activeWindowId);
        const normalizedActive = hasActive ? activeWindowId : (deduped.length ? deduped[deduped.length - 1].id : null);

        const normalizedWindows = deduped.map(w => ({
            ...w,
            zIndex: Number.isFinite(w.zIndex) ? w.zIndex : 100,
            isMinimized: Boolean(w.isMinimized),
            isMaximized: Boolean(w.isMaximized),
            isFocused: w.id === normalizedActive,
        }));

        return {
            windows: normalizedWindows,
            activeWindowId: normalizedActive,
            nextWindowId: Math.max(1, maxId + 1),
            maxZIndex: Math.max(100, maxZ + 1),
        };
    }

    initializeFileSystem() {
        const now = Date.now();
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
                                        content: 'Welcome to Nexus Shell!\n\nTips:\n- Double click folders to open\n- Right click for actions\n- Use the path bar to jump to any directory\n',
                                        size: 'Welcome to Nexus Shell!\n\nTips:\n- Double click folders to open\n- Right click for actions\n- Use the path bar to jump to any directory\n'.length,
                                        created: now,
                                    }
                                    ,
                                    'notes.md': {
                                        type: 'file',
                                        name: 'notes.md',
                                        content: '# Notes\n\n- Terminal + File Explorer are connected to the virtual FS\n- Wallpapers live in assets/wallpapers\n',
                                        size: '# Notes\n\n- Terminal + File Explorer are connected to the virtual FS\n- Wallpapers live in assets/wallpapers\n'.length,
                                        created: now,
                                    }
                                    ,
                                    'projects': {
                                        type: 'directory',
                                        name: 'projects',
                                        children: {
                                            'nexus-shell': {
                                                type: 'directory',
                                                name: 'nexus-shell',
                                                children: {
                                                    'ROADMAP.txt': {
                                                        type: 'file',
                                                        name: 'ROADMAP.txt',
                                                        content: 'Next ideas:\n- File search\n- Drag & drop move\n- More apps\n',
                                                        size: 'Next ideas:\n- File search\n- Drag & drop move\n- More apps\n'.length,
                                                        created: now,
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            },
                            'downloads': {
                                type: 'directory',
                                name: 'downloads',
                                children: {
                                    'installer.log': {
                                        type: 'file',
                                        name: 'installer.log',
                                        content: '[ok] downloaded: nexus-shell.zip\n[ok] extracted\n[ok] launched\n',
                                        size: '[ok] downloaded: nexus-shell.zip\n[ok] extracted\n[ok] launched\n'.length,
                                        created: now,
                                    }
                                }
                            },
                            'pictures': {
                                type: 'directory',
                                name: 'pictures',
                                children: {
                                    'wallpapers': {
                                        type: 'directory',
                                        name: 'wallpapers',
                                        children: {
                                            'preview-1.jpg': {
                                                type: 'file',
                                                name: 'preview-1.jpg',
                                                content: 'assets/wallpapers/1.jpg',
                                                size: 0,
                                                created: now,
                                            },
                                            'preview-2.jpg': {
                                                type: 'file',
                                                name: 'preview-2.jpg',
                                                content: 'assets/wallpapers/2.jpg',
                                                size: 0,
                                                created: now,
                                            },
                                            'preview-18.png': {
                                                type: 'file',
                                                name: 'preview-18.png',
                                                content: 'assets/wallpapers/18.png',
                                                size: 0,
                                                created: now,
                                            }
                                        }
                                    },
                                    'camera': {
                                        type: 'directory',
                                        name: 'camera',
                                        children: {
                                            'IMG_0001.jpg': {
                                                type: 'file',
                                                name: 'IMG_0001.jpg',
                                                content: 'assets/wallpapers/3.jpg',
                                                size: 0,
                                                created: now,
                                            },
                                            'IMG_0002.png': {
                                                type: 'file',
                                                name: 'IMG_0002.png',
                                                content: 'assets/wallpapers/33.png',
                                                size: 0,
                                                created: now,
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    'system': {
                        type: 'directory',
                        name: 'system',
                        children: {
                            'bin': {
                                type: 'directory',
                                name: 'bin',
                                children: {
                                    'nexus': { type: 'file', name: 'nexus', content: '#!/bin/sh\necho "nexus"\n', size: '#!/bin/sh\necho "nexus"\n'.length, created: now },
                                }
                            },
                            'config': {
                                type: 'directory',
                                name: 'config',
                                children: {
                                    'settings.json': {
                                        type: 'file',
                                        name: 'settings.json',
                                        content: '{\n  "theme": "dark"\n}\n',
                                        size: '{\n  "theme": "dark"\n}\n'.length,
                                        created: now,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        };
    }

    mergeFileSystemDefaults(existingFs) {
        const defaults = this.initializeFileSystem();

        const mergeNode = (existingNode, defaultNode) => {
            if (!existingNode) return defaultNode;
            if (!defaultNode) return existingNode;

            if (existingNode.type !== defaultNode.type) return existingNode;
            if (existingNode.type !== 'directory') return existingNode;

            const merged = { ...existingNode };
            merged.children ??= {};

            const defaultChildren = defaultNode.children ?? {};
            Object.keys(defaultChildren).forEach((name) => {
                if (!merged.children[name]) {
                    merged.children[name] = defaultChildren[name];
                    return;
                }
                merged.children[name] = mergeNode(merged.children[name], defaultChildren[name]);
            });

            return merged;
        };

        const existingRoot = existingFs?.['/'];
        const defaultRoot = defaults?.['/'];
        if (!existingRoot || !defaultRoot) return existingFs;

        return {
            ...existingFs,
            '/': mergeNode(existingRoot, defaultRoot),
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

    bumpCounter(key, delta = 1, options = {}) {
        const current = this.state[key];
        const next = (Number.isFinite(current) ? current : 0) + delta;
        this.setState({ [key]: next }, options);
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

                // Window restore
                windows: this.state.windows,
                activeWindowId: this.state.activeWindowId,
                nextWindowId: this.state.nextWindowId,
                maxZIndex: this.state.maxZIndex,
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

                if (parsed && parsed.fileSystem) {
                    parsed.fileSystem = this.mergeFileSystemDefaults(parsed.fileSystem);
                }

                const normalizedWin = this.normalizePersistedWindows(parsed?.windows, parsed?.activeWindowId);
                parsed.windows = normalizedWin.windows;
                parsed.activeWindowId = normalizedWin.activeWindowId;
                parsed.nextWindowId = normalizedWin.nextWindowId;
                parsed.maxZIndex = normalizedWin.maxZIndex;

                this.setState(parsed, { persist: false });
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
            theme: 'dark',
            wallpaper: { type: 'image', src: 'assets/wallpapers/1.jpg', id: '1.jpg' },
            sessionStart: Date.now(),
            commandsExecuted: 0,
            windowsCreated: 0,
            windowsClosed: 0,
            windowsFocused: 0,
            windowsMinimized: 0,
            windowsRestored: 0,
            windowsMoved: 0,
            windowsResized: 0,
            lastActivityAt: Date.now(),
            terminalHistory: [],
            startMenuOpen: false,
            contextMenuOpen: false,
        };
    }
}
const state = new State();

export default state;
