import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class TreeTrunkElement extends Element {
    constructor() {
        super(11, 'tree_trunk', 0x6b4423, {
            density: 6,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.75, // Trunk is hardest to burn but still flammable (living wood core)
            burnsInto: 'burning_wood',
            tags: [TAG.COMBUSTIBLE, TAG.ORGANIC]
        });
    }

    updateImpl(x, y, grid) {
        // Get season data (v4.0.0)
        const seasonData = grid.seasonData;
        const season = seasonData ? seasonData.season : 'summer';

        // WINTER/AUTUMN DECAY (v4.0.0) - small chance for trees to die
        if (seasonData && (season === 'winter' || season === 'autumn')) {
            const decayChance = season === 'winter' ? 0.00002 : 0.00001; // 0.002% winter, 0.001% autumn
            if (Math.random() < decayChance) {
                grid.setElement(x, y, grid.registry.get('ash'));
                return true;
            }
        }

        // SPRING REGROWTH (v4.0.0) - bare trees regrow leaves faster in spring
        const regrowthRate = season === 'spring' ? 0.0001 : 0.00002; // 0.01% spring, 0.002% other seasons

        // Tree trunks maintain minimal foliage ONLY when bare
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

            // Only spawn leaf if trunk is completely bare
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

export default TreeTrunkElement;
