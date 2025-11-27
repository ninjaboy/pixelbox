# Fastlane Setup & Usage Guide
## Automated iOS Build, Test, and Deployment

Fastlane automates the entire iOS development workflow - from building the app to submitting to the App Store.

---

## 📋 Prerequisites

Before using Fastlane, you need:

1. **macOS** with Xcode installed
2. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```

3. **Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com

4. **CocoaPods**:
   ```bash
   sudo gem install cocoapods
   pod setup
   ```

---

## 🚀 Installation

### Step 1: Install Fastlane via Bundler (Recommended)

```bash
# From project root
bundle install --path vendor/bundle
```

This installs Fastlane and CocoaPods locally to your project.

### Step 2: Configure Your Credentials

```bash
# Copy the environment template
cd ios/fastlane
cp .env.sample .env

# Edit .env with your details
nano .env
```

Fill in:
- `APPLE_ID`: Your Apple Developer account email
- `TEAM_ID`: Find at https://developer.apple.com/account/#/membership
- Other optional settings (for advanced features)

### Step 3: Update Appfile

Edit `ios/fastlane/Appfile` and replace:
- `your-email@example.com` with your Apple ID
- `YOUR_TEAM_ID` with your Team ID

---

## 🎯 Available Lanes (Commands)

### Development Build
Build the app for testing on your device:

```bash
cd ios
bundle exec fastlane build
```

**What it does:**
1. Builds web assets (`npm run build`)
2. Syncs to iOS (`npx cap sync`)
3. Builds iOS app for development
4. Outputs: `./build/PixelBox-dev.ipa`

---

### Beta Distribution (TestFlight)
Upload a beta build to TestFlight for testing:

```bash
cd ios
bundle exec fastlane beta
```

**What it does:**
1. Increments build number automatically
2. Builds web assets + iOS app
3. Uploads to TestFlight
4. Commits version bump to git

**Options:**
```bash
# Distribute to external testers
bundle exec fastlane beta external:true notify:true changelog:"Bug fixes and improvements"
```

---

### App Store Release
Submit a new version to the App Store:

```bash
cd ios
bundle exec fastlane release version:1.0.0 submit:true
```

**What it does:**
1. Sets version number (e.g., 1.0.0)
2. Increments build number
3. Builds release version
4. Uploads to App Store Connect
5. Optionally submits for review
6. Tags git release
7. Commits version bump

**Options:**
```bash
# Just upload, don't submit for review
bundle exec fastlane release version:1.0.0

# Skip metadata/screenshots update
bundle exec fastlane release version:1.0.0 skip_metadata:true skip_screenshots:true
```

---

### Generate Screenshots
Automatically capture App Store screenshots:

```bash
cd ios
bundle exec fastlane screenshots
```

**What it does:**
1. Launches app in simulator
2. Captures screenshots for all required device sizes:
   - iPhone 15 Pro Max (6.7")
   - iPhone 15 (6.1")
   - iPhone SE (4.7")
   - iPad Pro 12.9"
3. Outputs to `./screenshots`

**Note:** You'll need to add UI tests to `App/App/AppUITests` to navigate through the app for screenshots.

---

### Upload Metadata
Update App Store listing (description, keywords, etc.):

```bash
cd ios
bundle exec fastlane upload_metadata
```

Metadata is stored in `ios/metadata/` (create this folder and add your App Store details).

---

### Code Signing Setup
Sync certificates and provisioning profiles:

```bash
cd ios
bundle exec fastlane sync_certificates
```

**Note:** This uses Fastlane Match. You'll need to set up a private git repository to store certificates. See: https://docs.fastlane.tools/actions/match/

---

### Quick Build Check
Fast build without archiving (for debugging):

```bash
cd ios
bundle exec fastlane quick_build
```

---

### Run Tests
Execute unit tests:

```bash
cd ios
bundle exec fastlane test
```

---

## 📁 Fastlane Directory Structure

```
ios/fastlane/
├── Fastfile           # Lane definitions (automation workflows)
├── Appfile            # App configuration (bundle ID, Apple ID)
├── .env               # Secrets (never commit!) - Your credentials
├── .env.sample        # Template for .env
└── metadata/          # App Store metadata (create as needed)
    ├── en-US/
    │   ├── name.txt
    │   ├── subtitle.txt
    │   ├── description.txt
    │   ├── keywords.txt
    │   └── promotional_text.txt
    └── screenshots/   # App Store screenshots
