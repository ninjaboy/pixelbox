# PixelBoxx: Scaling to 1 Million Pixels

## Architecture Implementation Plan

**Date:** December 2024
**Target:** 1,000,000 active pixels @ 60 FPS
**Technologies:** Rust + WebAssembly + WebGL2

---

## Executive Summary

This document outlines the technical approach to scale PixelBoxx from ~1,500 active particles to 1,000,000 particles while maintaining 60 FPS performance.

| Metric | Current | Target | Scale Factor |
|--------|---------|--------|--------------|
| Active Particles | ~1,500 | 1,000,000 | **667x** |
| Grid Size | 200×150 | 1000×1000 | **33x** |
| Memory/Cell | ~200 bytes | 4 bytes | **50x reduction** |
| Physics Time | 8-11ms | <8ms | Must reduce |

---

## Current Architecture Analysis

### Data Structures (`src/PixelGrid.js`)

```javascript
// Current: Object per cell (~200 bytes each)
grid[y][x] = {
    element: Element,      // Object reference
    lifetime: number,
    updated: boolean,
    state: new CellState(), // Another object
    data: {}               // Dynamic properties
}
```

**Problems:**
- Object allocation overhead
- GC pressure with 1M objects
- Cache-unfriendly memory layout
- 200MB+ memory for 1M cells

### Physics Loop (`src/PixelGrid.js:204-279`)

- Single-threaded JavaScript
- Sequential cell processing
- O(n×8) interaction checking
- ~8μs per cell = 8 seconds for 1M cells

### Rendering (`src/main.js:884-998`)

- Canvas2D via Phaser.js
- Color batching (good optimization)
- CPU-bound fillRect calls
- ~4ms for 1,500 particles

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Browser (JavaScript)                  │
│  ┌────────────────┐     ┌────────────────────────────┐  │
│  │   UI Layer     │     │   Game Coordinator (JS)    │  │
│  │   - Input      │     │   - Time/day-night cycle   │  │
│  │   - Menus      │     │   - Season/weather mgmt    │  │
│  │   - HUD        │     │   - Save/load orchestration│  │
│  └────────────────┘     └─────────────┬──────────────┘  │
│                                       │                  │
│  ┌────────────────────────────────────▼──────────────┐  │
│  │              WebAssembly Module (Rust)             │  │
│  │  ┌─────────────────┐  ┌─────────────────────────┐ │  │
│  │  │   Grid Data     │  │   Physics Engine        │ │  │
│  │  │   Uint32Array   │  │   - SIMD gravity/flow   │ │  │
│  │  │   4 bytes/cell  │  │   - Spatial hash        │ │  │
│  │  │   4MB for 1M    │  │   - Dirty regions       │ │  │
│  │  └─────────────────┘  └─────────────────────────┘ │  │
│  │  ┌─────────────────────────────────────────────┐  │  │
│  │  │   Element Behaviors (Rust)                   │  │  │
│  │  │   - Sand, Water, Fire, Lava, etc.           │  │  │
│  │  │   - Interactions (burn, melt, dissolve)     │  │  │
│  │  └─────────────────────────────────────────────┘  │  │
│  └───────────────────────┬───────────────────────────┘  │
│                          │ Zero-copy memory view        │
│  ┌───────────────────────▼───────────────────────────┐  │
│  │             WebGL2 Renderer                        │  │
│  │   - Cell data as GPU texture                      │  │
│  │   - Single instanced draw call                    │  │
│  │   - Shader-based lighting & effects               │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Core Technical Changes

### 1. Data Structure: Flat Packed Arrays

**New cell format (4 bytes per cell):**

```
Byte 0: element_id    (0-255 element types)
Byte 1: flags         (bit flags for state)
Byte 2: lifetime      (0-255 frames, 255 = infinite)
Byte 3: variant       (color variation, direction, etc.)

Flags byte:
  bit 0: updated this frame
  bit 1: is_burning
  bit 2: is_wet
  bit 3: is_frozen
  bit 4: has_velocity
  bit 5: is_surface (for lava glow, etc.)
  bit 6-7: reserved
```

**Rust implementation:**

