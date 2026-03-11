/**
 * NarbeMenuSystem - Shared menu state management
 * Manages declarative menu definitions, state machine transitions,
 * and provides a Scannable interface to the scan engine.
 */
window.NarbeMenuSystem = (function() {
  'use strict';

  function NarbeMenuSystem(config) {
    this._menus = config.menus || {};
    this._menuContainer = config.menuContainer || null;
    this._pauseOverlay = config.pauseOverlay || null;
    this._titleTag = config.titleTag || 'div';
    this._buttonClass = config.buttonClass || 'menu-button';
    this._gridClass = config.gridClass || 'menu-grid';
    this._settingsMenus = config.settingsMenus || [];
    this._speak = config.speak || function() {};
    this._renderOverride = config.renderOverride || null;

    this._currentMenu = null;
    this._selectedIndex = 0;
  }

  NarbeMenuSystem.prototype.showMenu = function(name, title) {
    this._currentMenu = name;
    this._selectedIndex = 0;
    if (this._renderOverride) {
      this._renderOverride(name, this.getCurrentItems(), this._selectedIndex);
    }
  };

  NarbeMenuSystem.prototype.getCurrentMenu = function() {
    return this._currentMenu;
  };

  NarbeMenuSystem.prototype.getCurrentItems = function() {
    if (!this._currentMenu || !this._menus[this._currentMenu]) return [];
    var items = this._menus[this._currentMenu];
    return typeof items === 'function' ? items() : items;
  };

  NarbeMenuSystem.prototype.getSelectedIndex = function() {
    return this._selectedIndex;
  };

  NarbeMenuSystem.prototype.setSelectedIndex = function(i) {
    this._selectedIndex = i;
  };

  NarbeMenuSystem.prototype.asScannable = function() {
    var self = this;
    return {
      getItems: function() { return self.getCurrentItems(); },
      onFocus: function(item, index) {
        self._selectedIndex = index;
        var text = typeof item.text === 'function' ? item.text() : item.text;
        self._speak(text);
        if (self._renderOverride) {
          self._renderOverride(self._currentMenu, self.getCurrentItems(), index);
        }
      },
      onSelect: function(item, index) {
        if (item && item.action) item.action();
      },
      onSelectPrev: function(item, index) {
        if (item && item.onPrev) item.onPrev();
      }
    };
  };

  NarbeMenuSystem.prototype.render = function() {
    // DOM rendering — apps can override or use renderOverride
  };

  NarbeMenuSystem.prototype.refreshSelectedItem = function() {
    // Refresh display of current selected item text
  };

  NarbeMenuSystem.prototype.destroy = function() {
    this._menus = {};
    this._currentMenu = null;
  };

  return NarbeMenuSystem;
})();
