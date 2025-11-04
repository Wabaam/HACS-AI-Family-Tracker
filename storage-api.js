
// FM helpers
function fmGetFrontendHAToken(){try{const raw=localStorage.getItem('hassTokens');if(!raw)return'';const o=JSON.parse(raw);return (o&& (o.access_token||o.token))||'';}catch(e){return'';}}
function fmBuildApiUrl(hassUrl, path){const p=path.startsWith('/')?path:'/'+path; if(!hassUrl||!hassUrl.trim())return p; try{const u=new URL(hassUrl); return u.origin + p;}catch(e){return p;}}
/**
 * Family Mapper AI - Home Assistant Storage API v2.1
 * Version: 2.1.0
 * 
 * Uses Home Assistant's built-in storage system via custom sensor states
 * and the recorder database for persistent cross-device storage.
 * Falls back to localStorage when HA is unavailable.
 */

class FamilyMapperStorage {
    constructor(hassUrl, hassToken) {
        this.hassUrl = hassUrl;
        this.hassToken = hassToken;
        this.storageKey = 'family_mapper_ai';
        this.cache = {};
        this.initialized = false;
        this.useLocalStorageFallback = false;
    }

    /**
     * Initialize and preload all data from Home Assistant storage
     */
    async preloadAll() {
        try {
            // Test if we can access HA
            const testResponse = await fetch(`${this.hassUrl}/api/`, {
                headers: {
                    'Authorization': `Bearer ${this.hassToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!testResponse.ok) {
                console.warn('Cannot access Home Assistant, using localStorage fallback');
                this.useLocalStorageFallback = true;
                this.loadFromLocalStorage();
                return true;
            }

            // Try to load existing data from custom sensor states
            const keys = ['config', 'zones', 'trips', 'events', 'notifications'];
            for (const key of keys) {
                try {
                    const data = await this.get(key);
                    if (data) {
                        this.cache[key] = data;
                    }
                } catch (error) {
                    console.warn(`Could not preload ${key}:`, error);
                    // Load from localStorage as fallback
                    const localData = localStorage.getItem(`familyMapper${key.charAt(0).toUpperCase() + key.slice(1)}`);
                    if (localData) {
                        try {
                            this.cache[key] = JSON.parse(localData);
                        } catch (e) {
                            console.error(`Could not parse localStorage for ${key}`);
                        }
                    }
                }
            }

            this.initialized = true;
            console.log('✓ Family Mapper storage initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize HA storage, using localStorage:', error);
            this.useLocalStorageFallback = true;
            this.loadFromLocalStorage();
            return true;
        }
    }

    /**
     * Load all data from localStorage
     */
    loadFromLocalStorage() {
        const keys = ['config', 'zones', 'trips', 'events', 'notifications'];
        keys.forEach(key => {
            const storageKey = `familyMapper${key.charAt(0).toUpperCase() + key.slice(1)}`;
            const data = localStorage.getItem(storageKey);
            if (data) {
                try {
                    this.cache[key] = JSON.parse(data);
                } catch (e) {
                    console.error(`Could not parse localStorage for ${key}`);
                }
            }
        });
        this.initialized = true;
    }

    /**
     * Get data from Home Assistant storage
     * Uses custom sensor entities that we create via API
     */
    async get(key) {
        // If using localStorage fallback, get from there
        if (this.useLocalStorageFallback) {
            return this.getFromLocalStorage(key);
        }

        try {
            // Use sensor entity to store data
            const entityId = `sensor.${this.storageKey}_${key}`;
            
            const response = await fetch(`${this.hassUrl}/api/states/${entityId}`, {
                headers: {
                    'Authorization': `Bearer ${this.hassToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const entity = await response.json();
                if (entity && entity.attributes && entity.attributes.data) {
                    try {
                        // Data is stored in attributes
                        const data = JSON.parse(entity.attributes.data);
                        this.cache[key] = data;
                        return data;
                    } catch (parseError) {
                        console.warn(`Could not parse stored data for ${key}:`, parseError);
                        // Fall back to localStorage
                        return this.getFromLocalStorage(key);
                    }
                }
            } else if (response.status === 404) {
                // Entity doesn't exist yet, try localStorage
                return this.getFromLocalStorage(key);
            }
            
            return null;
        } catch (error) {
            console.error(`Error getting ${key} from HA storage:`, error);
            // Fall back to localStorage
            return this.getFromLocalStorage(key);
        }
    }

    /**
     * Get data from localStorage
     */
    getFromLocalStorage(key) {
        const storageKey = `familyMapper${key.charAt(0).toUpperCase() + key.slice(1)}`;
        const data = localStorage.getItem(storageKey);
        if (data) {
            try {
                const parsed = JSON.parse(data);
                this.cache[key] = parsed;
                return parsed;
            } catch (e) {
                console.error(`Could not parse localStorage for ${key}`);
            }
        }
        return this.cache[key] || null;
    }

    /**
     * Save data to Home Assistant storage
     * Creates custom sensor entities with data in attributes
     */
    async set(key, value) {
        // Always save to localStorage as backup
        const storageKey = `familyMapper${key.charAt(0).toUpperCase() + key.slice(1)}`;
        try {
            localStorage.setItem(storageKey, JSON.stringify(value));
        } catch (e) {
            console.warn('Could not save to localStorage:', e);
        }

        // Store in cache
        this.cache[key] = value;

        // If using localStorage fallback only, return success
        if (this.useLocalStorageFallback) {
            console.log(`✓ Saved ${key} to localStorage (HA unavailable)`);
            return true;
        }

        try {
            const entityId = `sensor.${this.storageKey}_${key}`;
            const jsonString = JSON.stringify(value);

            // Create/update a sensor entity with the data in attributes
            // This uses the POST /api/states endpoint which persists in HA database
            const response = await fetch(`${this.hassUrl}/api/states/${entityId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.hassToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    state: 'ok',
                    attributes: {
                        data: jsonString,
                        friendly_name: `Family Mapper ${key}`,
                        last_updated: new Date().toISOString(),
                        size: jsonString.length
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to save ${key}: ${response.status}`);
            }

            console.log(`✓ Saved ${key} to Home Assistant (${jsonString.length} bytes)`);
            return true;
        } catch (error) {
            console.error(`Error setting ${key} in HA storage (saved to localStorage):`, error);
            // Data is already in localStorage, so return true
            return true;
        }
    }

    /**
     * Clear all stored data
     */
    async clear() {
        const keys = ['config', 'zones', 'trips', 'events', 'notifications'];
        
        // Clear from localStorage
        keys.forEach(key => {
            const storageKey = `familyMapper${key.charAt(0).toUpperCase() + key.slice(1)}`;
            localStorage.removeItem(storageKey);
        });

        // Clear from HA if available
        if (!this.useLocalStorageFallback) {
            for (const key of keys) {
                try {
                    await this.set(key, null);
                } catch (error) {
                    console.error(`Error clearing ${key}:`, error);
                }
            }
        }
        
        this.cache = {};
    }

    /**
     * Check if storage is working
     */
    async test() {
        try {
            const testData = { test: true, timestamp: Date.now() };
            await this.set('test', testData);
            const retrieved = await this.get('test');
            
            // Clean up test data
            const entityId = `sensor.${this.storageKey}_test`;
            try {
                await fetch(`${this.hassUrl}/api/states/${entityId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${this.hassToken}`,
                        'Content-Type': 'application/json'
                    }
                });
            } catch (e) {
                // Ignore errors on cleanup
            }
            
            return retrieved && retrieved.test === true;
        } catch (error) {
            console.error('Storage test failed:', error);
            return false;
        }
    }

    /**
     * Get cached data without fetching from HA
     */
    getCached(key) {
        return this.cache[key] || null;
    }

    /**
     * Export all data as JSON
     */
    exportAll() {
        return JSON.stringify(this.cache, null, 2);
    }

    /**
     * Import data from JSON
     */
    async importAll(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    await this.set(key, data[key]);
                }
            }
            return true;
        } catch (error) {
            console.error('Import failed:', error);
            return false;
        }
    }
}

// Export for use in main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FamilyMapperStorage;
}
