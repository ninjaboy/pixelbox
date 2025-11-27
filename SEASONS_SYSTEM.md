# Seasons System (v4.0.0)

**Version**: 4.0.0
**Last Updated**: 2025-11-27

## Overview

PixelBox features a comprehensive four-season cycle system that dynamically affects weather, temperature, vegetation, wildlife, and atmospheric visuals. Seasons progress automatically based on in-game time, with each season lasting configurable durations and bringing distinct environmental changes.

## Architecture

### Core Components

The seasons system is built on three primary manager classes and a collection of seasonal behaviors:

#### 1. SeasonManager (`/src/managers/SeasonManager.js`)

**Responsibilities**:
- Tracks current season and progression
- Manages season transitions
- Calculates dynamic temperature based on season and time of day
- Provides helper methods for seasonal queries (`shouldFreeze()`, `shouldMelt()`, etc.)
- Handles save/load serialization

**Key Methods**:
```javascript
update(deltaFrames)              // Advances season time
getCurrentSeason()               // Returns: 'spring', 'summer', 'autumn', 'winter'
getTemperature()                 // Returns normalized temp: -1 to 1
getSeasonProgress()              // Returns: 0.0 to 1.0 (progress through current season)
shouldFreeze()                   // Temperature-based freezing check
shouldMelt()                     // Temperature-based melting check
getLeafColor(season)             // Returns random seasonal leaf color
```

**Data Flow**:
```
SeasonManager.update()
  → seasonTime += deltaFrames
  → if seasonTime >= seasonLength: advanceSeason()
  → updateTemperature()
  → seasonData passed to PixelGrid
  → all elements can access via grid.seasonData
```

#### 2. WindManager (`/src/managers/WindManager.js`)

**Responsibilities**:
- Manages wind direction and strength
- Applies seasonal wind patterns (calm summers, gusty autumns)
- Updates wind state dynamically throughout the day
- Provides wind vector for particle physics

**Key Methods**:
```javascript
update(deltaFrames)              // Updates wind state
getWindDirection()               // Returns: -1 (left) or +1 (right)
getWindStrength()                // Returns: 0-3
getWindVector()                  // Returns: { x, y } force vector
```

**Seasonal Wind Patterns** (from `GameConfig.js`):
```javascript
WIND_PATTERNS: {
    spring: { strength: 1.5, variability: 0.8 },  // Gentle, variable
    summer: { strength: 0.5, variability: 0.3 },  // Calm, occasional breeze
    autumn: { strength: 2.5, variability: 1.2 },  // Strong, gusty
    winter: { strength: 2.0, variability: 0.5 },  // Strong, consistent
}
```

#### 3. SeasonalBehaviors (`/src/behaviors/SeasonalBehaviors.js`)

Reusable behavior classes that encapsulate season-dependent element transformations:

- **SurfaceFreezingBehavior**: Freezes water surfaces in winter (top 1-2 layers only)
- **SeasonalMeltingBehavior**: Modulates ice melt rate based on season/temperature
- **WindDriftBehavior**: Makes light particles drift with wind
- **TemperatureBasedSpawnBehavior**: Spawns snow vs rain based on temperature

### Integration Pattern

```
main.js (GameScene)
  ├─ SeasonManager.update()
  ├─ WindManager.update()
  ├─ seasonData → PixelGrid.setSeasonData()
  └─ Elements access via grid.seasonData:
      {
        season: 'winter',
        seasonProgress: 0.35,
        temperature: -0.2,
        windVector: { x: 0.8, y: 0 },
        windDirection: 1,
        windStrength: 2
      }
```

## Configuration

All seasonal parameters are centralized in `/src/config/GameConfig.js`:

### Time Configuration

```javascript
DAY_LENGTH: 10000,           // frames per day (166.67 seconds at 60 FPS)
MONTH_LENGTH: 3,             // days per month
SEASON_LENGTH: 9,            // days per season (3 months)
START_SEASON: 'random',      // 'random' or specific season name
```

**Total season duration**: 9 days × 10,000 frames = 90,000 frames (25 minutes at 60 FPS)

### Temperature Ranges

Normalized scale from -1 (coldest) to +1 (hottest):

