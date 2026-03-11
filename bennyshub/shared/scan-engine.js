/**
 * Scan Engine for Narbehouse Accessibility Hub
 * Provides linear and row-column scan traversal with auto-scan support.
 * Two classes: NarbeLinearScan and NarbeRowColumnScan
 */

(function() {
  'use strict';

  // ── Auto-Scan Mixin ──────────────────────────────────────────────────
  // Shared auto-scan logic applied to both scan classes.

  function applyAutoScanMixin(proto) {

    proto.startAutoScan = function() {
      this.stopAutoScan();
      var mgr = window.NarbeScanManager;
      if (mgr && !mgr.getSettings().autoScan) return;
      var speed = mgr ? mgr.getScanInterval() : 2000;
      var self = this;
      this._autoScanTimer = setInterval(function() {
        if (!self._suppressAutoScan) self.forward();
      }, speed);
    };

    proto.stopAutoScan = function() {
      if (this._autoScanTimer) {
        clearInterval(this._autoScanTimer);
        this._autoScanTimer = null;
      }
    };

    proto.resetAutoScan = function() {
      if (this._autoScanTimer) {
        this.startAutoScan();
      }
    };

    proto._subscribeToScanManager = function() {
      var self = this;
      this._scanManagerCallback = function() {
        // Re-apply auto-scan with updated speed / toggle
        if (self._autoScanTimer) {
          self.startAutoScan();
        }
      };
      var mgr = window.NarbeScanManager;
      if (mgr && mgr.subscribe) {
        mgr.subscribe(this._scanManagerCallback);
      }
    };

    proto._unsubscribeFromScanManager = function() {
      var mgr = window.NarbeScanManager;
      if (mgr && mgr.unsubscribe && this._scanManagerCallback) {
        mgr.unsubscribe(this._scanManagerCallback);
        this._scanManagerCallback = null;
      }
    };
  }

  // ── Wrap Helper ───────────────────────────────────────────────────────
  // Wraps an index within 0..length-1 (handles negative values).

  function wrap(index, length) {
    return ((index % length) + length) % length;
  }

  // ── NarbeLinearScan ───────────────────────────────────────────────────

  /**
   * @param {Object} scannable
   *   getItems: () => Array
   *   onFocus: (item, index) => void
   *   onSelect: (item, index) => void
   *   onSelectPrev: (item, index) => void   (optional)
   *   skip: (item, index) => boolean         (optional)
   */
  function NarbeLinearScan(scannable) {
    this._scannable = scannable;
    this._index = 0;
    this._autoScanTimer = null;
    this._suppressAutoScan = false;
    this._scanManagerCallback = null;
    this._subscribeToScanManager();
  }

  NarbeLinearScan.prototype._advance = function(direction) {
    var items = this._scannable.getItems();
    if (!items || items.length === 0) return;
    var len = items.length;
    var skip = this._scannable.skip;
    var start = this._index;
    var next = wrap(start + direction, len);
    var attempts = 0;
    while (skip && skip(items[next], next) && attempts < len) {
      next = wrap(next + direction, len);
      attempts++;
    }
    this._index = next;
    this._scannable.onFocus(items[this._index], this._index);
  };

  NarbeLinearScan.prototype.forward = function() {
    this._advance(1);
  };

  NarbeLinearScan.prototype.backward = function() {
    this._advance(-1);
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

  NarbeLinearScan.prototype.getIndex = function() {
    return this._index;
  };

  NarbeLinearScan.prototype.setIndex = function(i) {
    this._index = i;
  };

  NarbeLinearScan.prototype.reset = function() {
    this._index = 0;
  };

  NarbeLinearScan.prototype.setScannable = function(newScannable) {
    this._scannable = newScannable;
    this._index = 0;
  };

  NarbeLinearScan.prototype.destroy = function() {
    this.stopAutoScan();
    this._unsubscribeFromScanManager();
  };

  applyAutoScanMixin(NarbeLinearScan.prototype);

  // ── NarbeRowColumnScan ────────────────────────────────────────────────

  /**
   * @param {Object} scannable
   *   getRows: () => Array of Arrays
   *   onRowFocus: (rowIndex) => void
   *   onCellFocus: (rowIndex, colIndex, item) => void
   *   onSelect: (rowIndex, colIndex, item) => void
   *   onSelectPrev: (rowIndex, colIndex, item) => void   (optional)
   *   skipRow: (rowIndex) => boolean                      (optional)
   *   skipCell: (rowIndex, colIndex, item) => boolean     (optional)
   */
  function NarbeRowColumnScan(scannable) {
    this._scannable = scannable;
    this._rowIndex = 0;
    this._colIndex = 0;
    this._inRowMode = true;
    this._autoScanTimer = null;
    this._suppressAutoScan = false;
    this._scanManagerCallback = null;
    this._subscribeToScanManager();
  }

  NarbeRowColumnScan.prototype._advanceRow = function(direction) {
    var rows = this._scannable.getRows();
    if (!rows || rows.length === 0) return;
    var len = rows.length;
    var skip = this._scannable.skipRow;
    var next = wrap(this._rowIndex + direction, len);
    var attempts = 0;
    while (skip && skip(next) && attempts < len) {
      next = wrap(next + direction, len);
      attempts++;
    }
    this._rowIndex = next;
    this._scannable.onRowFocus(this._rowIndex);
  };

  NarbeRowColumnScan.prototype._advanceCell = function(direction) {
    var rows = this._scannable.getRows();
    if (!rows || rows.length === 0) return;
    var row = rows[this._rowIndex];
    if (!row || row.length === 0) return;
    var len = row.length;
    var skip = this._scannable.skipCell;
    var next = wrap(this._colIndex + direction, len);
    var attempts = 0;
    while (skip && skip(this._rowIndex, next, row[next]) && attempts < len) {
      next = wrap(next + direction, len);
      attempts++;
    }
    this._colIndex = next;
    this._scannable.onCellFocus(this._rowIndex, this._colIndex, row[this._colIndex]);
  };

  NarbeRowColumnScan.prototype.forward = function() {
    if (this._inRowMode) {
      this._advanceRow(1);
    } else {
      this._advanceCell(1);
    }
  };

  NarbeRowColumnScan.prototype.backward = function() {
    if (this._inRowMode) {
      this._advanceRow(-1);
    } else {
      this._advanceCell(-1);
    }
  };

  NarbeRowColumnScan.prototype.select = function() {
    var rows = this._scannable.getRows();
    if (!rows || rows.length === 0) return;
    if (this._inRowMode) {
      // Enter cell mode for the current row
      this._inRowMode = false;
      this._colIndex = 0;
      var row = rows[this._rowIndex];
      if (row && row.length > 0) {
        // Skip to first non-skipped cell if skip function exists
        var skip = this._scannable.skipCell;
        if (skip) {
          var attempts = 0;
          while (skip(this._rowIndex, this._colIndex, row[this._colIndex]) && attempts < row.length) {
            this._colIndex = (this._colIndex + 1) % row.length;
            attempts++;
          }
        }
        this._scannable.onCellFocus(this._rowIndex, this._colIndex, row[this._colIndex]);
      }
    } else {
      // Activate the selected cell
      var row = rows[this._rowIndex];
      if (row && row.length > 0) {
        this._scannable.onSelect(this._rowIndex, this._colIndex, row[this._colIndex]);
      }
    }
  };

  NarbeRowColumnScan.prototype.selectPrev = function() {
    if (!this._inRowMode) {
      // Back to row mode
      this.exitCellMode();
    } else if (this._scannable.onSelectPrev) {
      var rows = this._scannable.getRows();
      if (rows && rows.length > 0) {
        var row = rows[this._rowIndex];
        var item = row ? row[this._colIndex] : null;
        this._scannable.onSelectPrev(this._rowIndex, this._colIndex, item);
      }
    }
  };

  NarbeRowColumnScan.prototype.isInRowMode = function() {
    return this._inRowMode;
  };

  NarbeRowColumnScan.prototype.exitCellMode = function() {
    this._inRowMode = true;
    this._colIndex = 0;
    this._scannable.onRowFocus(this._rowIndex);
  };

  NarbeRowColumnScan.prototype.destroy = function() {
    this.stopAutoScan();
    this._unsubscribeFromScanManager();
  };

  applyAutoScanMixin(NarbeRowColumnScan.prototype);

  // ── Export ─────────────────────────────────────────────────────────────

  window.NarbeLinearScan = NarbeLinearScan;
  window.NarbeRowColumnScan = NarbeRowColumnScan;

})();
