/**
 * NarbeScanEngine - Linear and Row-Column Scan Traversal
 *
 * Owns scan index state, forward/backward traversal, auto-scan interval,
 * and skip logic. Apps provide a "scannable" configuration; the engine
 * manages traversal.
 *
 * Two scan types:
 *   NarbeLinearScan  - single index walks a flat array
 *   NarbeRowColumnScan - two-phase (scan rows, then cells within row)
 */

(function() {
  'use strict';

  // =========================================================================
  // NarbeLinearScan
  // =========================================================================

  /**
   * @param {Object} scannable
   * @param {Function} scannable.getItems        - returns current scannable items array
   * @param {Function} scannable.onFocus          - called when scan lands on an item (item, index)
   * @param {Function} scannable.onSelect         - called on Enter short-press (item, index)
   * @param {Function} [scannable.onSelectPrev]   - called on Enter long-press (item, index)
   * @param {Function} [scannable.skip]           - return true to skip this item (item, index)
   */
  function NarbeLinearScan(scannable) {
    this._scannable = scannable;
    this._index = 0;
    this._autoScanTimer = null;
    this._suppressAutoScan = false;
  }

  NarbeLinearScan.prototype.forward = function() {
    var items = this._scannable.getItems();
    if (!items || items.length === 0) return;

    var startIndex = this._index;
    var len = items.length;
    var attempts = 0;

    do {
      this._index = (this._index + 1) % len;
      attempts++;
    } while (
      this._scannable.skip &&
      this._scannable.skip(items[this._index], this._index) &&
      attempts < len
    );

    if (this._scannable.onFocus) {
      this._scannable.onFocus(items[this._index], this._index);
    }
  };

  NarbeLinearScan.prototype.backward = function() {
    var items = this._scannable.getItems();
    if (!items || items.length === 0) return;

    var len = items.length;
    var attempts = 0;

    do {
      this._index = (this._index - 1 + len) % len;
      attempts++;
    } while (
      this._scannable.skip &&
      this._scannable.skip(items[this._index], this._index) &&
      attempts < len
    );

    if (this._scannable.onFocus) {
      this._scannable.onFocus(items[this._index], this._index);
    }
  };

  NarbeLinearScan.prototype.select = function() {
    var items = this._scannable.getItems();
    if (!items || items.length === 0) return;
    if (this._scannable.onSelect) {
      this._scannable.onSelect(items[this._index], this._index);
    }
  };

  NarbeLinearScan.prototype.selectPrev = function() {
    var items = this._scannable.getItems();
    if (!items || items.length === 0) return;
    if (this._scannable.onSelectPrev) {
      this._scannable.onSelectPrev(items[this._index], this._index);
    }
  };

  NarbeLinearScan.prototype.getIndex = function() {
    return this._index;
  };

  NarbeLinearScan.prototype.setIndex = function(i) {
    this._index = i;
  };

  NarbeLinearScan.prototype.reset = function() {
    this._index = 0;
  };

  NarbeLinearScan.prototype.startAutoScan = function() {
    this.stopAutoScan();
    if (window.NarbeScanManager && !window.NarbeScanManager.getSettings().autoScan) return;
    var speed = window.NarbeScanManager ? window.NarbeScanManager.getScanInterval() : 2000;
    var self = this;
    this._autoScanTimer = setInterval(function() {
      if (!self._suppressAutoScan) self.forward();
    }, speed);
  };

  NarbeLinearScan.prototype.stopAutoScan = function() {
    if (this._autoScanTimer) {
      clearInterval(this._autoScanTimer);
      this._autoScanTimer = null;
    }
  };

  NarbeLinearScan.prototype.resetAutoScan = function() {
    this.stopAutoScan();
    this.startAutoScan();
  };

  NarbeLinearScan.prototype.setScannable = function(newScannable) {
    this._scannable = newScannable;
  };

  NarbeLinearScan.prototype.destroy = function() {
    this.stopAutoScan();
  };

  // =========================================================================
  // NarbeRowColumnScan
  // =========================================================================

  /**
   * @param {Object} opts
   * @param {Function} opts.getRows              - returns array of row arrays
   * @param {Function} opts.onRowFocus            - highlight entire row (rowIndex)
   * @param {Function} opts.onCellFocus           - highlight single cell (rowIndex, colIndex, item)
   * @param {Function} opts.onSelect              - activate cell (rowIndex, colIndex, item)
   * @param {Function} [opts.onSelectPrev]        - reverse action (rowIndex, colIndex, item)
   * @param {Function} [opts.skipRow]             - return true to skip row (rowIndex)
   * @param {Function} [opts.skipCell]            - return true to skip cell (rowIndex, colIndex, item)
   */
  function NarbeRowColumnScan(opts) {
    opts = opts || {};
    this._getRows = opts.getRows;
    this._onRowFocus = opts.onRowFocus;
    this._onCellFocus = opts.onCellFocus;
    this._onSelect = opts.onSelect;
    this._onSelectPrev = opts.onSelectPrev || null;
    this._skipRow = opts.skipRow || null;
    this._skipCell = opts.skipCell || null;

    this._rowIndex = 0;
    this._colIndex = 0;
    this._inCellMode = false;
    this._autoScanTimer = null;
    this._suppressAutoScan = false;
  }

  NarbeRowColumnScan.prototype.forward = function() {
    var rows = this._getRows();
    if (!rows || rows.length === 0) return;

    if (this._inCellMode) {
      var row = rows[this._rowIndex];
      if (!row || row.length === 0) return;
      var attempts = 0;
      do {
        this._colIndex = (this._colIndex + 1) % row.length;
        attempts++;
      } while (
        this._skipCell &&
        this._skipCell(this._rowIndex, this._colIndex, row[this._colIndex]) &&
        attempts < row.length
      );
      if (this._onCellFocus) {
        this._onCellFocus(this._rowIndex, this._colIndex, row[this._colIndex]);
      }
    } else {
      var attempts = 0;
      do {
        this._rowIndex = (this._rowIndex + 1) % rows.length;
        attempts++;
      } while (
        this._skipRow &&
        this._skipRow(this._rowIndex) &&
        attempts < rows.length
      );
      if (this._onRowFocus) {
        this._onRowFocus(this._rowIndex);
      }
    }
  };

  NarbeRowColumnScan.prototype.backward = function() {
    var rows = this._getRows();
    if (!rows || rows.length === 0) return;

    if (this._inCellMode) {
      var row = rows[this._rowIndex];
      if (!row || row.length === 0) return;
      var attempts = 0;
      do {
        this._colIndex = (this._colIndex - 1 + row.length) % row.length;
        attempts++;
      } while (
        this._skipCell &&
        this._skipCell(this._rowIndex, this._colIndex, row[this._colIndex]) &&
        attempts < row.length
      );
      if (this._onCellFocus) {
        this._onCellFocus(this._rowIndex, this._colIndex, row[this._colIndex]);
      }
    } else {
      var attempts = 0;
      do {
        this._rowIndex = (this._rowIndex - 1 + rows.length) % rows.length;
        attempts++;
      } while (
        this._skipRow &&
        this._skipRow(this._rowIndex) &&
        attempts < rows.length
      );
      if (this._onRowFocus) {
        this._onRowFocus(this._rowIndex);
      }
    }
  };

  NarbeRowColumnScan.prototype.select = function() {
    var rows = this._getRows();
    if (!rows || rows.length === 0) return;

    if (this._inCellMode) {
      var row = rows[this._rowIndex];
      if (row && this._onSelect) {
        this._onSelect(this._rowIndex, this._colIndex, row[this._colIndex]);
      }
    } else {
      // Enter cell mode
      this._inCellMode = true;
      this._colIndex = 0;
      var row = rows[this._rowIndex];
      if (row && this._onCellFocus) {
        this._onCellFocus(this._rowIndex, this._colIndex, row[this._colIndex]);
      }
    }
  };

  NarbeRowColumnScan.prototype.selectPrev = function() {
    var rows = this._getRows();
    if (!rows || rows.length === 0) return;

    if (this._inCellMode) {
      // Exit cell mode back to row mode
      this._inCellMode = false;
      if (this._onRowFocus) {
        this._onRowFocus(this._rowIndex);
      }
    } else {
      if (this._onSelectPrev) {
        var row = rows[this._rowIndex];
        this._onSelectPrev(this._rowIndex, this._colIndex, row ? row[this._colIndex] : null);
      }
    }
  };

  NarbeRowColumnScan.prototype.isInRowMode = function() {
    return !this._inCellMode;
  };

  NarbeRowColumnScan.prototype.exitCellMode = function() {
    this._inCellMode = false;
  };

  NarbeRowColumnScan.prototype.startAutoScan = function() {
    this.stopAutoScan();
    if (window.NarbeScanManager && !window.NarbeScanManager.getSettings().autoScan) return;
    var speed = window.NarbeScanManager ? window.NarbeScanManager.getScanInterval() : 2000;
    var self = this;
    this._autoScanTimer = setInterval(function() {
      if (!self._suppressAutoScan) self.forward();
    }, speed);
  };

  NarbeRowColumnScan.prototype.stopAutoScan = function() {
    if (this._autoScanTimer) {
      clearInterval(this._autoScanTimer);
      this._autoScanTimer = null;
    }
  };

  NarbeRowColumnScan.prototype.resetAutoScan = function() {
    this.stopAutoScan();
    this.startAutoScan();
  };

  NarbeRowColumnScan.prototype.destroy = function() {
    this.stopAutoScan();
  };

  // Expose as globals
  window.NarbeLinearScan = NarbeLinearScan;
  window.NarbeRowColumnScan = NarbeRowColumnScan;
})();