```javascript
TEMPERATURE: {
    spring: { min: 0.3, max: 0.6 },   // Mild
    summer: { min: 0.7, max: 1.0 },   // Hot
    autumn: { min: 0.3, max: 0.5 },   // Cool
    winter: { min: -0.5, max: 0.2 }   // Cold
}
```

Temperature varies dynamically within the range based on time of day (cooler at night, warmer at noon).

### Seasonal Modifiers

#### Tree Growth Multipliers
```javascript
TREE_GROWTH_MULTIPLIER: {
    spring: 0.5,    // 2x faster growth
    summer: 1.0,    // normal growth
    autumn: 2.0,    // 2x slower growth
    winter: 999,    // effectively stopped
}
```

#### Leaf Colors
```javascript
LEAF_COLORS: {
    spring: [0x90EE90, 0x98FB98, 0x9ACD32],                              // Light greens
    summer: [0x228B22, 0x2E8B57, 0x3CB371],                              // Deep greens
    autumn: [0xFFD700, 0xFFA500, 0xFF8C00, 0xFF6347, 0xFF4500, 0xDC143C], // Yellows, oranges, reds
    winter: [0x8B7355]                                                    // Brown (dead leaves)
}
```

#### Cloud Spawn Multipliers
```javascript
CLOUD_SPAWN_MULTIPLIER: {
    spring: 1.5,    // 50% more clouds (rainy season)
    summer: 0.5,    // 50% fewer clouds (clear skies)
    autumn: 1.2,    // Slightly more clouds
    winter: 1.3,    // More clouds (snow potential)
}
```

### Visual Tints

#### Sky Tinting
```javascript
SKY_TINT: {
    spring: { r: 1.0, g: 1.05, b: 1.1 },   // Slight blue-pink tint
    summer: { r: 1.1, g: 1.1, b: 1.15 },   // Bright vibrant
    autumn: { r: 1.15, g: 1.0, b: 0.9 },   // Warmer, amber
    winter: { r: 0.9, g: 0.95, b: 1.0 },   // Cooler, pale
}
```

#### Sun Tinting
```javascript
SUN_TINT: {
    spring: { r: 1.0, g: 1.0, b: 0.9 },
    summer: { r: 1.1, g: 1.1, b: 1.0 },    // Bright yellow-white
    autumn: { r: 1.05, g: 0.95, b: 0.85 },
    winter: { r: 0.95, g: 0.95, b: 0.9 },  // Pale yellow
}
```

## Seasonal Effects by Element

### Water (`WaterElement.js`)

**Winter Behavior**:
- Surface freezing when `temperature < 0`
- Only top 1-2 layers freeze (surface detection via `SurfaceFreezingBehavior`)
- Deep water stays liquid
- Flowing water less likely to freeze

**Implementation**:
```javascript
// SurfaceFreezingBehavior checks:
- Is water cell within 2 pixels of air? (surface detection)
- Is temperature < 0?
- Random chance: 0.02 (2% per frame) to freeze
→ Converts to ice
```

### Ice (`IceElement.js`)

**Seasonal Melting Rates**:
```javascript
// SeasonalMeltingBehavior modulates base melt rate:
baseMeltChance = 0.05
seasonalMultiplier:
  - spring: 1.5x (faster melting)
  - summer: 2.0x (rapid melting)
  - autumn: 1.0x (normal)
  - winter: 0.1x (10x slower, near-permanent)
```

### Clouds (`CloudElement.js`)

**Winter**: Snow Clouds
- Clouds spawned in winter are marked with `cell.data.isSnowCloud = true`
- Snow clouds precipitate **snow** instead of water
- Wind affects horizontal drift speed and direction

**Wind-Affected Movement**:
```javascript
baseDriftChance = 0.4
baseDriftChance += windStrength * 0.1
windDirection = seasonData.windDirection  // -1 or +1
```

### Trees

#### TreeSeedElement (`TreeSeedElement.js`)

**Growth Speed**:
```javascript
adjustedDelay = TREE_CONFIG.growthDelay * seasonalMultiplier
// Spring: grows 2x faster
// Summer: normal
// Autumn: 2x slower
// Winter: effectively stopped (999x multiplier)
```

**Germination**:
- Seeds check conditions continuously before committing to grow
- Minimum spacing from other trees: 12 pixels
- Valid surfaces: sand, wet_sand, stone, wall, wood, tree_trunk, tree_branch, fossil, ash

