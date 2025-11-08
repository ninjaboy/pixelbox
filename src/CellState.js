/**
 * CellState.js
 * Unified state management system for element cells
 * Provides consistent API for timers, state machines, and temperature tracking
 */

export class CellState {
    constructor() {
        this.data = {};
    }

    /**
     * Timer system for tracking element lifecycles
     * @param {string} name - Timer name (e.g., 'cooling', 'burning', 'growth')
     * @param {number} max - Maximum value before timer completes (default: Infinity)
     * @returns {boolean} - True if timer has reached max value
     */
    incrementTimer(name, max = Infinity) {
        if (this.data[name] === undefined) {
            this.data[name] = 0;
        }
        this.data[name]++;
        return this.data[name] >= max;
    }

    /**
     * Get current timer value
     * @param {string} name - Timer name
     * @returns {number} - Current timer value (0 if not initialized)
     */
    getTimer(name) {
        return this.data[name] || 0;
    }

    /**
     * Reset timer to zero
     * @param {string} name - Timer name
     */
    resetTimer(name) {
        this.data[name] = 0;
    }

    /**
     * Set timer to specific value
     * @param {string} name - Timer name
     * @param {number} value - Value to set
     */
    setTimer(name, value) {
        this.data[name] = value;
    }

    /**
     * State machine support for elements with discrete states
     * @param {string} stateName - State to transition to
     */
    setState(stateName) {
        this.data.state = stateName;
    }

    /**
     * Get current state
     * @returns {string|undefined} - Current state name
     */
    getState() {
        return this.data.state;
    }

    /**
     * Check if in specific state
     * @param {string} stateName - State to check
     * @returns {boolean}
     */
    isState(stateName) {
        return this.data.state === stateName;
    }

    /**
     * Temperature tracking for heat propagation system
     * @param {number} delta - Temperature change
     * @returns {number} - New temperature value
     */
    adjustTemperature(delta) {
        if (this.data.temperature === undefined) {
            this.data.temperature = 0;
        }
        this.data.temperature += delta;
        return this.data.temperature;
    }

    /**
     * Get current temperature
     * @returns {number} - Current temperature (0 if not initialized)
     */
    getTemperature() {
        return this.data.temperature || 0;
    }

    /**
     * Set temperature to specific value
     * @param {number} value - Temperature value
     */
    setTemperature(value) {
        this.data.temperature = value;
    }

    /**
     * Generic getter for custom data
     * @param {string} key - Data key
     * @param {*} defaultValue - Default value if key doesn't exist
     * @returns {*} - Data value
     */
    get(key, defaultValue = undefined) {
        return this.data[key] !== undefined ? this.data[key] : defaultValue;
    }

    /**
     * Generic setter for custom data
     * @param {string} key - Data key
     * @param {*} value - Data value
     */
    set(key, value) {
        this.data[key] = value;
    }

    /**
     * Check if key exists
     * @param {string} key - Data key
     * @returns {boolean}
     */
    has(key) {
        return this.data[key] !== undefined;
    }

    /**
     * Delete a key
     * @param {string} key - Data key
     */
    delete(key) {
        delete this.data[key];
    }

    /**
     * Clear all data
     */
    clear() {
        this.data = {};
    }

    /**
     * Serialize state for save/load
     * @returns {Object} - Serializable data object
     */
    serialize() {
        return { ...this.data };
    }

    /**
     * Deserialize state from saved data
     * @param {Object} data - Serialized data
     */
    deserialize(data) {
        this.data = { ...data };
    }
}
