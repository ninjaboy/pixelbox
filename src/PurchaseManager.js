/**
 * PurchaseManager.js - Real In-App Purchase management
 *
 * Uses cordova-plugin-purchase (v13) for real StoreKit integration.
 * Falls back to local-only mode on web (no native IAP available).
 * Caches unlock state locally via Capacitor Preferences for fast startup.
 */

import { Preferences } from '@capacitor/preferences';

// cordova-plugin-purchase exposes a global CdvPurchase namespace at runtime
// when running in a native Capacitor/Cordova shell. We reference it via
// window.CdvPurchase — no ES import needed (it's injected by the native bridge).

// ─── Product configuration ──────────────────────────────────────────────────

export const PRODUCT_ID = 'com.ninjaboy.pixellence.unlock_all_elements';
export const PRODUCT_PRICE = '£2.99'; // Fallback display price; real price comes from store

// ─── Element tier definitions ───────────────────────────────────────────────

export const FREE_ELEMENTS = [
    'fire', 'water', 'sand', 'stone', 'wood', 'wall', 'eraser'
];

export const PREMIUM_ELEMENTS = [
    'steam_vent', 'oil', 'lava', 'acid', 'slush', 'gunpowder',
    'snow', 'ice', 'glass', 'coal', 'tree_seed', 'vine',
    'fish', 'bird', 'coral', 'house_seed'
];

// ─── Storage key for local cache ────────────────────────────────────────────

const STORAGE_KEY = 'pixelbox_premium_unlocked';

class PurchaseManager {
    constructor() {
        this._unlocked = false;
        this._initialized = false;
        this._storeReady = false;
        this._isNative = false;
        this._listeners = [];
        /** @type {any} The CdvPurchase.Store instance (set at init) */
        this._store = null;
        /** @type {string} Live price string from the store */
        this._livePrice = null;
        /** @type {any} Product object from the store */
        this._product = null;
    }

    // ─── Initialisation ─────────────────────────────────────────────────

    /**
     * Initialize the purchase manager.
     * 1. Load cached unlock state from Preferences (instant).
     * 2. If on native, initialize cordova-plugin-purchase and register the product.
     */
    async init() {
        if (this._initialized) return;

        // 1. Load local cache first (fast — no network needed)
        try {
            const result = await Preferences.get({ key: STORAGE_KEY });
            this._unlocked = result.value === 'true';
        } catch (e) {
            console.warn('⚠️ PurchaseManager: could not read local cache', e);
        }

        // 2. Detect native environment
        console.log('💰 PurchaseManager: Detecting environment...');
        console.log('💰 window.CdvPurchase:', typeof window.CdvPurchase);
        console.log('💰 window.CdvPurchase?.store:', typeof window.CdvPurchase?.store);
        console.log('💰 window.Cordova:', typeof window.Cordova);
        console.log('💰 window.cordova:', typeof window.cordova);
        console.log('💰 navigator.userAgent:', navigator.userAgent);

        this._isNative = typeof window !== 'undefined'
            && window.CdvPurchase !== undefined
            && window.CdvPurchase.store !== undefined;

        console.log('💰 isNative:', this._isNative);

        if (this._isNative) {
            await this._initStore();
        } else {
            console.log('💰 PurchaseManager: Web mode — real IAP unavailable, using local cache only');
            console.log('💰 Available window keys with Cdv/cordova:', Object.keys(window).filter(k => /cdv|cordova|purchase|store/i.test(k)));
        }

        this._initialized = true;
        console.log(`💰 PurchaseManager initialized — premium ${this._unlocked ? 'UNLOCKED ✅' : 'locked 🔒'} (native: ${this._isNative})`);
    }

