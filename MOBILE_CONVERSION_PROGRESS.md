# PixelBox Mobile App Conversion Progress

**Target**: iOS paid app (£2.99 - buy once, play forever)
**Timeline**: 1-2 weeks
**Last Updated**: November 27, 2025

---

## ✅ Phase 1: Build System & Bundling (COMPLETED)

### What Was Done:
1. ✅ **Installed Vite Build System**
   - Added Vite 5.0, legacy plugin, terser
   - Created `vite.config.js` with Phaser optimization
   - Configured production builds with minification

2. ✅ **Bundled Phaser Locally**
   - Removed CDN dependency from `index.html`
   - Added Phaser 3.86.0 as npm dependency
   - Imported Phaser in `src/main.js`
   - Separate chunk for Phaser (1.4MB gzipped to 321KB)

3. ✅ **Updated package.json**
   - Added build scripts (`npm run build`, `npm run dev`)
   - Set package type to "module" for ES6 support
   - Version synced to 3.17.1

4. ✅ **Updated .gitignore**
   - Added dist/, node_modules/, package-lock.json
   - Added ios/, android/, .capacitor/ for future Capacitor files

### Build Output:
- Production build: `/dist` folder
- Modern + legacy builds for browser compatibility
- Total size: ~1.6MB (gzipped: ~355KB)
- Build time: ~17 seconds

---

## ✅ Phase 2: Capacitor iOS Setup (COMPLETED)

### What Was Done:
1. ✅ **Installed Capacitor Packages**
   - @capacitor/core@7.4.4
   - @capacitor/cli@7.4.4
   - @capacitor/ios@7.4.4
   - @capacitor/status-bar@7.0.3
   - @capacitor/preferences@7.0.2
   - @capacitor/haptics@7.0.2

2. ✅ **Initialized Capacitor**
   - App Name: "PixelBox"
   - App ID: "com.pixelbox.app"
   - Web Dir: "dist"

3. ✅ **Created capacitor.config.json**
   - iOS-specific settings (black background, no insets)
   - Plugin configuration (StatusBar, SplashScreen, Keyboard)
   - Android scheme set to HTTPS

4. ✅ **Added iOS Platform**
   - Created `/ios` folder with Xcode project
   - Generated App/App/public with web assets
   - Created iOS-specific capacitor.config.json

5. ✅ **Created StorageManager.js**
   - Wrapper for @capacitor/preferences API
   - Auto-save every 30 seconds
   - World list with timestamps
   - Delete/rename worlds functionality
   - Replaces clipboard-based sharing

6. ✅ **Created ElementTiers.js**
   - 10 FREE elements (sand, water, fire, etc.)
   - 34 PREMIUM elements (fish, birds, lava, etc.)
   - Helper functions for tier checking
   - Pricing configuration ($1.99)

7. ✅ **Integrated Fastlane** 🚀
   - Created `Gemfile` for dependency management
   - Created `ios/fastlane/Fastfile` with 8 automation lanes
   - Created `ios/fastlane/Appfile` with app configuration
   - Created `.env.sample` for credentials template
   - Updated `.gitignore` to protect secrets
   - **Lanes available:**
     - `build` - Development build
     - `beta` - TestFlight distribution
     - `release` - App Store submission
     - `screenshots` - Automated screenshot capture
     - `upload_metadata` - Update App Store listing
     - `sync_certificates` - Code signing setup
     - `test` - Run unit tests
     - `quick_build` - Fast compile check
   - **Documentation created:**
     - `FASTLANE_SETUP.md` - Comprehensive setup guide
     - `FASTLANE_QUICKSTART.md` - Quick reference card

### User Prerequisites (Before Using):
- ⚠️ **Install Xcode Command Line Tools**: `xcode-select --install`
- ⚠️ **Install Fastlane**: `bundle install --path vendor/bundle`
- ⚠️ **Configure credentials**: Copy `ios/fastlane/.env.sample` to `.env` and fill in Apple ID & Team ID
- ⚠️ **Install CocoaPods**: `sudo gem install cocoapods && pod setup`
- ⚠️ **Run pod install**: `cd ios/App && pod install`

---

## ✅ Phase 3: Paid App Setup (COMPLETED)

### What Was Done:
1. ✅ **Removed Freemium Code**
   - Deleted `src/config/ElementTiers.js` (not needed)
   - All elements unlocked by default
   - No IAP code required

