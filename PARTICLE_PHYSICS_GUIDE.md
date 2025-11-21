# Particle Physics Integration Guide

## Overview

Pixelbox now uses a **hybrid physics system**:
- **Static elements** (stone, wall, metal, glass, etc.) remain grid-based
- **Dynamic elements** (sand, water, oil, powders, liquids) use particle-based physics

This provides smooth, realistic motion with momentum, inertia, and fluid dynamics while maintaining performance.

---

## Architecture

### Core Modules

1. **Particle.js** - Individual particle representation
   - Float-based positions (x, y)
   - Velocity vectors (vx, vy)
   - Physics properties (mass, density, friction, restitution)
   - Color variation for visual realism

2. **SpatialGrid.js** - Spatial acceleration structure
   - Uniform grid / spatial hash
   - O(1) insertion, O(k) neighbor queries
   - Efficient for thousands of particles

3. **ParticleEngine.js** - Main physics simulation
   - Gravity and drag
   - Particle-particle repulsion
   - Liquid spreading behavior
   - Particle-static collisions
   - Integration with existing interaction system

4. **PixelGrid.js** - Hybrid integration
   - Manages both static grid and particle engine
   - `spawnParticle(x, y, element)` method
   - Updates both systems each frame

---

## How It Works

### Update Loop (in PixelGrid.update())

```javascript
update() {
    // 1. Update static grid elements (traditional cellular automaton)
    for (const cell of activeCells) {
        cell.element.update(x, y, this);
        this.checkInteractions(x, y);
    }

    // 2. Update particle engine (new physics-based particles)
    this.particleEngine.update(1);

    // 3. Update constructions (houses, etc.)
    ConstructionManager.updateConstructions(this);
}
```

### Render Loop (in main.js render())

```javascript
render() {
    // 1. Render sky and celestial bodies
    this.renderSky();
    this.renderCelestialBodies();

    // 2. Render static grid elements
    for (const cell of activeCells) {
        this.graphics.fillRect(x, y, pixelSize, pixelSize);
    }

    // 3. Render dynamic particles (NEW!)
    const particles = this.particleEngine.getActiveParticles();
    for (const particle of particles) {
        this.graphics.fillRect(
            particle.x * pixelSize,
            particle.y * pixelSize,
            pixelSize * 0.8,
            pixelSize * 0.8
        );
    }

    // 4. Render overlays
    this.renderAtmosphere();
}
```

---

## Using the Particle System

### Automatic Particle Spawning

Elements with these states **automatically spawn particles** when drawn:
- `STATE.POWDER` (sand, gunpowder, snow)
- `STATE.LIQUID` (water, oil, acid)
- `STATE.GAS` (steam, smoke)

**No changes needed** - the system detects this automatically!

### Manual Particle Spawning

For custom elements, set `useParticlePhysics = true`:

```javascript
class CustomElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.CUSTOM, 'custom', 0xFF0000, {
            density: 2,
            state: STATE.SOLID,
            useParticlePhysics: true  // ← Force particle physics
        });
    }
}
```

### Programmatic Spawning

Spawn particles from code:

```javascript
// In element update method or interaction
grid.spawnParticle(x, y, 'water');

// Spawn multiple particles
for (let i = 0; i < 10; i++) {
    const particle = grid.spawnParticle(x, y, 'sand');
    if (particle) {
        // Customize initial velocity
        particle.vx = (Math.random() - 0.5) * 2;
        particle.vy = -Math.random() * 3;  // Launch upward
    }
}
```

---

## Physics Parameters

### Element-Level Properties

These properties (defined in element constructor) affect particle behavior:

```javascript
{
    density: 2,              // Affects gravity strength and interactions
    mass: 2,                 // Defaults to density, affects force response
    friction: 0.98,          // Velocity decay (0.95 = high friction, 0.99 = low)
    restitution: 0.1,        // Bounciness (0 = no bounce, 1 = perfect bounce)
    dispersion: 3,           // Liquid spreading (0 = none, 3 = very fast)
    emissionDensity: 0.5,    // Spawn probability (0-1)
}
```

### Engine-Level Parameters

Configured in PixelGrid constructor:

```javascript
this.particleEngine = new ParticleEngine(this, {
    gravity: 0.5,                    // Global gravity strength
    maxSpeed: 10,                    // Speed limit (cells per frame)
    airDrag: 0.99,                   // Air resistance
    spatialCellSize: 3,              // Spatial grid cell size
    repulsionStrength: 0.3,          // Particle-particle repulsion
    liquidSpreadForce: 0.2,          // Liquid horizontal spreading
    liquidDensityThreshold: 4,       // When liquids spread
    substeps: 1,                     // Physics substeps per frame
    neighborRadius: 1                // Spatial query radius
});
```

---

## Particle Behaviors

### Gravity

All particles experience gravity based on their state:
- **Powders/Liquids**: Fall with gravity
- **Gases**: Rise (negative gravity)

### Drag

Velocity decreases each frame:
- **Powders**: High friction when settled
- **Liquids**: Medium friction (viscosity)
- **Gases**: Low friction (float freely)

### Repulsion

Particles push each other apart when too close, preventing overlap and creating density-based pressure.

### Liquid Spreading

When liquid particles have many neighbors (high local density):
1. Apply horizontal spreading force
2. Reduce vertical velocity
3. Create natural water pooling behavior

### Collisions with Static Grid

Particles bounce off static elements (walls, stone):
1. Detect grid cell collision
2. Reflect velocity with restitution
3. Stop if velocity too low

---

## Example: Custom Particle Element

