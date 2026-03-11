/**
 * Shared Highlight Renderer for Narbehouse Accessibility Hub
 * Applies and clears scan highlight styling on DOM elements.
 */

(function() {
  'use strict';

  var COLOR_MAP = {
    'yellow': 'yellow', 'white': 'white', 'cyan': 'cyan', 'red': 'red',
    'green': 'green', 'blue': 'blue', 'orange': 'orange', 'purple': 'purple',
    'pink': 'pink', 'black': 'black', 'lime': 'lime', 'magenta': 'magenta',
    'teal': 'teal', 'gold': 'gold', 'violet': 'violet', 'gray': 'gray',
    'deepskyblue': 'deepskyblue', 'springgreen': 'springgreen'
  };

  function NarbeHighlightRenderer(opts) {
    this._colors = opts.colors || ['Theme Default'];
    this._defaultColor = opts.defaultColor || '#ffcc00';
    this._colorIndex = opts.initialColorIndex || 0;
    this._style = opts.initialStyle || 'outline';
    this._highlighted = null;
  }

  NarbeHighlightRenderer.prototype.getColor = function() {
    var name = this._colors[this._colorIndex];
    if (name === 'Theme Default') return this._defaultColor;
    var lower = name.toLowerCase();
    if (COLOR_MAP[lower]) return COLOR_MAP[lower];
    return name; // hex or other CSS value pass-through
  };

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
    this._colorIndex = (this._colorIndex + direction + this._colors.length) % this._colors.length;
  };

  NarbeHighlightRenderer.prototype.setColorIndex = function(i) { this._colorIndex = i; };
  NarbeHighlightRenderer.prototype.getColorIndex = function() { return this._colorIndex; };
  NarbeHighlightRenderer.prototype.getColorName = function() { return this._colors[this._colorIndex]; };

  NarbeHighlightRenderer.prototype.toggleStyle = function() {
    this._style = this._style === 'outline' ? 'full' : 'outline';
  };

  NarbeHighlightRenderer.prototype.getStyle = function() { return this._style; };

  window.NarbeHighlightRenderer = NarbeHighlightRenderer;
})();
