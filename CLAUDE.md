# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm install              # Install dependencies
npm run dev              # Start dev server on localhost:3000 (hot reload)
npm run build            # Production build (WASM SIMD + Vite)
npm run build:js         # Build JS only (skip WASM)
npm run preview          # Preview production build

# WASM Physics Engine
npm run build:wasm:simd   # Build with SIMD optimization (default for production)
npm run build:wasm:scalar # Build without SIMD for compatibility
npm run build:wasm:all    # Build both variants
npm run clean:wasm        # Remove WASM build artifacts

# iOS (from project root)
npm run build && npx cap copy ios  # Sync web assets to iOS
cd ios && fastlane simulator       # Test in simulator
```

## Architecture Overview

**PixelBox** is a particle simulation sandbox game (v4.3.0) using:
- Phaser 3.86.0 for rendering
- Custom JavaScript physics engine (WASM build infra exists but is not currently active)
- Vite 5.0 for building
- Capacitor 7.4.4 for iOS deployment

### Property-Based Interaction System

Elements interact based on **tags and properties**, not hardcoded pairs:
- Elements have tags (`COMBUSTIBLE`, `HEAT_SOURCE`, `EVAPORATES`, etc.)
- Interactions defined once: "anything with `EVAPORATES` + anything with `HEAT_SOURCE` = evaporation"
- Add new elements without modifying existing code

### Key Files

| File | Purpose |
|------|---------|
| `src/ElementProperties.js` | STATE, TEMPERATURE, TAG constants, ELEMENT_TYPE definitions |
| `src/Element.js` | Base element class with behavior composition |
| `src/InteractionManager.js` | Tag-based interaction rules |
| `src/PixelGrid.js` | Core simulation grid engine |
| `src/config/GameConfig.js` | Tunable parameters (seasons, time, weather, growth rates) |
| `src/ReactionEngine.js` | Declarative element-pair reactions (v5.0.0) |
| `src/TemperatureSystem.js` | Heat diffusion and state transitions (v5.0.0) |

### Manager Pattern

Complex systems use centralized managers:
- `SeasonManager` - Season progression, temperature, seasonal queries
- `WindManager` - Wind direction/strength with seasonal patterns
- `CelestialManager` - Moon phases

Managers update each frame in `main.js`, state passed to `PixelGrid.seasonData`, accessible by all elements.

### Behavior Composition

Elements compose reusable behaviors from `src/behaviors/`:
```javascript
this.addBehavior(new SurfaceFreezingBehavior());
```

## Adding a New Element

1. Create `src/elements/NewElement.js`:
```javascript
import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class NewElement extends Element {
    constructor() {
        super(ELEMENT_ID, 'name', 0xCOLOR, {
            density: 3,
            state: STATE.POWDER,
            tags: [TAG.COMBUSTIBLE],
            burnsInto: 'fire'
        });
    }

    updateImpl(x, y, grid) {
        // Custom physics
        return false; // return true if moved
    }
}
export default NewElement;
```

2. Export in `src/elements/index.js`
3. Register in `src/init.js`
4. Add UI button in `index.html`

## Grid Coordinate System

- World: `width × height` pixels
- Grid: `width/pixelSize × height/pixelSize` cells (default pixelSize: 4)
- Out-of-bounds coordinates return null (no wrapping)
- Grid indexing: numeric keys `(y * width + x)` for performance

## Density Scale

```
0:     Gases (fire, smoke, steam)
1-2:   Light liquids (ash, oil)
3-4:   Powders (ice, sand)
5-7:   Light solids (wood, glass)
8-10:  Heavy materials (lava, stone)
```

## Performance Patterns

- **Active cell tracking**: `activeCells` Map in PixelGrid stores only non-empty cells with numeric keys and cached `{x,y}` coordinates, enabling O(active) updates instead of O(grid)
- **Canvas texture rendering**: Main particles render to offscreen CanvasTexture, uploaded as single GPU texture per frame (avoids per-pixel Phaser Graphics fillRect overhead)
- **Incremental counters**: Cloud count tracked incrementally in `setElement()` (avoids full grid scan)
- **Collection reuse**: Per-frame Maps/Arrays reused via `.clear()` and array pooling (reduces GC pressure)
- **Interaction throttling**: Interactions checked every 2 frames; static elements skip entirely
- **Temperature throttling**: Diffusion runs every 3 frames, only within radius 6 of heat sources
- **Probabilistic updates**: Low-chance per-frame checks (e.g., `Math.random() < 0.002`)

## Feature Flags

Override via URL params (e.g., `?debugMode=true`) or localStorage (no centralized FeatureFlags.js file — flags are checked inline):
- `debugMode` - Show debug info

## Deployment

Automated via GitHub Actions on push to `master`:
1. Builds WASM + Vite production bundle
2. Pushes `dist/` to public repo (github.com/ninjaboy/pixelbox)
3. GitHub Pages serves automatically

**Public game**: https://ninjaboy.github.io/pixelbox/

## Version Management

Update `version.js` with format `MAJOR.MINOR.PATCH`:
- Major: Significant new features, breaking changes
- Minor: New elements, mechanics, substantial improvements
- Patch: Bug fixes, tweaks, refactoring

## In-App Purchases (IAP)

**Plugin**: `cordova-plugin-purchase` v13 (supports Capacitor + StoreKit)

**Product**: `com.ninjaboy.pixellence.unlock_all_elements` — NON_CONSUMABLE (£2.99)

**Key files**:
| File | Purpose |
|------|---------|
| `src/PurchaseManager.js` | Singleton IAP manager — StoreKit integration + local cache |
| `src/UnlockModal.js` | Premium element unlock modal UI |
| `src/MenuManager.js` | Menu integration (Unlock All / Restore Purchases buttons) |

**How it works**:
1. On init, loads cached unlock state from `@capacitor/preferences` (instant)
2. On native iOS, initializes `CdvPurchase.store` and registers the product
3. `purchase()` triggers the real StoreKit dialog on iOS, or local unlock on web
4. `restorePurchases()` uses Apple's restore flow (required by App Store Review Guidelines)
5. Ownership cached locally for fast startup; StoreKit is source of truth

**Element tiers** (defined in `PurchaseManager.js`):
- FREE: fire, water, sand, stone, wood, wall, eraser
- PREMIUM: steam_vent, oil, lava, acid, slush, gunpowder, snow, ice, glass, coal, tree_seed, vine, fish, bird, coral, house_seed

**iOS Setup**:
1. Enable "In-App Purchase" capability in Xcode (Signing & Capabilities)
2. Create the product in App Store Connect
3. `npm run build && npx cap copy ios` to sync
4. `cd ios/App && LANG=en_US.UTF-8 pod install` to update pods

## Important Considerations

- **WASM Build**: Uses `RUSTFLAGS='-C target-feature=+simd128'` for SIMD; scalar fallback for compatibility
- **Seasonal System**: Affects nearly all elements; tune in `GameConfig.js`
- **Element Registry**: New elements must be registered in both `init.js` and `elements/index.js`
- **Active Cell Tracking**: Critical for performance; don't break the tracking in `PixelGrid.js`
- **Private/Public Split**: This is the private dev repo; public repo is deployment only
