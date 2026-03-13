/**
 * PurchaseManager.js - Purchase state management (stub)
 *
 * App is now paid upfront (£2.99). All elements are unlocked by default.
 * This file is kept as a stub so existing imports/callers don't break.
 */

// ─── Element tier definitions (kept for reference) ──────────────────────────

export const PRODUCT_ID = 'com.ninjaboy.pixellence.unlock_all_elements';
export const PRODUCT_PRICE = '£2.99';

export const FREE_ELEMENTS = [
    'fire', 'water', 'sand', 'stone', 'wood', 'wall', 'eraser'
];

export const PREMIUM_ELEMENTS = [
    'steam_vent', 'oil', 'lava', 'acid', 'slush', 'gunpowder',
    'snow', 'ice', 'glass', 'coal', 'tree_seed', 'vine',
    'fish', 'bird', 'coral', 'house_seed'
];

class PurchaseManager {
    constructor() {
        this._unlocked = true;
        this._initialized = false;
        this._listeners = [];
    }

    async init() {
        this._initialized = true;
    }

    isUnlocked() {
        return true;
    }

    isPremiumElement() {
        return false;
    }

    isElementAccessible() {
        return true;
    }

    isStoreAvailable() {
        return false;
    }

    getPrice() {
        return PRODUCT_PRICE;
    }

    async purchase() {
        return true;
    }

    async restorePurchases() {
        return true;
    }

    async debugToggle() {
        return true;
    }

    onChange(callback) {
        return () => {};
    }
}

// Export singleton instance
const purchaseManager = new PurchaseManager();
export default purchaseManager;
