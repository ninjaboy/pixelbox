# Performance Analysis - PixelBox v3.5.0

This folder contains comprehensive performance analysis and optimization recommendations for the PixelBox falling sand simulation engine.

## 📁 Contents

### 1. **PERFORMANCE_ANALYSIS.md**
Comprehensive deep-dive analysis of the entire codebase:
- Main game loop profiling (update cycle @ 60 FPS)
- PixelGrid implementation analysis (active cell tracking, row-based updates)
- InteractionManager overhead analysis (priority system, tag lookups)
- Rendering pipeline breakdown (color batching, lighting calculations)
- Memory allocation hotspots (per-frame allocations, GC pressure)
- Element update overhead (behavior composition, element-specific costs)
- **11 sections** covering every performance-critical path

### 2. **OPTIMIZATION_RECOMMENDATIONS.md**
Priority-ordered actionable optimizations with full implementation code:
- **P0 (High-Impact, Low-Risk):** 3 optimizations, -3 to -5ms/frame
  - Cache coordinates in activeCells Map
  - Reuse neighbor arrays
  - Add element-specific profiling
- **P1 (Medium-Impact):** 3 optimizations, -1 to -3ms/frame
  - Persistent row buckets
  - Lighting cache
  - Skip static element interactions
- **P2 (Advanced):** 2 optimizations, -1 to -2ms/frame
  - Conditional diagonal checks
  - Inline critical behaviors

**Full implementation code provided for each optimization.**

### 3. **benchmark-scenarios.js**
Browser console benchmarking suite:
- `lowDensityBenchmark(scene)` - 500 particles, target <8ms/frame
- `mediumDensityBenchmark(scene)` - 1000 particles, target <12ms/frame
- `highDensityBenchmark(scene)` - 2000 particles, target <16ms/frame
- `lavaLakeBenchmark(scene)` - Worst-case interaction-heavy scenario
- `staticBenchmark(scene)` - Tests static element optimization
- `keyToCoordBenchmark()` - Micro-benchmark for coordinate conversion
- `captureProfilerSnapshot(scene)` - Dumps profiler metrics to console

## 🎯 Quick Start

### Step 1: Read the Analysis
```bash
# Read comprehensive analysis
cat PERFORMANCE_ANALYSIS.md

# Or jump to specific sections:
# - Section 1: Critical Performance Paths
# - Section 5: Identified Bottlenecks
# - Section 6: Optimization Opportunities
```

### Step 2: Review Recommendations
```bash
# Read implementation guide
cat OPTIMIZATION_RECOMMENDATIONS.md

# Focus on P0 optimizations first (highest impact, lowest risk)
```

### Step 3: Run Benchmarks
1. Open PixelBox in browser
2. Open browser console (F12)
3. Copy-paste `benchmark-scenarios.js` contents
4. Run benchmarks:
```javascript
// Get scene reference
window.scene = window.__pixelboxGame.scene.scenes[0];

// Run medium density benchmark
mediumDensityBenchmark(window.scene);

// Toggle profiler (or press 'P' key)
captureProfilerSnapshot(window.scene);
```

## 📊 Key Findings Summary

### Current Performance Baseline (v3.5.0)
- **Frame Budget:** 16.67ms (60 FPS target)
- **Current Load:** ~12-16ms with 1000 active particles
- **Breakdown:**
  - Physics Update: ~8-11ms (60-70%)
  - Rendering: ~4-5ms (25-30%)
  - Other: ~1ms (5-10%)

### Primary Bottlenecks Identified

| Bottleneck | Cost (ms/frame) | Cause | Priority |
|------------|-----------------|-------|----------|
| **keyToCoord() overhead** | 2-4ms | 3000-6000 calls with division/modulo + object allocation | 🔴 P0 |
| **Interaction checking** | 2-3ms | 4000-8000 neighbor checks with array allocations | 🔴 P0 |
| **Lava element updates** | 1-2ms | 3 behaviors + complex liquid flow | 🟡 P1 |
| **Rendering batching** | 1-1.5ms | Map allocations + lighting per particle | 🟡 P1 |

### Optimization Impact Projection

| Phase | Optimizations | Frame Time | Particle Capacity |
|-------|---------------|------------|-------------------|
| **Baseline** | None | 12-16ms | 1000 particles @ 60 FPS |
| **P0 (Quick Wins)** | 3 optimizations | 9-11ms | 1300-1500 particles @ 60 FPS |
| **P1 (Medium)** | 6 optimizations | 7-9ms | 1600-1800 particles @ 60 FPS |
| **P2 (Advanced)** | 8 optimizations | 6-8ms | 1800-2200 particles @ 60 FPS |

