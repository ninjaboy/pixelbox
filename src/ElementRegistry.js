import InteractionManager from './InteractionManager.js';

// Element Registry - manages all available elements and their interactions
class ElementRegistry {
    constructor() {
        this.elements = new Map();
        this.interactionManager = new InteractionManager();
    }

    register(element) {
        this.elements.set(element.name, element);
        this.elements.set(element.id, element);
    }

    get(nameOrId) {
        return this.elements.get(nameOrId);
    }

    getById(id) {
        return this.elements.get(id);
    }

    getByName(name) {
        return this.elements.get(name);
    }

    // Check interactions between two elements
    checkInteraction(element1, element2, grid, x1, y1, x2, y2) {
        return this.interactionManager.checkInteraction(
            element1, element2, grid, x1, y1, x2, y2, this
        );
    }

    // Register custom interaction rule
    registerInteraction(rule) {
        this.interactionManager.registerInteraction(rule);
    }

    getAllElements() {
        const elements = [];
        for (const [key, value] of this.elements.entries()) {
            if (typeof key === 'string') { // Only get string keys (names)
                elements.push(value);
            }
        }
        return elements;
    }
}

export default ElementRegistry;
