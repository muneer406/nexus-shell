import state from '../core/State.js';
import fileSystem from '../managers/FileSystem.js';

function iconFor(type) {
    if (type === 'directory') {
        return `
            <svg class="file-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
              <path d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v8A2.5 2.5 0 0 1 18 20H6A2.5 2.5 0 0 1 3.5 17.5v-10Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
              <path d="M3.5 9h17" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
            </svg>
        `.trim();
    }
    return `
        <svg class="file-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
          <path d="M7 3.5h7l3 3V20.5H7V3.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
          <path d="M14 3.5V7h3" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/>
          <path d="M9 11h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
          <path d="M9 14h6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        </svg>
    `.trim();
}

function buildCrumbs(path) {
    const normalized = fileSystem.normalizePath(path ?? '/', '/');
    const parts = normalized.split('/').filter(Boolean);

    const crumbs = [{ label: '/', path: '/' }];
    let running = '';
    for (const part of parts) {
        running += '/' + part;
        crumbs.push({ label: part, path: running });
    }
    return crumbs;
}

const FileExplorerApp = {
    mount({ container }) {
        const root = document.createElement('div');
        root.className = 'app-file-explorer';
        root.innerHTML = `
            <div class="file-explorer-toolbar">
                <div class="file-explorer-breadcrumb"></div>
            </div>
            <div class="file-explorer-content">
                <div class="file-list"></div>
            </div>
        `;

        const breadcrumb = root.querySelector('.file-explorer-breadcrumb');
        const list = root.querySelector('.file-list');

        const render = () => {
            const cwd = fileSystem.pwd();
            const crumbs = buildCrumbs(cwd);

            breadcrumb.innerHTML = '';
            crumbs.forEach((c, idx) => {
                const item = document.createElement('span');
                item.className = 'breadcrumb-item';
                item.textContent = c.label;
                item.addEventListener('click', () => {
                    fileSystem.cd(c.path);
                });
                breadcrumb.appendChild(item);

                if (idx < crumbs.length - 1) {
                    const sep = document.createElement('span');
                    sep.className = 'breadcrumb-separator';
                    sep.textContent = '›';
                    breadcrumb.appendChild(sep);
                }
            });

            const res = fileSystem.list(cwd);
            list.innerHTML = '';

            if (!res.ok) {
                const el = document.createElement('div');
                el.className = 'window-empty';
                el.innerHTML = `<div class="window-empty-text">${res.error}</div>`;
                list.appendChild(el);
                return;
            }

            res.items.forEach(item => {
                const cell = document.createElement('div');
                cell.className = 'file-item';
                cell.innerHTML = `
                    <div class="file-icon">${iconFor(item.type)}</div>
                    <div class="file-name">${item.name}</div>
                `;

                cell.addEventListener('dblclick', () => {
                    if (item.type === 'directory') {
                        fileSystem.cd(item.name);
                    }
                });

                list.appendChild(cell);
            });
        };

        const unsub = state.subscribe('currentDirectory', () => {
            render();
        });

        container.innerHTML = '';
        container.appendChild(root);
        render();

        return () => {
            unsub?.();
        };
    }
};

export default FileExplorerApp;
