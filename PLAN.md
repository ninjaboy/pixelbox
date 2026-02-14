# Save/Load System — Bug Analysis & Fix Plan

## CRITICAL BUGS (crashes, data loss)

### BUG-1: Missing methods in SaveLoadModal — CRASH on save
**File:** `src/SaveLoadModal.js:425-453`
**Impact:** Save button crashes the app

Three methods are called but **never defined**:
- `_setBusy(true/false)` — called at lines 437, 453
- `_showConfirm(msg, callback)` — called at line 425
- `_doOverwrite(name)` — called at line 426

**Result:**
- Clicking SAVE with a new name → `TypeError: this._setBusy is not a function` at line 437
- Clicking SAVE with an existing name → `TypeError: this._showConfirm is not a function` at line 425
- This is the most likely cause of user-reported "save breaks"

**Fix:** Implement all three methods. `_setBusy` sets/clears `this._busy` flag. `_showConfirm` shows a confirmation dialog (DOM overlay). `_doOverwrite` calls `saveToSlot` with busy guard.

---

### BUG-2: No localStorage quota handling — silent data loss
**Files:** `src/StorageManager.js` (all write operations)
**Impact:** Saves silently fail, users lose worlds

Capacitor Preferences on web = localStorage (5MB limit). A single world save can be 500KB-2MB (grid elements + cellData + base64 encoding + thumbnail). With 20 slots, the system tries to store 10-40MB.

**No `QuotaExceededError` handling anywhere.** When storage is full:
- `Preferences.set()` throws, caught by generic try/catch
- `saveWorld()` returns `false`, user sees "Save failed!" with no explanation
- Auto-save silently fails forever, user doesn't know
- Partial writes possible: world data saved but list update fails (or vice versa)

**Fix:**
1. Catch `QuotaExceededError` specifically, show "Storage full" message with suggestions
2. Estimate size before saving, warn user proactively
3. Consider compressing world data (e.g., RLE for element IDs, pako/gzip for JSON)

---

### BUG-3: Race condition — auto-save overwrites loaded world
**Files:** `src/main.js:780-788`, `index.html:1212-1223`, `src/WorldSerializer.js:415`
**Impact:** Loaded world replaced with previous world's data

**Scenario:**
1. User has world A auto-saved in `pixelbox_current_world`
2. Auto-save fires at T=0, calls `serializeWorld()` (synchronous, captures world A)
3. Auto-save awaits `storageManager.saveCurrentWorld(worldDataA)`
4. During that await, user clicks LOAD on world B
5. `deserializeWorld()` runs synchronously, grid now contains world B
6. Auto-save's `Preferences.set` completes — writes world A data to `current_world`
7. User closes app → next launch restores world A, world B load is lost

**Fix:** Add a serialization lock/flag. Auto-save should check if a manual operation is in progress and skip. After loading a world, immediately trigger a fresh auto-save.

---

### BUG-4: Race condition — auto-save during initial world load
**File:** `src/main.js:200-214`
**Impact:** Auto-save captures partially-loaded grid

Timeline:
1. Line 202: `this.loadSavedWorld()` — **not awaited** (fire-and-forget async)
2. Line 208: `this.sceneReady = true` — set before load completes
3. Line 214: `this.startAutoSave()` — timer starts
4. `loadSavedWorld` is still awaiting `storageManager.loadCurrentWorld()`
5. If 30s timer fires (unlikely but possible on slow devices), or visibilitychange fires, auto-save captures incomplete state

**Fix:** `await this.loadSavedWorld()` before setting `sceneReady = true` and starting auto-save.

---

### BUG-5: World list / world data inconsistency
**File:** `src/StorageManager.js:31-64`
**Impact:** Phantom worlds in list, or orphaned data

`saveWorld()` does two separate writes:
1. Save world data → `Preferences.set(worldKey, ...)`
2. Update world list → `Preferences.set(WORLD_LIST_KEY, ...)`

If the app crashes/is killed between steps 1 and 2, the data exists but isn't in the list. If step 1 fails (quota) but step 2 succeeds, the list shows a world that can't be loaded.

