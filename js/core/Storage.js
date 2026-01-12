class Storage {
    constructor(prefix = 'nexus_') {
        this.prefix = prefix;
    }

    save(key, value) {
        try {
            const fullKey = this.prefix + key;
            const serialized = JSON.stringify(value);
            localStorage.setItem(fullKey, serialized);
            return true;
        } catch (error) {
            console.error(`Storage save error for key "${key}":`, error);
            if (error.name === 'QuotaExceededError') {
                console.warn('LocalStorage quota exceeded. Attempting cleanup...');
                this.cleanup();
            }
            return false;
        }
    }

    load(key, defaultValue = null) {
        try {
            const fullKey = this.prefix + key;
            const item = localStorage.getItem(fullKey);

            if (item === null) {
                return defaultValue;
            }

            return JSON.parse(item);
        } catch (error) {
            console.error(`Storage load error for key "${key}":`, error);
            return defaultValue;
        }
    }

    remove(key) {
        try {
            const fullKey = this.prefix + key;
            localStorage.removeItem(fullKey);
            return true;
        } catch (error) {
            console.error(`Storage remove error for key "${key}":`, error);
            return false;
        }
    }

    has(key) {
        const fullKey = this.prefix + key;
        return localStorage.getItem(fullKey) !== null;
    }

    clear() {
        try {
            const keys = this.getAllKeys();
            keys.forEach(key => {
                localStorage.removeItem(this.prefix + key);
            });
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }

    getAllKeys() {
        const keys = [];

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                keys.push(key.substring(this.prefix.length));
            }
        }

        return keys;
    }

    getUsage() {
        let totalSize = 0;
        let itemCount = 0;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(this.prefix)) {
                const value = localStorage.getItem(key);
                totalSize += key.length + (value ? value.length : 0);
                itemCount++;
            }
        }

        const sizeKB = (totalSize / 1024).toFixed(2);

        return {
            itemCount,
            totalSize,
            sizeKB,
            percentUsed: ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(2),
        };
    }

    cleanup() {
        try {
            const keys = this.getAllKeys();
            const items = keys.map(key => {
                const fullKey = this.prefix + key;
                const value = localStorage.getItem(fullKey);
                return {
                    key,
                    size: value ? value.length : 0,
                };
            });
            items.sort((a, b) => b.size - a.size);
            const toRemove = Math.ceil(items.length * 0.1);
            for (let i = 0; i < toRemove && i < items.length; i++) {
                this.remove(items[i].key);
            }
            console.log(`Cleaned up ${toRemove} items from storage`);
        } catch (error) {
            console.error('Storage cleanup error:', error);
        }
    }

    export() {
        const data = {};
        const keys = this.getAllKeys();

        keys.forEach(key => {
            data[key] = this.load(key);
        });

        return data;
    }

    import(data, merge = false) {
        if (!merge) {
            this.clear();
        }

        Object.keys(data).forEach(key => {
            this.save(key, data[key]);
        });
    }
}

// Create singleton instance
const storage = new Storage('nexus_');

export default storage;