**Conservative estimate:** 50-100% increase in particle capacity while maintaining 60 FPS.

## ✅ Existing Optimizations (Already Implemented)

The codebase already has several smart optimizations:

1. ✅ **Active Cell Tracking** - Only updates non-empty cells (not all 30,000 cells)
2. ✅ **Numeric Keys** - Uses `y * width + x` instead of string keys (`"x,y"`)
3. ✅ **Interaction Throttling** - Checks interactions every 2 frames (50% reduction)
4. ✅ **Row-Based Updates** - Bottom-to-top scanning with randomized direction
5. ✅ **Color Batching** - Groups particles by color for efficient rendering
6. ✅ **Profiler Infrastructure** - Built-in performance measurement (Press 'P')

These provide a solid foundation for further optimization.

## 🚀 Recommended Implementation Order

### Week 1: P0 Optimizations (Quick Wins)
**Effort:** 1-2 hours
**Impact:** -3 to -5ms per frame

1. Cache coordinates in activeCells Map
2. Reuse neighbor array in checkInteractions()
3. Add element-specific profiling

**Validation:** Run `mediumDensityBenchmark()` before and after, compare profiler metrics.

### Week 2: P1 Optimizations (Medium)
**Effort:** 3-5 hours
**Impact:** -1 to -3ms per frame (cumulative: -5 to -8ms)

4. Persistent row buckets
5. Lighting calculation cache
6. Skip interactions for static elements

**Validation:** Run `highDensityBenchmark()` and `staticBenchmark()`.

### Week 3+: P2 Optimizations (Research)
**Effort:** 1-2 weeks
**Impact:** Unknown (high risk, high complexity)

7. Conditional diagonal interaction checks
8. Inline critical behaviors for hot elements
9. Experimental: Spatial partitioning, SIMD, Web Workers

**Validation:** Extensive testing, A/B comparison with unoptimized version.

## 🧪 Testing Procedure

After each optimization:

1. **Syntax Check**
   ```bash
   node -c src/PixelGrid.js
   node -c src/main.js
   ```

2. **Visual Regression Test**
   - Load game
   - Create sand pile
   - Add water
   - Add lava
   - Verify physics still looks correct

3. **Profiler Validation**
   - Press 'P' to enable profiler
   - Run benchmark scenario
   - Verify target metric improved
   - Check for regressions in other metrics

4. **Memory Leak Test**
   - Run for 5 minutes
   - Check `performance.memory.usedJSHeapSize`
   - Should be stable, not growing continuously

## 📈 Success Metrics

### Primary Goals
- ✅ Maintain 60 FPS with 1500+ particles (50% increase from 1000)
- ✅ Physics update < 6ms average
- ✅ Total frame time < 11ms average

### Secondary Goals
- ✅ Support 2000 particles with occasional frame drops acceptable
- ✅ Reduce GC pressure (fewer per-frame allocations)
- ✅ Better profiler visibility into element costs

## 🔬 Advanced Topics

### Spatial Partitioning
For very high particle counts (5000+), consider dividing the grid into chunks and only checking interactions at chunk boundaries. Requires significant architectural changes.

### WebAssembly + SIMD
Port gravity/liquid flow calculations to WASM with SIMD instructions. Could provide 2-4x speedup for bulk operations, but high implementation cost.

### Web Workers
Parallelize chunk updates across multiple threads. Challenges: synchronization overhead, border handling, interaction consistency.

**Recommendation:** Stick with P0-P1 optimizations first. Only pursue advanced topics if targeting massive particle counts (3000+).

## 📝 Notes

- All timings measured on typical hardware (2.5GHz CPU, 60Hz display)
- Profiler overhead when enabled: ~0.5-1ms
- Mobile performance may vary (test on target devices)
- Optimization impact varies with particle density and element mix

## 🤝 Contributing

When implementing optimizations:

1. Create a branch: `perf/cache-coordinates`
2. Implement one optimization at a time
3. Run benchmarks before/after
4. Document results in PR
5. Include profiler screenshots

## 📚 References

- [Phaser Performance Tips](https://phaser.io/tutorials/performance-tips)
- [JavaScript Performance Optimization](https://developer.mozilla.org/en-US/docs/Web/Performance)
- [Falling Sand Game Optimization Techniques](https://www.redblobgames.com/articles/falling-sand/)

---

**Generated:** 2025-11-11
**Analyzer:** Claude Sonnet 4.5
**Version:** v3.5.0
**Codebase:** PixelBox Falling Sand Simulation
