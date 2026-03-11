/**
 * NarbeThemeProvider - Shared theme management
 * Centralizes theme definitions and application.
 * Each app passes its current theme array as configuration.
 */
window.NarbeThemeProvider = (function() {
  'use strict';

  // Built-in catalogs
  var catalogs = {
    'standard-8': [
      { name: 'Default', bg: 'linear-gradient(135deg, #667eea, #764ba2)' },
      { name: 'Ocean', bg: 'linear-gradient(135deg, #2193b0, #6dd5ed)' },
      { name: 'Midnight', bg: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
      { name: 'Forest', bg: 'linear-gradient(135deg, #134e5e, #71b280)' },
      { name: 'Sunset', bg: 'linear-gradient(135deg, #ff4b1f, #ff9068)' },
      { name: 'Lavender', bg: 'linear-gradient(135deg, #c471f5, #fa71cd)' },
      { name: 'Mint', bg: 'linear-gradient(135deg, #11998e, #38ef7d)' },
      { name: 'Dark Blue', bg: 'linear-gradient(135deg, #0d253f, #1a3a5c)' }
    ],
    'hub-11': [
      { name: 'Default', bg: 'linear-gradient(135deg, #667eea, #764ba2)' },
      { name: 'Ocean', bg: 'linear-gradient(135deg, #2193b0, #6dd5ed)' },
      { name: 'Forest', bg: 'linear-gradient(135deg, #134e5e, #71b280)' },
      { name: 'Sunset', bg: 'linear-gradient(135deg, #ff4b1f, #ff9068)' },
      { name: 'Midnight', bg: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
      { name: 'Rose', bg: 'linear-gradient(135deg, #ee9ca7, #ffdde1)' },
      { name: 'Sky', bg: 'linear-gradient(135deg, #56ccf2, #2f80ed)' },
      { name: 'Cream', bg: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)' },
      { name: 'Mint', bg: 'linear-gradient(135deg, #11998e, #38ef7d)' },
      { name: 'Lavender', bg: 'linear-gradient(135deg, #c471f5, #fa71cd)' },
      { name: 'Peach', bg: 'linear-gradient(135deg, #ffecd2, #fcb69f)' }
    ],
    'trivia-5': [
      { name: 'Default', bg: '#1a1a2e' },
      { name: 'Dark', bg: '#0a0a0a' },
      { name: 'Pastel', bg: 'linear-gradient(135deg, #ffecd2, #fcb69f)' },
      { name: 'Neon', bg: 'linear-gradient(135deg, #0f0f23, #1a0a2e)' },
      { name: 'High Contrast', bg: '#000000' }
    ]
  };

  function NarbeThemeProvider(config) {
    if (config.catalog && catalogs[config.catalog]) {
      this._themes = catalogs[config.catalog].slice();
    } else if (config.themes) {
      this._themes = config.themes.slice();
    } else {
      this._themes = catalogs['standard-8'].slice();
    }

    this._index = config.initialIndex || 0;
    this._applyFn = config.applyFn || function() {};

    // Apply initial theme
    this.apply();
  }

  NarbeThemeProvider.prototype.cycle = function(direction) {
    direction = direction || 1;
    this._index = (this._index + direction + this._themes.length) % this._themes.length;
    this.apply();
    return this._index;
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
