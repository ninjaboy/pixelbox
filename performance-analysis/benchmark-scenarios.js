/**
 * Performance Benchmark Scenarios
 * Load these scenarios to test performance under different conditions
 *
 * Usage:
 * 1. Open browser console in PixelBox
 * 2. Copy-paste a scenario function
 * 3. Run it: lowDensityBenchmark(scene)
 * 4. Press 'P' to toggle profiler and observe metrics
 */

/**
 * Low Density Benchmark (500 particles)
 * Expected: <8ms/frame
 */
function lowDensityBenchmark(scene) {
    console.log('🔬 Running Low Density Benchmark (500 particles)...');

    const grid = scene.pixelGrid;
    const centerX = Math.floor(grid.width / 2);
    const centerY = Math.floor(grid.height / 2);

    // 250 sand particles
    for (let i = 0; i < 250; i++) {
        const x = centerX + Math.floor(Math.random() * 40) - 20;
        const y = centerY + Math.floor(Math.random() * 40) - 20;
        grid.setElement(x, y, scene.elementRegistry.get('sand'));
    }

    // 150 water particles
    for (let i = 0; i < 150; i++) {
        const x = centerX + Math.floor(Math.random() * 30) - 15;
        const y = centerY - 20 + Math.floor(Math.random() * 20);
        grid.setElement(x, y, scene.elementRegistry.get('water'));
    }

    // 50 lava particles
    for (let i = 0; i < 50; i++) {
        const x = centerX + Math.floor(Math.random() * 20) - 10;
        const y = centerY - 40 + Math.floor(Math.random() * 10);
        grid.setElement(x, y, scene.elementRegistry.get('lava'));
    }

    // 50 misc (fire, wood, stone)
    for (let i = 0; i < 25; i++) {
        const x = centerX + 30 + Math.floor(Math.random() * 10);
        const y = centerY + Math.floor(Math.random() * 20);
        grid.setElement(x, y, scene.elementRegistry.get('fire'));
    }
    for (let i = 0; i < 25; i++) {
        const x = centerX - 30 + Math.floor(Math.random() * 10);
        const y = centerY + Math.floor(Math.random() * 20);
        grid.setElement(x, y, scene.elementRegistry.get('wood'));
    }

    console.log('✅ Low Density Benchmark loaded');
    console.log('📊 Press P to toggle profiler');
    console.log('🎯 Target: <8ms/frame');
}

/**
 * Medium Density Benchmark (1000 particles)
 * Expected: <12ms/frame
 */
function mediumDensityBenchmark(scene) {
    console.log('🔬 Running Medium Density Benchmark (1000 particles)...');

    const grid = scene.pixelGrid;
    const centerX = Math.floor(grid.width / 2);
    const centerY = Math.floor(grid.height / 2);

    // 400 sand particles
    for (let i = 0; i < 400; i++) {
        const x = centerX + Math.floor(Math.random() * 60) - 30;
        const y = centerY + Math.floor(Math.random() * 60) - 30;
        grid.setElement(x, y, scene.elementRegistry.get('sand'));
    }

    // 300 water particles
    for (let i = 0; i < 300; i++) {
        const x = centerX + Math.floor(Math.random() * 50) - 25;
        const y = centerY - 30 + Math.floor(Math.random() * 30);
        grid.setElement(x, y, scene.elementRegistry.get('water'));
    }

    // 100 lava particles
    for (let i = 0; i < 100; i++) {
        const x = centerX + Math.floor(Math.random() * 30) - 15;
        const y = centerY - 50 + Math.floor(Math.random() * 20);
        grid.setElement(x, y, scene.elementRegistry.get('lava'));
    }

    // 100 fire particles
    for (let i = 0; i < 100; i++) {
        const x = centerX + 40 + Math.floor(Math.random() * 20);
        const y = centerY + Math.floor(Math.random() * 30);
        grid.setElement(x, y, scene.elementRegistry.get('fire'));
    }

    // 100 misc (wood, oil, gunpowder, stone)
    for (let i = 0; i < 25; i++) {
        const x = centerX - 40 + Math.floor(Math.random() * 10);
        const y = centerY + Math.floor(Math.random() * 20);
        grid.setElement(x, y, scene.elementRegistry.get('wood'));
    }
    for (let i = 0; i < 25; i++) {
        const x = centerX - 50 + Math.floor(Math.random() * 10);
        const y = centerY + Math.floor(Math.random() * 20);
        grid.setElement(x, y, scene.elementRegistry.get('oil'));
    }
    for (let i = 0; i < 25; i++) {
        const x = centerX + 50 + Math.floor(Math.random() * 10);
        const y = centerY + Math.floor(Math.random() * 20);
        grid.setElement(x, y, scene.elementRegistry.get('gunpowder'));
    }
    for (let i = 0; i < 25; i++) {
        const x = centerX + Math.floor(Math.random() * 20) - 10;
        const y = centerY + 40 + Math.floor(Math.random() * 10);
        grid.setElement(x, y, scene.elementRegistry.get('stone'));
    }

    console.log('✅ Medium Density Benchmark loaded');
    console.log('📊 Press P to toggle profiler');
    console.log('🎯 Target: <12ms/frame');
}

