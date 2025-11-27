import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

// Tree configuration
const TREE_CONFIG = {
    initialLength: () => 5 + Math.random() * 8,  // 5-13 pixels (miniature trees)
    initialThickness: 1,  // Always 1 pixel wide
    maxDepth: () => 3 + Math.floor(Math.random() * 2),  // 3-4 levels
    minLength: 2,
    lengthReduction: () => 0.50 + Math.random() * 0.25,  // 50-75%
    minBranchAngle: 25 * Math.PI / 180,
    maxBranchAngle: 50 * Math.PI / 180,
    asymmetryVariation: 20 * Math.PI / 180,
    branchSkipChance: 0.3,  // 30% chance to skip a branch (randomize appearance)
    segmentsPerFrame: 1,  // Grow 1 segment at a time
    initialDelay: 120,  // 2 seconds before germination
    growthDelay: 80,  // Grow every 80 frames (slower growth, 2x slower than before)
    minLeafDepth: 2,  // Leaves start at shallower depth
    leavesPerTerminal: 3  // Fewer leaves per branch
};

class TreeSeedElement extends Element {
    constructor() {
        super(10, 'tree_seed', 0x654321, {
            density: 3,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.0, // Burns easily
            burnsInto: 'ash',
            tags: [TAG.ORGANIC, TAG.COMBUSTIBLE],
            brushSize: 0,
            emissionDensity: 1.0
        });
    }

    updateImpl(x, y, grid) {
        const cell = grid.getCell(x, y);
        if (!cell) return false;

        // Check if seed has landed (not falling)
        const hasLanded = !grid.isEmpty(x, y + 1);

        // If not landed, try to fall
        if (!hasLanded) {
            // Fall like a particle
            if (grid.canMoveTo(x, y, x, y + 1)) {
                grid.swap(x, y, x, y + 1);
                return true;
            }
            // Try diagonal falling
            const dir = Math.random() > 0.5 ? 1 : -1;
            if (grid.canMoveTo(x, y, x + dir, y + 1)) {
                grid.swap(x, y, x + dir, y + 1);
                return true;
            }
            if (grid.canMoveTo(x, y, x - dir, y + 1)) {
                grid.swap(x, y, x - dir, y + 1);
                return true;
            }
        }

        // Seed has landed - check if on valid surface (recheck every time it stops)
        const surfaceElement = grid.getElement(x, y + 1);

        // Valid surfaces for growth
        const validSurfaces = ['sand', 'wet_sand', 'stone', 'wall', 'wood', 'tree_trunk', 'tree_branch', 'fossil', 'ash'];

        if (!surfaceElement || !validSurfaces.includes(surfaceElement.name)) {
            // Invalid surface - seed stays dormant but doesn't start growing
            // Reset tree structure if surface changed to invalid
            if (cell.data.treeStructure) {
                delete cell.data.treeStructure;
                delete cell.data.growthTimer;
                delete cell.data.growthFrameCounter;
            }
            return false;
        }

        // Initialize growth timer if not set
        if (cell.data.growthTimer === undefined) {
            cell.data.growthTimer = 0;
            cell.data.checkedConditions = false;
        }

        // Wait for germination period BEFORE checking conditions
        cell.data.growthTimer++;
        if (cell.data.growthTimer < TREE_CONFIG.initialDelay) {
            return false;
        }

        // After germination delay, continuously check conditions before committing to grow
        if (!cell.data.checkedConditions) {
            // Check for nearby trees to prevent overcrowding
            const minTreeDistance = 12; // Increased from 8 to 12 for better spacing
            const hasNearbyTree = this.hasNearbyTree(x, y, grid, minTreeDistance);

            // Rare chance (3%) to allow multi-trunk trees even with nearby trees (reduced from 5%)
            const allowMultiTrunk = Math.random() < 0.03;

            if (hasNearbyTree && !allowMultiTrunk) {
                // Too close to another tree - seed stays dormant
                // Check conditions again next frame
                // Faster decay rate since we're stuck waiting
                if (Math.random() < 0.002) { // 0.2% chance per frame to decay (increased from 0.1%)
                    grid.setElement(x, y, grid.registry.get('ash'));
                }
                return false;
            }

            // Conditions are good - mark as checked and proceed to generate tree
            cell.data.checkedConditions = true;
        }

        // Generate tree structure only after conditions are validated
        if (!cell.data.treeStructure) {
            cell.data.treeStructure = this.generateFractalTree(x, y);
            cell.data.growthFrameCounter = 0;
            return false;
        }

        // Slow growth - only grow every N frames (modified by season, v4.0.0)
        const seasonData = grid.seasonData;
        const season = seasonData ? seasonData.season : 'summer';

        // Apply seasonal growth multiplier
        const seasonalMultipliers = {
            spring: 0.5,    // 2x faster
            summer: 1.0,    // normal
            autumn: 2.0,    // 2x slower
            winter: 999     // effectively stopped
        };
        const growthMultiplier = seasonalMultipliers[season] || 1.0;
        const adjustedDelay = TREE_CONFIG.growthDelay * growthMultiplier;

        cell.data.growthFrameCounter++;
        if (cell.data.growthFrameCounter < adjustedDelay) {
            return false;
        }
        cell.data.growthFrameCounter = 0;

        // Grow tree gradually
        return this.growTreeGradually(x, y, grid, cell);
    }

    hasNearbyTree(x, y, grid, radius) {
        // Check for existing tree trunks or branches within radius
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue; // Skip self

                const element = grid.getElement(x + dx, y + dy);
                if (element && (element.name === 'tree_trunk' || element.name === 'tree_branch')) {
                    return true;
                }
            }
        }
        return false;
    }

    generateFractalTree(rootX, rootY) {
        const segments = this.generateFractalTreeRecursive(
            rootX,
            rootY,
            -Math.PI / 2,  // Straight up (negative Y)
            TREE_CONFIG.initialLength(),
            TREE_CONFIG.initialThickness,  // Not a function - just a value
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

        // Branching parameters - 2 branches, but may skip some randomly
        const branchCount = 2;
        const lengthReduction = TREE_CONFIG.lengthReduction();
        const thicknessReduction = 1;  // Always 1 pixel

        // Base branch angle spread
        const baseAngleSpread = TREE_CONFIG.minBranchAngle +
                               Math.random() * (TREE_CONFIG.maxBranchAngle - TREE_CONFIG.minBranchAngle);

        // Generate child branches (2 branches, but randomly skip some)
        for (let i = 0; i < branchCount; i++) {
            // Randomly skip this branch for variety
            if (Math.random() < TREE_CONFIG.branchSkipChance) {
                continue;
            }

            // Two branches: one left, one right with asymmetry
            let branchAngle = angle + (i === 0 ? -baseAngleSpread : baseAngleSpread);
            branchAngle += (Math.random() - 0.5) * TREE_CONFIG.asymmetryVariation;

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

            // Spawn fewer leaves (2-4) around terminal point
            const leafCount = 2 + Math.floor(Math.random() * TREE_CONFIG.leavesPerTerminal);
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
