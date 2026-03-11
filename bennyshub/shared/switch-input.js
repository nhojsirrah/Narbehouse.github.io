/**
 * NarbeSwitchInput — Shared Module 1
 * Interprets raw keyboard events into semantic switch actions.
 * Replaces duplicated keydown/keyup → spaceHeld/enterHeld → long-press detection logic.
 */
(function() {
    'use strict';

    function NarbeSwitchInput(config) {
        var self = this;

        // Thresholds
        self._longPressThreshold = config.longPressThreshold || 3000;
        self._enterLongPressThreshold = config.enterLongPressThreshold || 0;
        self._repeatInterval = config.repeatInterval || 2000;
        self._minPressDuration = config.minPressDuration || 100;

        // Callbacks
        self._onScanForward = config.onScanForward || function() {};
        self._onScanBackwardStart = config.onScanBackwardStart || function() {};
        self._onScanBackward = config.onScanBackward || function() {};
        self._onScanBackwardStop = config.onScanBackwardStop || function() {};
        self._onSelect = config.onSelect || function() {};
        self._onSelectPrev = config.onSelectPrev || function() {};
        self._onPause = config.onPause || function() {};

        // Optional predicate
        self._shouldHandle = config.shouldHandle || function() { return true; };

        // Internal state
        self._spaceHeld = false;
        self._enterHeld = false;
        self._spaceDownTime = 0;
        self._enterDownTime = 0;
        self._spaceLongTriggered = false;
        self._enterLongTriggered = false;
        self._spaceTimer = null;
        self._spaceInterval = null;
        self._enterTimer = null;

        // Bind handlers for cleanup
        self._onKeyDown = function(e) {
            if (e.repeat) return;
            if (!self._shouldHandle(e)) return;

            if (e.code === 'Space') {
                e.preventDefault();
                self._spaceHeld = true;
                self._spaceDownTime = Date.now();
                self._spaceLongTriggered = false;

                self._spaceTimer = setTimeout(function() {
                    self._spaceLongTriggered = true;
                    self._onScanBackwardStart();
                    self._onScanBackward();

                    self._spaceInterval = setInterval(function() {
                        self._onScanBackward();
                    }, self._repeatInterval);
                }, self._longPressThreshold);

            } else if (e.code === 'Enter') {
                e.preventDefault();
                self._enterHeld = true;
                self._enterDownTime = Date.now();
                self._enterLongTriggered = false;

                if (self._enterLongPressThreshold > 0) {
                    self._enterTimer = setTimeout(function() {
                        self._enterLongTriggered = true;
                        self._onPause();
                    }, self._enterLongPressThreshold);
                }
            }
        };

        self._onKeyUp = function(e) {
            if (!self._shouldHandle(e)) return;

            if (e.code === 'Space') {
                e.preventDefault();
                clearTimeout(self._spaceTimer);
                clearInterval(self._spaceInterval);
                self._spaceTimer = null;
                self._spaceInterval = null;

                if (self._spaceLongTriggered) {
                    self._onScanBackwardStop();
                } else {
                    self._onScanForward();
                }

                self._spaceHeld = false;
                self._spaceLongTriggered = false;

            } else if (e.code === 'Enter') {
                e.preventDefault();
                clearTimeout(self._enterTimer);
                self._enterTimer = null;

                if (!self._enterLongTriggered) {
                    self._onSelect();
                }

                self._enterHeld = false;
                self._enterLongTriggered = false;
            }
        };

        document.addEventListener('keydown', self._onKeyDown);
        document.addEventListener('keyup', self._onKeyUp);
    }

    NarbeSwitchInput.prototype.destroy = function() {
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        clearTimeout(this._spaceTimer);
        clearInterval(this._spaceInterval);
        clearTimeout(this._enterTimer);
    };

    NarbeSwitchInput.prototype.setThresholds = function(opts) {
        if (opts.longPressThreshold !== undefined) this._longPressThreshold = opts.longPressThreshold;
        if (opts.enterLongPressThreshold !== undefined) this._enterLongPressThreshold = opts.enterLongPressThreshold;
        if (opts.repeatInterval !== undefined) this._repeatInterval = opts.repeatInterval;
    };

    NarbeSwitchInput.prototype.isSpaceHeld = function() {
        return this._spaceHeld;
    };

    NarbeSwitchInput.prototype.isEnterHeld = function() {
        return this._enterHeld;
    };

    window.NarbeSwitchInput = NarbeSwitchInput;
})();
