# Performance Optimization Recommendations
**Priority-Ordered Action Plan**

## Quick Reference

| Optimization | Impact | Risk | Effort | Priority |
|--------------|--------|------|--------|----------|
| Cache coordinates in activeCells | 🔴 HIGH (-2-4ms) | 🟢 LOW | 1h | **P0** |
| Reuse neighbor array | 🟡 MED (-0.5-1ms) | 🟢 LOW | 15min | **P0** |
| Add element profiling | 🟢 INFO | 🟢 LOW | 30min | **P0** |
| Persistent row buckets | 🟡 MED (-0.5-1ms) | 🟡 MED | 2h | **P1** |
| Lighting cache | 🟡 MED (-0.3-0.8ms) | 🟢 LOW | 1h | **P1** |
| Skip static interactions | 🟡 MED (-0.3-0.7ms) | 🟢 LOW | 1h | **P1** |
| Optimize diagonal checks | 🟡 MED (-0.5-1ms) | 🟡 MED | 2h | **P2** |
| Inline critical behaviors | 🟡 MED (-0.5-1ms) | 🟡 MED | 3h | **P2** |

---

## P0: Immediate High-Impact Optimizations

### 1. Cache Coordinates in activeCells Map

**Problem:** `keyToCoord()` called 3000-6000 times per frame, performing expensive division/modulo operations and allocating objects.

**Solution:** Store coordinates directly in the activeCells Map.

#### Implementation

**File:** `src/PixelGrid.js`

```javascript
class PixelGrid {
    constructor(width, height, pixelSize, registry) {
        // ...
        // OLD: this.activeCells = new Map(); // Map<number, true>
        // NEW: Store coordinates directly
        this.activeCells = new Map(); // Map<number, {x: number, y: number}>
    }

    setElement(x, y, element, preserveData = false, boulderId = null) {
        // ... existing code ...

        const numericKey = this.coordToKey(x, y);

        // PERFORMANCE: Update active cells tracking with coordinates
        if (wasEmpty && !isEmpty) {
            this.particleCount++;
            this.activeCells.set(numericKey, { x, y }); // ← Store coords
        }
        if (!wasEmpty && isEmpty) {
            this.particleCount--;
            this.activeCells.delete(numericKey);
        }

        // ... rest of method ...
    }

    swap(x1, y1, x2, y2) {
        // ... existing code ...

        const pos1Key = this.coordToKey(x1, y1);
        const pos2Key = this.coordToKey(x2, y2);

        if (!cell1Empty && cell2Empty) {
            this.activeCells.delete(pos1Key);
            this.activeCells.set(pos2Key, { x: x2, y: y2 }); // ← Store coords
        } else if (cell1Empty && !cell2Empty) {
            this.activeCells.delete(pos2Key);
            this.activeCells.set(pos1Key, { x: x1, y: y1 }); // ← Store coords
        }

        // ... rest of method ...
    }

    update() {
        // Reset updated flags - NO MORE keyToCoord()!
        for (const [numericKey, coords] of this.activeCells) {
            const cell = this.grid[coords.y]?.[coords.x];
            if (cell) {
                cell.updated = false;
            }
        }

        // Group by row - NO MORE keyToCoord()!
        const cellsByRow = new Map();
        for (const [numericKey, coords] of this.activeCells) {
            const y = coords.y;
            const x = coords.x;
            if (!cellsByRow.has(y)) {
                cellsByRow.set(y, []);
            }
            cellsByRow.get(y).push(x);
        }

        // ... rest of method unchanged ...
    }
}
```

**File:** `src/main.js` (GameScene.render())