```rust
#[wasm_bindgen]
pub struct PixelGrid {
    cells: Vec<u32>,           // Packed cell data (4MB for 1M)
    width: u32,
    height: u32,

    // Sparse data for special cases
    velocities: FxHashMap<u32, (i8, i8)>,  // Only moving particles
    custom_data: FxHashMap<u32, u32>,       // Fish colors, bird states, etc.

    // Optimization structures
    dirty_regions: BitVec,     // 64x64 cell regions
    active_buckets: Vec<u32>,  // Spatial hash buckets with activity
}

impl PixelGrid {
    #[inline]
    fn get_element(&self, idx: usize) -> u8 {
        (self.cells[idx] & 0xFF) as u8
    }

    #[inline]
    fn set_element(&mut self, idx: usize, element_id: u8) {
        self.cells[idx] = (self.cells[idx] & 0xFFFFFF00) | element_id as u32;
    }
}
```

### 2. SIMD Physics Processing

**What is SIMD?**

SIMD (Single Instruction, Multiple Data) processes multiple values in one CPU cycle:

```
Normal:  Process 1 cell per cycle
SIMD:    Process 4-8 cells per cycle (128-bit or 256-bit registers)
```

**WASM SIMD (128-bit) processes 4 cells simultaneously:**

```rust
use std::simd::*;

fn update_sand_row_simd(grid: &mut PixelGrid, y: usize) {
    let row_start = y * grid.width as usize;
    let below_start = (y + 1) * grid.width as usize;

    // Process 4 cells at a time
    for x in (0..grid.width as usize).step_by(4) {
        let idx = row_start + x;
        let below_idx = below_start + x;

        // Load 4 cells into SIMD register
        let current = u32x4::from_slice(&grid.cells[idx..idx+4]);
        let below = u32x4::from_slice(&grid.cells[below_idx..below_idx+4]);

        // Extract element IDs (all 4 in parallel)
        let current_ids = current & u32x4::splat(0xFF);
        let below_ids = below & u32x4::splat(0xFF);

        // Check conditions (all 4 in parallel)
        let is_sand = current_ids.simd_eq(u32x4::splat(SAND_ID));
        let below_empty = below_ids.simd_eq(u32x4::splat(EMPTY_ID));
        let can_fall = is_sand & below_empty;

        // Perform swaps where can_fall is true
        // ... (swap logic)
    }
}
```

**Mobile compatibility:**

| Platform | SIMD Support | Width |
|----------|--------------|-------|
| Desktop (Chrome/Firefox/Safari) | Yes | 128-bit |
| iOS Safari 16.4+ | Yes | 128-bit |
| Android Chrome 91+ | Yes | 128-bit |
| Older browsers | Fallback to scalar | N/A |

### 3. Spatial Partitioning for Interactions

**Current: O(n × 8) neighbor checks**
```
1M cells × 8 neighbors = 8M lookups per frame
```

**Optimized: Spatial hash buckets**
```rust
const BUCKET_SIZE: u32 = 32;  // 32x32 cells per bucket

struct SpatialHash {
    // For 1024x1024 grid: 32x32 = 1024 buckets
    buckets: Vec<Vec<u32>>,  // bucket -> list of active cell indices
    bucket_activity: BitVec, // Which buckets have interactable elements
}

impl SpatialHash {
    fn get_bucket(&self, x: u32, y: u32) -> usize {
        let bx = x / BUCKET_SIZE;
        let by = y / BUCKET_SIZE;
        (by * (self.width / BUCKET_SIZE) + bx) as usize
    }

    fn check_interactions_in_bucket(&self, bucket_id: usize, grid: &mut PixelGrid) {
        // Only check cells within the same bucket
        // Reduces checks from 8M to ~100K
    }
}
```

### 4. WebGL2 Instanced Rendering

**Current: Canvas2D (CPU-bound)**
```javascript
// 1000+ draw calls
for (const [color, particles] of particlesByColor) {
    ctx.fillStyle = color;
    for (const coords of particles) {
        ctx.fillRect(x, y, size, size);  // CPU draw
    }
}
```

**New: WebGL2 (GPU-accelerated)**
```javascript
class WebGLRenderer {
    constructor(canvas, wasmModule) {
        this.gl = canvas.getContext('webgl2');
        this.cellTexture = this.gl.createTexture();
        this.paletteTexture = this.createPaletteTexture();
        this.shader = this.createShader();
    }

    render() {
        const gl = this.gl;

        // Upload cell data directly from WASM memory (zero-copy)
        const cellData = new Uint8Array(
            wasmModule.memory.buffer,
            wasmModule.cells_ptr(),
            this.width * this.height
        );

        gl.bindTexture(gl.TEXTURE_2D, this.cellTexture);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.R8UI,
            this.width, this.height, 0,
            gl.RED_INTEGER, gl.UNSIGNED_BYTE, cellData
        );

        // Single draw call renders entire grid
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
}
```

