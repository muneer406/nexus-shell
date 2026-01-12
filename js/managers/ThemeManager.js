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
        if (!wallpaper || wallpaper === 'default') {
            desktop.style.backgroundImage = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        } else if (wallpaper.startsWith('http') || wallpaper.startsWith('data:')) {
            desktop.style.backgroundImage = `url(${wallpaper})`;
        } else {
            const presets = {
                'gradient-1': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'gradient-2': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                'gradient-3': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                'gradient-4': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                'gradient-5': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            };
            desktop.style.backgroundImage = presets[wallpaper] || presets['gradient-1'];
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
            { name: 'default', label: 'Default' },
            { name: 'gradient-1', label: 'Purple Dream' },
            { name: 'gradient-2', label: 'Pink Sunset' },
            { name: 'gradient-3', label: 'Ocean Blue' },
            { name: 'gradient-4', label: 'Emerald' },
            { name: 'gradient-5', label: 'Warm Sunrise' },
        ];
    }
}

export default ThemeManager;