```javascript
render() {
    // ...

    // CRITICAL FIX: Use cached coordinates
    const particlesByColor = new Map();

    for (const [numericKey, coords] of this.pixelGrid.activeCells) {
        // NO MORE keyToCoord()!
        const cell = this.pixelGrid.grid[coords.y]?.[coords.x];

        if (cell && cell.element.id !== 0) {
            const baseColor = cell.data.fishColor || cell.element.color;
            const tintedColor = this.applyLighting(baseColor, lightingColor);

            if (!particlesByColor.has(tintedColor)) {
                particlesByColor.set(tintedColor, []);
            }
            particlesByColor.get(tintedColor).push(coords); // Use coords directly
        }
    }

    // Render batches
    for (const [color, particles] of particlesByColor) {
        this.graphics.fillStyle(color, 1);
        for (const coords of particles) {
            this.graphics.fillRect(
                coords.x * this.pixelSize,
                coords.y * this.pixelSize,
                this.pixelSize,
                this.pixelSize
            );
        }
    }

    // ...
}
```

**Expected Impact:**
- **Before:** ~3000-6000 keyToCoord() calls per frame
- **After:** 0 calls
- **Savings:** 2-4ms per frame
- **Memory Cost:** +8 bytes per active cell (~8-16KB with 1000-2000 cells)

---

### 2. Reuse Neighbor Array

**Problem:** `checkInteractions()` allocates a new 8-element array 500-1000 times per frame.

**Solution:** Use a static array of offsets stored in the PixelGrid class.

#### Implementation

**File:** `src/PixelGrid.js`

```javascript
class PixelGrid {
    constructor(width, height, pixelSize, registry) {
        // ...

        // OPTIMIZATION: Reusable neighbor offset array
        this.neighborOffsets = [
            [-1, -1], [0, -1], [1, -1],
            [-1,  0],          [1,  0],
            [-1,  1], [0,  1], [1,  1]
        ];
    }

    checkInteractions(x, y) {
        const element = this.getElement(x, y);
        if (!element || element.id === 0) return;

        // BEFORE:
        // const neighbors = [
        //     [x, y - 1], [x, y + 1], [x - 1, y], [x + 1, y],
        //     [x - 1, y - 1], [x + 1, y - 1], [x - 1, y + 1], [x + 1, y + 1]
        // ];
        //
        // for (const [nx, ny] of neighbors) { ... }

        // AFTER: Use offset array
        for (const [dx, dy] of this.neighborOffsets) {
            const nx = x + dx;
            const ny = y + dy;

            const neighborElement = this.getElement(nx, ny);
            if (neighborElement && neighborElement.id !== 0) {
                if (this.registry.checkInteraction(element, neighborElement, this, x, y, nx, ny)) {
                    return;
                }
            }
        }
    }
}
```

**Expected Impact:**
- **Before:** 500-1000 array allocations per frame
- **After:** 0 allocations (reuses static array)
- **Savings:** 0.5-1ms per frame

---

### 3. Add Element-Specific Profiling

**Problem:** Can't identify which specific element types are causing performance issues.

**Solution:** Instrument Element.update() to track per-element timings.

#### Implementation

**File:** `src/Element.js`

```javascript
import profiler from './Profiler.js';

class Element {
    // ... existing constructor and methods ...

    update(x, y, grid) {
        // PERFORMANCE: Profile individual element types when profiler enabled
        if (profiler.enabled) {
            profiler.start(`element:${this.name}`);
        }

        // Call the actual update logic (subclasses override this)
        const result = this.updateImpl(x, y, grid);

        if (profiler.enabled) {
            profiler.end(`element:${this.name}`);
        }

        return result;
    }

    // Subclasses override this instead of update()
    updateImpl(x, y, grid) {
        // Default: apply behaviors then movement
        if (this.applyBehaviors(x, y, grid)) {
            return true;
        }

        if (this.movement) {
            return this.movement.apply(x, y, grid);
        }

        return false;
    }
}
```

**Then update all element subclasses:**

```javascript
// OLD: class SandElement extends Element {
//     update(x, y, grid) { ... }
// }

// NEW:
class SandElement extends Element {
    updateImpl(x, y, grid) {
        // Same logic as before
        return this.movement.apply(x, y, grid);
    }
}
```

