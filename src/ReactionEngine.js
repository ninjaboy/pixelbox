/**
 * ReactionEngine.js (v5.0.0)
 * Declarative element-pair reaction processor.
 * Reactions are defined as properties on Element classes and processed here.
 * Integrates with InteractionManager as a fallback after tag-based rules.
 */

class ReactionEngine {
    constructor(registry) {
        this.registry = registry;
        this.reactionLookup = new Map(); // "source:target" → reaction definition
    }

    /**
     * Build the lookup table from all registered elements.
     * Called once after all elements are registered in init.js.
     */
    buildLookup() {
        this.reactionLookup.clear();
        for (const element of this.registry.getAllElements()) {
            const reactions = element.reactions;
            if (!reactions) continue;

            for (const [targetName, reaction] of Object.entries(reactions)) {
                const key = `${element.name}:${targetName}`;
                this.reactionLookup.set(key, {
                    ...reaction,
                    sourceName: element.name,
                    targetName: targetName
                });
            }
        }
    }

    /**
     * Check if two adjacent cells should react.
     * Called from InteractionManager.checkInteraction() AFTER tag-based rules.
     */
    checkReaction(element1, element2, grid, x1, y1, x2, y2) {
        // Try element1 reacting with element2
        if (this.tryReaction(element1, element2, grid, x1, y1, x2, y2)) return true;
        // Try element2 reacting with element1 (reverse direction)
        if (this.tryReaction(element2, element1, grid, x2, y2, x1, y1)) return true;
        return false;
    }

    tryReaction(source, target, grid, sx, sy, tx, ty) {
        const key = `${source.name}:${target.name}`;
        const reaction = this.reactionLookup.get(key);
        if (!reaction) return false;

        // Check probability
        if (reaction.chance != null && Math.random() > reaction.chance) return false;

        // Check temperature requirements
        if (reaction.tempMin != null || reaction.tempMax != null) {
            const sourceCell = grid.getCell(sx, sy);
            const temp = sourceCell ? sourceCell.state.getTemperature() : 20;
            if (reaction.tempMin != null && temp < reaction.tempMin) return false;
            if (reaction.tempMax != null && temp > reaction.tempMax) return false;
        }

        // Custom function reactions
        if (reaction.func) {
            return reaction.func(grid, sx, sy, tx, ty, this.registry);
        }

        // Apply standard reaction
        this.applyReaction(reaction, grid, sx, sy, tx, ty);
        return true;
    }

    applyReaction(reaction, grid, sx, sy, tx, ty) {
        // Transform source element
        if (reaction.elem1 === null) {
            grid.setElement(sx, sy, this.registry.get('empty'));
        } else if (reaction.elem1) {
            const newElement = this.registry.get(reaction.elem1);
            if (newElement) grid.setElement(sx, sy, newElement);
        }
        // else: elem1 undefined = no change to source

        // Transform target element
        if (reaction.elem2 === null) {
            grid.setElement(tx, ty, this.registry.get('empty'));
        } else if (reaction.elem2) {
            const newElement = this.registry.get(reaction.elem2);
            if (newElement) grid.setElement(tx, ty, newElement);
        }
    }
}

export default ReactionEngine;