#### TreeTrunkElement (`TreeTrunkElement.js`)

**Winter/Autumn Decay**:
```javascript
decayChance = season === 'winter' ? 0.00002 : 0.00001  // 0.002% winter, 0.001% autumn
→ Converts to ash (tree dies)
```

**Spring Regrowth**:
```javascript
regrowthRate = season === 'spring' ? 0.0001 : 0.00002  // 0.01% spring, 0.002% other
→ Spawns leaf if trunk is completely bare
```

#### TreeBranchElement (`TreeBranchElement.js`)

**Seasonal Branch Decay**:
```javascript
decayChance = season === 'winter' ? 0.00002 : 0.00001
→ Converts to movable wood (falls)
```

**Spring Regrowth**:
```javascript
regrowthRate = season === 'spring' ? 0.0001 : 0.00005
→ Spawns leaf if no leaves nearby
```

#### LeafElement (`LeafElement.js`)

**Seasonal Colors**:
- On first update, leaf color is randomly selected from seasonal palette
- Color stored in `cell.data.leafColor`
- Color persists until leaf detaches

**Seasonal Falling**:
```javascript
autumn: 0.002 chance per frame (0.2%) → cell.data.detached = true
winter: 0.005 chance per frame (0.5%) → cell.data.detached = true
spring/summer: leaves don't fall
```

**Detached Leaves**:
- Fall regardless of structural support
- Decay faster when on ground (0.5% per frame)
- Eventually turn brown and disappear

### Birds (`BirdElement.js`)

#### Migration System

**Autumn (mid-season)**:
```javascript
if (season === 'autumn' && seasonProgress > 0.5) {
    cell.data.migrating = true
}
```

**Migration Behavior**:
- Birds prioritize flying upward (ignore food, avoid predators weakly)
- Despawn when reaching y < 10 (migrated off-screen)

**Spring Return**:
```javascript
if (seasonManager.isEarlySpring() && !birdsReturned) {
    spawnSpringBirds()  // Spawns 5-10 birds at y: 10-20
}
```

## Temperature System

### Calculation

Temperature is dynamically calculated based on:
1. **Season**: Base temperature range
2. **Time of Day**: Cooler at night, warmer at noon

```javascript
updateTemperature(deltaFrames) {
    const season = this.getCurrentSeason();
    const { min, max } = this.config.TEMPERATURE[season];

    // Time-of-day variation
    const time = this.seasonTime % this.dayLength / this.dayLength;
    const noonHeat = Math.sin((time - 0.25) * Math.PI * 2); // -1 to 1

    // Base temperature + daily variation
    const baseTemp = (min + max) / 2;
    const tempRange = (max - min) / 2;
    this.temperature = baseTemp + (noonHeat * tempRange * 0.5);
}
```

**Example** (Winter):
- Winter range: -0.5 to 0.2
- Base temp: -0.15
- At noon: -0.15 + (1.0 × 0.35 × 0.5) = -0.15 + 0.175 = 0.025 (just above freezing)
- At midnight: -0.15 + (-1.0 × 0.35 × 0.5) = -0.325 (well below freezing)

### Temperature-Based Queries

```javascript
shouldFreeze()  // temperature < 0
shouldMelt()    // temperature > 0.3
```

## Wind System

### Wind State Machine

Wind changes dynamically using a state machine:

```javascript
State: { direction, strength, targetStrength, changeTimer }

Every N frames:
  1. Select new target strength based on seasonal pattern
  2. Apply seasonal modifiers (gusts in autumn/winter, calm in summer)
  3. Smoothly interpolate current strength → target strength
  4. Occasionally flip direction
```

### Wind Effects

**Clouds**:
- Horizontal drift speed increases with wind strength
- Direction follows wind direction

**Light Particles** (potential future use with `WindDriftBehavior`):
- Ash, smoke, leaves affected by wind
- Drift force: `windVector.x * particleMass`

## Visual & Atmospheric Changes

### Sky Rendering

Sky colors are tinted by season using RGB multipliers:

```javascript
// In renderSky() method (main.js:997-1003)
const seasonalTint = GAME_CONFIG.SKY_TINT[season];
skyColors.top = this.tintColor(skyColors.top, seasonalTint);
skyColors.bottom = this.tintColor(skyColors.bottom, seasonalTint);
```

