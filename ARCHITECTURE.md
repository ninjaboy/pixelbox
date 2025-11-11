### PixelBox Architecture

## Overview

PixelBox uses a **modular, property-based interaction system** where elements interact based on their properties (tags, state, temperature) rather than hardcoded logic. This makes it easy to add new elements and interactions without modifying existing code.

## Core Concepts

### 1. Property-Based Interactions

Instead of hardcoding "water + fire = steam", we define:
- **Water** has tag `EVAPORATES` and property `evaporatesInto: 'steam'`
- **Fire** has tag `HEAT_SOURCE`
- **Interaction Rule**: `EVAPORATES + HEAT_SOURCE → evaporate`

This means ANY element with `EVAPORATES` tag will turn into its evaporation form when near ANY `HEAT_SOURCE`.

### 2. Element Tags

Elements are tagged with behaviors:
- `COMBUSTIBLE` - Can catch fire
- `HEAT_SOURCE` - Emits heat/fire
- `EVAPORATES` - Can turn to gas when heated
- `OXIDIZER` - Enhances combustion
- `ORGANIC` - Living/organic material
- `EXPLOSIVE` - Can explode

### 3. Element Properties

Each element has:
```javascript
{
    density: 3,                    // Heavier elements displace lighter ones
    state: STATE.POWDER,           // EMPTY, SOLID, POWDER, LIQUID, GAS
    temperature: TEMPERATURE.HOT,  // COLD, NORMAL, WARM, HOT, VERY_HOT
    dispersion: 1,                 // How much it spreads
    movable: true,                 // Can it move?
    tags: [TAG.COMBUSTIBLE],       // Interaction tags
    burnsInto: 'fire',            // What it becomes when ignited
    evaporatesInto: 'steam',      // What it becomes when heated
    lifetime: -1                   // -1 = infinite, >0 = temporary
}
```

## File Structure

```
src/
├── ElementProperties.js    # Property/tag definitions
├── Element.js              # Base element class
├── InteractionManager.js   # Handles all interactions
├── ElementRegistry.js      # Manages elements + interactions
├── PixelGrid.js           # Simulation grid
├── main.js                # Main game file
├── init.js                # Initialize registry
└── elements/
    ├── index.js           # Export all elements
    ├── EmptyElement.js
    ├── SandElement.js
    ├── WaterElement.js
    ├── FireElement.js
    ├── WoodElement.js
    ├── StoneElement.js
    └── SteamElement.js
```

## How Interactions Work

### Step 1: Element Tags
```javascript
// Water evaporates when heated
class WaterElement extends Element {
    constructor() {
        super(2, 'water', 0x4a90e2, {
            tags: [TAG.EVAPORATES],
            evaporatesInto: 'steam'
        });
    }
}

// Fire is a heat source
class FireElement extends Element {
    constructor() {
        super(4, 'fire', 0xff6b35, {
            tags: [TAG.HEAT_SOURCE]
        });
    }
}
```

### Step 2: Interaction Rule (in InteractionManager)
```javascript
{
    name: 'evaporation',
    check: (element1, element2) => {
        return (element1.hasTag(TAG.EVAPORATES) && element2.hasTag(TAG.HEAT_SOURCE)) ||
               (element2.hasTag(TAG.EVAPORATES) && element1.hasTag(TAG.HEAT_SOURCE));
    },
    apply: (element1, element2, grid, x1, y1, x2, y2, registry) => {
        // Find which element evaporates
        const [evapX, evapY, evaporating] = element1.hasTag(TAG.EVAPORATES)
            ? [x1, y1, element1]
            : [x2, y2, element2];

        // Transform it
        if (Math.random() > 0.9 && evaporating.evaporatesInto) {
            grid.setElement(evapX, evapY, registry.get(evaporating.evaporatesInto));
            return true;
        }
        return false;
    }
}
```

### Step 3: Automatic Application
The `PixelGrid` automatically checks for interactions between adjacent elements using the `InteractionManager`.

## Adding a New Element

### Example: Oil (Flammable Liquid)

#### 1. Create Element File
`src/elements/OilElement.js`:
```javascript
import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class OilElement extends Element {
    constructor() {
        super(7, 'oil', 0x3d3d1a, {
            density: 1.5,
            state: STATE.LIQUID,
            dispersion: 2,
            tags: [TAG.COMBUSTIBLE],  // Can catch fire!
            burnsInto: 'fire'          // Becomes fire when ignited
        });
    }

    update(x, y, grid) {
        // Liquid behavior (like water, but less dispersive)
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }

        const dir = Math.random() > 0.5 ? 1 : -1;
        if (grid.canMoveTo(x, y, x + dir, y + 1)) {
            grid.swap(x, y, x + dir, y + 1);
            return true;
        }

        return false;
    }
}

export default OilElement;
```

