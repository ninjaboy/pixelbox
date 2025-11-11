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
        // PRIORITY 1: Check for wet/dry transition
        if (this.applyBehaviors(x, y, grid)) {
            return true;
        }

        // PRIORITY 2: Delegate to gravity behavior
        return this.movement.apply(x, y, grid);
    }

    // Custom interaction for explosive chain reactions
    // NOTE: This overrides InteractionManager's standard ignition to provide explosion behavior
    onInteract(otherElement, grid, x, y, otherX, otherY) {
        // When gunpowder touches heat source - HIGH CHANCE IGNITION (90%)
        // (Higher than InteractionManager's 15% base to make gunpowder more volatile)
        if (otherElement.hasTag(TAG.HEAT_SOURCE)) {
            if (Math.random() > 0.1) {
                this.explode(x, y, grid);
                return true;
            }
        }

        return null; // Use default interaction system
    }

    explode(x, y, grid) {
        const fireElement = grid.registry.get('fire');
        const smokeElement = grid.registry.get('smoke');
        const emptyElement = grid.registry.get('empty');

        // Explosion radius
        const explosionRadius = 2;

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

        // Process explosion effects
        for (const cell of affectedCells) {
            const element = grid.getElement(cell.x, cell.y);
            if (!element) continue;

            const strength = 1.0 - (cell.dist / explosionRadius);

            // Center of explosion becomes fire
            if (cell.dist < 0.5) {
                grid.setElement(cell.x, cell.y, fireElement);
                continue;
            }

            // Ignite nearby gunpowder (chain reaction)
            if (element.name === 'gunpowder' && Math.random() < 0.8 * strength) {
                grid.setElement(cell.x, cell.y, fireElement);
                continue;
            }

            // Push movable particles away
            if (element.movable && Math.random() < 0.6 * strength) {
                const pushDist = Math.floor(2 + Math.random() * 3); // Push 2-4 cells
                const pushX = cell.x + Math.sign(cell.dx) * pushDist;
                const pushY = cell.y + Math.sign(cell.dy) * pushDist;

                if (grid.isInBounds(pushX, pushY)) {
                    const targetElement = grid.getElement(pushX, pushY);
                    // Only push into empty space or less dense materials
                    if (targetElement && (targetElement.id === 0 ||
                        (targetElement.density < element.density && targetElement.movable))) {
                        grid.swap(cell.x, cell.y, pushX, pushY);
                    }
                }
            }

            // Create smoke at outer edges
            if (cell.dist > 1.0 && cell.dist < 1.8 && element.id === 0 && Math.random() < 0.4) {
                grid.setElement(cell.x, cell.y, smokeElement);
            }
        }
    }
}

export default GunpowderElement;
