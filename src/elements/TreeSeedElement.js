import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

// Tree configuration
const TREE_CONFIG = {
    initialLength: () => 15 + Math.random() * 10,  // 15-25 pixels
    initialThickness: () => 3 + Math.floor(Math.random() * 2),  // 3-4 pixels
    maxDepth: () => 6 + Math.floor(Math.random() * 2),  // 6-7 levels
    minLength: 2,
    lengthReduction: () => 0.60 + Math.random() * 0.20,  // 60-80%
    minBranchAngle: 20 * Math.PI / 180,
    maxBranchAngle: 45 * Math.PI / 180,
    asymmetryVariation: 15 * Math.PI / 180,
    segmentsPerFrame: 2,
    initialDelay: 30,
    minLeafDepth: 5,
    leavesPerTerminal: 4
};

class TreeSeedElement extends Element {
    constructor() {
        super(10, 'tree_seed', 0x654321, {
            density: 3,
            state: STATE.SOLID,
            movable: false,
            tags: [TAG.ORGANIC],
            brushSize: 0,
            emissionDensity: 1.0
        });
    }

    update(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Initialize tree structure on first frame
        if (!cell.data.treeStructure) {
            cell.data.treeStructure = this.generateFractalTree(x, y);
            cell.data.growthTimer = 0;
            return false;
        }

        // Wait initial delay
        cell.data.growthTimer++;
        if (cell.data.growthTimer < TREE_CONFIG.initialDelay) {
            return false;
        }

        // Grow tree gradually
        return this.growTreeGradually(x, y, grid, cell);
    }

    generateFractalTree(rootX, rootY) {
        const segments = this.generateFractalTreeRecursive(
            rootX,
            rootY,
            -Math.PI / 2,  // Straight up (negative Y)
            TREE_CONFIG.initialLength(),
            TREE_CONFIG.initialThickness(),
            0,  // depth
            TREE_CONFIG.maxDepth()
        );

        return {
            segments: segments,
            totalSegments: segments.length,
            currentSegmentIndex: 0,
            isComplete: false
        };
    }

    generateFractalTreeRecursive(startX, startY, angle, length, thickness, depth, maxDepth) {
        const segments = [];

        // Base case: stop recursion
        if (depth >= maxDepth || length < TREE_CONFIG.minLength) {
            return segments;
        }

        // Calculate end point of current segment
        const endX = startX + length * Math.cos(angle);
        const endY = startY + length * Math.sin(angle);

        // Create current segment
        segments.push({
            x1: startX,
            y1: startY,
            x2: endX,
            y2: endY,
            thickness: thickness,
            depth: depth,
            angle: angle,
            length: length,
            type: depth <= 1 ? 'tree_trunk' : 'tree_branch'
        });

        // Branching parameters
        const branchCount = depth < 2 ? 2 : (Math.random() > 0.3 ? 2 : 3);
        const lengthReduction = TREE_CONFIG.lengthReduction();
        const thicknessReduction = Math.max(1, thickness - 1);

        // Base branch angle spread
        const baseAngleSpread = TREE_CONFIG.minBranchAngle +
                               Math.random() * (TREE_CONFIG.maxBranchAngle - TREE_CONFIG.minBranchAngle);

        // Generate child branches
        for (let i = 0; i < branchCount; i++) {
            let branchAngle;
            if (branchCount === 2) {
                // Two branches: one left, one right
                branchAngle = angle + (i === 0 ? -baseAngleSpread : baseAngleSpread);
            } else {
                // Three branches: left, center-ish, right
                const angleStep = baseAngleSpread * 2 / (branchCount - 1);
                branchAngle = angle - baseAngleSpread + i * angleStep;
                // Add asymmetry
                branchAngle += (Math.random() - 0.5) * TREE_CONFIG.asymmetryVariation;
            }

            // Recursive call for child branches
            const childSegments = this.generateFractalTreeRecursive(
                endX,
                endY,
                branchAngle,
                length * lengthReduction,
                thicknessReduction,
                depth + 1,
                maxDepth
            );

            segments.push(...childSegments);
        }

        return segments;
    }

    growTreeGradually(x, y, grid, cell) {
        const structure = cell.data.treeStructure;

        if (!structure.isComplete) {
            // Grow N segments per frame
            for (let i = 0; i < TREE_CONFIG.segmentsPerFrame; i++) {
                if (structure.currentSegmentIndex >= structure.segments.length) {
                    structure.isComplete = true;
                    break;
                }

                const segment = structure.segments[structure.currentSegmentIndex];
                this.drawLineSegment(
                    segment.x1,
                    segment.y1,
                    segment.x2,
                    segment.y2,
                    segment.thickness,
                    segment.type,
                    grid
                );

                structure.currentSegmentIndex++;
            }
            return true;
        }

        // Spawn leaves when tree is complete
        if (structure.isComplete && !cell.data.leavesSpawned) {
            this.spawnFractalLeaves(structure, grid);
            cell.data.leavesSpawned = true;
            return true;
        }

        return false;
    }

    drawLineSegment(x1, y1, x2, y2, thickness, elementType, grid) {
        const points = this.bresenhamLine(
            Math.round(x1),
            Math.round(y1),
            Math.round(x2),
            Math.round(y2)
        );

        const element = grid.registry.get(elementType);

        for (const {x, y} of points) {
            if (thickness === 1) {
                // Single pixel
                if (grid.isEmpty(x, y)) {
                    grid.setElement(x, y, element);
                }
            } else if (thickness === 2) {
                // 2x2 block
                for (let dx = 0; dx < 2; dx++) {
                    for (let dy = 0; dy < 2; dy++) {
                        if (grid.isEmpty(x + dx, y + dy)) {
                            grid.setElement(x + dx, y + dy, element);
                        }
                    }
                }
            } else {
                // Cross pattern for thickness 3+
                const radius = Math.floor(thickness / 2);
                for (let dx = -radius; dx <= radius; dx++) {
                    for (let dy = -radius; dy <= radius; dy++) {
                        if (Math.abs(dx) + Math.abs(dy) <= radius) {
                            if (grid.isEmpty(x + dx, y + dy)) {
                                grid.setElement(x + dx, y + dy, element);
                            }
                        }
                    }
                }
            }
        }
    }

    bresenhamLine(x1, y1, x2, y2) {
        const points = [];
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = x1 < x2 ? 1 : -1;
        const sy = y1 < y2 ? 1 : -1;
        let err = dx - dy;

        let x = x1;
        let y = y1;

        while (true) {
            points.push({x, y});

            if (x === x2 && y === y2) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }

        return points;
    }

    spawnFractalLeaves(structure, grid) {
        const leafElement = grid.registry.get('leaf');
        const terminalSegments = structure.segments.filter(s => s.depth >= TREE_CONFIG.minLeafDepth);

        for (const segment of terminalSegments) {
            const x = Math.round(segment.x2);
            const y = Math.round(segment.y2);

            // Spawn 3-5 leaves around terminal point
            const leafCount = 3 + Math.floor(Math.random() * 3);
            const positions = [
                [x, y], [x-1, y], [x+1, y], [x, y-1], [x, y+1],
                [x-1, y-1], [x+1, y-1], [x-1, y+1], [x+1, y+1]
            ];

            // Shuffle and take first leafCount positions
            positions.sort(() => Math.random() - 0.5);
            for (let i = 0; i < Math.min(leafCount, positions.length); i++) {
                const [lx, ly] = positions[i];
                if (grid.isEmpty(lx, ly)) {
                    grid.setElement(lx, ly, leafElement);
                }
            }
        }
    }
}

export default TreeSeedElement;
