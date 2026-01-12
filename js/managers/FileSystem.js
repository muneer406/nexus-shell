import state from '../core/State.js';

class FileSystem {
    constructor() {
        this.history = [];
        this.maxHistory = 50;
    }

    normalizePath(inputPath, basePath = null) {
        const base = basePath ?? state.get('currentDirectory') ?? '/';
        const raw = String(inputPath ?? '').trim();
        const path = raw.startsWith('/') ? raw : `${base.replace(/\/+$/g, '')}/${raw}`;

        const parts = path.split('/');
        const stack = [];
        for (const part of parts) {
            if (!part || part === '.') continue;
            if (part === '..') {
                stack.pop();
                continue;
            }
            stack.push(part);
        }
        return '/' + stack.join('/');
    }

    getNode(path) {
        const normalized = this.normalizePath(path, '/');
        const fs = state.get('fileSystem');
        const root = fs?.['/'];
        if (!root) return null;

        if (normalized === '/') return { node: root, parent: null, name: '/' };

        const parts = normalized.split('/').filter(Boolean);
        let current = root;
        let parent = null;
        let name = '/';

        for (const part of parts) {
            if (!current || current.type !== 'directory') return null;
            parent = current;
            name = part;
            current = current.children?.[part];
        }

        if (!current) return null;
        return { node: current, parent, name };
    }

    list(path = null) {
        const targetPath = this.normalizePath(path ?? state.get('currentDirectory') ?? '/', '/');
        const resolved = this.getNode(targetPath);
        if (!resolved || resolved.node.type !== 'directory') {
            return { ok: false, error: 'Not a directory', path: targetPath, items: [] };
        }

        const children = resolved.node.children ?? {};
        const items = Object.keys(children)
            .sort((a, b) => a.localeCompare(b))
            .map(name => {
                const child = children[name];
                return { name, type: child.type };
            });

        return { ok: true, path: targetPath, items };
    }

    cd(path) {
        const targetPath = this.normalizePath(path ?? '/', state.get('currentDirectory') ?? '/');
        const resolved = this.getNode(targetPath);
        if (!resolved || resolved.node.type !== 'directory') {
            return { ok: false, error: 'Directory not found', path: targetPath };
        }
        state.setState({ currentDirectory: targetPath });
        return { ok: true, path: targetPath };
    }

    navigateTo(path) {
        const from = this.pwd();
        const targetPath = this.normalizePath(path ?? '/', from);
        const resolved = this.getNode(targetPath);
        if (!resolved || resolved.node.type !== 'directory') {
            return { ok: false, error: 'Directory not found', path: targetPath };
        }

        if (from !== targetPath) {
            this.history.push(from);
            if (this.history.length > this.maxHistory) this.history.shift();
        }

        state.setState({ currentDirectory: targetPath });
        return { ok: true, path: targetPath };
    }

    goBack() {
        if (this.history.length === 0) {
            return { ok: false, error: 'No previous directory' };
        }
        const prev = this.history.pop();
        return this.cd(prev);
    }

    pwd() {
        return state.get('currentDirectory') ?? '/';
    }

    mkdir(nameOrPath) {
        const raw = String(nameOrPath ?? '').trim();
        if (!raw) return { ok: false, error: 'Missing folder name' };

        const baseDir = raw.startsWith('/') ? this.normalizePath(raw, '/') : this.normalizePath('.', state.get('currentDirectory') ?? '/');
        const parentPath = raw.startsWith('/') ? this.normalizePath(baseDir.split('/').slice(0, -1).join('/') || '/', '/') : this.normalizePath('.', state.get('currentDirectory') ?? '/');
        const name = raw.startsWith('/') ? baseDir.split('/').filter(Boolean).slice(-1)[0] : raw;

        const parentResolved = this.getNode(parentPath);
        if (!parentResolved || parentResolved.node.type !== 'directory') {
            return { ok: false, error: 'Parent directory not found', path: parentPath };
        }

        const parent = parentResolved.node;
        parent.children ??= {};

        if (parent.children[name]) {
            return { ok: false, error: 'Already exists', name };
        }

        parent.children[name] = {
            type: 'directory',
            name,
            children: {},
            created: Date.now(),
        };

        state.setState({ fileSystem: state.get('fileSystem') });
        return { ok: true, name };
    }

