# PixelBox Repository Split - Complete Plan

**Goal**: Split development (private) from deployment (public) while keeping source code private

**Current State**: Single public repo with full source code
**Desired State**: Private development repo + Public deployment repo

---

## Overview

### Current Repository: `pixelbox` (public)
- Contains: Full source code, build configuration, iOS app, documentation
- GitHub Pages: Serves minified build from `dist/`
- URL: https://ninjaboy.github.io/pixelbox/

### New Structure:

**Repository 1: `pixelboxx` (PRIVATE)**
- Purpose: Development, source code, iOS app development
- Contains: Everything (src/, ios/, configs, full documentation)
- Collaborators: Only you (and invited developers)
- GitHub Actions: Build and deploy to public repo

**Repository 2: `pixelbox` (PUBLIC)**
- Purpose: Hosting minified game for GitHub Pages
- Contains: Only `dist/`, `privacy.html`, minimal README
- Public access: Play game, view privacy policy
- No source code visible

---

## Architecture Diagram

```
┌─────────────────────────────────────┐
│  pixelboxx (PRIVATE)                │
│  ├── src/           (source code)   │
│  ├── ios/           (iOS app)       │
│  ├── vite.config.js (build)         │
│  ├── package.json                   │
│  └── .github/workflows/             │
│      └── deploy-public.yml          │
│          │                           │
│          │ [On push to main]        │
│          ▼                           │
│      1. npm run build               │
│      2. Enhanced minification       │
│      3. Clone pixelbox (public)     │
│      4. Copy dist/ only             │
│      5. Commit & push               │
└─────────────────────────────────────┘
                 │
                 │ GitHub Action
                 │ (automated)
                 ▼
┌─────────────────────────────────────┐
│  pixelbox (PUBLIC)                  │
│  ├── dist/          (minified game) │
│  ├── privacy.html   (policy)        │
│  ├── README.md      (play info)     │
│  └── .github/workflows/             │
│      └── pages.yml  (serve Pages)   │
│                                      │
│  GitHub Pages: ▶ LIVE GAME          │
│  https://ninjaboy.github.io/pixelbox│
└─────────────────────────────────────┘
```

---

## Phase 1: Analysis & Preparation (15 minutes)

### ✅ Current Build Analysis

**Already minified**: Vite + Terser produces heavily optimized code
- Variable names: Single letters (`e`, `t`, `a`, `s`)
- No whitespace, no comments
- Dead code eliminated
- Console.log removed
- Tree-shaken

**Sample output**:
```javascript
var e=Object.defineProperty,t=(t,a,s)=>((t,a,s)=>a in t?e(t,a,{enumerable:!0...
```

**Verdict**: Current minification is already very strong. Additional obfuscation is OPTIONAL.

### Enhanced Security Options (Choose Level)

**Level 1: Current (Recommended)**
- ✅ Already implemented
- ✅ Fast performance
- ✅ Standard industry practice
- ⚠️ Determined developers can still reverse-engineer

**Level 2: Light Obfuscation (Optional)**
- Add property mangling
- Add dead code injection (minimal)
- Slightly slower build, minimal performance impact
- Harder to reverse-engineer

**Level 3: Heavy Obfuscation (Not Recommended for Games)**
- Control flow flattening
- String array encoding
- ⚠️ Significant performance impact
- ⚠️ Larger file size
- ⚠️ May break hot-reload during development

**RECOMMENDATION**: Stick with Level 1 (current). It's already excellent.

### Tasks

- [x] Analyze current build output
- [ ] Decide on obfuscation level: **Level 1 (keep current)**
- [ ] Prepare GitHub account for new repo creation
- [ ] Plan repository naming convention

---

## Phase 2: Create Private Repository (10 minutes)

### Step 1: Create Repository on GitHub

1. **Go to**: https://github.com/new
2. **Repository name**: `pixelboxx`
3. **Description**: `PixelBox - Physics sandbox game (Private development repository)`
4. **Visibility**: 🔒 **Private**
5. **Initialize**:
   - ☐ Don't add README (we'll push existing)
   - ☐ Don't add .gitignore (we have one)
   - ☐ Don't add license (we have one)
6. **Click**: Create repository

### Step 2: Push Existing Code to Private Repo

```bash
cd /Users/ninjabot/projects/pixelbox

# Add new remote for private repo
git remote add private https://github.com/ninjaboy/pixelboxx.git

# Push all branches and tags
git push private master --tags

# Verify
git remote -v
```

### Step 3: Verify

