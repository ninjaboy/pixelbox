# PixelBox - Complete Publishing Guide

**Step-by-step guide from Apple Developer Account to App Store**

---

## Part 1: Apple Developer Account Setup

### Step 1: Join Apple Developer Program

1. **Go to**: https://developer.apple.com/programs/enroll/
2. **Sign in** with your Apple ID (or create one)
3. **Choose Account Type**:
   - **Individual**: Your name appears as developer (recommended for indie)
   - **Organization**: Company name appears (requires D-U-N-S number)
4. **Pay $99 USD** annual fee
   - Credit card or PayPal
   - Auto-renews yearly
5. **Wait for approval**: Usually 24-48 hours
6. **Check email** for confirmation

**Cost**: $99 USD per year (required to publish on App Store)

---

## Part 2: Certificates & Signing Setup

### Step 2: Create Certificates (One-Time Setup)

1. **Open Xcode**
2. **Go to**: Xcode → Settings → Accounts (⌘,)
3. **Click "+**" (bottom left) → Add Apple ID
4. **Sign in** with your Apple Developer account
5. **Select** your team → Click "**Manage Certificates**"
6. **Click "+"** → Select "**Apple Distribution**"
7. **Done** - Certificate created automatically

**What this does**: Creates signing certificate to prove apps come from you

### Step 3: Register App ID

1. **Go to**: https://developer.apple.com/account/resources/identifiers/list
2. **Click "+"** to add new identifier
3. **Select**: App IDs → Continue
4. **Select**: App → Continue
5. **Fill in**:
   - Description: `PixelBox Sandbox Simulation`
   - Bundle ID: `com.pixelbox.app` (Explicit)
   - Capabilities: None needed (uncheck everything)
6. **Continue** → **Register**

### Step 4: Create Provisioning Profile (Automatic via Xcode)

Xcode will handle this automatically when you build. Skip manual creation.

---

## Part 3: App Store Connect Setup

### Step 5: Create App in App Store Connect

1. **Go to**: https://appstoreconnect.apple.com/
2. **Sign in** with Apple Developer account
3. **Click**: My Apps → **+ (icon)** → New App
4. **Fill in**:

   **Platforms**: ☑️ iOS

   **Name**: `PixelBox - Sandbox Simulation`
   - Must be unique on App Store
   - Can change later

   **Primary Language**: English (U.S.)

   **Bundle ID**: Select `com.pixelbox.app`

   **SKU**: `pixelbox-2025` (internal reference, any unique string)

   **User Access**: Full Access

5. **Click**: Create

### Step 6: Configure App Information

**Pricing and Availability**:
1. Go to: **Pricing and Availability**
2. **Price**: Select **Tier 3** (£2.99 / $2.99 / €2.99)
3. **Availability**: All Countries
4. **Pre-Order**: No
5. **Save**

**App Information**:
1. Go to: **App Information** (left sidebar)
2. Fill in:
   - **Name**: PixelBox - Sandbox Simulation
   - **Subtitle**: Physics sandbox with seasons
   - **Primary Category**: Games → Simulation
   - **Secondary Category**: Entertainment
   - **Privacy Policy URL**: `https://ninjaboy.github.io/pixelbox/privacy.html`
   - **Support URL**: `https://github.com/ninjaboy/pixelbox/issues`
   - **Marketing URL**: `https://ninjaboy.github.io/pixelbox/`
3. **Save**

**Age Rating**:
1. Click: **Edit** next to Age Rating
2. Answer questions:
   - Cartoon/Fantasy Violence: No
   - Realistic Violence: No
   - Sexual Content: No
   - Profanity/Crude Humor: No
   - Horror/Fear Themes: No
   - Mature/Suggestive Themes: No
   - Alcohol/Tobacco/Drugs: No
   - Simulated Gambling: No
   - Medical/Treatment Info: No
   - Unrestricted Web Access: No
3. Result: **4+** age rating
4. **Done**

---

## Part 4: Prepare App Screenshots

### Step 7: Create Screenshots (REQUIRED)

You need screenshots for these sizes:

**iPhone 6.7" (Required)**
- Devices: iPhone 15 Pro Max, 14 Pro Max, 13 Pro Max, 12 Pro Max
- Resolution: **1290 x 2796 pixels**
- Needed: 3-10 screenshots

**iPhone 6.5" (Required)**
- Devices: iPhone 11 Pro Max, XS Max
- Resolution: **1242 x 2688 pixels**
- Needed: 3-10 screenshots

**How to create**:

1. **Launch app in simulator**:
   ```bash
   cd ios
   fastlane simulator
   ```

2. **Select large iPhone**:
   - Xcode → Window → Devices and Simulators
   - Add: iPhone 15 Pro Max

3. **Take screenshots**:
   - ⌘S in simulator window
   - Saves to Desktop
   - Take 5-8 different scenes

4. **Recommended screenshots**:
   - Main gameplay with element palette visible
   - Fire spreading simulation
   - Water waterfalls
   - Four seasons side-by-side
   - Weather system (clouds/rain/snow)
   - Tree ecosystem
   - Time control UI showing speed buttons
   - Night scene

