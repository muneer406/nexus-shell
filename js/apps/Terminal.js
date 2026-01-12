import state from '../core/State.js';
import eventBus, { EVENTS } from '../core/EventBus.js';
import storage from '../core/Storage.js';
import fileSystem from '../managers/FileSystem.js';
import { getWallpaperEntries } from '../assets/wallpaperCatalog.js';
import { isValidHexColor, normalizeWallpaperConfig } from '../core/wallpaper.js';

function formatTimestamp(date = new Date()) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
}

function parseCommand(input) {
    const raw = String(input ?? '').trim();
    if (!raw) return { cmd: '', args: [] };

    const parts = [];
    let current = '';
    let quote = null;

    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if ((ch === '"' || ch === "'") && (quote === null || quote === ch)) {
            quote = quote === null ? ch : null;
            continue;
        }
        if (!quote && /\s/.test(ch)) {
            if (current) {
                parts.push(current);
                current = '';
            }
            continue;
        }
        current += ch;
    }
    if (current) parts.push(current);

    return { cmd: (parts[0] ?? '').toLowerCase(), args: parts.slice(1) };
}

function nodeIcon(type) {
    return type === 'directory' ? '📁' : '📄';
}

const TerminalApp = {
    mount({ container, windowId }) {
        const root = document.createElement('div');
        root.className = 'app-terminal';
        root.innerHTML = `
            <div class="terminal-output"></div>
            <div class="terminal-input-container">
                <span class="terminal-prompt"></span>
                <input type="text" class="terminal-input" placeholder="Enter command..." autocomplete="off" spellcheck="false">
            </div>
        `;

        const output = root.querySelector('.terminal-output');
        const prompt = root.querySelector('.terminal-prompt');
        const input = root.querySelector('.terminal-input');

        let history = state.get('terminalHistory') ?? [];
        let historyIndex = history.length;

        const writeLine = (text, kind = '') => {
            const line = document.createElement('div');
            line.className = 'terminal-line' + (kind ? ` ${kind}` : '');
            line.textContent = text;
            output.appendChild(line);
            output.scrollTop = output.scrollHeight;
        };

        const updatePrompt = () => {
            prompt.textContent = `${fileSystem.pwd()} $`;
        };

        const runCommand = (raw) => {
            const { cmd, args } = parseCommand(raw);
            if (!cmd) return;

            state.addToTerminalHistory(raw);
            history = state.get('terminalHistory') ?? [];
            historyIndex = history.length;

            writeLine(`[${formatTimestamp()}] ${fileSystem.pwd()} $ ${raw}`, 'command');

            switch (cmd) {
                case 'help': {
                    writeLine('Commands: help, clear, cls, exit, echo, date, whoami, pwd, ls, cd, mkdir, touch, rm, open, close, theme, wallpaper, stats');
                    break;
                }
                case 'clear': {
                    output.innerHTML = '';
                    break;
                }
                case 'cls': {
                    output.innerHTML = '';
                    break;
                }
                case 'exit': {
                    if (!windowId) {
                        writeLine('Cannot exit: missing window id', 'error');
                        break;
                    }
                    eventBus.publish(EVENTS.WINDOW_CLOSE_REQUESTED, { windowId, source: 'terminal-exit' });
                    break;
                }
                case 'echo': {
                    writeLine(args.join(' '));
                    break;
                }
                case 'date': {
                    writeLine(new Date().toString());
                    break;
                }
                case 'whoami': {
                    writeLine('nexus-user');
                    break;
                }
                case 'pwd': {
                    writeLine(fileSystem.pwd());
                    break;
                }
                case 'ls': {
                    const res = fileSystem.list(args[0]);
                    if (!res.ok) {
                        writeLine(res.error, 'error');
                        break;
                    }
                    if (res.items.length === 0) {
                        writeLine('(empty)');
                        break;
                    }
                    res.items.forEach(item => writeLine(`${nodeIcon(item.type)} ${item.name}`));
                    break;
                }
                case 'cd': {
                    const target = args[0] ?? '/';
                    const res = fileSystem.cd(target);
                    if (!res.ok) writeLine(res.error, 'error');
                    updatePrompt();
                    break;
                }
                case 'mkdir': {
                    const res = fileSystem.mkdir(args[0]);
                    if (!res.ok) writeLine(res.error, 'error');
                    break;
                }
                case 'touch': {
                    const res = fileSystem.touch(args[0], args.slice(1).join(' '));
                    if (!res.ok) writeLine(res.error, 'error');
                    break;
                }
                case 'rm': {
                    const res = fileSystem.rm(args[0]);
                    if (!res.ok) writeLine(res.error, 'error');
                    break;
                }
                case 'open': {
                    const app = (args[0] ?? '').toLowerCase();
                    if (!app) {
                        writeLine('Usage: open <terminal|file-explorer|system-monitor|settings>', 'error');
                        break;
                    }
                    eventBus.publish(EVENTS.APP_LAUNCH_REQUESTED, { appName: app, source: 'terminal' });
                    break;
                }
                case 'close': {
                    const app = (args[0] ?? '').toLowerCase();
                    if (!app) {
                        writeLine('Usage: close <terminal|file-explorer|system-monitor|settings>', 'error');
                        break;
                    }

                    const appTypeByName = {
                        'terminal': 'terminal',
                        'file-explorer': 'file-explorer',
                        'system-monitor': 'system-monitor',
                        'settings': 'settings',
                    };

                    const appType = appTypeByName[app];
                    if (!appType) {
                        writeLine('Unknown app. Try: terminal, file-explorer, system-monitor, settings', 'error');
                        break;
                    }

                    const windows = state.get('windows') ?? [];
                    const win = windows.find(w => w.appType === appType);
                    if (!win) {
                        writeLine('App is not open', 'info');
                        break;
                    }

                    eventBus.publish(EVENTS.WINDOW_CLOSE_REQUESTED, { windowId: win.id, source: 'terminal' });
                    writeLine(`Closed ${app}`, 'success');
                    break;
                }
                case 'theme': {
                    const theme = (args[0] ?? '').toLowerCase();
                    if (theme !== 'light' && theme !== 'dark') {
                        writeLine('Usage: theme <light|dark>', 'error');
                        break;
                    }
                    state.setState({ theme });
                    writeLine(`Theme set to ${theme}`, 'success');
                    break;
                }
                case 'wallpaper': {
                    if (args.length === 0) {
                        const current = state.get('wallpaper');
                        const normalized = normalizeWallpaperConfig(current);
                        if (normalized.type === 'image') writeLine(`Current wallpaper: image ${normalized.id ?? normalized.src}`);
                        if (normalized.type === 'url') writeLine(`Current wallpaper: url ${normalized.url || '(empty)'}`);
                        if (normalized.type === 'solid') writeLine(`Current wallpaper: solid ${normalized.color}`);
                        if (normalized.type === 'gradient') writeLine(`Current wallpaper: gradient ${normalized.from} -> ${normalized.to} (${normalized.direction})`);
                        writeLine('Usage:', 'info');
                        writeLine('  wallpaper image [random|<id>]', 'info');
                        writeLine('  wallpaper url <https://...>', 'info');
                        writeLine('  wallpaper solid <#hex>', 'info');
                        writeLine('  wallpaper gradient <#from> <#to> [direction]', 'info');
                        writeLine('  wallpaper <value>  (back-compat: url/path/id)', 'info');
                        break;
                    }

                    const mode = String(args[0] ?? '').toLowerCase();

                    if (mode === 'image' || mode === 'img') {
                        const choice = args[1] ?? 'random';
                        if (String(choice).toLowerCase() === 'random') {
                            const entries = getWallpaperEntries();
                            if (entries.length === 0) {
                                writeLine('No wallpapers available in catalog', 'error');
                                break;
                            }
                            const picked = entries[Math.floor(Math.random() * entries.length)];
                            state.setState({ wallpaper: { type: 'image', src: picked.src, id: picked.id } });
                            writeLine(`Wallpaper set to image ${picked.id}`, 'success');
                            break;
                        }
                        const normalized = normalizeWallpaperConfig(choice);
                        state.setState({ wallpaper: { type: 'image', src: normalized.src, id: normalized.id ?? normalized.src } });
                        writeLine(`Wallpaper set to image ${normalized.id ?? normalized.src}`, 'success');
                        break;
                    }

                    if (mode === 'url') {
                        const url = args.slice(1).join(' ').trim();
                        if (!url) {
                            writeLine('Usage: wallpaper url <https://...>', 'error');
                            break;
                        }
                        state.setState({ wallpaper: { type: 'url', url } });
                        writeLine('Wallpaper set to URL', 'success');
                        break;
                    }

                    if (mode === 'solid' || mode === 'color') {
                        const color = String(args[1] ?? '').trim();
                        if (!isValidHexColor(color)) {
                            writeLine('Usage: wallpaper solid <#hex> (example: #0b1020)', 'error');
                            break;
                        }
                        state.setState({ wallpaper: { type: 'solid', color } });
                        writeLine(`Wallpaper set to solid ${color}`, 'success');
                        break;
                    }

                    if (mode === 'gradient') {
                        const from = String(args[1] ?? '').trim();
                        const to = String(args[2] ?? '').trim();
                        const direction = String(args[3] ?? '').trim() || '135deg';
                        if (!isValidHexColor(from) || !isValidHexColor(to)) {
                            writeLine('Usage: wallpaper gradient <#from> <#to> [direction]', 'error');
                            break;
                        }
                        state.setState({ wallpaper: { type: 'gradient', from, to, direction } });
                        writeLine(`Wallpaper set to gradient ${from} -> ${to}`, 'success');
                        break;
                    }

                    // Back-compat: allow raw value (url/path/id/etc)
                    const rawValue = args.join(' ');
                    state.setState({ wallpaper: normalizeWallpaperConfig(rawValue) });
                    writeLine('Wallpaper updated', 'success');
                    break;
                }
                case 'stats': {
                    const windows = state.get('windows') ?? [];
                    const usage = storage.getUsage();
                    writeLine(`Windows: ${windows.length}`);
                    writeLine(`Commands executed: ${state.get('commandsExecuted') ?? 0}`);
                    writeLine(`LocalStorage items: ${usage.itemCount} (${usage.sizeKB} KB)`);
                    break;
                }
                default:
                    writeLine(`Unknown command: ${cmd}`, 'error');
                    break;
            }
        };

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const value = input.value;
                input.value = '';
                runCommand(value);
                updatePrompt();
                return;
            }

            if (e.key === 'ArrowUp') {
                if (history.length === 0) return;
                historyIndex = Math.max(0, historyIndex - 1);
                input.value = history[historyIndex] ?? '';
                queueMicrotask(() => input.setSelectionRange(input.value.length, input.value.length));
                e.preventDefault();
                return;
            }

            if (e.key === 'ArrowDown') {
                if (history.length === 0) return;
                historyIndex = Math.min(history.length, historyIndex + 1);
                input.value = historyIndex >= history.length ? '' : (history[historyIndex] ?? '');
                queueMicrotask(() => input.setSelectionRange(input.value.length, input.value.length));
                e.preventDefault();
            }
        });

        const unsubDir = state.subscribe('currentDirectory', () => {
            updatePrompt();
        });

        container.innerHTML = '';
        container.appendChild(root);
        updatePrompt();

        writeLine('Nexus Shell Terminal');
        writeLine("Type 'help' for available commands.");

        queueMicrotask(() => input.focus());

        return () => {
            unsubDir?.();
        };
    }
};

export default TerminalApp;