**Expected Impact:**
- **Performance:** Minimal overhead when profiler disabled
- **Benefit:** Identifies element bottlenecks in profiler panel

---

## P1: Medium-Impact Optimizations

### 4. Persistent Row Buckets

**Problem:** `update()` creates a new Map and arrays every frame to group cells by row.

**Solution:** Maintain persistent Set for each row, updated when elements are added/removed.

#### Implementation

**File:** `src/PixelGrid.js`

```javascript
class PixelGrid {
    constructor(width, height, pixelSize, registry) {
        // ...

        // OPTIMIZATION: Persistent row buckets (no per-frame allocation)
        this.rowBuckets = Array.from({ length: this.height }, () => new Set());
    }

    setElement(x, y, element, preserveData = false, boulderId = null) {
        // ... existing code ...

        const wasEmpty = cell.element.id === 0;
        const isEmpty = element.id === 0;

        // OPTIMIZATION: Update row buckets
        if (wasEmpty && !isEmpty) {
            this.rowBuckets[y].add(x);
            this.particleCount++;
            this.activeCells.set(numericKey, { x, y });
        }
        if (!wasEmpty && isEmpty) {
            this.rowBuckets[y].delete(x);
            this.particleCount--;
            this.activeCells.delete(numericKey);
        }

        // ... rest of method ...
    }

    swap(x1, y1, x2, y2) {
        // ... existing code ...

        const cell1Empty = cell1.element.id === 0;
        const cell2Empty = cell2.element.id === 0;

        // OPTIMIZATION: Update row buckets during swap
        if (!cell1Empty && cell2Empty) {
            this.rowBuckets[y1].delete(x1);
            this.rowBuckets[y2].add(x2);
            // ... activeCells update ...
        } else if (cell1Empty && !cell2Empty) {
            this.rowBuckets[y2].delete(x2);
            this.rowBuckets[y1].add(x1);
            // ... activeCells update ...
        }

        // ... rest of method ...
    }

    update() {
        this.frameCount++;

        // Reset updated flags (unchanged)
        for (const [numericKey, coords] of this.activeCells) {
            const cell = this.grid[coords.y]?.[coords.x];
            if (cell) {
                cell.updated = false;
            }
        }

        // OPTIMIZATION: No more grouping! Use persistent rowBuckets
        // BEFORE:
        // const cellsByRow = new Map();
        // for (const [numericKey, coords] of this.activeCells) {
        //     const y = coords.y;
        //     const x = coords.x;
        //     if (!cellsByRow.has(y)) {
        //         cellsByRow.set(y, []);
        //     }
        //     cellsByRow.get(y).push(x);
        // }

        // AFTER: Iterate bottom to top
        for (let y = this.height - 1; y >= 0; y--) {
            if (this.rowBuckets[y].size === 0) continue; // Skip empty rows

            // Convert Set to Array for randomization
            const xPositions = Array.from(this.rowBuckets[y]);

            // Randomize scan direction
            const startLeft = Math.random() > 0.5;
            if (startLeft) {
                xPositions.sort((a, b) => a - b);
            } else {
                xPositions.sort((a, b) => b - a);
            }

            for (const x of xPositions) {
                const cell = this.grid[y][x];

                if (cell.updated || cell.element.id === 0) continue;

                // Handle lifetime
                if (cell.lifetime > 0) {
                    cell.lifetime--;
                    if (cell.lifetime === 0) {
                        this.setElement(x, y, this.registry.get('empty'));
                        continue;
                    }
                }

                // Let the element update itself
                cell.element.update(x, y, this);

                // Check interactions every 2 frames
                if (this.frameCount % 2 === 0) {
                    this.checkInteractions(x, y);
                }
            }
        }
    }
}
```

**Expected Impact:**
- **Before:** 1 Map allocation + 10-20 array allocations per frame
- **After:** 1 Array.from() + sorting per frame
- **Savings:** 0.5-1ms per frame
- **Memory Cost:** ~150 Sets (~12KB overhead)

