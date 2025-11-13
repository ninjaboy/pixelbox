# Element Interaction Matrix

## Can Element A Displace Element B? (Movement/Swapping Table)

This table shows whether one element can swap positions with another based on density and movement rules.

Legend:
- ✅ YES - Can swap/displace (A.density > B.density AND B.movable)
- ❌ NO - Cannot swap (A.density <= B.density OR !B.movable)
- ⚠️ SPECIAL - Custom interaction rule applies
- 🔥 CHEMICAL - Chemical/physical interaction instead of swapping

## Full Interaction Matrix

|  | empty | fire | smoke | steam | ash | snow | oil | ice | slush | water | sand | gunpowder | salt | wood | glass | lava | wet_sand | stone | obsidian | wall |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **empty** (0) | - | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **fire** (0/GAS) | ✅ | - | ❌ | ❌ | ❌ | ❌ | 🔥 | ❌ | ❌ | 🔥 | ❌ | 🔥 | ❌ | 🔥 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **smoke** (0/GAS) | ✅ | ❌ | - | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **steam** (0/GAS) | ✅ | ❌ | ❌ | - | ❌ | ❌ | ❌ | 🔥 | ❌ | ❌ | 🔥 | ❌ | ❌ | 🔥 | ❌ | ❌ | ❌ | 🔥 | ❌ | ❌ |
| **ash** (1/PWD) | ✅ | ✅ | ✅ | ✅ | - | ❌ | ❌ | ❌ | ❌ | 🔥 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **snow** (1/PWD) | ✅ | ✅ | ✅ | ✅ | ❌ | - | ❌ | ❌ | ❌ | 🔥 | ❌ | ❌ | ❌ | ❌ | ❌ | 🔥 | ❌ | ❌ | ❌ | ❌ |
| **oil** (1.5/LIQ) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔥 | ❌ | ❌ | ❌ | ❌ |
| **ice** (1.8/SOL) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔥 | ❌ | ❌ | ❌ | ❌ |
| **slush** (1.9/LIQ) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🔥 | ❌ | ❌ | ❌ | ❌ |
| **water** (2/LIQ) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ✅ | - | 🔥 | ❌ | 🔥 | ❌ | ❌ | 🔥 | ⚠️ | ❌ | ❌ | ❌ |
| **sand** (3/PWD) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **gunpowder** (3/PWD) | ✅ | 🔥 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | - | ❌ | ❌ | ❌ | 🔥 | ❌ | ❌ | ❌ | ❌ |
| **salt** (4/SOL⚠️) | ✅ | ✅ | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | 🔥 | ⚠️ | ⚠️ | - | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **wood** (5/SOL) | ❌ | 🔥 | ❌ | ❌ | ❌ | ❌ | 🔥 | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | - | ❌ | 🔥 | ❌ | ❌ | ❌ | ❌ |
| **glass** (5/SOL) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | - | ❌ | ❌ | ❌ | ❌ | ❌ |
| **lava** (8/LIQ) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🔥 | ✅ | ✅ | ✅ | 🔥 | ✅ | - | ❌ | ❌ | ❌ | ❌ |
| **wet_sand** (9/PWD) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ | - | ❌ | ❌ | ❌ |
| **stone** (10/SOL) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | - | ❌ | ❌ |
| **obsidian** (15/SOL) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | - | ❌ |
| **wall** (100/SOL) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | - |

## Detailed Special Cases

### ⚠️ Oil-Water Interaction
- **Oil floats on water** (oil-water separation interaction)
- If oil is BELOW water, they swap (20% chance per frame)
- If oil is ABOVE water, stays stable (oil naturally floats)
- Priority: 15 (low priority interaction)

### ⚠️ Ice-Water Interaction
- **Ice floats on water** (density: 1.8 < 2)
- Ice should NOT sink through water
- If ice is below water, they swap to make ice float up

### ⚠️ Water-Wet Sand Interaction
- **Water seeps through wet sand** (permeability)
- 5% chance per frame for water to pass through wet sand
- Simulates porous nature of wet sand
- Wet sand (9) is denser than water (2), but water can still seep

### ⚠️ Stone-Water Interaction
- **Falling stone sinks through water** (special flag)
- When lava solidifies to stone, it gets `isFallingStone = true`
- Falling stones can pass through water despite being solid
- Regular placed stone does NOT sink

### ⚠️ Salt Special Movement
- **Salt uses CUSTOM movement logic** (not GravityBehavior)
- Swaps with ANY element with lower density
- Does NOT check `movable` flag - **THIS IS A BUG**
- Can potentially swap with static elements incorrectly

## Chemical/Physical Interactions (🔥)

### Fire Interactions
| Elements | Result | Chance | Priority |
|----------|--------|--------|----------|
| fire + water | fire → smoke, water → steam (50%) | 70% | 7 |
| fire + oil | oil → fire | 15% | 5 |
| fire + wood | wood → fire | 15% | 5 |
| fire + gunpowder | gunpowder → fire | 15% | 5 |

### Lava Interactions
| Elements | Result | Chance | Priority |
|----------|--------|--------|----------|
| lava + water | lava → stone (20%), water → steam | always | 0 |
| lava + snow | snow → water/slush | melts | - |
| lava + ice | ice → water | melts | - |
| lava + wood | wood → fire | 15% | 5 |
| lava + oil | oil → fire | 15% | 5 |
| lava + gunpowder | gunpowder → fire | 15% | 5 |