```bash
# Check private repo on GitHub
open https://github.com/ninjaboy/pixelboxx

# Verify all files present
# Verify it shows 🔒 Private
```

### Expected Result

- ✅ Private repository created
- ✅ All code pushed to pixelboxx
- ✅ Git history preserved
- ✅ Tags preserved

---

## Phase 3: Enhanced Build Pipeline (30 minutes)

### Option A: Keep Current Minification (Recommended)

**No changes needed** - Vite config already optimal

### Option B: Add Light Obfuscation

Install obfuscator:
```bash
npm install --save-dev javascript-obfuscator vite-plugin-javascript-obfuscator
```

Update `vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import legacy from '@vitejs/plugin-legacy';
import obfuscator from 'vite-plugin-javascript-obfuscator';

export default defineConfig({
  plugins: [
    legacy({
      targets: ['defaults', 'not IE 11'],
    }),
    // Only in production
    process.env.NODE_ENV === 'production' && obfuscator({
      options: {
        // Light obfuscation - balanced
        compact: true,
        controlFlowFlattening: false, // Keep false for performance
        deadCodeInjection: false,     // Keep false for size
        debugProtection: false,       // Keep false for debugging
        disableConsoleOutput: true,
        identifierNamesGenerator: 'mangled',
        renameGlobals: false,
        selfDefending: false,         // Keep false for compatibility
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
      },
    }),
  ].filter(Boolean),
  // ... rest of config
});
```

**DECISION POINT**: Do you want Option A (current) or Option B (obfuscation)?

**Recommendation**: Option A - current minification is excellent and performance-friendly

---

## Phase 4: GitHub Action - Cross-Repo Deployment (45 minutes)

### Step 1: Create Personal Access Token

1. **GitHub**: Settings → Developer settings → Personal access tokens → Tokens (classic)
2. **Click**: Generate new token (classic)
3. **Name**: `PIXELBOX_PUBLIC_DEPLOY`
4. **Expiration**: No expiration (or 1 year)
5. **Scopes**:
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Actions workflows)
6. **Generate** and **COPY TOKEN** (only shown once!)

### Step 2: Add Secret to Private Repo

1. **Go to**: https://github.com/ninjaboy/pixelboxx/settings/secrets/actions
2. **Click**: New repository secret
3. **Name**: `PUBLIC_REPO_TOKEN`
4. **Value**: Paste your personal access token
5. **Add secret**

### Step 3: Create Deployment Workflow

Create `.github/workflows/deploy-to-public.yml` in private repo:

```yaml
name: Deploy to Public Repository

on:
  push:
    branches: [ master ]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout private repo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build production
        run: npm run build
        env:
          NODE_ENV: production

      - name: Clone public repository
        run: |
          git clone https://ninjaboy:${{ secrets.PUBLIC_REPO_TOKEN }}@github.com/ninjaboy/pixelbox.git public-repo
          cd public-repo
          git config user.name "GitHub Actions Bot"
          git config user.email "actions@github.com"

      - name: Clear public repo (except .git and .github)
        run: |
          cd public-repo
          find . -mindepth 1 -maxdepth 1 ! -name '.git' ! -name '.github' -exec rm -rf {} +

      - name: Copy built files to public repo
        run: |
          # Copy minified dist
          cp -r dist public-repo/

          # Copy privacy policy
          cp privacy.html public-repo/

          # Copy minimal README (we'll create this)
          cp PUBLIC_README.md public-repo/README.md

      - name: Commit and push to public repo
        run: |
          cd public-repo
          git add -A

          # Check if there are changes
          if git diff --staged --quiet; then
            echo "No changes to commit"
          else
            git commit -m "🤖 Auto-deploy from private repo ($(date +'%Y-%m-%d %H:%M:%S'))"
            git push origin master
          fi

      - name: Deployment summary
        run: |
          echo "✅ Deployed to https://github.com/ninjaboy/pixelbox"
          echo "🌐 Live at: https://ninjaboy.github.io/pixelbox/"
```

### Step 4: Create Public README Template

Create `PUBLIC_README.md` in private repo:

