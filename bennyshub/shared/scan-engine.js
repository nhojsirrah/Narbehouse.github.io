/**
 * NarbeLinearScan / NarbeRowColumnScan — Shared scan engine for NARBE apps.
 * Manages scan index state, forward/backward traversal, auto-scan.
 * IIFE on window (no ES modules).
 */
(function () {
    'use strict';

    // ────────────────────────────────────────────────────────
    // LinearScan
    // ────────────────────────────────────────────────────────
    function NarbeLinearScan(scannable) {
        this._scannable = scannable;
        this._index = 0;
        this._autoScanTimer = null;
        this._suppressAutoScan = false;
    }

    NarbeLinearScan.prototype.forward = function () {
        var items = this._scannable.getItems();
        if (!items || items.length === 0) return;

        var startIndex = this._index;
        var attempts = 0;
        do {
            this._index = (this._index + 1) % items.length;
            attempts++;
        } while (
            this._scannable.skip &&
            this._scannable.skip(items[this._index], this._index) &&
            attempts < items.length
        );

        if (this._scannable.onFocus) {
            this._scannable.onFocus(items[this._index], this._index);
        }
    };

    NarbeLinearScan.prototype.backward = function () {
        var items = this._scannable.getItems();
        if (!items || items.length === 0) return;

        var attempts = 0;
        do {
            this._index = (this._index - 1 + items.length) % items.length;
            attempts++;
        } while (
            this._scannable.skip &&
            this._scannable.skip(items[this._index], this._index) &&
            attempts < items.length
        );

        if (this._scannable.onFocus) {
            this._scannable.onFocus(items[this._index], this._index);
        }
    };

    NarbeLinearScan.prototype.select = function () {
        var items = this._scannable.getItems();
        if (!items || items.length === 0) return;
        if (this._scannable.onSelect) {
            this._scannable.onSelect(items[this._index], this._index);
        }
    };

    NarbeLinearScan.prototype.selectPrev = function () {
        var items = this._scannable.getItems();
        if (!items || items.length === 0) return;
        if (this._scannable.onSelectPrev) {
            this._scannable.onSelectPrev(items[this._index], this._index);
        }
    };

    NarbeLinearScan.prototype.getIndex = function () { return this._index; };

    NarbeLinearScan.prototype.setIndex = function (i) { this._index = i; };

    NarbeLinearScan.prototype.reset = function () { this._index = 0; };

    NarbeLinearScan.prototype.setScannable = function (scannable) {
        this._scannable = scannable;
    };

    // Auto-scan
    NarbeLinearScan.prototype.startAutoScan = function () {
        this.stopAutoScan();
        if (window.NarbeScanManager && !window.NarbeScanManager.getSettings().autoScan) return;
        var speed = (window.NarbeScanManager) ? window.NarbeScanManager.getScanInterval() : 2000;
        if (!speed || speed < 500) speed = 2000;

        var self = this;
        this._autoScanTimer = setInterval(function () {
            if (!self._suppressAutoScan) self.forward();
        }, speed);
    };

    NarbeLinearScan.prototype.stopAutoScan = function () {
        if (this._autoScanTimer) {
            clearInterval(this._autoScanTimer);
            this._autoScanTimer = null;
        }
    };

    NarbeLinearScan.prototype.resetAutoScan = function () {
        this.stopAutoScan();
        this.startAutoScan();
    };

    NarbeLinearScan.prototype.setSuppressAutoScan = function (val) {
        this._suppressAutoScan = !!val;
    };

    NarbeLinearScan.prototype.destroy = function () {
        this.stopAutoScan();
    };

    // ────────────────────────────────────────────────────────
    // RowColumnScan
    // ────────────────────────────────────────────────────────
    function NarbeRowColumnScan(opts) {
        this._getRows = opts.getRows;
        this._onRowFocus = opts.onRowFocus || function () {};
        this._onCellFocus = opts.onCellFocus || function () {};
        this._onSelect = opts.onSelect || function () {};
        this._onSelectPrev = opts.onSelectPrev || function () {};
        this._skipRow = opts.skipRow || function () { return false; };
        this._skipCell = opts.skipCell || function () { return false; };

        this._rowIndex = 0;
        this._colIndex = 0;
        this._inCellMode = false;
        this._autoScanTimer = null;
        this._suppressAutoScan = false;
    }

    NarbeRowColumnScan.prototype.forward = function () {
        if (this._inCellMode) {
            this._advanceCell(1);
        } else {
            this._advanceRow(1);
        }
    };

    NarbeRowColumnScan.prototype.backward = function () {
        if (this._inCellMode) {
            this._advanceCell(-1);
        } else {
            this._advanceRow(-1);
        }
    };

    NarbeRowColumnScan.prototype.select = function () {
        var rows = this._getRows();
        if (!rows || rows.length === 0) return;

        if (!this._inCellMode) {
            // Enter cell mode
            this._inCellMode = true;
            this._colIndex = 0;
            var row = rows[this._rowIndex];
            if (row && row.length > 0) {
                this._onCellFocus(this._rowIndex, this._colIndex, row[this._colIndex]);
            }
        } else {
            // Activate cell
            var row = rows[this._rowIndex];
            if (row && row[this._colIndex] !== undefined) {
                this._onSelect(this._rowIndex, this._colIndex, row[this._colIndex]);
            }
        }
    };

    NarbeRowColumnScan.prototype.selectPrev = function () {
        if (this._inCellMode) {
            this.exitCellMode();
        } else if (this._onSelectPrev) {
            var rows = this._getRows();
            if (rows && rows[this._rowIndex]) {
                this._onSelectPrev(this._rowIndex, this._colIndex, rows[this._rowIndex][this._colIndex]);
            }
        }
    };

    NarbeRowColumnScan.prototype._advanceRow = function (dir) {
        var rows = this._getRows();
        if (!rows || rows.length === 0) return;

        var attempts = 0;
        do {
            this._rowIndex = (this._rowIndex + dir + rows.length) % rows.length;
            attempts++;
        } while (this._skipRow(this._rowIndex) && attempts < rows.length);

        this._onRowFocus(this._rowIndex);
    };

    NarbeRowColumnScan.prototype._advanceCell = function (dir) {
        var rows = this._getRows();
        if (!rows || !rows[this._rowIndex]) return;

        var row = rows[this._rowIndex];
        var attempts = 0;
        do {
            this._colIndex = (this._colIndex + dir + row.length) % row.length;
            attempts++;
        } while (this._skipCell(this._rowIndex, this._colIndex, row[this._colIndex]) && attempts < row.length);

        this._onCellFocus(this._rowIndex, this._colIndex, row[this._colIndex]);
    };

    NarbeRowColumnScan.prototype.isInRowMode = function () { return !this._inCellMode; };

    NarbeRowColumnScan.prototype.exitCellMode = function () {
        this._inCellMode = false;
        this._colIndex = 0;
        this._onRowFocus(this._rowIndex);
    };

    NarbeRowColumnScan.prototype.getRowIndex = function () { return this._rowIndex; };
    NarbeRowColumnScan.prototype.getColIndex = function () { return this._colIndex; };
    NarbeRowColumnScan.prototype.setRowIndex = function (i) { this._rowIndex = i; };

    // Auto-scan (same pattern as LinearScan)
    NarbeRowColumnScan.prototype.startAutoScan = function () {
        this.stopAutoScan();
        if (window.NarbeScanManager && !window.NarbeScanManager.getSettings().autoScan) return;
        var speed = (window.NarbeScanManager) ? window.NarbeScanManager.getScanInterval() : 2000;
        if (!speed || speed < 500) speed = 2000;

        var self = this;
        this._autoScanTimer = setInterval(function () {
            if (!self._suppressAutoScan) self.forward();
        }, speed);
    };

    NarbeRowColumnScan.prototype.stopAutoScan = function () {
        if (this._autoScanTimer) {
            clearInterval(this._autoScanTimer);
            this._autoScanTimer = null;
        }
    };

    NarbeRowColumnScan.prototype.resetAutoScan = function () {
        this.stopAutoScan();
        this.startAutoScan();
    };

    NarbeRowColumnScan.prototype.setSuppressAutoScan = function (val) {
        this._suppressAutoScan = !!val;
    };

    NarbeRowColumnScan.prototype.destroy = function () {
        this.stopAutoScan();
    };

    window.NarbeLinearScan = NarbeLinearScan;
    window.NarbeRowColumnScan = NarbeRowColumnScan;
})();
