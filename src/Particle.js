/**
 * Particle.js
 *
 * Represents a single particle in the hybrid physics system.
 * Particles have float-based positions, velocities, and physics properties.
 *
 * This is used for dynamic elements (sand, water, oil) that need smooth,
 * realistic physics simulation with momentum and inertia.
 */

export class Particle {
    /**
     * @param {number} x - X position in world coordinates (float)
     * @param {number} y - Y position in world coordinates (float)
     * @param {Element} element - Element type reference
     * @param {number} index - Index in particle array
     */
    constructor(x, y, element, index = -1) {
        // Position (float coordinates)
        this.x = x;
        this.y = y;

        // Velocity (cells per second)
        this.vx = 0;
        this.vy = 0;

        // Element reference
        this.element = element;

        // Physics properties (derived from element)
        this.density = element.density || 1;
        this.mass = element.mass || this.density;
        this.friction = element.friction || 0.98;
        this.restitution = element.restitution || 0.1; // Bounciness

        // Lifecycle
        this.lifetime = element.defaultLifetime || -1;
        this.age = 0;
        this.active = true;

        // Index tracking
        this.index = index;

        // Temperature (for interactions)
        this.temperature = element.temperature || 0;

        // Color variation (subtle randomness for realism)
        this.colorVariation = 0.95 + Math.random() * 0.1;

        // Spatial grid cell (cached for performance)
        this.gridCell = -1;

        // State data (for complex behaviors)
        this.data = {};
    }

    /**
     * Get current grid cell position
     */
    getGridX() {
        return Math.floor(this.x);
    }

    getGridY() {
        return Math.floor(this.y);
    }

    /**
     * Get previous grid position (before last movement)
     */
    getPrevGridX() {
        return Math.floor(this.x - this.vx);
    }

    getPrevGridY() {
        return Math.floor(this.y - this.vy);
    }

    /**
     * Apply velocity to position
     * @param {number} dt - Delta time (typically 1/60 for 60fps)
     */
    integrate(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.age++;

        // Update lifetime
        if (this.lifetime > 0) {
            this.lifetime--;
            if (this.lifetime === 0) {
                this.active = false;
            }
        }
    }

    /**
     * Apply force to particle (F = ma, so a = F/m)
     * @param {number} fx - Force in x direction
     * @param {number} fy - Force in y direction
     */
    applyForce(fx, fy) {
        this.vx += fx / this.mass;
        this.vy += fy / this.mass;
    }

    /**
     * Apply impulse (instant velocity change)
     * @param {number} dvx - Velocity change in x
     * @param {number} dvy - Velocity change in y
     */
    applyImpulse(dvx, dvy) {
        this.vx += dvx;
        this.vy += dvy;
    }

    /**
     * Apply drag/friction to velocity
     * @param {number} dragCoefficient - Drag multiplier (0-1)
     */
    applyDrag(dragCoefficient) {
        this.vx *= dragCoefficient;
        this.vy *= dragCoefficient;
    }

    /**
     * Clamp velocity to maximum speed
     * @param {number} maxSpeed - Maximum speed magnitude
     */
    limitSpeed(maxSpeed) {
        const speedSq = this.vx * this.vx + this.vy * this.vy;
        if (speedSq > maxSpeed * maxSpeed) {
            const speed = Math.sqrt(speedSq);
            this.vx = (this.vx / speed) * maxSpeed;
            this.vy = (this.vy / speed) * maxSpeed;
        }
    }

    /**
     * Get speed magnitude
     */
    getSpeed() {
        return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }

