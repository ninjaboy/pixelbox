import Phaser from 'phaser';
import { VERSION } from '../../version.js';
import storageManager from '../StorageManager.js';
import purchaseManager from '../PurchaseManager.js';
import { buildPixelText } from '../PixelFont.js';

/**
 * MainMenuScene - Main menu with sky/sunset background
 * Options: New Game, Continue (if save exists)
 */
export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super('MainMenuScene');
    }

    create() {
        const { width, height } = this.sys.game.config;

        // Hide ALL DOM overlays that could block canvas pointer events
        this.setGameUIVisible(false);
        // Ensure high-z-index overlays are hidden too
        ['settings-overlay', 'grimoire-overlay'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Force-enable input (may be stale after scene.stop→start from DOM handler)
        this.input.enabled = true;
        if (this.input.manager) {
            this.input.manager.enabled = true;
        }
        // Hiding game-header shifts the canvas position; force Phaser to recalculate
        // Delay bounds update to ensure DOM layout is complete
        requestAnimationFrame(() => {
            this.scale.updateBounds();
            console.log('📐 MainMenuScene: Canvas bounds updated after DOM layout');
        });
        // Ensure pointer events are polled even when pointer is stationary
        this.input.setPollAlways();
        
        // Debug: Log input state
        console.log('🎮 MainMenuScene input state:', {
            inputEnabled: this.input.enabled,
            managerEnabled: this.input.manager?.enabled,
            activePointer: this.input.activePointer?.active
        });

        // Sky rendering state - deep night sky so text pops
        this.skyTime = 0.90; // Night sky — dark, text-friendly
        this.skyDirection = 0.00005; // Very slowly shift sky

        // Create graphics for sky
        this.skyGraphics = this.add.graphics();

        // Ambient particles for atmosphere
        this.ambientParticles = [];
        this.particleGraphics = this.add.graphics();
        this.palette = [0x00cccc, 0x4a90e2, 0x87ceeb, 0x6b5bff, 0xffdd44];

        for (let i = 0; i < 30; i++) {
            this.spawnAmbientParticle(width, height, true);
        }

        // Title - "Pixellence" as pixel art
        this.titleGraphics = this.add.graphics();
        this.titleColors = [
            0xff6b35, 0xff8c42, 0xffa500, 0xffdd44,
            0x00ffff, 0x4a90e2, 0x00cccc, 0x87ceeb
        ];
        this.titlePixels = buildPixelText('Pixellence', width / 2, height * 0.22, 4, this.titleColors);
        this.titleElapsed = 0;

        // Subtitle / version (with premium badge if unlocked)
        const versionSuffix = purchaseManager.isUnlocked() ? '  ★' : '';
        this.add.text(width / 2, height * 0.32, `Particle Sandbox  ·  v${VERSION}${versionSuffix}`, {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: purchaseManager.isUnlocked() ? 'rgba(255, 200, 50, 0.6)' : 'rgba(255, 255, 255, 0.5)',
            align: 'center'
        }).setOrigin(0.5);

        // Menu buttons - we'll create these as interactive graphics + text
        this.buttons = [];

        // Build menu immediately with defaults, then update async
        this.hasSave = false;
        this.buildMenu(width, height);

        // Check for saved world and init purchase manager in background
        // Update the Continue button state when done
        const initTimeout = new Promise(resolve => setTimeout(resolve, 5000)); // 5s max
        Promise.race([
            Promise.all([
                this.checkSavedWorld(),
                purchaseManager.init()
            ]),
            initTimeout
        ]).then(() => {
            this.updateContinueButton(width, height);
        }).catch(err => {
            console.warn('Menu init error:', err);
        });

        // Fade in
        this.cameras.main.fadeIn(400, 0, 0, 0);
    }

    async checkSavedWorld() {
        try {
            const savedWorld = await storageManager.loadCurrentWorld();
            this.hasSave = savedWorld !== null;
        } catch (e) {
            console.warn('Could not check for saved world:', e);
            this.hasSave = false;
        }
    }

    buildMenu(width, height) {
        const buttonWidth = Math.min(280, width * 0.75);
        const buttonHeight = 48;
        const buttonX = width / 2;
        const startY = height * 0.46;
        const gap = 20;

        // Pixel font buttons - no icons, no subtitles
        this.createButton(
            buttonX, startY,
            buttonWidth, buttonHeight,
            'New Game',
            () => this.startNewGame(),
            true,
            'newgame'
        );

        this.createButton(
            buttonX, startY + buttonHeight + gap,
            buttonWidth, buttonHeight,
            'Continue',
            () => this.continueGame(),
            this.hasSave,
            'continue'
        );

        this.createButton(
            buttonX, startY + (buttonHeight + gap) * 2,
            buttonWidth, buttonHeight,
            'Settings',
            () => {
                const overlay = document.getElementById('settings-overlay');
                if (overlay) overlay.style.display = 'flex';
            },
            true,
            'settings'
        );

        // Footer in pixel font too
        this.footerPixels = buildPixelText('tap . draw . play', width / 2, height * 0.93, 2, [0xffffff]);
        this.footerGraphics = this.add.graphics();
    }

    updateContinueButton(width, height) {
        const continueBtn = this.buttons.find(b => b.id === 'continue');
        if (!continueBtn) return;

        const { btn, hitArea } = continueBtn;
        const buttonWidth = Math.min(280, width * 0.75);
        const buttonHeight = 48;
        const x = width / 2;
        const startY = height * 0.46;
        const gap = 20;
        const y = startY + buttonHeight + gap;

        if (this.hasSave && !continueBtn.enabled) {
            continueBtn.enabled = true;

            btn.clear();
            this.drawPixelBorder(btn, x, y, buttonWidth, buttonHeight, 3, 0x00cccc, 0x0a1628, 0.85);

            if (continueBtn.labelPixels) {
                continueBtn.labelPixels.forEach(p => p.color = 0xffffff);
            }

            if (!hitArea) {
                const zone = this.add.zone(x, y, buttonWidth, buttonHeight).setInteractive({ useHandCursor: true });
                zone.setDepth(1000);
                zone.on('pointerup', () => this.continueGame());
                continueBtn.hitArea = zone;
            }

            btn.postFX.addGlow(0x00cccc, 1, 0, false, 0.05, 4);
        }
    }

    drawPixelBorder(gfx, x, y, w, h, ps, borderColor, fillColor, fillAlpha) {
        // Pixel-art button: filled rect with chunky pixel corners cut
        const left = x - w / 2;
        const top = y - h / 2;

        // Fill body
        gfx.fillStyle(fillColor, fillAlpha);
        gfx.fillRect(left + ps, top, w - ps * 2, h);           // main body
        gfx.fillRect(left, top + ps, ps, h - ps * 2);           // left strip
        gfx.fillRect(left + w - ps, top + ps, ps, h - ps * 2);  // right strip

        // Border - top
        gfx.fillStyle(borderColor, 0.7);
        gfx.fillRect(left + ps, top, w - ps * 2, ps);
        // Border - bottom
        gfx.fillRect(left + ps, top + h - ps, w - ps * 2, ps);
        // Border - left
        gfx.fillRect(left, top + ps, ps, h - ps * 2);
        // Border - right
        gfx.fillRect(left + w - ps, top + ps, ps, h - ps * 2);
    }

    createButton(x, y, w, h, label, callback, enabled, id = null) {
        const btn = this.add.graphics();
        const borderColor = enabled ? 0x00cccc : 0x444444;
        const fillColor = enabled ? 0x0a1628 : 0x0a0a14;
        const fillAlpha = enabled ? 0.85 : 0.5;
        const ps = 3; // pixel size for border

        // Draw pixel-art button
        this.drawPixelBorder(btn, x, y, w, h, ps, borderColor, fillColor, fillAlpha);

        // Pixel font label
        const labelColor = enabled ? 0xffffff : 0x555555;
        const labelPixels = buildPixelText(label, x, y, ps, [labelColor]);
        const labelGraphics = this.add.graphics();

        let hitArea = null;
        if (enabled) {
            hitArea = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
            hitArea.setDepth(1000); // Ensure zone is above all graphics for hit testing

            hitArea.on('pointerover', () => {
                btn.clear();
                this.drawPixelBorder(btn, x, y, w, h, ps, 0x00ffff, 0x102040, 0.95);
            });

            hitArea.on('pointerout', () => {
                btn.clear();
                this.drawPixelBorder(btn, x, y, w, h, ps, borderColor, fillColor, fillAlpha);
            });

            hitArea.on('pointerdown', () => {
                btn.clear();
                this.drawPixelBorder(btn, x, y, w, h, ps, 0x00ffff, 0x183060, 1);
            });

            hitArea.on('pointerup', () => {
                console.log(`🔘 Button "${label}" clicked!`);
                callback();
            });
            
            // Debug: Log when any interaction happens
            hitArea.on('pointerover', () => console.log(`👆 Hover: ${label}`));
            hitArea.on('pointerdown', () => console.log(`👇 Press: ${label}`));

            btn.postFX.addGlow(borderColor, 1, 0, false, 0.05, 4);
        }

        this.buttons.push({ btn, labelPixels, labelGraphics, enabled, id, hitArea });
    }

    startNewGame() {
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('GameScene', { continueGame: false });
        });
    }

    continueGame() {
        if (!this.hasSave) return;
        this.cameras.main.fadeOut(500, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('GameScene', { continueGame: true });
        });
    }

    spawnAmbientParticle(width, height, initial = false) {
        this.ambientParticles.push({
            x: Math.random() * width,
            y: initial ? Math.random() * height : height + 5,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -(0.2 + Math.random() * 0.6),
            size: 2 + Math.random() * 2,
            color: this.palette[Math.floor(Math.random() * this.palette.length)],
            alpha: 0.1 + Math.random() * 0.3,
            life: initial ? Math.floor(Math.random() * 200) : 0,
            maxLife: 200 + Math.random() * 200
        });
    }

    update(time, delta) {
        const { width, height } = this.sys.game.config;
        const dt = delta / 16.67;

        // Slowly shift sky time for a living backdrop
        this.skyTime += this.skyDirection * dt;
        if (this.skyTime > 0.95) this.skyDirection = -0.00005;
        if (this.skyTime < 0.82) this.skyDirection = 0.00005;

        // Render sky
        this.renderSky(width, height, this.skyTime);

        // Update ambient particles
        this.particleGraphics.clear();
        for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
            const p = this.ambientParticles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life++;

            const lifeRatio = p.life / p.maxLife;
            let alpha = p.alpha;
            if (lifeRatio < 0.1) alpha *= lifeRatio / 0.1;
            if (lifeRatio > 0.8) alpha *= (1 - lifeRatio) / 0.2;

            if (p.life > p.maxLife || p.y < -10) {
                this.ambientParticles.splice(i, 1);
                this.spawnAmbientParticle(width, height);
                continue;
            }

            this.particleGraphics.fillStyle(p.color, alpha);
            this.particleGraphics.fillRect(
                Math.floor(p.x), Math.floor(p.y),
                Math.floor(p.size), Math.floor(p.size)
            );
        }

        // Draw pixel title with shimmer
        this.titleElapsed += delta;
        this.titleGraphics.clear();
        for (const tp of this.titlePixels) {
            const shimmer = 0.85 + Math.sin(this.titleElapsed * 0.003 + tp.x * 0.05) * 0.15;
            this.titleGraphics.fillStyle(tp.color, shimmer);
            this.titleGraphics.fillRect(tp.x, tp.y, tp.size, tp.size);
        }

        // Draw button pixel text
        for (const button of this.buttons) {
            if (button.labelGraphics && button.labelPixels) {
                button.labelGraphics.clear();
                for (const p of button.labelPixels) {
                    const alpha = button.enabled ? 0.9 : 0.3;
                    button.labelGraphics.fillStyle(p.color, alpha);
                    button.labelGraphics.fillRect(p.x, p.y, p.size, p.size);
                }
            }
        }

        // Draw footer pixel text
        if (this.footerGraphics && this.footerPixels) {
            this.footerGraphics.clear();
            for (const p of this.footerPixels) {
                this.footerGraphics.fillStyle(p.color, 0.25);
                this.footerGraphics.fillRect(p.x, p.y, p.size, p.size);
            }
        }
    }

    renderSky(width, height, time) {
        this.skyGraphics.clear();

        let skyColors;

        if (time < 0.2) {
            skyColors = { top: 0x000033, bottom: 0x000055 };
        } else if (time < 0.3) {
            const t = (time - 0.2) / 0.1;
            skyColors = {
                top: this.lerpColor(0x000033, 0xff6b35, t),
                bottom: this.lerpColor(0x000055, 0xffa500, t)
            };
        } else if (time < 0.4) {
            const t = (time - 0.3) / 0.1;
            skyColors = {
                top: this.lerpColor(0xff6b35, 0x87ceeb, t),
                bottom: this.lerpColor(0xffa500, 0x87ceeb, t)
            };
        } else if (time < 0.65) {
            skyColors = { top: 0x87ceeb, bottom: 0x87ceeb };
        } else if (time < 0.75) {
            const t = (time - 0.65) / 0.1;
            skyColors = {
                top: this.lerpColor(0x87ceeb, 0xff6b35, t),
                bottom: this.lerpColor(0x87ceeb, 0xff4500, t)
            };
        } else if (time < 0.85) {
            const t = (time - 0.75) / 0.1;
            skyColors = {
                top: this.lerpColor(0xff6b35, 0x000033, t),
                bottom: this.lerpColor(0xff4500, 0x000055, t)
            };
        } else {
            skyColors = { top: 0x000033, bottom: 0x000055 };
        }

        this.skyGraphics.fillGradientStyle(
            skyColors.top, skyColors.top,
            skyColors.bottom, skyColors.bottom, 1
        );
        this.skyGraphics.fillRect(0, 0, width, height);
    }

    lerpColor(color1, color2, t) {
        const r1 = (color1 >> 16) & 0xFF;
        const g1 = (color1 >> 8) & 0xFF;
        const b1 = color1 & 0xFF;

        const r2 = (color2 >> 16) & 0xFF;
        const g2 = (color2 >> 8) & 0xFF;
        const b2 = color2 & 0xFF;

        const r = Math.floor(r1 + (r2 - r1) * t);
        const g = Math.floor(g1 + (g2 - g1) * t);
        const b = Math.floor(b1 + (b2 - b1) * t);

        return (r << 16) | (g << 8) | b;
    }

    setGameUIVisible(visible) {
        const display = visible ? '' : 'none';
        const elements = ['element-selector', 'stats', 'global-tooltip', 'game-header', 'brush-control'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = display;
        });
    }
}
