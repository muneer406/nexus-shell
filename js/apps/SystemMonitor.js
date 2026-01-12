import state from '../core/State.js';
import storage from '../core/Storage.js';
import eventBus from '../core/EventBus.js';

const SystemMonitorApp = {
    mount({ container }) {
        const root = document.createElement('div');
        root.className = 'app-system-monitor';

        root.innerHTML = `
            <div class="monitor-toolbar">
                <div class="monitor-toolbar-title">Live</div>
                <label class="monitor-toolbar-field">
                    <span>Refresh</span>
                    <select class="monitor-refresh">
                        <option value="1000">1s</option>
                        <option value="2000">2s</option>
                        <option value="5000">5s</option>
                        <option value="0">Manual</option>
                    </select>
                </label>
                <button class="monitor-refresh-now">Refresh now</button>
            </div>

            <div class="monitor-card">
                <div class="monitor-card-header">Session</div>
                <div class="monitor-stats monitor-stats-session"></div>
            </div>

            <div class="monitor-card">
                <div class="monitor-card-header">Desktop</div>
                <div class="monitor-stats monitor-stats-desktop"></div>
            </div>

            <div class="monitor-card">
                <div class="monitor-card-header">Performance</div>
                <div class="monitor-stats monitor-stats-perf"></div>
            </div>

            <div class="monitor-card">
                <div class="monitor-card-header">Storage</div>
                <div class="monitor-stats monitor-stats-storage"></div>
            </div>

            <div class="monitor-card">
                <div class="monitor-card-header">Event Bus</div>
                <div class="monitor-kv monitor-eventbus"></div>
            </div>
        `;

        const refreshSelect = root.querySelector('.monitor-refresh');
        const refreshNowBtn = root.querySelector('.monitor-refresh-now');

        const elSession = root.querySelector('.monitor-stats-session');
        const elDesktop = root.querySelector('.monitor-stats-desktop');
        const elPerf = root.querySelector('.monitor-stats-perf');
        const elStorage = root.querySelector('.monitor-stats-storage');
        const elBus = root.querySelector('.monitor-eventbus');

        const formatDuration = (ms) => {
            const totalSeconds = Math.max(0, Math.floor(ms / 1000));
            const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const s = String(totalSeconds % 60).padStart(2, '0');
            return `${h}:${m}:${s}`;
        };

        const fmtMB = (bytes) => {
            if (!Number.isFinite(bytes)) return '—';
            return (bytes / (1024 * 1024)).toFixed(1);
        };

        const renderStat = (label, value, unit = '') => {
            const safeValue = (value === null || value === undefined || value === '') ? '—' : value;
            return `
                <div class="stat-item">
                    <div class="stat-label">${label}</div>
                    <div class="stat-value">${safeValue}${unit ? `<span class="stat-unit">${unit}</span>` : ''}</div>
                </div>
            `;
        };

        const render = () => {
            const windows = state.get('windows') ?? [];
            const activeWindowId = state.get('activeWindowId');
            const focused = windows.find(w => w.id === activeWindowId);
            const visibleWindows = windows.filter(w => !w.isMinimized);

            const usage = storage.getUsage();
            const sessionStart = state.get('sessionStart') ?? Date.now();
            const lastActivityAt = state.get('lastActivityAt') ?? sessionStart;

            const domElements = document.getElementsByTagName('*').length;
            const domWindows = document.querySelectorAll('.window').length;

            const loadMs = Math.round(performance.now());
            const mem = performance?.memory;
            const usedHeap = mem?.usedJSHeapSize;
            const totalHeap = mem?.totalJSHeapSize;

            elSession.innerHTML = [
                renderStat('Uptime', formatDuration(Date.now() - sessionStart)),
                renderStat('Last activity', formatDuration(Date.now() - lastActivityAt), 'ago'),
                renderStat('Commands', state.get('commandsExecuted') ?? 0),
                renderStat('Windows created', state.get('windowsCreated') ?? 0),
                renderStat('Windows closed', state.get('windowsClosed') ?? 0),
                renderStat('Focused switches', state.get('windowsFocused') ?? 0),
            ].join('');

            elDesktop.innerHTML = [
                renderStat('Windows (open)', windows.length),
                renderStat('Windows (visible)', visibleWindows.length),
                renderStat('Active app', focused?.title ?? '—'),
                renderStat('DOM elements', domElements),
                renderStat('Window DOM nodes', domWindows),
                renderStat('Moved/resized', `${state.get('windowsMoved') ?? 0}/${state.get('windowsResized') ?? 0}`),
            ].join('');

            elPerf.innerHTML = [
                renderStat('Since load', loadMs, 'ms'),
                renderStat('JS heap used', fmtMB(usedHeap), 'MB'),
                renderStat('JS heap total', fmtMB(totalHeap), 'MB'),
            ].join('');

            elStorage.innerHTML = [
                renderStat('Items', usage.itemCount),
                renderStat('Size', usage.sizeKB, 'KB'),
                renderStat('Approx. quota', usage.percentUsed, '%'),
            ].join('');

            const names = eventBus.getEventNames();
            const rows = names
                .map(name => ({ name, count: eventBus.getSubscriberCount(name) }))
                .sort((a, b) => b.count - a.count);

            const totalSubs = rows.reduce((acc, r) => acc + r.count, 0);
            const top = rows.slice(0, 8);

            elBus.innerHTML = `
                <div class="monitor-kv-row"><div class="monitor-k">Event types</div><div class="monitor-v">${rows.length}</div></div>
                <div class="monitor-kv-row"><div class="monitor-k">Total subscribers</div><div class="monitor-v">${totalSubs}</div></div>
                <div class="monitor-kv-row"><div class="monitor-k">Top subscribers</div><div class="monitor-v">${top.map(t => `${t.name} (${t.count})`).join(', ') || '—'}</div></div>
                ${!mem ? `<div class="monitor-kv-row"><div class="monitor-k">Note</div><div class="monitor-v">JS heap is only available in some browsers.</div></div>` : ''}
            `;
        };

        let timer = null;
        const setRefresh = (ms) => {
            if (timer) {
                clearInterval(timer);
                timer = null;
            }
            if (!ms) return;
            timer = setInterval(render, ms);
        };

        refreshSelect.addEventListener('change', () => {
            const ms = Number(refreshSelect.value);
            setRefresh(ms);
            render();
        });

        refreshNowBtn.addEventListener('click', () => {
            render();
        });

        const unsubW = state.subscribe('windows', render);
        const unsubC = state.subscribe('commandsExecuted', render);

        container.innerHTML = '';
        container.appendChild(root);

        setRefresh(1000);
        render();

        return () => {
            if (timer) clearInterval(timer);
            unsubW?.();
            unsubC?.();
        };
    }
};

export default SystemMonitorApp;
