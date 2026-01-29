import Phaser from 'phaser';
import { VERSION } from '../../version.js';
import storageManager from '../StorageManager.js';

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

        // Hide game UI elements during menu
        this.setGameUIVisible(false);

        // Sky rendering state - use sunset time for a beautiful backdrop
        this.skyTime = 0.72; // Dusk — gorgeous sunset colors
        this.skyDirection = 0.0001; // Very slowly shift sky

        // Create graphics for sky
        this.skyGraphics = this.add.graphics();

        // Ambient particles for atmosphere
        this.ambientParticles = [];
        this.particleGraphics = this.add.graphics();
        this.palette = [0xff6b35, 0xffa500, 0xff4500, 0xffdd44, 0x00cccc];

        for (let i = 0; i < 30; i++) {
            this.spawnAmbientParticle(width, height, true);
        }

        // Title - "PixelBox" as Phaser text with glow-like styling
        this.titleText = this.add.text(width / 2, height * 0.22, 'PixelBox', {
            fontFamily: 'monospace',
            fontSize: '42px',
            fontStyle: 'bold',
            color: '#ff8c42',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Add glow effect to title
        this.titleText.postFX.addGlow(0xff6b35, 4, 0, false, 0.1, 6);

        // Subtitle / version
        this.add.text(width / 2, height * 0.32, `Particle Sandbox  ·  v${VERSION}`, {
            fontFamily: 'monospace',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.5)',
            align: 'center'
        }).setOrigin(0.5);

        // Menu buttons - we'll create these as interactive graphics + text
        this.buttons = [];

        // Check for saved world
        this.hasSave = false;
        this.checkSavedWorld().then(() => {
            this.buildMenu(width, height);
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
        const buttonWidth = Math.min(260, width * 0.7);
        const buttonHeight = 52;
        const buttonX = width / 2;
        const startY = height * 0.48;
        const gap = 16;

        // "New Game" button
        this.createButton(
            buttonX, startY,
            buttonWidth, buttonHeight,
            '🌍  New Game',
            'Start a fresh world',
            () => this.startNewGame(),
            true
        );

        // "Continue" button
        this.createButton(
            buttonX, startY + buttonHeight + gap,
            buttonWidth, buttonHeight,
            '▶️  Continue',
            this.hasSave ? 'Resume your saved world' : 'No saved world found',
            () => this.continueGame(),
            this.hasSave
        );

        // Footer text
        this.add.text(width / 2, height * 0.93, 'tap an element · draw on the world · watch it come alive', {
            fontFamily: 'monospace',
            fontSize: '9px',
            color: 'rgba(255, 255, 255, 0.3)',
            align: 'center'
        }).setOrigin(0.5);
    }

    createButton(x, y, w, h, label, desc, callback, enabled) {
        const btn = this.add.graphics();
        const borderColor = enabled ? 0x00cccc : 0x444444;
        const fillColor = enabled ? 0x0a1628 : 0x0a0a14;
        const fillAlpha = enabled ? 0.85 : 0.5;

        // Draw button background
        btn.fillStyle(fillColor, fillAlpha);
        btn.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
        btn.lineStyle(2, borderColor, enabled ? 0.7 : 0.3);
        btn.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);

        // Label text
        const labelColor = enabled ? '#ffffff' : '#555555';
        const labelText = this.add.text(x, y - 7, label, {
            fontFamily: 'monospace',
            fontSize: '16px',
            fontStyle: 'bold',
            color: labelColor,
            align: 'center'
        }).setOrigin(0.5);

        // Description text
        const descColor = enabled ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.2)';
        const descText = this.add.text(x, y + 13, desc, {
            fontFamily: 'monospace',
            fontSize: '10px',
            color: descColor,
            align: 'center'
        }).setOrigin(0.5);

        if (enabled) {
            // Make button interactive
            const hitArea = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });

            hitArea.on('pointerover', () => {
                btn.clear();
                btn.fillStyle(0x102040, 0.95);
                btn.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
                btn.lineStyle(2, 0x00ffff, 1);
                btn.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
            });

            hitArea.on('pointerout', () => {
                btn.clear();
                btn.fillStyle(fillColor, fillAlpha);
                btn.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
                btn.lineStyle(2, borderColor, 0.7);
                btn.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
            });

            hitArea.on('pointerdown', () => {
                btn.clear();
                btn.fillStyle(0x183060, 1);
                btn.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
                btn.lineStyle(2, 0x00ffff, 1);
                btn.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);
            });

            hitArea.on('pointerup', () => {
                callback();
            });

            // Add glow effect on enabled buttons
            btn.postFX.addGlow(borderColor, 1, 0, false, 0.05, 4);
        }

        this.buttons.push({ btn, labelText, descText, enabled });
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
        if (this.skyTime > 0.78) this.skyDirection = -0.0001;
        if (this.skyTime < 0.65) this.skyDirection = 0.0001;

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

        // Pulse title glow
        const pulse = 0.8 + Math.sin(time * 0.002) * 0.2;
        this.titleText.setAlpha(pulse);
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
        const elements = ['element-selector', 'stats', 'global-tooltip'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = display;
        });
    }
}
