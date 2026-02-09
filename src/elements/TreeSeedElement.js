import Element from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';
import { getRandomSpecies } from '../TreeSpecies.js';

// Base tree configuration (used as defaults, overridden per species)
const TREE_CONFIG = {
    initialLength: () => 5 + Math.random() * 8,
    initialThickness: 1,
    maxDepth: () => 3 + Math.floor(Math.random() * 2),
    minLength: 2,
    lengthReduction: () => 0.50 + Math.random() * 0.25,
    minBranchAngle: 25 * Math.PI / 180,
    maxBranchAngle: 50 * Math.PI / 180,
    asymmetryVariation: 20 * Math.PI / 180,
    branchSkipChance: 0.3,
    segmentsPerFrame: 1,
    initialDelay: 120,
    growthDelay: 80,
    minLeafDepth: 2,
    leavesPerTerminal: 3
};

// Minimum distance between trees (in grid cells)
const MIN_TREE_SPACING = 12;

class TreeSeedElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.TREE_SEED, 'tree_seed', 0x654321, {
            density: 3,
            state: STATE.SOLID,
            movable: false,
            ignitionResistance: 0.0,
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
            if (grid.canMoveTo(x, y, x, y + 1)) {
                grid.swap(x, y, x, y + 1);
                return true;
            }
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

        // Seed has landed - check if on valid surface
        const surfaceElement = grid.getElement(x, y + 1);
        const validSurfaces = ['sand', 'wet_sand', 'stone', 'wall', 'wood', 'tree_trunk', 'tree_branch', 'fossil', 'ash'];

        if (!surfaceElement || !validSurfaces.includes(surfaceElement.name)) {
            if (cell.data.treeStructure) {
                delete cell.data.treeStructure;
                delete cell.data.growthTimer;
                delete cell.data.growthFrameCounter;
                delete cell.data.species;
            }
            return false;
        }

        // Initialize growth timer if not set
        if (cell.data.growthTimer === undefined) {
            cell.data.growthTimer = 0;
        }

        // Wait for germination period
        cell.data.growthTimer++;
        if (cell.data.growthTimer < TREE_CONFIG.initialDelay) {
            return false;
        }

        // Check spacing every frame until tree structure is generated.
        // This prevents seeds that land simultaneously from both growing.
        if (!cell.data.treeStructure) {
            if (this.hasNearbyTreeOrSeed(x, y, grid, MIN_TREE_SPACING)) {
                // Slowly die if blocked by neighbor
                if (Math.random() < 0.002) {
                    grid.setElement(x, y, grid.registry.get('ash'));
                }
                return false;
            }

            // Pick a random tree species and generate structure with integer coords
            cell.data.species = getRandomSpecies();
            cell.data.treeStructure = this.generateFractalTree(x, y, cell.data.species);
            cell.data.growthFrameCounter = 0;
            return false;
        }

        // Slow growth modified by season
        const seasonData = grid.seasonData;
        const season = seasonData ? seasonData.season : 'summer';

        const seasonalMultipliers = {
            spring: 0.5,
            summer: 1.0,
            autumn: 2.0,
            winter: 999
        };
        const growthMultiplier = seasonalMultipliers[season] || 1.0;
        const adjustedDelay = TREE_CONFIG.growthDelay * growthMultiplier;

        cell.data.growthFrameCounter++;
        if (cell.data.growthFrameCounter < adjustedDelay) {
            return false;
        }
        cell.data.growthFrameCounter = 0;

