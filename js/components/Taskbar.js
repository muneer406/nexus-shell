import state from '../core/State.js';
import eventBus, { EVENTS } from '../core/EventBus.js';

class Taskbar {
    constructor() {
        this.taskbarElement = document.getElementById('taskbar');
        this.startButton = document.getElementById('start-button');
        this.startMenu = document.getElementById('start-menu');
        this.taskbarItems = document.getElementById('taskbar-items');
        this.clock = document.getElementById('clock');

        this.init();
    }

    init() {
        this.startButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleStartMenu();
        });

        const appLaunchers = this.startMenu.querySelectorAll('.app-launcher');
        appLaunchers.forEach(launcher => {
            launcher.addEventListener('click', (e) => {
                const appName = launcher.dataset.app;
                eventBus.publish(EVENTS.APP_LAUNCH_REQUESTED, { appName, source: 'start-menu' });
                this.closeStartMenu();
            });
        });

        document.addEventListener('click', (e) => {
            if (!this.startMenu.contains(e.target) && !this.startButton.contains(e.target)) {
                this.closeStartMenu();
            }
        });

        state.subscribe('windows', (windows) => {
            this.updateTaskbarItems(windows);
        });

        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    toggleStartMenu() {
        const isOpen = !this.startMenu.classList.contains('hidden');

        if (isOpen) {
            this.closeStartMenu();
        } else {
            this.openStartMenu();
        }
    }

    openStartMenu() {
        this.startMenu.classList.remove('hidden');
        this.startButton.classList.add('active');
        state.setState({ startMenuOpen: true });
        eventBus.publish(EVENTS.START_MENU_TOGGLED, { open: true });
    }

    closeStartMenu() {
        this.startMenu.classList.add('hidden');
        this.startButton.classList.remove('active');
        state.setState({ startMenuOpen: false });
        eventBus.publish(EVENTS.START_MENU_TOGGLED, { open: false });
    }

    updateTaskbarItems(windows) {
        // Clear current items
        this.taskbarItems.innerHTML = '';

        // Create taskbar item for each window
        windows.forEach(window => {
            const item = this.createTaskbarItem(window);
            this.taskbarItems.appendChild(item);
        });
    }

    createTaskbarItem(window) {
        const item = document.createElement('button');
        item.className = 'taskbar-item';
        item.dataset.windowId = window.id;

        if (window.isFocused) {
            item.classList.add('active');
        }

        if (window.isMinimized) {
            item.classList.add('minimized');
        }

        const iconHtml = this.renderIcon(window.icon, window.title || 'App');
        item.innerHTML = `
            <span class="taskbar-item-icon">${iconHtml}</span>
            <span class="taskbar-item-title">${window.title || 'Untitled'}</span>
            <span class="taskbar-item-close" data-action="close">×</span>
        `;

        item.addEventListener('click', (e) => {
            if (e.target.dataset.action === 'close') {
                e.stopPropagation();
                eventBus.publish(EVENTS.WINDOW_CLOSED, { windowId: window.id });
                return;
            }

            if (window.isMinimized) {
                eventBus.publish(EVENTS.WINDOW_RESTORED, { windowId: window.id });
            } else if (window.isFocused) {
                eventBus.publish(EVENTS.WINDOW_MINIMIZED, { windowId: window.id });
            } else {
                eventBus.publish(EVENTS.WINDOW_FOCUSED, { windowId: window.id });
            }
        });

        return item;
    }

    renderIcon(icon, label) {
        if (!icon) return '📄';
        if (typeof icon === 'string' && (icon.endsWith('.svg') || icon.endsWith('.png') || icon.endsWith('.jpg') || icon.endsWith('.jpeg') || icon.includes('/'))) {
            const safeLabel = String(label || 'App').replace(/"/g, '');
            return `<img class="ui-icon" src="${icon}" alt="${safeLabel}">`;
        }
        return icon;
    }

    updateClock() {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;

        this.clock.textContent = `${displayHours}:${minutes} ${ampm}`;
    }
}

export default Taskbar;