```javascript
import { Element } from '../Element.js';
import { STATE, TAG, ELEMENT_TYPE } from '../ElementProperties.js';

class HoneyElement extends Element {
    constructor() {
        super(ELEMENT_TYPE.HONEY, 'honey', 0xFFAA00, {
            density: 2.5,           // Dense liquid
            state: STATE.LIQUID,    // Auto-enables particle physics
            dispersion: 1,          // Slow spreading
            friction: 0.85,         // Very viscous
            restitution: 0.05,      // Minimal bounce
            tags: new Set([TAG.ORGANIC]),
            brushSize: 3,
            emissionDensity: 0.8
        });
    }

    // Optional: no update needed, particle engine handles movement!
}

export { HoneyElement };
```

---

## Interactions with Static Grid

Particles can interact with static elements using the existing interaction system:

```javascript
// In InteractionManager.js
{
    name: 'water_fire_extinguish',
    priority: 5,
    check: (element1, element2) => {
        return (element1.hasTag(TAG.EXTINGUISHES_FIRE) && element2.name === 'fire') ||
               (element2.hasTag(TAG.EXTINGUISHES_FIRE) && element1.name === 'fire');
    },
    apply: (element1, element2, grid, x1, y1, x2, y2, registry) => {
        // Water particle hits fire cell -> create steam particle
        const [fireX, fireY] = element1.name === 'fire' ? [x1, y1] : [x2, y2];

        if (Math.random() < 0.7) {
            grid.setElement(fireX, fireY, registry.get('smoke'));

            // If water is a particle, transform it to steam
            // (handled automatically by ParticleEngine.checkParticleStaticInteraction)
            return true;
        }
        return false;
    }
}
```

---

## Performance Optimization

### Spatial Grid

The SpatialGrid divides the world into cells (default 3x3) and tracks which particles are in each cell.

**Neighbor query complexity**:
- Without spatial grid: O(n) - check all particles
- With spatial grid: O(k) - check only nearby particles (typically 5-20)

**For 1000 particles**:
- Without: 1,000,000 comparisons per frame
- With: ~15,000 comparisons per frame (**67x faster!**)

### Object Pooling

ParticlePool pre-allocates particles and reuses them:
- No garbage collection during gameplay
- Constant memory usage
- Max 50,000 particles (configurable)

### Batch Rendering

Particles are grouped by color before rendering:
```javascript
// Instead of 1000 draw calls:
for (particle of particles) {
    graphics.fillStyle(particle.color);
    graphics.fillRect(...);
}

// Do ~10 draw calls (one per color):
for (color of colors) {
    graphics.fillStyle(color);
    for (particle of particlesOfThisColor) {
        graphics.fillRect(...);
    }
}
```

---

## Debugging

### Get Particle Statistics

```javascript
const stats = pixelGrid.particleEngine.getStats();
console.log(stats);
// {
//     particleCount: 1234,
//     collisions: 567,
//     interactions: 89,
//     fps: 60,
//     updateTime: 12.5,
//     poolStats: { active: 1234, total: 2000, utilization: 0.025 },
//     spatialStats: { occupiedCells: 234, avgPerCell: 5.3, ... }
// }
```

### Visualize Spatial Grid

```javascript
const gridData = pixelGrid.particleEngine.spatialGrid.getVisualizationData();
// 2D array of particle counts per cell
console.table(gridData);
```

### Spawn Test Particles

```javascript
pixelGrid.particleEngine.spawnTestParticles(50, 50, 'water', 100);
```

---

## Migration Checklist

To convert an existing element to particle-based physics:

- [ ] Check element state is POWDER, LIQUID, or GAS (auto-enabled)
- [ ] OR add `useParticlePhysics: true` to constructor
- [ ] Remove `updateImpl()` method (particle engine handles movement)
- [ ] Keep interaction behaviors (still work!)
- [ ] Adjust `friction`, `restitution`, `dispersion` for desired feel
- [ ] Test performance with high particle counts

---

## Comparison: Grid vs Particle

| Feature | Grid-Based (Old) | Particle-Based (New) |
|---------|------------------|----------------------|
| Position | Integer (x, y) | Float (x, y) |
| Movement | Cell swapping | Velocity integration |
| Momentum | None | Full physics |
| Smoothness | Discrete steps | Continuous motion |
| Liquid flow | Hard-coded rules | Pressure-based |
| Collisions | Density checks | Bouncing + friction |
| Performance | O(n) cells | O(n) particles + O(k) neighbors |

---

## Future Enhancements

Potential improvements:

1. **Particle-particle merging** - Combine nearby particles to reduce count
2. **Sleeping particles** - Stop updating settled particles
3. **Chunk-based updates** - Only update visible/active regions
4. **Verlet integration** - More stable physics at higher speeds
5. **Pressure fields** - Compute pressure grid for more realistic fluids
6. **Temperature diffusion** - Heat spreads through particles
7. **Chemical reactions** - Particle transmutation (water + lava → steam)

---

## Quick Reference

```javascript
// Spawn particle
grid.spawnParticle(x, y, 'water');

// Get active particles
const particles = grid.particleEngine.getActiveParticles();

// Clear all particles
grid.particleEngine.clear();

// Get stats
const stats = grid.particleEngine.getStats();

// Configure physics (in PixelGrid constructor)
this.particleEngine.gravity = 0.8;  // Stronger gravity
this.particleEngine.maxSpeed = 15;  // Faster particles
```

---

## Conclusion

The hybrid particle system maintains **full compatibility** with existing elements and interactions while providing **realistic physics** for dynamic elements. No changes needed for static elements, and dynamic elements automatically benefit from improved physics!

**Try it**: Draw water, sand, or oil and watch them flow with momentum and realistic spreading!