    /**
     * Get distance to another particle
     * @param {Particle} other - Other particle
     */
    distanceTo(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Get squared distance (faster, no sqrt)
     * @param {Particle} other - Other particle
     */
    distanceToSq(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        return dx * dx + dy * dy;
    }

    /**
     * Check if element has specific tag
     * @param {string} tag - Tag to check
     */
    hasTag(tag) {
        return this.element.hasTag(tag);
    }

    /**
     * Get interpolated color with variation
     */
    getColor() {
        const baseColor = this.element.color;
        const r = (baseColor >> 16) & 0xFF;
        const g = (baseColor >> 8) & 0xFF;
        const b = baseColor & 0xFF;

        const variation = this.colorVariation;
        const nr = Math.floor(r * variation);
        const ng = Math.floor(g * variation);
        const nb = Math.floor(b * variation);

        return (nr << 16) | (ng << 8) | nb;
    }

    /**
     * Check if particle is at rest (very low velocity)
     */
    isAtRest() {
        const threshold = 0.01;
        return Math.abs(this.vx) < threshold && Math.abs(this.vy) < threshold;
    }

    /**
     * Deactivate particle (for pooling/recycling)
     */
    deactivate() {
        this.active = false;
    }

    /**
     * Reactivate particle with new properties
     * @param {number} x - New x position
     * @param {number} y - New y position
     * @param {Element} element - New element type
     */
    reactivate(x, y, element) {
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.element = element;
        this.density = element.density || 1;
        this.mass = element.mass || this.density;
        this.friction = element.friction || 0.98;
        this.restitution = element.restitution || 0.1;
        this.lifetime = element.defaultLifetime || -1;
        this.age = 0;
        this.active = true;
        this.temperature = element.temperature || 0;
        this.colorVariation = 0.95 + Math.random() * 0.1;
        this.data = {};
    }

    /**
     * Serialize particle state
     */
    serialize() {
        return {
            x: this.x,
            y: this.y,
            vx: this.vx,
            vy: this.vy,
            elementId: this.element.id,
            lifetime: this.lifetime,
            age: this.age,
            temperature: this.temperature,
            data: this.data
        };
    }

    /**
     * Deserialize particle state
     * @param {Object} data - Serialized data
     * @param {ElementRegistry} registry - Element registry
     */
    deserialize(data, registry) {
        this.x = data.x;
        this.y = data.y;
        this.vx = data.vx;
        this.vy = data.vy;
        this.element = registry.get(data.elementId);
        this.lifetime = data.lifetime;
        this.age = data.age;
        this.temperature = data.temperature;
        this.data = data.data || {};
        this.active = true;
    }
}

/**
 * ParticlePool - Object pool for efficient particle creation/destruction
 * Reduces garbage collection overhead
 */
export class ParticlePool {
    constructor(initialSize = 1000) {
        this.particles = [];
        this.activeCount = 0;
        this.maxSize = 50000; // Safety limit

        // Pre-allocate initial particles
        for (let i = 0; i < initialSize; i++) {
            this.particles.push(new Particle(0, 0, null, i));
            this.particles[i].active = false;
        }
    }

    /**
     * Get a particle from the pool
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Element} element - Element type
     */
    acquire(x, y, element) {
        // Find inactive particle
        for (let i = 0; i < this.particles.length; i++) {
            if (!this.particles[i].active) {
                this.particles[i].reactivate(x, y, element);
                this.particles[i].index = i;
                this.activeCount++;
                return this.particles[i];
            }
        }

        // No inactive particles, create new one if under limit
        if (this.particles.length < this.maxSize) {
            const index = this.particles.length;
            const particle = new Particle(x, y, element, index);
            this.particles.push(particle);
            this.activeCount++;
            return particle;
        }

        // Pool exhausted
        console.warn('Particle pool exhausted, max particles reached');
        return null;
    }

    /**
     * Release particle back to pool
     * @param {Particle} particle - Particle to release
     */
    release(particle) {
        if (particle.active) {
            particle.deactivate();
            this.activeCount--;
        }
    }

    /**
     * Get all active particles
     */
    getActive() {
        return this.particles.filter(p => p.active);
    }

    /**
     * Clear all particles
     */
    clear() {
        for (let i = 0; i < this.particles.length; i++) {
            this.particles[i].active = false;
        }
        this.activeCount = 0;
    }

    /**
     * Get pool statistics
     */
    getStats() {
        return {
            total: this.particles.length,
            active: this.activeCount,
            inactive: this.particles.length - this.activeCount,
            utilization: this.activeCount / this.maxSize
        };
    }
}
