export async function loadAppModule(appType) {
    switch (appType) {
        case 'terminal': {
            const mod = await import('./Terminal.js');
            return mod.default;
        }
        case 'file-explorer': {
            const mod = await import('./FileExplorer.js');
            return mod.default;
        }
        case 'system-monitor': {
            const mod = await import('./SystemMonitor.js');
            return mod.default;
        }
        case 'settings': {
            const mod = await import('./Settings.js');
            return mod.default;
        }
        default:
            return null;
    }
}
