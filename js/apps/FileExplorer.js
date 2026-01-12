import state from '../core/State.js';
import fileSystem from '../managers/FileSystem.js';
import eventBus, { EVENTS } from '../core/EventBus.js';

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
    mount({ container, windowId }) {
        const root = document.createElement('div');
        root.className = 'app-file-explorer';
        root.innerHTML = `
            <div class="file-explorer-toolbar">
                <div class="file-explorer-breadcrumb"></div>
            </div>
            <div class="file-explorer-content">
                <div class="file-list"></div>
            </div>
            <div class="file-preview-overlay hidden">
                <div class="file-preview-card">
                    <div class="file-preview-header">
                        <div class="file-preview-title"></div>
                        <button class="file-preview-close" type="button" aria-label="Close">×</button>
                    </div>
                    <pre class="file-preview-body"></pre>
                </div>
            </div>
        `;

        const breadcrumb = root.querySelector('.file-explorer-breadcrumb');
        const list = root.querySelector('.file-list');
        const previewOverlay = root.querySelector('.file-preview-overlay');
        const previewTitle = root.querySelector('.file-preview-title');
        const previewBody = root.querySelector('.file-preview-body');
        const previewClose = root.querySelector('.file-preview-close');

        let selectedName = null;
        let editingName = null;

        const closePreview = () => {
            previewOverlay?.classList.add('hidden');
            if (previewTitle) previewTitle.textContent = '';
            if (previewBody) previewBody.textContent = '';
        };

        const openPreview = (name) => {
            const res = fileSystem.readFile(name);
            if (!res.ok) {
                previewTitle.textContent = name;
                previewBody.textContent = res.error;
            } else {
                previewTitle.textContent = name;
                previewBody.textContent = res.content || '(empty file)';
            }
            previewOverlay?.classList.remove('hidden');
        };

        previewOverlay?.addEventListener('click', (e) => {
            if (e.target === previewOverlay) closePreview();
        });
        previewClose?.addEventListener('click', () => closePreview());

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
                if (item.name === selectedName) cell.classList.add('selected');
                cell.innerHTML = `
                    <div class="file-icon">${iconFor(item.type)}</div>
                    <div class="file-name"></div>
                `;

                const nameEl = cell.querySelector('.file-name');

                if (item.name === editingName) {
                    const input = document.createElement('input');
                    input.className = 'file-rename-input';
                    input.type = 'text';
                    input.value = item.name;
                    nameEl.appendChild(input);
                    queueMicrotask(() => {
                        input.focus();
                        input.setSelectionRange(0, input.value.length);
                    });

                    const commit = () => {
                        const next = input.value.trim();
                        if (!next || next === item.name) {
                            editingName = null;
                            render();
                            return;
                        }
                        const renamed = fileSystem.rename(item.name, next);
                        if (!renamed.ok) {
                            alert(renamed.error);
                        } else {
                            selectedName = next;
                        }
                        editingName = null;
                        render();
                    };

                    input.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            commit();
                        }
                        if (e.key === 'Escape') {
                            e.preventDefault();
                            editingName = null;
                            render();
                        }
                    });
                    input.addEventListener('blur', () => commit());
                } else {
                    nameEl.textContent = item.name;
                }

                cell.addEventListener('click', () => {
                    selectedName = item.name;
                    editingName = null;
                    render();
                });

                cell.addEventListener('dblclick', () => {
                    if (item.type === 'directory') {
                        fileSystem.cd(item.name);
                        selectedName = null;
                        editingName = null;
                        closePreview();
                        return;
                    }

                    openPreview(item.name);
                });

                cell.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    selectedName = item.name;
                    editingName = null;
                    closePreview();
                    render();

                    eventBus.publish(EVENTS.CONTEXT_MENU_REQUESTED, {
                        x: e.clientX,
                        y: e.clientY,
                        items: [
                            { type: 'item', label: 'Open', action: 'fs-open' },
                            { type: 'separator' },
                            { type: 'item', label: 'Rename', action: 'fs-rename' },
                            { type: 'item', label: 'Delete', action: 'fs-delete' },
                        ],
                        context: {
                            type: 'file-explorer',
                            windowId,
                            cwd,
                            name: item.name,
                            nodeType: item.type,
                        }
                    });
                });

                list.appendChild(cell);
            });
        };

        const unsubMenu = eventBus.subscribe(EVENTS.CONTEXT_MENU_ACTION, ({ action, context }) => {
            if (!context || context.type !== 'file-explorer') return;
            if (context.windowId !== windowId) return;

            selectedName = context.name;

            if (action === 'fs-open') {
                if (context.nodeType === 'directory') {
                    fileSystem.cd(context.name);
                    selectedName = null;
                    editingName = null;
                    closePreview();
                    return;
                }
                openPreview(context.name);
                return;
            }

            if (action === 'fs-rename') {
                editingName = context.name;
                closePreview();
                render();
                return;
            }

            if (action === 'fs-delete') {
                const ok = confirm(`Delete "${context.name}"?`);
                if (!ok) return;
                const removed = fileSystem.rm(context.name);
                if (!removed.ok) {
                    alert(removed.error);
                }
                selectedName = null;
                editingName = null;
                closePreview();
                render();
            }
        });

        const unsub = state.subscribe('currentDirectory', () => {
            render();
        });

        container.innerHTML = '';
        container.appendChild(root);
        render();

        return () => {
            unsub?.();
            unsubMenu?.();
        };
    }
};

export default FileExplorerApp;