    /**
     * Initialize cordova-plugin-purchase store on native platforms.
     * @private
     */
    async _initStore() {
        try {
            const { store, ProductType, Platform, LogLevel } = window.CdvPurchase;
            this._store = store;

            // Set verbosity (INFO in dev, QUIET in prod)
            store.verbosity = LogLevel.INFO;

            // Register our non-consumable product
            store.register([{
                id: PRODUCT_ID,
                type: ProductType.NON_CONSUMABLE,
                platform: Platform.APPLE_APPSTORE,
            }]);

            // ─── Event handlers ─────────────────────────────────────
            store.when()
                .productUpdated((product) => {
                    if (product.id === PRODUCT_ID) {
                        this._product = product;
                        // Get the real price from the store
                        const offer = product.getOffer();
                        if (offer && offer.pricingPhases && offer.pricingPhases.length > 0) {
                            this._livePrice = offer.pricingPhases[0].price;
                            console.log(`💰 Product price: ${this._livePrice}`);
                        }
                        // Check if already owned
                        if (store.owned(PRODUCT_ID)) {
                            this._setUnlocked(true);
                        }
                    }
                })
                .approved((transaction) => {
                    // Transaction approved by the store — finish it
                    console.log('💰 Purchase approved, finishing transaction…');
                    transaction.finish();
                })
                .finished((transaction) => {
                    // Transaction finished — product is now owned
                    console.log('💰 Transaction finished!');
                    if (store.owned(PRODUCT_ID)) {
                        this._setUnlocked(true);
                    }
                })
                .receiptUpdated(() => {
                    // Receipt data changed — re-check ownership
                    if (store.owned(PRODUCT_ID)) {
                        this._setUnlocked(true);
                    }
                });

            // Handle errors
            store.error((error) => {
                console.error('💰 Store error:', error.code, error.message);
            });

            // Initialize the platform
            const errors = await store.initialize([
                { platform: Platform.APPLE_APPSTORE }
            ]);

            if (errors.length > 0) {
                console.warn('💰 Store init errors:', errors);
            }

            this._storeReady = true;

            // Re-check ownership now that store is ready
            if (store.owned(PRODUCT_ID)) {
                this._setUnlocked(true);
            }

            console.log('💰 Store initialized successfully');
        } catch (error) {
            console.error('❌ PurchaseManager: Store init failed:', error);
            // Fall back to local cache — already loaded above
        }
    }

    // ─── State queries ──────────────────────────────────────────────────

    /**
     * Check if premium elements are unlocked.
     * @returns {boolean}
     */
    isUnlocked() {
        return this._unlocked;
    }

    /**
     * Check if a specific element is premium.
     * @param {string} elementName
     * @returns {boolean}
     */
    isPremiumElement(elementName) {
        return PREMIUM_ELEMENTS.includes(elementName);
    }

    /**
     * Check if an element is accessible (free OR premium unlocked).
     * @param {string} elementName
     * @returns {boolean}
     */
    isElementAccessible(elementName) {
        if (!this.isPremiumElement(elementName)) return true;
        return this._unlocked;
    }

    /**
     * Whether the store (StoreKit) is available and ready.
     * @returns {boolean}
     */
    isStoreAvailable() {
        return this._isNative && this._storeReady;
    }

    /**
     * Get the real price from the store, or the fallback.
     * @returns {string}
     */
    getPrice() {
        return this._livePrice || PRODUCT_PRICE;
    }

    // ─── Purchase flow ──────────────────────────────────────────────────

    /**
     * Initiate a purchase of the premium unlock.
     * On native: triggers the real Apple StoreKit purchase dialog.
     * On web: sets local unlock (for testing).
     *
     * @returns {Promise<boolean>} true if purchase succeeded
     */
    async purchase() {
        if (this._unlocked) {
            console.log('💰 Already unlocked');
            return true;
        }

        // ── Native purchase via StoreKit ──
        if (this._isNative && this._storeReady) {
            return await this._nativePurchase();
        }

        // ── Web fallback: local unlock for testing ──
        console.log('💰 Web mode: unlocking locally for testing');
        await this._setUnlocked(true);
        return true;
    }