---

### 5. Pre-Calculate Lighting Cache

**Problem:** `applyLighting()` performs bit shifting and multiplication for every active cell during rendering.

**Solution:** Cache lighting calculations per color × time-of-day combination.

#### Implementation

**File:** `src/main.js`

```javascript
class GameScene extends Phaser.Scene {
    create() {
        // ...

        // OPTIMIZATION: Lighting cache
        this.lightingCache = new Map(); // (baseColor << 8 | lightingHash) => tintedColor
        this.lastLightingTime = -1;
    }

    applyLighting(color, lighting) {
        // Create simple hash for lighting (4-bit precision per channel)
        const lightingHash =
            (Math.floor(lighting.r * 15) << 8) |
            (Math.floor(lighting.g * 15) << 4) |
             Math.floor(lighting.b * 15);

        const cacheKey = (color << 12) | lightingHash;

        // Check cache
        if (this.lightingCache.has(cacheKey)) {
            return this.lightingCache.get(cacheKey);
        }

        // Calculate (original logic)
        const r = ((color >> 16) & 0xFF) * lighting.r;
        const g = ((color >> 8) & 0xFF) * lighting.g;
        const b = (color & 0xFF) * lighting.b;
        const result = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);

        // Store in cache
        this.lightingCache.set(cacheKey, result);

        // Limit cache size (clear old entries when time changes significantly)
        if (this.lightingCache.size > 1000) {
            this.lightingCache.clear();
        }

        return result;
    }

    render() {
        // Clear cache when time-of-day changes significantly
        const timeSegment = Math.floor(this.dayNightCycle.time * 100);
        if (timeSegment !== this.lastLightingTime) {
            this.lightingCache.clear();
            this.lastLightingTime = timeSegment;
        }

        // ... rest of render ...
    }
}
```

**Expected Impact:**
- **Before:** 1000-2000 lighting calculations per frame
- **After:** ~50-200 calculations per frame (only cache misses)
- **Savings:** 0.3-0.8ms per frame

---

### 6. Skip Interactions for Static Elements

**Problem:** Walls, glass, obsidian, etc. never interact but still get checked every frame.

**Solution:** Add `canInteract` flag to skip interaction checking for static elements.

#### Implementation

**File:** `src/ElementProperties.js`

```javascript
export const ELEMENT_PROPERTIES = {
    // ... existing properties ...
    canInteract: true, // Default: check interactions
};
```

**File:** Static element classes (WallElement, ObsidianElement, GlassElement, etc.)

```javascript
class WallElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.WALL, 'wall', 0x404040, {
            density: 100,
            state: STATE.SOLID,
            movable: false,
            tags: [],
            brushSize: 3,
            emissionDensity: 0.8,
            canInteract: false // ← Never check interactions
        });
    }
}
```

**File:** `src/PixelGrid.js`

```javascript
update() {
    // ...

    for (const x of xPositions) {
        const cell = this.grid[y][x];

        if (cell.updated || cell.element.id === 0) continue;

        // Update element
        cell.element.update(x, y, this);

        // OPTIMIZATION: Skip interactions for static elements
        if (this.frameCount % 2 === 0 && cell.element.canInteract !== false) {
            this.checkInteractions(x, y);
        }
    }
}
```

**Expected Impact:**
- **Savings:** 0.3-0.7ms per frame (depends on percentage of static elements)
- **Risk:** Low

---

## P2: Advanced Optimizations

### 7. Conditional Diagonal Interaction Checks

**Problem:** Most interactions only care about cardinal neighbors, but we check all 8 neighbors.

**Solution:** Make diagonal checks optional per element type.

#### Implementation

**File:** `src/PixelGrid.js`

