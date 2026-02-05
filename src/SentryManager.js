/**
 * SentryManager - Error tracking singleton with game context
 * Production-only crash debugging for PixelBox
 */
import * as Sentry from '@sentry/browser';

class SentryManager {
    constructor() {
        this.initialized = false;
        this.gameContext = {
            selectedElement: null,
            particleCount: 0,
            season: null,
        };
    }

    /**
     * Initialize Sentry for production error tracking
     * Call this early in app startup (before game scenes load)
     */
    init() {
        // Only initialize in production
        if (import.meta.env.DEV) {
            console.log('[Sentry] Skipped - development mode');
            return;
        }

        const dsn = 'https://a734a9e7dd7cc53d78de42be3ef73b7e@o370318.ingest.us.sentry.io/4510832502898688';

        // Don't initialize if DSN is not configured
        if (dsn === 'YOUR_SENTRY_DSN_HERE') {
            console.warn('[Sentry] DSN not configured - error tracking disabled');
            return;
        }

        try {
            Sentry.init({
                dsn,
                environment: 'production',

                // Focus on errors, not performance
                tracesSampleRate: 0,

                // Capture 100% of errors
                sampleRate: 1.0,

                // Add game context to all events
                beforeSend: (event) => {
                    event.contexts = event.contexts || {};
                    event.contexts.game = { ...this.gameContext };
                    return event;
                },
            });

            this.initialized = true;
            console.log('[Sentry] Initialized for production error tracking');
        } catch (err) {
            console.error('[Sentry] Failed to initialize:', err);
        }
    }

    /**
     * Update game context that will be attached to error reports
     * Call this from the game loop or when state changes
     */
    setContext(context) {
        if (context.selectedElement !== undefined) {
            this.gameContext.selectedElement = context.selectedElement;
        }
        if (context.particleCount !== undefined) {
            this.gameContext.particleCount = context.particleCount;
        }
        if (context.season !== undefined) {
            this.gameContext.season = context.season;
        }

        // Also update Sentry's context if initialized
        if (this.initialized) {
            Sentry.setContext('game', this.gameContext);
        }
    }

    /**
     * Manually capture an exception with current game context
     */
    captureException(error, extraContext = {}) {
        if (!this.initialized) {
            console.error('[Sentry] Not initialized, logging error:', error);
            return;
        }

        Sentry.withScope((scope) => {
            scope.setContext('game', this.gameContext);
            if (Object.keys(extraContext).length > 0) {
                scope.setContext('extra', extraContext);
            }
            Sentry.captureException(error);
        });
    }

    /**
     * Capture a message with optional extra context data
     * Use this for telemetry of user actions - these show up in Sentry dashboard
     * @param {string} message - The message to log
     * @param {string} level - Severity level ('info', 'warning', 'error', 'debug')
     * @param {object} extra - Additional context data to attach
     */
    captureMessage(message, level = 'info', extra = {}) {
        if (!this.initialized) {
            console.log(`[Sentry] Not initialized, logging message: ${message}`, extra);
            return;
        }

        Sentry.withScope((scope) => {
            scope.setContext('game', this.gameContext);
            if (Object.keys(extra).length > 0) {
                scope.setContext('extra', extra);
            }
            Sentry.captureMessage(message, level);
        });
    }

    /**
     * Set user identifier for error tracking
     */
    setUser(userId) {
        if (this.initialized) {
            Sentry.setUser({ id: userId });
        }
    }

    /**
     * Add breadcrumb for debugging error context
     */
    addBreadcrumb(message, category = 'game', data = {}) {
        if (this.initialized) {
            Sentry.addBreadcrumb({
                message,
                category,
                data,
                level: 'info',
            });
        }
    }
}

// Export singleton instance
const sentryManager = new SentryManager();
export default sentryManager;
