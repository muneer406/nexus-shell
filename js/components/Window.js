import state from '../core/State.js';

class Window {
    constructor(windowData, manager) {
        this.data = windowData;
        this.manager = manager;
        this.element = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };

        this.create();
        this.setupEventListeners();
    }

    create() {
        const winEl = document.createElement('div');
        winEl.className = 'window';
        winEl.dataset.windowId = this.data.id;
        winEl.style.zIndex = this.data.zIndex;

        const width = this.data.width || 600;
        const height = this.data.height || 400;

        const initialX = (globalThis.innerWidth - width) / 2;
        const initialY = (globalThis.innerHeight - height) / 2 - 50;

        const x = Number.isFinite(this.data.x) ? this.data.x : Math.max(20, initialX);
        const y = Number.isFinite(this.data.y) ? this.data.y : Math.max(20, initialY);

        winEl.style.left = `${x}px`;
        winEl.style.top = `${y}px`;
        winEl.style.width = `${width}px`;
        winEl.style.height = `${height}px`;

        winEl.innerHTML = `
            <div class="window-titlebar">
                <span class="window-icon">${this.data.icon || '📄'}</span>
                <span class="window-title">${this.data.title || 'Untitled'}</span>
                <div class="window-controls">
                    <button class="window-control-btn minimize" data-action="minimize" aria-label="Minimize">
                        <span>─</span>
                    </button>
                    <button class="window-control-btn maximize" data-action="maximize" aria-label="Maximize">
                        <span>□</span>
                    </button>
                    <button class="window-control-btn close" data-action="close" aria-label="Close">
                        <span>×</span>
                    </button>
                </div>
            </div>
            <div class="window-content">
                <div class="window-loading">
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Loading...</div>
                </div>
            </div>
        `;

        this.element = winEl;
        this.titlebar = winEl.querySelector('.window-titlebar');
        this.content = winEl.querySelector('.window-content');

        setTimeout(() => this.loadAppContent(), 100);
    }

    setupEventListeners() {
        const controls = this.element.querySelectorAll('.window-control-btn');
        controls.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleControlAction(action);
            });
        });

        this.titlebar.addEventListener('mousedown', (e) => {
            if (e.target === this.titlebar || e.target.classList.contains('window-icon') || e.target.classList.contains('window-title')) {
                this.startDrag(e);
            }
        });

        this.element.addEventListener('mousedown', () => {
            this.focus();
        });

        this.titlebar.addEventListener('dblclick', () => {
            this.handleControlAction('maximize');
        });
    }

    handleControlAction(action) {
        switch (action) {
            case 'close':
                this.manager.closeWindow(this.data.id);
                break;
            case 'minimize':
                this.manager.minimizeWindow(this.data.id);
                break;
            case 'maximize':
                this.manager.toggleMaximize(this.data.id);
                break;
        }
    }

    startDrag(e) {
        if (this.data.isMaximized) return;

        this.isDragging = true;
        this.element.classList.add('dragging');

        const rect = this.element.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };

        const handleMouseMove = (e) => {
            if (!this.isDragging) return;

            let x = e.clientX - this.dragOffset.x;
            let y = e.clientY - this.dragOffset.y;

            const maxX = window.innerWidth - this.element.offsetWidth;
            const maxY = window.innerHeight - this.element.offsetHeight - 50; // Account for taskbar

            x = Math.max(0, Math.min(x, maxX));
            y = Math.max(0, Math.min(y, maxY));

            this.element.style.left = `${x}px`;
            this.element.style.top = `${y}px`;

            this.manager.updateWindowPosition(this.data.id, x, y);
        };

        const handleMouseUp = () => {
            this.isDragging = false;
            this.element.classList.remove('dragging');
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    focus() {
        this.manager.focusWindow(this.data.id);
    }

    update(windowData) {
        this.data = windowData;

        this.element.style.zIndex = windowData.zIndex;

        if (windowData.isFocused) {
            this.element.classList.add('focused');
        } else {
            this.element.classList.remove('focused');
        }

        if (windowData.isMinimized) {
            this.element.classList.add('minimized');
        } else {
            this.element.classList.remove('minimized');
        }

        if (windowData.isMaximized) {
            this.element.classList.add('maximized');
        } else {
            this.element.classList.remove('maximized');
        }
    }

    loadAppContent() {
        this.content.innerHTML = '';

        const appType = this.data.appType;

        switch (appType) {
            case 'terminal':
                this.loadTerminalApp();
                break;
            case 'file-explorer':
                this.loadFileExplorerApp();
                break;
            case 'system-monitor':
                this.loadSystemMonitorApp();
                break;
            case 'settings':
                this.loadSettingsApp();
                break;
            default:
                this.content.innerHTML = `
                    <div class="window-empty">
                        <div class="window-empty-icon">📦</div>
                        <div class="window-empty-text">Application coming soon...</div>
                    </div>
                `;
        }
    }

    loadTerminalApp() {
        this.content.innerHTML = `
            <div class="app-terminal">
                <div class="terminal-output" id="terminal-output-${this.data.id}">
                    <div class="terminal-line">Nexus Shell Terminal v1.0</div>
                    <div class="terminal-line">Type 'help' for available commands.</div>
                    <div class="terminal-line"></div>
                </div>
                <div class="terminal-input-container">
                    <span class="terminal-prompt">$</span>
                    <input type="text" class="terminal-input" placeholder="Enter command..." autocomplete="off">
                </div>
            </div>
        `;
    }

    loadFileExplorerApp() {
        this.content.innerHTML = `
            <div class="app-file-explorer">
                <div class="file-explorer-toolbar">
                    <div class="file-explorer-breadcrumb">
                        <span class="breadcrumb-item">Home</span>
                    </div>
                </div>
                <div class="file-explorer-content">
                    <div class="window-empty">
                        <div class="window-empty-icon">📁</div>
                        <div class="window-empty-text">File Explorer coming soon...</div>
                    </div>
                </div>
            </div>
        `;
    }

    loadSystemMonitorApp() {
        this.content.innerHTML = `
            <div class="app-system-monitor">
                <div class="monitor-card">
                    <div class="monitor-card-header">System Statistics</div>
                    <div class="window-empty">
                        <div class="window-empty-icon">📊</div>
                        <div class="window-empty-text">System Monitor coming soon...</div>
                    </div>
                </div>
            </div>
        `;
    }

    loadSettingsApp() {
        this.content.innerHTML = `
            <div class="app-settings">
                <div class="settings-section">
                    <div class="settings-section-title">Appearance</div>
                    <div class="window-empty">
                        <div class="window-empty-icon">⚙️</div>
                        <div class="window-empty-text">Settings coming soon...</div>
                    </div>
                </div>
            </div>
        `;
    }

    destroy() {
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }
}

export default Window;