```

---

## 🔐 Security Best Practices

### Never Commit Secrets!

The following files contain sensitive data and are in `.gitignore`:
- `ios/fastlane/.env` - Your credentials
- `*.ipa` - App binaries
- `*.dSYM.zip` - Debug symbols
- `vendor/bundle/` - Gem dependencies
- `Gemfile.lock`

### Safe to Commit:
- `Fastfile` - Lane definitions
- `Appfile` - App config (but use environment variables for secrets)
- `.env.sample` - Template only

---

## 🚦 Typical Workflow

### First-Time Setup
```bash
# 1. Install dependencies
bundle install --path vendor/bundle

# 2. Configure credentials
cd ios/fastlane
cp .env.sample .env
nano .env  # Fill in your Apple ID and Team ID

# 3. Sync code signing
cd ..
bundle exec fastlane sync_certificates
```

### Development Cycle
```bash
# Make code changes...

# Test build
cd ios
bundle exec fastlane quick_build

# If all good, create beta
bundle exec fastlane beta
```

### Release Cycle
```bash
# 1. Finalize version
cd ios
bundle exec fastlane release version:1.0.0

# 2. Generate screenshots (if UI changed)
bundle exec fastlane screenshots

# 3. Upload metadata
bundle exec fastlane upload_metadata

# 4. Submit for review
bundle exec fastlane release version:1.0.0 submit:true
```

---

## 🛠️ Troubleshooting

### "Command not found: bundle"
Install bundler:
```bash
gem install bundler
```

### "Failed to create provisioning profile"
1. Go to https://developer.apple.com/account/resources/profiles
2. Create a profile manually, or
3. Set up Fastlane Match for automatic code signing

### "No devices found"
For development builds, register your device UDID at:
https://developer.apple.com/account/resources/devices

### "Build failed"
Check Xcode build logs:
```bash
cd ios
open App/App.xcworkspace
# Build in Xcode to see detailed errors
```

### "Authentication failed"
1. Verify `.env` has correct `APPLE_ID` and `TEAM_ID`
2. Use App Store Connect API key (more reliable than password)
3. Enable two-factor authentication app-specific password

---

## 📚 Useful Commands

```bash
# List all available lanes
cd ios
bundle exec fastlane lanes

# Show lane documentation
bundle exec fastlane action build_app

# Update Fastlane
bundle update fastlane

# Check Fastlane version
bundle exec fastlane --version

# Validate Fastfile syntax
bundle exec fastlane validate
```

---

## 🌐 Resources

- **Fastlane Docs**: https://docs.fastlane.tools
- **Match (Code Signing)**: https://docs.fastlane.tools/actions/match/
- **TestFlight**: https://docs.fastlane.tools/actions/upload_to_testflight/
- **App Store**: https://docs.fastlane.tools/actions/upload_to_app_store/
- **Screenshots**: https://docs.fastlane.tools/actions/capture_screenshots/

---

## 💡 Tips

1. **Use `.env` for secrets** - Never hardcode credentials
2. **Run `quick_build` often** - Catches issues early
3. **Automate screenshots** - Saves hours of manual work
4. **Tag releases in git** - Easy to track versions
5. **Use TestFlight** - Get feedback before App Store release

---

## 📝 Next Steps After Setup

1. **First Beta Build**:
   ```bash
   cd ios
   bundle exec fastlane beta
   ```

2. **Invite Testers in App Store Connect**:
   - Go to https://appstoreconnect.apple.com
   - Navigate to TestFlight
   - Add internal/external testers

3. **Prepare App Store Listing**:
   - Create `ios/metadata/` structure
   - Add screenshots, description, keywords
   - Run `bundle exec fastlane upload_metadata`

4. **Submit for Review**:
   ```bash
   bundle exec fastlane release version:1.0.0 submit:true
   ```

---

**You're all set! 🚀**

For questions, check the [Fastlane docs](https://docs.fastlane.tools) or create an issue in the project repo.
