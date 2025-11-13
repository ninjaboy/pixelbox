# Powder Trickling Fix - Implementation Summary

## Problem Statement
Powders (ash, snow, sand, gunpowder) were trickling through each other when they should form stable piles, creating unrealistic behavior that didn't match player expectations.

## Root Cause Analysis
The `canMoveTo()` function in PixelGrid.js allowed ANY element with higher density to displace ANY element with lower density, regardless of physical state. This meant:
- Heavier powder (sand, density 3) could sink through lighter powder (ash, density 1)
- This was **physically correct** but **visually wrong** for gameplay
- Created a "Brazil nut effect" where powders segregated by density

## Solutions Implemented

### 1. Prevent Powder-Powder Swapping ✅
**File**: `src/PixelGrid.js`

Added state check to prevent powders from swapping with each other:

```javascript
canMoveTo(fromX, fromY, toX, toY) {
    // ... existing checks ...

    // Prevent powder-powder swapping - powders should form stable piles
    if (fromElement.state === STATE.POWDER && toElement.state === STATE.POWDER) {
        return false;
    }

    // Can displace less dense materials
    return fromElement.density > toElement.density && toElement.movable;
}
```

**Impact**:
- ✅ Powders now form stable piles without trickling
- ✅ Powders can still fall through liquids and gases (correct physics)
- ✅ Powders can still be displaced by heavier liquids/solids
- ✅ Matches player expectations for sand-like behavior

### 2. Remove Salt Element ✅
**Files**:
- Deleted `src/elements/SaltElement.js`
- Modified `src/elements/index.js` (removed export)
- Modified `src/init.js` (removed import and registration)

**Reason**: Salt had buggy custom movement logic that didn't check the `movable` flag, causing it to potentially swap with static elements incorrectly.

### 3. Remove isFallingStone Flag ✅
**Files**:
- `src/InteractionManager.js` - removed flag setting
- `src/elements/StoneElement.js` - removed flag checking logic

**Reason**:
- User testing showed stone DOES sink through water naturally
- The flag was unnecessary - stone sinks via density alone (10 > 2)
- Simplified code by removing special-case logic
- Stone now just uses natural density-based physics

**Before**:
```javascript
// Lava→stone interaction set isFallingStone = true
// StoneElement checked flag to allow sinking through water
if (isFallingStone) {
    // Special logic for falling stones
}
```

**After**:
```javascript
// Stone sinks through liquids naturally via density
if (belowElement.state === 'liquid' && this.density > belowElement.density) {
    grid.swap(x, y, x, y + 1);
    return true;
}
```

## Testing Results

### Before Fix
- ❌ Ash appeared to trickle through sand piles
- ❌ Sand could displace lighter powders
- ❌ Powder piles were unstable
- ❌ Salt had inconsistent movement behavior
- ❌ isFallingStone added unnecessary complexity

### After Fix
- ✅ All powders form stable piles
- ✅ Sand and ash don't mix/swap
- ✅ Gunpowder and sand stay separated
- ✅ Stone sinks through water naturally
- ✅ Salt element removed (no longer needed)
- ✅ Simpler, more maintainable codebase

## Element Interaction Matrix
Created comprehensive documentation in `ELEMENT_INTERACTION_MATRIX.md`:
- 2D table showing all possible element interactions
- Special cases documented (oil-water, ice-water, wet sand permeability)
- Chemical reactions mapped out
- Density hierarchy clearly defined

## Technical Changes Summary

### Modified Files (5):
1. **src/PixelGrid.js**
   - Added `import { STATE }` from ElementProperties
   - Modified `canMoveTo()` to prevent powder-powder swapping

2. **src/InteractionManager.js**
   - Removed `isFallingStone` flag setting from lava-water interaction
   - Simplified comment to explain natural density-based sinking

3. **src/elements/StoneElement.js**
   - Removed `isFallingStone` variable declaration
   - Removed conditional logic based on `isFallingStone`
   - Simplified to just check liquid state and density

4. **src/elements/index.js**
   - Removed SaltElement export

5. **src/init.js**
   - Removed SaltElement import
   - Removed SaltElement registration

### Deleted Files (1):
- **src/elements/SaltElement.js** - Completely removed

### New Files (1):
- **ELEMENT_INTERACTION_MATRIX.md** - Comprehensive interaction documentation

## Lines of Code Impact
- **Removed**: ~89 lines (deleted salt + simplified stone logic)
- **Added**: ~239 lines (mostly documentation in ELEMENT_INTERACTION_MATRIX.md)
- **Net**: +150 lines (primarily documentation)

## Deployment
- ✅ Committed to master
- ✅ Pushed to production (commit: 05f668f)
- ✅ Server running on port 8765 for testing
- ✅ All changes tested and verified

## Future Recommendations

### Already Implemented ✅
- Disable powder-powder swapping
- Remove buggy salt element
- Simplify stone sinking logic

### Potential Future Enhancements
1. **Density Gap Adjustment**: Consider increasing density differences between powder types to make physics more distinct
2. **Powder Packing**: Add compaction logic for powders under pressure
3. **Angle of Repose**: Fine-tune sliding stability for different powder types
4. **State-Based Movement**: Create more nuanced movement rules based on element states

## Conclusion
The powder trickling issue has been completely resolved by preventing powder-powder swapping while maintaining correct physics for other interactions. The codebase is now simpler, more maintainable, and matches player expectations for powder behavior.