/**
 * NarbeLinearScan & NarbeRowColumnScan - Shared scan engine
 * Owns scan index state, forward/backward traversal, auto-scan interval, and skip logic.
 */
(function() {
  'use strict';

  // ---- NarbeLinearScan ----

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
    var attempts = 0;
    do {
      this._index = (this._index + 1) % items.length;
      attempts++;
    } while (this._scannable.skip && this._scannable.skip(items[this._index], this._index) && attempts < items.length);
    this._scannable.onFocus(items[this._index], this._index);
  };

  NarbeLinearScan.prototype.backward = function() {
    var items = this._scannable.getItems();
    if (!items || items.length === 0) return;
    var attempts = 0;
    do {
      this._index = (this._index - 1 + items.length) % items.length;
      attempts++;
    } while (this._scannable.skip && this._scannable.skip(items[this._index], this._index) && attempts < items.length);
    this._scannable.onFocus(items[this._index], this._index);
  };

  NarbeLinearScan.prototype.select = function() {
    var items = this._scannable.getItems();
    if (!items || items.length === 0) return;
    this._scannable.onSelect(items[this._index], this._index);
  };

  NarbeLinearScan.prototype.selectPrev = function() {
    var items = this._scannable.getItems();
    if (!items || items.length === 0) return;
    if (this._scannable.onSelectPrev) {
      this._scannable.onSelectPrev(items[this._index], this._index);
    }
  };

  NarbeLinearScan.prototype.getIndex = function() { return this._index; };

  NarbeLinearScan.prototype.setIndex = function(i) {
    this._index = i;
    var items = this._scannable.getItems();
    if (items && items.length > 0 && i >= 0 && i < items.length) {
      this._scannable.onFocus(items[this._index], this._index);
    }
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

  // ---- NarbeRowColumnScan ----

  function NarbeRowColumnScan(config) {
    this._getRows = config.getRows;
    this._onRowFocus = config.onRowFocus;
    this._onCellFocus = config.onCellFocus;
    this._onSelect = config.onSelect;
    this._onSelectPrev = config.onSelectPrev || function() {};
    this._skipRow = config.skipRow || function() { return false; };
    this._skipCell = config.skipCell || function() { return false; };

    this._rowMode = true;
    this._rowIndex = 0;
    this._colIndex = 0;
    this._autoScanTimer = null;
    this._suppressAutoScan = false;
  }

  NarbeRowColumnScan.prototype.forward = function() {
    var rows = this._getRows();
    if (!rows || rows.length === 0) return;

    if (this._rowMode) {
      var attempts = 0;
      do {
        this._rowIndex = (this._rowIndex + 1) % rows.length;
        attempts++;
      } while (this._skipRow(this._rowIndex) && attempts < rows.length);
      this._onRowFocus(this._rowIndex);
    } else {
      var row = rows[this._rowIndex];
      if (!row || row.length === 0) return;
      var attempts = 0;
      do {
        this._colIndex = (this._colIndex + 1) % row.length;
        attempts++;
      } while (this._skipCell(this._rowIndex, this._colIndex, row[this._colIndex]) && attempts < row.length);
      this._onCellFocus(this._rowIndex, this._colIndex, row[this._colIndex]);
    }
  };

  NarbeRowColumnScan.prototype.backward = function() {
    var rows = this._getRows();
    if (!rows || rows.length === 0) return;

    if (this._rowMode) {
      var attempts = 0;
      do {
        this._rowIndex = (this._rowIndex - 1 + rows.length) % rows.length;
        attempts++;
      } while (this._skipRow(this._rowIndex) && attempts < rows.length);
      this._onRowFocus(this._rowIndex);
    } else {
      var row = rows[this._rowIndex];
      if (!row || row.length === 0) return;
      var attempts = 0;
      do {
        this._colIndex = (this._colIndex - 1 + row.length) % row.length;
        attempts++;
      } while (this._skipCell(this._rowIndex, this._colIndex, row[this._colIndex]) && attempts < row.length);
      this._onCellFocus(this._rowIndex, this._colIndex, row[this._colIndex]);
    }
  };

  NarbeRowColumnScan.prototype.select = function() {
    var rows = this._getRows();
    if (!rows || rows.length === 0) return;

    if (this._rowMode) {
      // Enter cell mode
      this._rowMode = false;
      this._colIndex = 0;
      var row = rows[this._rowIndex];
      if (row && row.length > 0) {
        this._onCellFocus(this._rowIndex, this._colIndex, row[this._colIndex]);
      }
    } else {
      var row = rows[this._rowIndex];
      if (row && row.length > 0) {
        this._onSelect(this._rowIndex, this._colIndex, row[this._colIndex]);
      }
    }
  };

  NarbeRowColumnScan.prototype.selectPrev = function() {
    if (!this._rowMode) {
      // Back to row mode
      this._rowMode = true;
      this._onRowFocus(this._rowIndex);
    } else {
      this._onSelectPrev(this._rowIndex);
    }
  };

  NarbeRowColumnScan.prototype.isInRowMode = function() {
    return this._rowMode;
  };

  NarbeRowColumnScan.prototype.exitCellMode = function() {
    this._rowMode = true;
    this._onRowFocus(this._rowIndex);
  };

  NarbeRowColumnScan.prototype.getRowIndex = function() { return this._rowIndex; };
  NarbeRowColumnScan.prototype.getColIndex = function() { return this._colIndex; };

  NarbeRowColumnScan.prototype.setRowIndex = function(i) {
    this._rowIndex = i;
  };

  NarbeRowColumnScan.prototype.setColIndex = function(i) {
    this._colIndex = i;
  };

  NarbeRowColumnScan.prototype.setRowMode = function(isRowMode) {
    this._rowMode = isRowMode;
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

  // Export
  window.NarbeLinearScan = NarbeLinearScan;
  window.NarbeRowColumnScan = NarbeRowColumnScan;
})();
