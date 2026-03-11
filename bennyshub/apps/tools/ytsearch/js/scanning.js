// Scanning functionality for row and key navigation
// Refactored to use shared NarbeSwitchInput and NarbeLinearScan modules
class ScanningManager {
    constructor() {
        this.mode = 'ROWS'; // 'ROWS' or 'KEYS'
        this.currentRowIndex = 0;
        this.currentKeyIndex = 0;
        this.overlayOpen = false;
        this.overlayIndex = 0;

        // Timing configuration (preserved from original)
        this.SHORT_MIN = 30;
        this.SHORT_MAX = 3000;
        this.SCAN_BACK_MS = 2500;
        this.ENTER_HOLD_MS = 3000;
        this.INPUT_COOLDOWN_MS = 200;

        // Auto scan configuration
        this.updateSettingsFromManager();

        this.autoScanTimer = null;
        this.scanSpeeds = {
            'slow': 3000,
            'medium': 2000,
            'fast': 1000
        };

        // Input state (exposed for settings auto-scan suppression)
        this.spaceDown = false;
        this.enterDown = false;

        this.cooldownUntil = 0;
        this.suppressRowLabelOnce = false;

        // Shared module instances (initialized in init)
        this._switchInput = null;
        this._overlayScan = null;

        // Get all rows
        this.getAllRows();

        this.rowLabels = {
            'row_text': 'text',
            'row_modes': 'search controls',
            'row_controls': 'controls',
            'row1': 'a b c d e f',
            'row2': 'g h i j k l',
            'row3': 'm n o p q r',
            'row4': 's t u v w x',
            'row5': 'y z zero one two three',
            'row6': 'four five six seven eight nine',
            'predRow': 'predictive text'
        };

        this.init();
    }

    updateSettingsFromManager() {
        if (typeof NarbeScanManager !== 'undefined') {
            const s = NarbeScanManager.getSettings();
            this.autoScanEnabled = s.autoScan;
            const interval = NarbeScanManager.getScanInterval();
            this.currentScanInterval = (typeof interval === 'number' && interval > 0) ? interval : 2000;

            // Map for legacy UI
            if (interval === 3000) this.scanSpeed = 'slow';
            else if (interval === 2000) this.scanSpeed = 'medium';
            else if (interval === 1000) this.scanSpeed = 'fast';
            else this.scanSpeed = 'medium';
        } else {
            this.autoScanEnabled = false;
            this.currentScanInterval = 2000;
            this.scanSpeed = 'medium';
        }
    }

    getAllRows() {
        // Get all visible rows - exclude hidden ones from scanning
        const allRows = Array.from(document.querySelectorAll('.row-wrap'));

        // Only include visible rows in the scanning cycle
        this.rows = allRows.filter(row => !row.classList.contains('hidden'));

        console.log('Scanning rows loaded:', this.rows.map(r => r.dataset.rowId));
        console.log('Total visible rows:', this.rows.length);

        // Ensure we have rows to scan
        if (this.rows.length === 0) {
            console.warn('No visible rows found for scanning');
            return;
        }

        // Reset current index if it's out of bounds
        if (this.currentRowIndex >= this.rows.length) {
            this.currentRowIndex = 0;
        }
    }

    init() {
        // Subscribe to global Scan Manager
        if (typeof NarbeScanManager !== 'undefined' && NarbeScanManager.subscribe) {
            NarbeScanManager.subscribe((settings) => {
                this.updateSettingsFromManager();
                if (this.autoScanEnabled) {
                    if (!this.autoScanTimer && !this.overlayOpen) this.startAutoScan();
                } else {
                    this.stopAutoScan();
                }
            });
        }

        // Robust startup
        const startUp = () => {
             // Force focus to window to capture keys
            window.focus();
            if (document.body) document.body.focus();

            this._initSwitchInput();
            this._initOverlayScan();

            setTimeout(() => {
                this.getAllRows();
                // Failsafe retry
                if (this.rows.length === 0) this.getAllRows();

                this.highlightRows();
                this.updateSettingsFromManager();
                if (this.autoScanEnabled) this.startAutoScan();
            }, 100);
        };

        if (document.readyState === 'loading') {
            window.addEventListener('DOMContentLoaded', startUp);
        } else {
            startUp();
        }
    }

