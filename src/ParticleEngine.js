/**
 * ParticleEngine.js
 *
 * Main particle physics simulation engine.
 * Handles gravity, drag, particle-particle interactions, particle-static collisions,
 * and liquid spreading behavior.
 *
 * This replaces cellular automaton behavior for dynamic elements (sand, water, oil)
 * with smooth, physically-based particle simulation.
 */

import { Particle, ParticlePool } from './Particle.js';
import { SpatialGrid } from './SpatialGrid.js';
import { STATE, TAG } from './ElementProperties.js';

export class ParticleEngine {
    /**
     * @param {PixelGrid} world - Reference to the static grid world
     * @param {Object} options - Configuration options
     */
    constructor(world, options = {}) {
        this.world = world;
        this.registry = world.registry;

        // Particle storage
        this.particlePool = new ParticlePool(options.initialPoolSize || 2000);

        // Spatial acceleration structure
        this.spatialGrid = new SpatialGrid(
            world.width,
            world.height,
            options.spatialCellSize || 3
        );

        // Physics parameters
        this.gravity = options.gravity || 0.5; // Cells per frame^2
        this.maxSpeed = options.maxSpeed || 10; // Max velocity magnitude
        this.airDrag = options.airDrag || 0.99; // Air resistance
        this.particleRadius = options.particleRadius || 0.5; // Collision radius

        // Interaction parameters
        this.repulsionStrength = options.repulsionStrength || 0.3;
        this.liquidSpreadForce = options.liquidSpreadForce || 0.2;
        this.liquidDensityThreshold = options.liquidDensityThreshold || 4;

        // Performance settings
        this.substeps = options.substeps || 1; // Physics substeps per update
        this.neighborRadius = options.neighborRadius || 1; // Spatial grid radius

        // Statistics
        this.stats = {
            particleCount: 0,
            collisions: 0,
            interactions: 0,
            fps: 60,
            updateTime: 0
        };

        // Frame timing
        this.lastUpdateTime = performance.now();
    }

    /**
     * Spawn a new particle
     * @param {number} x - World x position
     * @param {number} y - World y position
     * @param {string|Element} elementType - Element name or object
     */
    spawnParticle(x, y, elementType) {
        const element = typeof elementType === 'string'
            ? this.registry.get(elementType)
            : elementType;

        if (!element) {
            console.warn(`Unknown element type: ${elementType}`);
            return null;
        }

        // Check emission density (spawn probability)
        if (element.emissionDensity < 1.0 && Math.random() > element.emissionDensity) {
            return null;
        }

        const particle = this.particlePool.acquire(x + 0.5, y + 0.5, element);
        if (particle) {
            // Add small random velocity for natural variation
            particle.vx = (Math.random() - 0.5) * 0.1;
            particle.vy = (Math.random() - 0.5) * 0.1;

            this.spatialGrid.insert(particle.index, particle);
            this.stats.particleCount++;
        }

        return particle;
    }

    /**
     * Main update loop
     * @param {number} dt - Delta time (typically 1/60 for 60fps)
     */
    update(dt = 1) {
        const startTime = performance.now();

        // Get active particles
        const particles = this.particlePool.particles;

        // Substep physics for stability
        const subDt = dt / this.substeps;
        for (let step = 0; step < this.substeps; step++) {
            this.updatePhysics(particles, subDt);
        }

        // Update statistics
        this.stats.particleCount = this.particlePool.activeCount;
        this.stats.updateTime = performance.now() - startTime;

        const now = performance.now();
        const frameDelta = now - this.lastUpdateTime;
        this.stats.fps = frameDelta > 0 ? 1000 / frameDelta : 60;
        this.lastUpdateTime = now;
    }

    /**
     * Physics update step
     * @param {Array<Particle>} particles - All particles
     * @param {number} dt - Delta time
     */
    updatePhysics(particles, dt) {
        this.stats.collisions = 0;
        this.stats.interactions = 0;

        // Update each active particle
        for (let i = 0; i < particles.length; i++) {
            const particle = particles[i];
            if (!particle.active) continue;

            // 1. Apply gravity
            this.applyGravity(particle, dt);

            // 2. Apply drag
            this.applyDrag(particle);

            // 3. Handle particle-particle interactions
            this.handleParticleInteractions(particle, particles);

            // 4. Integrate velocity
            particle.integrate(dt);

            // 5. Limit speed
            particle.limitSpeed(this.maxSpeed);

            // 6. Handle collisions with static grid
            this.handleStaticCollisions(particle);

            // 7. Handle world bounds
            this.handleWorldBounds(particle);

            // 8. Update spatial grid
            this.spatialGrid.update(particle);

            // 9. Check for deactivation
            if (!particle.active || particle.getGridY() >= this.world.height) {
                this.removeParticle(particle);
            }
        }
    }

    /**
     * Apply gravity force to particle
     * @param {Particle} particle - Target particle
     * @param {number} dt - Delta time
     */
    applyGravity(particle, dt) {
        // Gravity only affects particles that aren't gas
        if (particle.element.state !== STATE.GAS) {
            particle.vy += this.gravity * dt;
        } else {
            // Gas rises
            particle.vy -= this.gravity * 0.3 * dt;
        }
    }

