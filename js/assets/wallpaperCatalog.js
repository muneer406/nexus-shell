const WALLPAPER_FILES = [
    '1.jpg',
    '2.jpg',
    '3.jpg',
    '4.jpg',
    '5.jpg',
    '6.png',
    '7.jpg',
    '8.jpg',
    '9.png',
    '10.jpg',
    '11.jpg',
    '12.jpg',
    '13.jpg',
    '14.jpg',
    '15.jpg',
    '16.jpg',
    '17.jpg',
    '18.png',
    '19.png',
    '20.jpg',
    '21.png',
    '22.jpg',
    '23.jpg',
    '24.jpg',
    '25.jpg',
    '26.png',
    '27.jpg',
    '28.png',
    '29.jpg',
    '30.png',
    '31.jpg',
    '32.jpg',
    '33.png',
    '34.jpg',
    '35.jpg',
    '36.jpeg',
    '37.png',
];

function displayNameFromFile(file) {
    const base = String(file ?? '').replace(/\.(png|jpg|jpeg|webp|gif)$/i, '');
    if (/^\d+$/.test(base)) return `Wallpaper ${base}`;
    return base.replace(/[-_]+/g, ' ');
}

export function getWallpaperEntries() {
    return WALLPAPER_FILES.map((file) => ({
        id: file,
        label: displayNameFromFile(file),
        src: `assets/wallpapers/${file}`
    }));
}

export function hasWallpaperFile(fileName) {
    return WALLPAPER_FILES.includes(fileName);
}

export function getDefaultWallpaperEntry() {
    return getWallpaperEntries()[0] ?? { id: null, label: 'Default', src: '' };
}

export default WALLPAPER_FILES;
