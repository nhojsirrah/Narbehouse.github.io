/**
 * NarbeThemeProvider — Shared Module 4
 * Centralizes theme definitions and application.
 */
(function() {
    'use strict';

    // Built-in catalogs
    var CATALOGS = {
        'standard-8': [
            { name: 'Default', bg: 'linear-gradient(135deg, #ff4b1f, #ff9068)' },
            { name: 'Ocean', bg: 'linear-gradient(135deg, #2193b0, #6dd5ed)' },
            { name: 'Midnight', bg: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
            { name: 'Forest', bg: 'linear-gradient(135deg, #134e5e, #71b280)' },
            { name: 'Sunset', bg: 'linear-gradient(135deg, #f12711, #f5af19)' },
            { name: 'Lavender', bg: 'linear-gradient(135deg, #c471f5, #fa71cd)' },
            { name: 'Mint', bg: 'linear-gradient(135deg, #0ba360, #3cba92)' },
            { name: 'Dark Blue', bg: 'linear-gradient(135deg, #1a2980, #26d0ce)' }
        ],
        'hub-11': [
            { name: 'Default', bg: 'linear-gradient(135deg, #ff4b1f, #ff9068)' },
            { name: 'Ocean', bg: 'linear-gradient(135deg, #2193b0, #6dd5ed)' },
            { name: 'Forest', bg: 'linear-gradient(135deg, #134e5e, #71b280)' },
            { name: 'Sunset', bg: 'linear-gradient(135deg, #f12711, #f5af19)' },
            { name: 'Midnight', bg: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
            { name: 'Rose', bg: 'linear-gradient(135deg, #ee9ca7, #ffdde1)' },
            { name: 'Sky', bg: 'linear-gradient(135deg, #56ccf2, #2f80ed)' },
            { name: 'Cream', bg: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)' },
            { name: 'Mint', bg: 'linear-gradient(135deg, #0ba360, #3cba92)' },
            { name: 'Lavender', bg: 'linear-gradient(135deg, #c471f5, #fa71cd)' },
            { name: 'Peach', bg: 'linear-gradient(135deg, #ffecd2, #fcb69f)' }
        ],
        'trivia-5': [
            { name: 'Default', className: '' },
            { name: 'Dark', className: 'theme-dark' },
            { name: 'Pastel', className: 'theme-pastel' },
            { name: 'Neon', className: 'theme-neon' },
            { name: 'High Contrast', className: 'theme-high-contrast' }
        ]
    };

    function NarbeThemeProvider(config) {
        if (config.catalog && CATALOGS[config.catalog]) {
            this._themes = CATALOGS[config.catalog];
        } else if (config.themes) {
            this._themes = config.themes;
        } else {
            this._themes = CATALOGS['standard-8'];
        }

        this._index = config.initialIndex || 0;
        this._applyFn = config.applyFn || function() {};
    }

    NarbeThemeProvider.prototype.cycle = function(direction) {
        direction = direction || 1;
        this._index = (this._index + direction + this._themes.length) % this._themes.length;
        this._applyFn(this._themes[this._index]);
        return this._themes[this._index];
    };

    NarbeThemeProvider.prototype.setIndex = function(i) {
        this._index = i;
        this._applyFn(this._themes[this._index]);
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

    window.NarbeThemeProvider = NarbeThemeProvider;
})();
