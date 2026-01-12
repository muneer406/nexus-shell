import state from '../core/State.js';
import fileSystem from '../managers/FileSystem.js';

function iconFor(type) {
    return type === 'directory' ? '📁' : '📄';
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