        return this.growTreeGradually(x, y, grid, cell);
    }

    /**
     * Check for nearby trees AND other germinating seeds to enforce spacing.
     */
    hasNearbyTreeOrSeed(x, y, grid, radius) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (dx === 0 && dy === 0) continue;
                // Quick circular-ish check to avoid checking corners far away
                if (dx * dx + dy * dy > radius * radius) continue;
                const element = grid.getElement(x + dx, y + dy);
                if (!element) continue;
                if (element.name === 'tree_trunk' || element.name === 'tree_branch') {
                    return true;
                }
                // Also check for other seeds that have already committed to growing
                if (element.name === 'tree_seed') {
                    const otherCell = grid.getCell(x + dx, y + dy);
                    if (otherCell && otherCell.data.treeStructure) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    // -------------------------------------------------------
    // Tree structure generation — all coordinates are integers
    // -------------------------------------------------------

    generateFractalTree(rootX, rootY, species) {
        const sp = species;

        if (sp.branchOnlyAtTop) {
            return this.generatePalmTree(rootX, rootY, sp);
        }

        const segments = this.generateFractalTreeRecursive(
            rootX,
            rootY,
            -Math.PI / 2 + (Math.random() - 0.5) * (sp.trunkAngleVariation || 0),
            sp.initialLength(),
            TREE_CONFIG.initialThickness,
            0,
            sp.maxDepth(),
            sp
        );

        return {
            segments,
            totalSegments: segments.length,
            currentSegmentIndex: 0,
            isComplete: false,
            species: sp.name
        };
    }

    generatePalmTree(rootX, rootY, species) {
        const segments = [];
        const trunkLength = species.initialLength();
        const trunkAngle = -Math.PI / 2 + (Math.random() - 0.5) * (species.trunkAngleVariation || 0);

        // Compute endpoint and round to integer grid
        const endX = Math.round(rootX + trunkLength * Math.cos(trunkAngle));
        const endY = Math.round(rootY + trunkLength * Math.sin(trunkAngle));

        segments.push({
            x1: rootX, y1: rootY,
            x2: endX, y2: endY,
            thickness: 1,
            depth: 0,
            angle: trunkAngle,
            type: 'tree_trunk'
        });

        // Crown of fronds radiating from the integer endpoint
        const frondCount = species.crownBranchCount || 5;
        const frondLength = trunkLength * (species.lengthReduction());

        for (let i = 0; i < frondCount; i++) {
            const fraction = frondCount === 1 ? 0 : (i / (frondCount - 1)) * 2 - 1; // -1 to 1
            const frondAngle = trunkAngle + fraction * species.maxBranchAngle
                + (Math.random() - 0.5) * species.asymmetryVariation;

            const fEndX = Math.round(endX + frondLength * Math.cos(frondAngle));
            const fEndY = Math.round(endY + frondLength * Math.sin(frondAngle));

            segments.push({
                x1: endX, y1: endY,
                x2: fEndX, y2: fEndY,
                thickness: 1,
                depth: 1,
                angle: frondAngle,
                type: 'tree_branch'
            });
        }

        return {
            segments,
            totalSegments: segments.length,
            currentSegmentIndex: 0,
            isComplete: false,
            species: species.name
        };
    }

    /**
     * Recursive fractal tree generation.
     * All coordinates are rounded to integers at creation time so that
     * child segments start at exactly the same pixel where the parent ends.
     * This guarantees gap-free connectivity.
     */
    generateFractalTreeRecursive(startX, startY, angle, length, thickness, depth, maxDepth, species) {
        const segments = [];

        if (depth >= maxDepth || length < TREE_CONFIG.minLength) {
            return segments;
        }

        // Apply per-depth length scaling (for pine's conical shape)
        let adjustedLength = length;
        if (species.depthLengthScale && species.depthLengthScale[depth] !== undefined) {
            adjustedLength = length * species.depthLengthScale[depth];
        }

        // Round endpoint to integer — this is the key to gap-free growth
        const endX = Math.round(startX + adjustedLength * Math.cos(angle));
        const endY = Math.round(startY + adjustedLength * Math.sin(angle));

        // Skip degenerate zero-length segments
        if (endX === startX && endY === startY) {
            return segments;
        }

        segments.push({
            x1: startX, y1: startY,
            x2: endX, y2: endY,
            thickness: thickness,
            depth: depth,
            angle: angle,
            type: depth <= 1 ? 'tree_trunk' : 'tree_branch'
        });

        // Branching
        const branchCount = 2;
        const lengthReduction = species.lengthReduction();

        const baseAngleSpread = species.minBranchAngle +
            Math.random() * (species.maxBranchAngle - species.minBranchAngle);

        for (let i = 0; i < branchCount; i++) {
            if (Math.random() < species.branchSkipChance) {
                continue;
            }

            let branchAngle = angle + (i === 0 ? -baseAngleSpread : baseAngleSpread);
            branchAngle += (Math.random() - 0.5) * species.asymmetryVariation;

            // Children start from the parent's integer endpoint
            const childSegments = this.generateFractalTreeRecursive(
                endX, endY,
                branchAngle,
                adjustedLength * lengthReduction,
                1,
                depth + 1,
                maxDepth,
                species
            );

            segments.push(...childSegments);
        }

        return segments;
    }

    // -------------------------------------------------------
    // Gradual growth / drawing
    // -------------------------------------------------------

    growTreeGradually(x, y, grid, cell) {
        const structure = cell.data.treeStructure;
        const species = cell.data.species;

        if (!structure.isComplete) {
            for (let i = 0; i < TREE_CONFIG.segmentsPerFrame; i++) {
                if (structure.currentSegmentIndex >= structure.segments.length) {
                    structure.isComplete = true;
                    break;
                }

                const segment = structure.segments[structure.currentSegmentIndex];
                const blocked = this.drawSegment(segment, grid, species);

                // If this segment was fully blocked, mark all child segments as skipped
                if (blocked) {
                    this.skipChildSegments(structure, structure.currentSegmentIndex);
                }

                structure.currentSegmentIndex++;
            }
            return true;
        }

        // Spawn leaves when tree is complete
        if (structure.isComplete && !cell.data.leavesSpawned) {
            this.spawnFractalLeaves(structure, grid, species);
            cell.data.leavesSpawned = true;
            return true;
        }

        return false;
    }

    /**
     * Draw a single segment using Bresenham line.
     * Coordinates are already integers so no rounding needed.
     * Returns true if the segment was fully blocked.
     */
    drawSegment(segment, grid, species) {
        const points = this.bresenhamLine(segment.x1, segment.y1, segment.x2, segment.y2);

        const element = grid.registry.get(segment.type);
        const collisionBehavior = species ? species.collisionBehavior : 'stop';

        let placedCount = 0;
        let blockedCount = 0;

        for (let pi = 0; pi < points.length; pi++) {
            const { x, y } = points[pi];

            if (grid.isEmpty(x, y)) {
                grid.setElement(x, y, element);
                const cell = grid.getCell(x, y);
                if (cell && species) {
                    cell.data.speciesName = species.name;
                    cell.data.woodColor = segment.type === 'tree_trunk'
                        ? species.trunkColor : species.branchColor;
                }
                placedCount++;
            } else {
                blockedCount++;

                if (collisionBehavior === 'route_around') {
                    const perpX = Math.round(Math.cos(segment.angle + Math.PI / 2));
                    const perpY = Math.round(Math.sin(segment.angle + Math.PI / 2));

                    let routed = false;
                    for (const dir of [1, -1]) {
                        const altX = x + perpX * dir;
                        const altY = y + perpY * dir;
                        if (grid.isEmpty(altX, altY)) {
                            grid.setElement(altX, altY, element);
                            const cell = grid.getCell(altX, altY);
                            if (cell && species) {
                                cell.data.speciesName = species.name;
                                cell.data.woodColor = segment.type === 'tree_trunk'
                                    ? species.trunkColor : species.branchColor;
                            }
                            placedCount++;
                            routed = true;
                            break;
                        }
                    }

                    if (!routed) {
                        break;
                    }
                } else {
                    break;
                }
            }
        }

        return placedCount === 0 && blockedCount > 0;
    }

    /**
     * Skip all child segments that branch from a blocked parent segment.
     * Since all coordinates are integers, we use exact equality.
     */
    skipChildSegments(structure, parentIndex) {
        const parent = structure.segments[parentIndex];
        const parentEndX = parent.x2;
        const parentEndY = parent.y2;

        for (let i = parentIndex + 1; i < structure.segments.length; i++) {
            const seg = structure.segments[i];
            if (seg.x1 === parentEndX && seg.y1 === parentEndY) {
                seg.x2 = seg.x1;
                seg.y2 = seg.y1;
                this.skipChildSegments(structure, i);
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
            points.push({ x, y });
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

    spawnFractalLeaves(structure, grid, species) {
        const leafElement = grid.registry.get('leaf');
        const minLeafDepth = species ? species.minLeafDepth : TREE_CONFIG.minLeafDepth;
        const leavesPerTerminal = species ? species.leavesPerTerminal : TREE_CONFIG.leavesPerTerminal;
        const spreadRadius = (species && species.leafSpreadRadius) || 1;

        const terminalSegments = structure.segments.filter(s => s.depth >= minLeafDepth);

        for (const segment of terminalSegments) {
            // Skip zero-length segments (blocked/skipped)
            if (segment.x1 === segment.x2 && segment.y1 === segment.y2) continue;

            // Coordinates are already integers
            const x = segment.x2;
            const y = segment.y2;

            const leafCount = 2 + Math.floor(Math.random() * leavesPerTerminal);

            const positions = [];
            for (let dx = -spreadRadius; dx <= spreadRadius; dx++) {
                for (let dy = -spreadRadius; dy <= spreadRadius; dy++) {
                    if (Math.abs(dx) + Math.abs(dy) <= spreadRadius + 1) {
                        positions.push([x + dx, y + dy]);
                    }
                }
            }

            // Shuffle and place leaves
            positions.sort(() => Math.random() - 0.5);
            for (let i = 0; i < Math.min(leafCount, positions.length); i++) {
                const [lx, ly] = positions[i];
                if (grid.isEmpty(lx, ly)) {
                    grid.setElement(lx, ly, leafElement);
                    const cell = grid.getCell(lx, ly);
                    if (cell && species) {
                        cell.data.speciesName = species.name;
                        cell.data.evergreen = species.evergreenLeaves || false;
                    }
                }
            }
        }
    }
}

export default TreeSeedElement;
