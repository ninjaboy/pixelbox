# Current Task: Debug Touch/Drawing Issue After Modal

## Problem
After closing UnlockModal, touch events work (DOM touchstart/touchend fire) but Phaser's input system doesn't trigger `startDrawing`. Drawing works fine before the modal is shown.

## Root Cause Analysis

### Evidence from Sentry
- DOM touchstart/touchend events fire correctly AFTER modal close
- Phaser's `startDrawing` (via input.on('pointerdown')) does NOT fire after modal
- Timeline: "Modal hide" at 09:55:17, "Touch start" at 09:55:17 - but NO "Drawing start"

### Root Cause
Based on research ([Phaser Issue #3887](https://github.com/phaserjs/phaser/issues/3887)):
- When a modal overlay appears/disappears during a touch event on iOS WKWebView, iOS may fire a `touchcancel` event
- This corrupts Phaser's internal pointer tracking (`pointer.identifier` gets out of sync with `changedTouch.identifier`)
- Even though DOM touch events fire, Phaser's InputManager doesn't propagate them to scene handlers

### Fix Applied
Added `scene.input.resetPointers()` call in UnlockModal.hide():
```javascript
// Reset all pointer states - this is the key fix for iOS
if (typeof scene.input.resetPointers === 'function') {
    scene.input.resetPointers();
}
```

This resets Phaser's pointer instances, clearing any corrupted state from touchcancel events.

## Changes Made

### src/UnlockModal.js
1. Added `_lastHideTime` property to track when modal was hidden
2. Added `scene.input.resetPointers()` call after modal close (the key fix)
3. Enhanced telemetry to log pointer states before/after reset

### src/main.js
1. Enhanced DOM touchstart telemetry with:
   - `msSinceModalClose` - time since modal was last closed
   - `pointer0` state (active, isDown, wasCanceled)
2. Enhanced startDrawing telemetry with:
   - `msSinceModalClose`
   - `pointerId`, `pointerActive`, `pointerIsDown`

## Build Status
- ✅ Build completed successfully
- ✅ iOS assets synced with `npx cap copy ios`

## Testing Instructions
1. Deploy to iOS device via Xcode or fastlane
2. Open game, draw some elements (verify drawing works)
3. Tap a locked premium element to show UnlockModal
4. Close the modal (tap "Not Now" or background)
5. Try to draw on canvas again
6. **Expected**: Drawing should work immediately after modal close
7. Check Sentry for new telemetry events with `msSinceModalClose` data

## Key Files Changed
- `src/UnlockModal.js:310-362` - Modal hide() with resetPointers() fix
- `src/main.js:207-230` - Enhanced touchstart telemetry
- `src/main.js:923-940` - Enhanced startDrawing telemetry

## Sentry Verification
After deploying, check for events with these messages:
- `Modal restore input` - should show `resetPointersCalled: true`
- `DOM touchstart` - should show `msSinceModalClose` value when touch after modal
- `startDrawing called` - should appear after touches following modal close

```bash
curl -s -H "Authorization: Bearer $(cat ~/.sentry_token)" \
  "https://sentry.io/api/0/projects/lexxware/pixellence/issues/?statsPeriod=24h" | jq '.[] | {title, count, lastSeen}'
```

## References
- [Phaser Issue #3887](https://github.com/phaserjs/phaser/issues/3887) - iOS touch events bug
- [Phaser InputPlugin.resetPointers()](https://docs.phaser.io/api-documentation/class/input-inputplugin) - Method to reset pointer state
- [Phaser 3.60 Input Changelog](https://github.com/phaserjs/phaser/blob/v3.60.0/changelog/3.60/Input.md) - resetPointers addition
