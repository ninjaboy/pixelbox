# PixelBox - App Store Submission Checklist

**Version**: 4.2.3
**Price**: £2.99 / $2.99 / €2.99 (Tier 3)
**Model**: Paid app - buy once, play forever

---

## ✅ Pre-Submission Checklist

### 1. Apple Developer Account
- [ ] Active Apple Developer Account ($99/year)
- [ ] Enrollment verified
- [ ] Certificates created
- [ ] App ID registered: `com.pixelbox.app`

### 2. App Store Connect Setup
- [ ] App created in App Store Connect
- [ ] Bundle ID: `com.pixelbox.app`
- [ ] App Name: "PixelBox - Sandbox Simulation"
- [ ] Subtitle: "Physics sandbox with seasons"
- [ ] Primary Category: Games > Simulation
- [ ] Secondary Category: Entertainment
- [ ] Age Rating: 4+
- [ ] **Price Tier**: 3 (£2.99 / $2.99 / €2.99)

### 3. App Information
- [ ] Description (from `APP_STORE_CONTENT.md`)
- [ ] Keywords: `sandbox,physics,simulation,powder,elements,pixel,falling,seasons,weather,creative`
- [ ] Privacy Policy URL: `https://ninjaboy.github.io/pixelbox/privacy.html`
- [ ] Support URL: `https://github.com/ninjaboy/pixelbox/issues`
- [ ] Marketing URL: `https://ninjaboy.github.io/pixelbox/`
- [ ] Copyright: `© 2025 ninjaboy. All rights reserved.`

### 4. Screenshots Required

**iPhone 6.7"** (iPhone 15 Pro Max, 14 Pro Max, 13 Pro Max, 12 Pro Max)
- Resolution: 1290 x 2796 pixels
- Needed: 3-10 screenshots

**iPhone 6.5"** (iPhone 11 Pro Max, XS Max)
- Resolution: 1242 x 2688 pixels
- Needed: 3-10 screenshots

**Recommended Screenshots:**
1. Main gameplay with element palette
2. Fire spreading simulation
3. Water physics and waterfalls
4. Four seasons showcase
5. Weather system (clouds, rain, snow)
6. Tree ecosystem growing
7. Time control interface
8. Night scene with day/night cycle

### 5. App Icon
- [ ] 1024x1024 px PNG (no alpha channel)
- [ ] Clear, recognizable design
- [ ] Located: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

### 6. Build Configuration
- [x] Version: 4.2.3
- [ ] Build number: 1 (increment for each submission)
- [x] Bundle ID: `com.pixelbox.app`
- [ ] Code signing: Distribution certificate
- [ ] Provisioning profile: App Store

---

## 📦 Build & Archive Process

### Option 1: Using Xcode (Recommended for First Time)

1. **Open Project**
   ```bash
   open ios/App/App.xcworkspace
   ```

2. **Select Target**
   - Select "Any iOS Device (arm64)" from device dropdown

3. **Archive**
   - Product > Archive (⌘⇧B)
   - Wait for build to complete

4. **Upload to App Store**
   - Click "Distribute App"
   - Select "App Store Connect"
   - Select "Upload"
   - Sign with distribution certificate
   - Wait for upload to complete

### Option 2: Using Fastlane (Automated)

```bash
cd ios
fastlane beta  # For TestFlight
# or
fastlane release version:4.2.3  # For App Store
```

---

## 🎯 TestFlight Beta (Recommended First)

Before submitting to App Store, test via TestFlight:

1. **Upload Beta Build**
   ```bash
   cd ios
   fastlane beta
   ```

2. **Add Testers**
   - Go to App Store Connect
   - TestFlight > Internal Testing
   - Add yourself as tester

3. **Test Everything**
   - [ ] App launches correctly
   - [ ] All 44 elements work
   - [ ] Seasons cycle properly
   - [ ] Time controls function
   - [ ] Save/load works
   - [ ] No crashes
   - [ ] Performance is good