### Water Interactions
| Elements | Result | Chance | Priority |
|----------|--------|--------|----------|
| water + sand | sand → wet_sand | 5% | 10 |
| water + lava | lava → stone, water → steam | 20% | 0 |
| water + fire | fire → smoke, water → steam | 70% | 7 |
| water + salt | salt dissolves (removed) | 15% | - |
| water + ash | ash dissolves (removed) | varies | - |

### Steam Interactions
| Elements | Result | Chance | Priority |
|----------|--------|--------|----------|
| steam + ice | steam → water (rapid) | 30% | 8 |
| steam + stone | steam → water (slow) | 5% | 16 |
| steam + wood | steam → water (slow) | 5% | 16 |
| steam + sand | steam → water (slow) | 5% | 16 |
| steam + wet_sand | steam → water (slow) | 5% | 16 |

## Problematic Powder Interactions

### Issue 1: Same-Density Powders
**Problem**: Sand (3) and Gunpowder (3) have identical density
- Neither can displace the other through normal rules
- Swapping behavior becomes random/chaotic
- Creates "mixing" effect when they should form stable layers

### Issue 2: Salt's Custom Movement
**Problem**: Salt (4) uses custom logic that doesn't check `movable` flag
```javascript
// Current code in SaltElement.js:
if (below && below.density < this.density) {
    grid.swap(x, y, x, y + 1);  // NO MOVABLE CHECK!
    return true;
}
```
**Impact**:
- Salt can swap with elements marked as non-movable
- Could cause salt to fall through static elements incorrectly
- Inconsistent with GravityBehavior used by other powders

### Issue 3: Powder-Through-Powder Cascading
**Scenario**:
```
Frame 1: [sand(3)] → [ash(1)] → [empty]
Frame 2: Sand swaps with ash
Result:  [ash(1)] → [sand(3)] → [empty]
Frame 3: Sand falls to empty
Result:  [ash(1)] → [empty] → [sand(3)]
Frame 4: Ash falls
Result:  [empty] → [ash(1)] → [sand(3)]
```

**This creates visual "trickling"** where lighter powder appears to pass through heavier powder, but it's actually:
1. Heavier powder sinking (correct)
2. Lighter powder filling the gap (correct)
3. Net effect: lighter powder moves up relative to heavier powder

**Is this physically correct?** YES - this is how powder segregation works in real life (Brazil nut effect).

**Why does it look wrong?** Players expect powders to form stable piles without mixing.

## Recommendations to Fix Powder Behavior

### Option 1: Disable Powder-Powder Swapping
Modify `canMoveTo()` to prevent powders from swapping with each other:

```javascript
canMoveTo(fromX, fromY, toX, toY) {
    // ... existing checks ...

    // NEW: Powders should not swap with other powders
    if (fromElement.state === STATE.POWDER && toElement.state === STATE.POWDER) {
        return false;
    }

    // Existing: Can displace less dense materials
    return fromElement.density > toElement.density && toElement.movable;
}
```

### Option 2: Add Minimum Density Gap
Require significant density difference for powder swapping:

```javascript
canMoveTo(fromX, fromY, toX, toY) {
    // ... existing checks ...

    // NEW: Require 2+ density difference for powder swapping
    if (fromElement.state === STATE.POWDER && toElement.state === STATE.POWDER) {
        return (fromElement.density - toElement.density) >= 2;
    }

    return fromElement.density > toElement.density && toElement.movable;
}
```

### Option 3: Fix Salt and Normalize Movement
Make salt use GravityBehavior like other powders:

```javascript
// In SaltElement.js constructor:
constructor() {
    super(12, 'salt', 0xffffff, {
        density: 4,
        state: STATE.POWDER,  // Change from SOLID
        // ... other properties
    });

    this.addBehavior(new GravityBehavior({
        fallSpeed: 1,
        slideStability: 0.85
    }));
}
```

### Option 4: Increase Density Gaps
Spread out powder densities to reduce same-density conflicts:

| Element | Current | Proposed | Reason |
|---------|---------|----------|--------|
| ash | 1 | 1 | Light debris |
| snow | 1 | 1 | Light flakes |
| sand | 3 | 4 | Medium weight |
| gunpowder | 3 | 5 | Slightly heavier than sand |
| salt | 4 | 6 | Heavier crystals |
| wet_sand | 9 | 10 | Very heavy when wet |

## Summary: Current Powder Trickling Issues

**Root Causes Identified:**

1. ✅ **Physics is mostly correct** - Heavier powders SHOULD sink through lighter ones
2. ⚠️ **Salt bug** - Uses custom movement without movable check
3. ⚠️ **Same-density conflict** - Sand & gunpowder have identical density (3)
4. ⚠️ **Visual perception** - Correct physics looks wrong to players expecting stable powder piles
5. ⚠️ **Cascading effect** - Rapid swapping creates "trickling" appearance

**Player Expectations vs Reality:**
- Players expect: Powders form stable piles like real sand
- Current behavior: Powders segregate by density (physically correct)
- Issue: Visual appearance doesn't match expectations

**Recommended Fix:**
Implement **Option 1** (disable powder-powder swapping) to match player expectations, while keeping powder-liquid and powder-gas interactions working correctly.