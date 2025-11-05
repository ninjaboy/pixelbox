# PixelBox - Particle Aquarium

A pixel-based physics simulation game built with Phaser 3, where each pixel acts as a particle with unique physical properties. Features a **modular, property-based interaction system** that makes it incredibly easy to add new elements and interactions. Perfect for mobile and desktop browsers.

## Features

- **Property-Based Interaction System**: Elements interact based on tags and properties, not hardcoded logic
- **Modular Architecture**: Each element in its own file, easy to extend
- **Custom Pixel Physics Engine**: Cellular automata-based simulation where each pixel has individual physics properties
- **Multiple Elements**:
  - **Sand** - Falls and piles up, displaces lighter materials
  - **Water** - Flows and spreads, interacts with fire to create steam
  - **Stone** - Static, immovable material (great for walls)
  - **Fire** - Burns upward, ignites wood, evaporates water
  - **Wood** - Static but flammable material
  - **Steam** - Rises and drifts
- **Touch & Mouse Controls**: Draw particles with your finger or mouse
- **Performance Optimized**: Handles thousands of particles smoothly on mobile
- **Real-time Stats**: FPS and particle count displayed

## How to Run

### Option 1: Simple HTTP Server

```bash
# Using Python 3
python -m http.server 8000

# Using Python 2
python -m SimpleHTTPServer 8000

# Using Node.js (if you have http-server installed)
npx http-server -p 8000
```

Then open `http://localhost:8000` in your browser.

### Option 2: Open Directly

Simply open `index.html` in a modern web browser. Note: Some browsers may restrict loading resources this way, so using a local server is recommended.

## How to Play

1. **Select an Element**: Click/tap one of the element buttons at the bottom of the screen
2. **Draw**: Click and drag (or touch and drag on mobile) to spawn particles
3. **Experiment**: Try combining different elements:
   - Pour water on fire to create steam
   - Build containers with stone
   - Create wood structures and set them on fire
   - Watch sand pour through barriers

## Element Interactions

- **Water + Fire** → Steam
- **Fire + Wood** → Fire spreads
- **Sand** displaces water and steam
- **Stone** is immovable and blocks everything

## Technical Details

- **Engine**: Phaser 3.86.0
- **Rendering**: WebGL with fallback to Canvas2D
- **Grid System**: 2D array-based cellular automata
- **Pixel Size**: 4x4 pixels for optimal performance
- **Physics**: Custom implementation using density-based interactions
- **Update Order**: Bottom-to-top with randomized left-right to prevent bias

## Performance

- **Target**: 60 FPS
- **Typical Particle Count**: 5,000-20,000 particles depending on device
- **Mobile Optimized**: Tested on Chrome for Android
- **Pixel Size**: Adjustable in `src/main.js` - smaller = more detail but slower
- **ES6 Modules**: Modern JavaScript architecture

## Architecture

PixelBox uses a **property-based interaction system**. See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation.

### Quick Example: How Interactions Work

Instead of hardcoding "water + fire = steam":
- **Water** has tag `EVAPORATES` and property `evaporatesInto: 'steam'`
- **Fire** has tag `HEAT_SOURCE`
- **Interaction Rule**: `EVAPORATES + HEAT_SOURCE → evaporate`

This means ANY element with `EVAPORATES` will transform when touching ANY `HEAT_SOURCE`!

## Customization

### Adding New Elements

Create a new element file in `src/elements/`:

```javascript
// src/elements/OilElement.js
import Element from '../Element.js';
import { STATE, TAG } from '../ElementProperties.js';

class OilElement extends Element {
    constructor() {
        super(7, 'oil', 0x3d3d1a, {
            density: 1.5,
            state: STATE.LIQUID,
            tags: [TAG.COMBUSTIBLE],  // Will ignite near fire!
            burnsInto: 'fire'
        });
    }

    update(x, y, grid) {
        // Liquid movement logic
        if (grid.canMoveTo(x, y, x, y + 1)) {
            grid.swap(x, y, x, y + 1);
            return true;
        }
        return false;
    }
}

export default OilElement;
```

Then register it in `src/init.js`:
```javascript
import { OilElement } from './elements/index.js';
registry.register(new OilElement());
```

That's it! The interaction system handles the rest automatically.

### Adjusting Performance

In `src/main.js`, around line 25:

```javascript
this.pixelSize = 4; // Increase for better performance, decrease for more detail
```

In `src/main.js`, around line 15:

```javascript
this.brushSize = 5; // Adjust drawing brush size
```

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome for Android)

## License

MIT License - Feel free to modify and use as you wish!

## Future Enhancements

- [ ] More element types (oil, gas, electricity, acid)
- [ ] Save/load scenes
- [ ] Adjustable brush size
- [ ] Color variations for elements
- [ ] Sound effects
- [ ] Particle limit warnings
- [ ] Temperature system
- [ ] GPU-accelerated rendering for 100K+ particles

Enjoy creating your particle aquarium!
