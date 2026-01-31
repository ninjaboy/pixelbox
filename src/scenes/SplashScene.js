import Phaser from 'phaser';
import { VERSION } from '../../version.js';
import { pixelFont, letterWidths } from '../PixelFont.js';

/**
 * SplashScene - Animated splash screen with particle effects
 * Shows game title "Pixellence" with falling pixel particles
 * Auto-transitions to MainMenuScene after ~3 seconds, or tap/click to skip
 */
export default class SplashScene extends Phaser.Scene {
    constructor() {
        super('SplashScene');
    }

    create() {
        const { width, height } = this.sys.game.config;

        // Hide game UI elements during splash
        this.setGameUIVisible(false);

        // Dark background
        this.cameras.main.setBackgroundColor('#000011');

        // Particle state
        this.particles = [];
        this.titleParticles = [];
        this.elapsed = 0;
        this.titleRevealed = false;
        this.transitioning = false;

        // Create graphics layers
        this.particleGraphics = this.add.graphics();
        this.titleGraphics = this.add.graphics();

        // Color palette (sunset oranges, cyans, dark blues)
        this.palette = [
            0xff6b35, 0xffa500, 0xff4500, 0x00ffff,
            0x4a90e2, 0x87ceeb, 0xffdd44, 0xff8c42,
            0x00cccc, 0xff6b9d
        ];

        // Spawn initial ambient particles
        for (let i = 0; i < 60; i++) {
            this.spawnAmbientParticle(true);
        }

        // Title text pixels - we'll render "Pixellence" as pixel art
        this.buildTitlePixels(width, height);

        // Version text (Phaser text, shown after title reveals)
        this.versionText = this.add.text(width / 2, height * 0.68, `v${VERSION}`, {
            fontFamily: 'monospace',
            fontSize: '14px',
            color: 'rgba(255, 255, 255, 0)',
            align: 'center'
        }).setOrigin(0.5);

        // "Tap to continue" hint
        this.hintText = this.add.text(width / 2, height * 0.85, '', {
            fontFamily: 'monospace',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0)',
            align: 'center'
        }).setOrigin(0.5);

        // Click/tap to skip
        this.input.on('pointerdown', () => {
            if (!this.transitioning) {
                this.transitionToMenu();
            }
        });

        // Keyboard to skip
        this.input.keyboard.on('keydown', () => {
            if (!this.transitioning) {
                this.transitionToMenu();
            }
        });

