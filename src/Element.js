/**
 * Base Element Class
 *
 * DENSITY SCALE (determines settling/displacement order):
 *   0:     Gases (fire, smoke, steam)
 *   1-2:   Light liquids (ash: 1, oil: 1.5, water: 2)
 *   3-4:   Powders (ice: 3, sand: 3, salt: 4)
 *   5-7:   Light solids (wood: 5, glass: 5)
 *   8-9:   Heavy materials (lava: 8, wet sand: 9)
 *   10+:   Very heavy solids (stone: 10)
 *
 * Elements with higher density sink through lower density elements.
 *
 * BEHAVIOR SYSTEM:
 * Elements can use behavior composition pattern via this.addBehavior():
 *   - MovementBehaviors (GravityBehavior, LiquidFlowBehavior, GasBehavior)
 *   - CombustionBehaviors (BurningBehavior, EmissionBehavior, IgnitionBehavior)
 *   - TransformationBehaviors (HeatTransformationBehavior, MeltingBehavior, etc.)
 */
class Element {
    constructor(id, name, color, properties = {}) {
        this.id = id;
        this.name = name;
        this.color = color;

        // Physical properties
        this.density = properties.density || 0;
        this.state = properties.state || 'empty';
        this.temperature = properties.temperature || 0;

        // Movement properties
        this.dispersion = properties.dispersion || 0; // How much it spreads
        this.movable = properties.movable !== false;  // Can it move at all?

        // Lifecycle properties
        this.defaultLifetime = properties.lifetime || -1; // -1 = infinite

        // Interaction tags
        this.tags = new Set(properties.tags || []);

        // Burning properties
        this.ignitionResistance = properties.ignitionResistance || 0; // 0-1, how hard to ignite (0=easy, 1=impossible)
        this.burnRate = properties.burnRate || 1.0; // Multiplier for burn speed (higher = faster)

        // Drawing/placement properties
        this.brushSize = properties.brushSize !== undefined ? properties.brushSize : 5; // Brush radius (0 = single pixel)
        this.emissionDensity = properties.emissionDensity !== undefined ? properties.emissionDensity : 1.0; // 0-1, spawn probability

        // Transformation properties
        this.burnsInto = properties.burnsInto || null;     // What it becomes when burned
        this.evaporatesInto = properties.evaporatesInto || null; // What it becomes when heated
        this.condensesInto = properties.condensesInto || null;   // What it becomes when cooled
        this.meltInto = properties.meltInto || null;       // What it becomes when melted

        // Behavior strategies (for composition pattern)
        this.behaviors = [];
    }

    // Check if element has a specific tag
    hasTag(tag) {
        return this.tags.has(tag);
    }

    // Add a behavior to this element
    addBehavior(behavior) {
        this.behaviors.push(behavior);
        return this; // for chaining
    }

    // Apply all behaviors in sequence
    applyBehaviors(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        for (const behavior of this.behaviors) {
            const changed = behavior.apply(x, y, grid, cell);
            if (changed) return true; // Stop after first successful behavior
        }

        return false;
    }

    // Override in subclasses for custom movement behavior
    update(x, y, grid) {
        return false; // false = no change, true = changed
    }

    // Called when this element interacts with another
    // Return value from InteractionManager will determine if interaction occurred
    onInteract(otherElement, grid, x, y, otherX, otherY) {
        // Can be overridden for custom interaction behavior
        return null; // null = use default interaction system
    }
}

export default Element;
