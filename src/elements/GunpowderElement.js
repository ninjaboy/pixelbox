import Element from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { GravityBehavior } from '../behaviors/MovementBehaviors.js';
import { WetDryTransitionBehavior } from '../behaviors/TransformationBehaviors.js';

class GunpowderElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.GUNPOWDER, 'gunpowder', 0x333333, { // Dark gray/black
            density: 3, // Same as sand for consistent powder behavior
            state: STATE.POWDER,
            dispersion: 1,
            ignitionResistance: 0.0, // EXTREMELY easy to ignite (15% chance)
            burnsInto: 'fire',
            tags: new Set([TAG.COMBUSTIBLE, TAG.EXPLOSIVE]),
            brushSize: 4, // Medium-large pour brush
            emissionDensity: 1.0 // Pour like sand
        });

        // Behavior 1: Wet/dry transition
        this.addBehavior(new WetDryTransitionBehavior({
            dryForm: 'gunpowder',
            wetForm: 'wet_gunpowder',
            waterSources: ['water', 'wet_sand'],
            wettingChance: 1.0, // Instant wetting
            dryingChance: 0.0005 // Slow drying (0.05%)
        }));

        // Use standardized gravity behavior (same as sand)
        this.movement = new GravityBehavior({
            fallSpeed: 1,
            slideAngle: true,
            slideStability: 0.85
        });
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // PRIORITY 0: Apply explosion velocity if element has been launched
        if (cell.data.velocityX !== undefined || cell.data.velocityY !== undefined) {
            const moved = this.applyVelocity(x, y, grid, cell);
            if (moved) return true;
            // If couldn't move with velocity, fall through to normal behavior
        }

        // PRIORITY 1: Check for wet/dry transition
        if (this.applyBehaviors(x, y, grid)) {
            return true;
        }

        // PRIORITY 2: Delegate to gravity behavior
        return this.movement.apply(x, y, grid);
    }

    // Apply velocity-based movement (for explosion-launched particles)
    applyVelocity(x, y, grid, cell) {
        let vx = cell.data.velocityX || 0;
        let vy = cell.data.velocityY || 0;

        // Air resistance - reduce velocity each frame
        const airResistance = 0.92; // 8% velocity loss per frame
        vx *= airResistance;
        vy *= airResistance;

        // Gravity - pull downward (but slower than velocity initially)
        vy += 0.15; // Gravity acceleration

        // Stop if velocity too small
        if (Math.abs(vx) < 0.3 && Math.abs(vy) < 0.3) {
            delete cell.data.velocityX;
            delete cell.data.velocityY;
            return false;
        }

        // Calculate target position (round to integers)
        const targetX = x + Math.round(vx);
        const targetY = y + Math.round(vy);

        // Try to move to target
        if (grid.isInBounds(targetX, targetY)) {
            const targetCell = grid.getCell(targetX, targetY);
            const targetElement = targetCell.element;

            // Can move into empty space or displace lighter/movable elements
            if (targetElement && (targetElement.id === 0 ||
                (targetElement.movable && targetElement.density < this.density))) {

                // Swap positions
                grid.swap(x, y, targetX, targetY);

                // Update velocity in new position
                const newCell = grid.getCell(targetX, targetY);
                if (newCell) {
                    newCell.data.velocityX = vx;
                    newCell.data.velocityY = vy;
                }

                return true;
            }
        }

        // Collision - bounce or stop
        // Hit something solid - reduce velocity significantly
        if (Math.abs(vx) > Math.abs(vy)) {
            // Horizontal collision - reverse X velocity with damping
            vx *= -0.3;
        } else {
            // Vertical collision - reverse Y velocity with damping
            vy *= -0.4;
        }

        // Update velocity
        cell.data.velocityX = vx;
        cell.data.velocityY = vy;

        return false; // Didn't move, but handled velocity
    }

    // Custom interaction for explosive chain reactions
    // NOTE: This overrides InteractionManager's standard ignition to provide explosion behavior
    onInteract(otherElement, grid, x, y, otherX, otherY) {
        // When gunpowder touches heat source - INSTANT EXPLOSION (100% for testing)
        if (otherElement.hasTag(TAG.HEAT_SOURCE)) {
            this.explode(x, y, grid);
            return true;
        }

        return null; // Use default interaction system
    }

    explode(x, y, grid) {
        const fireElement = grid.registry.get('fire');
        const smokeElement = grid.registry.get('smoke');

        // MASSIVE explosion radius - this is going to be EPIC
        const explosionRadius = 4;
        const explosionPower = 8; // Maximum launch velocity

        // Get all particles in explosion radius
        const affectedCells = [];
        for (let dy = -explosionRadius; dy <= explosionRadius; dy++) {
            for (let dx = -explosionRadius; dx <= explosionRadius; dx++) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist <= explosionRadius) {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (grid.isInBounds(nx, ny)) {
                        affectedCells.push({ x: nx, y: ny, dist, dx, dy });
                    }
                }
            }
        }

        // Sort by distance (process from center outward for chain reactions)
        affectedCells.sort((a, b) => a.dist - b.dist);

        // Process explosion effects
        for (const cell of affectedCells) {
            const element = grid.getElement(cell.x, cell.y);
            if (!element) continue;

            // Explosion strength decreases with distance (inverse square law)
            const strength = Math.pow(1.0 - (cell.dist / explosionRadius), 1.5);

            // CENTER: Become fire (radius 1.5)
            if (cell.dist < 1.5) {
                grid.setElement(cell.x, cell.y, fireElement);
                continue;
            }

            // CHAIN REACTION: Ignite nearby gunpowder INSTANTLY (BOOM!)
            if (element.name === 'gunpowder' && cell.dist < explosionRadius * 0.8) {
                // Delayed explosion for chain reaction effect
                setTimeout(() => {
                    if (grid.getElement(cell.x, cell.y)?.name === 'gunpowder') {
                        this.explode(cell.x, cell.y, grid);
                    }
                }, Math.random() * 50 + 10); // 10-60ms delay
                continue;
            }

            // IGNITE: Set combustible materials on fire
            if (element.hasTag(TAG.COMBUSTIBLE) && Math.random() < strength * 0.8) {
                grid.setElement(cell.x, cell.y, fireElement);
                continue;
            }

            // LAUNCH: Blast movable elements into the FUCKING SKY!
            if (element.movable && strength > 0.2) {
                const launchCell = grid.getCell(cell.x, cell.y);
                if (launchCell) {
                    // Calculate launch direction (UPWARD BIAS!)
                    const angle = Math.atan2(cell.dy, cell.dx);

                    // UPWARD BIAS: 70% of force goes UP, 30% sideways
                    const upwardBias = 0.7;
                    const horizontalRatio = Math.abs(Math.cos(angle));
                    const verticalRatio = Math.abs(Math.sin(angle));

                    // Calculate velocity components
                    const baseVelocity = explosionPower * strength;

                    // If element is above explosion, reduce upward force
                    // If element is below or sides, MAXIMUM upward force
                    let vx, vy;

                    if (cell.dy < 0) {
                        // Element is ABOVE explosion - push up but less
                        vx = Math.sign(cell.dx) * baseVelocity * horizontalRatio * (1 - upwardBias);
                        vy = -baseVelocity * upwardBias; // UP is negative Y
                    } else {
                        // Element is BELOW or SIDES - LAUNCH IT TO THE SKY!
                        vx = Math.sign(cell.dx) * baseVelocity * horizontalRatio * 0.5;
                        vy = -baseVelocity * (upwardBias + verticalRatio * 0.3); // MASSIVE upward force
                    }

                    // Lighter elements fly further (inverse density)
                    const densityFactor = Math.max(0.5, 3.0 / (element.density + 1));
                    vx *= densityFactor;
                    vy *= densityFactor;

                    // Set velocity data
                    launchCell.data.velocityX = vx;
                    launchCell.data.velocityY = vy;
                }
            }

            // SMOKE: Create smoke at edges
            if (cell.dist > 2.0 && cell.dist < 3.5 && element.id === 0 && Math.random() < 0.6) {
                grid.setElement(cell.x, cell.y, smokeElement);
            }
        }
    }
}

export default GunpowderElement;
