/**
 * NarbeHighlightRenderer - Scan Highlight Styling for DOM Elements
 *
 * Applies and clears scan highlight styling (outline or full background)
 * on DOM elements. Replaces the duplicated updateHighlights() function
 * in every DOM-based app (~20-50 lines each).
 */

(function() {
  'use strict';

  /** Color name -> CSS value map for resolution. */
  var COLOR_MAP = {
    'Yellow':    '#ffff00',
    'White':     '#ffffff',
    'Cyan':      '#00ffff',
    'Lime':      '#00ff00',
    'Magenta':   '#ff00ff',
    'Orange':    '#ffa500',
    'Blue':      '#3366ff',
    'Red':       '#ff0000',
    'Pink':      '#ffc0cb',
    'Purple':    '#cc33ff',
    'Green':     '#00ff00',
    'Black':     '#000000'
  };

  /**
   * @param {Object} opts
   * @param {Array}  opts.colors            - array of color objects { name, val }
   * @param {string} [opts.defaultColor='#ffcc00'] - fallback when 'Theme Default' selected
   * @param {number} [opts.initialColorIndex=0]
   * @param {string} [opts.initialStyle='outline'] - 'outline' or 'full'
   */
  function NarbeHighlightRenderer(opts) {
    opts = opts || {};
    this._colors = opts.colors || [{ name: 'Theme Default', val: 'var(--theme-highlight)' }];
    this._defaultColor = opts.defaultColor || '#ffcc00';
    this._colorIndex = opts.initialColorIndex || 0;
    this._style = opts.initialStyle || 'outline';
    this._highlighted = null;
  }

  /**
   * Apply highlight to a DOM element using current color + style.
   * Clears any previous highlight first.
   */
  NarbeHighlightRenderer.prototype.apply = function(element) {
    this.clear();
    if (!element) return;

    element.classList.add('highlight');
    this._highlighted = element;
  };

  /**
   * Clear highlight from the previously highlighted element.
   */
  NarbeHighlightRenderer.prototype.clear = function() {
    if (this._highlighted) {
      this._highlighted.classList.remove('highlight');
      this._highlighted = null;
    }
  };

  /** Cycle highlight color by direction (+1 or -1). */
  NarbeHighlightRenderer.prototype.cycleColor = function(direction) {
    direction = direction || 1;
    this._colorIndex = (this._colorIndex + direction + this._colors.length) % this._colors.length;
  };

  NarbeHighlightRenderer.prototype.setColorIndex = function(i) {
    this._colorIndex = i;
  };

  NarbeHighlightRenderer.prototype.getColorIndex = function() {
    return this._colorIndex;
  };

  /** Get the display name of the current highlight color. */
  NarbeHighlightRenderer.prototype.getColorName = function() {
    return this._colors[this._colorIndex].name;
  };

  /** Get the current color object { name, val }. */
  NarbeHighlightRenderer.prototype.getColorObj = function() {
    return this._colors[this._colorIndex];
  };

  /** Toggle between 'outline' and 'full' highlight styles. */
  NarbeHighlightRenderer.prototype.toggleStyle = function() {
    this._style = this._style === 'outline' ? 'full' : 'outline';
  };

  NarbeHighlightRenderer.prototype.getStyle = function() {
    return this._style;
  };

  NarbeHighlightRenderer.prototype.setStyle = function(style) {
    this._style = style;
  };

  /**
   * Get the resolved CSS color string for the current selection.
   * If 'Theme Default' is selected, returns the defaultColor.
   */
  NarbeHighlightRenderer.prototype.getColor = function() {
    var c = this._colors[this._colorIndex];
    if (!c) return this._defaultColor;
    if (c.val === 'var(--theme-highlight)') return this._defaultColor;
    return c.val;
  };

  /** Get all color options. */
  NarbeHighlightRenderer.prototype.getColors = function() {
    return this._colors;
  };

  window.NarbeHighlightRenderer = NarbeHighlightRenderer;
})();
