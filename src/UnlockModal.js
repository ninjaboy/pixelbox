/**
 * UnlockModal.js - Premium unlock prompt modal (stub)
 *
 * App is now paid upfront. Modal is never shown.
 * This file is kept as a stub so existing imports/callers don't break.
 */

class UnlockModal {
    constructor() {
        this._lastHideTime = 0;
    }

    show() {
        // No-op — app is paid upfront, all elements unlocked
        return;
    }

    hide() {
        // No-op
    }
}

// Export singleton
const unlockModal = new UnlockModal();
export default unlockModal;
