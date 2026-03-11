/**
 * Centralized Theme Provider for Narbehouse Accessibility Hub
 * Eliminates duplicated theme definitions and cycling logic across apps
 */

window.NarbeThemeProvider = (function() {
  'use strict';

  var CATALOGS = {
    'standard-8': [
      { name: 'Default', bg: 'linear-gradient(135deg, #ff4b1f, #ff9068)' },
      { name: 'Ocean', bg: 'linear-gradient(135deg, #2193b0, #6dd5ed)' },
      { name: 'Midnight', bg: 'linear-gradient(135deg, #232526, #414345)' },
      { name: 'Forest', bg: 'linear-gradient(135deg, #134e5e, #71b280)' },
      { name: 'Sunset', bg: 'linear-gradient(135deg, #f12711, #f5af19)' },
      { name: 'Lavender', bg: 'linear-gradient(135deg, #834d9b, #d04ed6)' },
      { name: 'Mint', bg: 'linear-gradient(135deg, #00b09b, #96c93d)' },
      { name: 'Dark Blue', bg: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' }
    ],
    'hub-11': [
      { name: 'Default', bg: 'default' },
      { name: 'Ocean', bg: 'ocean' },
      { name: 'Forest', bg: 'forest' },
      { name: 'Sunset', bg: 'sunset' },
      { name: 'Midnight', bg: 'midnight' },
      { name: 'Rose', bg: 'rose' },
      { name: 'Sky', bg: 'sky' },
      { name: 'Cream', bg: 'cream' },
      { name: 'Mint', bg: 'mint' },
      { name: 'Lavender', bg: 'lavender' },
      { name: 'Peach', bg: 'peach' }
    ],
    'trivia-5': [
      { name: 'Default', bg: '' },
      { name: 'Dark', bg: 'theme-dark' },
      { name: 'Pastel', bg: 'theme-pastel' },
      { name: 'Neon', bg: 'theme-neon' },
      { name: 'High Contrast', bg: 'theme-high-contrast' }
    ]
  };

  function NarbeThemeProvider(opts) {
    opts = opts || {};
    this._themes = opts.themes || CATALOGS[opts.catalog] || CATALOGS['standard-8'];
    this._index = opts.initialIndex || 0;
    this._applyFn = opts.applyFn || function() {};

    if (this._index < 0 || this._index >= this._themes.length) {
      this._index = 0;
    }

    this.apply();
  }

  NarbeThemeProvider.prototype.cycle = function(direction) {
    var len = this._themes.length;
    this._index = ((this._index + direction) % len + len) % len;
    this.apply();
  };

  NarbeThemeProvider.prototype.setIndex = function(i) {
    if (i >= 0 && i < this._themes.length) {
      this._index = i;
      this.apply();
    }
  };

  NarbeThemeProvider.prototype.getIndex = function() {
    return this._index;
  };

  NarbeThemeProvider.prototype.getCurrent = function() {
    return this._themes[this._index];
  };

  NarbeThemeProvider.prototype.getThemes = function() {
    return this._themes;
  };

  NarbeThemeProvider.prototype.apply = function() {
    this._applyFn(this._themes[this._index]);
  };

  return NarbeThemeProvider;
})();
