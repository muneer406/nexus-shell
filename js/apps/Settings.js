import state from '../core/State.js';
import { getWallpaperEntries } from '../assets/wallpaperCatalog.js';
import { isValidHexColor, normalizeWallpaperConfig } from '../core/wallpaper.js';

const GRADIENT_PRESETS = [
    { label: 'Aurora', direction: '135deg', from: '#6ea8ff', to: '#47ffd1' },
    { label: 'Sunset', direction: '135deg', from: '#fa709a', to: '#fee140' },
    { label: 'Nebula', direction: '135deg', from: '#4facfe', to: '#00f2fe' },
    { label: 'Midnight', direction: '135deg', from: '#0b1020', to: '#160a30' },
];

const SOLID_PRESETS = [
    { label: 'Midnight', color: '#0b1020' },
    { label: 'Slate', color: '#1a233a' },
    { label: 'Ink', color: '#0a0716' },
    { label: 'Snow', color: '#f5f7ff' },
];

const SettingsApp = {
    mount({ container }) {
        const root = document.createElement('div');
        root.className = 'app-settings';

        root.innerHTML = `
            <div class="settings-section">
                <div class="settings-section-title">Appearance</div>
                <div class="settings-group">
                    <div class="setting-item">
                        <div class="setting-label">
                            <div class="setting-label-text">UI mode</div>
                            <div class="setting-label-description">Changes window/taskbar colors and contrast (not the wallpaper).</div>
                        </div>
                        <div class="setting-control">
                            <select class="settings-select" data-setting="theme">
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                            </select>
                        </div>
                    </div>

                    <div class="setting-item">
                        <div class="setting-label">
                            <div class="setting-label-text">Wallpaper type</div>
                            <div class="setting-label-description">Pick image, solid color, gradient, or a custom URL.</div>
                        </div>
                        <div class="setting-control">
                            <select class="settings-select" data-setting="wallpaper-type">
                                <option value="image">Wallpaper images</option>
                                <option value="solid">Solid color</option>
                                <option value="gradient">Gradient</option>
                                <option value="url">Custom URL</option>
                            </select>
                        </div>
                    </div>

                    <div class="settings-subsection" data-pane="image">
                        <div class="settings-subtitle">Wallpaper images</div>
                        <div class="settings-help">Loaded from <span class="mono">assets/wallpapers</span>.</div>
                        <div class="wallpaper-grid" data-wallpaper-grid></div>
                    </div>

                    <div class="settings-subsection hidden" data-pane="solid">
                        <div class="settings-subtitle">Solid color</div>
                        <div class="swatch-row" data-solid-swatches></div>
                        <div class="inline-row">
                            <label class="inline-label">Custom</label>
                            <input class="settings-input" data-solid-color type="color" value="#0b1020" aria-label="Choose color" />
                        </div>
                    </div>

                    <div class="settings-subsection hidden" data-pane="gradient">
                        <div class="settings-subtitle">Gradient</div>
                        <div class="swatch-row" data-gradient-presets></div>
                        <div class="inline-row">
                            <label class="inline-label">From</label>
                            <input class="settings-input" data-grad-from type="color" value="#6ea8ff" />
                            <label class="inline-label">To</label>
                            <input class="settings-input" data-grad-to type="color" value="#ff87d7" />
                            <label class="inline-label">Direction</label>
                            <select class="settings-select" data-grad-direction>
                                <option value="135deg">Diagonal</option>
                                <option value="90deg">Left → Right</option>
                                <option value="180deg">Top → Bottom</option>
                                <option value="45deg">Bottom-left → Top-right</option>
                            </select>
                        </div>
                        <div class="settings-preview" data-gradient-preview></div>
                    </div>

                    <div class="settings-subsection hidden" data-pane="url">
                        <div class="settings-subtitle">Custom wallpaper URL</div>
                        <div class="inline-row">
                            <input class="settings-input" data-url-input type="text" placeholder="https://... or data:image/..." />
                            <button class="settings-button" type="button" data-url-apply>Apply</button>
                        </div>
                        <div class="settings-error hidden" data-url-error></div>
                        <div class="settings-help">If it fails to load, it falls back to a local wallpaper.</div>
                    </div>
                </div>
            </div>
        `;

        const themeSelect = root.querySelector('[data-setting="theme"]');
        const typeSelect = root.querySelector('[data-setting="wallpaper-type"]');

        const panes = {
            image: root.querySelector('[data-pane="image"]'),
            solid: root.querySelector('[data-pane="solid"]'),
            gradient: root.querySelector('[data-pane="gradient"]'),
            url: root.querySelector('[data-pane="url"]'),
        };

        const grid = root.querySelector('[data-wallpaper-grid]');
        const solidSwatches = root.querySelector('[data-solid-swatches]');
        const solidColor = root.querySelector('[data-solid-color]');

        const gradPresets = root.querySelector('[data-gradient-presets]');
        const gradFrom = root.querySelector('[data-grad-from]');
        const gradTo = root.querySelector('[data-grad-to]');
        const gradDir = root.querySelector('[data-grad-direction]');
        const gradPreview = root.querySelector('[data-gradient-preview]');

        const urlInput = root.querySelector('[data-url-input]');
        const urlApply = root.querySelector('[data-url-apply]');
        const urlError = root.querySelector('[data-url-error]');

        const showPane = (type) => {
            Object.entries(panes).forEach(([key, el]) => {
                el?.classList.toggle('hidden', key !== type);
            });
        };

        const setWallpaper = (wallpaper) => {
            state.setState({ wallpaper });
        };

        const currentWallpaper = normalizeWallpaperConfig(state.get('wallpaper'));

        themeSelect.value = (state.get('theme') ?? 'dark') === 'light' ? 'light' : 'dark';
        typeSelect.value = currentWallpaper.type;
        showPane(typeSelect.value);

        themeSelect.addEventListener('change', () => {
            state.setState({ theme: themeSelect.value });
        });

        typeSelect.addEventListener('change', () => {
            showPane(typeSelect.value);
            const normalized = normalizeWallpaperConfig(state.get('wallpaper'));
            if (normalized.type === typeSelect.value) return;

            if (typeSelect.value === 'image') {
                const all = getWallpaperEntries();
                const picked = all[Math.floor(Math.random() * Math.max(1, all.length))];
                if (picked) {
                    setWallpaper({ type: 'image', src: picked.src, id: picked.id });
                }
            }
            if (typeSelect.value === 'solid') {
                setWallpaper({ type: 'solid', color: '#0b1020' });
            }
            if (typeSelect.value === 'gradient') {
                setWallpaper({ type: 'gradient', direction: '135deg', from: '#6ea8ff', to: '#ff87d7' });
            }
            if (typeSelect.value === 'url') {
                // Don't overwrite wallpaper with an empty URL; user will apply a URL explicitly.
                setUrlError('');
            }
        });

        // Image grid (previews + names)
        const entries = getWallpaperEntries();
        grid.innerHTML = '';
        entries.forEach((w) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'wallpaper-card';
            btn.style.backgroundImage = `url(${w.src})`;
            btn.dataset.id = w.id;
            btn.innerHTML = `<div class="wallpaper-card-label">${w.label}</div>`;
            btn.addEventListener('click', () => {
                setWallpaper({ type: 'image', src: w.src, id: w.id });
                typeSelect.value = 'image';
                showPane('image');
                updateActive();
            });
            grid.appendChild(btn);
        });

        // Solid presets
        SOLID_PRESETS.forEach((p) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'swatch';
            b.style.background = p.color;
            b.title = p.label;
            b.addEventListener('click', () => {
                solidColor.value = p.color;
                setWallpaper({ type: 'solid', color: p.color });
                typeSelect.value = 'solid';
                showPane('solid');
                updateActive();
            });
            solidSwatches.appendChild(b);
        });

        solidColor.addEventListener('input', () => {
            setWallpaper({ type: 'solid', color: solidColor.value });
            typeSelect.value = 'solid';
            showPane('solid');
            updateActive();
        });

        // Gradient presets + live preview
        const renderGradientPreview = () => {
            gradPreview.style.backgroundImage = `linear-gradient(${gradDir.value}, ${gradFrom.value}, ${gradTo.value})`;
        };

        GRADIENT_PRESETS.forEach((p) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'swatch gradient';
            b.title = p.label;
            b.style.backgroundImage = `linear-gradient(${p.direction}, ${p.from}, ${p.to})`;
            b.addEventListener('click', () => {
                gradFrom.value = p.from;
                gradTo.value = p.to;
                gradDir.value = p.direction;
                setWallpaper({ type: 'gradient', direction: gradDir.value, from: gradFrom.value, to: gradTo.value });
                typeSelect.value = 'gradient';
                showPane('gradient');
                renderGradientPreview();
                updateActive();
            });
            gradPresets.appendChild(b);
        });

        const applyGradient = () => {
            setWallpaper({ type: 'gradient', direction: gradDir.value, from: gradFrom.value, to: gradTo.value });
            typeSelect.value = 'gradient';
            showPane('gradient');
            renderGradientPreview();
            updateActive();
        };

        gradFrom.addEventListener('input', applyGradient);
        gradTo.addEventListener('input', applyGradient);
        gradDir.addEventListener('change', applyGradient);
        renderGradientPreview();

        // URL handling
        const setUrlError = (msg) => {
            if (!msg) {
                urlError.classList.add('hidden');
                urlError.textContent = '';
                return;
            }
            urlError.classList.remove('hidden');
            urlError.textContent = msg;
        };

        urlApply.addEventListener('click', () => {
            const url = String(urlInput.value ?? '').trim();
            if (!url) {
                setUrlError('Please enter a URL.');
                return;
            }
            if (!url.startsWith('http') && !url.startsWith('data:')) {
                setUrlError('URL must start with http(s):// or data:.');
                return;
            }
            setUrlError('');
            urlApply.disabled = true;
            const previousLabel = urlApply.textContent;
            urlApply.textContent = 'Testing…';

            const img = new Image();
            let finished = false;
            const cleanup = () => {
                finished = true;
                urlApply.disabled = false;
                urlApply.textContent = previousLabel;
            };

            const timeoutId = window.setTimeout(() => {
                if (finished) return;
                cleanup();
                setUrlError('Timed out trying to load the image.');
            }, 5000);

            img.onload = () => {
                if (finished) return;
                window.clearTimeout(timeoutId);
                cleanup();
                setWallpaper({ type: 'url', url });
                typeSelect.value = 'url';
                showPane('url');
                updateActive();
            };
            img.onerror = () => {
                if (finished) return;
                window.clearTimeout(timeoutId);
                cleanup();
                setUrlError('Could not load the image from that URL.');
            };
            img.src = url;
        });

        // Keep UI in sync with current state
        const updateActive = () => {
            const w = normalizeWallpaperConfig(state.get('wallpaper'));
            typeSelect.value = w.type;
            showPane(w.type);

            if (w.type === 'image') {
                grid.querySelectorAll('.wallpaper-card').forEach((el) => {
                    el.classList.toggle('active', el.dataset.id === w.id);
                });
            }

            if (w.type === 'solid') {
                if (isValidHexColor(w.color)) solidColor.value = w.color;
            }

            if (w.type === 'gradient') {
                gradFrom.value = w.from;
                gradTo.value = w.to;
                gradDir.value = w.direction;
                renderGradientPreview();
            }

            if (w.type === 'url') {
                urlInput.value = w.url ?? '';
            }
        };

        const unsub = state.subscribe('wallpaper', () => updateActive());
        updateActive();

        container.innerHTML = '';
        container.appendChild(root);

        return () => {
            unsub?.();
        };
    }
};

export default SettingsApp;
