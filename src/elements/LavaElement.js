import Element from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { LiquidFlowBehavior } from '../behaviors/MovementBehaviors.js';
import { IgnitionBehavior, EmissionBehavior } from '../behaviors/CombustionBehaviors.js';
import { MeltingBehavior } from '../behaviors/TransformationBehaviors.js';

class LavaElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.LAVA, 'lava', 0xff4500, { // Bright orange-red
            density: 8,
            state: STATE.LIQUID,
            movable: true,
            tags: new Set([TAG.HEAT_SOURCE, TAG.VERY_HOT]),
            brushSize: 3,
            emissionDensity: 0.7,
            lifetime: -1 // Eternal - lava never disappears
        });

        // Behavior 1: Ignite combustible materials nearby
        this.addBehavior(new IgnitionBehavior({
            ignitionChance: 0.2, // 20% chance
            range: 1,
            checkDiagonals: false // only cardinal directions
        }));

        // Behavior 2: Melting/transformation behavior (ice, salt, water)
        // Sand is handled separately with displacement mechanics
        this.addBehavior(new MeltingBehavior({
            meltingRules: [
                { target: 'water', result: 'obsidian', chance: 0.9 }, // Lava + water = obsidian (higher chance for complete crusting)
                { target: 'ice', result: 'steam', chance: 0.3 },
                { target: 'salt', result: 'smoke', chance: 0.1 }
            ],
            checkBelow: true,
            checkDiagonals: true,
            checkCardinal: true
        }));

        // Behavior 3: Smoke emission
        this.addBehavior(new EmissionBehavior({
            emitElement: 'smoke',
            emissionRate: 0.02, // 2% chance
            directions: [[0, -1]] // emit upward
        }));

        // Use standardized liquid flow behavior (very viscous)
        this.movement = new LiquidFlowBehavior({
            fallSpeed: 2,
            dispersionRate: 1,
            viscosity: 2, // Very viscous
            levelingEnabled: false,
            avoidUpwardDisplacement: true // NEW: Don't displace heavier elements upward
        });
    }

    update(x, y, grid) {
        // PRIORITY 1: SAND DISPLACEMENT MECHANICS
        // Lava pushes sand down and glassifies on sides
        const sandHandled = this.handleSandDisplacement(x, y, grid);
        if (sandHandled) return true;

        // PRIORITY 2: Apply all behaviors (ignition, melting, smoke)
        const behaviorResult = this.applyBehaviors(x, y, grid);
        if (behaviorResult) return true;

        // PRIORITY 3: Then apply movement
        return this.movement.apply(x, y, grid);
    }

    handleSandDisplacement(x, y, grid) {
        // Check below for sand
        const below = grid.getElement(x, y + 1);

        if (below && (below.name === 'sand' || below.name === 'wet_sand')) {
            // PUSH DOWN: Lava sinks through sand (density: lava=8, sand=3, wet_sand=9)
            // For wet sand, lava should destroy it and push down
            if (below.name === 'wet_sand' || Math.random() < 0.7) {
                // 70% chance to push sand down, 30% to glassify
                grid.swap(x, y, x, y + 1);
                return true;
            } else {
                // Glassify sand below
                grid.setElement(x, y + 1, grid.registry.get('glass'));
                return true;
            }
        }

        // Check sides for sand - glassify with occasional pushing
        const directions = [
            [x - 1, y], [x + 1, y]
        ];

        for (const [nx, ny] of directions) {
            const neighbor = grid.getElement(nx, ny);

            if (neighbor && neighbor.name === 'sand') {
                if (Math.random() < 0.15) { // 15% chance
                    // Sometimes push sand to the side
                    const pushDir = nx < x ? -1 : 1;
                    const pushTarget = grid.getElement(nx + pushDir, ny);

                    if (pushTarget && pushTarget.id === 0) {
                        grid.swap(nx, ny, nx + pushDir, ny);
                        return true;
                    } else {
                        // Can't push, glassify instead
                        grid.setElement(nx, ny, grid.registry.get('glass'));
                        return true;
                    }
                } else if (Math.random() < 0.08) { // 8% chance to glassify
                    grid.setElement(nx, ny, grid.registry.get('glass'));
                    return true;
                }
            }
        }

        return false;
    }
}

export default LavaElement;