```markdown
# 🎮 PixelBox - Physics Sandbox Simulation

**Play now**: https://ninjaboy.github.io/pixelbox/

## About

PixelBox is a mesmerizing sandbox simulation where you paint with elements and watch nature unfold. Create flowing water, roaring fires, growing trees, and dynamic weather systems - all governed by realistic physics.

## Features

- 🌍 **44 Unique Elements** with realistic physics
- 🌲 **Four Dynamic Seasons** that change gameplay
- ⚡ **Variable Time Control** (0.1x to 100x speed)
- 🌧️ **Weather Systems** - rain, snow, clouds, lightning
- 🎮 **Pure Sandbox** - no objectives, just creativity

## Privacy

We collect **zero data**. Everything stays on your device.
[Read our privacy policy](privacy.html)

## iOS App

Coming soon to the App Store - £2.99, buy once, play forever.

## Development

This is the public deployment repository.
Source code is in a private repository.

For issues or suggestions: [Open an issue](https://github.com/ninjaboy/pixelbox/issues)

## License

© 2025 ninjaboy. All rights reserved.

---

**Deployed automatically from private repository**
```

---

## Phase 5: Clean Public Repository (20 minutes)

### Step 1: Backup Current Public Repo

```bash
# Just in case - create a backup branch
cd /Users/ninjabot/projects/pixelbox
git checkout -b backup-before-split
git push origin backup-before-split
git checkout master
```

### Step 2: Decision - Clean History or Keep?

**Option A: Keep Git History** (Recommended)
- Pros: Preserve all commits, easy to revert
- Cons: Old source code still in history (but hard to find)
- Method: Just remove files in new commit

**Option B: Clean Git History**
- Pros: Source code completely removed from history
- Cons: Lose all history, no reverting
- Method: Create fresh repo with only dist/

**RECOMMENDATION**: Option A (keep history, just remove current files)

Reasoning: History is useful, and determined people can find source via Wayback Machine or forks anyway. Security through obscurity isn't real security - the minification is your actual protection.

### Step 3: Remove Source Files (Manual - After Action Works)

**Don't do this yet!** First verify GitHub Action works.

Once Action is verified, the Action will handle cleanup automatically.

---

## Phase 6: Update Documentation (20 minutes)

### Private Repo (pixelboxx) - Full Dev Docs

Keep all existing docs:
- ✅ MOBILE_CONVERSION_PROGRESS.md
- ✅ APP_STORE_CONTENT.md
- ✅ APP_STORE_SUBMISSION.md
- ✅ PUBLISHING_GUIDE.md
- ✅ FASTLANE_SETUP.md
- ✅ All technical documentation

Update `README.md` in private repo:

```markdown
# 🔒 PixelBox - Private Development Repository

**Public game**: https://ninjaboy.github.io/pixelbox/
**Public repo**: https://github.com/ninjaboy/pixelbox (deployment only)

## ⚠️ This is the PRIVATE development repository

Source code, development documentation, and iOS app development.

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Test iOS app
cd ios && fastlane simulator
\`\`\`

## Project Structure

- \`src/\` - Game source code
- \`ios/\` - iOS app (Capacitor)
- \`dist/\` - Built files (not committed)
- \`vite.config.js\` - Build configuration

## Development Workflow

1. Make changes in \`src/\`
2. Test locally: \`npm run dev\`
3. Commit and push to \`master\`
4. GitHub Action automatically builds and deploys to public repo
5. Live at: https://ninjaboy.github.io/pixelbox/

## Deployment

Automated via GitHub Actions:
- On push to \`master\` branch
- Builds production bundle
- Pushes minified code to public repo
- GitHub Pages serves the game

## Documentation

- [Mobile Conversion](MOBILE_CONVERSION_PROGRESS.md)
- [App Store Content](APP_STORE_CONTENT.md)
- [Publishing Guide](PUBLISHING_GUIDE.md)
- [Repository Split Plan](REPOSITORY_SPLIT_PLAN.md)

## iOS App

See [PUBLISHING_GUIDE.md](PUBLISHING_GUIDE.md) for App Store submission.

## Privacy

Zero data collection. See [privacy.html](privacy.html).

## License

© 2025 ninjaboy. All rights reserved.
\`\`\`

### Public Repo (pixelbox) - Minimal User Docs

Will be created by GitHub Action using `PUBLIC_README.md`

---

## Phase 7: Testing & Verification (15 minutes)

### Step 1: Test GitHub Action

```bash
# In private repo
cd /Users/ninjabot/projects/pixelbox

# Make a small change to trigger action
echo "# Test deployment" >> TEST.md
git add TEST.md
git commit -m "Test: Trigger deployment action"
git push private master

# Watch GitHub Actions
open https://github.com/ninjaboy/pixelboxx/actions
```

### Step 2: Verify Deployment

1. **Check Action Status**: Should show green ✅
2. **Check Public Repo**: https://github.com/ninjaboy/pixelbox
   - Should have `dist/` folder
   - Should have `privacy.html`
   - Should have new README
3. **Check GitHub Pages**: https://ninjaboy.github.io/pixelbox/
   - Game should load and work
   - All features functional

### Step 3: Verify Source Code Hidden

```bash
# Check public repo - should NOT see:
# - src/ folder
# - ios/ folder
# - vite.config.js
# - package.json
# - Most documentation

