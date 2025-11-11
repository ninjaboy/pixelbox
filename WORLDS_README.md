# Pre-made Worlds Configuration

This guide explains how to create and share pre-made worlds using 0x0.st.

## Quick Start

### 1. Export Your World

1. Build an amazing world in the game
2. Press the **☰ menu button**
3. Click **"Export Game"**
4. The world will upload to 0x0.st
5. You'll get a URL like: `https://0x0.st/xxxxx.json`
6. **Copy this URL** - you'll need it!

### 2. Add to Config

Open `worlds.config.js` and find a slot:

```javascript
{
    name: 'Island Paradise',
    icon: '🏝️',
    url: null, // ⬅️ PASTE YOUR URL HERE
    description: 'Tropical island with palm trees and ocean'
}
```

Replace `null` with your URL:

```javascript
{
    name: 'Island Paradise',
    icon: '🏝️',
    url: 'https://0x0.st/abcd.json', // ✅ Your URL here
    description: 'Tropical island with palm trees and ocean'
}
```

### 3. Test It

1. Reload the game
2. Open menu → "New from Template"
3. Your world appears under "Pre-made Worlds"!

## Adding New Worlds

You can add as many worlds as you want:

```javascript
export const PREMADE_WORLDS = [
    {
        name: 'My Amazing World',
        icon: '🌟',  // Pick any emoji
        url: 'https://0x0.st/xxxx.json',
        description: 'One-line description of your world'
    },
    {
        name: 'Another Cool World',
        icon: '🎨',
        url: 'https://0x0.st/yyyy.json',
        description: 'Short summary here'
    },
    // Add more...
];
```

## Icon Ideas

- 🏝️ Island
- 🏜️ Desert
- 🌋 Volcano
- ❄️ Ice/Snow
- 🌲 Forest
- ⛰️ Mountain
- 🕳️ Cave
- 🪸 Coral/Ocean
- 🏰 Castle/City
- 🌈 Fantasy
- 🔥 Fire
- 💎 Crystals
- 🌙 Night
- ☀️ Day
- 🎭 Maze
- 🎪 Playground

## How 0x0.st Works

- **Free hosting**: No account needed
- **Immutable**: Files can't be changed once uploaded
- **Public**: Anyone with the URL can download
- **Persistence**: Files stay online for a long time (but not forever)
- **Size limit**: Keep worlds under 1-2 MB

## Save Format

The exported JSON contains:

```json
{
    "version": "1.0",
    "timestamp": "2025-01-15T10:30:00.000Z",
    "world": "base64-encoded-world-data",
    "dimensions": {
        "width": 200,
        "height": 150
    }
}
```

## Sharing Worlds

To share your world with others:

1. Export your world (get the 0x0.st URL)
2. Share the URL with friends
3. They can load it via menu → "Import Game"
4. Or add it to their own `worlds.config.js`

## Troubleshooting

**World won't load?**
- Check the URL is correct
- Make sure it starts with `https://0x0.st/`
- Try downloading the URL directly in your browser to verify it exists

**Upload failed?**
- Check your internet connection
- Try again (0x0.st might be temporarily down)
- World might be too large (>1MB)

**World looks wrong?**
- Make sure you're in Build Mode when exporting
- Check that all elements are supported in the current version

## Example Config

Here's a complete example:

```javascript
export const PREMADE_WORLDS = [
    {
        name: 'Tutorial Island',
        icon: '📚',
        url: 'https://0x0.st/tutorial.json',
        description: 'Learn the basics with this starter world'
    },
    {
        name: 'Volcano Adventure',
        icon: '🌋',
        url: 'https://0x0.st/volcano.json',
        description: 'Dangerous lava flows and fire geysers'
    },
    {
        name: 'Underwater City',
        icon: '🏛️',
        url: 'https://0x0.st/atlantis.json',
        description: 'Explore the depths of the ocean'
    }
];
```

## Tips

- **Name**: Keep it short and descriptive (2-4 words)
- **Icon**: Use emojis that visually represent your world
- **Description**: One clear sentence about what makes it special
- **URL**: Always test before sharing!

## Need Help?

If you run into issues:
1. Check the browser console for errors (F12)
2. Verify your URL works by visiting it directly
3. Make sure `worlds.config.js` syntax is correct (no missing commas!)
