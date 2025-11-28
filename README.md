# 🔒 PixelBox - Private Development Repository

**Public game**: https://ninjaboy.github.io/pixelbox/
**Public repo**: https://github.com/ninjaboy/pixelbox (deployment only)
**This repo**: 🔒 Private development repository

## ⚠️ This is the PRIVATE development repository

Contains source code, development documentation, and iOS app development.

**Do not share this repository or its contents.**

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server (with hot reload)
npm run dev
# Open http://localhost:3000

# Build for production
npm run build

# Preview production build
npm run preview

# Test iOS app in simulator
cd ios
fastlane simulator
```

## 📁 Project Structure

```
pixelbox/
├── src/                    # Game source code
│   ├── main.js            # Entry point
│   ├── Element.js         # Base element class
│   ├── elements/          # All 44 elements
│   ├── config/            # Game configuration
│   └── managers/          # Season, wind, etc.
│
├── ios/                    # iOS app (Capacitor)
│   ├── App/               # Xcode project
│   └── fastlane/          # Deployment automation
│
├── dist/                   # Built files (gitignored)
├── index.html             # Entry HTML
├── vite.config.js         # Build configuration
├── package.json           # Dependencies
│
└── .github/workflows/     # GitHub Actions
    └── deploy-to-public.yml  # Auto-deploy to public repo
```

## 🔄 Development Workflow

### Normal Development

```bash
# 1. Make changes in src/
# 2. Test locally
npm run dev

# 3. Commit and push
git add .
git commit -m "Add new feature"
git push

# 4. GitHub Action automatically:
#    - Builds production bundle
#    - Pushes to public repo (pixelbox)
#    - Deploys to GitHub Pages
```

### Manual Deployment (if needed)

```bash
# Build locally
npm run build

# Push to private repo (triggers action)
git push origin master

# Or push directly to public (not recommended)
git push public master
```

## 📦 Deployment

**Automated via GitHub Actions:**

- **Trigger**: On push to `master` branch
- **Process**:
  1. Checkout code
  2. Install dependencies (`npm ci`)
  3. Build production bundle (`npm run build`)
  4. Clone public repository
  5. Clear old files (keep `.git` and `.github`)
  6. Copy `dist/`, `privacy.html`, `PUBLIC_README.md`
  7. Commit and push to public repo
  8. GitHub Pages serves the game

- **URL**: https://ninjaboy.github.io/pixelbox/
- **Status**: Check at https://github.com/ninjaboy/pixelboxx/actions

## 📚 Documentation

### Development
- [Repository Split Plan](REPOSITORY_SPLIT_PLAN.md) - How repos are structured
- [Mobile Conversion Progress](MOBILE_CONVERSION_PROGRESS.md) - iOS app status
- [Fastlane Setup](FASTLANE_SETUP.md) - iOS automation
- [Architecture](ARCHITECTURE.md) - Code architecture details

### Publishing
- [Publishing Guide](PUBLISHING_GUIDE.md) - Complete App Store guide
- [App Store Content](APP_STORE_CONTENT.md) - Marketing copy
- [App Store Submission](APP_STORE_SUBMISSION.md) - Submission checklist

### Web Deployment
- [Repository Split Plan](REPOSITORY_SPLIT_PLAN.md) - Deployment architecture

## 📱 iOS App

### Development

```bash
# Build web assets
npm run build
npx cap copy ios

# Open in Xcode
open ios/App/App.xcworkspace

# Or use fastlane
cd ios
fastlane simulator  # Test in simulator
fastlane beta      # Upload to TestFlight
```

### Publishing

See [PUBLISHING_GUIDE.md](PUBLISHING_GUIDE.md) for complete App Store submission guide.

**Status**: Ready for submission
**Price**: £2.99 (buy once, play forever)
**Version**: 4.2.3

## 🔐 Security

### What's Public
- Minified game code (`dist/`)
- Privacy policy
- Basic README

### What's Private (this repo)
- Source code (`src/`)
- iOS app code (`ios/`)
- Build configuration
- Development documentation
- API keys and secrets

### Minification
- Already heavily minified via Vite + Terser
- Variable names: single letters
- No whitespace or comments
- Console.log stripped
- Dead code eliminated

**Current approach**: Standard minification (fast, performant, secure enough)

## 🛠️ Tech Stack

- **Game Engine**: Phaser 3.86.0
- **Build Tool**: Vite 5.0
- **Mobile**: Capacitor 7.4.4
- **iOS Deployment**: Fastlane
- **Physics**: Custom cellular automata
- **Hosting**: GitHub Pages (public repo)

## 🎮 Features

- **44 Interactive Elements** with realistic physics
- **Four-Season Cycle** with dynamic weather
- **Temperature System** affecting freezing/melting
- **Wind System** affecting clouds
- **Living Trees** with seasonal behaviors
- **Bird Migration** system
- **Variable Time Control** (0.1x to 100x)
- **Mobile Optimized** with touch controls

## 📊 Repository Setup

### Remotes

```bash
git remote -v
# Should show:
# origin   https://github.com/ninjaboy/pixelboxx.git (private development)
# private  https://github.com/ninjaboy/pixelboxx.git (same as origin)
# public   https://github.com/ninjaboy/pixelbox.git  (public deployment)
```

### Branches
- `master` - Main development branch (auto-deploys to public)
- `backup-before-split` - Backup of original repo state

## 🔑 Secrets & Tokens

**Required GitHub Secrets** (in this private repo):
- `PUBLIC_REPO_TOKEN` - Personal Access Token with `repo` scope
  - Used by GitHub Action to push to public repository
  - Created at: https://github.com/settings/tokens
  - Added at: https://github.com/ninjaboy/pixelboxx/settings/secrets/actions

## 🐛 Troubleshooting

### Build fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### iOS build fails
```bash
# Reinstall pods
cd ios/App
pod install --repo-update
cd ../..
```

### GitHub Action fails
- Check logs: https://github.com/ninjaboy/pixelboxx/actions
- Verify `PUBLIC_REPO_TOKEN` secret is set
- Ensure token has `repo` scope

## 📜 License

© 2025 ninjaboy. All rights reserved.

This is proprietary software. Source code is private and not open source.

---

**🔒 Remember**: This is a private repository. Do not share source code publicly.
