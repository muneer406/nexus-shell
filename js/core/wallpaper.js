import { getDefaultWallpaperEntry, getWallpaperEntries, hasWallpaperFile } from '../assets/wallpaperCatalog.js';

export function isValidHexColor(value) {
    const v = String(value ?? '').trim();
    return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
}

export function normalizeWallpaperConfig(value) {
    const fallback = getDefaultWallpaperEntry();

    if (value && typeof value === 'object' && typeof value.type === 'string') {
        const type = value.type;
        if (type === 'image') {
            const src = String(value.src ?? '').trim();
            if (!src) return { type: 'image', src: fallback.src, id: fallback.id };
            return { type: 'image', src, id: value.id ?? null };
        }
        if (type === 'url') {
            const url = String(value.url ?? '').trim();
            // Keep url-type config even if empty so Settings can remain on the URL pane.
            return { type: 'url', url };
        }
        if (type === 'solid') {
            const color = String(value.color ?? '').trim();
            return { type: 'solid', color: isValidHexColor(color) ? color : '#0b1020' };
        }
        if (type === 'gradient') {
            const from = String(value.from ?? '').trim();
            const to = String(value.to ?? '').trim();
            const direction = String(value.direction ?? '').trim() || '135deg';
            return {
                type: 'gradient',
                direction,
                from: isValidHexColor(from) ? from : '#6ea8ff',
                to: isValidHexColor(to) ? to : '#ff87d7',
            };
        }
    }

    const raw = String(value ?? '').trim();
    if (!raw || raw === 'default') {
        return { type: 'image', src: fallback.src, id: fallback.id };
    }

    if (raw.startsWith('http') || raw.startsWith('data:')) {
        return { type: 'url', url: raw };
    }

    // Support setting by filename (e.g. 12.jpg) or id from catalog.
    if (hasWallpaperFile(raw)) {
        return { type: 'image', src: `assets/wallpapers/${raw}`, id: raw };
    }

    // Back-compat for older values like gradient-1, aurora, etc: map to the first image.
    if (raw.startsWith('gradient-')) {
        return { type: 'image', src: fallback.src, id: fallback.id };
    }

    // If it's a relative path, try to use it directly.
    if (raw.includes('/') || /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(raw)) {
        return { type: 'image', src: raw, id: raw };
    }

    // Try matching by base name against the catalog.
    const entries = getWallpaperEntries();
    const found = entries.find(e => e.id.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '') === raw);
    if (found) return { type: 'image', src: found.src, id: found.id };

    return { type: 'image', src: fallback.src, id: fallback.id };
}

export function applyWallpaperToDesktop(desktopEl, config) {
    const desktop = desktopEl;
    if (!desktop) return;

    const normalized = normalizeWallpaperConfig(config);
    const fallback = getDefaultWallpaperEntry();

    // Prevent stale async loads from overwriting newer wallpapers.
    const token = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    desktop.dataset.wallpaperToken = token;

    // Ensure base sizing.
    desktop.style.backgroundRepeat = 'no-repeat';
    desktop.style.backgroundPosition = 'center';
    desktop.style.backgroundSize = 'cover';

    if (normalized.type === 'solid') {
        desktop.style.backgroundImage = 'none';
        desktop.style.backgroundColor = normalized.color;
        return;
    }

    if (normalized.type === 'gradient') {
        desktop.style.backgroundColor = '';
        desktop.style.backgroundImage = `linear-gradient(${normalized.direction}, ${normalized.from}, ${normalized.to})`;
        return;
    }

    if (normalized.type === 'url') {
        const src = normalized.url;
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            if (desktop.dataset.wallpaperToken !== token) return;
            desktop.style.backgroundColor = '';
            desktop.style.backgroundImage = `url(${src})`;
        };
        img.onerror = () => {
            if (desktop.dataset.wallpaperToken !== token) return;
            desktop.style.backgroundColor = '';
            desktop.style.backgroundImage = `url(${fallback.src})`;
        };
        img.src = src;
        return;
    }

    // Image wallpapers (local or relative path)
    const src = normalized.src;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
        if (desktop.dataset.wallpaperToken !== token) return;
        desktop.style.backgroundColor = '';
        desktop.style.backgroundImage = `url(${src})`;
    };
    img.onerror = () => {
        if (desktop.dataset.wallpaperToken !== token) return;
        desktop.style.backgroundColor = '';
        desktop.style.backgroundImage = `url(${fallback.src})`;
    };
    img.src = src;
}