    _initSwitchInput() {
        // Use NarbeSwitchInput for keydown/keyup handling
        // Thresholds from original: SCAN_BACK_MS=2500, ENTER_HOLD_MS=3000, repeat=2000
        this._switchInput = new NarbeSwitchInput({
            longPressThreshold: this.SCAN_BACK_MS,       // 2500ms for backward scan
            enterLongPressThreshold: this.ENTER_HOLD_MS, // 3000ms for enter long-press
            repeatInterval: 2000,                        // 2000ms continuous backward scan
            minPressDuration: this.SHORT_MIN,             // 30ms minimum press

            onScanForward: () => {
                // Pause auto scan on user input
                if (this.autoScanEnabled && this.autoScanTimer) {
                    this.stopAutoScan();
                }

                if (this.inCooldown()) return;

                if (this.overlayOpen) {
                    this.overlayFocusNext();
                } else if (this.mode === 'ROWS') {
                    this.scanRowsNext();
                } else {
                    this.scanKeysNext();
                }
                this.armCooldown();

                // Resume auto scan after interaction
                if (this.autoScanEnabled && !this.overlayOpen) {
                    setTimeout(() => {
                        this.startAutoScan();
                    }, 1000);
                }
            },

            onScanBackwardStart: () => {
                // Pause auto scan
                if (this.autoScanEnabled && this.autoScanTimer) {
                    this.stopAutoScan();
                }
            },

            onScanBackward: () => {
                if (this.overlayOpen) {
                    this.overlayFocusPrev();
                } else if (this.mode === 'ROWS') {
                    this.scanRowsPrev();
                } else {
                    this.scanKeysPrev();
                }
            },

            onScanBackwardStop: () => {
                // Resume auto scan after backward scanning stops
                if (this.autoScanEnabled && !this.overlayOpen) {
                    setTimeout(() => {
                        this.startAutoScan();
                    }, 1000);
                }
            },

            onSelect: () => {
                // Pause auto scan on user input
                if (this.autoScanEnabled && this.autoScanTimer) {
                    this.stopAutoScan();
                }

                if (this.overlayOpen) {
                    if (this.inCooldown()) return;
                    this.overlayActivate();
                    this.armCooldown();
                } else {
                    if (this.inCooldown()) return;

                    if (this.mode === 'KEYS') {
                        this.activateKey();
                        this.mode = 'ROWS';
                        this.highlightRows();
                    } else {
                        this.enterRow();
                    }
                    this.armCooldown();
                }

                // Resume auto scan after interaction
                if (this.autoScanEnabled && !this.overlayOpen) {
                    setTimeout(() => {
                        this.startAutoScan();
                    }, 1000);
                }
            },

            onPause: () => {
                // Enter long-press behavior
                if (this.overlayOpen) return;

                if (this.mode === 'KEYS') {
                    this.mode = 'ROWS';
                    this.highlightRows();
                    window.speechManager.speak('rows');
                } else if (this.mode === 'ROWS') {
                    // Jump to predictive row
                    const predRowIndex = this.rows.findIndex(row =>
                        row.dataset.rowId === 'predRow'
                    );
                    if (predRowIndex !== -1) {
                        this.currentRowIndex = predRowIndex;
                        this.suppressRowLabelOnce = true;
                        this.highlightRows();
                        this.readPredictiveRow();
                    }
                }

                // Resume auto scan after long press
                if (this.autoScanEnabled && !this.overlayOpen) {
                    this.startAutoScan();
                }
            }
        });

        // Prevent default space/enter behavior
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
            }
        });

        // Expose spaceDown/enterDown state for settings auto-scan suppression
        const self = this;
        Object.defineProperty(this, 'spaceDown', {
            get() { return self._switchInput ? self._switchInput.isSpaceHeld() : false; },
            set(v) { /* no-op, controlled by NarbeSwitchInput */ }
        });
        Object.defineProperty(this, 'enterDown', {
            get() { return self._switchInput ? self._switchInput.isEnterHeld() : false; },
            set(v) { /* no-op, controlled by NarbeSwitchInput */ }
        });
    }

    _initOverlayScan() {
        // NarbeLinearScan for overlay button scanning (shorts feed, settings, etc.)
        this._overlayScan = new NarbeLinearScan({
            getItems: () => this.getOverlayButtons(),
            onFocus: (item, index) => {
                this.overlayIndex = index;
                this._applyOverlayFocusFromScan();
            },
            onSelect: (item) => {
                if (item) item.click();
            }
        });
    }

    _applyOverlayFocusFromScan() {
        const buttons = this.getOverlayButtons();
        this.applyOverlayFocus(buttons);
    }

    readPredictiveRow() {
        const predButtons = document.querySelectorAll('[data-pred="true"]');
        const words = Array.from(predButtons)
            .map(btn => btn.textContent.trim())
            .filter(text => text.length > 0);

        if (words.length > 0) {
            this.readWordsSequentially(words, 0);
        }
    }

    readWordsSequentially(words, index) {
        if (index >= words.length) return;

        window.speechManager.speak(words[index]);

        if (index + 1 < words.length) {
            setTimeout(() => {
                this.readWordsSequentially(words, index + 1);
            }, 1000);
        }
    }

    inCooldown() {
        return Date.now() < this.cooldownUntil;
    }

    armCooldown() {
        this.cooldownUntil = Date.now() + this.INPUT_COOLDOWN_MS;
    }

    // Row scanning methods - ensure bounds checking
    scanRowsNext() {
        if (this.rows.length === 0) {
            console.warn('No rows available for scanning');
            return;
        }

        this.currentRowIndex = (this.currentRowIndex + 1) % this.rows.length;
        console.log(`Scanning next: ${this.currentRowIndex + 1}/${this.rows.length} - ${this.rows[this.currentRowIndex]?.dataset?.rowId}`);
        this.highlightRows();
    }

    scanRowsPrev() {
        if (this.rows.length === 0) {
            console.warn('No rows available for scanning');
            return;
        }

        this.currentRowIndex = (this.currentRowIndex - 1 + this.rows.length) % this.rows.length;
        console.log(`Scanning prev: ${this.currentRowIndex + 1}/${this.rows.length} - ${this.rows[this.currentRowIndex]?.dataset?.rowId}`);
        this.highlightRows();
    }

    enterRow() {
        const currentRow = this.rows[this.currentRowIndex];
        const rowId = currentRow.dataset.rowId;

        // Handle text row specially
        if (rowId === 'row_text') {
            const textInput = document.getElementById('text-input');
            const value = textInput.value.trim();
            if (value) {
                window.speechManager.speak(value);
            } else {
                window.speechManager.speak('empty');
            }
            return;
        }

        // Stop auto scan when entering key mode
        if (this.autoScanEnabled) {
            this.stopAutoScan();
        }

        // Allow entering history rows for selection
        // Enter key mode for all rows (including history)
        this.clearRowHighlights();
        this.mode = 'KEYS';
        this.currentKeyIndex = 0;
        this.highlightKeys();
    }

    // Key scanning methods
    scanKeysNext() {
        const currentRow = this.rows[this.currentRowIndex];
        const keys = Array.from(currentRow.querySelectorAll('.scan-btn, .text-input'));
        this.currentKeyIndex = (this.currentKeyIndex + 1) % keys.length;
        this.highlightKeys();
    }

    scanKeysPrev() {
        const currentRow = this.rows[this.currentRowIndex];
        const keys = Array.from(currentRow.querySelectorAll('.scan-btn, .text-input'));
        this.currentKeyIndex = (this.currentKeyIndex - 1 + keys.length) % keys.length;
        this.highlightKeys();
    }

    activateKey() {
        const currentRow = this.rows[this.currentRowIndex];
        const keys = Array.from(currentRow.querySelectorAll('.scan-btn, .text-input'));
        const currentKey = keys[this.currentKeyIndex];

        if (currentKey && currentKey.classList.contains('scan-btn')) {
            // Clear key focus before performing action
            this.clearKeyHighlights();
            // Trigger the button action
            currentKey.click();
        }
    }

    // Visual highlighting methods with better bounds checking
    highlightRows() {
        this.clearKeyHighlights();
        this.clearRowHighlights();

        if (this.mode === 'ROWS' && !this.overlayOpen && this.rows.length > 0) {
            // Ensure current index is valid
            if (this.currentRowIndex < 0 || this.currentRowIndex >= this.rows.length) {
                console.warn(`Invalid row index ${this.currentRowIndex}, resetting to 0`);
                this.currentRowIndex = 0;
            }

            const currentRow = this.rows[this.currentRowIndex];
            if (currentRow && !currentRow.classList.contains('hidden')) {
                currentRow.classList.add('focused');

                // Scroll the focused row into view for better visibility
                currentRow.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest'
                });

                // Force a repaint to ensure the highlight is visible
                currentRow.offsetHeight;

                console.log(`Highlighted row: ${currentRow.dataset.rowId} (${this.currentRowIndex + 1}/${this.rows.length})`);
            } else {
                console.warn('Current row is invalid or hidden, refreshing rows');
                this.getAllRows();
                if (this.rows.length > 0) {
                    this.currentRowIndex = 0;
                    this.highlightRows();
                }
            }
        }

        // Update status display
        this.updateStatus();

        if (!this.suppressRowLabelOnce) {
            this.speakRowLabel();
        } else {
            this.suppressRowLabelOnce = false;
        }
    }

    highlightKeys() {
        this.clearRowHighlights();
        this.clearKeyHighlights();

        const currentRow = this.rows[this.currentRowIndex];
        if (!currentRow) return;

        const keys = Array.from(currentRow.querySelectorAll('.scan-btn:not([style*="display: none"]), .text-input'));
        const currentKey = keys[this.currentKeyIndex];

        if (currentKey) {
            currentKey.classList.add('focused');
            // Force a repaint to ensure the highlight is visible
            currentKey.offsetHeight;
        }

        // Update status display
        this.updateStatus();

        this.speakKeyLabel();
    }

    clearRowHighlights() {
        this.rows.forEach(row => {
            row.classList.remove('focused');
        });
    }

    clearKeyHighlights() {
        document.querySelectorAll('.scan-btn, .text-input').forEach(el => {
            el.classList.remove('focused');
        });
    }

    // Speech methods - TTS history row contents when scanning
    speakRowLabel() {
        const currentRow = this.rows[this.currentRowIndex];
        const rowId = currentRow.dataset.rowId;

        // Never speak for text row
        if (rowId === 'row_text') return;

        // For history rows, speak the button contents instead of row labels
        if (rowId.startsWith('row_history')) {
            this.speakHistoryRowContents(currentRow);
            return;
        }

        // For other rows, speak the row label
        const label = this.rowLabels[rowId] || currentRow.dataset.label || 'row';
        window.speechManager.speak(label);
    }

    speakHistoryRowContents(historyRow) {
        // Get all buttons in the history row that have text content
        const buttons = Array.from(historyRow.querySelectorAll('.scan-btn'));
        const words = buttons
            .map(btn => btn.textContent.trim())
            .filter(text => text.length > 0 && text !== ''); // Only non-empty buttons

        if (words.length > 0) {
            // Join the words with commas and speak them
            const contentText = words.join(', ');
            console.log(`Speaking history row contents: ${contentText}`);
            window.speechManager.speak(contentText);
        } else {
            // If no words found, speak empty
            window.speechManager.speak('empty');
        }
    }

    speakKeyLabel() {
        const currentRow = this.rows[this.currentRowIndex];
        const rowId = currentRow.dataset.rowId;

        // Never speak for history row keys
        if (rowId.startsWith('row_history')) return;

        const keys = Array.from(currentRow.querySelectorAll('.scan-btn, .text-input'));
        const currentKey = keys[this.currentKeyIndex];

        if (currentKey) {
            // Check if this is the YouTube button with separate text span
            const buttonTextSpan = currentKey.querySelector('.button-text');
            let label;

            if (buttonTextSpan) {
                label = buttonTextSpan.textContent.trim();
            } else {
                label = currentKey.textContent.trim() || currentKey.placeholder || 'button';
            }

            window.speechManager.speak(label);
        }
    }

    // Overlay scanning methods
    getOverlayButtons() {
        const shortsFeed = document.getElementById('shorts-feed');

        if (shortsFeed && !shortsFeed.classList.contains('hidden')) {
            return Array.from(shortsFeed.querySelectorAll('.scan-btn'));
        }

        // Check if settings menu is open
        const settingsMenu = document.getElementById('settingsMenu');
        if (settingsMenu && !settingsMenu.classList.contains('hidden')) {
            return Array.from(settingsMenu.querySelectorAll('.settings-item'));
        }

        const imageSlideshow = document.getElementById('image-slideshow');
        const videoSlideshow = document.getElementById('video-slideshow');

        if (imageSlideshow && !imageSlideshow.classList.contains('hidden')) {
            return Array.from(imageSlideshow.querySelectorAll('.scan-btn'));
        }

        if (videoSlideshow && !videoSlideshow.classList.contains('hidden')) {
            return Array.from(videoSlideshow.querySelectorAll('.scan-btn'));
        }

        return [];
    }

    overlayFocusNext() {
        const buttons = this.getOverlayButtons();
        if (buttons.length === 0) return;

        // Check if settings menu is using its own manager
        const settingsMenu = document.getElementById('settingsMenu');
        if (settingsMenu && !settingsMenu.classList.contains('hidden') && window.settingsManager) {
            window.settingsManager.focusNext();
            return;
        }

        this.overlayIndex = (this.overlayIndex + 1) % buttons.length;
        this.applyOverlayFocus(buttons);
    }

    overlayFocusPrev() {
        const buttons = this.getOverlayButtons();
        if (buttons.length === 0) return;

        // Check if settings menu is using its own manager
        const settingsMenu = document.getElementById('settingsMenu');
        if (settingsMenu && !settingsMenu.classList.contains('hidden') && window.settingsManager) {
            window.settingsManager.focusPrev();
            return;
        }

        this.overlayIndex = (this.overlayIndex - 1 + buttons.length) % buttons.length;
        this.applyOverlayFocus(buttons);
    }

    applyOverlayFocus(buttons) {
        buttons.forEach((btn, index) => {
            btn.classList.toggle('focused', index === this.overlayIndex);
        });

        const currentButton = buttons[this.overlayIndex];
        if (currentButton) {
            const label = currentButton.textContent.trim() || 'button';
            window.speechManager.speak(label);
        }
    }

    overlayActivate() {
        const buttons = this.getOverlayButtons();
        if (buttons.length === 0) return;

        // Check if settings menu is using its own manager
        const settingsMenu = document.getElementById('settingsMenu');
        if (settingsMenu && !settingsMenu.classList.contains('hidden') && window.settingsManager) {
            window.settingsManager.activate();
            return;
        }

        const currentButton = buttons[this.overlayIndex];
        if (currentButton) {
            currentButton.click();
        }
    }

    // Public methods for overlay management
    openOverlay() {
        this.overlayOpen = true;
        this.overlayIndex = 0;

        // Stop auto scan when overlay is open
        if (this.autoScanEnabled) {
            this.stopAutoScan();
        }

        // Apply initial focus
        setTimeout(() => {
            const buttons = this.getOverlayButtons();
            if (buttons.length > 0) {
                this.applyOverlayFocus(buttons);
            }
        }, 100);
    }

    closeOverlay() {
        this.overlayOpen = false;
        this.overlayIndex = 0;

        // Clear any overlay button focus
        document.querySelectorAll('.slideshow-overlay .scan-btn').forEach(btn => {
            btn.classList.remove('focused');
        });

        // Resume auto scan when overlay is closed
        if (this.autoScanEnabled) {
            setTimeout(() => {
                this.startAutoScan();
            }, 1000);
        }
    }

    // Update status display
    updateStatus() {
        const statusElement = document.getElementById('status');
        if (statusElement) {
            const modeText = this.mode === 'ROWS' ? 'Rows' : 'Keys';
            statusElement.textContent = `Mode: ${modeText} • Space=next • Enter=select`;
        }
    }

    updateRows() {
        // Refresh the rows array to account for hidden/shown elements
        const previousRowsCount = this.rows.length;
        const previousRowId = this.rows[this.currentRowIndex]?.dataset?.rowId;

        this.getAllRows();

        console.log(`Rows updated: ${previousRowsCount} -> ${this.rows.length}`);

        // Try to maintain current row position if possible
        if (previousRowId) {
            const newIndex = this.rows.findIndex(row => row.dataset.rowId === previousRowId);
            if (newIndex !== -1) {
                this.currentRowIndex = newIndex;
                console.log(`Maintained row position: ${previousRowId} at index ${newIndex}`);
            } else {
                // Previous row no longer visible, reset to start
                this.currentRowIndex = 0;
                console.log(`Previous row ${previousRowId} no longer visible, reset to index 0`);
            }
        }

        // Ensure current row index is valid
        if (this.currentRowIndex >= this.rows.length) {
            this.currentRowIndex = Math.max(0, this.rows.length - 1);
            console.log(`Row index out of bounds, reset to ${this.currentRowIndex}`);
        }

        // Re-highlight current row
        if (this.mode === 'ROWS') {
            this.highlightRows();
        }
    }

    // Auto scan methods
    startAutoScan() {
        if (!this.autoScanEnabled) return;

        this.stopAutoScan();

        // Use synced interval first, fallback to lookup
        let interval = this.currentScanInterval;
        if (!interval || typeof interval !== 'number') {
             interval = this.scanSpeeds[this.scanSpeed] || 2000;
        }

        // Safety minimums
        if (interval < 500) interval = 2000;

        this.autoScanTimer = setInterval(() => {
            // Don't auto scan if user is interacting or in overlay mode
            if (this.spaceDown || this.enterDown || this.overlayOpen) {
                return;
            }

            if (this.mode === 'ROWS') {
                this.scanRowsNext();
            } else {
                this.scanKeysNext();
            }
        }, interval);

        console.log(`Auto scan started: ${interval}ms`);
    }

    stopAutoScan() {
        if (this.autoScanTimer) {
            clearInterval(this.autoScanTimer);
            this.autoScanTimer = null;
            console.log('Auto scan stopped');
        }
    }

    setAutoScan(enabled) {
        this.autoScanEnabled = enabled;
        if (enabled) {
            this.startAutoScan();
        } else {
            this.stopAutoScan();
        }
    }

    setScanSpeed(speed) {
        this.scanSpeed = speed;
        // Also update interval if possible
        if (this.scanSpeeds[speed]) {
             this.currentScanInterval = this.scanSpeeds[speed];
        }

        if (this.autoScanEnabled) {
            // Restart with new speed
            this.startAutoScan();
        }
    }
}

// Global scanning manager instance
window.scanningManager = new ScanningManager();
