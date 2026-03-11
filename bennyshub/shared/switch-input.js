/**
 * NarbeSwitchInput - Two-Switch Keyboard Input Interpreter
 *
 * Accessibility input model: users with severe motor disabilities interact
 * via exactly two switches mapped to Space (Switch 1) and Enter (Switch 2).
 *
 * Space (Switch 1):
 *   - Short press  -> scan forward (advance highlight to next item)
 *   - Long press   -> begin backward scanning (reverse direction)
 *   - Held past longPressThreshold -> fires onScanBackwardStart once,
 *     then onScanBackward every repeatInterval while held
 *
 * Enter (Switch 2):
 *   - Short press  -> select the currently highlighted item
 *   - Medium hold  -> onSelectPrev (reverse-cycle a setting, e.g. 2s)
 *   - Long hold    -> onPause (open pause menu, e.g. 5-6s)
 *
 * Event registration uses the BUBBLE phase so that NarbeScanManager's
 * capture-phase cooldown fires first and can suppress rapid accidental
 * inputs before this module ever sees them.
 */

(function() {
  'use strict';

  /**
   * @param {Object} opts
   * @param {number}   [opts.longPressThreshold=3000]      - ms before Space triggers backward scan
   * @param {number}   [opts.enterLongPressThreshold=0]     - ms before Enter triggers pause (0 = disabled)
   * @param {number}   [opts.repeatInterval=2000]           - ms between backward scan repeats while Space held
   * @param {number}   [opts.minPressDuration=100]          - ignore presses shorter than this (accidental taps)
   * @param {Function} [opts.onScanForward]                 - Space short-press release
   * @param {Function} [opts.onScanBackwardStart]           - Space held past longPressThreshold (once)
   * @param {Function} [opts.onScanBackward]                - each repeat tick while Space held
   * @param {Function} [opts.onScanBackwardStop]            - Space released after backward scanning
   * @param {Function} [opts.onSelect]                      - Enter short-press release
   * @param {Function} [opts.onSelectPrev]                  - Enter long-press (reverse-cycle)
   * @param {Function} [opts.onPause]                       - Enter held past enterLongPressThreshold
   * @param {Function} [opts.shouldHandle]                  - predicate; return false to let events pass through
   */
  function NarbeSwitchInput(opts) {
    opts = opts || {};

    // Configurable thresholds (ms)
    this._longPressThreshold = opts.longPressThreshold || 3000;
    this._enterLongPressThreshold = opts.enterLongPressThreshold || 0;
    this._repeatInterval = opts.repeatInterval || 2000;
    this._minPressDuration = opts.minPressDuration != null ? opts.minPressDuration : 100;

    // Semantic callbacks
    this._onScanForward       = opts.onScanForward       || null;
    this._onScanBackwardStart = opts.onScanBackwardStart || null;
    this._onScanBackward      = opts.onScanBackward      || null;
    this._onScanBackwardStop  = opts.onScanBackwardStop  || null;
    this._onSelect            = opts.onSelect            || null;
    this._onSelectPrev        = opts.onSelectPrev        || null;
    this._onPause             = opts.onPause             || null;
    this._shouldHandle        = opts.shouldHandle        || null;

    // Internal tracking state
    this._spaceHeld = false;
    this._enterHeld = false;
    this._spaceDownTime = 0;
    this._enterDownTime = 0;
    this._spaceInBackward = false;   // true once Space long-press fires
    this._enterLongFired = false;    // true once Enter long-press fires

    // Timer references for cleanup
    this._spaceLongTimer = null;     // setTimeout for Space long-press detection
    this._spaceRepeatTimer = null;   // setInterval for backward scan repeats
    this._enterLongTimer = null;     // setTimeout for Enter long-press detection

    // Bind handlers so we can remove them in destroy()
    this._onKeyDown = this._handleKeyDown.bind(this);
    this._onKeyUp = this._handleKeyUp.bind(this);

    // Register in bubble phase (NOT capture) -- scan-manager owns capture phase
    document.addEventListener('keydown', this._onKeyDown);
    document.addEventListener('keyup', this._onKeyUp);
  }

  // --- Event handlers ---

  NarbeSwitchInput.prototype._handleKeyDown = function(e) {
    // If app provides a shouldHandle predicate and it returns false, bail out
    if (this._shouldHandle && !this._shouldHandle(e)) return;

    if (e.code === 'Space') {
      // Ignore key-repeat events from the OS (key held down fires repeated keydowns)
      if (this._spaceHeld) return;
      this._spaceHeld = true;
      this._spaceDownTime = Date.now();
      this._spaceInBackward = false;

      // Start long-press timer: if Space is still held after threshold, begin backward scan
      var self = this;
      this._spaceLongTimer = setTimeout(function() {
        self._spaceInBackward = true;
        if (self._onScanBackwardStart) self._onScanBackwardStart();
        if (self._onScanBackward) self._onScanBackward();

        // Start repeat interval for continuous backward scanning
        self._spaceRepeatTimer = setInterval(function() {
          if (self._onScanBackward) self._onScanBackward();
        }, self._repeatInterval);
      }, this._longPressThreshold);

    } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      if (this._enterHeld) return;
      this._enterHeld = true;
      this._enterDownTime = Date.now();
      this._enterLongFired = false;

      // Start Enter long-press timer (only if a threshold is configured)
      if (this._enterLongPressThreshold > 0) {
        var self = this;
        this._enterLongTimer = setTimeout(function() {
          self._enterLongFired = true;
          if (self._onPause) self._onPause();
        }, this._enterLongPressThreshold);
      }
    }
  };

  NarbeSwitchInput.prototype._handleKeyUp = function(e) {
    if (this._shouldHandle && !this._shouldHandle(e)) return;

    if (e.code === 'Space') {
      // Clear all Space timers
      clearTimeout(this._spaceLongTimer);
      clearInterval(this._spaceRepeatTimer);
      this._spaceLongTimer = null;
      this._spaceRepeatTimer = null;

      var duration = Date.now() - this._spaceDownTime;
      this._spaceHeld = false;

      if (this._spaceInBackward) {
        // Was in backward scan mode -- notify that backward scanning stopped
        this._spaceInBackward = false;
        if (this._onScanBackwardStop) this._onScanBackwardStop();
      } else if (duration >= this._minPressDuration) {
        // Short press: scan forward (only if held long enough to be intentional)
        if (this._onScanForward) this._onScanForward();
      }

    } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      clearTimeout(this._enterLongTimer);
      this._enterLongTimer = null;

      var duration = Date.now() - this._enterDownTime;
      this._enterHeld = false;

      if (this._enterLongFired) {
        // Long-press already handled (onPause was called) -- nothing to do on release
        this._enterLongFired = false;
      } else if (duration >= this._minPressDuration) {
        // Short press: select current item, or reverse-cycle if onSelectPrev applies
        if (this._onSelect) this._onSelect();
      }
    }
  };

  // --- Public methods ---

  /** Remove all event listeners and clear all pending timers. */
  NarbeSwitchInput.prototype.destroy = function() {
    document.removeEventListener('keydown', this._onKeyDown);
    document.removeEventListener('keyup', this._onKeyUp);
    clearTimeout(this._spaceLongTimer);
    clearInterval(this._spaceRepeatTimer);
    clearTimeout(this._enterLongTimer);
    this._spaceLongTimer = null;
    this._spaceRepeatTimer = null;
    this._enterLongTimer = null;
  };

  /** Update thresholds at runtime (e.g., keyboard speed preset changes). */
  NarbeSwitchInput.prototype.setThresholds = function(thresholds) {
    if (!thresholds) return;
    if (thresholds.longPressThreshold != null)      this._longPressThreshold = thresholds.longPressThreshold;
    if (thresholds.enterLongPressThreshold != null)  this._enterLongPressThreshold = thresholds.enterLongPressThreshold;
    if (thresholds.repeatInterval != null)           this._repeatInterval = thresholds.repeatInterval;
    if (thresholds.minPressDuration != null)         this._minPressDuration = thresholds.minPressDuration;
  };

  /** Returns true if Space is currently held down. Useful for auto-scan suppression. */
  NarbeSwitchInput.prototype.isSpaceHeld = function() {
    return this._spaceHeld;
  };

  /** Returns true if Enter is currently held down. */
  NarbeSwitchInput.prototype.isEnterHeld = function() {
    return this._enterHeld;
  };

  // Expose as global (IIFE pattern matching NarbeScanManager / NarbeVoiceManager)
  window.NarbeSwitchInput = NarbeSwitchInput;
})();