    /**
     * Execute the real StoreKit purchase flow.
     * @private
     * @returns {Promise<boolean>}
     */
    async _nativePurchase() {
        const store = this._store;
        if (!store) return false;

        const product = store.get(PRODUCT_ID);
        if (!product) {
            console.error('💰 Product not found in store');
            return false;
        }

        const offer = product.getOffer();
        if (!offer) {
            console.error('💰 No offer available for product');
            return false;
        }

        try {
            // This triggers the native Apple Pay / StoreKit dialog
            const error = await offer.order();
            if (error) {
                if (error.code === window.CdvPurchase.ErrorCode.PAYMENT_CANCELLED) {
                    console.log('💰 Purchase cancelled by user');
                } else {
                    console.error('💰 Purchase failed:', error.code, error.message);
                }
                return false;
            }

            // If order() returns no error, the purchase is being processed.
            // The .approved / .finished callbacks will fire and update state.
            // We wait briefly for the state to update.
            return await this._waitForUnlock(8000);
        } catch (error) {
            console.error('❌ Purchase exception:', error);
            return false;
        }
    }

    /**
     * Wait for the unlock state to become true (purchase processing).
     * @private
     * @param {number} timeoutMs
     * @returns {Promise<boolean>}
     */
    _waitForUnlock(timeoutMs) {
        return new Promise((resolve) => {
            if (this._unlocked) {
                resolve(true);
                return;
            }

            const startTime = Date.now();
            const check = () => {
                if (this._unlocked) {
                    resolve(true);
                    return;
                }
                if (Date.now() - startTime > timeoutMs) {
                    // Timeout — could still complete later via callbacks
                    resolve(false);
                    return;
                }
                setTimeout(check, 200);
            };
            check();
        });
    }

    // ─── Restore purchases ──────────────────────────────────────────────

    /**
     * Restore previous purchases via StoreKit.
     * On native: calls Apple's restorePurchases / refreshes receipts.
     * On web: checks local cache.
     *
     * @returns {Promise<boolean>} true if a purchase was restored
     */
    async restorePurchases() {
        // ── Native restore ──
        if (this._isNative && this._storeReady) {
            try {
                const store = this._store;
                console.log('💰 Restoring purchases…');
                await store.restorePurchases();

                // After restore, re-check ownership
                if (store.owned(PRODUCT_ID)) {
                    await this._setUnlocked(true);
                    console.log('🔄 Purchase restored!');
                    return true;
                }

                console.log('🔄 No purchases to restore');
                return false;
            } catch (error) {
                console.error('❌ Restore failed:', error);
                return false;
            }
        }

        // ── Web fallback: check local cache ──
        try {
            const result = await Preferences.get({ key: STORAGE_KEY });
            if (result.value === 'true') {
                this._unlocked = true;
                this._notifyListeners();
                console.log('🔄 Purchase restored from local cache');
                return true;
            }
        } catch (e) {
            console.error('❌ Restore from cache failed:', e);
        }

        console.log('🔄 No purchases to restore');
        return false;
    }

    // ─── Internal state management ──────────────────────────────────────

    /**
     * Set the unlock state and persist to local cache.
     * @private
     * @param {boolean} unlocked
     */
    async _setUnlocked(unlocked) {
        const changed = this._unlocked !== unlocked;
        this._unlocked = unlocked;

        try {
            await Preferences.set({
                key: STORAGE_KEY,
                value: unlocked ? 'true' : 'false'
            });
        } catch (e) {
            console.warn('⚠️ Failed to persist unlock state:', e);
        }

        if (changed) {
            console.log(`💰 Premium ${unlocked ? 'UNLOCKED ✅' : 'LOCKED 🔒'}`);
            this._notifyListeners();
        }
    }

    // ─── Debug utilities ────────────────────────────────────────────────

    /**
     * Debug: Toggle unlock state (for development).
     * @returns {Promise<boolean>} new unlock state
     */
    async debugToggle() {
        const newState = !this._unlocked;
        await this._setUnlocked(newState);
        console.log(`🔧 DEBUG: Premium ${newState ? 'UNLOCKED' : 'LOCKED'}`);
        return newState;
    }

    // ─── Observable ─────────────────────────────────────────────────────

    /**
     * Subscribe to unlock state changes.
     * @param {Function} callback - called with (isUnlocked: boolean)
     * @returns {Function} unsubscribe function
     */
    onChange(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(l => l !== callback);
        };
    }

    /** @private */
    _notifyListeners() {
        this._listeners.forEach(fn => {
            try { fn(this._unlocked); } catch (e) { console.error(e); }
        });
    }
}

// Export singleton instance
const purchaseManager = new PurchaseManager();
export default purchaseManager;