        // Auto-transition after 3 seconds
        this.autoTransitionTimer = this.time.delayedCall(3000, () => {
            if (!this.transitioning) {
                this.transitionToMenu();
            }
        });
    }

    buildTitlePixels(width, height) {
        const title = 'Pixellence';
        const pixelSize = 5;
        const spacing = 2;

        // Calculate total width
        let totalWidth = 0;
        for (const ch of title) {
            totalWidth += (letterWidths[ch] || 5) * pixelSize + spacing * pixelSize;
        }
        totalWidth -= spacing * pixelSize; // Remove trailing space

        const startX = (width - totalWidth) / 2;
        const startY = height * 0.38;

        let cursorX = startX;
        const titleColors = [
            0xff6b35, 0xff8c42, 0xffa500, 0xffdd44,
            0x00ffff, 0x4a90e2, 0x00cccc, 0x87ceeb
        ];

        for (let charIdx = 0; charIdx < title.length; charIdx++) {
            const ch = title[charIdx];
            const charMap = pixelFont[ch];
            if (!charMap) continue;

            const color = titleColors[charIdx % titleColors.length];

            for (let row = 0; row < charMap.length; row++) {
                for (let col = 0; col < charMap[row].length; col++) {
                    if (charMap[row][col] === '#') {
                        const px = cursorX + col * pixelSize;
                        const py = startY + row * pixelSize;

                        this.titleParticles.push({
                            targetX: px,
                            targetY: py,
                            // Start from random positions above
                            x: px + (Math.random() - 0.5) * width * 0.8,
                            y: -20 - Math.random() * height * 0.5,
                            size: pixelSize,
                            color: color,
                            delay: charIdx * 80 + (row + col) * 15,
                            arrived: false,
                            vx: 0,
                            vy: 0,
                            alpha: 0
                        });
                    }
                }
            }

            cursorX += (letterWidths[ch] || 5) * pixelSize + spacing * pixelSize;
        }
    }

    spawnAmbientParticle(initialSpawn = false) {
        const { width, height } = this.sys.game.config;
        this.particles.push({
            x: Math.random() * width,
            y: initialSpawn ? Math.random() * height : height + 10,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -(0.3 + Math.random() * 1.2),
            size: 2 + Math.random() * 3,
            color: this.palette[Math.floor(Math.random() * this.palette.length)],
            alpha: 0.1 + Math.random() * 0.5,
            life: 0,
            maxLife: 120 + Math.random() * 180
        });
    }

    update(time, delta) {
        this.elapsed += delta;
        const dt = delta / 16.67; // Normalize to 60fps

        this.particleGraphics.clear();
        this.titleGraphics.clear();

        // Update and draw ambient particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life++;

            // Fade in/out
            const lifeRatio = p.life / p.maxLife;
            let alpha = p.alpha;
            if (lifeRatio < 0.1) alpha *= lifeRatio / 0.1;
            if (lifeRatio > 0.8) alpha *= (1 - lifeRatio) / 0.2;

            if (p.life > p.maxLife || p.y < -20) {
                this.particles.splice(i, 1);
                this.spawnAmbientParticle();
                continue;
            }

            this.particleGraphics.fillStyle(p.color, alpha);
            this.particleGraphics.fillRect(
                Math.floor(p.x), Math.floor(p.y),
                Math.floor(p.size), Math.floor(p.size)
            );
        }

        // Update and draw title particles
        let allArrived = true;
        for (const tp of this.titleParticles) {
            if (this.elapsed < tp.delay) {
                allArrived = false;
                continue;
            }

            if (!tp.arrived) {
                // Ease towards target
                const dx = tp.targetX - tp.x;
                const dy = tp.targetY - tp.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 1) {
                    tp.x = tp.targetX;
                    tp.y = tp.targetY;
                    tp.arrived = true;
                    tp.alpha = 1;
                } else {
                    const speed = 0.08 * dt;
                    tp.x += dx * speed;
                    tp.y += dy * speed;
                    tp.alpha = Math.min(1, tp.alpha + 0.04 * dt);
                    allArrived = false;
                }
            }

            // Subtle shimmer for arrived particles
            let shimmerAlpha = tp.alpha;
            if (tp.arrived) {
                shimmerAlpha = 0.85 + Math.sin(this.elapsed * 0.003 + tp.targetX * 0.05) * 0.15;
            }

            this.titleGraphics.fillStyle(tp.color, shimmerAlpha);
            this.titleGraphics.fillRect(
                Math.floor(tp.x), Math.floor(tp.y),
                tp.size, tp.size
            );
        }

        // Show version text after title mostly assembled
        if (this.elapsed > 1200) {
            const vAlpha = Math.min(1, (this.elapsed - 1200) / 800);
            this.versionText.setStyle({ color: `rgba(255, 255, 255, ${vAlpha * 0.6})` });
        }

        // Show hint text
        if (this.elapsed > 1800) {
            const hAlpha = Math.min(0.5, (this.elapsed - 1800) / 1000);
            const blink = 0.3 + Math.sin(this.elapsed * 0.004) * 0.2;
            this.hintText.setText('tap to continue');
            this.hintText.setStyle({ color: `rgba(255, 255, 255, ${hAlpha * blink})` });
        }
    }

    transitionToMenu() {
        this.transitioning = true;
        if (this.autoTransitionTimer) {
            this.autoTransitionTimer.remove();
        }

        // Quick fade out
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
            this.scene.start('MainMenuScene');
        });
    }

    setGameUIVisible(visible) {
        const display = visible ? '' : 'none';
        const elements = ['element-selector', 'stats', 'global-tooltip', 'game-header'];
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = display;
        });
    }
}