5. **Resize if needed**:
   - Use Preview or Photoshop
   - Export as PNG
   - Ensure exact dimensions

---

## Part 5: Build & Upload App

### Step 8: Create App Icon (REQUIRED)

1. **Create 1024×1024px PNG**:
   - No transparency (alpha channel)
   - Square corners (iOS adds rounded corners)
   - Clear, recognizable design
   - Save as: `AppIcon.png`

2. **Add to Xcode**:
   ```bash
   # Open Xcode
   open ios/App/App.xcworkspace
   ```

3. **In Xcode**:
   - Left panel: App → App → Assets.xcassets
   - Click: AppIcon
   - Drag your 1024×1024 image to "App Store iOS 1024pt" slot

### Step 9: Build the App

**Option A: Using Xcode (Recommended for first time)**

1. **Open project**:
   ```bash
   open ios/App/App.xcworkspace
   ```

2. **Select target**:
   - Top toolbar: Click device dropdown
   - Select: **Any iOS Device (arm64)**

3. **Set version** (should already be 4.2.3):
   - Left panel: Click "App"
   - General tab → Identity
   - Version: 4.2.3
   - Build: 1

4. **Archive**:
   - Menu: Product → Archive (⌘⇧B)
   - Wait ~2-5 minutes for build
   - Organizer window opens

5. **Distribute**:
   - Click: **Distribute App**
   - Select: **App Store Connect**
   - Click: **Upload**
   - Select: **Automatically manage signing** (recommended)
   - Click: **Upload**
   - Wait for upload to complete (~5-10 minutes)

**Option B: Using Fastlane (Automated)**

```bash
cd ios

# For TestFlight beta
fastlane beta

# OR for direct App Store submission
fastlane release version:4.2.3
```

### Step 10: Wait for Processing

1. **Go to**: App Store Connect → My Apps → PixelBox
2. **Check**: Activity tab
3. **Status**: "Processing" → "Ready to Submit" (15-60 minutes)

---

## Part 6: Complete App Store Listing

### Step 11: Add Version Information

1. **Go to**: App Store Connect → PixelBox → iOS App
2. **Version**: 4.2.3 (should be there)
3. **Select Build**: Choose uploaded build
4. **Fill in**:

**What's New** (4000 chars max):
```
Version 4.2.3 - Winter Update

NEW FEATURES:
• Four dynamic seasons with unique gameplay
• Variable time control (0.1x - 100x speed)
• Cloud-based weather system
• Natural day/night cycle
• 44 unique elements with realistic physics

IMPROVEMENTS:
• Balanced water cycle
• Improved seasonal transitions
• Performance optimizations

Create your own living pixel world. Paint with elements, watch nature unfold. No ads, no IAP, play forever.
```

**Description** (use from APP_STORE_CONTENT.md):
```
Build, experiment, and discover in a living pixel world.

PixelBox is a mesmerizing sandbox simulation where you paint with elements and watch nature unfold. Create flowing water, roaring fires, growing trees, and dynamic weather systems - all governed by realistic physics.

🌍 LIVING WORLD
• 44 unique elements with realistic interactions
• Four dynamic seasons that change gameplay
• Day/night cycle with temperature effects
• Weather systems: rain, snow, clouds, and lightning

⚗️ ENDLESS EXPERIMENTS
• Mix elements to create new reactions
• Build ecosystems with trees, grass, and wildlife
• Create waterfalls, lava flows, and explosions
• Watch fire spread, water freeze, and snow melt

🌲 SEASONAL GAMEPLAY
• Spring: Trees bloom with vibrant leaves
• Summer: Hot temperatures, rapid evaporation
• Autumn: Leaves fall in golden colors
• Winter: Snow accumulation, water freezes

🎮 PURE SANDBOX
• No objectives, no time limits
• Control time speed (0.1x to 100x)
• Mobile-optimized touch controls
• Auto-save your creations

⭐️ NO NONSENSE
• Buy once, play forever
• No ads
• No in-app purchases
• No subscriptions
• No internet required

PERFECT FOR:
• Creative experimentation
• Relaxing sandbox play
• Learning physics concepts
• Watching mesmerizing interactions

Built with love by an indie developer. Your one-time purchase supports continued development and updates.
```

**Keywords** (100 chars max):
```
sandbox,physics,simulation,powder,elements,pixel,falling,seasons,weather,creative
```

**Promotional Text** (170 chars):
```
Paint with pixels, watch nature unfold. 44 elements, 4 seasons, infinite possibilities. Buy once, play forever - no ads, no IAP. Create your own living world today!
```

### Step 12: Upload Screenshots

1. **App Store Connect** → PixelBox → Version
2. **6.7" Display**: Drag 3-10 screenshots
3. **6.5" Display**: Drag 3-10 screenshots
4. **App Preview** (optional): Can add video later

### Step 13: App Review Information

1. **Contact Information**:
   - First Name: Your first name
   - Last Name: Your last name
   - Phone: Your phone number
   - Email: Your email

2. **Demo Account**:
   - ☐ Sign-in required: NO