# Should ONLY see:
# - dist/
# - privacy.html
# - README.md
# - .github/workflows/pages.yml
```

---

## Phase 8: Finalization (10 minutes)

### Update Git Remotes Locally

```bash
cd /Users/ninjabot/projects/pixelbox

# Rename origin to public (it points to public repo)
git remote rename origin public

# Set private as default
git remote rename private origin

# Verify
git remote -v
# Should show:
# origin    https://github.com/ninjaboy/pixelboxx.git (private)
# public    https://github.com/ninjaboy/pixelbox.git (public)
```

### Future Workflow

```bash
# Normal development - push to private
git add .
git commit -m "Add new feature"
git push  # Goes to pixelboxx (private)
# GitHub Action auto-deploys to pixelbox (public)

# Manual deploy to public (if needed)
git push public master
```

### Clean Up

```bash
# Remove test file
rm TEST.md
git add TEST.md
git commit -m "Clean up test file"
git push
```

---

## Security Checklist

Before going live, verify:

- [x] Private repo is actually marked Private (🔒 icon visible)
- [ ] Personal Access Token stored in Secrets (not in code)
- [ ] Token has minimal required permissions (just repo access)
- [ ] Public repo has no source code visible in files
- [ ] Public repo has no source code in recent commits
- [ ] GitHub Action works correctly
- [ ] Game plays correctly on GitHub Pages
- [ ] Privacy policy is accessible
- [ ] No API keys or secrets in public repo
- [ ] .env files not committed anywhere
- [ ] iOS fastlane .env not in public repo

---

## Rollback Plan

If something goes wrong:

### Rollback Public Repo

```bash
cd path/to/pixelbox
git log --oneline  # Find commit before cleanup
git reset --hard <commit-hash>
git push --force origin master
```

### Restore from Backup

```bash
git checkout backup-before-split
git checkout -b master-restored
git push origin master-restored
# Then merge or replace master
```

### Delete Private Repo (if needed)

Just delete on GitHub - public repo remains untouched

---

## Cost & Resources

**GitHub**:
- Private repo: FREE (unlimited with GitHub account)
- GitHub Actions: 2,000 minutes/month FREE
- Storage: 500MB FREE
- Expected usage: ~5 minutes/deployment, well within free tier

**No additional costs**

---

## Timeline

| Phase | Duration | Can Skip? |
|-------|----------|-----------|
| 1. Analysis | 15 min | ❌ |
| 2. Create Private Repo | 10 min | ❌ |
| 3. Build Pipeline | 30 min | ✅ If keeping current build |
| 4. GitHub Action | 45 min | ❌ |
| 5. Clean Public Repo | 20 min | ⚠️ Done by action |
| 6. Documentation | 20 min | ⚠️ Partial - update README |
| 7. Testing | 15 min | ❌ |
| 8. Finalization | 10 min | ❌ |
| **Total** | **2h 45m** | **~1.5h if streamlined** |

---

## Next Steps

**Immediate**:
1. ✅ Review this plan
2. ❓ Decide: Keep current minification or add obfuscation? (Recommend: keep current)
3. ▶️ Create private repository on GitHub
4. ▶️ Push code to private repo
5. ▶️ Create GitHub Action
6. ▶️ Test deployment
7. ▶️ Verify everything works

**Future**:
- Monitor GitHub Actions usage
- Update documentation as needed
- Consider adding branch protection rules
- Add collaborators to private repo if needed

---

## Questions to Answer Before Proceeding

1. **Obfuscation level**: Keep current (recommended) or add light obfuscation?
2. **Git history**: Keep in public repo (recommended) or clean completely?
3. **Repository naming**: `pixelboxx` for private (as requested) or different name?
4. **Deployment trigger**: On every push to master (recommended) or manual only?

**Recommended Answers**:
1. Keep current minification - it's excellent
2. Keep git history - easier to manage
3. pixelboxx - as you specified
4. Automatic on push - most convenient

---

## Support

If anything goes wrong:
- GitHub Actions logs: https://github.com/ninjaboy/pixelboxx/actions
- GitHub Support: https://support.github.com/
- Rollback using backup branch

---

**Ready to proceed?** Confirm your choices and we'll execute the plan step by step.
