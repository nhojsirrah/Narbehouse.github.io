/**
 * NarbeSwitchInput — Shared switch input handler for NARBE apps.
 * Interprets raw keyboard events into semantic switch actions.
 * IIFE on window (no ES modules).
 */
(function () {
    'use strict';

    function NarbeSwitchInput(opts) {
        opts = opts || {};

        // Thresholds (ms) — each app passes its current values
        this._longPressThreshold = opts.longPressThreshold || 3000;
        this._enterLongPressThreshold = opts.enterLongPressThreshold || 0;
        this._repeatInterval = opts.repeatInterval || 2000;
        this._minPressDuration = opts.minPressDuration || 100;

        // Callbacks
        this._onScanForward = opts.onScanForward || function () {};
        this._onScanBackwardStart = opts.onScanBackwardStart || function () {};
        this._onScanBackward = opts.onScanBackward || function () {};
        this._onScanBackwardStop = opts.onScanBackwardStop || function () {};
        this._onSelect = opts.onSelect || function () {};
        this._onSelectPrev = opts.onSelectPrev || function () {};
        this._onPause = opts.onPause || function () {};

        // Optional predicate — return false to let events pass through
        this._shouldHandle = opts.shouldHandle || function () { return true; };

        // Internal state
        this._spaceHeld = false;
        this._enterHeld = false;
        this._spaceDownTime = 0;
        this._enterDownTime = 0;
        this._spaceBackwardFired = false;
        this._enterLongFired = false;

        // Timers
        this._spaceTimer = null;
        this._spaceRepeatTimer = null;
        this._enterTimer = null;

        // Bound handlers (for removal)
        this._handleKeyDown = this._onKeyDown.bind(this);
        this._handleKeyUp = this._onKeyUp.bind(this);
        this._handleBlur = this._onBlur.bind(this);

        // Register listeners
        document.addEventListener('keydown', this._handleKeyDown);
        document.addEventListener('keyup', this._handleKeyUp);
        window.addEventListener('blur', this._handleBlur);
    }

    NarbeSwitchInput.prototype._onKeyDown = function (e) {
        if (e.repeat) return;
        if (!this._shouldHandle(e)) return;

        if (e.code === 'Space') {
            if (!this._spaceHeld) {
                this._spaceHeld = true;
                this._spaceDownTime = Date.now();
                this._spaceBackwardFired = false;

                var self = this;
                this._clearSpaceTimers();
                this._spaceTimer = setTimeout(function () {
                    self._spaceBackwardFired = true;
                    self._onScanBackwardStart();
                    self._onScanBackward();

                    // Start repeat interval
                    self._spaceRepeatTimer = setInterval(function () {
                        if (!self._spaceHeld) {
                            self._clearSpaceTimers();
                            return;
                        }
                        self._onScanBackward();
                    }, self._repeatInterval);
                }, self._longPressThreshold);
            }
        } else if (e.code === 'Enter') {
            if (!this._enterHeld) {
                this._enterHeld = true;
                this._enterDownTime = Date.now();
                this._enterLongFired = false;

                if (this._enterLongPressThreshold > 0) {
                    var self = this;
                    this._clearEnterTimer();
                    this._enterTimer = setTimeout(function () {
                        self._enterLongFired = true;
                        self._onPause();
                    }, self._enterLongPressThreshold);
                }
            }
        }
    };

    NarbeSwitchInput.prototype._onKeyUp = function (e) {
        if (e.repeat) return;
        if (!this._shouldHandle(e)) return;

        if (e.code === 'Space') {
            if (!this._spaceHeld) return;
            var duration = Date.now() - this._spaceDownTime;
            this._spaceHeld = false;
            this._clearSpaceTimers();

            if (this._spaceBackwardFired) {
                this._onScanBackwardStop();
            } else if (duration >= this._minPressDuration) {
                this._onScanForward();
            }
        } else if (e.code === 'Enter') {
            if (!this._enterHeld) return;
            var duration = Date.now() - this._enterDownTime;
            this._enterHeld = false;
            this._clearEnterTimer();

            if (this._enterLongFired) {
                // Long press already handled
                return;
            }

            if (duration >= this._minPressDuration) {
                this._onSelect();
            }
        }
    };

    NarbeSwitchInput.prototype._onBlur = function () {
        this._spaceHeld = false;
        this._enterHeld = false;
        this._clearSpaceTimers();
        this._clearEnterTimer();
    };

    NarbeSwitchInput.prototype._clearSpaceTimers = function () {
        if (this._spaceTimer) { clearTimeout(this._spaceTimer); this._spaceTimer = null; }
        if (this._spaceRepeatTimer) { clearInterval(this._spaceRepeatTimer); this._spaceRepeatTimer = null; }
    };

    NarbeSwitchInput.prototype._clearEnterTimer = function () {
        if (this._enterTimer) { clearTimeout(this._enterTimer); this._enterTimer = null; }
    };

    NarbeSwitchInput.prototype.destroy = function () {
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('keyup', this._handleKeyUp);
        window.removeEventListener('blur', this._handleBlur);
        this._clearSpaceTimers();
        this._clearEnterTimer();
    };

    NarbeSwitchInput.prototype.setThresholds = function (opts) {
        if (opts.longPressThreshold !== undefined) this._longPressThreshold = opts.longPressThreshold;
        if (opts.enterLongPressThreshold !== undefined) this._enterLongPressThreshold = opts.enterLongPressThreshold;
        if (opts.repeatInterval !== undefined) this._repeatInterval = opts.repeatInterval;
    };

    NarbeSwitchInput.prototype.isSpaceHeld = function () { return this._spaceHeld; };
    NarbeSwitchInput.prototype.isEnterHeld = function () { return this._enterHeld; };

    window.NarbeSwitchInput = NarbeSwitchInput;
})();
