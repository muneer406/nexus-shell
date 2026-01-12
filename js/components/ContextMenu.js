import eventBus, { EVENTS } from '../core/EventBus.js';

class ContextMenu {
    constructor() {
        this.contextMenu = document.getElementById('context-menu');
        this.menuList = this.contextMenu?.querySelector('.context-menu-list') ?? null;
        this.desktop = document.getElementById('desktop');

        this.init();
    }

    init() {
        if (!this.contextMenu || !this.menuList || !this.desktop) return;

        this.desktop.addEventListener('contextmenu', (e) => {
            if (e.target === this.desktop || e.target.classList.contains('desktop-icons')) {
                e.preventDefault();
                this.openDesktopMenu(e.clientX, e.clientY);
            }
        });

        document.addEventListener('click', () => {
            this.close();
        });

        window.addEventListener('blur', () => {
            this.close();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.close();
        });
    }

    openDesktopMenu(x, y) {
        if (!this.menuList || !this.contextMenu) return;

        this.menuList.innerHTML = `
            <li class="context-menu-item" data-action="refresh">Refresh</li>
            <div class="context-menu-divider"></div>
            <li class="context-menu-item" data-action="open-terminal">Open Terminal</li>
            <li class="context-menu-item" data-action="open-file-explorer">Open File Explorer</li>
            <div class="context-menu-divider"></div>
            <li class="context-menu-item" data-action="settings">Settings</li>
        `;

        const safeX = Math.max(8, Math.min(x, window.innerWidth - 220));
        const safeY = Math.max(8, Math.min(y, window.innerHeight - 220));

        this.contextMenu.style.left = `${safeX}px`;
        this.contextMenu.style.top = `${safeY}px`;
        this.contextMenu.classList.remove('hidden');

        this.menuList.querySelectorAll('.context-menu-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleAction(action);
                this.close();
            });
        });
    }

    close() {
        this.contextMenu?.classList.add('hidden');
    }

    handleAction(action) {
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
}

export default ContextMenu;