#### 2. Export from index
`src/elements/index.js`:
```javascript
export { default as OilElement } from './OilElement.js';
```

#### 3. Register in init.js
```javascript
import { OilElement } from './elements/index.js';

registry.register(new OilElement());
```

#### 4. Add to UI
`index.html`:
```html
<button class="element-btn" data-element="oil" style="background: #3d3d1a;">O</button>
```

**That's it!** Oil will now:
- Flow like a liquid (density 1.5)
- Ignite when touching fire (COMBUSTIBLE tag)
- Transform into fire when burned (burnsInto property)
- All automatically handled by the interaction system!

## Adding Custom Interactions

Want acid that dissolves metal? Add a new interaction:

```javascript
// In InteractionManager.registerDefaultInteractions()
this.registerInteraction({
    name: 'corrosion',
    check: (element1, element2) => {
        return (element1.hasTag(TAG.CORROSIVE) && element2.hasTag(TAG.METAL)) ||
               (element2.hasTag(TAG.CORROSIVE) && element1.hasTag(TAG.METAL));
    },
    apply: (element1, element2, grid, x1, y1, x2, y2, registry) => {
        // Find metal element
        const [metalX, metalY] = element1.hasTag(TAG.METAL)
            ? [x1, y1]
            : [x2, y2];

        // Dissolve it
        if (Math.random() > 0.95) {
            grid.setElement(metalX, metalY, registry.get('empty'));
            return true;
        }
        return false;
    }
});
```

Then just add `TAG.CORROSIVE` to acid and `TAG.METAL` to iron/steel elements!

## Benefits

✅ **Extensible** - Add elements without modifying existing code
✅ **Declarative** - Properties describe behavior
✅ **Reusable** - One interaction rule works for all matching elements
✅ **Maintainable** - Clear separation of concerns
✅ **Scalable** - Easy to add 100+ elements with complex interactions

## Future Enhancements

- Temperature system (elements can heat/cool neighbors)
- Pressure system (compressed gas, explosions)
- Electrical conductivity
- Chemical reactions (combine elements to create new ones)
- State changes (ice ↔ water ↔ steam based on temperature)

---

## CRITICAL: Code Modularity Guidelines

### Why Modularity Matters

**Modularity is not optional—it's essential for maintainability.** As the codebase grows, keeping code organized in focused modules prevents technical debt and makes development faster.

### Core Modularity Principles

#### 1. **One Responsibility Per Module**
Each file should have a single, clear purpose:

- ✅ `WorldSerializer.js` - Handles save/load/share
- ✅ `WorldTemplates.js` - Contains world generation algorithms
- ✅ `MenuManager.js` - Manages UI and navigation only
- ❌ `MenuManager.js` - Menu UI + world generation + serialization (too much!)

#### 2. **Separate Data from Logic**
Keep configuration separate from implementation:

```javascript
// ✅ GOOD: Template definitions in WorldTemplates.js
const templates = {
    island: {
        name: 'Island Paradise',
        customCode: null,  // Paste custom world code here
        generate: (scene) => this.generateIslandParadise(scene)
    }
};

// ❌ BAD: 500 lines of generation code inlined in MenuManager
```

#### 3. **Clear Module Boundaries**
Each module should expose a clean interface:

```javascript
// WorldSerializer.js exports:
- serializeWorld() → base64 string
- deserializeWorld(base64) → boolean
- copyToClipboard() → promise
- showImportDialog() → boolean

// WorldTemplates.js exports:
- getAllTemplates() → { island, desert, ... }
- getTemplate(id) → template object
```

### New Module Structure

```
src/
├── main.js               # Game orchestration
├── MenuManager.js        # Menu UI and navigation (110 lines)
├── WorldSerializer.js    # Save/load/share worlds (103 lines)
├── WorldTemplates.js     # World generation (520 lines)
├── ElementRegistry.js    # Element management
├── PixelGrid.js          # Simulation engine
├── Profiler.js           # Performance monitoring
└── elements/             # Element implementations
```

### Module Responsibilities

