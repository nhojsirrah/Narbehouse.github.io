/**
 * NarbeSwitchInput - Shared switch input handler
 * Interprets raw keyboard events into semantic switch actions.
 * Replaces duplicated keydown/keyup long-press detection logic in every app.
 */
window.NarbeSwitchInput = (function() {
  'use strict';

  function NarbeSwitchInput(config) {
    var self = this;

    // Thresholds (ms)
    this._longPressThreshold = config.longPressThreshold || 3000;
    this._enterLongPressThreshold = config.enterLongPressThreshold || 0;
    this._repeatInterval = config.repeatInterval || 2000;
    this._minPressDuration = config.minPressDuration || 100;

    // Callbacks
    this._onScanForward = config.onScanForward || function() {};
    this._onScanBackwardStart = config.onScanBackwardStart || function() {};
    this._onScanBackward = config.onScanBackward || function() {};
    this._onScanBackwardStop = config.onScanBackwardStop || function() {};
    this._onSelect = config.onSelect || function() {};
    this._onSelectPrev = config.onSelectPrev || function() {};
    this._onPause = config.onPause || function() {};

    // Optional predicate to skip handling
    this._shouldHandle = config.shouldHandle || function() { return true; };

    // Internal state
    this._spaceHeld = false;
    this._enterHeld = false;
    this._spaceDownTime = 0;
    this._enterDownTime = 0;
    this._spaceLongPressTimer = null;
    this._spaceRepeatTimer = null;
    this._enterLongPressTimer = null;
    this._backwardScanStarted = false;
    this._enterLongPressTriggered = false;
    this._destroyed = false;

    // Bind handlers
    this._onKeyDown = function(e) { self._handleKeyDown(e); };
    this._onKeyUp = function(e) { self._handleKeyUp(e); };

    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  NarbeSwitchInput.prototype._handleKeyDown = function(e) {
    if (this._destroyed) return;
    if (!this._shouldHandle(e)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (!this._spaceHeld) {
        this._spaceHeld = true;
        this._spaceDownTime = Date.now();
        this._backwardScanStarted = false;

        var self = this;
        var threshold = this._longPressThreshold;
        this._spaceLongPressTimer = setTimeout(function() {
          if (self._spaceHeld && (Date.now() - self._spaceDownTime) >= threshold) {
            self._backwardScanStarted = true;
            self._onScanBackwardStart();
            self._spaceRepeatTimer = setInterval(function() {
              if (self._spaceHeld) {
                self._onScanBackward();
              }
            }, self._repeatInterval);
          }
        }, threshold);
      }
    } else if (e.code === 'Enter') {
      e.preventDefault();
      if (!this._enterHeld) {
        this._enterHeld = true;
        this._enterDownTime = Date.now();
        this._enterLongPressTriggered = false;

        if (this._enterLongPressThreshold > 0) {
          var self = this;
          var threshold = this._enterLongPressThreshold;
          this._enterLongPressTimer = setTimeout(function() {
            if (self._enterHeld && (Date.now() - self._enterDownTime) >= threshold) {
              self._enterLongPressTriggered = true;
              self._onPause();
            }
          }, threshold);
        }
      }
    }
  };

  NarbeSwitchInput.prototype._handleKeyUp = function(e) {
    if (this._destroyed) return;
    if (!this._shouldHandle(e)) return;

    if (e.code === 'Space') {
      e.preventDefault();
      if (this._spaceHeld) {
        this._spaceHeld = false;
        var duration = Date.now() - this._spaceDownTime;

        if (this._spaceLongPressTimer) {
          clearTimeout(this._spaceLongPressTimer);
          this._spaceLongPressTimer = null;
        }
        if (this._spaceRepeatTimer) {
          clearInterval(this._spaceRepeatTimer);
          this._spaceRepeatTimer = null;
        }

        if (duration >= this._minPressDuration && !this._backwardScanStarted) {
          this._onScanForward();
        } else if (this._backwardScanStarted) {
          this._onScanBackwardStop();
        }

        this._spaceDownTime = 0;
        this._backwardScanStarted = false;
      }
    } else if (e.code === 'Enter') {
      e.preventDefault();
      if (this._enterHeld) {
        this._enterHeld = false;
        var duration = Date.now() - this._enterDownTime;

        if (this._enterLongPressTimer) {
          clearTimeout(this._enterLongPressTimer);
          this._enterLongPressTimer = null;
        }

        if (!this._enterLongPressTriggered && duration >= this._minPressDuration) {
          this._onSelect();
        }

        this._enterDownTime = 0;
        this._enterLongPressTriggered = false;
      }
    }
  };

  NarbeSwitchInput.prototype.setThresholds = function(thresholds) {
    if (thresholds.longPressThreshold !== undefined) {
      this._longPressThreshold = thresholds.longPressThreshold;
    }
    if (thresholds.enterLongPressThreshold !== undefined) {
      this._enterLongPressThreshold = thresholds.enterLongPressThreshold;
    }
    if (thresholds.repeatInterval !== undefined) {
      this._repeatInterval = thresholds.repeatInterval;
    }
  };

  NarbeSwitchInput.prototype.isSpaceHeld = function() {
    return this._spaceHeld;
  };

  NarbeSwitchInput.prototype.isEnterHeld = function() {
    return this._enterHeld;
  };

  NarbeSwitchInput.prototype.destroy = function() {
    this._destroyed = true;
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    if (this._spaceLongPressTimer) clearTimeout(this._spaceLongPressTimer);
    if (this._spaceRepeatTimer) clearInterval(this._spaceRepeatTimer);
    if (this._enterLongPressTimer) clearTimeout(this._enterLongPressTimer);
  };

  return NarbeSwitchInput;
})();