Same issue in `deleteWorld()`: removes data first, then updates list.

**Fix:** Consider atomic operations or at minimum reverse the order (update list last for saves, update list first for deletes). Add a consistency check on init.

---

## HIGH PRIORITY BUGS (bad UX, data integrity)

### BUG-6: `_handleLoad` and `_handleOverwrite` have no busy guard
**File:** `src/SaveLoadModal.js:461-493`
**Impact:** Double-tap/rapid clicks cause concurrent operations

`_handleSave` checks `this._busy`, but `_handleLoad` and `_handleOverwrite` don't. Users can:
- Rapidly click LOAD → two concurrent `deserializeWorld` calls → corrupted grid
- Rapidly click SAVE on a row → two concurrent `saveToSlot` calls → race on storage writes

**Fix:** Add `if (this._busy) return;` guard to both handlers.

---

### BUG-7: Thumbnails stored redundantly — inflates storage
**File:** `src/StorageManager.js:36-41, 55`
**Impact:** ~2x storage waste per world, accelerates quota exhaustion

Each thumbnail (~10-30KB JPEG data URL) is stored:
1. In the individual world entry (`pixelbox_world_<name>`)
2. In the world list (`pixelbox_worlds_list`)

With 20 worlds, the list alone carries 200-600KB of thumbnails.

