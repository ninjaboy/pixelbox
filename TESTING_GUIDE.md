# PixelBox Testing Guide
## How to Test Web & iOS Versions

---

## 🌐 Testing Web Version (Desktop/Browser)

The web version still works exactly as before!

### Quick Test
```bash
# Method 1: Vite dev server (recommended for development)
npm run dev
# Opens at http://localhost:3000

# Method 2: Build and preview production version
npm run build
npm run preview
# Opens at http://localhost:4173
```

### Deploy to Web
```bash
# Deploy to Vercel (your existing setup)
vercel --prod

# Or deploy to GitHub Pages (already configured)
git push origin master
# Auto-deploys to https://ninjaboy.github.io/pixelbox/
```

**Web version features:**
- ✅ Wake lock API (keeps browser active)
- ✅ All game features work
- ✅ Keyboard shortcuts (1-9, A-Z, B, P)
- ✅ Mouse/touch controls
- ✅ Clipboard-based world sharing

---

## 📱 Testing iOS Version (Native App)

### Prerequisites

1. **Install Xcode** (Mac only)
   - From Mac App Store
   - ~15GB download
   - Free

2. **Install Xcode Command Line Tools**
   ```bash
   xcode-select --install
   ```

3. **Install CocoaPods**
   ```bash
   sudo gem install cocoapods
   pod setup
   ```

4. **Install Fastlane** (optional, but recommended)
   ```bash
   bundle install --path vendor/bundle
   ```

### First-Time iOS Setup

```bash
# 1. Build web assets
npm run build

# 2. Sync to iOS
npx cap sync ios

# 3. Install iOS dependencies
cd ios/App
pod install
cd ../..

# 4. Open in Xcode
npx cap open ios
```

### Testing in iOS Simulator

1. **In Xcode:**
   - Select a simulator (e.g., "iPhone 15")
   - Click the "Play" button (▶️) or press Cmd+R
   - Wait for build to complete
   - App launches in simulator

2. **Testing checklist:**
   - [ ] App launches without errors
   - [ ] Game canvas displays correctly
   - [ ] Touch controls work (tap to place elements)
   - [ ] Element selector works
   - [ ] Seasons cycle properly
   - [ ] Day/night cycle works
   - [ ] All elements interact correctly
   - [ ] No wake lock errors in console
   - [ ] Audio works (may need to interact first due to iOS autoplay policy)

### Testing on Physical iPhone

1. **Connect iPhone via USB**

2. **Trust Computer**
   - On iPhone: Settings > General > Device Management
   - Trust your computer

3. **In Xcode:**
   - Select your iPhone from device list
   - Click "Play" button
   - First time: Xcode will ask for Apple Developer account
   - Allow Xcode to sign the app with your account

4. **On iPhone:**
   - Settings > General > Device Management
   - Trust your developer certificate
   - Open app

### Using Fastlane for iOS Testing

```bash
# Quick build check (fast, no archiving)
cd ios
bundle exec fastlane quick_build

# Full development build
bundle exec fastlane build
# Output: ios/build/PixelBox-dev.ipa

# Beta distribution (TestFlight)
bundle exec fastlane beta
# Uploads to TestFlight for testing
```

---

## 🔄 Development Workflow

### Making Code Changes

```bash
# 1. Edit code in src/ or index.html

# 2. Test on web first (faster)
npm run dev

# 3. Once satisfied, test on iOS
npm run build
npx cap sync ios
npx cap open ios
# Then run in Xcode
```

### Or use Fastlane (recommended)

```bash
# Edit code...

cd ios
bundle exec fastlane quick_build
# Builds web + iOS in one command
```

---

## 🐛 Common Issues & Solutions

### Web Version Issues

#### "Module not found" errors
```bash
rm -rf node_modules dist
npm install
npm run build
```