/**
 * High Density Benchmark (2000 particles)
 * Expected: <16ms/frame (may have occasional drops)
 */
function highDensityBenchmark(scene) {
    console.log('🔬 Running High Density Benchmark (2000 particles)...');

    const grid = scene.pixelGrid;
    const centerX = Math.floor(grid.width / 2);
    const centerY = Math.floor(grid.height / 2);

    // 800 sand/stone particles
    for (let i = 0; i < 600; i++) {
        const x = centerX + Math.floor(Math.random() * 80) - 40;
        const y = centerY + Math.floor(Math.random() * 80) - 40;
        grid.setElement(x, y, scene.elementRegistry.get('sand'));
    }
    for (let i = 0; i < 200; i++) {
        const x = centerX + Math.floor(Math.random() * 60) - 30;
        const y = centerY + 40 + Math.floor(Math.random() * 20);
        grid.setElement(x, y, scene.elementRegistry.get('stone'));
    }

    // 600 water particles
    for (let i = 0; i < 600; i++) {
        const x = centerX + Math.floor(Math.random() * 70) - 35;
        const y = centerY - 40 + Math.floor(Math.random() * 40);
        grid.setElement(x, y, scene.elementRegistry.get('water'));
    }

    // 200 lava particles
    for (let i = 0; i < 200; i++) {
        const x = centerX + Math.floor(Math.random() * 40) - 20;
        const y = centerY - 60 + Math.floor(Math.random() * 30);
        grid.setElement(x, y, scene.elementRegistry.get('lava'));
    }

    // 200 fire particles
    for (let i = 0; i < 200; i++) {
        const x = centerX + 50 + Math.floor(Math.random() * 30);
        const y = centerY + Math.floor(Math.random() * 40);
        grid.setElement(x, y, scene.elementRegistry.get('fire'));
    }

    // 200 misc
    for (let i = 0; i < 100; i++) {
        const x = centerX - 60 + Math.floor(Math.random() * 20);
        const y = centerY + Math.floor(Math.random() * 30);
        grid.setElement(x, y, scene.elementRegistry.get('wood'));
    }
    for (let i = 0; i < 50; i++) {
        const x = centerX - 70 + Math.floor(Math.random() * 10);
        const y = centerY + Math.floor(Math.random() * 20);
        grid.setElement(x, y, scene.elementRegistry.get('oil'));
    }
    for (let i = 0; i < 50; i++) {
        const x = centerX + 70 + Math.floor(Math.random() * 10);
        const y = centerY + Math.floor(Math.random() * 20);
        grid.setElement(x, y, scene.elementRegistry.get('ice'));
    }

    console.log('✅ High Density Benchmark loaded');
    console.log('📊 Press P to toggle profiler');
    console.log('🎯 Target: <16ms/frame');
}

