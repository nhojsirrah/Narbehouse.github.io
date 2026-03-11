/**
 * NarbeThemeProvider - Theme Definitions and Application
 *
 * Centralizes theme arrays and application logic. Each app passes its
 * current theme configuration; this module eliminates duplication of
 * identical gradient strings across apps.
 *
 * Built-in catalogs:
 *   'standard-8'  - Default, Ocean, Midnight, Forest, Sunset, Lavender, Mint, Dark Blue
 *   'hub-11'      - standard-8 + Rose, Sky, Cream, Peach (reordered)
 *   'trivia-5'    - Default, Dark, Pastel, Neon, High Contrast
 */

(function() {
  'use strict';

  var CATALOGS = {
    'standard-8': [
      { name: 'Default',   bg: 'linear-gradient(135deg, #ff4b1f, #ff9068)',                highlight: '#ffff00' },
      { name: 'Ocean',     bg: 'linear-gradient(135deg, #2193b0, #6dd5ed)',                highlight: '#ffffff' },
      { name: 'Midnight',  bg: 'linear-gradient(135deg, #232526, #414345)',                highlight: '#00ff00' },
      { name: 'Forest',    bg: 'linear-gradient(135deg, #134e5e, #71b280)',                highlight: '#ffcc00' },
      { name: 'Sunset',    bg: 'linear-gradient(135deg, #f12711, #f5af19)',                highlight: '#ffff00' },
      { name: 'Lavender',  bg: 'linear-gradient(135deg, #834d9b, #d04ed6)',                highlight: '#00ffff' },
      { name: 'Mint',      bg: 'linear-gradient(135deg, #00b09b, #96c93d)',                highlight: '#ffffff' },
      { name: 'Dark Blue', bg: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)',       highlight: '#00ffcc' }
    ],

    'hub-11': [
      { name: 'Default',   bg: 'linear-gradient(135deg, #ff4b1f, #ff9068)',                highlight: '#ffff00' },
      { name: 'Ocean',     bg: 'linear-gradient(135deg, #2193b0, #6dd5ed)',                highlight: '#ffffff' },
      { name: 'Forest',    bg: 'linear-gradient(135deg, #134e5e, #71b280)',                highlight: '#ffcc00' },
      { name: 'Sunset',    bg: 'linear-gradient(135deg, #f12711, #f5af19)',                highlight: '#ffff00' },
      { name: 'Midnight',  bg: 'linear-gradient(135deg, #232526, #414345)',                highlight: '#00ff00' },
      { name: 'Rose',      bg: 'linear-gradient(135deg, #ee9ca7, #ffdde1)',                highlight: '#ff00ff' },
      { name: 'Sky',       bg: 'linear-gradient(135deg, #56ccf2, #2f80ed)',                highlight: '#ffffff' },
      { name: 'Cream',     bg: 'linear-gradient(135deg, #fceabb, #f8b500)',                highlight: '#ff4500' },
      { name: 'Mint',      bg: 'linear-gradient(135deg, #00b09b, #96c93d)',                highlight: '#ffffff' },
      { name: 'Lavender',  bg: 'linear-gradient(135deg, #834d9b, #d04ed6)',                highlight: '#00ffff' },
      { name: 'Peach',     bg: 'linear-gradient(135deg, #ffd89b, #19547b)',                highlight: '#00ff00' }
    ],

    'trivia-5': [
      { name: 'Default',        bg: 'linear-gradient(135deg, #667eea, #764ba2)',           highlight: '#ffff00' },
      { name: 'Dark',           bg: 'linear-gradient(135deg, #1a1a2e, #16213e)',           highlight: '#00ff00' },
      { name: 'Pastel',         bg: 'linear-gradient(135deg, #a8edea, #fed6e3)',           highlight: '#ff69b4' },
      { name: 'Neon',           bg: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',  highlight: '#00ffff' },
      { name: 'High Contrast',  bg: '#000000',                                            highlight: '#ffff00' }
    ]
  };

  /**
   * @param {Object} opts
   * @param {string}   [opts.catalog]       - 'standard-8', 'hub-11', 'trivia-5'
   * @param {Array}    [opts.themes]        - custom theme array (overrides catalog)
   * @param {number}   [opts.initialIndex=0] - starting theme index
   * @param {Function} [opts.applyFn]       - how to apply theme (receives theme object)
   */
  function NarbeThemeProvider(opts) {
    opts = opts || {};

    if (opts.themes) {
      this._themes = opts.themes;
    } else if (opts.catalog && CATALOGS[opts.catalog]) {
      this._themes = CATALOGS[opts.catalog];
    } else {
      this._themes = CATALOGS['standard-8'];
    }

    this._index = opts.initialIndex || 0;
    if (this._index >= this._themes.length) this._index = 0;

    this._applyFn = opts.applyFn || null;
  }

  /** Cycle theme by direction (+1 or -1), wrapping around. */
  NarbeThemeProvider.prototype.cycle = function(direction) {
    direction = direction || 1;
    this._index = (this._index + direction + this._themes.length) % this._themes.length;
    this.apply();
  };

  /** Jump to a specific theme index. */
  NarbeThemeProvider.prototype.setIndex = function(i) {
    this._index = i;
    if (this._index >= this._themes.length) this._index = 0;
    if (this._index < 0) this._index = 0;
  };

  NarbeThemeProvider.prototype.getIndex = function() {
    return this._index;
  };

  /** Get the current theme object { name, bg, highlight }. */
  NarbeThemeProvider.prototype.getCurrent = function() {
    return this._themes[this._index];
  };

  /** Get the full themes array. */
  NarbeThemeProvider.prototype.getThemes = function() {
    return this._themes;
  };

  /** Apply the current theme via the configured applyFn. */
  NarbeThemeProvider.prototype.apply = function() {
    if (this._applyFn) {
      this._applyFn(this._themes[this._index]);
    }
  };

  window.NarbeThemeProvider = NarbeThemeProvider;
})();
