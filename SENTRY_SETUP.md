# Sentry Setup for PixelBox

This guide explains how to configure Sentry error tracking for PixelBox.

## Getting Your DSN

1. Go to [sentry.io](https://sentry.io) and sign up/log in
2. Create a new project:
   - Select **Browser JavaScript** as the platform
   - Name it "pixelbox" or similar
3. After project creation, you'll see your DSN on the setup page
   - It looks like: `https://abc123@o123456.ingest.sentry.io/1234567`
4. Copy the DSN

## Configuring PixelBox

1. Open `src/SentryManager.js`
2. Replace `YOUR_SENTRY_DSN_HERE` with your actual DSN:

```javascript
const dsn = 'https://your-actual-dsn@o123456.ingest.sentry.io/1234567';
```

## What Gets Tracked

Sentry is configured to capture:
- **JavaScript errors** - uncaught exceptions, promise rejections
- **Game context** - selected element, particle count, current season

This helps debug crashes by showing what the player was doing when the error occurred.

## Environment

- **Production only** - Sentry is disabled in development (`npm run dev`)
- **No performance tracing** - focused purely on crash/error debugging
- **100% error sampling** - all errors are captured

## Testing

1. Build for production: `npm run build`
2. Preview: `npm run preview`
3. Open browser console and run: `throw new Error('Test Sentry')`
4. Check your Sentry dashboard - the error should appear within a minute

## Capacitor/iOS

The same web-based Sentry SDK works in Capacitor. Errors from the WebView are captured automatically.

## Privacy

No PII is collected by default. If you add user identification later, update your privacy policy accordingly.
