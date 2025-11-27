import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class TreeBranchElement extends Element {
    constructor() {
        super(12, 'tree_branch', 0x8b5a3c, {
            density: 5,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.70, // Moderately flammable (living wood slightly harder than dead wood)
            burnsInto: 'burning_wood',
            tags: [TAG.COMBUSTIBLE, TAG.ORGANIC]
        });
    }

    updateImpl(x, y, grid) {
        // Get season data (v4.0.0)
        const seasonData = grid.seasonData;
        const season = seasonData ? seasonData.season : 'summer';

        // SEASONAL BRANCH DECAY (v4.0.0) - branches can fall off in autumn/winter
        if (seasonData && (season === 'autumn' || season === 'winter')) {
            const decayChance = season === 'winter' ? 0.00002 : 0.00001; // 0.002% winter, 0.001% autumn
            if (Math.random() < decayChance) {
                // Branch falls and becomes movable wood
                const woodElement = grid.registry.get('wood');
                if (woodElement) {
                    grid.setElement(x, y, woodElement);
                    // Make it movable so it falls
                    const cell = grid.getCell(x, y);
                    if (cell) {
                        cell.element.movable = true;
                    }
                }
                return true;
            }
        }

        // SPRING REGROWTH (v4.0.0) - branches regrow leaves faster in spring
        const regrowthRate = season === 'spring' ? 0.0001 : 0.00005; // 0.01% spring, 0.005% other seasons

        // Tree branches maintain foliage ONLY if there are no leaves nearby
        // This prevents infinite growth
        if (Math.random() < regrowthRate) {
            const leafElement = grid.registry.get('leaf');
            if (!leafElement) return false;

            // Check if there are already leaves nearby
            let hasNearbyLeaves = false;
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                    const neighbor = grid.getElement(x + dx, y + dy);
                    if (neighbor && neighbor.name === 'leaf') {
                        hasNearbyLeaves = true;
                        break;
                    }
                }
                if (hasNearbyLeaves) break;
            }

            // Only spawn leaf if there are NO leaves in 2-pixel radius
            if (!hasNearbyLeaves) {
                const positions = [
                    [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y]
                ];

                positions.sort(() => Math.random() - 0.5);

                for (const [nx, ny] of positions) {
                    if (grid.isEmpty(nx, ny)) {
                        grid.setElement(nx, ny, leafElement);
                        return true;
                    }
                }
            }
        }

        return false;
    }
}

export default TreeBranchElement;
