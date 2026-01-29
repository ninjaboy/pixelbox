/**
 * PurchaseManager.js - In-App Purchase management
 * 
 * Manages premium element unlock state.
 * Currently uses local persistence via Capacitor Preferences.
 * Designed to be easily wired to real StoreKit later.
 */

import { Preferences } from '@capacitor/preferences';

// Product configuration
export const PRODUCT_ID = 'com.ninjaboy.pixellence.unlock_all_elements';
export const PRODUCT_PRICE = '£2.99';

// Element tier definitions
export const FREE_ELEMENTS = [
    'fire', 'water', 'sand', 'stone', 'wood', 'wall', 'eraser'
];

export const PREMIUM_ELEMENTS = [
    'steam_vent', 'oil', 'lava', 'acid', 'slush', 'gunpowder',
    'snow', 'ice', 'glass', 'coal', 'tree_seed', 'vine',
    'fish', 'bird', 'coral', 'house_seed'
];

const STORAGE_KEY = 'pixelbox_premium_unlocked';

class PurchaseManager {
    constructor() {
        this._unlocked = false;
        this._initialized = false;
        this._listeners = [];
    }

    /**
     * Initialize the purchase manager - load unlock state from storage
     */
    async init() {
        if (this._initialized) return;
        
        try {
            const result = await Preferences.get({ key: STORAGE_KEY });
            this._unlocked = result.value === 'true';
            this._initialized = true;
            console.log(`💰 PurchaseManager initialized — premium ${this._unlocked ? 'UNLOCKED ✅' : 'locked 🔒'}`);
        } catch (error) {
            console.error('❌ PurchaseManager init failed:', error);
            this._initialized = true; // Still mark as initialized to avoid blocking
        }
    }

    /**
     * Check if premium elements are unlocked
     * @returns {boolean}
     */
    isUnlocked() {
        return this._unlocked;
    }

    /**
     * Check if a specific element is premium (locked behind IAP)
     * @param {string} elementName 
     * @returns {boolean}
     */
    isPremiumElement(elementName) {
        return PREMIUM_ELEMENTS.includes(elementName);
    }

    /**
     * Check if an element is accessible (free OR premium unlocked)
     * @param {string} elementName 
     * @returns {boolean}
     */
    isElementAccessible(elementName) {
        if (!this.isPremiumElement(elementName)) return true;
        return this._unlocked;
    }

    /**
     * Unlock all premium elements.
     * Currently stores locally. Will be replaced with real StoreKit purchase flow.
     * @returns {Promise<boolean>} success
     */
    async unlock() {
        try {
            // TODO: Replace with real StoreKit purchase flow
            // const result = await StoreKit.purchase(PRODUCT_ID);
            // if (!result.success) return false;

            await Preferences.set({
                key: STORAGE_KEY,
                value: 'true'
            });

            this._unlocked = true;
            console.log('🎉 Premium elements UNLOCKED!');
            this._notifyListeners();
            return true;
        } catch (error) {
            console.error('❌ Failed to unlock:', error);
            return false;
        }
    }

    /**
     * Restore previous purchases.
     * Currently checks local storage. Will query StoreKit later.
     * @returns {Promise<boolean>} whether a purchase was found/restored
     */
    async restorePurchases() {
        try {
            // TODO: Replace with real StoreKit restore
            // const result = await StoreKit.restorePurchases();
            // if (result.restored.includes(PRODUCT_ID)) { ... }

            const result = await Preferences.get({ key: STORAGE_KEY });
            const wasUnlocked = result.value === 'true';

            if (wasUnlocked) {
                this._unlocked = true;
                this._notifyListeners();
                console.log('🔄 Purchase restored!');
                return true;
            }

            console.log('🔄 No purchases to restore');
            return false;
        } catch (error) {
            console.error('❌ Failed to restore purchases:', error);
            return false;
        }
    }

    /**
     * Debug: Toggle unlock state (for development)
     * @returns {Promise<boolean>} new unlock state
     */
    async debugToggle() {
        if (this._unlocked) {
            await Preferences.set({ key: STORAGE_KEY, value: 'false' });
            this._unlocked = false;
            console.log('🔧 DEBUG: Premium LOCKED');
        } else {
            await Preferences.set({ key: STORAGE_KEY, value: 'true' });
            this._unlocked = true;
            console.log('🔧 DEBUG: Premium UNLOCKED');
        }
        this._notifyListeners();
        return this._unlocked;
    }

    /**
     * Subscribe to unlock state changes
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
