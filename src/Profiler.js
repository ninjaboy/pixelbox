// Performance Profiler for PixelBox
// Tracks timing data for element updates, rendering, and other operations

class Profiler {
    constructor() {
        this.enabled = false;
        this.metrics = new Map();
        this.frameSamples = 60; // Average over 60 frames
        this.currentFrame = 0;
    }

    enable() {
        this.enabled = true;
        console.log('📊 Profiler enabled - Press P to toggle debug panel');
    }

    disable() {
        this.enabled = false;
    }

    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // Start timing a named operation
    start(label) {
        if (!this.enabled) return;
        performance.mark(`${label}-start`);
    }

    // End timing and record the result
    end(label) {
        if (!this.enabled) return;

        const endMark = `${label}-end`;
        const measureName = `${label}-measure`;

        performance.mark(endMark);

        try {
            performance.measure(measureName, `${label}-start`, endMark);
            const measure = performance.getEntriesByName(measureName)[0];

            if (measure) {
                this.record(label, measure.duration);
            }

            // Cleanup marks
            performance.clearMarks(`${label}-start`);
            performance.clearMarks(endMark);
            performance.clearMeasures(measureName);
        } catch (e) {
            // Ignore errors from missing marks
        }
    }

    // Record a timing value
    record(label, duration) {
        if (!this.metrics.has(label)) {
            this.metrics.set(label, {
                total: 0,
                count: 0,
                min: Infinity,
                max: 0,
                samples: []
            });
        }

        const metric = this.metrics.get(label);
        metric.total += duration;
        metric.count++;
        metric.min = Math.min(metric.min, duration);
        metric.max = Math.max(metric.max, duration);

        // Keep rolling window of samples
        metric.samples.push(duration);
        if (metric.samples.length > this.frameSamples) {
            metric.samples.shift();
        }
    }

    // Get average time for a metric
    getAverage(label) {
        const metric = this.metrics.get(label);
        if (!metric || metric.samples.length === 0) return 0;

        const sum = metric.samples.reduce((a, b) => a + b, 0);
        return sum / metric.samples.length;
    }

    // Get all metrics
    getMetrics() {
        const result = {};

        for (const [label, metric] of this.metrics.entries()) {
            if (metric.samples.length > 0) {
                const sum = metric.samples.reduce((a, b) => a + b, 0);
                result[label] = {
                    avg: sum / metric.samples.length,
                    min: metric.min,
                    max: metric.max,
                    count: metric.count
                };
            }
        }

        return result;
    }

    // Get top N slowest operations
    getBottlenecks(n = 5) {
        const metrics = this.getMetrics();
        return Object.entries(metrics)
            .sort((a, b) => b[1].avg - a[1].avg)
            .slice(0, n);
    }

    // Reset all metrics
    reset() {
        this.metrics.clear();
        this.currentFrame = 0;
    }

    // Wrap a function with profiling
    wrap(label, fn) {
        if (!this.enabled) return fn;

        return (...args) => {
            this.start(label);
            const result = fn(...args);
            this.end(label);
            return result;
        };
    }

    // Profile an element type's update calls
    profileElementType(elementName, updateFn) {
        return (x, y, grid) => {
            this.start(`element:${elementName}`);
            const result = updateFn.call(this, x, y, grid);
            this.end(`element:${elementName}`);
            return result;
        };
    }
}

// Export singleton instance
const profiler = new Profiler();
export default profiler;