/**
 * Worst Case: Lava Lake (interaction-heavy)
 * Expected: <14ms/frame
 */
function lavaLakeBenchmark(scene) {
    console.log('🔬 Running Lava Lake Benchmark (interaction-heavy)...');

    const grid = scene.pixelGrid;
    const centerX = Math.floor(grid.width / 2);
    const centerY = Math.floor(grid.height / 2);

    // 1000 lava cells (very expensive - lots of behaviors)
    for (let i = 0; i < 1000; i++) {
        const x = centerX + Math.floor(Math.random() * 60) - 30;
        const y = centerY + Math.floor(Math.random() * 60) - 30;
        grid.setElement(x, y, scene.elementRegistry.get('lava'));
    }

    // 500 water cells (high interaction rate with lava)
    for (let i = 0; i < 500; i++) {
        const x = centerX + Math.floor(Math.random() * 70) - 35;
        const y = centerY - 40 + Math.floor(Math.random() * 30);
        grid.setElement(x, y, scene.elementRegistry.get('water'));
    }

    // 200 combustibles (wood, oil, gunpowder)
    for (let i = 0; i < 100; i++) {
        const x = centerX + 40 + Math.floor(Math.random() * 20);
        const y = centerY + Math.floor(Math.random() * 30);
        grid.setElement(x, y, scene.elementRegistry.get('wood'));
    }
    for (let i = 0; i < 50; i++) {
        const x = centerX + 50 + Math.floor(Math.random() * 10);
        const y = centerY + Math.floor(Math.random() * 20);
        grid.setElement(x, y, scene.elementRegistry.get('oil'));
    }
    for (let i = 0; i < 50; i++) {
        const x = centerX + 60 + Math.floor(Math.random() * 10);
        const y = centerY + Math.floor(Math.random() * 20);
        grid.setElement(x, y, scene.elementRegistry.get('gunpowder'));
    }

    console.log('✅ Lava Lake Benchmark loaded');
    console.log('⚠️  WARNING: This is worst-case scenario');
    console.log('📊 Press P to toggle profiler');
    console.log('🎯 Target: <14ms/frame');
}

/**
 * Static Elements Benchmark (wall-heavy)
 * Tests optimization #6 (skip interactions for static elements)
 */
function staticBenchmark(scene) {
    console.log('🔬 Running Static Elements Benchmark...');

    const grid = scene.pixelGrid;
    const centerX = Math.floor(grid.width / 2);
    const centerY = Math.floor(grid.height / 2);

    // 1200 wall/glass/obsidian (should skip interactions)
    for (let i = 0; i < 600; i++) {
        const x = Math.floor(Math.random() * grid.width);
        const y = Math.floor(Math.random() * grid.height);
        grid.setElement(x, y, scene.elementRegistry.get('wall'));
    }
    for (let i = 0; i < 300; i++) {
        const x = Math.floor(Math.random() * grid.width);
        const y = Math.floor(Math.random() * grid.height);
        grid.setElement(x, y, scene.elementRegistry.get('glass'));
    }
    for (let i = 0; i < 300; i++) {
        const x = Math.floor(Math.random() * grid.width);
        const y = Math.floor(Math.random() * grid.height);
        grid.setElement(x, y, scene.elementRegistry.get('obsidian'));
    }

    // 300 dynamic elements (sand, water)
    for (let i = 0; i < 200; i++) {
        const x = centerX + Math.floor(Math.random() * 40) - 20;
        const y = centerY + Math.floor(Math.random() * 40) - 20;
        grid.setElement(x, y, scene.elementRegistry.get('sand'));
    }
    for (let i = 0; i < 100; i++) {
        const x = centerX + Math.floor(Math.random() * 30) - 15;
        const y = centerY - 20 + Math.floor(Math.random() * 20);
        grid.setElement(x, y, scene.elementRegistry.get('water'));
    }

    console.log('✅ Static Elements Benchmark loaded');
    console.log('📊 Press P to toggle profiler');
    console.log('🎯 Should show reduced interaction overhead');
}

