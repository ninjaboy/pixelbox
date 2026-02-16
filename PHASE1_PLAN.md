# PHASE 1 IMPLEMENTATION PLAN: Temperature, Reactions & New Elements

**Version:** 5.0.0 | **Estimated Effort:** 2-3 weeks | **Status:** DRAFT

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [A. Temperature System](#2-temperature-system)
3. [B. Reaction Engine](#3-reaction-engine)
4. [C. Element Categories & UI](#4-element-categories--ui)
5. [D. Chemical Elements & Reactions](#5-chemical-elements--reactions)
6. [Implementation Order](#6-implementation-order)
7. [File Inventory](#7-file-inventory)
8. [Migration Guide](#8-migration-guide)

---

## 1. Architecture Overview

### Design Principles

1. **All elements are code classes/modules** — no JSON data files. Simple elements have minimal classes. Complex ones have full behavior code.
2. **Electricity is Phase 2** — Phase 1 focuses on temperature and chemistry.
3. **Existing behavior system stays** — the reaction engine integrates WITH it, not replaces it.
4. **Tag-based InteractionManager stays** — reactions add specific element-pair rules ON TOP of broad tag interactions.

### Architecture After Phase 1

```
Per-Active-Cell Update Loop (PixelGrid.update):
  1. Element behaviors (existing: gravity, liquid flow, gas rise, combustion, etc.)
  2. Tag-based interactions (existing: InteractionManager, every 2 frames)
  3. Element-specific reactions (NEW: ReactionEngine, checked during interaction phase)
  4. Temperature diffusion (NEW: TemperatureSystem, every N frames near sources)
  5. State transitions (NEW: temp thresholds trigger element transforms)
```

### New Files Overview

```
src/
  TemperatureSystem.js          # NEW: Per-cell temp, diffusion, state transitions
  ReactionEngine.js             # NEW: Declarative element-pair reaction processor
  ElementCategories.js          # NEW: Category definitions for UI grouping
  elements/
    (existing 44 element classes stay, gain temp/reaction properties)
    DirtElement.js              # NEW
    MudElement.js               # NEW
    ClayElement.js              # NEW
    SaltElement.js              # NEW (ID 26 already reserved!)
    RustElement.js              # NEW
    CharcoalElement.js          # NEW
    HydrogenElement.js          # NEW
    OxygenElement.js            # NEW
    NitrogenElement.js          # NEW
    CopperElement.js            # NEW
    IronElement.js              # NEW
    GoldElement.js              # NEW
    MoltenIronElement.js        # NEW (hidden — discovered via heating iron)
    MoltenGoldElement.js        # NEW (hidden — discovered via heating gold)
    MoltenCopperElement.js      # NEW (hidden — discovered via heating copper)
    SugarElement.js             # NEW
    CaramelElement.js           # NEW (hidden — discovered via heating sugar)
    SteelElement.js             # NEW (hidden — iron + coal + heat)
    SaltWaterElement.js         # NEW (hidden — salt dissolves in water)
    MetalElement.js             # NEW (generic structural metal)
```

---

## 2. Temperature System

### 2.1 Core Design: Hybrid Per-Cell Temperature

Every cell already has a `CellState` object with `getTemperature()`/`setTemperature()` methods (see `CellState.js:82-104`). The infrastructure is already partially there. We upgrade it to a real system.

**Temperature unit:** Celsius (integer, range -273 to 10000)
**Default cell temperature:** Derived from seasonal ambient (maps existing `-1..+1` to `~-10..+35°C`)

#### Cell Temperature Storage

Temperature lives on `cell.state` (the existing `CellState` object), NOT on the element class. The element class defines default/intrinsic temperature and thresholds.

```javascript
// Element class property (intrinsic - what temp does a NEW cell of this type start at?)
class FireElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.FIRE, 'fire', 0xff6600, {
            ...existing properties,
            temp: 600,           // NEW: Default temperature when placed (°C)
            tempHigh: null,      // Fire doesn't transition higher
            stateHigh: null,
            tempLow: 100,        // Below 100°C fire goes out
            stateLow: 'smoke',   // Becomes smoke when cooled
            heatOutput: 200,     // NEW: Heat radiated to neighbors per tick
            insulate: false,     // NEW: Does this block heat transfer?
        });
    }
}

// Cell-level temperature (per-instance - varies over time)
cell.state.getTemperature()  // Current temp of THIS specific cell
cell.state.setTemperature(v) // Set temp of THIS specific cell
```

### 2.2 TemperatureSystem.js — New Module

```javascript
// src/TemperatureSystem.js
class TemperatureSystem {
    constructor(grid) {
        this.grid = grid;
        this.diffusionRate = 0.1;        // Heat transfer coefficient
        this.ambientTemp = 20;           // Updated from seasonal system
        this.updateInterval = 3;         // Diffuse every N frames (perf tuning)
        this.activeRadius = 8;           // Only diffuse within N cells of heat/cold sources
        this.heatSources = new Set();    // Track positions of heat/cold sources (numeric keys)
    }

    // Called once per frame from PixelGrid.update()
    update(frameCount) {
        if (frameCount % this.updateInterval !== 0) return;
        this.diffuseTemperatures();
        this.checkStateTransitions();
    }

    // Update ambient from seasonal system
    setSeasonalAmbient(seasonData) {
        // Map existing -1..+1 temperature to Celsius
        // winter=-1 → -10°C, summer=+1 → 35°C
        this.ambientTemp = 12.5 + (seasonData.temperature * 22.5);
    }

    diffuseTemperatures() { ... }       // See 2.3
    checkStateTransitions() { ... }     // See 2.4
    registerHeatSource(x, y) { ... }    // Called when heat/cold elements placed
    unregisterHeatSource(x, y) { ... }  // Called when heat/cold elements removed
}
```

### 2.3 Temperature Diffusion — Hybrid Approach

**Key insight for mobile performance:** Only diffuse near heat/cold sources. The rest of the world sits at ambient.

**Algorithm:**

1. Maintain a `Set<numericKey>` of active heat/cold source positions (fire, lava, ice, etc.)
2. Each frame (every `updateInterval` frames), for each source:
   - BFS outward up to `activeRadius` cells
   - For each cell in range, apply diffusion from its 4 cardinal neighbors
3. Empty cells trend toward ambient temperature (slow decay)
4. Cells outside any source's radius stay at ambient (no computation)

```javascript
diffuseTemperatures() {
    // Build set of cells to process (within radius of any heat/cold source)
    const cellsToProcess = new Set();

    for (const sourceKey of this.heatSources) {
        const sx = sourceKey % this.grid.width;
        const sy = Math.floor(sourceKey / this.grid.width);

        // BFS/flood within activeRadius
        for (let dy = -this.activeRadius; dy <= this.activeRadius; dy++) {
            for (let dx = -this.activeRadius; dx <= this.activeRadius; dx++) {
                const nx = sx + dx;
                const ny = sy + dy;
                if (this.grid.isInBounds(nx, ny)) {
                    cellsToProcess.add(this.grid.coordToKey(nx, ny));
                }
            }
        }
    }

    // Apply diffusion only to cells in the active set
    for (const key of cellsToProcess) {
        const x = key % this.grid.width;
        const y = Math.floor(key / this.grid.width);
        const cell = this.grid.grid[y]?.[x];
        if (!cell || cell.element.id === 0) continue;

        // Skip insulating elements
        if (cell.element.insulate) continue;

        const currentTemp = cell.state.getTemperature();

        // Gather neighbor temperatures
        let neighborSum = 0;
        let neighborCount = 0;
        const offsets = [[0,-1],[0,1],[-1,0],[1,0]];

        for (const [dx, dy] of offsets) {
            const nx = x + dx;
            const ny = y + dy;
            const neighbor = this.grid.getCell(nx, ny);
            if (neighbor && !neighbor.element.insulate) {
                neighborSum += neighbor.state.getTemperature();
                neighborCount++;
            }
        }

        if (neighborCount === 0) continue;

        const avgNeighbor = neighborSum / neighborCount;
        const newTemp = currentTemp + this.diffusionRate * (avgNeighbor - currentTemp);

        // Empty-cell ambient decay (empty cells trend back to ambient)
        // For non-empty cells, this happens much slower
        const ambientDecay = cell.element.id === 0 ? 0.05 : 0.002;
        const finalTemp = newTemp + ambientDecay * (this.ambientTemp - newTemp);

        cell.state.setTemperature(Math.round(finalTemp));
    }
}
```

**Performance estimate:** With 5 heat sources and radius 8, that's `~5 × (16×16) = 1280 cells` to process — very manageable even at 60 FPS on mobile. The full grid might be `200×150 = 30,000` cells, so we're processing ~4% of the grid.

### 2.4 State Transitions

Checked after diffusion for cells whose temperature crossed a threshold:

```javascript
checkStateTransitions() {
    // Only check cells we just diffused (already in cellsToProcess from above)
    // In practice, merge this into the diffusion loop for efficiency

    for (const key of cellsToProcess) {
        const x = key % this.grid.width;
        const y = Math.floor(key / this.grid.width);
        const cell = this.grid.grid[y]?.[x];
        if (!cell || cell.element.id === 0) continue;

        const temp = cell.state.getTemperature();
        const element = cell.element;

        // Check high threshold (heating)
        if (element.tempHigh != null && temp >= element.tempHigh && element.stateHigh) {
            const newElement = this.grid.registry.get(element.stateHigh);
            if (newElement) {
                this.grid.setElement(x, y, newElement);
                // Preserve temperature through transition
                const newCell = this.grid.getCell(x, y);
                if (newCell) newCell.state.setTemperature(temp);
            }
        }

        // Check low threshold (cooling)
        if (element.tempLow != null && temp <= element.tempLow && element.stateLow) {
            const newElement = this.grid.registry.get(element.stateLow);
            if (newElement) {
                this.grid.setElement(x, y, newElement);
                const newCell = this.grid.getCell(x, y);
                if (newCell) newCell.state.setTemperature(temp);
            }
        }
    }
}
```

### 2.5 Heat Source/Sink Registration

When elements with `heatOutput != 0` are placed or removed, the TemperatureSystem must be notified. **Integration point: `PixelGrid.setElement()`**.

```javascript
// In PixelGrid.setElement(), after setting cell.element:
if (this.temperatureSystem) {
    // Unregister old element as heat source
    if (oldElement.heatOutput) {
        this.temperatureSystem.unregisterHeatSource(x, y);
    }
    // Register new element as heat source
    if (element.heatOutput) {
        this.temperatureSystem.registerHeatSource(x, y);
    }
    // Initialize new cell temperature from element default
    if (!preserveData && element.temp != null) {
        cell.state.setTemperature(element.temp);
    }
}
```

### 2.6 Temperature Visualization (Color Tinting)

Add temperature-based color tinting in `GameScene.render()`. The existing render loop iterates active cells and calls `this.applyLighting(baseColor, lightingColor)`. We add a temperature tint step:

```javascript
// In GameScene.render(), after computing baseColor:
if (this.thermalViewEnabled) {
    // Full thermal view: override color entirely
    finalColor = this.tempToColor(cell.state.getTemperature());
} else {
    // Subtle tinting: blend hot=red, cold=blue into base color
    const temp = cell.state.getTemperature();
    if (temp > 100) {
        // Hot tint: blend toward red/orange proportional to heat
        const intensity = Math.min((temp - 100) / 900, 1.0); // 0..1 over 100..1000°C
        finalColor = this.blendColor(baseColor, 0xff4400, intensity * 0.3);
    } else if (temp < -10) {
        // Cold tint: blend toward blue
        const intensity = Math.min((-10 - temp) / 90, 1.0); // 0..1 over -10..-100°C
        finalColor = this.blendColor(baseColor, 0x4488ff, intensity * 0.3);
    }
}
```

**Thermal view toggle:** Add to existing keyboard shortcut system (`T` key) and settings panel.

### 2.7 Temperature Properties for Existing Elements

| Element | temp (°C) | tempHigh | stateHigh | tempLow | stateLow | heatOutput | insulate |
|---------|-----------|----------|-----------|---------|----------|------------|----------|
| fire | 600 | — | — | 100 | smoke | +200 | false |
| lava | 1200 | — | — | 500 | stone | +400 | false |
| steam_vent | 300 | — | — | — | — | +100 | false |
| water | 20 | 100 | steam | 0 | ice | 0 | false |
| ice | -20 | 0 | water | — | — | -100 | false |
| snow | -5 | 2 | water | — | — | -50 | false |
| slush | -2 | 5 | water | -10 | ice | -30 | false |
| steam | 100 | — | — | 80 | water | 0 | false |
| oil | 20 | 280 | fire | -40 | — | 0 | false |
| sand | 20 | 1700 | glass | — | — | 0 | false |
| glass | 20 | 1500 | lava | — | — | 0 | false |
| stone | 20 | 1500 | lava | — | — | 0 | false |
| wood | 20 | 300 | fire | — | — | 0 | false |
| coal | 20 | 400 | burning_coal | — | — | 0 | false |
| obsidian | 20 | 2000 | lava | — | — | 0 | true |
| wall | 20 | — | — | — | — | 0 | true |

### 2.8 Integration with Existing Behavior System

The existing `HeatTransformationBehavior` and `ColdTransformationBehavior` in `TransformationBehaviors.js` check for adjacent TAG.HEAT_SOURCE/TAG.FREEZING tags. These **remain as-is** for the immediate proximity effect (ice melts when touching lava). The temperature system adds a second layer: gradual heating at a distance through diffusion.

**Migration path:** Over time, some of these tag-based behaviors can be replaced by temperature thresholds, but that's not required in Phase 1. Both systems coexist: the tag-based behaviors fire immediately on contact, the temperature system handles gradual heat transfer.

### 2.9 Integration with Chunk/Active Cell System

The TemperatureSystem operates on the **same activeCells map** as the rest of the simulation. It doesn't need its own spatial structure. The `heatSources` Set is a lightweight addition (~20-50 entries max in typical play).

**Key performance consideration:** Temperature diffusion runs every `updateInterval` frames (default 3), NOT every frame. State transition checks piggyback on the same pass. Total overhead: ~0.5ms per diffusion tick on mobile (1280 cells × simple arithmetic).

---

## 3. Reaction Engine

### 3.1 Core Design: Reactions as Element Class Properties

Following the owner's constraint: **NO separate JSON/data files.** Reactions are declared as a property on each element class, just like `tags`, `density`, `burnsInto`, etc.

```javascript
// Example: SugarElement.js
class SugarElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.SUGAR, 'sugar', 0xffffff, {
            density: 3,
            state: STATE.POWDER,
            tags: [TAG.ORGANIC, TAG.COMBUSTIBLE],
            temp: 20,
            tempHigh: 186,
            stateHigh: 'caramel',
            // NEW: Declarative reactions
            reactions: {
                water:  { elem1: null, elem2: 'salt_water', chance: 0.1 },
                acid:   { elem1: 'carbon', elem2: 'steam', chance: 0.3 },
            }
        });
    }
    // No updateImpl needed — behaviors + reactions handle everything
}
```

**Reaction format per entry:**

```javascript
reactions: {
    'target_element_name': {
        elem1: string|null,   // What THIS element becomes (null = disappears)
        elem2: string|null,   // What TARGET element becomes (null = disappears)
        chance: number,       // 0..1, probability per check (default 1.0)
        tempMin: number,      // Minimum temperature required (optional)
        tempMax: number,      // Maximum temperature required (optional)
        func: Function,       // Custom JS function for complex logic (optional)
    }
}
```

### 3.2 ReactionEngine.js — New Module

```javascript
// src/ReactionEngine.js
class ReactionEngine {
    constructor(registry) {
        this.registry = registry;
        this.reactionLookup = new Map(); // "source:target" → reaction definition
    }

    // Build the lookup table from all registered elements
    // Called once after all elements are registered in init.js
    buildLookup() {
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

    // Check if two adjacent cells should react
    // Called from InteractionManager.checkInteraction() AFTER tag-based rules
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
            grid.setElement(sx, sy, this.registry.get(reaction.elem1));
        }
        // else: elem1 undefined = no change to source

        // Transform target element
        if (reaction.elem2 === null) {
            grid.setElement(tx, ty, this.registry.get('empty'));
        } else if (reaction.elem2) {
            grid.setElement(tx, ty, this.registry.get(reaction.elem2));
        }
    }
}

export default ReactionEngine;
```

### 3.3 Integration with InteractionManager

The reaction engine plugs into the **existing** `InteractionManager.checkInteraction()` as a fallback after tag-based rules. This means:

- Tag interactions (COMBUSTIBLE + HEAT_SOURCE, etc.) fire first with their existing priority system
- If no tag interaction matched, the ReactionEngine checks for element-pair reactions
- This preserves all existing behavior unchanged

**Changes to `InteractionManager.js`:**

```javascript
class InteractionManager {
    constructor() {
        this.interactions = [];
        this.reactionEngine = null; // NEW: Set after init
        this.registerDefaultInteractions();
    }

    setReactionEngine(engine) {    // NEW
        this.reactionEngine = engine;
    }

    checkInteraction(element1, element2, grid, x1, y1, x2, y2, registry) {
        // ... existing early exits (empty, no tags) ...

        // ... existing custom onInteract checks ...

        // ... existing tag-based interaction loop ...
        for (const interaction of this.interactions) {
            if (interaction.check(element1, element2)) {
                if (interaction.apply(element1, element2, grid, x1, y1, x2, y2, registry)) {
                    return true;
                }
            }
        }

        // NEW: Fall through to reaction engine if no tag interaction matched
        if (this.reactionEngine) {
            return this.reactionEngine.checkReaction(element1, element2, grid, x1, y1, x2, y2);
        }

        return false;
    }
}
```

**Changes to `ElementRegistry.js`:**

```javascript
class ElementRegistry {
    constructor() {
        this.elements = new Map();
        this.interactionManager = new InteractionManager();
        this.reactionEngine = null; // NEW
    }

    // NEW: Called after all elements registered
    initReactionEngine() {
        const ReactionEngine = (await import('./ReactionEngine.js')).default;
        this.reactionEngine = new ReactionEngine(this);
        this.reactionEngine.buildLookup();
        this.interactionManager.setReactionEngine(this.reactionEngine);
    }
}
```

**Changes to `init.js`:**

```javascript
// At end of init.js, after all registry.register() calls:
registry.initReactionEngine();
```

### 3.4 Reactions vs Existing Tag Interactions — Overlap Resolution

Some existing tag interactions overlap with what reactions could express. **In Phase 1, we do NOT migrate existing tag interactions to reactions.** They stay exactly as-is. Reactions are ONLY used for NEW element pairs.

Example of how they coexist:
- **Tag interaction (existing):** Water (SOLIDIFIES_LAVA) + Lava → Obsidian + Steam (priority 0)
- **Reaction (new):** Sugar + Water → null + Sugar_Water (checked only if no tag interaction fired)

No conflicts possible because reactions are a fallback after tags.

### 3.5 Adding `reactions` to Element Base Class

In `Element.js`, store the reactions property:

```javascript
class Element {
    constructor(id, name, color, properties = {}) {
        // ... existing properties ...

        // NEW: Declarative reactions (element-pair interactions)
        this.reactions = properties.reactions || null;

        // NEW: Temperature properties
        this.temp = properties.temp ?? null;           // Default temperature (°C)
        this.tempHigh = properties.tempHigh ?? null;   // High transition threshold
        this.stateHigh = properties.stateHigh ?? null; // Element to become when heated
        this.tempLow = properties.tempLow ?? null;     // Low transition threshold
        this.stateLow = properties.stateLow ?? null;   // Element to become when cooled
        this.heatOutput = properties.heatOutput ?? 0;  // Heat radiated to neighbors
        this.insulate = properties.insulate ?? false;   // Blocks heat transfer
    }
}
```

---

## 4. Element Categories & UI

### 4.1 Category System

Define categories as a single module. Each element class specifies its category as a string property.

```javascript
// src/ElementCategories.js
export const CATEGORIES = [
    { id: 'solids',    name: 'Solids',    icon: '🧱', order: 0 },
    { id: 'powders',   name: 'Powders',   icon: '⏳', order: 1 },
    { id: 'liquids',   name: 'Liquids',   icon: '💧', order: 2 },
    { id: 'gases',     name: 'Gases',     icon: '💨', order: 3 },
    { id: 'energy',    name: 'Energy',    icon: '🔥', order: 4 },
    { id: 'metals',    name: 'Metals',    icon: '⚙️', order: 5 },
    { id: 'chemistry', name: 'Chemistry', icon: '⚗️', order: 6 },
    { id: 'life',      name: 'Life',      icon: '🌿', order: 7 },
    { id: 'tools',     name: 'Tools',     icon: '🔧', order: 8 },
];

// Default category for existing elements (assigned by name lookup)
export const ELEMENT_CATEGORY_MAP = {
    // Solids
    stone: 'solids', wood: 'solids', glass: 'solids', wall: 'solids',
    obsidian: 'solids', ice: 'solids',

    // Powders
    sand: 'powders', snow: 'powders', gunpowder: 'powders', ash: 'powders',
    coal: 'powders', salt: 'powders', sugar: 'powders',

    // Liquids
    water: 'liquids', oil: 'liquids', lava: 'liquids', acid: 'liquids',
    slush: 'liquids',

    // Gases
    steam: 'gases', smoke: 'gases', steam_vent: 'gases',

    // Energy
    fire: 'energy',

    // Metals
    iron: 'metals', copper: 'metals', gold: 'metals', steel: 'metals',
    metal: 'metals',

    // Chemistry
    hydrogen: 'chemistry', oxygen: 'chemistry', nitrogen: 'chemistry',
    rust: 'chemistry', salt_water: 'chemistry', caramel: 'chemistry',

    // Life
    tree_seed: 'life', vine: 'life', fish: 'life', bird: 'life',
    coral: 'life', grass_seed: 'life', house_seed: 'life',

    // Tools
    eraser: 'tools',
};
```

**On Element classes:** Add `category` property.

```javascript
class WaterElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.WATER, 'water', 0x0099ff, {
            ...existing,
            category: 'liquids',  // NEW
        });
    }
}
```

For elements that don't specify `category`, fall back to `ELEMENT_CATEGORY_MAP`. For anything unmapped, default to `'solids'`.

### 4.2 UI Redesign: Tabbed Category Picker

Replace the current flat horizontal toolbar with a **two-tier layout**:

```
┌────────────────────────────────────────────────┐
│ [🧱] [⏳] [💧] [💨] [🔥] [⚙️] [⚗️] [🌿] [🔧] │  ← Category tabs (fixed)
├────────────────────────────────────────────────┤
│ 🪨Stone  🪵Wood  🧊Ice  🔲Wall  🪟Glass  ...  │  ← Element buttons (scrollable)
└────────────────────────────────────────────────┘
```

**Implementation approach:** Stay DOM-based (current approach works well for touch). Modify `GameScene.setupElementSelector()`:

1. **Category tab bar** — A horizontal row of category icon buttons, always visible. Tapping a tab filters the element row below.
2. **Element row** — Horizontal scrollable container showing only elements from the selected category. Same button style as current (emoji + color background).
3. **Active category** — Highlighted with a bottom border or background tint.
4. **Remember last category** — Store selected category in localStorage.

**Touch behavior:**
- Swipe left/right on element row to scroll within category
- Tap category tab to switch categories
- Swipe left/right on category bar to scroll if too many categories (mobile portrait)

**CSS structure:**

```css
#element-selector {
    position: fixed;
    bottom: 0;
    width: 100%;
    z-index: 10000;
    display: flex;
    flex-direction: column;
}

#category-tabs {
    display: flex;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    gap: 2px;
    padding: 4px;
    background: rgba(0, 0, 0, 0.8);
    border-top: 1px solid rgba(0, 255, 255, 0.3);
}

.category-tab {
    min-width: 40px;
    height: 36px;
    border-radius: 6px 6px 0 0;
    font-size: 18px;
    /* pixel-art aesthetic */
    image-rendering: pixelated;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(30, 30, 30, 0.9);
}

.category-tab.active {
    background: rgba(0, 255, 255, 0.15);
    border-bottom: 2px solid #00ffff;
}

#element-row {
    display: flex;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    gap: 4px;
    padding: 6px;
    background: rgba(0, 0, 0, 0.85);
}
```

**Effort estimate:** ~1 day. This is mostly restructuring existing DOM creation code in `setupElementSelector()`.

### 4.3 Hidden/Discoverable Elements

Elements with `hidden: true` are not shown in the picker until discovered. Discovery happens when a reaction creates a hidden element for the first time.

```javascript
class CaramelElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.CARAMEL, 'caramel', 0xc87533, {
            ...properties,
            hidden: true,  // Not shown in picker until discovered
            category: 'chemistry',
        });
    }
}
```

**Discovery tracking:** Store discovered elements in `@capacitor/preferences` (same as current save system):

```javascript
// In PixelGrid.setElement(), when placing a hidden element:
if (element.hidden && !this.discoveredElements.has(element.name)) {
    this.discoveredElements.add(element.name);
    this.onElementDiscovered?.(element); // Callback to UI for notification
    // Persist to preferences
}
```

**Discovery notification:** Brief toast notification (CSS animation, 2s fade) showing the element name and icon. "New substance discovered: Caramel!"

### 4.4 Element Count Targets for Phase 1

| Category | Existing | New (Phase 1) | Total |
|----------|----------|---------------|-------|
| Solids | 6 | 2 (dirt, clay) | 8 |
| Powders | 6 | 4 (salt*, sugar, charcoal, rust) | 10 |
| Liquids | 5 | 2 (salt_water, mud) | 7 |
| Gases | 3 | 3 (hydrogen, oxygen, nitrogen) | 6 |
| Energy | 1 | 0 | 1 |
| Metals | 0 | 5 (iron, copper, gold, metal, steel) | 5 |
| Chemistry | 0 | 3 (molten_iron, molten_gold, molten_copper) | 3 |
| Life | 12 | 0 | 12 |
| Tools | 1 | 0 | 1 |
| **Hidden/Byproducts** | 10 | 3 (caramel, steel, salt_water) | 13 |
| **TOTAL** | **44** | **~19** | **~63** |

*Salt already has ID 26 reserved but no class file — needs to be created.

### 4.5 Which New Elements First (Wow-Factor Priority)

**Tier 1 — High wow-factor, simple to implement:**

1. **Iron** — Solid metal. Rusts when wet (iron + water → rust, slow). Melts at 1538°C → molten_iron. Foundation for chemistry.
2. **Gold** — Solid metal. Doesn't rust (noble metal). Melts at 1064°C → molten_gold. Shiny color variation. Players love gold.
3. **Copper** — Solid metal. Turns green over time (patina = oxidation). Melts at 1085°C → molten_copper.
4. **Hydrogen** — Flammable gas. Rises fast. H2 + fire → explosion + water! The "wow" demo reaction.
5. **Sugar** — Powder. Dissolves in water. Caramelizes at 186°C. Fun to play with.

**Tier 2 — Good content, moderate effort:**

6. **Dirt** — Powder. Mud when wet. Foundation for nature.
7. **Mud** — Liquid/viscous. Dries into clay. Dirt + water → mud.
8. **Clay** — Solid. Mud that dried. Can be fired into brick (future).
9. **Charcoal** — Powder. Burns hot. Wood burned at low oxygen → charcoal.
10. **Rust** — Powder. Iron + water + time → rust. Visual decay.

**Tier 3 — Chemistry depth:**

11. **Oxygen** — Gas. Feeds fire (oxidizer). O2 + H2 + spark → water!
12. **Nitrogen** — Inert gas. Doesn't react with much. Smothers fire (displaces oxygen).
13. **Salt** — Powder. Dissolves in water → salt_water. Melts ice faster.
14. **Metal** — Generic structural solid. Conducts heat well. Placeholder for machines.
15. **Steel** — Iron + coal + extreme heat → steel. Stronger than iron. Hidden/discovered.

---

## 5. Chemical Elements & Reactions

### 5.1 Making Chemistry Fun

**Principle:** Reactions should be VISIBLE, DRAMATIC, and DISCOVERABLE. Not textbook equations.

**Discovery loop:**
1. Player places two elements near each other
2. Something unexpected happens (color change, explosion, new substance appears)
3. "New substance discovered: Caramel!" toast notification
4. Player wants to try more combinations

**Key design rules:**
- Every reaction must have a VISIBLE result (not just "nothing happens")
- Dangerous reactions (hydrogen + fire) should be dramatic (explosion radius, particles flying)
- Slow reactions (iron rusting) should show gradual color change
- Temperature adds a third axis: "iron doesn't react with water at room temp... but heat it up and see what happens"

### 5.2 Phase 1 Reaction Table

These are the reactions declared ON each element class via the `reactions` property.

#### Hydrogen Reactions
```javascript
// HydrogenElement.js
reactions: {
    fire: { elem1: 'water', elem2: 'fire', chance: 0.8 },
    // H2 + fire → water + more fire (exothermic chain reaction)
    // The "fire stays" means it acts as a catalyst, spreading
    oxygen: {
        chance: 0.01, // Very slow without spark
        tempMin: 500, // Needs high temp to auto-ignite
        func: (grid, sx, sy, tx, ty, reg) => {
            // H2 + O2 → water (dramatic: create water + expansion)
            grid.setElement(sx, sy, reg.get('water'));
            grid.setElement(tx, ty, reg.get('water'));
            return true;
        }
    },
    lava: { elem1: 'steam', elem2: null, chance: 0.5 }, // Burns on lava contact
}
```

#### Oxygen Reactions
```javascript
// OxygenElement.js
reactions: {
    fire: { elem1: null, elem2: null, chance: 0.3 },
    // O2 feeds fire then is consumed — fire element handles spread via ignition
    // Actually: oxygen near fire makes fire last longer / burn hotter
    // Implementation: increase neighbor fire lifetime instead of consuming
    fire: {
        chance: 0.1,
        func: (grid, sx, sy, tx, ty, reg) => {
            // Feed the fire: reset fire's lifetime to extend it
            const fireCell = grid.getCell(tx, ty);
            if (fireCell) fireCell.lifetime = 60; // refresh
            // 50% chance oxygen is consumed
            if (Math.random() < 0.5) {
                grid.setElement(sx, sy, reg.get('empty'));
            }
            return true;
        }
    },
}
```

#### Iron Reactions
```javascript
// IronElement.js
reactions: {
    water: { elem1: 'rust', chance: 0.001 }, // Very slow rusting
    acid:  { elem1: null, elem2: 'hydrogen', chance: 0.1 }, // Acid dissolves iron, releases H2!
    // Iron + acid → hydrogen gas bubbles! Great demo.
}
```

#### Sugar Reactions
```javascript
// SugarElement.js
reactions: {
    water: { elem1: null, elem2: 'salt_water', chance: 0.1 },
    // (yes, "salt_water" is a misnomer — should be "sugar_water" but we'll
    //  rename to "sweet_water" or just reuse the dissolving mechanic)
    fire:  { elem1: 'caramel', chance: 0.3, tempMin: 160 },
}
```

#### Salt Reactions
```javascript
// SaltElement.js
reactions: {
    water: { elem1: null, elem2: 'salt_water', chance: 0.15 },
    ice:   { elem1: null, elem2: 'water', chance: 0.05 },  // Salt melts ice!
    lava:  { elem1: 'smoke', chance: 0.1 },  // Salt crackles in lava
}
```

#### Copper Reactions
```javascript
// CopperElement.js
reactions: {
    water: {
        chance: 0.0002, // Extremely slow patina formation
        func: (grid, sx, sy, tx, ty, reg) => {
            // Visual change: copper turns greenish over time
            const cell = grid.getCell(sx, sy);
            if (cell) {
                cell.data.patina = (cell.data.patina || 0) + 1;
                // After enough exposure, color shifts (handled in render)
            }
            return false; // Don't consume either element
        }
    },
    acid: { elem1: null, elem2: 'hydrogen', chance: 0.05 },
}
```

#### Full Reaction Matrix (Phase 1)

| Source ↓ / Target → | water | fire | lava | acid | ice | oxygen | hydrogen |
|---------------------|-------|------|------|------|-----|--------|----------|
| **iron** | rust (0.1%) | — | molten_iron | hydrogen (10%) | — | — | — |
| **copper** | patina (0.02%) | — | molten_copper | hydrogen (5%) | — | — | — |
| **gold** | — | — | molten_gold | — | — | — | — |
| **hydrogen** | — | water+fire (80%) | steam (50%) | — | — | water@500°C (1%) | — |
| **oxygen** | — | feed fire (10%) | — | — | — | — | water@500°C |
| **sugar** | dissolve (10%) | caramel@160°C (30%) | caramel (50%) | carbon+steam (30%) | — | — | — |
| **salt** | salt_water (15%) | — | smoke (10%) | — | water (5%) | — | — |
| **dirt** | mud (20%) | — | glass (1%) | — | — | — | — |
| **charcoal** | — | — | — | — | — | — | — |
| **nitrogen** | — | smother (5%) | — | — | — | — | — |

### 5.3 Acids & Bases

Acid already exists. Expand its reactions using the new system:

```javascript
// Existing AcidElement.js — add reactions property
reactions: {
    iron:   { elem1: null, elem2: 'hydrogen', chance: 0.1 },
    copper: { elem1: null, elem2: 'hydrogen', chance: 0.05 },
    // Existing CorrosionBehavior handles organic/mineral dissolution
    // New reactions handle specific metal + acid → H2 gas
}
```

Bases (e.g., baking soda) are Phase 2 — they require the acid/base neutralization mechanic which adds complexity.

### 5.4 Temperature-Dependent Reactions

Several reactions require specific temperatures, making the temperature system essential:

- **H2 + O2 → Water** requires temp > 500°C (autoignition) OR contact with fire
- **Sugar → Caramel** requires temp > 160°C (can use fire contact OR ambient heat)
- **Sand → Glass** requires temp > 1700°C (only achievable near lava or with heat tool)
- **Iron → Molten Iron** at 1538°C
- **Iron + Coal → Steel** requires temp > 1200°C AND both present

The `tempMin`/`tempMax` fields on reaction definitions handle this cleanly.

---

## 6. Implementation Order

### Step 1: Foundation (3 days)

| Task | File | Effort |
|------|------|--------|
| Add temp/reaction properties to `Element.js` base class | `Element.js` | 1 hour |
| Create `TemperatureSystem.js` (diffusion + state transitions) | NEW | 1 day |
| Integrate TemperatureSystem into `PixelGrid.js` update loop | `PixelGrid.js` | 2 hours |
| Add temp properties to all existing 44 elements | `src/elements/*.js` | 3 hours |
| Wire seasonal ambient temp to TemperatureSystem | `PixelGrid.js` | 1 hour |
| Add temperature initialization in `PixelGrid.setElement()` | `PixelGrid.js` | 1 hour |
| Test: Fire heats water → steam, ice cools water → ice | Manual testing | 2 hours |

### Step 2: Reaction Engine (2 days)

| Task | File | Effort |
|------|------|--------|
| Create `ReactionEngine.js` | NEW | 4 hours |
| Integrate into `InteractionManager.js` as fallback | `InteractionManager.js` | 1 hour |
| Update `ElementRegistry.js` with `initReactionEngine()` | `ElementRegistry.js` | 1 hour |
| Update `init.js` to call `initReactionEngine()` | `init.js` | 30 min |
| Add test reactions to 2-3 existing elements (sugar on water, etc.) | `WaterElement.js`, etc. | 1 hour |
| Test: Verify tag interactions still work, reactions fire as fallback | Manual testing | 2 hours |

### Step 3: New Elements — Metals & Chemistry (3 days)

| Task | File | Effort |
|------|------|--------|
| Create `IronElement.js` (solid, rusts, melts) | NEW | 2 hours |
| Create `MoltenIronElement.js` (hidden, liquid, cools to iron) | NEW | 1 hour |
| Create `CopperElement.js` (solid, patina, melts) | NEW | 2 hours |
| Create `MoltenCopperElement.js` (hidden) | NEW | 1 hour |
| Create `GoldElement.js` (solid, noble, melts) | NEW | 1 hour |
| Create `MoltenGoldElement.js` (hidden) | NEW | 1 hour |
| Create `HydrogenElement.js` (flammable gas, rises fast) | NEW | 2 hours |
| Create `OxygenElement.js` (feeds fire, oxidizer) | NEW | 2 hours |
| Create `NitrogenElement.js` (inert gas, smothers fire) | NEW | 1 hour |
| Create `SugarElement.js` (powder, dissolves, caramelizes) | NEW | 1 hour |
| Create `CaramelElement.js` (hidden, sticky liquid) | NEW | 1 hour |
| Create `SaltElement.js` (powder, dissolves, melts ice) | NEW | 1 hour |
| Create `SaltWaterElement.js` (hidden, liquid) | NEW | 1 hour |
| Register all in `elements/index.js` and `init.js` | `index.js`, `init.js` | 1 hour |
| Assign new ELEMENT_TYPE IDs in `ElementProperties.js` | `ElementProperties.js` | 30 min |

### Step 4: New Elements — Earth & Materials (1 day)

| Task | File | Effort |
|------|------|--------|
| Create `DirtElement.js` (powder, wets to mud) | NEW | 1 hour |
| Create `MudElement.js` (viscous liquid, dries to clay) | NEW | 1 hour |
| Create `ClayElement.js` (solid, fires to brick future) | NEW | 1 hour |
| Create `CharcoalElement.js` (powder, burns hot) | NEW | 1 hour |
| Create `RustElement.js` (powder, byproduct of iron+water) | NEW | 1 hour |
| Create `MetalElement.js` (generic structural solid) | NEW | 1 hour |
| Create `SteelElement.js` (hidden, iron+coal+heat) | NEW | 1 hour |
| Register all, assign IDs | Various | 1 hour |

### Step 5: Category UI (1-2 days)

| Task | File | Effort |
|------|------|--------|
| Create `ElementCategories.js` | NEW | 1 hour |
| Add `category` property to all element classes | `src/elements/*.js` | 2 hours |
| Refactor `setupElementSelector()` to two-tier layout | `GameScene.js` / `index.html` | 4 hours |
| Style category tabs (pixel-art aesthetic) | CSS in `index.html` | 2 hours |
| Mobile touch handling (swipe categories, scroll elements) | JS in `index.html` | 2 hours |
| Test on iOS simulator and web | Manual testing | 2 hours |

### Step 6: Temperature Visualization & Polish (1 day)

| Task | File | Effort |
|------|------|--------|
| Add temperature color tinting to render loop | `GameScene.js` render() | 2 hours |
| Add thermal view mode toggle (T key + settings) | `GameScene.js`, `index.html` | 2 hours |
| Add element discovery notifications (toast) | `index.html` CSS/JS | 2 hours |
| Discovery persistence (`@capacitor/preferences`) | `GameScene.js` or new module | 1 hour |

### Step 7: Testing & Stabilization (2 days)

| Task | Effort |
|------|--------|
| Full regression test of all existing elements | 2 hours |
| Test all new element reactions | 2 hours |
| Test temperature diffusion performance on iOS | 2 hours |
| Test save/load with new elements | 2 hours |
| Test hidden element discovery flow | 1 hour |
| Performance profiling (60 FPS target on iPhone 12+) | 2 hours |
| Fix bugs and tune reaction rates | 3 hours |
| Bump version to 5.0.0 | 15 min |

**Total estimated effort: 13-16 days**

---

## 7. File Inventory

### New Files

| File | Purpose | Lines (est.) |
|------|---------|-------------|
| `src/TemperatureSystem.js` | Per-cell temp diffusion, state transitions | ~200 |
| `src/ReactionEngine.js` | Declarative reaction processor + lookup table | ~120 |
| `src/ElementCategories.js` | Category definitions + element-category mapping | ~60 |
| `src/elements/IronElement.js` | Iron solid, rusts, melts at 1538°C | ~40 |
| `src/elements/MoltenIronElement.js` | Molten iron liquid, cools to iron | ~35 |
| `src/elements/CopperElement.js` | Copper solid, patina, melts at 1085°C | ~45 |
| `src/elements/MoltenCopperElement.js` | Molten copper liquid | ~35 |
| `src/elements/GoldElement.js` | Gold solid, noble, melts at 1064°C | ~35 |
| `src/elements/MoltenGoldElement.js` | Molten gold liquid | ~35 |
| `src/elements/HydrogenElement.js` | Flammable gas, reacts with fire/oxygen | ~50 |
| `src/elements/OxygenElement.js` | Oxidizer gas, feeds fire | ~45 |
| `src/elements/NitrogenElement.js` | Inert gas, smothers fire | ~30 |
| `src/elements/SugarElement.js` | Powder, dissolves, caramelizes | ~35 |
| `src/elements/CaramelElement.js` | Hidden sticky liquid | ~30 |
| `src/elements/SaltElement.js` | Powder, dissolves, melts ice | ~35 |
| `src/elements/SaltWaterElement.js` | Hidden liquid, salt dissolved in water | ~30 |
| `src/elements/DirtElement.js` | Powder, wets to mud | ~30 |
| `src/elements/MudElement.js` | Viscous liquid, dries to clay | ~40 |
| `src/elements/ClayElement.js` | Solid, moldable | ~25 |
| `src/elements/CharcoalElement.js` | Powder, burns hot and slow | ~35 |
| `src/elements/RustElement.js` | Powder, iron corrosion product | ~25 |
| `src/elements/MetalElement.js` | Generic structural metal | ~30 |
| `src/elements/SteelElement.js` | Hidden, iron+coal+heat product | ~30 |

### Modified Files

| File | Changes |
|------|---------|
| `src/Element.js` | Add `temp`, `tempHigh`, `stateHigh`, `tempLow`, `stateLow`, `heatOutput`, `insulate`, `reactions`, `category`, `hidden` properties |
| `src/ElementProperties.js` | Add new ELEMENT_TYPE IDs (DIRT: 45, MUD: 46, CLAY: 47, etc.) |
| `src/ElementRegistry.js` | Add `initReactionEngine()`, store reaction engine reference |
| `src/InteractionManager.js` | Add `setReactionEngine()`, call reaction engine as fallback in `checkInteraction()` |
| `src/PixelGrid.js` | Integrate TemperatureSystem in `update()`, heat source registration in `setElement()` |
| `src/init.js` | Register all new elements, call `registry.initReactionEngine()` |
| `src/elements/index.js` | Export all new element classes |
| `src/elements/FireElement.js` | Add `temp: 600`, `heatOutput: 200`, `tempLow: 100`, `stateLow: 'smoke'` |
| `src/elements/LavaElement.js` | Add `temp: 1200`, `heatOutput: 400`, `tempLow: 500`, `stateLow: 'stone'` |
| `src/elements/WaterElement.js` | Add `temp: 20`, `tempHigh: 100`, `stateHigh: 'steam'`, `tempLow: 0`, `stateLow: 'ice'` |
| `src/elements/IceElement.js` | Add `temp: -20`, `heatOutput: -100`, `tempHigh: 0`, `stateHigh: 'water'` |
| `src/elements/SnowElement.js` | Add `temp: -5`, `heatOutput: -50`, `tempHigh: 2`, `stateHigh: 'water'` |
| `src/elements/SteamElement.js` | Add `temp: 100`, `tempLow: 80`, `stateLow: 'water'` |
| `src/elements/OilElement.js` | Add `temp: 20`, `tempHigh: 280`, `stateHigh: 'fire'` |
| `src/elements/SandElement.js` | Add `temp: 20`, `tempHigh: 1700`, `stateHigh: 'glass'` |
| `src/elements/GlassElement.js` | Add `temp: 20`, `tempHigh: 1500`, `stateHigh: 'lava'` |
| `src/elements/StoneElement.js` | Add `temp: 20`, `tempHigh: 1500`, `stateHigh: 'lava'` |
| `src/elements/WoodElement.js` | Add `temp: 20`, `tempHigh: 300`, `stateHigh: 'fire'` |
| `src/elements/CoalElement.js` | Add `temp: 20`, `tempHigh: 400`, `stateHigh: 'burning_coal'` |
| `src/elements/WallElement.js` | Add `insulate: true` |
| `src/elements/ObsidianElement.js` | Add `insulate: true`, `tempHigh: 2000`, `stateHigh: 'lava'` |
| `src/main.js` (GameScene) | Restructure `setupElementSelector()` for categories, add temp tinting in `render()`, thermal view toggle, discovery notifications |
| `index.html` | CSS for category tabs, element row, discovery toast, thermal toggle in settings |
| `version.js` | Bump to 5.0.0 |

---

## 8. Migration Guide

### 8.1 Adding Temperature to Existing Elements

For each of the 44 existing elements, add temp properties to the constructor's property object. Most are simple:

```javascript
// Pattern for elements with no transitions:
{ ...existing, temp: 20 }

// Pattern for elements with transitions:
{ ...existing, temp: 20, tempHigh: 100, stateHigh: 'steam', tempLow: 0, stateLow: 'ice' }

// Pattern for heat sources:
{ ...existing, temp: 600, heatOutput: 200 }

// Pattern for cold sources:
{ ...existing, temp: -20, heatOutput: -100 }

// Pattern for insulating elements:
{ ...existing, insulate: true }
```

Elements that don't specify `temp` get `null`, meaning they adopt ambient temperature and don't participate in diffusion (inert). This is the safe default.

### 8.2 Save System Compatibility

The `WorldSerializer` format v3 stores `cellData` per cell. Temperature is stored via `cell.state.data.temperature`. The existing save/load already serializes/deserializes `CellState.data`, so temperature persistence works automatically.

New elements need to be registered before loading a save that contains them. Saves from v4.x that don't contain new elements load fine — new element cells won't exist in the data.

**One gotcha:** If a save references an element name that doesn't exist in the registry, the load must gracefully handle it (convert to empty). This should already be handled but worth verifying.

### 8.3 WASM Bridge

The WASM physics engine handles core movement (gravity, liquid flow). Temperature and reactions are **JS-only** — they don't touch the WASM bridge. No WASM changes needed in Phase 1.

If temperature diffusion becomes a bottleneck on mobile (unlikely with hybrid approach), it can be moved to WASM in a future phase.

### 8.4 WebGL Renderer

The existing render pipeline in `GameScene.render()` iterates active cells and draws rectangles. Temperature tinting adds one conditional branch per cell. The thermal view mode changes the color computation but not the draw call structure. No renderer architecture changes needed.

### 8.5 New ELEMENT_TYPE IDs

```javascript
// Add to ElementProperties.js ELEMENT_TYPE:
DIRT: 45,
MUD: 46,
CLAY: 47,
RUST: 48,
CHARCOAL: 49,
// LIGHT: 50 already taken
HYDROGEN: 51,
OXYGEN: 52,
NITROGEN: 53,
IRON: 54,
COPPER: 55,
GOLD: 56,
MOLTEN_IRON: 57,
MOLTEN_COPPER: 58,
MOLTEN_GOLD: 59,
SUGAR: 60,
CARAMEL: 61,
SALT_WATER: 62,
METAL: 63,
STEEL: 64,
```

### 8.6 Premium Tier Updates

New metals (iron, copper, gold) and chemistry elements are premium.
Dirt, mud, clay, salt, charcoal are free (nature basics).
Sugar is free (food basics).
Hidden elements (caramel, steel, salt_water, molten_*) inherit the tier of their parent reaction.

Update `PurchaseManager.js` FREE_ELEMENTS and PREMIUM_ELEMENTS arrays.

---

## Appendix: Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Temperature diffusion too slow on old iPhones | Low | Medium | Hybrid approach limits computation; `updateInterval` tunable (3→6 if needed) |
| Reactions cause unexpected chain reactions (infinite loops) | Medium | High | Reaction engine checks `cell.updated` flag; each cell can only react once per frame |
| Save/load breaks with new elements | Low | High | Verify backward compatibility in Step 7; unknown elements → empty on load |
| Category UI doesn't fit small screens | Medium | Medium | Test on iPhone SE (smallest); fallback to scrollable single row |
| Too many hidden elements confuse new players | Low | Low | Start with only 5 hidden; add more in later patches |
| Tag interactions conflict with reactions | Low | Medium | Reactions only fire when NO tag interaction matched — impossible to conflict |
