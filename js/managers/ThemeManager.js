import state from '../core/State.js';
import eventBus, { EVENTS } from '../core/EventBus.js';

class ThemeManager {
    constructor() {
        this.currentTheme = state.get('theme') || 'light';
        this.init();
    }

    init() {
        state.subscribe('theme', (theme) => {
            this.applyTheme(theme);
        });
        state.subscribe('wallpaper', (wallpaper) => {
            this.applyWallpaper(wallpaper);
        });
        this.applyTheme(this.currentTheme);
        this.applyWallpaper(state.get('wallpaper'));
    }

    applyTheme(themeName) {
        if (themeName === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }

        this.currentTheme = themeName;
        eventBus.publish(EVENTS.THEME_CHANGED, { theme: themeName });
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        state.setState({ theme: newTheme });
    }

    applyWallpaper(wallpaper) {
        const desktop = document.getElementById('desktop');
        const value = String(wallpaper ?? '').trim();

        const presets = {
            // Image wallpapers (preferred)
            'aurora': 'assets/wallpapers/aurora.svg',
            'sunset': 'assets/wallpapers/sunset.svg',
            'nebula': 'assets/wallpapers/nebula.svg',

            // Back-compat values (older saved state)
            'default': 'assets/wallpapers/aurora.svg',
            'gradient-1': 'assets/wallpapers/aurora.svg',
            'gradient-2': 'assets/wallpapers/sunset.svg',
            'gradient-3': 'assets/wallpapers/nebula.svg',
            'gradient-4': 'assets/wallpapers/aurora.svg',
            'gradient-5': 'assets/wallpapers/sunset.svg',
        };

        if (!value) {
            desktop.style.backgroundImage = `url(${presets.aurora})`;
        } else if (value.startsWith('http') || value.startsWith('data:')) {
            desktop.style.backgroundImage = `url(${value})`;
        } else if (presets[value]) {
            desktop.style.backgroundImage = `url(${presets[value]})`;
        } else {
            // Treat unknown values as relative URLs
            desktop.style.backgroundImage = `url(${value})`;
        }

        eventBus.publish(EVENTS.WALLPAPER_CHANGED, { wallpaper });
    }

    setWallpaper(url) {
        state.setState({ wallpaper: url });
    }

    getAvailableThemes() {
        return ['light', 'dark'];
    }

    getWallpaperPresets() {
        return [
            { name: 'aurora', label: 'Aurora' },
            { name: 'sunset', label: 'Sunset' },
            { name: 'nebula', label: 'Nebula' },
        ];
    }
}

export default ThemeManager;