/**
 * Micro-benchmark: keyToCoord() Performance
 * Measures the cost of coordinate conversion
 */
function keyToCoordBenchmark() {
    console.log('🔬 Running keyToCoord() Micro-Benchmark...');

    const width = 200;
    const iterations = 100000;

    // Simulate current implementation
    console.time('keyToCoord (current)');
    for (let i = 0; i < iterations; i++) {
        const key = Math.floor(Math.random() * (width * 150));
        const result = {
            x: key % width,
            y: Math.floor(key / width)
        };
    }
    console.timeEnd('keyToCoord (current)');

    // Simulate optimized (cached coords)
    const cache = new Map();
    for (let i = 0; i < 1000; i++) {
        const key = Math.floor(Math.random() * (width * 150));
        const x = key % width;
        const y = Math.floor(key / width);
        cache.set(key, { x, y });
    }

    console.time('Cached coords lookup');
    for (let i = 0; i < iterations; i++) {
        const key = Array.from(cache.keys())[Math.floor(Math.random() * cache.size)];
        const result = cache.get(key);
    }
    console.timeEnd('Cached coords lookup');

    console.log('✅ Micro-benchmark complete');
    console.log('Expected: Cached lookup ~5-10x faster');
}

/**
 * Profiler Snapshot Utility
 * Captures profiler metrics and logs them
 */
function captureProfilerSnapshot(scene) {
    if (!scene.game.scene.scenes[0].pixelGrid.registry.profiler) {
        console.error('❌ Profiler not available');
        return;
    }

    const profiler = scene.game.scene.scenes[0].pixelGrid.registry.profiler;
    if (!profiler.enabled) {
        console.warn('⚠️  Profiler not enabled. Press P to enable.');
        return;
    }

    const metrics = profiler.getMetrics();
    console.log('📊 Profiler Snapshot:');
    console.table({
        'Total Frame': { avg: metrics['frame:total']?.avg.toFixed(3), max: metrics['frame:total']?.max.toFixed(3) },
        'Physics Update': { avg: metrics['physics:update']?.avg.toFixed(3), max: metrics['physics:update']?.max.toFixed(3) },
        'Render Total': { avg: metrics['render:total']?.avg.toFixed(3), max: metrics['render:total']?.max.toFixed(3) },
        'Render Particles': { avg: metrics['render:particles']?.avg.toFixed(3), max: metrics['render:particles']?.avg.toFixed(3) }
    });

    console.log('\n🔝 Top 5 Element Types:');
    const elementMetrics = Object.entries(metrics)
        .filter(([key]) => key.startsWith('element:'))
        .sort((a, b) => b[1].avg - a[1].avg)
        .slice(0, 5);

    if (elementMetrics.length > 0) {
        const table = {};
        elementMetrics.forEach(([key, data]) => {
            table[key.replace('element:', '')] = {
                avg: data.avg.toFixed(4),
                count: data.count
            };
        });
        console.table(table);
    } else {
        console.log('(No element profiling data - enable element profiling first)');
    }
}

// Export for console usage
console.log('📦 Performance Benchmarks Loaded');
console.log('Available functions:');
console.log('  - lowDensityBenchmark(scene)');
console.log('  - mediumDensityBenchmark(scene)');
console.log('  - highDensityBenchmark(scene)');
console.log('  - lavaLakeBenchmark(scene)');
console.log('  - staticBenchmark(scene)');
console.log('  - keyToCoordBenchmark()');
console.log('  - captureProfilerSnapshot(scene)');
console.log('\nTo run: Copy a function above, paste in console, then call it with scene parameter');
console.log('Example: window.scene = window.__pixelboxGame.scene.scenes[0]; lowDensityBenchmark(window.scene);');
