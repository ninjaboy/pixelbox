import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class TreeBranchElement extends Element {
    constructor() {
        super(12, 'tree_branch', 0x8b5a3c, {
            density: 5,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.92, // Harder to burn (living wood)
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
            cell.data.direction = cell.data.direction || 1; // Default right
            cell.data.canGrow = true;
        }

        // Slow growth
        cell.data.growthTimer = (cell.data.growthTimer || 0) + 1;
        if (cell.data.growthTimer < 25) return false; // Grow every 25 frames
        cell.data.growthTimer = 0;

        const maxLength = 4; // Max branch length
        const currentStage = cell.data.growthStage;
        const direction = cell.data.direction;

        if (currentStage >= maxLength) {
            // Stop growing, spawn leaves
            cell.data.canGrow = false;
            this.spawnLeaves(x, y, grid, direction);
            return false;
        }

        // Grow diagonally (up and outward)
        const nextX = x + direction;
        const nextY = y - 1;

        if (grid.isEmpty(nextX, nextY)) {
            const branchElement = grid.registry.get('tree_branch');
            grid.setElement(nextX, nextY, branchElement);
            const nextCell = grid.getCell(nextX, nextY);
            if (nextCell) {
                nextCell.data.direction = direction;
                nextCell.data.growthStage = currentStage + 1;
                nextCell.data.canGrow = true;
            }

            // Stop this cell from growing
            cell.data.canGrow = false;

            // Sometimes spawn a sub-branch
            if (currentStage === 2 && Math.random() > 0.6) {
                const subBranchX = x + direction;
                const subBranchY = y;
                if (grid.isEmpty(subBranchX, subBranchY)) {
                    grid.setElement(subBranchX, subBranchY, branchElement);
                    const subCell = grid.getCell(subBranchX, subBranchY);
                    if (subCell) {
                        subCell.data.direction = direction;
                        subCell.data.growthStage = 0;
                        subCell.data.canGrow = true;
                    }
                }
            }

            return true;
        }

        // Can't grow, stop and spawn leaves
        cell.data.canGrow = false;
        this.spawnLeaves(x, y, grid, direction);
        return false;
    }

    spawnLeaves(x, y, grid, direction) {
        const leafElement = grid.registry.get('leaf');
        if (!leafElement) return;

        // Spawn leaves at branch tip
        const positions = [
            [x, y - 1],
            [x + direction, y - 1],
            [x + direction, y],
            [x + direction * 2, y - 1],
            [x, y - 2],
            [x + direction, y - 2]
        ];

        for (const [lx, ly] of positions) {
            if (grid.isEmpty(lx, ly) && Math.random() > 0.4) {
                grid.setElement(lx, ly, leafElement);
            }
        }
    }
}

export default TreeBranchElement;