    /**
     * Apply drag/air resistance
     * @param {Particle} particle - Target particle
     */
    applyDrag(particle) {
        // Different drag for different states
        let drag = this.airDrag;

        if (particle.element.state === STATE.LIQUID) {
            drag = 0.95; // More viscous
        } else if (particle.element.state === STATE.GAS) {
            drag = 0.97; // Less drag
        }

        particle.applyDrag(drag * particle.friction);
    }

    /**
     * Handle particle-particle interactions
     * @param {Particle} particle - Center particle
     * @param {Array<Particle>} allParticles - All particles
     */
    handleParticleInteractions(particle, allParticles) {
        // Query nearby particles
        const neighbors = this.spatialGrid.queryNeighbors(particle, this.neighborRadius);

        let liquidNeighbors = 0;
        let densityPressure = 0;

        for (const neighborIdx of neighbors) {
            const neighbor = allParticles[neighborIdx];
            if (!neighbor.active) continue;

            const dx = particle.x - neighbor.x;
            const dy = particle.y - neighbor.y;
            const distSq = dx * dx + dy * dy;
            const minDist = this.particleRadius * 2;
            const minDistSq = minDist * minDist;

            // Repulsion when particles are too close
            if (distSq < minDistSq && distSq > 0.001) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;

                // Repulsion force proportional to overlap
                const force = this.repulsionStrength * overlap;
                const fx = (dx / dist) * force;
                const fy = (dy / dist) * force;

                particle.applyForce(fx, fy);
                this.stats.collisions++;
            }

            // Count liquid neighbors for pressure
            if (neighbor.element.state === STATE.LIQUID) {
                liquidNeighbors++;
                densityPressure += 1;
            }
        }

        // Liquid spreading behavior
        if (particle.element.state === STATE.LIQUID) {
            this.applyLiquidBehavior(particle, liquidNeighbors, densityPressure);
        }

