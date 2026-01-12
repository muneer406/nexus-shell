import state from '../core/State.js';
import eventBus, { EVENTS } from '../core/EventBus.js';
import { applyWallpaperToDesktop } from '../core/wallpaper.js';

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
        const theme = themeName === 'light' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);

        this.currentTheme = theme;
        eventBus.publish(EVENTS.THEME_CHANGED, { theme });
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        state.setState({ theme: newTheme });
    }

    applyWallpaper(wallpaper) {
        const desktop = document.getElementById('desktop');
        applyWallpaperToDesktop(desktop, wallpaper);
        eventBus.publish(EVENTS.WALLPAPER_CHANGED, { wallpaper });
    }

    setWallpaper(url) {
        state.setState({ wallpaper: url });
    }

    getAvailableThemes() {
        return ['light', 'dark'];
    }

    getWallpaperPresets() {
        return [];
    }
}

export default ThemeManager;
