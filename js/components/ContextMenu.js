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

        eventBus.subscribe(EVENTS.CONTEXT_MENU_REQUESTED, ({ x, y, items, context }) => {
            this.openMenu(x, y, items, context);
        });

        this.desktop.addEventListener('contextmenu', (e) => {
            if (e.target === this.desktop || e.target.classList.contains('desktop-icons')) {
                e.preventDefault();
                this.openMenu(
                    e.clientX,
                    e.clientY,
                    [
                        { type: 'item', label: 'Refresh', action: 'refresh' },
                        { type: 'separator' },
                        { type: 'item', label: 'Open Terminal', action: 'open-terminal' },
                        { type: 'item', label: 'Open File Explorer', action: 'open-file-explorer' },
                        { type: 'separator' },
                        { type: 'item', label: 'Settings', action: 'settings' },
                    ],
                    { type: 'desktop' }
                );
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

    openMenu(x, y, items = [], context = null) {
        if (!this.menuList || !this.contextMenu) return;

        const normalizedItems = Array.isArray(items) ? items : [];
        this.menuContext = context ?? null;

        this.menuList.innerHTML = '';

        normalizedItems.forEach((item) => {
            if (!item) return;
            if (item.type === 'separator') {
                const divider = document.createElement('div');
                divider.className = 'context-menu-divider';
                this.menuList.appendChild(divider);
                return;
            }

            if (item.type !== 'item') return;

            const li = document.createElement('li');
            li.className = 'context-menu-item';
            li.textContent = item.label ?? 'Action';
            li.dataset.action = item.action ?? '';
            if (item.disabled) {
                li.classList.add('disabled');
                li.setAttribute('aria-disabled', 'true');
            }
            this.menuList.appendChild(li);
        });

        this.contextMenu.classList.remove('hidden');

        const menuW = this.contextMenu.offsetWidth || 220;
        const menuH = this.contextMenu.offsetHeight || 260;
        const safeX = Math.max(8, Math.min(x, window.innerWidth - menuW - 8));
        const safeY = Math.max(8, Math.min(y, window.innerHeight - menuH - 8));

        this.contextMenu.style.left = `${safeX}px`;
        this.contextMenu.style.top = `${safeY}px`;

        this.menuList.querySelectorAll('.context-menu-item').forEach(itemEl => {
            itemEl.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                if (!action) return;
                if (e.currentTarget.classList.contains('disabled')) return;

                const ctx = this.menuContext;
                this.handleAction(action, ctx);
                eventBus.publish(EVENTS.CONTEXT_MENU_ACTION, { action, context: ctx });
                this.close();
            });
        });

        eventBus.publish(EVENTS.CONTEXT_MENU_OPENED, { context: this.menuContext });
    }

    close() {
        this.contextMenu?.classList.add('hidden');
        this.menuContext = null;
        eventBus.publish(EVENTS.CONTEXT_MENU_CLOSED, {});
    }

    handleAction(action, context) {
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