#### `MenuManager.js`
- Show/hide menu overlay
- Navigate between screens (main, templates, settings)
- Handle button clicks
- **Does NOT contain:** World generation, serialization logic

#### `WorldSerializer.js`
- Serialize grid to base64 string
- Deserialize base64 to grid
- Copy to clipboard
- Import from prompt
- **Format:** `width,height|id,id,id,...`

#### `WorldTemplates.js`
- Define all template metadata
- Implement generation algorithms
- Support custom paste zones:

```javascript
island: {
    // PASTE YOUR CUSTOM TEMPLATE CODE HERE
    customCode: null,
    // Example: customCode: 'MTAwLDEwMHwwLDAsMCww...'

    generate: (scene) => {
        if (this.customCode) {
            // Load from pasted code
            scene.worldSerializer.deserializeWorld(this.customCode);
        } else {
            // Use procedural generator
            this.generateIslandParadise(scene);
        }
    }
}
```

### How to Create Custom Templates

1. **Build your world** in the game
2. **Press ☰ menu button**
3. **Click "Share World"** → copies base64 code
4. **Open `src/WorldTemplates.js`**
5. **Find your template** (e.g., `island`)
6. **Paste code** into `customCode` field:

```javascript
island: {
    name: 'Island Paradise',
    icon: '🏝️',
    description: 'Ocean world with central island',

    // ✅ PASTE HERE
    customCode: 'MjAwLDE1MHwwLDAsMCwwLDAsMCwwLDAsMCwwLDAsMCww...',

    generate: (scene) => { /* ... */ }
}
```

7. **Reload game** → template now uses your custom world!

### Adding New Features: Checklist

When adding a feature, ask:

1. **Should this be its own module?**
   - If >100 lines → YES
   - If separate concern → YES
   - If reusable → YES

2. **Does it have a clear interface?**
   - Public methods well-defined?
   - Dependencies minimal?
   - Easy to test?

3. **Is it documented?**
   - Purpose clear?
   - Usage examples provided?
   - Added to this ARCHITECTURE.md?

### Anti-Patterns to Avoid

#### ❌ God Objects
Don't create modules that do everything:
```javascript
// BAD: MenuManager that also generates worlds, saves files, handles settings
class MenuManager {
    // 2000 lines of mixed responsibilities
}
```

#### ❌ Inline Everything
Don't inline complex logic:
```javascript
// BAD: 500 lines of template generation in MenuManager
generateIslandParadise() {
    // ... hundreds of lines ...
}
```

#### ❌ Tight Coupling
Don't hardcode dependencies:
```javascript
// BAD: Direct DOM manipulation in WorldTemplates
grid.setElement(x, y, element);
document.getElementById('menu').hide(); // ❌ Wrong module!
```

### Best Practices

#### ✅ Single Responsibility
```javascript
// WorldSerializer: Only handles serialization
export default class WorldSerializer {
    serializeWorld() { /* ... */ }
    deserializeWorld() { /* ... */ }
    copyToClipboard() { /* ... */ }
}
```

#### ✅ Dependency Injection
```javascript
// Pass dependencies, don't create them
class MenuManager {
    constructor(gameScene) {
        this.gameScene = gameScene;
        this.worldTemplates = new WorldTemplates(gameScene);
    }
}
```

#### ✅ Clear Interfaces
```javascript
// Public methods at top, private below
class WorldTemplates {
    // Public
    getAllTemplates() { }
    getTemplate(id) { }

    // Private generators
    generateIslandParadise() { }
}
```

### Refactoring Guide

When code gets messy:

1. **Identify responsibilities** - What does this code do?
2. **Group related code** - Which functions belong together?
3. **Extract to module** - Create new file with focused purpose
4. **Define interface** - What methods should be public?
5. **Update imports** - Wire up the new module
6. **Test** - Ensure everything still works
7. **Document** - Update this ARCHITECTURE.md

### Code Review Questions

Before committing:

- [ ] Is each module <500 lines?
- [ ] Does each module have one clear purpose?
- [ ] Are complex algorithms extracted to their own functions?
- [ ] Are dependencies injected, not created?
- [ ] Is the public interface clean and minimal?
- [ ] Is the code documented?
- [ ] Does it follow the existing patterns?

### Summary

**Remember:** When in doubt, create a new module. Modularity prevents technical debt and makes the codebase scalable. A well-organized codebase with many small modules is far easier to maintain than a monolithic file with thousands of lines.
