# House Builder Element Design

## Concept
A "seed" element that, when placed, autonomously builds a small house structure over time. The house will have:
- Foundation (3-5 pixels wide)
- 2-3 stories with walls
- Roof
- Windows and doors

## Building Phases

### Phase 1: Foundation (Frames 0-60)
```
[empty] [empty] [empty] [empty] [empty]
[empty] [empty] [SEED] [empty] [empty]
[stone] [stone] [stone] [stone] [stone]  <- Build foundation
```
- Check if seed is on solid ground or build foundation
- Foundation width: 5 blocks (2 left, 2 right from seed)
- Material: Stone (heavy, permanent)
- Build left-to-right

### Phase 2: First Floor (Frames 60-180)
```
[empty] [empty] [empty] [empty] [empty]
[wood]  [empty] [empty] [empty] [wood]   <- Walls
[wood]  [empty] [empty] [empty] [wood]   <- Walls (3 high)
[wood]  [empty] [DOOR]  [empty] [wood]   <- Door
[stone] [stone] [stone] [stone] [stone]  <- Foundation
```
- Build left wall (wood, 3 blocks high)
- Build right wall (wood, 3 blocks high)
- Place door in center of ground floor
- Interior stays empty for now

### Phase 3: Second Floor (Frames 180-300)
```
[empty] [empty] [empty] [empty] [empty]
[wood]  [empty] [glass] [empty] [wood]   <- Walls with window
[wood]  [wood]  [wood]  [wood]  [wood]   <- Floor/ceiling
[wood]  [empty] [empty] [empty] [wood]
[wood]  [empty] [empty] [empty] [wood]
[wood]  [empty] [empty] [empty] [wood]
[stone] [stone] [stone] [stone] [stone]
```
- Build ceiling/floor separator (wood across)
- Build second floor walls
- Add window (glass) in wall

### Phase 4: Third Floor (Frames 300-420) [Optional]
- Same as second floor
- Another story with window

### Phase 5: Roof (Frames 420-540)
```
[empty] [empty] [stone] [empty] [empty]  <- Peak
[empty] [stone] [empty] [stone] [empty]  <- Roof slope
[stone] [empty] [empty] [empty] [stone]  <- Roof edge
[wood]  [empty] [glass] [empty] [wood]   <- Top floor
...rest of house...
```
- Build triangular/sloped roof
- Material: Stone (weatherproof)
- Peaked design

### Phase 6: Completion (Frame 540+)
- Seed transforms into a decorative element or disappears
- House is complete and permanent

## State Machine

```javascript
{
    buildPhase: 'foundation' | 'floor1' | 'floor2' | 'floor3' | 'roof' | 'complete',
    buildProgress: 0-100,  // Progress within current phase
    buildTimer: 0,         // Frames elapsed
    foundationX: number,   // Starting X for foundation
    foundationY: number,   // Starting Y for foundation
    currentX: number,      // Current building position X
    currentY: number,      // Current building position Y
    houseWidth: 5,         // Total width
    storyHeight: 3,        // Height per story
    numStories: 2,         // 2-3 stories
}
```

## Building Algorithm

### Foundation Phase
1. Check if on solid ground (below is solid/powder)
2. If not, place stone foundation below
3. Build 5-wide foundation centered on seed
4. Build one block per frame (smooth animation)

### Wall Building
1. Start from bottom-left corner
2. Build upward (one block per frame)
3. Move to right side
4. Build upward
5. Leave space for door/windows

### Floor/Ceiling
1. Build horizontal line of wood
2. Left to right, one block per frame

### Roof
1. Build from edges toward center
2. Create peaked/triangular shape
3. Use stone for durability

## Visual Progress
- Seed changes color as it builds:
  - Foundation: Brown
  - Walls: Tan
  - Roof: Gray
  - Complete: Green

## Materials Used
- **Stone**: Foundation, roof (density 10, solid)
- **Wood**: Walls, floors (density 5, solid, combustible)
- **Glass**: Windows (density 5, solid, transparent)
- **Empty**: Door, interior spaces

## Edge Cases
1. **Building over water**: Foundation will sink, build on seafloor
2. **Obstacles in path**: Skip occupied spaces, continue building
3. **Interrupted build**: Resume from last position
4. **Multiple seeds**: Each builds independently
5. **Player interference**: Continue building around player

## Configuration
```javascript
const HOUSE_CONFIG = {
    FOUNDATION_WIDTH: 5,
    STORY_HEIGHT: 3,
    NUM_STORIES: 2,
    BUILD_SPEED: 1,        // Blocks per frame
    FOUNDATION_TIME: 60,   // Frames
    FLOOR_TIME: 120,       // Frames per floor
    ROOF_TIME: 120,        // Frames
    MATERIALS: {
        foundation: 'stone',
        walls: 'wood',
        floor: 'wood',
        roof: 'stone',
        window: 'glass'
    }
};
```

## Implementation Notes
- Seed should be immovable during construction
- Each frame, check state and build next block
- Store complete state in cell.data
- Visual feedback: Change seed color based on phase
- Completion: Seed turns green or disappears

## Future Enhancements
- Random house sizes (3-7 wide, 1-3 stories)
- Different house styles (cabin, tower, mansion)
- Interior furniture placement
- Chimney with smoke
- Garden around house
- Village generation (multiple houses)
