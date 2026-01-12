import state from '../core/State.js';
import storage from '../core/Storage.js';

const SystemMonitorApp = {
    mount({ container }) {
        const root = document.createElement('div');
        root.className = 'app-system-monitor';

        const card = document.createElement('div');
        card.className = 'monitor-card';
        card.innerHTML = `
            <div class="monitor-card-header">System Statistics</div>
            <div class="monitor-stats"></div>
        `;

        const stats = card.querySelector('.monitor-stats');

        const render = () => {
            const windows = state.get('windows') ?? [];
            const usage = storage.getUsage();
            const sessionStart = state.get('sessionStart') ?? Date.now();
            const seconds = Math.floor((Date.now() - sessionStart) / 1000);

            stats.innerHTML = `
                <div class="stat-item"><div class="stat-label">Active windows</div><div class="stat-value">${windows.length}</div></div>
                <div class="stat-item"><div class="stat-label">Commands executed</div><div class="stat-value">${state.get('commandsExecuted') ?? 0}</div></div>
                <div class="stat-item"><div class="stat-label">Session time (s)</div><div class="stat-value">${seconds}</div></div>
                <div class="stat-item"><div class="stat-label">Storage (KB)</div><div class="stat-value">${usage.sizeKB}</div></div>
            `;
        };

        const unsubW = state.subscribe('windows', render);
        const timer = setInterval(render, 1000);

        container.innerHTML = '';
        root.appendChild(card);
        container.appendChild(root);
        render();

        return () => {
            clearInterval(timer);
            unsubW?.();
        };
    }
};

export default SystemMonitorApp;