**Tinting Algorithm**:
```javascript
tintColor(color, tint) {
    r' = min(255, r × tint.r)
    g' = min(255, g × tint.g)
    b' = min(255, b × tint.b)
}
```

**Result**:
- **Summer**: Bright, vibrant blue sky (all RGB boosted)
- **Winter**: Pale, cool tones (red reduced, blue slightly boosted)
- **Autumn**: Warm amber hues (red boosted, blue reduced)
- **Spring**: Slight blue-pink tint (green/blue boosted)

### Sun Rendering

Sun colors are also tinted by season:
- **Summer**: Bright yellow-white sun
- **Winter**: Pale, weak sun
- **Autumn**: Orange-amber sun
- **Spring**: Neutral warm sun

### Moon Rendering

Moon is not affected by seasonal tints (realistic lunar color always).

## Weather System Integration

### Cloud Spawning

Cloud spawn rate is modulated by season:

```javascript
// In updateCloudSystem() (main.js:733)
const seasonalMultiplier = this.seasonManager.getCloudSpawnMultiplier();
spawnInterval = baseInterval / seasonalMultiplier;
```

**Result**:
- **Spring**: 50% more clouds (rainy season)
- **Summer**: 50% fewer clouds (clear skies)
- **Autumn**: 20% more clouds
- **Winter**: 30% more clouds (for snow)

### Precipitation Type

```javascript
// In CloudElement.js
const isSnowCloud = cell.data.isSnowCloud === true;
const precipElement = grid.registry.get(isSnowCloud ? 'snow' : 'water');
```

## Performance Considerations

The seasons system is designed for 60 FPS performance:

1. **Probabilistic Updates**: Season-dependent behaviors use low-probability checks (0.001%-0.5% per frame) to avoid every-frame processing

2. **Cached Season Data**: Season state is calculated once per frame in managers, then passed to all elements via `grid.seasonData`

3. **Lazy Evaluation**: Temperature, wind, and other calculations only happen when needed

4. **Behavior Composition**: Reusable behaviors avoid code duplication and allow element-specific optimization

5. **Frame Budgeting**: All seasonal updates are staggered across frames using probabilistic rates

## Save/Load Support

SeasonManager provides serialization:

```javascript
serialize() {
    return {
        currentSeason: this.currentSeason,
        seasonTime: this.seasonTime,
        temperature: this.temperature
    };
}

deserialize(data) {
    this.currentSeason = data.currentSeason || 'spring';
    this.seasonTime = data.seasonTime || 0;
    this.temperature = data.temperature || 0.5;
}
```

Integration point in main.js save/load logic (future enhancement).

## Testing & Debugging

### Console Logging

Season transitions are logged:
```
🍂 Season changed: summer → autumn
🐦 5 birds returned for spring!
```

### Manual Season Advancement (Dev Mode)

Add to main.js for testing:
```javascript
// Debug: Press 'S' to advance season
if (Phaser.Input.Keyboard.JustDown(this.keys.S)) {
    this.seasonManager.advanceSeason();
}
```

### Temperature Visualization

Add UI indicator (future enhancement):
```javascript
const temp = this.seasonManager.getTemperature();
const tempColor = temp < 0 ? 0x4444ff : (temp > 0.5 ? 0xff4444 : 0x44ff44);
this.debugText.setText(`Season: ${season} | Temp: ${temp.toFixed(2)}`);
```

## Future Enhancements

Potential improvements for future versions:

1. **Player Temperature**: Players lose health in extreme cold/heat
2. **Crop Seasons**: Certain plants only grow in specific seasons
3. **Seasonal Events**: Meteor showers in summer, auroras in winter
4. **Animal Hibernation**: Bears/creatures sleep in winter
5. **Ice Mechanics**: Slippery ice surfaces, ice structures
6. **Snow Accumulation**: Snow builds up on ground over time
7. **Seasonal Music**: Background music changes with seasons
8. **Weather Transitions**: Gradual season changes (early/mid/late spring)

## Version History

- **v4.0.0** (2025-11-27): Initial seasons system implementation
  - Four seasons with automatic progression
  - Temperature and wind systems
  - Seasonal tree behaviors (growth, decay, leaves)
  - Bird migration
  - Surface water freezing
  - Seasonal sky/sun tinting
  - Snow clouds in winter
