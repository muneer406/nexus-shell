import state from '../core/State.js';
import eventBus, { EVENTS } from '../core/EventBus.js';
import storage from '../core/Storage.js';
import fileSystem from '../managers/FileSystem.js';

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
    mount({ container }) {
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
                    writeLine('Commands: help, clear, echo, date, whoami, pwd, ls, cd, mkdir, touch, rm, open, close, theme, wallpaper, stats');
                    break;
                }
                case 'clear': {
                    output.innerHTML = '';
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

                    eventBus.publish(EVENTS.WINDOW_CLOSED, { windowId: win.id, source: 'terminal' });
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
                    const value = args[0];
                    if (!value) {
                        writeLine('Usage: wallpaper <default|gradient-1|...|url>', 'error');
                        break;
                    }
                    state.setState({ wallpaper: value });
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
