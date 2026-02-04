/**
 * UnlockModal.js - Premium unlock prompt modal
 * 
 * Pixel-art styled modal shown when tapping a locked element.
 * Shows element info + unlock CTA.
 */

import purchaseManager, { PREMIUM_ELEMENTS } from './PurchaseManager.js';

class UnlockModal {
    constructor() {
        this.overlay = null;
        this._onUnlockCallback = null;
        this._built = false;
    }

    /**
     * Build the modal DOM (once)
     */
    _build() {
        if (this._built) return;

        // Create overlay
        this.overlay = document.createElement('div');
        this.overlay.id = 'unlock-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.88);
            backdrop-filter: blur(6px);
            display: none;
            align-items: center;
            justify-content: center;
            z-index: 20000;
            animation: fadeIn 0.2s ease;
        `;

        // Modal container
        const modal = document.createElement('div');
        modal.id = 'unlock-modal';
        modal.style.cssText = `
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            border: 3px solid rgba(255, 200, 50, 0.6);
            border-radius: 16px;
            padding: 28px 24px;
            max-width: 340px;
            width: 88%;
            box-shadow: 0 0 30px rgba(255, 200, 50, 0.25), inset 0 0 15px rgba(255, 200, 50, 0.05);
            animation: slideUp 0.25s ease;
            text-align: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace;
        `;

        // Lock icon
        const lockIcon = document.createElement('div');
        lockIcon.style.cssText = `
            font-size: 42px;
            margin-bottom: 8px;
        `;
        lockIcon.textContent = '🔒';

        // Title
        const title = document.createElement('div');
        title.id = 'unlock-modal-title';
        title.style.cssText = `
            font-size: 18px;
            font-weight: bold;
            color: rgba(255, 200, 50, 0.95);
            margin-bottom: 4px;
            text-transform: uppercase;
            letter-spacing: 1px;
        `;
        title.textContent = 'Premium Element';

        // Element name
        this.elementNameEl = document.createElement('div');
        this.elementNameEl.id = 'unlock-modal-element';
        this.elementNameEl.style.cssText = `
            font-size: 22px;
            font-weight: bold;
            color: #ffffff;
            margin-bottom: 16px;
        `;

        // Description
        const desc = document.createElement('div');
        desc.style.cssText = `
            font-size: 13px;
            color: rgba(255, 255, 255, 0.6);
            margin-bottom: 20px;
            line-height: 1.5;
        `;
        this.descEl = desc;
        desc.textContent = `Unlock all ${PREMIUM_ELEMENTS.length} premium elements for ${purchaseManager.getPrice()}`;

        // Element preview (small grid of premium element icons)
        const preview = document.createElement('div');
        preview.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            justify-content: center;
            margin-bottom: 20px;
            padding: 10px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.08);
        `;

        // Will be populated when shown (needs elementConfigs from GameScene)
        this.previewContainer = preview;

        // Unlock button
        const unlockBtn = document.createElement('button');
        unlockBtn.id = 'unlock-modal-buy';
        unlockBtn.style.cssText = `
            width: 100%;
            padding: 14px 20px;
            background: linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%);
            border: 2px solid rgba(255, 200, 50, 0.5);
            border-radius: 12px;
            color: white;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin-bottom: 10px;
            transition: all 0.2s ease;
            font-family: inherit;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        `;
        unlockBtn.textContent = `✨ Unlock All — ${purchaseManager.getPrice()}`;
        // Use both click and touchend for iOS WKWebView compatibility
        // touchend fires first on iOS; click is fallback for desktop/simulator
        // Use _handledByTouch flag to prevent double-fire
        unlockBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (this._touchHandled) { this._touchHandled = false; return; }
            this._handleUnlock();
        });
        unlockBtn.addEventListener('touchend', (e) => {
            e.stopPropagation();
            this._touchHandled = true;
            this._handleUnlock();
        });

        // Add hover/active states
        unlockBtn.addEventListener('mouseenter', () => {
            unlockBtn.style.transform = 'translateY(-2px)';
            unlockBtn.style.boxShadow = '0 4px 16px rgba(255, 140, 66, 0.4)';
        });
        unlockBtn.addEventListener('mouseleave', () => {
            unlockBtn.style.transform = '';
            unlockBtn.style.boxShadow = '';
        });

        // Cancel button
        const cancelBtn = document.createElement('button');
        cancelBtn.id = 'unlock-modal-cancel';
        cancelBtn.style.cssText = `
            width: 100%;
            padding: 10px 20px;
            background: transparent;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            color: rgba(255, 255, 255, 0.5);
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
        `;
        cancelBtn.textContent = 'Not Now';
        cancelBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (this._cancelTouchHandled) { this._cancelTouchHandled = false; return; }
            this.hide();
        });
        cancelBtn.addEventListener('touchend', (e) => {
            e.stopPropagation();
            this._cancelTouchHandled = true;
            this.hide();
        });
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            cancelBtn.style.color = 'rgba(255, 255, 255, 0.7)';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            cancelBtn.style.color = 'rgba(255, 255, 255, 0.5)';
        });

        // Assemble modal
        modal.appendChild(lockIcon);
        modal.appendChild(title);
        modal.appendChild(this.elementNameEl);
        modal.appendChild(desc);
        modal.appendChild(preview);
        modal.appendChild(unlockBtn);
        modal.appendChild(cancelBtn);

        this.overlay.appendChild(modal);
        document.body.appendChild(this.overlay);

        // Close on overlay click / touch
        // touchstart: prevent iOS scroll/zoom gesture but DON'T preventDefault
        // on buttons (it blocks click events). Only prevent on overlay background.
        this.overlay.addEventListener('touchstart', (e) => {
            // Only preventDefault on the overlay background itself, not on child buttons
            if (e.target === this.overlay) {
                e.preventDefault();
            }
        });
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });
        this.overlay.addEventListener('touchend', (e) => {
            if (e.target === this.overlay) { e.stopPropagation(); this.hide(); }
        });

        // ESC to close
        this._escHandler = (e) => {
            if (e.key === 'Escape' && this.overlay.style.display === 'flex') {
                this.hide();
            }
        };
        document.addEventListener('keydown', this._escHandler);

        this._built = true;
    }

    /**
     * Show the unlock modal for a specific element
     * @param {string} elementName - The locked element that was tapped
     * @param {object} elementConfigs - Element icon/color configs from GameScene
     * @param {Function} onUnlock - Callback when unlock succeeds
     */
    show(elementName, elementConfigs, onUnlock) {
        this._build();
        this._onUnlockCallback = onUnlock;

        // Refresh price from live store data
        const price = purchaseManager.getPrice();
        if (this.descEl) {
            this.descEl.textContent = `Unlock all ${PREMIUM_ELEMENTS.length} premium elements for ${price}`;
        }
        const buyBtn = document.getElementById('unlock-modal-buy');
        if (buyBtn) {
            buyBtn.textContent = `✨ Unlock All — ${price}`;
            buyBtn.style.opacity = '1';
            buyBtn.style.pointerEvents = '';
            buyBtn.style.background = 'linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%)';
        }

        // Show "Available on iOS" hint if on web
        if (!purchaseManager.isStoreAvailable()) {
            if (this.descEl) {
                this.descEl.textContent += '\n(Testing mode — real purchase on iOS)';
            }
        }

        // Set element name
        const displayName = elementName.replace(/_/g, ' ');
        const config = elementConfigs?.[elementName];
        this.elementNameEl.textContent = config ? `${config.icon} ${displayName}` : displayName;

        // Populate preview grid with premium element icons
        this.previewContainer.innerHTML = '';
        PREMIUM_ELEMENTS.forEach(name => {
            const elConfig = elementConfigs?.[name];
            if (!elConfig) return;

            const chip = document.createElement('span');
            chip.style.cssText = `
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 26px;
                height: 26px;
                background: ${elConfig.color};
                border-radius: 4px;
                font-size: 14px;
                border: 1px solid rgba(255, 255, 255, 0.15);
                ${name === elementName ? 'box-shadow: 0 0 8px rgba(255, 200, 50, 0.6); border-color: rgba(255, 200, 50, 0.6);' : ''}
            `;
            chip.textContent = elConfig.icon;
            chip.title = name.replace(/_/g, ' ');
            this.previewContainer.appendChild(chip);
        });

        this.overlay.style.pointerEvents = '';
        this.overlay.style.display = 'flex';
    }

    /**
     * Hide the modal
     * Uses requestAnimationFrame to defer DOM mutation out of the touchend handler.
     * Hiding the overlay synchronously during touchend corrupts the iOS WKWebView
     * touch state machine, preventing subsequent pointer/touch events from reaching
     * the Phaser canvas (user can't draw after closing the modal).
     */
    hide() {
        console.log('🔒 UnlockModal.hide() called');
        console.log('🔒 overlay exists:', !!this.overlay);
        console.log('🔒 overlay display:', this.overlay?.style?.display);
        
        if (!this.overlay || this.overlay.style.display === 'none') {
            console.log('🔒 hide() early return - overlay missing or already hidden');
            return;
        }

        // Immediately block new touches on the overlay while we wait for rAF
        this.overlay.style.pointerEvents = 'none';
        console.log('🔒 set pointerEvents=none');

        // Defer the actual DOM hide to next frame — this is critical on iOS.
        // Modifying display during a touchend handler breaks WebKit's touch
        // delivery to underlying elements (the Phaser canvas).
        // Double rAF ensures we're fully out of the touch event cycle.
        console.log('🔒 scheduling rAF #1');
        requestAnimationFrame(() => {
            console.log('🔒 rAF #1 fired, scheduling rAF #2');
            requestAnimationFrame(() => {
                console.log('🔒 rAF #2 fired, hiding overlay');
                if (this.overlay) {
                    this.overlay.style.display = 'none';
                    console.log('🔒 overlay hidden');
                }

                // Blur whatever button/element the modal left focused
                const activeEl = document.activeElement;
                console.log('🔒 activeElement:', activeEl?.tagName, activeEl?.className);
                if (activeEl && activeEl !== document.body) {
                    activeEl.blur();
                    console.log('🔒 blurred activeElement');
                }

                // Re-focus Phaser canvas so touch/pointer events resume on iOS WKWebView
                // Extra delay lets the browser fully process the layout change before
                // we ask it to route events back to the canvas.
                console.log('🔒 scheduling setTimeout 150ms');
                setTimeout(() => {
                    console.log('🔒 setTimeout fired');
                    const canvas = document.querySelector('canvas');
                    console.log('🔒 canvas found:', !!canvas);
                    if (canvas) {
                        canvas.focus();
                        console.log('🔒 canvas.focus() called');
                    }
                    // Also poke Phaser's input manager in case it lost track
                    const scene = window.__pixellenceScene;
                    console.log('🔒 scene exists:', !!scene);
                    console.log('🔒 input.manager exists:', !!scene?.input?.manager);
                    console.log('🔒 input.manager.enabled before:', scene?.input?.manager?.enabled);
                    if (scene && scene.input && scene.input.manager) {
                        scene.input.manager.enabled = true;
                        console.log('🔒 input.manager.enabled set to true');
                    }
                    console.log('🔒 hide() complete');
                }, 150);
            });
        });
    }

    /**
     * Handle unlock button press
     * @private
     */
    async _handleUnlock() {
        // Debounce — prevent double-fire from touch + click
        if (this._purchasing) return;
        this._purchasing = true;
        setTimeout(() => { this._purchasing = false; }, 1000);
        console.log('💰 _handleUnlock called');
        console.log('💰 isUnlocked:', purchaseManager.isUnlocked());
        console.log('💰 isStoreAvailable:', purchaseManager.isStoreAvailable());
        console.log('💰 _isNative:', purchaseManager._isNative);
        console.log('💰 _storeReady:', purchaseManager._storeReady);
        console.log('💰 _product:', purchaseManager._product);

        const buyBtn = document.getElementById('unlock-modal-buy');
        if (buyBtn) {
            buyBtn.textContent = '⏳ Purchasing...';
            buyBtn.style.opacity = '0.7';
            buyBtn.style.pointerEvents = 'none';
        }

        let success;
        try {
            success = await purchaseManager.purchase();
            console.log('💰 purchase() returned:', success);
        } catch (err) {
            console.error('💰 purchase() threw:', err);
            success = false;
        }

        if (success) {
            // Show success feedback
            if (buyBtn) {
                buyBtn.textContent = '🎉 Unlocked!';
                buyBtn.style.background = 'linear-gradient(135deg, #00cc88 0%, #00aa66 100%)';
            }

            // Notify callback
            if (this._onUnlockCallback) {
                this._onUnlockCallback();
            }

            // Auto-close after brief celebration
            setTimeout(() => this.hide(), 800);
        } else {
            // Reset button on failure (user cancelled or error)
            const price = purchaseManager.getPrice();
            if (buyBtn) {
                buyBtn.textContent = `✨ Unlock All — ${price}`;
                buyBtn.style.opacity = '1';
                buyBtn.style.pointerEvents = '';
                buyBtn.style.background = 'linear-gradient(135deg, #ff8c42 0%, #ff6b35 100%)';
            }
        }
    }
}

// Export singleton
const unlockModal = new UnlockModal();
export default unlockModal;
