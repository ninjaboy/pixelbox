/**
 * VideoRecordingManager.js - Canvas video recording with native share support
 *
 * Records the game canvas using MediaRecorder API.
 * On iOS (Capacitor): writes to cache dir and opens Share Sheet.
 * On web: triggers a file download.
 */

const MAX_DURATION_MS = 30000;
const STREAM_FPS = 30;

// Preferred mime types in order
const MIME_CANDIDATES = [
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm'
];

function detectMime() {
    if (typeof MediaRecorder === 'undefined') return null;
    for (const mime of MIME_CANDIDATES) {
        if (MediaRecorder.isTypeSupported(mime)) return mime;
    }
    return null;
}

function getFileExtension(mime) {
    if (mime && mime.startsWith('video/mp4')) return 'mp4';
    return 'webm';
}

class VideoRecordingManager {
    constructor() {
        this._recording = false;
        this._mediaRecorder = null;
        this._chunks = [];
        this._startTime = 0;
        this._autoStopTimer = null;
        this._listeners = [];
        this._mime = null;
    }

    /** Check if recording is supported in this browser */
    isSupported() {
        return typeof MediaRecorder !== 'undefined' && detectMime() !== null;
    }

    /** Whether currently recording */
    isRecording() {
        return this._recording;
    }

    /** Elapsed recording time in ms */
    getElapsed() {
        if (!this._recording) return 0;
        return Date.now() - this._startTime;
    }

    /** Register a state change callback: fn(recording: boolean) */
    onStateChange(callback) {
        this._listeners.push(callback);
        return () => {
            this._listeners = this._listeners.filter(cb => cb !== callback);
        };
    }

    _notifyListeners() {
        for (const cb of this._listeners) {
            try { cb(this._recording); } catch (_) { /* ignore */ }
        }
    }

    /** Start recording the game canvas */
    start() {
        if (this._recording) return;

        const canvas = document.querySelector('#game-container canvas');
        if (!canvas) {
            console.warn('VideoRecordingManager: no canvas found');
            return;
        }

        this._mime = detectMime();
        if (!this._mime) {
            console.warn('VideoRecordingManager: no supported mime type');
            return;
        }

        const stream = canvas.captureStream(STREAM_FPS);
        this._mediaRecorder = new MediaRecorder(stream, { mimeType: this._mime });
        this._chunks = [];

        this._mediaRecorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
                this._chunks.push(e.data);
            }
        };

        this._mediaRecorder.onstop = () => {
            this._handleRecordingComplete();
        };

        this._mediaRecorder.start(1000); // collect data every second
        this._recording = true;
        this._startTime = Date.now();

        // Auto-stop after max duration
        this._autoStopTimer = setTimeout(() => {
            this.stop();
        }, MAX_DURATION_MS);

        this._notifyListeners();
    }

    /** Stop recording */
    stop() {
        if (!this._recording) return;

        if (this._autoStopTimer) {
            clearTimeout(this._autoStopTimer);
            this._autoStopTimer = null;
        }

        this._recording = false;
        this._notifyListeners();

        if (this._mediaRecorder && this._mediaRecorder.state !== 'inactive') {
            this._mediaRecorder.stop();
        }
    }

    async _handleRecordingComplete() {
        const blob = new Blob(this._chunks, { type: this._mime });
        this._chunks = [];

        if (blob.size === 0) {
            console.warn('VideoRecordingManager: empty recording');
            return;
        }

        const ext = getFileExtension(this._mime);
        const filename = `pixellence-${Date.now()}.${ext}`;

        // Check if running in Capacitor native context
        if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) {
            await this._shareNative(blob, filename);
        } else {
            this._downloadWeb(blob, filename);
        }
    }

    async _shareNative(blob, filename) {
        try {
            const [{ Filesystem, Directory }, { Share }] = await Promise.all([
                import('@capacitor/filesystem'),
                import('@capacitor/share')
            ]);

            // Convert blob to base64
            const buffer = await blob.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            const base64 = btoa(binary);

            // Write to cache directory
            const result = await Filesystem.writeFile({
                path: filename,
                data: base64,
                directory: Directory.Cache
            });

            // Share via native share sheet
            await Share.share({
                title: 'Pixellence Recording',
                url: result.uri,
                dialogTitle: 'Share Recording'
            });
        } catch (e) {
            console.error('VideoRecordingManager: native share failed, falling back to download', e);
            this._downloadWeb(blob, filename);
        }
    }

    _downloadWeb(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Revoke after a short delay to ensure download starts
        setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
}

// Export singleton instance
const videoRecordingManager = new VideoRecordingManager();
export default videoRecordingManager;
