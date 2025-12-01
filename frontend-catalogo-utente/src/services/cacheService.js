/**
 * Cache Service
 * Gestisce il caching dei dati in localStorage con scadenza temporale
 */

const CACHE_PREFIX = 'catalogo_cache_';
const DEFAULT_TTL = 10 * 60 * 1000; // 10 minuti in millisecondi

class CacheService {
    /**
     * Salva dati nella cache
     * @param {string} key - Chiave univoca per i dati
     * @param {any} data - Dati da salvare
     * @param {number} ttl - Time to live in millisecondi (default: 10 minuti)
     */
    set(key, data, ttl = DEFAULT_TTL) {
        try {
            const cacheKey = CACHE_PREFIX + key;
            const cacheData = {
                data,
                timestamp: Date.now(),
                ttl
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
            console.log(`✅ Cache saved: ${key} (TTL: ${ttl / 1000}s)`);
        } catch (error) {
            console.error('❌ Error saving to cache:', error);
            // Se localStorage è pieno, può fallire silenziosamente
        }
    }

    /**
     * Recupera dati dalla cache
     * @param {string} key - Chiave dei dati
     * @returns {any|null} - Dati dalla cache o null se non validi/scaduti
     */
    get(key) {
        try {
            const cacheKey = CACHE_PREFIX + key;
            const cached = localStorage.getItem(cacheKey);

            if (!cached) {
                console.log(`ℹ️ Cache miss: ${key}`);
                return null;
            }

            const cacheData = JSON.parse(cached);
            const now = Date.now();
            const age = now - cacheData.timestamp;

            // Verifica se la cache è ancora valida
            if (age > cacheData.ttl) {
                console.log(`⏰ Cache expired: ${key} (age: ${Math.round(age / 1000)}s)`);
                this.remove(key);
                return null;
            }

            console.log(`✅ Cache hit: ${key} (age: ${Math.round(age / 1000)}s)`);
            return cacheData.data;
        } catch (error) {
            console.error('❌ Error reading from cache:', error);
            return null;
        }
    }

    /**
     * Rimuove un elemento dalla cache
     * @param {string} key - Chiave da rimuovere
     */
    remove(key) {
        try {
            const cacheKey = CACHE_PREFIX + key;
            localStorage.removeItem(cacheKey);
            console.log(`🗑️ Cache removed: ${key}`);
        } catch (error) {
            console.error('❌ Error removing from cache:', error);
        }
    }

    /**
     * Pulisce tutti i dati della cache del catalogo
     */
    clearAll() {
        try {
            const keys = Object.keys(localStorage);
            const catalogKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));

            catalogKeys.forEach(key => {
                localStorage.removeItem(key);
            });

            console.log(`🗑️ Cache cleared: ${catalogKeys.length} items removed`);
        } catch (error) {
            console.error('❌ Error clearing cache:', error);
        }
    }

    /**
     * Verifica se un elemento nella cache è ancora valido
     * @param {string} key - Chiave da verificare
     * @returns {boolean} - True se valido, false altrimenti
     */
    isValid(key) {
        const data = this.get(key);
        return data !== null;
    }

    /**
     * Ottiene l'età della cache in secondi
     * @param {string} key - Chiave da verificare
     * @returns {number|null} - Età in secondi o null se non esiste
     */
    getCacheAge(key) {
        try {
            const cacheKey = CACHE_PREFIX + key;
            const cached = localStorage.getItem(cacheKey);

            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            const age = Date.now() - cacheData.timestamp;
            return Math.round(age / 1000);
        } catch (error) {
            return null;
        }
    }
}

// Esporta un'istanza singleton
const cacheService = new CacheService();
export default cacheService;
