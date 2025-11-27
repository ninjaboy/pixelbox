# Fastlane Quick Reference 🚀

**Location**: `cd ios` (all commands run from here)

---

## 🔧 One-Time Setup

```bash
# 1. Install Fastlane
cd /path/to/pixelbox
bundle install --path vendor/bundle

# 2. Configure credentials
cd ios/fastlane
cp .env.sample .env
nano .env  # Add your APPLE_ID and TEAM_ID

# 3. Done! Ready to use
```

---

## 📱 Common Commands

### Test Build Locally
```bash
cd ios
bundle exec fastlane quick_build
```
✅ Fast check that everything compiles

---

### Send to TestFlight (Beta)
```bash
cd ios
bundle exec fastlane beta
```
✅ Auto-increments build number
✅ Uploads to TestFlight
✅ Testers notified automatically

---

### Release to App Store
```bash
cd ios
bundle exec fastlane release version:1.0.0 submit:true
```
✅ Sets version to 1.0.0
✅ Uploads to App Store
✅ Submits for review
✅ Tags git with v1.0.0

---

### Generate Screenshots
```bash
cd ios
bundle exec fastlane screenshots
```
✅ Captures all required device sizes
✅ Saves to `./screenshots`

---

## 🎯 Typical Workflow

```bash
# Development
npm run build          # Build web assets
npx cap sync ios      # Sync to iOS
cd ios
bundle exec fastlane quick_build  # Test compile

# Beta Testing
bundle exec fastlane beta         # Upload to TestFlight

# App Store Release
bundle exec fastlane release version:1.0.1 submit:true
```

---

## 📋 Find Your Team ID

```bash
# Method 1: Check Apple Developer Portal
open https://developer.apple.com/account/#/membership

# Method 2: Use spaceship (if Fastlane installed)
bundle exec fastlane spaceship find -u your-email@example.com
```

---

## 🆘 Troubleshooting

### "Bundle command not found"
```bash
gem install bundler
```

### "Failed to authenticate"
- Check `.env` file has correct `APPLE_ID`
- Verify `TEAM_ID` is correct (10 character alphanumeric)
- Enable 2FA and create app-specific password if needed

### "Build failed in Xcode"
```bash
cd ios
open App/App.xcworkspace  # Debug in Xcode directly
```

### "CocoaPods not installed"
```bash
sudo gem install cocoapods
cd ios/App
pod install
```

---

## 📚 Help

```bash
# List all lanes
bundle exec fastlane lanes

# Show help for specific lane
bundle exec fastlane beta --help

# Check Fastlane version
bundle exec fastlane --version
```

---

**Full docs**: See `FASTLANE_SETUP.md`
