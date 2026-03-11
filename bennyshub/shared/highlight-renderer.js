/**
 * NarbeHighlightRenderer — Shared Module 5
 * Applies and clears scan highlight styling on DOM elements.
 */
(function() {
    'use strict';

    function NarbeHighlightRenderer(config) {
        this._colors = config.colors || ['Theme Default'];
        this._defaultColor = config.defaultColor || '#ffcc00';
        this._colorIndex = config.initialColorIndex || 0;
        this._style = config.initialStyle || 'outline';
        this._highlighted = null;
    }

    NarbeHighlightRenderer.prototype.apply = function(element) {
        this.clear();
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

    NarbeHighlightRenderer.prototype.clear = function() {
        if (this._highlighted) {
            this._highlighted.classList.remove('narbe-highlight', 'narbe-highlight-full');
            this._highlighted.style.borderColor = '';
            this._highlighted.style.backgroundColor = '';
            this._highlighted = null;
        }
    };

    NarbeHighlightRenderer.prototype.cycleColor = function(direction) {
        direction = direction || 1;
        this._colorIndex = (this._colorIndex + direction + this._colors.length) % this._colors.length;
        return this._colors[this._colorIndex];
    };

    NarbeHighlightRenderer.prototype.setColorIndex = function(i) {
        this._colorIndex = i;
    };

    NarbeHighlightRenderer.prototype.getColorIndex = function() {
        return this._colorIndex;
    };

    NarbeHighlightRenderer.prototype.getColorName = function() {
        return this._colors[this._colorIndex];
    };

    NarbeHighlightRenderer.prototype.toggleStyle = function() {
        this._style = (this._style === 'outline') ? 'full' : 'outline';
        return this._style;
    };

    NarbeHighlightRenderer.prototype.getStyle = function() {
        return this._style;
    };

    NarbeHighlightRenderer.prototype.getColor = function() {
        var name = this._colors[this._colorIndex];
        if (!name || name === 'Theme Default') return this._defaultColor;

        // Map common color names to CSS values
        var colorMap = {
            'Yellow': '#ffcc00',
            'White': '#ffffff',
            'Cyan': '#00ffff',
            'Magenta': '#ff00ff',
            'Red': '#ff0000',
            'Green': '#00ff00',
            'Blue': '#0000ff',
            'Orange': '#ff8800',
            'Pink': '#ff69b4',
            'Purple': '#9900ff',
            'Lime': '#00ff44',
            'Gold': '#ffd700',
            'Black': '#000000'
        };

        return colorMap[name] || name;
    };

    window.NarbeHighlightRenderer = NarbeHighlightRenderer;
})();
