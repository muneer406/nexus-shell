import state from '../core/State.js';

const SettingsApp = {
    mount({ container }) {
        const root = document.createElement('div');
        root.className = 'app-settings';
        root.innerHTML = `
            <div class="settings-section">
                <div class="settings-section-title">Appearance</div>
                <div class="settings-option">
                    <div class="settings-label">Theme</div>
                    <div class="settings-control">
                        <select class="settings-select" data-setting="theme">
                            <option value="light">Light</option>
                            <option value="dark">Dark</option>
                        </select>
                    </div>
                </div>
                <div class="settings-option">
                    <div class="settings-label">Wallpaper</div>
                    <div class="settings-control">
                        <select class="settings-select" data-setting="wallpaper">
                            <option value="default">Default</option>
                            <option value="gradient-1">Purple Dream</option>
                            <option value="gradient-2">Pink Sunset</option>
                            <option value="gradient-3">Ocean Blue</option>
                            <option value="gradient-4">Emerald</option>
                            <option value="gradient-5">Warm Sunrise</option>
                        </select>
                    </div>
                </div>
            </div>
        `;

        const themeSelect = root.querySelector('[data-setting="theme"]');
        const wallpaperSelect = root.querySelector('[data-setting="wallpaper"]');

        themeSelect.value = state.get('theme') ?? 'light';
        wallpaperSelect.value = state.get('wallpaper') ?? 'default';

        themeSelect.addEventListener('change', () => {
            state.setState({ theme: themeSelect.value });
        });

        wallpaperSelect.addEventListener('change', () => {
            state.setState({ wallpaper: wallpaperSelect.value });
        });

        container.innerHTML = '';
        container.appendChild(root);
    }
};

export default SettingsApp;
