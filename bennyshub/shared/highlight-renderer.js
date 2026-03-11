/**
 * NarbeHighlightRenderer - Shared highlight management for DOM-based apps
 * Applies and clears scan highlight styling on DOM elements.
 */
window.NarbeHighlightRenderer = (function() {
  'use strict';

  function NarbeHighlightRenderer(config) {
    this._colors = config.colors || ['Yellow'];
    this._defaultColor = config.defaultColor || '#ffcc00';
    this._colorIndex = config.initialColorIndex || 0;
    this._style = config.initialStyle || 'outline';
    this._highlighted = [];

    // Optional: custom apply/clear functions for apps with non-standard highlight behavior
    this._customApply = config.customApply || null;
    this._customClear = config.customClear || null;
  }

  NarbeHighlightRenderer.prototype.apply = function(element) {
    if (this._customApply) {
      this._customApply(element, this.getColor(), this._style);
      if (this._highlighted.indexOf(element) === -1) {
        this._highlighted.push(element);
      }
      return;
    }

    var color = this.getColor();
    if (this._style === 'full') {
      element.classList.add('narbe-highlight-full');
      element.style.backgroundColor = color;
      element.style.borderColor = 'white';
    } else {
      element.classList.add('narbe-highlight');
      element.style.borderColor = color;
    }
    if (this._highlighted.indexOf(element) === -1) {
      this._highlighted.push(element);
    }
  };

  NarbeHighlightRenderer.prototype.clear = function() {
    if (this._customClear) {
      this._customClear(this._highlighted);
      this._highlighted = [];
      return;
    }

    for (var i = 0; i < this._highlighted.length; i++) {
      var el = this._highlighted[i];
      el.classList.remove('narbe-highlight', 'narbe-highlight-full');
      el.style.borderColor = '';
      el.style.backgroundColor = '';
    }
    this._highlighted = [];
  };

  NarbeHighlightRenderer.prototype.cycleColor = function(direction) {
    direction = direction || 1;
    this._colorIndex = (this._colorIndex + direction + this._colors.length) % this._colors.length;
    return this._colorIndex;
  };

  NarbeHighlightRenderer.prototype.setColorIndex = function(i) {
    if (i >= 0 && i < this._colors.length) {
      this._colorIndex = i;
    }
  };

  NarbeHighlightRenderer.prototype.getColorIndex = function() {
    return this._colorIndex;
  };

  NarbeHighlightRenderer.prototype.getColorName = function() {
    return this._colors[this._colorIndex];
  };

  NarbeHighlightRenderer.prototype.toggleStyle = function() {
    this._style = this._style === 'outline' ? 'full' : 'outline';
    return this._style;
  };

  NarbeHighlightRenderer.prototype.getStyle = function() {
    return this._style;
  };

  NarbeHighlightRenderer.prototype.getColor = function() {
    var colorName = this._colors[this._colorIndex];
    if (colorName === 'Theme Default') return this._defaultColor;
    return colorName;
  };

  return NarbeHighlightRenderer;
})();
