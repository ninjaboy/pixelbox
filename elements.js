// Base Element Class
class Element {
    constructor(id, name, color, properties = {}) {
        this.id = id;
        this.name = name;
        this.color = color;

        // Default properties
        this.density = properties.density || 0;
        this.dispersion = properties.dispersion || 0;
        this.flammable = properties.flammable || false;
        this.burnsInto = properties.burnsInto || null;
        this.defaultLifetime = properties.lifetime || -1;
        this.movable = properties.movable !== false; // true by default
    }

    // Override in subclasses for custom behavior
    update(x, y, grid) {
        return false; // false = no change, true = changed
    }

    // Check if this element can interact with another
    canInteractWith(otherElement) {
        return false;
    }

    // Perform interaction with another element
    interact(x, y, otherX, otherY, grid) {
        return false; // false = no interaction, true = interaction occurred
    }
}

// Empty/Air element
class EmptyElement extends Element {
    constructor() {
        super(0, 'empty', 0x000000, {
            density: 0,
            dispersion: 0,
            movable: false
        });
    }
}

// Solid powder that falls and piles
class SandElement extends Element {
    constructor() {
        super(1, 'sand', 0xc2b280, {
            density: 3,
            dispersion: 1,
            flammable: false
        });
    }

    update(x, y, grid) {
        // Try to fall down
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Try diagonal fall with slight randomness
        const dir = Math.random() > 0.5 ? -1 : 1;
        if (grid.canMoveTo(x, y, x + dir, y + 1)) {
            grid.swap(x, y, x + dir, y + 1);
            return true;
        }
        if (grid.canMoveTo(x, y, x - dir, y + 1)) {
            grid.swap(x, y, x - dir, y + 1);
            return true;
        }

        return false;
    }
}

// Liquid that flows and spreads
class WaterElement extends Element {
    constructor() {
        super(2, 'water', 0x4a90e2, {
            density: 2,
            dispersion: 3,
            flammable: false
        });
    }

    update(x, y, grid) {
        // Try to fall down
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Try diagonal fall
        const fallDir = Math.random() > 0.5 ? -1 : 1;
        if (grid.canMoveTo(x, y, x + fallDir, y + 1)) {
            grid.swap(x, y, x + fallDir, y + 1);
            return true;
        }
        if (grid.canMoveTo(x, y, x - fallDir, y + 1)) {
            grid.swap(x, y, x - fallDir, y + 1);
            return true;
        }

        // Flow sideways (water spreads more than sand)
        const flowDir = Math.random() > 0.5 ? 1 : -1;
        if (grid.canMoveTo(x, y, x + flowDir, y)) {
            grid.swap(x, y, x + flowDir, y);
            return true;
        }
        if (grid.canMoveTo(x, y, x - flowDir, y)) {
            grid.swap(x, y, x - flowDir, y);
            return true;
        }

        return false;
    }

    canInteractWith(otherElement) {
        return otherElement.name === 'fire';
    }

    interact(x, y, otherX, otherY, grid) {
        const otherElement = grid.getElement(otherX, otherY);

        // Water + Fire = Steam (chance-based)
        if (otherElement && otherElement.name === 'fire' && Math.random() > 0.9) {
            grid.setElement(x, y, ElementRegistry.get('steam'));
            grid.setElement(otherX, otherY, ElementRegistry.get('empty'));
            return true;
        }

        return false;
    }
}

// Solid immovable material
class StoneElement extends Element {
    constructor() {
        super(3, 'stone', 0x666666, {
            density: 10,
            dispersion: 0,
            flammable: false,
            movable: false
        });
    }
}

// Combustion element that rises and spreads
class FireElement extends Element {
    constructor() {
        super(4, 'fire', 0xff6b35, {
            density: 0,
            dispersion: 2,
            flammable: false,
            lifetime: 30
        });
    }

    update(x, y, grid) {
        // Fire rises with some randomness
        if (Math.random() > 0.3) {
            if (grid.isEmpty(x, y - 1)) {
                grid.swap(x, y, x, y - 1);
                return true;
            }

            const dir = Math.random() > 0.5 ? 1 : -1;
            if (grid.isEmpty(x + dir, y - 1)) {
                grid.swap(x, y, x + dir, y - 1);
                return true;
            }
        }

        // Check all neighbors for flammable materials
        const neighbors = [
            [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y],
            [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
        ];

        for (const [nx, ny] of neighbors) {
            const neighborElement = grid.getElement(nx, ny);

            // Ignite flammable materials
            if (neighborElement && neighborElement.flammable && Math.random() > 0.95) {
                const newElement = neighborElement.burnsInto
                    ? ElementRegistry.get(neighborElement.burnsInto)
                    : ElementRegistry.get('fire');
                grid.setElement(nx, ny, newElement);
                return true;
            }
        }

        return false;
    }
}

// Flammable solid material
class WoodElement extends Element {
    constructor() {
        super(5, 'wood', 0x8b4513, {
            density: 5,
            dispersion: 0,
            flammable: true,
            burnsInto: 'fire',
            movable: false
        });
    }
}

// Gas that rises and dissipates
class SteamElement extends Element {
    constructor() {
        super(6, 'steam', 0xcccccc, {
            density: 0,
            dispersion: 2,
            flammable: false,
            lifetime: 120
        });
    }

    update(x, y, grid) {
        // Steam rises
        if (grid.isEmpty(x, y - 1)) {
            grid.swap(x, y, x, y - 1);
            return true;
        }

        // Drift sideways
        const dir = Math.random() > 0.5 ? 1 : -1;
        if (grid.isEmpty(x + dir, y)) {
            grid.swap(x, y, x + dir, y);
            return true;
        }
        if (grid.isEmpty(x + dir, y - 1)) {
            grid.swap(x, y, x + dir, y - 1);
            return true;
        }

        return false;
    }
}

// Element Registry - manages all available elements
class ElementRegistry {
    static elements = new Map();

    static register(element) {
        this.elements.set(element.name, element);
        this.elements.set(element.id, element);
    }

    static get(nameOrId) {
        return this.elements.get(nameOrId);
    }

    static getById(id) {
        return this.elements.get(id);
    }

    static getByName(name) {
        return this.elements.get(name);
    }

    static init() {
        // Register all elements
        this.register(new EmptyElement());
        this.register(new SandElement());
        this.register(new WaterElement());
        this.register(new StoneElement());
        this.register(new FireElement());
        this.register(new WoodElement());
        this.register(new SteamElement());
    }
}

// Initialize registry
ElementRegistry.init();