        // Powder settling behavior
        if (particle.element.state === STATE.POWDER) {
            this.applyPowderBehavior(particle, neighbors.size);
        }
    }

    /**
     * Apply liquid-specific behavior (spreading, pressure)
     * @param {Particle} particle - Liquid particle
     * @param {number} liquidNeighbors - Count of liquid neighbors
     * @param {number} densityPressure - Local density
     */
    applyLiquidBehavior(particle, liquidNeighbors, densityPressure) {
        // High density = spread horizontally
        if (liquidNeighbors > this.liquidDensityThreshold) {
            // Apply horizontal spreading force
            const spreadForce = this.liquidSpreadForce * (liquidNeighbors - this.liquidDensityThreshold);

            // Random horizontal direction
            const dir = Math.random() > 0.5 ? 1 : -1;
            particle.vx += dir * spreadForce;

            // Reduce vertical velocity (pressure pushes sideways)
            particle.vy *= 0.9;
        }

        // Dispersion factor affects horizontal movement
        if (particle.element.dispersion > 0) {
            const dispersion = particle.element.dispersion * 0.05;
            particle.vx += (Math.random() - 0.5) * dispersion;
        }
    }

    /**
     * Apply powder-specific behavior (friction, settling)
     * @param {Particle} particle - Powder particle
     * @param {number} neighborCount - Count of neighbors
     */
    applyPowderBehavior(particle, neighborCount) {
        // Powder has high friction when settled
        if (neighborCount > 2 && Math.abs(particle.vy) < 0.5) {
            particle.vx *= 0.5; // High friction
            particle.vy *= 0.5;
        }

        // Angle of repose simulation
        if (Math.abs(particle.vx) < 0.1 && Math.abs(particle.vy) < 0.1) {
            // Check if on slope - slide down
            const gx = particle.getGridX();
            const gy = particle.getGridY() + 1;

            const below = this.world.getElement(gx, gy);
            if (below && below.id === 0) {
                // Empty below - start falling
                particle.vy += this.gravity * 0.1;
            }
        }
    }

    /**
     * Handle collisions with static grid elements
     * @param {Particle} particle - Particle to check
     */
    handleStaticCollisions(particle) {
        const gx = particle.getGridX();
        const gy = particle.getGridY();

        // Check bounds
        if (gx < 0 || gx >= this.world.width || gy < 0 || gy >= this.world.height) {
            return;
        }

        const staticElement = this.world.getElement(gx, gy);

        // Collision with solid/static elements
        if (staticElement && staticElement.id !== 0 && !staticElement.movable) {
            // Can't move into solid - bounce/stop
            this.resolveStaticCollision(particle, gx, gy);
        }

        // Interaction with static elements (fire, lava, etc.)
        if (staticElement && staticElement.canInteract !== false) {
            this.checkParticleStaticInteraction(particle, staticElement, gx, gy);
        }
    }

    /**
     * Resolve collision with static cell
     * @param {Particle} particle - Particle
     * @param {number} gx - Grid x of collision
     * @param {number} gy - Grid y of collision
     */
    resolveStaticCollision(particle, gx, gy) {
        // Simple collision response: reflect and dampen
        const prevGx = particle.getPrevGridX();
        const prevGy = particle.getPrevGridY();

        // Vertical collision
        if (gy !== prevGy) {
            particle.y = prevGy + 0.5;
            particle.vy *= -particle.restitution;

            // Stop if velocity too low
            if (Math.abs(particle.vy) < 0.05) {
                particle.vy = 0;
            }
        }

        // Horizontal collision
        if (gx !== prevGx) {
            particle.x = prevGx + 0.5;
            particle.vx *= -particle.restitution;

            if (Math.abs(particle.vx) < 0.05) {
                particle.vx = 0;
            }
        }

        this.stats.collisions++;
    }

    /**
     * Check interactions between particle and static element
     * @param {Particle} particle - Particle
     * @param {Element} staticElement - Static element
     * @param {number} gx - Grid x
     * @param {number} gy - Grid y
     */
    checkParticleStaticInteraction(particle, staticElement, gx, gy) {
        // Use existing interaction system
        const interactionOccurred = this.registry.checkInteraction(
            particle.element,
            staticElement,
            this.world,
            particle.getGridX(),
            particle.getGridY(),
            gx,
            gy
        );

        if (interactionOccurred) {
            // Particle might be transformed or destroyed
            // Check if we need to remove it
            this.stats.interactions++;

            // Example: water particle hits fire -> turns to steam
            if (particle.element.hasTag(TAG.EXTINGUISHES_FIRE) &&
                staticElement.hasTag(TAG.HEAT_SOURCE)) {
                // Transform particle to steam
                if (Math.random() < 0.3) {
                    particle.element = this.registry.get('steam');
                    particle.vy = -Math.abs(particle.vy) - 1; // Rise quickly
                }
            }
        }
    }

    /**
     * Handle world boundary conditions
     * @param {Particle} particle - Particle to check
     */
    handleWorldBounds(particle) {
        // Left/right bounds
        if (particle.x < 0) {
            particle.x = 0;
            particle.vx *= -particle.restitution;
        } else if (particle.x >= this.world.width) {
            particle.x = this.world.width - 0.01;
            particle.vx *= -particle.restitution;
        }

        // Top bound
        if (particle.y < 0) {
            particle.y = 0;
            particle.vy *= -particle.restitution;
        }

        // Bottom bound - remove particle
        if (particle.y >= this.world.height) {
            particle.deactivate();
        }
    }

    /**
     * Remove particle from simulation
     * @param {Particle} particle - Particle to remove
     */
    removeParticle(particle) {
        this.spatialGrid.remove(particle);
        this.particlePool.release(particle);
        this.stats.particleCount--;
    }

    /**
     * Clear all particles
     */
    clear() {
        this.particlePool.clear();
        this.spatialGrid.clear();
        this.stats.particleCount = 0;
    }

    /**
     * Get all active particles
     */
    getActiveParticles() {
        return this.particlePool.getActive();
    }

    /**
     * Get particle at grid position (for rendering/debug)
     * @param {number} x - Grid x
     * @param {number} y - Grid y
     */
    getParticlesAt(x, y) {
        const result = [];
        const particles = this.particlePool.particles;

        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            if (p.active && p.getGridX() === x && p.getGridY() === y) {
                result.push(p);
            }
        }

        return result;
    }

    /**
     * Get engine statistics
     */
    getStats() {
        return {
            ...this.stats,
            poolStats: this.particlePool.getStats(),
            spatialStats: this.spatialGrid.getStats()
        };
    }

    /**
     * Debug: spawn test particles
     * @param {number} x - Center x
     * @param {number} y - Center y
     * @param {string} elementType - Element type
     * @param {number} count - Number of particles
     */
    spawnTestParticles(x, y, elementType, count = 10) {
        for (let i = 0; i < count; i++) {
            const offsetX = (Math.random() - 0.5) * 5;
            const offsetY = (Math.random() - 0.5) * 5;
            this.spawnParticle(x + offsetX, y + offsetY, elementType);
        }
    }

    /**
     * Convert static element to particles (for destruction effects)
     * @param {number} x - Grid x
     * @param {number} y - Grid y
     * @param {number} count - Number of particles to spawn
     */
    convertToParticles(x, y, count = 4) {
        const element = this.world.getElement(x, y);
        if (!element || element.id === 0) return;

        // Spawn particles in a small cluster
        for (let i = 0; i < count; i++) {
            const offsetX = (Math.random() - 0.5) * 0.8;
            const offsetY = (Math.random() - 0.5) * 0.8;

            const particle = this.spawnParticle(x + offsetX, y + offsetY, element);
            if (particle) {
                // Add explosion velocity
                particle.vx = (Math.random() - 0.5) * 2;
                particle.vy = (Math.random() - 0.5) * 2;
            }
        }

        // Clear static cell
        this.world.setElement(x, y, this.registry.get('empty'));
    }
}
