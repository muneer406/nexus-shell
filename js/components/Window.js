import state from '../core/State.js';
import { loadAppModule } from '../apps/registry.js';

class Window {
    constructor(windowData, manager) {
        this.data = windowData;
        this.manager = manager;
        this.element = null;
        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.dragRaf = null;
        this.pendingDrag = null;
        this.resizeRaf = null;
        this.pendingResize = null;
        this.resizeStart = null;
        this.resizeDir = null;
        this.unmountApp = null;

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
            <span class="window-icon">${this.renderIcon(this.data.icon, this.data.title || 'App')}</span>
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

        ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach(dir => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${dir}`;
            handle.dataset.dir = dir;
            winEl.appendChild(handle);
        });

        this.element = winEl;
        this.titlebar = winEl.querySelector('.window-titlebar');
        this.content = winEl.querySelector('.window-content');

        setTimeout(() => this.loadAppContent(), 100);
    }

    renderIcon(icon, label) {
        if (!icon) return '📄';
        if (typeof icon === 'string' && (icon.endsWith('.svg') || icon.endsWith('.png') || icon.endsWith('.jpg') || icon.endsWith('.jpeg') || icon.includes('/'))) {
            const safeLabel = String(label || 'App').replace(/"/g, '');
            return `<img class="ui-icon" src="${icon}" alt="${safeLabel}">`;
        }
        return icon;
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

        this.element.querySelectorAll('.resize-handle').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.startResize(e, handle.dataset.dir);
            });
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

            this.pendingDrag = { x, y };
            if (this.dragRaf === null) {
                this.dragRaf = requestAnimationFrame(() => {
                    this.dragRaf = null;
                    if (this.pendingDrag) {
                        this.manager.updateWindowPosition(this.data.id, this.pendingDrag.x, this.pendingDrag.y);
                    }
                });
            }
        };

        const handleMouseUp = () => {
            this.isDragging = false;
            this.element.classList.remove('dragging');
            if (this.dragRaf !== null) {
                cancelAnimationFrame(this.dragRaf);
                this.dragRaf = null;
            }
            if (this.pendingDrag) {
                state.updateWindow(
                    this.data.id,
                    { x: this.pendingDrag.x, y: this.pendingDrag.y },
                    { persist: true }
                );
                this.pendingDrag = null;
            }
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }

    startResize(e, dir) {
        if (this.data.isMaximized) return;

        this.isResizing = true;
        this.resizeDir = dir;
        this.element.classList.add('resizing');
        this.focus();

        const rect = this.element.getBoundingClientRect();
        this.resizeStart = {
            startX: e.clientX,
            startY: e.clientY,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
        };

        const minWidth = 320;
        const minHeight = 200;
        const taskbarHeight = 72;

        const handleMouseMove = (ev) => {
            if (!this.isResizing || !this.resizeStart) return;

            const dx = ev.clientX - this.resizeStart.startX;
            const dy = ev.clientY - this.resizeStart.startY;

            let left = this.resizeStart.left;
            let top = this.resizeStart.top;
            let width = this.resizeStart.width;
            let height = this.resizeStart.height;

            if (dir.includes('e')) width = this.resizeStart.width + dx;
            if (dir.includes('s')) height = this.resizeStart.height + dy;
            if (dir.includes('w')) {
                width = this.resizeStart.width - dx;
                left = this.resizeStart.left + dx;
            }
            if (dir.includes('n')) {
                height = this.resizeStart.height - dy;
                top = this.resizeStart.top + dy;
            }

            width = Math.max(minWidth, width);
            height = Math.max(minHeight, height);

            const maxLeft = window.innerWidth - width;
            const maxTop = window.innerHeight - taskbarHeight - height;
            left = Math.max(0, Math.min(left, maxLeft));
            top = Math.max(0, Math.min(top, maxTop));

            this.element.style.left = `${left}px`;
            this.element.style.top = `${top}px`;
            this.element.style.width = `${width}px`;
            this.element.style.height = `${height}px`;

            this.pendingResize = { left, top, width, height };
            if (this.resizeRaf === null) {
                this.resizeRaf = requestAnimationFrame(() => {
                    this.resizeRaf = null;
                    if (!this.pendingResize) return;
                    this.manager.updateWindowPosition(this.data.id, this.pendingResize.left, this.pendingResize.top);
                    this.manager.updateWindowSize(this.data.id, this.pendingResize.width, this.pendingResize.height);
                });
            }
        };

        const handleMouseUp = () => {
            this.isResizing = false;
            this.element.classList.remove('resizing');

            if (this.resizeRaf !== null) {
                cancelAnimationFrame(this.resizeRaf);
                this.resizeRaf = null;
            }

            if (this.pendingResize) {
                state.updateWindow(
                    this.data.id,
                    {
                        x: this.pendingResize.left,
                        y: this.pendingResize.top,
                        width: this.pendingResize.width,
                        height: this.pendingResize.height,
                    },
                    { persist: true }
                );
                this.pendingResize = null;
            }

            this.resizeStart = null;
            this.resizeDir = null;

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

    async loadAppContent() {
        if (this.unmountApp) {
            try {
                this.unmountApp();
            } catch {
                // ignore
            }
            this.unmountApp = null;
        }

        this.content.innerHTML = '';

        const appType = this.data.appType;
        this.content.classList.toggle('no-padding', appType === 'terminal');
        try {
            const app = await loadAppModule(appType);
            if (!app || typeof app.mount !== 'function') {
                this.content.innerHTML = `
                    <div class="window-empty">
                        <div class="window-empty-icon">📦</div>
                        <div class="window-empty-text">Application coming soon...</div>
                    </div>
                `;
                return;
            }

            const cleanup = app.mount({
                container: this.content,
                windowId: this.data.id,
                windowData: this.data,
            });

            if (typeof cleanup === 'function') {
                this.unmountApp = cleanup;
            }
        } catch (error) {
            console.error('Failed to load app module:', error);
            this.content.innerHTML = `
                <div class="window-error">Failed to load application.</div>
            `;
        }
    }

    destroy() {
        if (this.unmountApp) {
            try {
                this.unmountApp();
            } catch {
                // ignore
            }
            this.unmountApp = null;
        }
        if (this.element && this.element.parentNode) {
            this.element.remove();
        }
    }
}

export default Window;