#### Port 3000 already in use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
npm run dev
```

### iOS Version Issues

#### "CocoaPods not installed"
```bash
sudo gem install cocoapods
pod setup
cd ios/App
pod install
```

#### "Failed to build gem native extension"
```bash
# Install Xcode Command Line Tools
xcode-select --install
```

#### "Code signing error"
```bash
# In Xcode:
# 1. Select project in left sidebar
# 2. Select "App" target
# 3. Go to "Signing & Capabilities" tab
# 4. Select your team
# 5. Xcode will auto-generate provisioning profile
```

#### "App crashes on launch"
```bash
# Check console in Xcode for errors
# Common fixes:
# 1. Clean build folder: Cmd+Shift+K
# 2. Delete derived data: Xcode > Preferences > Locations > Derived Data > Delete
# 3. pod install in ios/App
```

#### Black screen or blank canvas
```bash
# Likely web assets not synced
npm run build
npx cap sync ios
# Rebuild in Xcode
```

---

## ✅ Feature Parity Checklist

| Feature | Web | iOS | Notes |
|---------|-----|-----|-------|
| Element placement | ✅ | ✅ | Mouse/touch |
| Element selector | ✅ | ✅ | All 44 elements |
| Seasons system | ✅ | ✅ | Full 4-season cycle |
| Day/night cycle | ✅ | ✅ | Celestial bodies |
| Weather (rain/snow) | ✅ | ✅ | Cloud system |
| Living creatures | ✅ | ✅ | Fish, birds |
| Tree growth | ✅ | ✅ | Procedural |
| House builder | ✅ | ✅ | AI builder |
| Build mode | ✅ | ✅ | Default |
| Explore mode | ✅ | ✅ | Player control |
| World save/load | ✅ | ⏳ | Web: clipboard, iOS: pending StorageManager integration |
| Keyboard shortcuts | ✅ | ⚠️ | iOS: touch only |
| Audio | ✅ | ✅ | Ambient music |
| Wake lock | ✅ | N/A | Web only |
| Performance | ✅ | ✅ | 60fps target |

Legend:
- ✅ Working
- ⏳ Planned/In Progress
- ⚠️ Partial (different implementation)
- N/A Not applicable

---

## 📊 Performance Targets

### Web Version
- **60 FPS** with 10,000+ particles
- **Initial load**: < 3 seconds
- **Build size**: ~1.6MB (gzipped: ~355KB)

### iOS Version
- **60 FPS** on iPhone SE (2016) and newer
- **Launch time**: < 2 seconds
- **Memory**: < 150MB
- **Battery**: Optimized (no wake lock needed)

---

## 🎯 What to Test

### Core Gameplay
- [ ] Place all 44 element types
- [ ] Verify element interactions (water + fire = steam, etc.)
- [ ] Test living creatures (fish swim, birds fly)
- [ ] Watch seasons change over time
- [ ] Observe day/night cycle
- [ ] Create snow in winter, rain in other seasons
- [ ] Grow trees from seeds
- [ ] Build houses with builder element

### UI/UX
- [ ] Element selector displays correctly
- [ ] Tap/click to select elements
- [ ] Drag to place continuously
- [ ] Stats display (FPS, particles, season, time)
- [ ] Mode toggle (Build ↔ Explore)
- [ ] Grimoire (help) opens and displays info

### Performance
- [ ] Smooth 60 FPS with 1000+ particles
- [ ] No lag when placing elements
- [ ] No crashes after extended play (10+ minutes)

### Platform-Specific

**Web Only:**
- [ ] Keyboard shortcuts work (1-9, A-Z, B, P)
- [ ] Wake lock prevents throttling
- [ ] Window resize handles gracefully

**iOS Only:**
- [ ] Touch gestures smooth
- [ ] No keyboard needed
- [ ] Fullscreen (no browser chrome)
- [ ] Handles device rotation
- [ ] No console errors

---

## 📝 Reporting Issues

When reporting bugs, include:

1. **Platform**: Web or iOS
2. **Device**: Browser/OS version or iPhone model
3. **Steps to reproduce**
4. **Expected behavior**
5. **Actual behavior**
6. **Screenshots/video** if applicable
7. **Console errors** (Xcode console for iOS, browser console for web)

---

## 🚀 Next Steps After Testing

Once both versions work:
1. ✅ Web version deployed
2. ✅ iOS version builds and runs
3. ✅ All features functional
4. ⏳ Optional: Integrate StorageManager for iOS world persistence
5. ⏳ Optional: Add freemium/IAP (later)
6. ⏳ Optional: Submit to App Store (later)

---

**Happy Testing! 🎮**