3. **Notes**:
```
This is a physics sandbox game with no objectives or win conditions. Players paint with 44 different elements (water, fire, sand, etc.) and watch realistic interactions unfold.

Key features to test:
1. Select elements from bottom palette
2. Draw on canvas with touch
3. Watch physics interactions (water flows, fire spreads)
4. Use +/- buttons to control time speed
5. Observe seasonal changes (happens automatically over time)

No special setup required - the game works immediately on launch.
```

4. **Attachment**: None needed

### Step 14: Content Rights

1. **Advertising Identifier**: NO
2. **Export Compliance**:
   - Uses encryption: **NO** (game doesn't use encryption)

---

## Part 7: Submit for Review

### Step 15: Final Check

Before submitting, verify:

- [ ] Build is selected and shows "Ready to Submit"
- [ ] All required screenshots uploaded (both sizes)
- [ ] Description filled in
- [ ] Keywords added
- [ ] What's New filled in
- [ ] Pricing set to Tier 3 (£2.99)
- [ ] Privacy Policy URL works
- [ ] Support URL works
- [ ] Age rating is 4+
- [ ] App icon visible in preview
- [ ] Export compliance answered

### Step 16: Submit!

1. **Click**: Save (top right)
2. **Click**: **Submit for Review** (blue button)
3. **Confirm**: Submit
4. **Status changes**: Waiting for Review

---

## Part 8: Review Process

### What Happens Next

**Timeline**:
- Waiting for Review: 1-48 hours
- In Review: 12-48 hours
- Total: Usually 1-3 days

**Possible Outcomes**:

**✅ Approved**:
- Status: Ready for Sale
- App goes live immediately
- You'll get email notification
- App appears on App Store within 24 hours

**⚠️ Metadata Rejected**:
- Problem with screenshots, description, etc.
- Fix issues in App Store Connect
- Resubmit (no new build needed)

**❌ Binary Rejected**:
- Problem with app functionality
- Fix code, build new version
- Increment build number
- Upload and resubmit

### Common Rejection Reasons & Fixes

**"App crashes on launch"**:
- Fix: Test on real device before submitting
- Fix: Check for missing assets

**"Incomplete information"**:
- Fix: Ensure all fields filled in
- Fix: Add all required screenshots

**"Misleading description"**:
- Fix: Ensure description matches actual features
- Fix: Don't promise features that don't exist

**"Privacy policy required"**:
- Fix: We have one! Ensure URL works: `https://ninjaboy.github.io/pixelbox/privacy.html`

---

## Part 9: After Approval

### Step 17: Your App is Live! 🎉

1. **Find your app**:
   - Search App Store for "PixelBox"
   - Or use direct link from App Store Connect

2. **Share the link**:
   - Format: `https://apps.apple.com/app/pixelbox/[YOUR_APP_ID]`
   - Get from: App Store Connect → App Information → Apple ID

3. **Marketing**:
   - Share on social media
   - Post on Reddit (r/iosgaming, r/SandBoxGames)
   - Submit to indie game sites
   - Create launch announcement

### Step 18: Monitor & Update

**Check daily**:
- App Store Connect → Sales and Trends (downloads)
- App Store Connect → Ratings and Reviews
- TestFlight → Crash Reports (if any)

**Respond to reviews**:
- App Store Connect → Ratings and Reviews
- Respond to user feedback professionally

**Plan updates**:
- Based on user feedback
- Fix bugs quickly
- Add requested features
- Release every 2-4 weeks initially

**Submit updates**:
1. Increment version (4.2.4, 4.3.0, etc.)
2. Build and upload new version
3. Update "What's New"
4. Submit for review

---

## Quick Command Reference

```bash
# Build web app
npm run build

# Copy to iOS
npx cap copy ios

# Open in Xcode
open ios/App/App.xcworkspace

# Build via Fastlane
cd ios
fastlane simulator  # Test in simulator
fastlane beta      # Upload to TestFlight
fastlane release version:4.2.3  # Upload to App Store
```

---

## Helpful Links

- **Apple Developer**: https://developer.apple.com/
- **App Store Connect**: https://appstoreconnect.apple.com/
- **App Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Human Interface Guidelines**: https://developer.apple.com/design/human-interface-guidelines/
- **Support**: https://developer.apple.com/support/

---

## Costs Summary

- **Apple Developer Program**: $99 USD/year (required)
- **App Store Fee**: 30% of sales (Apple takes 30%, you get 70%)
- **No other fees**: No upload fees, no listing fees

**Example**:
- You set price: £2.99
- Apple's 30% cut: £0.90
- You receive: £2.09 per sale
- (Amounts may vary slightly by region)

---

## Tips for Success

1. **Test thoroughly** before submitting
2. **Use TestFlight** for beta testing with friends
3. **Respond to reviews** quickly and professionally
4. **Update regularly** - shows app is maintained
5. **Be patient** - Review process takes time
6. **Read rejection reasons** carefully if rejected
7. **Keep building** - First app is a learning experience

---

**Good luck with your submission! You've built something great. 🚀**

Questions? Check the issues: https://github.com/ninjaboy/pixelbox/issues
