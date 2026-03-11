/**
 * NarbeMenuSystem — Shared menu management for NARBE apps.
 * Manages declarative menu definitions, state transitions, and provides
 * a Scannable interface to the scan engine.
 * IIFE on window (no ES modules).
 */
(function () {
    'use strict';

    function NarbeMenuSystem(opts) {
        opts = opts || {};
        this._menus = opts.menus || {};
        this._menuContainer = opts.menuContainer || null;
        this._pauseOverlay = opts.pauseOverlay || null;
        this._speak = opts.speak || function () {};
        this._renderOverride = opts.renderOverride || null;

        this._titleTag = opts.titleTag || 'div';
        this._buttonClass = opts.buttonClass || 'menu-button';
        this._gridClass = opts.gridClass || 'menu-grid';
        this._settingsMenus = opts.settingsMenus || [];

        this._currentMenu = null;
        this._selectedIndex = 0;
    }

    NarbeMenuSystem.prototype.showMenu = function (name, title) {
        this._currentMenu = name;
        this._selectedIndex = 0;
        if (this._renderOverride) {
            var items = this.getCurrentItems();
            this._renderOverride(name, items, this._selectedIndex);
        } else {
            this.render();
        }
    };

    NarbeMenuSystem.prototype.getCurrentMenu = function () { return this._currentMenu; };

    NarbeMenuSystem.prototype.getCurrentItems = function () {
        if (!this._currentMenu || !this._menus[this._currentMenu]) return [];
        return this._menus[this._currentMenu];
    };

    NarbeMenuSystem.prototype.getSelectedIndex = function () { return this._selectedIndex; };

    NarbeMenuSystem.prototype.setSelectedIndex = function (i) { this._selectedIndex = i; };

    NarbeMenuSystem.prototype.asScannable = function () {
        var self = this;
        return {
            getItems: function () { return self.getCurrentItems(); },
            onFocus: function (item, index) {
                self._selectedIndex = index;
                var text = (typeof item.text === 'function') ? item.text() : item.text;
                self._speak(text);
                if (self._renderOverride) {
                    self._renderOverride(self._currentMenu, self.getCurrentItems(), index);
                }
            },
            onSelect: function (item) {
                if (item && item.action) item.action();
            },
            onSelectPrev: function (item) {
                if (item && item.onPrev) item.onPrev();
            }
        };
    };

    NarbeMenuSystem.prototype.render = function () {
        // DOM rendering — apps that use canvas pass renderOverride instead
        if (!this._menuContainer) return;
        // Subclass or extend if needed per-app
    };

    NarbeMenuSystem.prototype.refreshSelectedItem = function () {
        if (this._renderOverride) {
            var items = this.getCurrentItems();
            this._renderOverride(this._currentMenu, items, this._selectedIndex);
        }
    };

    NarbeMenuSystem.prototype.destroy = function () {
        this._menus = {};
        this._currentMenu = null;
    };

    window.NarbeMenuSystem = NarbeMenuSystem;
})();