**Fix:** Store thumbnails only in the world list (they're only displayed in the list). Remove from the full world entry, or vice versa — store only in entries and load lazily.

---

### BUG-8: Thumbnail capture may fail on WebGL canvas
**File:** `src/WorldSerializer.js:271-286`
**Impact:** Blank/black thumbnails

Phaser uses `Phaser.AUTO` (line 1890) which prefers WebGL. WebGL canvases require `preserveDrawingBuffer: true` for `drawImage()` to work. Without it, the canvas buffer may be cleared before the capture runs, producing a black thumbnail.

**Fix:** Add `preserveDrawingBuffer: true` to Phaser config, or use Phaser's built-in snapshot API (`game.renderer.snapshot(callback)`) which handles this correctly.

---

### BUG-9: Multiple concurrent auto-save sources — no deduplication
**Files:** `src/main.js:780`, `index.html:1212`, `index.html:1041`
**Impact:** Redundant storage writes, potential race on world list

Three independent callers of `autoSave()`:
1. 30-second `setInterval` in `startAutoSave()`
2. `visibilitychange` listener in `index.html:1212`
3. Menu button handler in `index.html:1041`

All can fire simultaneously (e.g., user taps menu button right as the 30s timer fires while the tab is being hidden on iOS).

**Fix:** Add a debounce or in-progress flag to `autoSave()`. If already running, skip or queue.

---

### BUG-10: `_handleOverwrite` (row SAVE button) has no confirmation
**File:** `src/SaveLoadModal.js:481-493`
**Impact:** Accidental overwrite on mis-tap (especially on mobile)

The SAVE button on each world row directly calls `saveToSlot()` with no confirmation dialog. Easy to accidentally overwrite a world, especially on small mobile screens where buttons are close together.

**Fix:** Add confirmation similar to `_handleSave`'s overwrite path.

---

## MEDIUM PRIORITY (edge cases, robustness)

### BUG-11: World name sanitization
**File:** `src/StorageManager.js:33`
**Impact:** Potential key collision, special character issues

Storage key is `pixelbox_world_` + raw user input. Names with special characters (forward slashes, null bytes, extremely long Unicode) could:
- Collide with other storage keys
- Cause issues on certain platforms
- Names like `__proto__` or `constructor` could cause property lookup issues

**Fix:** Sanitize names — strip/replace special chars, enforce a safe character set.

---

### BUG-12: Load doesn't trigger immediate auto-save
**File:** `src/SaveLoadModal.js:461-475`
**Impact:** Loaded world not persisted until next 30s cycle

After loading world B from a slot, the auto-save slot still contains the previous world. If the app crashes within 30 seconds, the loaded world is lost.

**Fix:** After successful load, immediately call `autoSave()` to persist the loaded world.

---

### BUG-13: Large grid serialization — performance and size
**File:** `src/WorldSerializer.js:24-84`
**Impact:** UI jank during save, excessive storage usage

`serializeWorld()` is synchronous and iterates every cell. For 800x600/4 = 200x150 = 30K cells this is fine, but for larger grids it could cause frame drops. The elements string (`"0,0,0,...,5,5,3"`) is highly redundant — most cells are empty.

**Fix:** Use RLE (run-length encoding) for the elements array. `"0:28500,5:100,3:400"` instead of 30K comma-separated values. This would also dramatically reduce storage size.

---

### BUG-14: No format version validation on load
**File:** `src/WorldSerializer.js:161`
**Impact:** Future format changes could silently corrupt data

`_loadSaveData` doesn't check `formatVersion`. It would attempt to load a hypothetical v4 format as v3, potentially misinterpreting fields.

**Fix:** Check `formatVersion` and reject or migrate unknown versions.

---

### BUG-15: `playerData` null check is incorrect
**File:** `src/WorldSerializer.js:225`
**Impact:** Player position not properly restored

```js
if (playerData && playerData.x !== null && playerData.y !== null)
```
This doesn't check for `undefined`. If `playerData.x` is `undefined` (e.g., from a v1 save), it passes the check and sets `playerX = undefined`.

**Fix:** Use `playerData.x != null` (loose equality) or explicit check for both null and undefined.

---

## LOW PRIORITY (polish, cleanup)

### BUG-16: Escape handler never removed
**File:** `src/SaveLoadModal.js:189-194`
**Impact:** Minor memory leak, unnecessary event processing

The `keydown` listener is added once during `_build()` but never removed. Since SaveLoadModal is a singleton this is harmless, but it runs on every keypress even when the modal is hidden.

---

### BUG-17: `emptyState` node can be orphaned
**File:** `src/SaveLoadModal.js:244-247`
**Impact:** Minor DOM leak

If `emptyState` is appended, then worlds are added, `innerHTML = ''` removes it from DOM but the reference remains. On next render, if worlds exist, it's not re-appended — this is fine. But if worlds go back to 0, it's re-appended from the dangling reference. Actually this works correctly, just fragile.

---

## PRIORITY FIX ORDER

| Priority | Bug | Effort | Impact |
|----------|-----|--------|--------|
| 1 | BUG-1: Missing methods (crash) | Small | Fixes save crashes |
| 2 | BUG-4: Un-awaited loadSavedWorld | Tiny | Prevents corrupted auto-saves on startup |
| 3 | BUG-3: Auto-save overwrites loaded world | Medium | Prevents data loss after load |
| 4 | BUG-6: No busy guard on load/overwrite | Small | Prevents double-tap corruption |
| 5 | BUG-9: Auto-save deduplication | Small | Prevents concurrent saves |
| 6 | BUG-2: Quota handling | Medium | Prevents silent storage failures |
| 7 | BUG-7: Redundant thumbnails | Small | Reduces storage usage ~50% |
| 8 | BUG-12: Immediate auto-save after load | Tiny | Prevents loaded world loss |
| 9 | BUG-10: Overwrite confirmation | Small | Prevents accidental data loss |
| 10 | BUG-8: WebGL thumbnail | Small | Fixes blank thumbnails |
| 11 | BUG-5: Atomic writes / consistency | Medium | Prevents phantom worlds |
| 12 | BUG-13: RLE compression | Medium | Major storage reduction |
| 13-17 | Remaining | Small each | Polish |

## RECOMMENDED IMPLEMENTATION PHASES

**Phase 1 — Fix crashes (BUG-1, BUG-4):** Implement missing methods, await loadSavedWorld. Should fix the majority of user complaints.

**Phase 2 — Race conditions (BUG-3, BUG-6, BUG-9):** Add operation lock, busy guards, auto-save debounce. Prevents data loss scenarios.

**Phase 3 — Storage robustness (BUG-2, BUG-7, BUG-12):** Quota handling, thumbnail dedup, post-load auto-save. Makes the system reliable on web.

**Phase 4 — Optimization (BUG-13, BUG-8, BUG-5):** RLE compression, WebGL thumbnails, atomic writes. Performance and storage improvements.