```javascript
constructor() {
    // ...

    // Separate cardinal and diagonal offsets
    this.cardinalOffsets = [
        [0, -1], [0, 1], [-1, 0], [1, 0]
    ];

    this.diagonalOffsets = [
        [-1, -1], [1, -1], [-1, 1], [1, 1]
    ];
}

checkInteractions(x, y) {
    const element = this.getElement(x, y);
    if (!element || element.id === 0) return;

    // Always check cardinal neighbors
    for (const [dx, dy] of this.cardinalOffsets) {
        const nx = x + dx;
        const ny = y + dy;
        const neighborElement = this.getElement(nx, ny);

        if (neighborElement && neighborElement.id !== 0) {
            if (this.registry.checkInteraction(element, neighborElement, this, x, y, nx, ny)) {
                return;
            }
        }
    }

    // Conditionally check diagonals
    if (element.checkDiagonalInteractions !== false) {
        for (const [dx, dy] of this.diagonalOffsets) {
            const nx = x + dx;
            const ny = y + dy;
            const neighborElement = this.getElement(nx, ny);

            if (neighborElement && neighborElement.id !== 0) {
                if (this.registry.checkInteraction(element, neighborElement, this, x, y, nx, ny)) {
                    return;
                }
            }
        }
    }
}
```

**Most elements can skip diagonals:**

```javascript
class SandElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.SAND, 'sand', 0xc2b280, {
            // ...
            checkDiagonalInteractions: false // Only cardinal needed
        });
    }
}
```

**Expected Impact:**
- **Savings:** 0.5-1ms per frame (if 70%+ of elements skip diagonals)
- **Risk:** Medium (may need tuning for specific elements)

---

### 8. Inline Critical Behaviors

**Problem:** Behavior composition adds function call overhead and iterator loops.

**Solution:** For very hot elements (sand, water), inline the most common behavior.

#### Implementation

**Example: Sand with inlined gravity**

**File:** `src/elements/SandElement.js`

```javascript
class SandElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.SAND, 'sand', 0xc2b280, {
            density: 3,
            state: STATE.POWDER,
            dispersion: 1,
            tags: [],
            brushSize: 5,
            emissionDensity: 1.0
        });

        // No behaviors - inline for performance
    }

    updateImpl(x, y, grid) {
        // INLINED GRAVITY BEHAVIOR (from GravityBehavior)
        // Fall straight down
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        // Slide diagonally (85% stability)
        if (Math.random() > 0.85) {
            const dir = Math.random() > 0.5 ? -1 : 1;
            if (grid.canMoveTo(x, y, x + dir, y + 1)) {
                grid.swap(x, y, x + dir, y + 1);
                return true;
            }
            // Try other direction
            if (grid.canMoveTo(x, y, x - dir, y + 1)) {
                grid.swap(x, y, x - dir, y + 1);
                return true;
            }
        }

        return false;
    }
}
```

**Expected Impact:**
- **Savings:** 0.5-1ms per frame (for very common elements like sand/stone)
- **Risk:** Medium (duplicates behavior logic, harder to maintain)
- **Recommendation:** Only inline for top 2-3 most common elements

---

## Testing Checklist

After each optimization, validate:

1. ✅ Profiler shows improvement in target metric
2. ✅ Visual behavior unchanged (no regressions)
3. ✅ FPS stable at 60 with 1000+ particles
4. ✅ Memory usage stable (no leaks)
5. ✅ All element types still work correctly

**Profiler validation command:**
Press `P` to toggle profiler panel and verify metrics.

---

## Expected Cumulative Impact

| Phase | Optimizations | Frame Time Reduction | New Capacity |
|-------|---------------|----------------------|--------------|
| **Baseline** | None | 0ms | 1000 particles @ 60 FPS |
| **P0 (Quick Wins)** | 1-3 | -3 to -5ms | 1300-1500 particles |
| **P1 (Medium)** | 4-6 | -5 to -8ms | 1600-1800 particles |
| **P2 (Advanced)** | 7-8 | -6 to -10ms | 1800-2200 particles |

**Conservative estimate:** 50-100% increase in particle capacity while maintaining 60 FPS.