**Fragment shader:**
```glsl
#version 300 es
precision highp float;
precision highp usampler2D;

uniform usampler2D u_cells;
uniform sampler2D u_palette;
uniform vec3 u_lightingColor;
uniform float u_time;

out vec4 fragColor;

void main() {
    ivec2 cellCoord = ivec2(gl_FragCoord.xy);
    uint cellData = texelFetch(u_cells, cellCoord, 0).r;

    uint elementId = cellData & 0xFFu;
    uint variant = (cellData >> 24) & 0xFFu;

    // Lookup base color from palette
    vec4 color = texelFetch(u_palette, ivec2(elementId, variant), 0);

    // Apply day/night lighting
    color.rgb *= u_lightingColor;

    // Special effects (lava glow, etc.)
    uint flags = (cellData >> 8) & 0xFFu;
    if ((flags & 0x20u) != 0u) {  // is_surface flag
        color.rgb += vec3(0.2, 0.1, 0.0) * sin(u_time * 3.0);
    }

    fragColor = color;
}
```

---

## Implementation Phases

### Phase 1: Rust WASM Foundation (Week 1-2)

**Goal:** Basic physics in Rust, 100K pixels @ 60 FPS

**Tasks:**
- [ ] Set up Rust + wasm-pack toolchain
- [ ] Create `wasm/` directory with Cargo.toml
- [ ] Implement `PixelGrid` struct with flat u32 array
- [ ] Port basic elements: Empty, Sand, Water, Stone, Wall
- [ ] Implement gravity behavior (powder falling)
- [ ] Implement liquid flow behavior
- [ ] Create JS bridge (`WasmBridge.js`)
- [ ] Benchmark against current JS implementation

**File structure:**
```
pixelboxx/
├── wasm/
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs           # WASM entry, exports
│   │   ├── grid.rs          # PixelGrid struct
│   │   ├── physics.rs       # Update loop
│   │   ├── elements/
│   │   │   ├── mod.rs
│   │   │   ├── sand.rs
│   │   │   ├── water.rs
│   │   │   ├── fire.rs
│   │   │   └── ...
│   │   └── interactions.rs  # Element interactions
│   └── tests/
├── src/
│   ├── WasmBridge.js        # NEW: JS↔WASM interface
│   ├── main.js              # Modified: Use WASM for physics
│   └── ...
```

**Cargo.toml:**
```toml
[package]
name = "pixelboxx-wasm"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
js-sys = "0.3"
web-sys = { version = "0.3", features = ["console"] }
fxhash = "0.2"  # Fast hashing for HashMaps

[profile.release]
opt-level = 3
lto = true

[package.metadata.wasm-pack.profile.release]
wasm-opt = ["-O4"]
```

### Phase 2: WebGL2 Renderer (Week 2-3)

**Goal:** GPU-accelerated rendering, 500K pixels @ 60 FPS

**Tasks:**
- [ ] Create `WebGLRenderer.js` class
- [ ] Implement cell texture upload from WASM memory
- [ ] Create color palette texture (element ID → color)
- [ ] Write vertex/fragment shaders
- [ ] Implement day/night lighting in shader
- [ ] Add glow effects for lava/lights (post-processing)
- [ ] Remove Phaser.js dependency (optional)
- [ ] Benchmark rendering performance

### Phase 3: SIMD Optimization (Week 3-4)

**Goal:** SIMD-accelerated physics, 800K pixels @ 60 FPS

**Tasks:**
- [ ] Enable SIMD in Cargo.toml: `target-feature=+simd128`
- [ ] Rewrite sand/powder physics with `std::simd`
- [ ] Rewrite liquid flow with SIMD
- [ ] Implement spatial hash for interactions
- [ ] Add dirty region tracking
- [ ] Implement SIMD fallback for older browsers
- [ ] Benchmark SIMD vs scalar performance

### Phase 4: Full Element Port (Week 4-5)

