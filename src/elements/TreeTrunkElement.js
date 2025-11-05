import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class TreeTrunkElement extends Element {
    constructor() {
        super(11, 'tree_trunk', 0x6b4423, {
            density: 6,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.94, // Extremely hard to burn (living wood)
            burnsInto: 'burning_wood',
            tags: [TAG.COMBUSTIBLE, TAG.ORGANIC]
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell || !cell.data.canGrow) return false;

        // Initialize growth data
        if (cell.data.growthStage === undefined) {
            cell.data.growthStage = 0;
            cell.data.growthTimer = 0;
            cell.data.canGrow = true;
        }

        // Very slow growth rate
        cell.data.growthTimer = (cell.data.growthTimer || 0) + 1;
        if (cell.data.growthTimer < 120) return false; // Grow every 120 frames (much slower)
        cell.data.growthTimer = 0;

        const maxHeight = 12; // Max trunk height
        const currentStage = cell.data.growthStage;

        if (currentStage >= maxHeight) {
            // Stop growing, spawn crown of leaves
            cell.data.canGrow = false;
            this.spawnLeafCrown(x, y, grid);
            return false;
        }

        // Grow upward
        if (grid.isEmpty(x, y - 1)) {
            const trunkElement = grid.registry.get('tree_trunk');
            grid.setElement(x, y - 1, trunkElement);
            const aboveCell = grid.getCell(x, y - 1);
            if (aboveCell) {
                aboveCell.data.growthStage = currentStage + 1;
                aboveCell.data.canGrow = true;
            }

            // Stop this cell from growing
            cell.data.canGrow = false;

            // Spawn branches at intervals
            if (currentStage > 3 && currentStage % 3 === 0) {
                this.spawnBranch(x, y, grid, -1); // Left branch
                this.spawnBranch(x, y, grid, 1);  // Right branch
            }

            return true;
        }

        // Can't grow, stop
        cell.data.canGrow = false;
        return false;
    }

    spawnBranch(x, y, grid, direction) {
        // Spawn branch diagonally
        const branchX = x + direction;
        const branchY = y - 1;

        if (grid.isEmpty(branchX, branchY)) {
            const branchElement = grid.registry.get('tree_branch');
            if (branchElement) {
                grid.setElement(branchX, branchY, branchElement);
                const branchCell = grid.getCell(branchX, branchY);
                if (branchCell) {
                    branchCell.data.direction = direction;
                    branchCell.data.growthStage = 0;
                    branchCell.data.canGrow = true;
                }
            }
        }
    }

    spawnLeafCrown(x, y, grid) {
        // Spawn leaves around the top
        const leafElement = grid.registry.get('leaf');
        if (!leafElement) return;

        const positions = [
            [x, y - 1], [x, y - 2],
            [x - 1, y - 1], [x + 1, y - 1],
            [x - 1, y - 2], [x + 1, y - 2],
            [x - 2, y - 1], [x + 2, y - 1]
        ];

        for (const [lx, ly] of positions) {
            if (grid.isEmpty(lx, ly) && Math.random() > 0.3) {
                grid.setElement(lx, ly, leafElement);
            }
        }
    }
}

export default TreeTrunkElement;