---

## 📋 App Review Information

### Review Notes
```
This is a physics sandbox game with no objectives or win conditions.
Players paint with 44 different elements (water, fire, sand, etc.) and
watch realistic interactions unfold.

Key features to test:
1. Select elements from bottom palette
2. Draw on canvas with touch
3. Watch physics interactions (water flows, fire spreads)
4. Use +/- buttons to control time speed
5. Observe seasonal changes (happens automatically)

No special setup required - the game works immediately on launch.
```

### Demo Account
- **Required**: No
- **Login**: Not applicable (no accounts in app)

### Notes
- App works completely offline
- No in-app purchases
- No advertisements
- No user data collected

---

## 🚀 Final Submission Steps

### 1. Prepare for Review
- [ ] Test app thoroughly on real device
- [ ] Verify all features work
- [ ] Check for crashes
- [ ] Test on different iPhone models (if possible)

### 2. Submit for Review
- [ ] Upload build via Xcode/Fastlane
- [ ] Select build in App Store Connect
- [ ] Fill in "What's New" from `APP_STORE_CONTENT.md`
- [ ] Upload screenshots (all required sizes)
- [ ] Add app review information
- [ ] Submit for review

### 3. Review Process
- **Typical Wait**: 24-48 hours
- **Possible Outcomes**:
  - ✅ Approved - app goes live
  - ⚠️ Metadata Rejected - fix description/screenshots
  - ❌ App Rejected - fix issues and resubmit

### 4. After Approval
- [ ] App appears on App Store
- [ ] Share link: `https://apps.apple.com/app/pixelbox/[APP_ID]`
- [ ] Monitor reviews and ratings
- [ ] Respond to user feedback

---

## 💰 Pricing Configuration

### Set Price in App Store Connect
1. Go to App > Pricing and Availability
2. Select **Price Tier 3**
   - UK: £2.99
   - US: $2.99
   - EU: €2.99
   - Other regions: Auto-calculated
3. Set availability to **All Countries**
4. Save

---

## 📱 Required Assets Locations

- **App Icon**: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- **Launch Screen**: `ios/App/App/Base.lproj/LaunchScreen.storyboard`
- **Privacy Policy**: `https://ninjaboy.github.io/pixelbox/privacy.html`
- **App Store Content**: `APP_STORE_CONTENT.md`
- **Support**: `https://github.com/ninjaboy/pixelbox/issues`

---

## 🐛 Common Issues & Solutions

### Issue: "Missing Compliance"
- **Solution**: In App Store Connect, mark "No" for encryption (game doesn't use encryption)

### Issue: "Invalid Binary"
- **Solution**: Increment build number and re-upload

### Issue: "Missing Required Icon"
- **Solution**: Ensure 1024x1024 icon is in Assets.xcassets

### Issue: "Provisioning Profile Expired"
- **Solution**: Regenerate in Apple Developer Portal and re-download

---

## 📞 Support

**Issues/Questions**: https://github.com/ninjaboy/pixelbox/issues

**Documentation**:
- `MOBILE_CONVERSION_PROGRESS.md` - Development progress
- `APP_STORE_CONTENT.md` - Marketing copy and metadata
- `FASTLANE_SETUP.md` - Automation setup
- `privacy.html` - Privacy policy

---

## ✨ Post-Launch

### Marketing
- [ ] Share on social media
- [ ] Post on Reddit (r/iosgaming, r/incremental_games)
- [ ] Submit to indie game sites
- [ ] Create launch video/GIF

### Monitoring
- [ ] Check App Store reviews daily
- [ ] Monitor crash reports (if any)
- [ ] Track downloads/revenue
- [ ] Plan updates based on feedback

### Updates
When releasing updates:
1. Increment version (4.2.4, 4.3.0, etc.)
2. Update CHANGELOG
3. Test thoroughly
4. Submit via TestFlight first
5. Submit to App Store

---

**Good luck with your submission! 🚀**