**Goal:** All 30+ elements working, 1M pixels @ 60 FPS

**Tasks:**
- [ ] Port remaining elements to Rust:
  - [ ] Fire, Smoke, Steam
  - [ ] Lava, Acid, Oil
  - [ ] Ice, Snow, Slush
  - [ ] Wood, Coal, Gunpowder
  - [ ] Tree, Vine, Coral
  - [ ] Fish, Bird (AI behaviors)
  - [ ] House builder system
- [ ] Port all interactions (burn, melt, freeze, dissolve)
- [ ] Implement seasonal behaviors
- [ ] Port save/load serialization

### Phase 5: Polish & Mobile (Week 5-6)

**Goal:** Production-ready across all devices

**Tasks:**
- [ ] Implement adaptive quality (auto-detect device capability)
- [ ] Add quality presets (Low/Medium/High/Ultra)
- [ ] Optimize JS↔WASM boundary (minimize calls)
- [ ] Add Web Worker for non-blocking physics (optional)
- [ ] Test on mobile devices (iOS Safari, Android Chrome)
- [ ] Memory profiling and optimization
- [ ] Final benchmarks and documentation

---

## Performance Targets by Device

| Device Class | Example | Target Pixels | Target FPS |
|--------------|---------|---------------|------------|
| Desktop | Any modern PC | 1,000,000 | 60 |
| Gaming laptop | MacBook Pro M3 | 1,000,000 | 60 |
| Flagship mobile | iPhone 15 Pro | 400,000 | 60 |
| Mid-range mobile | Pixel 7a | 160,000 | 60 |
| Budget mobile | Moto G | 60,000 | 60 |
| Old/low-end | 2018 phone | 30,000 | 30 |

**Adaptive quality implementation:**
```javascript
async function detectOptimalSettings() {
    const gpu = await navigator.gpu?.requestAdapter();
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    const isMobile = /Mobile|Android|iPhone/i.test(navigator.userAgent);

    // Run quick benchmark
    const benchmarkScore = await runPhysicsBenchmark();

    if (benchmarkScore > 800 && memory >= 8) {
        return { gridSize: 1000, quality: 'ultra' };    // 1M pixels
    } else if (benchmarkScore > 500 && memory >= 6) {
        return { gridSize: 700, quality: 'high' };      // 490K pixels
    } else if (benchmarkScore > 300 && memory >= 4) {
        return { gridSize: 500, quality: 'medium' };    // 250K pixels
    } else if (benchmarkScore > 150) {
        return { gridSize: 350, quality: 'low' };       // 122K pixels
    } else {
        return { gridSize: 200, quality: 'minimal' };   // 40K pixels
    }
}
```

---

## Risk Mitigation

### Risk 1: WASM SIMD not supported
**Mitigation:** Compile two WASM binaries (SIMD and scalar), detect at runtime

### Risk 2: WebGL not available
**Mitigation:** Keep Canvas2D fallback renderer for compatibility

### Risk 3: Complex elements (Fish, Bird AI) too slow
**Mitigation:** Cap AI entities at ~1000 regardless of grid size

### Risk 4: Save files too large (1M cells)
**Mitigation:** Run-length encoding, only save non-empty cells

### Risk 5: Mobile battery drain
**Mitigation:** Reduce update rate when backgrounded, power-saving mode

---

## Success Metrics

1. **Performance:** 1M active pixels @ 60 FPS on desktop
2. **Mobile:** 100K+ pixels @ 60 FPS on mid-range phone
3. **Memory:** <50MB total memory usage
4. **Load time:** <3 seconds WASM initialization
5. **Compatibility:** Works on 95%+ of browsers (2020+)

---

## References

- [wasm-bindgen documentation](https://rustwasm.github.io/wasm-bindgen/)
- [Rust SIMD documentation](https://doc.rust-lang.org/std/simd/)
- [WebGL2 Fundamentals](https://webgl2fundamentals.org/)
- [Noita GDC Talk (falling sand inspiration)](https://www.youtube.com/watch?v=prXuyMCgbTc)
- [Sandspiel (WebGL falling sand)](https://sandspiel.club/)

---

## Appendix: Quick Start Commands

```bash
# Install Rust and wasm-pack
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
cargo install wasm-pack

# Build WASM module
cd wasm
wasm-pack build --target web --release

# Run development server
cd ..
npm run dev
```
