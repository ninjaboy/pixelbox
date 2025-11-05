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
