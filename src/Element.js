// Base Element Class
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
    }

    // Check if element has a specific tag
    hasTag(tag) {
        return this.tags.has(tag);
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
