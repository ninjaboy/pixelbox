# PixelBox - Particle Aquarium

A pixel-based physics simulation game built with Phaser 3, where each pixel acts as a particle with unique physical properties. Features a **modular, property-based interaction system** that makes it incredibly easy to add new elements and interactions. Perfect for mobile and desktop browsers.

## 🎮 Play Now

**Live Demo**: [https://ninjaboy.github.io/pixelbox/](https://ninjaboy.github.io/pixelbox/)

## Features

- **Property-Based Interaction System**: Elements interact based on tags and properties, not hardcoded logic
- **Modular Architecture**: Each element in its own file, easy to extend
- **Custom Pixel Physics Engine**: Cellular automata-based simulation where each pixel has individual physics properties
- **Four-Season Cycle** (v4.0.0):
  - **Dynamic Weather**: Seasonal clouds, rain in spring, snow in winter
  - **Temperature System**: Water freezes in winter, ice melts in summer
  - **Living Trees**: Seasonal leaf colors (green→yellow/orange/red→bare), growth rates, natural decay
  - **Bird Migration**: Birds fly south in autumn, return in spring
  - **Wind System**: Affects clouds, varies by season (calm summers, gusty autumns)
  - **Atmospheric Changes**: Sky and sun colors shift with seasons
- **30+ Interactive Elements**:
  - **Powders**: Sand, gunpowder, ash, salt
  - **Liquids**: Water, oil, acid, lava
  - **Gases**: Fire, steam, smoke, clouds
  - **Solids**: Stone, wood, glass, ice, walls
  - **Living**: Fish, plants, trees, birds
  - **Special**: Fossils (generate oil over time), burning wood
- **Touch & Mouse Controls**: Draw particles with your finger or mouse
- **Performance Optimized**: Handles thousands of particles smoothly on mobile
- **Real-time Stats**: FPS and particle count displayed

## 🚀 Development

### Running Locally

```bash
# Clone the repository
git clone https://github.com/ninjaboy/pixelbox.git
cd pixelbox

# Run a local server
python3 -m http.server 8000

# Or use Node.js
npx http-server -p 8000
```

Then open `http://localhost:8000` in your browser.

### Deploying

**Primary: GitHub Pages** (Automatic)
```bash
# Update version.js to reflect your changes (see versioning guide below)
# Then commit and push
git add .
git commit -m "Your changes"
git push
```
Changes go live automatically at https://ninjaboy.github.io/pixelbox/

**Versioning Guide:**
- **Major versions (X.0.0)**: Significant new features or gameplay changes
- **Minor versions (x.X.0)**: New elements, mechanics, or substantial improvements
- **Patch versions (x.x.X)**: Bug fixes and minor tweaks

**Alternative: Vercel** (Manual)
```bash
vercel --prod
```
Note: Free tier has 100 deployments/day limit

## How to Play

1. **Select an Element**: Click/tap one of the element buttons at the bottom of the screen
2. **Draw**: Click and drag (or touch and drag on mobile) to spawn particles
3. **Experiment**: Try combining different elements:
   - Pour water on fire to create steam
   - Build containers with stone
   - Create wood structures and set them on fire
   - Watch sand pour through barriers

## Element Interactions

### Basic Interactions
- **Water + Fire** → Steam (fire extinguished)
- **Water + Lava** → Stone (lava solidifies after evaporating 5+ water pixels)
- **Fire + Wood/Oil/Gunpowder** → Ignition and burning
- **Lava** → Ignites combustibles, emits smoke, slowly cools to stone (5 minutes)
- **Ice + Heat** → Melts to water
- **Ice + Water** → Freezes adjacent water
- **Wood** → Buried in sand/stone for 20s becomes fossil
- **Fossil** → Slowly generates oil
- **Gunpowder + Fire** → Explosive burning
- **Fish** → Swims in water, AI-driven behavior
- **Trees** → Grow from seeds placed on valid surfaces

### Seasonal Interactions (v4.0.0)
- **Water (Winter)** → Surface freezes into ice when temperature < 0°C
- **Ice (Summer)** → Melts 2x faster in hot weather
- **Clouds (Winter)** → Drop snow instead of rain
- **Tree Leaves (Spring)** → Bright green, trees grow 2x faster
- **Tree Leaves (Summer)** → Deep green, normal growth
- **Tree Leaves (Autumn)** → Turn yellow/orange/red, fall gradually, branches may decay
- **Tree Leaves (Winter)** → Bare trees, no growth, some trees die
- **Birds (Autumn)** → Migrate upward and disappear
- **Birds (Spring)** → Return from migration, spawn at top of map

## Technical Details

- **Engine**: Phaser 3.86.0
- **Rendering**: WebGL with fallback to Canvas2D
- **Grid System**: 2D array-based cellular automata
- **Pixel Size**: 4x4 pixels for optimal performance
- **Physics**: Custom implementation using density-based interactions
- **Update Order**: Bottom-to-top with randomized left-right to prevent bias

## Performance

- **Target**: 60 FPS (maintained even with 10,000+ particles)
- **Optimizations**:
  - Active cell tracking (only updates non-empty cells)
  - Numeric coordinate keys (eliminates string parsing overhead)
  - Reduced interaction checks (every 2 frames)
  - Cached AI computations for fish
  - Water depth measurement limits
- **Mobile Optimized**: Tested on iOS Safari and Chrome for Android
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

## Recent Updates

### v4.0.0 - Four Seasons System
- ✅ **Seasonal Cycle**: Four seasons with automatic progression (spring → summer → autumn → winter)
- ✅ **Temperature System**: Dynamic temperature affecting water freezing, ice melting
- ✅ **Wind System**: Directional wind affecting clouds, varies by season
- ✅ **Tree Behaviors**: Seasonal leaf colors, growth rates, natural decay, bare winter trees
- ✅ **Bird Migration**: Birds migrate in autumn, return in spring
- ✅ **Weather System**: Rain in spring/summer, snow in winter
- ✅ **Visual Atmosphere**: Seasonal sky and sun tinting (warm autumn, cool winter)
- ✅ **Modular Managers**: SeasonManager, WindManager for centralized state
- ✅ **Behavior Composition**: Reusable seasonal behaviors (SurfaceFreezingBehavior, etc.)

### Previous Updates
- ✅ 30+ interactive elements with complex behaviors
- ✅ Reusable movement behaviors (gravity, liquid flow, gas)
- ✅ Unified state management with CellState
- ✅ Priority-based interaction system
- ✅ Performance optimizations (60 FPS with 10K+ particles)
- ✅ Mobile-friendly tooltips (show only while pressing)
- ✅ Fish AI with natural swimming behavior
- ✅ Tree growth system
- ✅ Lava-water realistic interaction

## Future Enhancements

- [ ] Electricity element with conduction
- [ ] Save/load scenes
- [ ] Particle spawn rate controls
- [ ] Sound effects
- [ ] Multi-player mode
- [ ] Element mixing/chemistry system

---

Enjoy creating your particle aquarium! 🎨🌊🔥
