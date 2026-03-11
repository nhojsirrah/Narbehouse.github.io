/**
 * NarbeMenuSystem - Declarative Menu State Manager
 *
 * Manages menu definitions, state machine transitions, DOM rendering,
 * and provides a Scannable interface for NarbeLinearScan.
 *
 * Replaces the duplicated menu rendering and state tracking in every
 * DOM-based app (~150-250 lines per app).
 */

(function() {
  'use strict';

  /**
   * @param {Object} opts
   * @param {Object}   opts.menus               - map of menuName -> items array
   * @param {Element}  [opts.menuContainer]      - DOM element for menu rendering
   * @param {Element}  [opts.pauseOverlay]       - DOM element for pause overlay
   * @param {string}   [opts.titleTag='div']     - element type for menu titles
   * @param {string}   [opts.buttonClass='menu-button'] - CSS class for buttons
   * @param {string}   [opts.gridClass='menu-grid']     - CSS class for settings grids
   * @param {string[]} [opts.settingsMenus=[]]   - which menus use grid layout
   * @param {Function} [opts.speak]              - TTS function
   * @param {Function} [opts.renderOverride]     - custom render for canvas apps
   */
  function NarbeMenuSystem(opts) {
    opts = opts || {};
    this._menus = opts.menus || {};
    this._menuContainer = opts.menuContainer || null;
    this._pauseOverlay = opts.pauseOverlay || null;
    this._titleTag = opts.titleTag || 'div';
    this._buttonClass = opts.buttonClass || 'menu-button';
    this._gridClass = opts.gridClass || 'menu-grid';
    this._settingsMenus = opts.settingsMenus || [];
    this._speak = opts.speak || null;
    this._renderOverride = opts.renderOverride || null;

    this._currentMenu = null;
    this._currentTitle = '';
    this._selectedIndex = 0;
    this._renderedButtons = [];
  }

  /**
   * Switch to a named menu, reset index to 0, and render.
   * @param {string} name - menu key from the menus object
   * @param {string} [title] - optional title to display
   */
  NarbeMenuSystem.prototype.showMenu = function(name, title) {
    this._currentMenu = name;
    this._currentTitle = title || '';
    this._selectedIndex = 0;
    this.render();
  };

  NarbeMenuSystem.prototype.getCurrentMenu = function() {
    return this._currentMenu;
  };

  NarbeMenuSystem.prototype.getCurrentItems = function() {
    var items = this._menus[this._currentMenu];
    if (!items) return [];
    return items;
  };

  NarbeMenuSystem.prototype.getSelectedIndex = function() {
    return this._selectedIndex;
  };

  NarbeMenuSystem.prototype.setSelectedIndex = function(i) {
    this._selectedIndex = i;
  };

  /**
   * Returns a Scannable interface for use with NarbeLinearScan.
   */
  NarbeMenuSystem.prototype.asScannable = function() {
    var self = this;
    return {
      getItems: function() { return self.getCurrentItems(); },
      onFocus: function(item, index) {
        self._selectedIndex = index;
        self._updateHighlight();
        if (self._speak) {
          var text = typeof item.text === 'function' ? item.text() : item.text;
          var spoken = item.spoken || text;
          self._speak(spoken);
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

  /**
   * Render the current menu to the container element.
   */
  NarbeMenuSystem.prototype.render = function() {
    if (this._renderOverride) {
      var items = this.getCurrentItems();
      this._renderOverride(this._currentMenu, items, this._selectedIndex);
      return;
    }

    var container = this._menuContainer;
    if (!container) return;

    var items = this.getCurrentItems();
    var isSettings = this._settingsMenus.indexOf(this._currentMenu) !== -1;

    var html = '';
    if (this._currentTitle) {
      html += '<' + this._titleTag + ' class="menu-title">' + this._currentTitle + '</' + this._titleTag + '>';
    }

    if (isSettings) {
      html += '<div class="' + this._gridClass + '">';
    } else {
      html += '<div id="menu-list" style="display:flex; flex-direction:column; align-items:center;">';
    }

    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var text = typeof item.text === 'function' ? item.text() : item.text;
      var btnHtml = '<button class="' + this._buttonClass + '" data-menu-index="' + i + '"';
      if (item.spoken) btnHtml += ' data-spoken="' + item.spoken + '"';
      if (item.style) btnHtml += ' style="' + item.style + '"';
      btnHtml += '>' + text + '</button>';
      html += btnHtml;
    }

    html += '</div>';
    container.innerHTML = html;

    // Cache rendered buttons and bind click handlers
    this._renderedButtons = Array.from(container.querySelectorAll('.' + this._buttonClass));
    var self = this;
    this._renderedButtons.forEach(function(btn, idx) {
      btn.addEventListener('click', function() {
        var items = self.getCurrentItems();
        if (items[idx] && items[idx].action) items[idx].action();
      });
    });

    this._updateHighlight();
  };

  /**
   * Re-render just the selected item's text (for settings cycles).
   */
  NarbeMenuSystem.prototype.refreshSelectedItem = function() {
    var items = this.getCurrentItems();
    if (this._renderedButtons[this._selectedIndex] && items[this._selectedIndex]) {
      var text = typeof items[this._selectedIndex].text === 'function'
        ? items[this._selectedIndex].text()
        : items[this._selectedIndex].text;
      this._renderedButtons[this._selectedIndex].innerHTML = text;
    }
  };

  /** Update highlight CSS class on rendered buttons. */
  NarbeMenuSystem.prototype._updateHighlight = function() {
    for (var i = 0; i < this._renderedButtons.length; i++) {
      if (i === this._selectedIndex) {
        this._renderedButtons[i].classList.add('highlight');
        this._renderedButtons[i].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        this._renderedButtons[i].classList.remove('highlight');
      }
    }
  };

  /** Get the rendered button elements. */
  NarbeMenuSystem.prototype.getButtons = function() {
    return this._renderedButtons;
  };

  /** Update menu definitions at runtime. */
  NarbeMenuSystem.prototype.setMenus = function(menus) {
    this._menus = menus;
  };

  /** Update a single menu's items. */
  NarbeMenuSystem.prototype.setMenu = function(name, items) {
    this._menus[name] = items;
  };

  NarbeMenuSystem.prototype.destroy = function() {
    this._menus = {};
    this._renderedButtons = [];
  };

  window.NarbeMenuSystem = NarbeMenuSystem;
})();
