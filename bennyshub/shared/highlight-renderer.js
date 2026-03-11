/**
 * NarbeHighlightRenderer — Shared scan highlight styling for NARBE DOM apps.
 * Applies and clears scan highlight styling on DOM elements.
 * IIFE on window (no ES modules).
 */
(function () {
    'use strict';

    function NarbeHighlightRenderer(opts) {
        opts = opts || {};
        this._colors = opts.colors || ['Theme Default', 'Yellow', 'White', 'Cyan'];
        this._defaultColor = opts.defaultColor || '#ffcc00';
        this._colorIndex = opts.initialColorIndex || 0;
        this._style = opts.initialStyle || 'outline';
        this._highlighted = null;
    }

    NarbeHighlightRenderer.prototype.apply = function (element) {
        this.clear();
        if (!element) return;

        var color = this.getColor();
        if (this._style === 'full') {
            element.classList.add('narbe-highlight-full');
            element.style.backgroundColor = color;
            element.style.borderColor = 'white';
        } else {
            element.classList.add('narbe-highlight');
            element.style.borderColor = color;
        }
        this._highlighted = element;
    };

    NarbeHighlightRenderer.prototype.clear = function () {
        if (this._highlighted) {
            this._highlighted.classList.remove('narbe-highlight', 'narbe-highlight-full');
            this._highlighted.style.borderColor = '';
            this._highlighted.style.backgroundColor = '';
            this._highlighted = null;
        }
    };

    NarbeHighlightRenderer.prototype.cycleColor = function (direction) {
        this._colorIndex = (this._colorIndex + direction + this._colors.length) % this._colors.length;
    };

    NarbeHighlightRenderer.prototype.setColorIndex = function (i) { this._colorIndex = i; };

    NarbeHighlightRenderer.prototype.getColorIndex = function () { return this._colorIndex; };

    NarbeHighlightRenderer.prototype.getColorName = function () {
        return this._colors[this._colorIndex] || 'Theme Default';
    };

    NarbeHighlightRenderer.prototype.toggleStyle = function () {
        this._style = (this._style === 'outline') ? 'full' : 'outline';
    };

    NarbeHighlightRenderer.prototype.getStyle = function () { return this._style; };

    NarbeHighlightRenderer.prototype.getColor = function () {
        var name = this._colors[this._colorIndex];
        if (!name || name === 'Theme Default') return this._defaultColor;

        // Map common color names to CSS values
        var colorMap = {
            'Yellow': '#ffcc00', 'White': '#ffffff', 'Cyan': '#00ffff',
            'Red': '#ff0000', 'Green': '#00ff00', 'Blue': '#0000ff',
            'Magenta': '#ff00ff', 'Orange': '#ff8800', 'Pink': '#ff69b4',
            'Lime': '#00ff00', 'Purple': '#9900ff', 'Black': '#000000',
            'Teal': '#008080'
        };
        return colorMap[name] || name;
    };

    window.NarbeHighlightRenderer = NarbeHighlightRenderer;
})();
