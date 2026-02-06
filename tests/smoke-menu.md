# Smoke Test: Menu Button Functionality

## Prerequisites
- App running on device or simulator
- Console access (Safari Web Inspector / Chrome DevTools)

## Test Steps

### 1. Initial Menu Load
1. Fresh app start
2. **Expected**: MainMenuScene loads, buttons visible
3. **Check console**: No errors, `🎮 MainMenuScene input state` shows `inputEnabled: true`

### 2. New Game Button
1. Tap "New Game"
2. **Expected**: Console shows `👇 Press: New Game`, `🔘 Button "New Game" clicked!`
3. **Expected**: Screen fades to GameScene

### 3. Menu Button from Game
1. While in GameScene, tap ☰ (menu button in header)
2. **Expected**: Console shows `☰ Menu button pressed`, `🎬 Switching to MainMenuScene...`
3. **Expected**: Console shows `📐 MainMenuScene: Canvas bounds updated`
4. **Expected**: Console shows `🎯 Canvas refocused after menu transition`

### 4. Button Click After Return
1. After returning to menu (step 3), tap "New Game"
2. **Expected**: Console shows hover/press/click events
3. **Expected**: Scene transitions to GameScene

### 5. Repeat Test
1. Return to menu again (☰)
2. Tap "Settings"
3. **Expected**: Settings overlay appears
4. Close settings (tap outside or X)
5. **Expected**: Buttons still work

## Debug Commands (Console)

```javascript
// Check input state
window.__pixelboxGame.scene.getScene('MainMenuScene').input.enabled
window.__pixelboxGame.scene.getScene('MainMenuScene').input.manager.enabled

// Force enable input
const scene = window.__pixelboxGame.scene.getScene('MainMenuScene');
scene.input.enabled = true;
scene.input.manager.enabled = true;
scene.scale.updateBounds();

// List all interactive objects
scene.input.gameObjects
```

## Common Issues

1. **Buttons don't respond**: Check if overlays are visible (settings-overlay, grimoire-overlay)
2. **Touch offset wrong**: Call `scene.scale.updateBounds()` after DOM changes
3. **Input disabled**: Check `scene.input.enabled` and `scene.input.manager.enabled`

## Pass Criteria
- [ ] All button clicks register in console
- [ ] Scene transitions work bidirectionally
- [ ] No stuck touch states
- [ ] Settings overlay opens/closes without breaking buttons
