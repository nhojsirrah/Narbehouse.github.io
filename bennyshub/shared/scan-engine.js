/**
 * NarbeLinearScan / NarbeRowColumnScan — Shared Module 2
 * Owns scan index state, forward/backward traversal, auto-scan interval, and skip logic.
 */
(function() {
    'use strict';

    // ── LinearScan ──────────────────────────────────────────────
    function NarbeLinearScan(scannable) {
        this._scannable = scannable;
        this._index = -1;
        this._autoScanTimer = null;
        this._suppressAutoScan = false;
    }

    NarbeLinearScan.prototype.forward = function() {
        var items = this._scannable.getItems();
        if (!items || items.length === 0) return;

        var startIndex = this._index;
        var attempts = 0;
        var skip = this._scannable.skip || function() { return false; };

        do {
            this._index = (this._index + 1) % items.length;
            attempts++;
        } while (skip(items[this._index], this._index) && attempts < items.length);

        if (attempts >= items.length) return; // all skipped

        if (this._scannable.onFocus) {
            this._scannable.onFocus(items[this._index], this._index);
        }
    };

    NarbeLinearScan.prototype.backward = function() {
        var items = this._scannable.getItems();
        if (!items || items.length === 0) return;

        var attempts = 0;
        var skip = this._scannable.skip || function() { return false; };

        do {
            this._index--;
            if (this._index < 0) this._index = items.length - 1;
            attempts++;
        } while (skip(items[this._index], this._index) && attempts < items.length);

        if (attempts >= items.length) return;

        if (this._scannable.onFocus) {
            this._scannable.onFocus(items[this._index], this._index);
        }
    };

    NarbeLinearScan.prototype.select = function() {
        var items = this._scannable.getItems();
        if (this._index >= 0 && items && this._index < items.length) {
            if (this._scannable.onSelect) {
                this._scannable.onSelect(items[this._index], this._index);
            }
        }
    };

    NarbeLinearScan.prototype.selectPrev = function() {
        var items = this._scannable.getItems();
        if (this._index >= 0 && items && this._index < items.length) {
            if (this._scannable.onSelectPrev) {
                this._scannable.onSelectPrev(items[this._index], this._index);
            }
        }
    };

    NarbeLinearScan.prototype.getIndex = function() {
        return this._index;
    };

    NarbeLinearScan.prototype.setIndex = function(i) {
        this._index = i;
    };

    NarbeLinearScan.prototype.reset = function() {
        this._index = -1;
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

    NarbeLinearScan.prototype.setScannable = function(scannable) {
        this._scannable = scannable;
    };

    NarbeLinearScan.prototype.destroy = function() {
        this.stopAutoScan();
    };

    // ── RowColumnScan ───────────────────────────────────────────
    function NarbeRowColumnScan(config) {
        this._getRows = config.getRows;
        this._onRowFocus = config.onRowFocus || function() {};
        this._onCellFocus = config.onCellFocus || function() {};
        this._onSelect = config.onSelect || function() {};
        this._onSelectPrev = config.onSelectPrev || function() {};
        this._skipRow = config.skipRow || function() { return false; };
        this._skipCell = config.skipCell || function() { return false; };

        this._rowIndex = -1;
        this._colIndex = -1;
        this._inCellMode = false;
        this._autoScanTimer = null;
        this._suppressAutoScan = false;
    }

    NarbeRowColumnScan.prototype.forward = function() {
        if (this._inCellMode) {
            this._advanceCell(1);
        } else {
            this._advanceRow(1);
        }
    };

    NarbeRowColumnScan.prototype.backward = function() {
        if (this._inCellMode) {
            this._advanceCell(-1);
        } else {
            this._advanceRow(-1);
        }
    };

    NarbeRowColumnScan.prototype.select = function() {
        var rows = this._getRows();
        if (!rows || rows.length === 0) return;

        if (!this._inCellMode) {
            // Enter cell mode
            this._inCellMode = true;
            this._colIndex = -1;
            this._advanceCell(1);
        } else {
            var row = rows[this._rowIndex];
            if (row && this._colIndex >= 0 && this._colIndex < row.length) {
                this._onSelect(this._rowIndex, this._colIndex, row[this._colIndex]);
            }
        }
    };

    NarbeRowColumnScan.prototype.selectPrev = function() {
        if (this._inCellMode) {
            this.exitCellMode();
        } else {
            this._onSelectPrev(this._rowIndex);
        }
    };

    NarbeRowColumnScan.prototype.isInRowMode = function() {
        return !this._inCellMode;
    };

    NarbeRowColumnScan.prototype.exitCellMode = function() {
        this._inCellMode = false;
        this._colIndex = -1;
        if (this._rowIndex >= 0) {
            this._onRowFocus(this._rowIndex);
        }
    };

    NarbeRowColumnScan.prototype._advanceRow = function(dir) {
        var rows = this._getRows();
        if (!rows || rows.length === 0) return;
        var attempts = 0;
        do {
            this._rowIndex += dir;
            if (this._rowIndex >= rows.length) this._rowIndex = 0;
            if (this._rowIndex < 0) this._rowIndex = rows.length - 1;
            attempts++;
        } while (this._skipRow(this._rowIndex) && attempts < rows.length);
        this._onRowFocus(this._rowIndex);
    };

    NarbeRowColumnScan.prototype._advanceCell = function(dir) {
        var rows = this._getRows();
        if (!rows || !rows[this._rowIndex]) return;
        var row = rows[this._rowIndex];
        var attempts = 0;
        do {
            this._colIndex += dir;
            if (this._colIndex >= row.length) this._colIndex = 0;
            if (this._colIndex < 0) this._colIndex = row.length - 1;
            attempts++;
        } while (this._skipCell(this._rowIndex, this._colIndex, row[this._colIndex]) && attempts < row.length);
        this._onCellFocus(this._rowIndex, this._colIndex, row[this._colIndex]);
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

    window.NarbeLinearScan = NarbeLinearScan;
    window.NarbeRowColumnScan = NarbeRowColumnScan;
})();