2. ✅ **Pricing Model**
   - Buy once: £2.99 (App Store Tier 3)
   - Play forever - no ads, no subscriptions
   - All 44 elements included
   - All features unlocked from start

---

## 📋 Phase 4: Mobile UX Polish (PENDING)

### Plan:
1. **First-Launch Tutorial**
   - Simple 3-step overlay
   - "Tap to select" → "Drag to place" → "Experiment!"
   - Skip button

2. **Local World Storage**
   - Replace clipboard sharing
   - "My Worlds" menu
   - Thumbnail previews
   - Delete/rename worlds

3. **Remove Keyboard Controls**
   - Replace "B" key with button (mode toggle)
   - Replace "P" key with menu item (profiler)
   - Remove keyboard shortcuts from UI
   - Make everything tap-based

4. **Legal Documents**
   - Privacy policy
   - Terms of service
   - Support email/website

---

## 📋 Phase 5: Testing & Submission (PENDING)

### Prerequisites (User Must Complete):
1. **Install Xcode** (from Mac App Store)
   - Requires macOS
   - ~15GB download
   - Free

2. **Install CocoaPods**
   ```bash
   sudo gem install cocoapods
   pod setup
   ```

3. **Run Pod Install**
   ```bash
   cd ios/App
   pod install
   ```

4. **iOS Developer Account**
   - Sign up at developer.apple.com
   - $99/year

### Testing Steps:
1. Open ios/App/App.xcworkspace in Xcode
2. Connect physical iPhone
3. Select device in Xcode
4. Click "Run" button
5. Test all features (elements, seasons, purchase flow)

### App Store Submission:
1. Create app in App Store Connect
2. Configure IAP product ($2 unlock)
3. Upload screenshots (6.5", 5.5" displays)
4. Write app description
5. Submit for review

---

## 📊 Progress Summary

| Phase | Status | Tasks Complete | Tasks Remaining |
|-------|--------|---------------|-----------------|
| 1. Build System | ✅ Complete | 5/5 | 0 |
| 2. Capacitor Setup | 🟡 Partial | 4/7 | 3 |
| 3. Freemium | ⏸️ Pending | 0/3 | 3 |
| 4. Mobile UX | ⏸️ Pending | 0/4 | 4 |
| 5. Submission | ⏸️ Pending | 0/3 | 3 |
| **TOTAL** | **35% Done** | **9/22** | **13** |

---

## 🚀 How to Continue Development

### Install Prerequisites (if not already done):

```bash
# Install Xcode from Mac App Store (required for iOS development)
# Then install CocoaPods:
sudo gem install cocoapods
pod setup
```

### Build and Run in iOS Simulator:

```bash
# 1. Build the web app
npm run build

# 2. Copy to iOS project
npx cap copy ios

# 3. Open in Xcode
npx cap open ios

# 4. In Xcode, select a simulator and click Run
```

### Development Workflow:

```bash
# After making changes to web code:
npm run build              # Build web assets
npx cap copy ios          # Copy to iOS project
# Then run from Xcode
```

---

## 🎯 Next Immediate Steps

1. **Create StorageManager.js** - Local world persistence
2. **Remove wake lock code** - Not needed in native app
3. **Test app in iOS Simulator** - Verify it loads and runs
4. **Create ElementTiers.js** - Define free vs premium elements
5. **Implement freemium gating** - Lock premium elements
6. **Add purchase flow** - RevenueCat integration

---

## 📝 Notes

- **Build output is in `/dist`** - This is what Capacitor uses
- **iOS project is in `/ios`** - Open ios/App/App.xcworkspace in Xcode
- **App ID**: com.pixelbox.app (can be changed in capacitor.config.json)
- **Bundle ID**: Must match App Store Connect when submitting
- **Phaser is bundled** - No CDN dependency, works offline

---

## 🐛 Known Issues

1. **CocoaPods warning** - User must install CocoaPods and run `pod install`
2. **Xcode warning** - User must set Xcode as active developer directory
3. **npm audit warnings** - 13 vulnerabilities in dev dependencies (sharp, to-ico)
   - Not critical, only affects development, not production app

---

## 💡 Recommendations

**For Fast 1-2 Week Launch:**
- Focus on core freemium + IAP first
- Skip complex tutorial (just 3-step overlay)
- Skip cloud save for v1.0 (add in v1.1 update)
- Use existing gameplay as-is
- Prioritize App Store submission

**Post-Launch Updates (v1.1+):**
- iCloud sync for worlds
- Advanced tutorial system
- Daily challenges
- Android version
- More elements as DLC