    touch(nameOrPath, content = '') {
        const raw = String(nameOrPath ?? '').trim();
        if (!raw) return { ok: false, error: 'Missing file name' };

        const baseDir = raw.startsWith('/') ? this.normalizePath(raw, '/') : this.normalizePath('.', state.get('currentDirectory') ?? '/');
        const parentPath = raw.startsWith('/') ? this.normalizePath(baseDir.split('/').slice(0, -1).join('/') || '/', '/') : this.normalizePath('.', state.get('currentDirectory') ?? '/');
        const name = raw.startsWith('/') ? baseDir.split('/').filter(Boolean).slice(-1)[0] : raw;

        const parentResolved = this.getNode(parentPath);
        if (!parentResolved || parentResolved.node.type !== 'directory') {
            return { ok: false, error: 'Parent directory not found', path: parentPath };
        }

        const parent = parentResolved.node;
        parent.children ??= {};

        if (parent.children[name] && parent.children[name].type !== 'file') {
            return { ok: false, error: 'A directory with that name exists', name };
        }

        parent.children[name] = {
            type: 'file',
            name,
            content: String(content ?? ''),
            size: String(content ?? '').length,
            created: parent.children[name]?.created ?? Date.now(),
            modified: Date.now(),
        };

        state.setState({ fileSystem: state.get('fileSystem') });
        return { ok: true, name };
    }

    rm(nameOrPath) {
        const raw = String(nameOrPath ?? '').trim();
        if (!raw) return { ok: false, error: 'Missing name' };

        const targetPath = this.normalizePath(raw, state.get('currentDirectory') ?? '/');
        if (targetPath === '/') return { ok: false, error: 'Refusing to delete root' };

        const parts = targetPath.split('/').filter(Boolean);
        const name = parts.pop();
        const parentPath = '/' + parts.join('/');

        const parentResolved = this.getNode(parentPath);
        if (!parentResolved || parentResolved.node.type !== 'directory') {
            return { ok: false, error: 'Parent directory not found', path: parentPath };
        }

        const parent = parentResolved.node;
        if (!parent.children?.[name]) {
            return { ok: false, error: 'Not found', name };
        }

        delete parent.children[name];
        state.setState({ fileSystem: state.get('fileSystem') });
        return { ok: true, name };
    }

    rename(nameOrPath, newName) {
        const raw = String(nameOrPath ?? '').trim();
        const next = String(newName ?? '').trim();

        if (!raw) return { ok: false, error: 'Missing source name' };
        if (!next) return { ok: false, error: 'Missing new name' };
        if (next.includes('/')) return { ok: false, error: 'New name must not contain /' };
        if (next === '.' || next === '..') return { ok: false, error: 'Invalid new name' };

        const oldPath = this.normalizePath(raw, state.get('currentDirectory') ?? '/');
        if (oldPath === '/') return { ok: false, error: 'Refusing to rename root' };

        const parts = oldPath.split('/').filter(Boolean);
        const oldName = parts.pop();
        const parentPath = '/' + parts.join('/');

        const parentResolved = this.getNode(parentPath);
        if (!parentResolved || parentResolved.node.type !== 'directory') {
            return { ok: false, error: 'Parent directory not found', path: parentPath };
        }

        const parent = parentResolved.node;
        const existing = parent.children?.[oldName];
        if (!existing) return { ok: false, error: 'Not found', name: oldName };

        if (parent.children?.[next]) {
            return { ok: false, error: 'Already exists', name: next };
        }

        parent.children[next] = { ...existing, name: next, modified: Date.now() };
        delete parent.children[oldName];

        const cwd = this.pwd();
        const newPath = parentPath === '/' ? `/${next}` : `${parentPath}/${next}`;

        if (cwd === oldPath || cwd.startsWith(oldPath + '/')) {
            const updatedCwd = newPath + cwd.slice(oldPath.length);
            state.setState({ fileSystem: state.get('fileSystem'), currentDirectory: updatedCwd });
            return { ok: true, from: oldPath, to: newPath, cwd: updatedCwd };
        }

        state.setState({ fileSystem: state.get('fileSystem') });
        return { ok: true, from: oldPath, to: newPath };
    }

    readFile(path) {
        const resolved = this.getNode(path);
        if (!resolved || resolved.node.type !== 'file') {
            return { ok: false, error: 'File not found' };
        }
        return { ok: true, content: resolved.node.content ?? '' };
    }
}

const fileSystem = new FileSystem();
export default fileSystem;
