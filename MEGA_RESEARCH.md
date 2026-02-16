# MEGA RESEARCH: Pixellence Evolution Strategy

**Date:** 2026-02-14 | **Status:** Strategic Analysis Complete

---

## Table of Contents
1. [Sandboxels Deep Dive](#1-sandboxels-deep-dive)
2. [Feature Gap Analysis](#2-feature-gap-analysis)
3. [Vision: Full Substance Simulator](#3-vision-full-substance-simulator)
4. [Architecture for Reaction Engine](#4-architecture-for-reaction-engine)
5. [Monetization Strategy](#5-monetization-strategy)
6. [Phased Roadmap](#6-phased-roadmap)

---

## 1. Sandboxels Deep Dive

### 1.1 Overview
- **URL:** sandboxels.r74n.com | **GitHub:** R74nCom/sandboxels
- **First release:** December 15, 2021 | **Latest:** v1.13.2 (Jan 15, 2026)
- **GitHub stats:** 357 stars, 723 forks, 148 contributors
- **Language:** JavaScript (94%) + HTML (5.8%) — **NO WebGL, NO WASM**
- **Steam:** Released May 16, 2025 at $0.99 (Electron wrapper), 94% positive (709+ reviews)
- **License:** Open source

### 1.2 Element Count & Categories

**Total: 558+ elements** (231 hidden by default)

| Category | Count | Examples |
|----------|-------|---------|
| Liquids | 60 | Water, Oil, Acid, Blood, Milk, Vinegar, Honey |
| Solids | 53 | Stone, Metal, Wood, Brick, Glass, Diamond |
| Food | 50 | Bread, Cheese, Cake, Sugar, Butter, Chocolate |
| Life | 47 | Fish, Frog, Bird, Ant, Bee, Worm, Human, Bamboo |
| States | 43 | Molten variants, frozen variants, gas forms |
| Special | 38 | Portals, Void, Cloner, Wall |
| Powders | 37 | Sand, Salt, Flour, Gunpowder, Ash, Rust |
| Gases | 31 | Steam, Smoke, Hydrogen, Helium, Methane |
| Energy | 27 | Fire, Lightning, Electricity, Plasma, Laser |
| Land | 24 | Dirt, Mud, Clay, Gravel, Permafrost |
| Tools | 22 | Heat, Cool, Drag, Mix, Shock, Smash, Vacuum |
| Weapons | 21 | Bomb, Nuke, TNT, Missile, Napalm |
| Machines | 18 | Cloner, Filter, Gate, Pipe, Sensor, Grinder |

**Hidden elements (228):** Molten metals, frozen variants, biological byproducts, cooked foods, chemical compounds. Discoverable through reactions or unlockable via settings.

### 1.3 Reaction System (Key Differentiator)

**Declarative JSON-like reaction definitions** on each element:

```javascript
// Element definition with reactions
elements.sugar = {
    color: "#ffffff",
    behavior: behaviors.POWDER,
    category: "food",
    density: 1550,
    reactions: {
        "water": { elem1: null, elem2: "sugar_water" },
        "oil": { elem1: null, elem2: "caramel", tempMin: 160 }
    }
};
```

**Reaction properties:**
| Property | Purpose |
|----------|---------|
| `elem1` / `elem2` | What each reactant becomes (null = delete) |
| `chance` | Probability per tick (0-1) |
| `tempMin` / `tempMax` | Temperature range requirement |
| `oneway` | Only triggers on movement collision |
| `charged` | Requires electrical charge |
| `burning1` / `burning2` | Requires burning state |
| `color1` / `color2` | Set product colors |
| `temp1` / `temp2` | Set product temperatures |
| `attr1` / `attr2` | Apply custom attributes |
| `func` | Arbitrary JS function for complex logic |

**Why this matters:** Adding a new element with 10 reactions = adding 1 JS object with a `reactions` property. No modifying existing code. No interaction manager. Pure data.

### 1.4 Behavior System (3x3 Matrix DSL)

```javascript
behaviors.POWDER = [
    ["XX","XX","XX"],
    ["XX","XX","XX"],
    ["M2","M1","M2"]   // M1=primary move, M2=secondary
];

behaviors.LIQUID = [
    ["XX","XX","XX"],
    ["M2","XX","M2"],
    ["M2","M1","M2"]
];
```

**Instruction codes:** M1/M2 (move priority), DL (delete), CL (clone), SW (swap), HT/CO (heat/cool), CR:element (create), %chance (probabilistic)

### 1.5 Simulation Engine Architecture

- **Grid:** 2D sparse array `pixelMap[x][y]` — only occupied cells stored
- **Tick rate:** 30 TPS default, configurable
- **Update order:** Randomized pixel array per tick (prevents directional bias)
- **Rendering:** Canvas 2D API only — `ctx.fillRect()` per pixel, no batching
- **Pixel class:** {x, y, element, color, temp, id} — minimal per-pixel data
- **No chunks, no spatial partitioning** — iterates full active pixel list
- **Canvas sizes:** Tiny/Small/Medium/Wide/Large — user-selectable
- **Pixel limit:** Configurable max count, "Limitless Mode" toggle

### 1.6 Key Systems

| System | Implementation |
|--------|---------------|
| **Temperature** | Per-pixel `temp` in Celsius. `tempLow`/`tempHigh` thresholds trigger `stateLow`/`stateHigh` transitions. Heater/Cooler machine elements. Thermal view mode. |
| **Electricity** | `conductivity` (0-1) per element. Wire, Battery, Tesla Coil, RGB LED, Sensor, Gate. Charge propagation through conductive elements. |
| **Density** | kg/m³ per element. Denser sinks, lighter floats. Standard falling-sand gravity. |
| **Pressure** | Basic. No air pressure grid or velocity simulation (unlike Powder Toy). |
| **Fire** | 105 flammable elements. `burn` chance, `burnTime`, `burnInto`. Fire spread mechanic. |
| **Life/Biology** | 47+ life elements. Food chains, reproduction, growth. Primordial Soup → evolution. |
| **Food/Cooking** | Full cooking system. Mix ingredients → bake → food products. Viral on TikTok. |
| **Machines** | Cloner, Filter, Gate, Pipe, Sensor, Portal (channels). Emergent engineering. |

### 1.7 UI/UX

- **Element picker:** Categorized horizontal toolbar, arrow keys to change category
- **Search:** `E` key to search by name
- **View modes (5):** Normal, Thermal, Basic, Streak, Outline
- **Controls:** 40+ keyboard shortcuts for drawing, simulation, views, tools
- **Shift-enhanced tools:** Intensified Heat/Cool/Drag/Mix/Shock/Smash
- **Replace mode:** Toggle to replace existing pixels instead of skip
- **Info panel:** `I` key shows element details, reactions, properties
- **Mod Manager:** In-game (`M` key), load mods by URL
- **Save browser:** Featured / Discord / Steam Workshop tabs
- **Screenshot:** `C`/`F2` capture
- **Background images:** 6 defaults + custom URL

### 1.8 Modding

- **50+ community mods** at sandboxels.r74n.com/mod-list
- Mods loaded by filename or URL — pure JavaScript
- Separate mod repository: github.com/R74nCom/Sandboxels-Mods
- Full API access: add elements, modify behaviors, reactions, properties
- No compilation needed — instant loading

### 1.9 Competitive Landscape

| Game | Elements | Platform | Physics Depth | Life Sim | Price |
|------|----------|----------|--------------|----------|-------|
| **Sandboxels** | 558+ | Browser/Steam | Medium | Rich (47 life) | Free/$0.99 |
| **Powder Toy** | 258 | Desktop/Steam | Deep (pressure, nuclear) | Basic (GoL) | Free |
| **Noita** | N/A | Desktop | Deep (C++) | None (roguelite) | $20 |
| **Sandspiel** | ~10 | Browser | Minimal | Basic | Free |
| **Sand Saga** | ~50 | Browser | Medium | Humans | Free |
| **Pixellence** | 44 | iOS/Web | Medium (WASM) | Rich (fish/bird AI) | Free/£2.99 IAP |

---

## 2. Feature Gap Analysis

### 2.1 Comparison Table

| Feature | Pixellence (v4.5) | Sandboxels (v1.13) | Gap |
|---------|-------------------|---------------------|-----|
| **Total Elements** | 44 | 558+ | **CRITICAL: 12x fewer** |
| **Visible Elements** | 23 (7 free + 16 premium) | 330+ | **CRITICAL: 14x fewer** |
| **Element Categories** | ~5 implicit | 15 named | Major |
| **Reaction System** | Tag-based InteractionManager (17 rules) | Per-element declarative reactions (thousands) | **CRITICAL** |
| **Temperature** | Seasonal (-1 to +1 abstract) | Celsius per-pixel, state transitions | Major |
| **Electricity** | Basic (exists) | Full: Wire, Battery, LED, Sensor, Gate | Major |
| **Pressure** | None | Basic | Minor |
| **Food/Cooking** | None | 50 food elements, mixing, baking | Major |
| **Machines** | None | 18 machine elements (Cloner, Pipe, Filter) | Major |
| **Weapons/Explosives** | Gunpowder only | 21 weapons | Moderate |
| **Modding** | None | In-game mod manager, URL loading | Major |
| **Save Sharing** | Local only (20 slots) | Featured/Discord/Workshop browse | Major |
| **Discovery System** | IAP unlock only | Hidden elements discoverable via reactions | Major |
| **View Modes** | 1 (normal) | 5 (normal, thermal, basic, streak, outline) | Moderate |
| **Search/Navigation** | Horizontal scroll | Categorized + search by name | Moderate |
| **Tools** | Place/Erase/Brush | 10+ tools (Heat, Cool, Drag, Mix, Shock...) | Major |
| **Keyboard Shortcuts** | Minimal | 40+ | Moderate |

### 2.2 What Pixellence Does Better

| Advantage | Details |
|-----------|---------|
| **Native iOS App** | App Store presence, native performance, push notifications. Sandboxels = browser/PWA only. |
| **WASM Physics** | Rust/WASM SIMD engine. Sandboxels = pure JS with no optimization. |
| **Seasonal System** | 4 seasons with temperature, growth rates, visual changes, migration. Sandboxels has none. |
| **Day/Night Cycle** | Full celestial system: sun, moon phases, lighting. Sandboxels has none. |
| **Wind System** | Seasonal wind patterns affecting clouds, particles, leaves. Sandboxels has no wind. |
| **Creature AI** | Fish schooling (boids), hunger, reproduction, symbiosis. Deeper than Sandboxels' simple life. |
| **Fractal Trees** | Procedural tree generation with seasonal behavior. Sandboxels trees are simpler. |
| **Coral Ecosystem** | Health, overcrowding, fish symbiosis. No equivalent in Sandboxels. |
| **House Construction** | Multi-phase procedural building. Unique feature. |
| **Chunk System** | 32x32 spatial indexing for O(visible) updates. Sandboxels iterates all pixels. |
| **Active Cell Tracking** | Only updates changed cells (1-5% of grid). More efficient than Sandboxels' full array shuffle. |
| **WebGL Rendering** | Hardware-accelerated. Sandboxels = Canvas 2D `fillRect()` per pixel. |
| **Monetization** | IAP model works on App Store. Revenue from £2.99 unlock. |
| **Visual Polish** | Phaser engine, corona effects, celestial rendering, seasonal colors. |

### 2.3 Critical Gap Summary

**The #1 gap is element count and reaction variety.** Sandboxels wins on content by a 12:1 ratio. Their declarative reaction system makes adding new elements trivial — one object definition, no code changes elsewhere. Our tag-based InteractionManager requires modifying centralized code for each new interaction.

**The #2 gap is tools/interaction.** We have place and erase. They have 10+ manipulation tools.

**The #3 gap is discovery/engagement.** Their hidden element discovery system, cooking recipes, and community save browsing create a gameplay loop beyond sandbox. We have a binary IAP unlock.

---

## 3. Vision: Full Substance Simulator

### 3.1 Core Thesis

**Evolve Pixellence from a particle sandbox into a substance simulator** — where the joy comes from discovering what happens when you combine things. Make it the "cooking game meets chemistry set meets ecosystem builder" for mobile.

**Target:** 200+ elements within 6 months, 500+ within 12 months.

**Key insight from Sandboxels:** Content scales when the reaction system is declarative. One developer can add 10 elements per day when they only need to write data objects, not code.

### 3.2 New or Evolve Current?

**EVOLVE CURRENT.** Reasons:

1. **iOS App Store presence** — existing listing, reviews, users. Starting over = losing this.
2. **Core engine is solid** — chunk system, WASM bridge, active cell tracking are superior to Sandboxels.
3. **Architecture fits** — the tag-based system can be extended with a declarative reaction layer on top.
4. **Seasonal/celestial/wind systems** — these are differentiators worth keeping.
5. **Creature AI** — fish/bird behavior is best-in-class, worth building on.
6. **Save system works** — just needs sharing/discovery features added.

### 3.3 Pure JS vs Rust/WASM

**Keep WASM for core physics (gravity, density, fluid flow). Add JS-only reaction engine on top.**

Rationale:
- Reactions are data-driven lookups, not compute-intensive — JS is fine
- The WASM engine handles the hot path (moving millions of pixels)
- Reaction checks happen per-interaction, not per-pixel-per-frame
- Modding/extensibility is easier in JS
- Temperature propagation could optionally move to WASM later if needed

### 3.4 Architectural Changes Needed

#### A. Declarative Reaction Engine (NEW — replaces parts of InteractionManager)

```javascript
// New: Element definition with inline reactions
export const SUGAR = {
    id: 60,
    name: 'sugar',
    color: 0xffffff,
    state: STATE.POWDER,
    density: 3,
    tags: [TAG.ORGANIC, TAG.DISSOLVES],
    temp: 20,                    // NEW: Celsius temperature
    tempHigh: 186, stateHigh: 'caramel',  // NEW: state transition
    tempLow: -5,  stateLow: 'frozen_sugar',
    reactions: {                  // NEW: declarative reactions
        water:  { elem1: null, elem2: 'sugar_water' },
        acid:   { elem1: 'carbon', elem2: 'steam', chance: 0.3 },
        fire:   { elem1: 'caramel', chance: 0.1, tempMin: 100 }
    },
    behavior: 'POWDER'           // Maps to existing GravityBehavior
};
```

**Keep the existing tag system** for broad-category interactions (COMBUSTIBLE + HEAT_SOURCE = ignition). **Add reactions** for specific element-to-element rules. Process reactions AFTER tag interactions.

#### B. Per-Pixel Temperature System (UPGRADE)

Current: Abstract seasonal temperature (-1 to +1) affects elements globally.
New: Each cell gets a `temp` value in Celsius. Temperature diffuses to neighbors.

```
// Temperature diffusion (runs in WASM hot path)
newTemp[i] = temp[i] + diffusionRate * (
    temp[up] + temp[down] + temp[left] + temp[right] - 4 * temp[i]
);
```

State transitions checked per-cell: if `temp > element.tempHigh` → transform.
Seasonal system becomes the **ambient temperature** that empty cells trend toward.

#### C. Element Registry Refactor

Current: Each element = separate class file + registration in init.js + elements/index.js.
New: Elements defined as **data objects** in category files, auto-registered.

```
src/elements/
  categories/
    liquids.js      // { water, oil, acid, blood, milk, ... }
    powders.js      // { sand, salt, flour, sugar, gunpowder, ... }
    solids.js       // { stone, wood, glass, brick, metal, ... }
    gases.js        // { steam, smoke, hydrogen, methane, ... }
    life.js         // { fish, bird, frog, ant, worm, ... }
    food.js         // { bread, cheese, cake, butter, ... }
    energy.js       // { fire, lightning, electricity, ... }
    machines.js     // { cloner, pipe, filter, sensor, ... }
    weapons.js      // { bomb, tnt, napalm, ... }
    land.js         // { dirt, mud, clay, gravel, ... }
  ElementRegistry.js  // Auto-discovers all category files
```

Elements with complex AI (fish, bird, tree_seed) keep behavior classes. Simple elements are pure data.

#### D. Tool System (NEW)

```javascript
// Tool definitions (data-driven)
const TOOLS = {
    heat:  { cursor: 'heat',  effect: (x,y,grid) => grid.addTemp(x,y, +50) },
    cool:  { cursor: 'cool',  effect: (x,y,grid) => grid.addTemp(x,y, -50) },
    drag:  { cursor: 'drag',  effect: (x,y,grid,dx,dy) => grid.movePixel(x,y,dx,dy) },
    mix:   { cursor: 'mix',   effect: (x,y,grid) => grid.shuffleArea(x,y,radius) },
    smash: { cursor: 'smash', effect: (x,y,grid) => grid.breakSolids(x,y,radius) },
};
```

---

## 4. Architecture for Reaction Engine

### 4.1 ReactionEngine.js (New Core Module)

```javascript
class ReactionEngine {
    constructor() {
        this.reactionLookup = new Map();  // "elem1:elem2" → reaction[]
    }

    // Build lookup table from all registered elements
    buildLookup(elementRegistry) {
        for (const [name, def] of elementRegistry.entries()) {
            if (!def.reactions) continue;
            for (const [target, reaction] of Object.entries(def.reactions)) {
                const key = `${name}:${target}`;
                this.reactionLookup.set(key, { ...reaction, source: name });
            }
        }
    }

    // Check if two adjacent pixels should react
    checkReaction(pixel1, pixel2, grid) {
        const key = `${pixel1.elementName}:${pixel2.elementName}`;
        const reaction = this.reactionLookup.get(key);
        if (!reaction) return false;

        // Check conditions
        if (reaction.chance && Math.random() > reaction.chance) return false;
        if (reaction.tempMin && pixel1.temp < reaction.tempMin) return false;
        if (reaction.tempMax && pixel1.temp > reaction.tempMax) return false;
        if (reaction.charged && !pixel1.charged) return false;

        // Apply reaction
        this.applyReaction(pixel1, pixel2, reaction, grid);
        return true;
    }

    applyReaction(pixel1, pixel2, reaction, grid) {
        if (reaction.func) {
            reaction.func(pixel1, pixel2, grid);
            return;
        }
        if (reaction.elem1 === null) grid.removeCell(pixel1.x, pixel1.y);
        else if (reaction.elem1) grid.transformCell(pixel1.x, pixel1.y, reaction.elem1);
        if (reaction.elem2 === null) grid.removeCell(pixel2.x, pixel2.y);
        else if (reaction.elem2) grid.transformCell(pixel2.x, pixel2.y, reaction.elem2);

        if (reaction.temp1 != null) pixel1.temp = reaction.temp1;
        if (reaction.temp2 != null) pixel2.temp = reaction.temp2;
    }
}
```

### 4.2 Integration with Existing InteractionManager

```
Update Loop (per active cell):
  1. Physics behaviors (gravity, liquid flow, gas rise) — existing WASM path
  2. Tag-based interactions (COMBUSTIBLE + HEAT_SOURCE) — existing InteractionManager
  3. Element-specific reactions — NEW ReactionEngine
  4. Temperature diffusion — NEW (WASM or JS)
  5. State transition check — NEW (tempHigh/tempLow → transform)
```

Tag interactions handle **broad categories** (anything combustible catches fire).
Reactions handle **specific pairs** (sugar + water = sugar_water).
No conflicts — reactions run after tags, can override or complement.

### 4.3 State Transition System

```javascript
// Per-frame check for each active cell
function checkStateTransitions(cell, grid) {
    const def = elementRegistry.get(cell.elementName);
    if (def.tempHigh && cell.temp >= def.tempHigh && def.stateHigh) {
        grid.transformCell(cell.x, cell.y, def.stateHigh);
    }
    if (def.tempLow && cell.temp <= def.tempLow && def.stateLow) {
        grid.transformCell(cell.x, cell.y, def.stateLow);
    }
}
```

This enables:
- Ice → Water → Steam (tempHigh chain)
- Sand → Glass (at ~1700°C with heat tool)
- Metal → Molten Metal → Metal (cool back down)
- Wood → Charcoal → Ash (burning chain)

### 4.4 Temperature System Design

**Option A: Full per-pixel (Sandboxels approach)**
- Every pixel has `temp` in Celsius
- Diffusion every N frames
- Cost: O(activeCells) per frame for diffusion
- Benefit: Precise, enables thermal view mode

**Option B: Hybrid (recommended for mobile)**
- Active pixels have `temp`
- Temperature only diffuses when near heat/cold sources (within radius)
- Ambient temperature from seasonal system fills gaps
- Cost: Much lower than full diffusion
- Benefit: Mobile-friendly performance

**Recommendation: Option B** — start with hybrid, upgrade to full if performance allows.

---

## 5. Monetization Strategy

### 5.1 Current Model Analysis

- £2.99 IAP for 16 premium elements (NON_CONSUMABLE)
- 7 free elements
- Binary unlock (all or nothing)

**Problem:** With 44 elements total, the value proposition is thin. At 200+ elements, this gets more compelling.

### 5.2 Proposed Tiered Model

**Tier 0 — Free (Sandbox Basics):** 30-40 elements
- All current free elements + expanded basics
- Sand, Water, Fire, Stone, Wood, Wall, Eraser
- Steam, Smoke, Ice, Snow, Oil, Dirt, Mud, Clay
- Basic tools: Place, Erase, Brush sizes
- 5 save slots, local only
- Full seasonal/celestial systems (differentiator — keep free)

**Tier 1 — Explorer Pack (£1.99):** +40 elements
- Metals: Copper, Iron, Gold, Silver
- Chemicals: Acid, Hydrogen, Oxygen, Chlorine
- Life basics: Seeds, Grass, Vine, Fish, Bird
- Tools: Heat, Cool, Drag
- 10 save slots

**Tier 2 — Full Unlock (£3.99):** +100 elements (all content)
- All elements including Food, Machines, Weapons, Advanced Life
- All tools including Mix, Smash, Shock
- Unlimited save slots
- Hidden element discovery tracking
- Thermal view mode

**Tier 3 — Restore Previous Purchase**
- Existing £2.99 buyers auto-upgraded to Tier 2

### 5.3 Alternative: Keep Single IAP, Increase Value

Simpler approach — keep single £2.99 unlock but make it unlock 200+ elements instead of 16. Free tier gets 40 elements. The sheer volume of content makes £2.99 feel like a steal.

**Recommendation:** Single IAP (simplicity), but expand free tier to 30-40 elements to hook users. The seasonal/celestial/ecosystem stuff stays free as the differentiator that makes people say "this is better than Sandboxels on mobile."

### 5.4 Revenue Comparison

| Model | Sandboxels | Proposed Pixellence |
|-------|-----------|-------------------|
| Browser/web | Free forever | Free (GitHub Pages) |
| Steam/Desktop | $0.99 | N/A |
| iOS | N/A (browser only) | Free + £2.99 IAP |
| Ads | None | None |
| Subscription | None | None |

**Our iOS advantage:** Sandboxels has NO native mobile app. No App Store presence. Their mobile experience is a responsive web page. We own the "premium mobile substance simulator" niche.

---

## 6. Phased Roadmap

### Phase 1: Quick Wins (1 Week)

**Goal:** More content without architectural changes. Prove the hypothesis that more elements = more engagement.

| Task | Effort | Impact |
|------|--------|--------|
| Add 15 simple elements using existing system | 2 days | High |
| — Dirt, Mud, Clay, Salt, Rust, Charcoal | | |
| — Hydrogen, Oxygen, Nitrogen (gases) | | |
| — Copper, Iron, Gold (metals) | | |
| — Honey, Milk, Blood (liquids) | | |
| Categorize element picker (tabs/sections) | 1 day | Medium |
| Add Heat/Cool tools (modify seasonal temp locally) | 1 day | Medium |
| Add Thermal View mode (color by temperature) | 0.5 day | Medium |
| Add element search (type to filter) | 0.5 day | Medium |
| Bump to v5.0.0 | — | — |

**New element count: ~60 (from 44)**

### Phase 2: Core Systems (2-3 Weeks)

**Goal:** Build the reaction engine and temperature system. This is the architectural investment that makes Phase 3 (mass content) possible.

| Task | Effort | Impact |
|------|--------|--------|
| **ReactionEngine.js** — declarative reaction processor | 3 days | Critical |
| **Per-pixel temperature** — hybrid approach | 3 days | Critical |
| **State transition system** — tempHigh/tempLow chains | 2 days | Critical |
| **Element data format** — migrate to category data files | 2 days | High |
| **ElementRegistry refactor** — auto-discover, validate | 1 day | High |
| **Tool system** — Heat, Cool, Drag, Mix, Smash | 2 days | High |
| **Discovery system** — track which reactions player has found | 1 day | High |
| **Hidden element reveal** — elements unlocked by reactions | 1 day | Medium |
| Migrate all 60 elements to new data format | 2 days | Required |
| Test & stabilize | 2 days | Required |

**Architecture after Phase 2:**
```
PixelGrid (WASM physics) → InteractionManager (tag rules)
                          → ReactionEngine (specific pairs)
                          → TemperatureSystem (diffusion + state change)
```

### Phase 3: Content Explosion (4-6 Weeks)

**Goal:** Reach 200+ elements. With the reaction engine in place, adding elements is purely data work — no new code per element.

**Week 1-2: Foundation Elements (50 new)**

| Category | New Elements |
|----------|-------------|
| Liquids (+10) | Vinegar, Alcohol, Mercury, Sap, Syrup, Juice, Bleach, Gasoline, Soap water, Ink |
| Powders (+10) | Flour, Baking soda, Sulfur, Calcium, Sodium, Potassium, Sugar, Sawdust, Cement powder, Fertilizer |
| Metals (+8) | Silver, Tin, Lead, Aluminum, Tungsten, Bronze, Steel, Brass |
| Gases (+7) | Carbon dioxide, Ammonia, Chlorine gas, Propane, Helium, Neon, Natural gas |
| States (+15) | Molten variants for all metals, frozen variants for all liquids |

**Week 3-4: Life & Food (40 new)**

| Category | New Elements |
|----------|-------------|
| Life (+15) | Ant, Bee, Frog, Tadpole, Worm, Slug, Mushroom, Algae, Moss, Pollen, Bacteria, Virus, Cell, DNA, Egg |
| Food (+15) | Bread, Cheese, Cake, Butter, Sugar, Chocolate, Flour, Dough, Batter, Toast, Soup, Stew, Caramel, Jam, Honey |
| Plants (+10) | Bamboo, Flower, Cactus, Seaweed, Moss, Fern, Rose, Sunflower, Wheat, Corn |

**Week 5-6: Machines & Special (30 new)**

| Category | New Elements |
|----------|-------------|
| Machines (+10) | Cloner, Pipe, Filter, Gate, Sensor, Conveyor, Pump, Funnel, Mixer, Heater element |
| Energy (+8) | Electricity wire, Battery, LED, Tesla coil, Laser, Solar panel, Nuclear fuel, Plasma |
| Weapons (+7) | Bomb, TNT, Dynamite, Napalm, Missile, Firework, C4 |
| Special (+5) | Portal, Void, Spawner, Timer, Counter |

**Element count after Phase 3: ~230+**

### Phase 4: Community & Polish (Ongoing)

| Feature | Effort | Impact |
|---------|--------|--------|
| **Save sharing** — browse community saves in-app | 2 weeks | High |
| **Recipe book** — track discovered reactions | 1 week | High |
| **Challenges** — "Make water from hydrogen + oxygen" | 2 weeks | High |
| **Achievement system** — discover N reactions, create N elements | 1 week | Medium |
| **Custom element editor** — player-created elements (advanced) | 3 weeks | Medium |
| **More view modes** — Streak, Outline, X-ray | 1 week | Medium |
| **Tutorial system** — guided first-time experience | 1 week | Medium |
| **Analytics** — which elements are most popular, retention | 1 week | Low |

---

## Appendix A: Sandboxels Technical Details (from Source)

### Lite Engine (lite.html — simplified reference implementation)

```javascript
// Core pixel class
class Pixel {
    constructor(x, y, element) {
        this.x = x; this.y = y; this.element = element;
        this.color = pixelColorPick(this);
        this.temp = elementInfo.temp || airTemp;
        this.id = currentID++;
        pixelMap[x][y] = this;
    }
}

// Main tick loop
function tick() {
    if (mouseIsDown) { /* process input */ }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPixels();  // Update + render combined
    tickCount++;
}

// Shuffle pixels for unbiased processing
var shuffled = currentPixels.slice();
shuffled.sort(() => 0.5 - Math.random());
```

### Element Property Reference (Sandboxels Modding API)

| Property | Type | Description |
|----------|------|-------------|
| `color` | string/array | Hex color(s) for random variation |
| `behavior` | array | 3x3 behavior matrix |
| `behaviorOn` | array | Behavior when "on" (powered) |
| `reactions` | object | Element-to-element reaction rules |
| `category` | string | UI category name |
| `density` | number | kg/m³ |
| `state` | string | "solid", "liquid", "gas" |
| `temp` | number | Default temperature (°C) |
| `tempHigh` | number | Upper state transition threshold |
| `tempLow` | number | Lower state transition threshold |
| `stateHigh` | string | Element to become when heated |
| `stateLow` | string | Element to become when cooled |
| `burn` | number | Burn chance (0-1) |
| `burnTime` | number | Ticks to burn |
| `burnInto` | string | Element after burning |
| `conduct` | number | Electrical conductivity (0-1) |
| `hardness` | number | Resistance to breaking |
| `hidden` | boolean | Hidden from default element list |
| `tick` | function | Custom per-tick logic |
| `properties` | object | Custom properties template |
| `movable` | boolean | Can be moved by tools |
| `insulate` | boolean | Blocks temperature transfer |

---

## Appendix B: Pixellence Current Architecture (v4.5)

### Element Summary (44 total)

| Category | Count | Elements |
|----------|-------|----------|
| Basic (Free) | 7 | Fire, Water, Sand, Stone, Wood, Wall, Eraser |
| Premium | 16 | Steam Vent, Oil, Lava, Acid, Slush, Gunpowder, Snow, Ice, Glass, Coal, Tree Seed, Vine, Fish, Bird, Coral, House Seed |
| Byproducts | 10 | Smoke, Steam, Ash, Burning Wood, Burning Coal, Tree Trunk, Tree Branch, Leaf, Wet Sand, Obsidian |
| Creatures | 4 | Fish, Bird, Fish Egg, Bird Egg |
| Special | 7 | Empty, Player, Light, Cloud, Grass Seed, Fossil, Electricity |

### Interaction Rules (17 total)

| Priority | Rule | Elements |
|----------|------|----------|
| 0 | Lava + Water solidification | lava ↔ water |
| 5 | Ignition | HEAT_SOURCE + COMBUSTIBLE |
| 7 | Fire extinguishing | EXTINGUISHES_FIRE + fire |
| 8 | Steam + ice condensation | steam + ice |
| 10 | Evaporation | EVAPORATES + HEAT_SOURCE |
| 15 | Oxidation | OXIDIZER + HEAT_SOURCE |
| 15 | Oil/water separation | oil + water |
| 16 | Steam condensation | steam + solid surfaces |
| 17 | Wet sand formation | water + sand |

### Performance Architecture
- Chunk system: 32x32 spatial partitioning
- Active cell tracking: Map<numericKey, {x,y}>
- Row-grouped bottom-to-top updates
- Interaction checks every 2 frames
- WASM bridge for core physics (optional)

---

## Appendix C: Key Decisions

### Decision 1: Evolve, Don't Rewrite
Pixellence has 6 months of development, a working iOS app, and architectural advantages (chunks, WASM, active cell tracking) over Sandboxels. The gap is content and reaction system, not engine.

### Decision 2: Hybrid Architecture
Keep tag-based interactions for broad categories. Add declarative reactions for specific pairs. Both systems coexist. This is exactly what a Sandboxels-scale game needs — broad rules + specific overrides.

### Decision 3: Data-Driven Elements
Simple elements should be pure data objects (no class inheritance). Complex elements (fish AI, tree generation) keep behavior classes but conform to the same data schema. This enables rapid content scaling.

### Decision 4: Mobile-First Differentiation
Sandboxels has zero native mobile presence. Our seasonal system, celestial mechanics, creature AI, and visual polish make us the premium mobile substance simulator. Lean into this.

### Decision 5: Temperature Hybrid
Full per-pixel temperature is expensive on mobile. Start with hybrid (active diffusion near sources, ambient from seasonal). Upgrade later if hardware allows.

---

*Research compiled from: Sandboxels GitHub (R74nCom/sandboxels), Sandboxels Wiki (wiki.gg), Sandboxels press kit, Steam page, educational documentation, Powder Toy wiki, Noita GDC talks, Sand Saga blog, and Pixellence source code analysis.*
