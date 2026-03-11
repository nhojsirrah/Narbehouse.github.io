/**
 * NarbeThemeProvider — Shared theme management for NARBE apps.
 * Centralizes theme definitions and application.
 * IIFE on window (no ES modules).
 */
(function () {
    'use strict';

    var catalogs = {
        'standard-8': [
            { name: 'Default', bg: 'linear-gradient(135deg, #ff4b1f, #ff9068)' },
            { name: 'Ocean', bg: 'linear-gradient(135deg, #2193b0, #6dd5ed)' },
            { name: 'Midnight', bg: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
            { name: 'Forest', bg: 'linear-gradient(135deg, #134e5e, #71b280)' },
            { name: 'Sunset', bg: 'linear-gradient(135deg, #f12711, #f5af19)' },
            { name: 'Lavender', bg: 'linear-gradient(135deg, #c471f5, #fa71cd)' },
            { name: 'Mint', bg: 'linear-gradient(135deg, #11998e, #38ef7d)' },
            { name: 'Dark Blue', bg: 'linear-gradient(135deg, #0f2027, #203a43, #2c5364)' }
        ],
        'hub-11': [
            { name: 'Default', bg: 'linear-gradient(135deg, #ff4b1f, #ff9068)' },
            { name: 'Ocean', bg: 'linear-gradient(135deg, #2193b0, #6dd5ed)' },
            { name: 'Forest', bg: 'linear-gradient(135deg, #134e5e, #71b280)' },
            { name: 'Sunset', bg: 'linear-gradient(135deg, #f12711, #f5af19)' },
            { name: 'Midnight', bg: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)' },
            { name: 'Rose', bg: 'linear-gradient(135deg, #e8cbc0, #636fa4)' },
            { name: 'Sky', bg: 'linear-gradient(135deg, #2980b9, #6dd5fa, #ffffff)' },
            { name: 'Cream', bg: 'linear-gradient(135deg, #e2d1c3, #fdfcfb)' },
            { name: 'Mint', bg: 'linear-gradient(135deg, #11998e, #38ef7d)' },
            { name: 'Lavender', bg: 'linear-gradient(135deg, #c471f5, #fa71cd)' },
            { name: 'Peach', bg: 'linear-gradient(135deg, #ffecd2, #fcb69f)' }
        ],
        'trivia-5': [
            { name: 'Default', bg: 'linear-gradient(135deg, #667eea, #764ba2)' },
            { name: 'Dark', bg: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)' },
            { name: 'Pastel', bg: 'linear-gradient(135deg, #a8edea, #fed6e3)' },
            { name: 'Neon', bg: 'linear-gradient(135deg, #00f260, #0575e6)' },
            { name: 'High Contrast', bg: 'linear-gradient(135deg, #000000, #434343)' }
        ]
    };

    function NarbeThemeProvider(opts) {
        opts = opts || {};

        if (opts.catalog && catalogs[opts.catalog]) {
            this._themes = catalogs[opts.catalog];
        } else {
            this._themes = opts.themes || catalogs['standard-8'];
        }

        this._index = opts.initialIndex || 0;
        this._applyFn = opts.applyFn || function (theme) {
            document.body.style.background = theme.bg;
        };
    }

    NarbeThemeProvider.prototype.cycle = function (direction) {
        this._index = (this._index + direction + this._themes.length) % this._themes.length;
        this.apply();
    };

    NarbeThemeProvider.prototype.setIndex = function (i) {
        this._index = i;
        this.apply();
    };

    NarbeThemeProvider.prototype.getIndex = function () { return this._index; };

    NarbeThemeProvider.prototype.getCurrent = function () { return this._themes[this._index]; };

    NarbeThemeProvider.prototype.getThemes = function () { return this._themes; };

    NarbeThemeProvider.prototype.apply = function () {
        if (this._applyFn && this._themes[this._index]) {
            this._applyFn(this._themes[this._index]);
        }
    };

    window.NarbeThemeProvider = NarbeThemeProvider;
})();
