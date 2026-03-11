/**
 * Unified Menu System for Narbehouse Accessibility Hub
 * Manages declarative menu definitions, DOM rendering, and Scannable interface
 * for the scan engine. Replaces duplicated menu rendering and state tracking
 * in every DOM-based app.
 */

window.NarbeMenuSystem = (function() {
  'use strict';

  /**
   * @param {Object} opts
   * @param {Object} opts.menus - Named menu arrays, each item: { text: string|fn, action: fn, onPrev?: fn }
   * @param {HTMLElement} opts.menuContainer - DOM element for rendering menus
   * @param {HTMLElement} [opts.pauseOverlay] - DOM element for pause overlay
   * @param {string} [opts.buttonClass='menu-button'] - CSS class for menu buttons
   * @param {string} [opts.gridClass='menu-grid'] - CSS class for settings grid layout
   * @param {string[]} [opts.settingsMenus=[]] - Menu names that use grid layout
   * @param {string} [opts.titleTag='div'] - Element type for menu title
   * @param {Function} opts.speak - TTS function (text) => void
   * @param {Function} [opts.renderOverride] - Optional (menuName, items, selectedIndex) => void for canvas apps
   */
  function NarbeMenuSystem(opts) {
    if (!opts || !opts.menus) {
      throw new Error('NarbeMenuSystem: menus option is required');
    }

    this._menus = opts.menus;
    this._menuContainer = opts.menuContainer || null;
    this._pauseOverlay = opts.pauseOverlay || null;
    this._buttonClass = opts.buttonClass || 'menu-button';
    this._gridClass = opts.gridClass || 'menu-grid';
    this._settingsMenus = opts.settingsMenus || [];
    this._titleTag = opts.titleTag || 'div';
    this._speak = opts.speak || function() {};
    this._renderOverride = opts.renderOverride || null;

    this._currentMenu = null;
    this._currentTitle = null;
    this._selectedIndex = 0;
  }

  /**
   * Resolve item text — if it's a function, call it; otherwise return as-is
   */
  function resolveText(item) {
    return typeof item.text === 'function' ? item.text() : item.text;
  }

  /**
   * Strip HTML tags from text for TTS
   */
  function stripHTML(html) {
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  // --- Public API ---

  /**
   * Switch active menu, reset index to 0, render, speak first item
   * @param {string} name - Menu name (key in the menus object)
   * @param {string} [title] - Optional title to display above the menu
   */
  NarbeMenuSystem.prototype.showMenu = function(name, title) {
    if (!this._menus[name]) {
      console.warn('NarbeMenuSystem: Unknown menu "' + name + '"');
      return;
    }

    this._currentMenu = name;
    this._currentTitle = title || null;
    this._selectedIndex = 0;

    this.render();

    // Speak first item
    var items = this._menus[name];
    if (items.length > 0) {
      var text = resolveText(items[0]);
      this._speak(stripHTML(text));
    }
  };

  /**
   * Get active menu name
   * @returns {string|null}
   */
  NarbeMenuSystem.prototype.getCurrentMenu = function() {
    return this._currentMenu;
  };

  /**
   * Get active items array with text functions resolved
   * @returns {Array}
   */
  NarbeMenuSystem.prototype.getCurrentItems = function() {
    if (!this._currentMenu || !this._menus[this._currentMenu]) return [];

    var items = this._menus[this._currentMenu];
    return items.map(function(item) {
      return {
        text: resolveText(item),
        action: item.action,
        onPrev: item.onPrev
      };
    });
  };

  /**
   * Get current selection index
   * @returns {number}
   */
  NarbeMenuSystem.prototype.getSelectedIndex = function() {
    return this._selectedIndex;
  };

  /**
   * Set current selection index
   * @param {number} i
   */
  NarbeMenuSystem.prototype.setSelectedIndex = function(i) {
    var items = this._menus[this._currentMenu];
    if (!items) return;
    if (i >= 0 && i < items.length) {
      this._selectedIndex = i;
    }
  };

  /**
   * Returns a Scannable interface for NarbeLinearScan
   * @returns {Object} { getItems, onFocus, onSelect, onSelectPrev }
   */
  NarbeMenuSystem.prototype.asScannable = function() {
    var self = this;

    return {
      getItems: function() {
        if (!self._currentMenu || !self._menus[self._currentMenu]) return [];
        return self._menus[self._currentMenu];
      },

      onFocus: function(item, index) {
        self._selectedIndex = index;
        self._updateSelected();

        var text = resolveText(item);
        self._speak(stripHTML(text));
      },

      onSelect: function(item, index) {
        if (item && typeof item.action === 'function') {
          item.action();
        }
      },

      onSelectPrev: function(item, index) {
        if (item && typeof item.onPrev === 'function') {
          item.onPrev();
        }
      }
    };
  };

  /**
   * Re-render current menu to menuContainer (or call renderOverride)
   */
  NarbeMenuSystem.prototype.render = function() {
    if (!this._currentMenu || !this._menus[this._currentMenu]) return;

    var name = this._currentMenu;
    var items = this._menus[name];
    var selectedIndex = this._selectedIndex;

    // Canvas apps: use renderOverride instead of DOM rendering
    if (this._renderOverride) {
      var resolved = this.getCurrentItems();
      this._renderOverride(name, resolved, selectedIndex);
      return;
    }

    // Determine which container to render into
    var container = this._menuContainer;
    if (!container) return;

    container.innerHTML = '';

    // Title
    if (this._currentTitle) {
      var titleEl = document.createElement(this._titleTag);
      titleEl.className = 'menu-title';
      titleEl.innerHTML = this._currentTitle;
      container.appendChild(titleEl);
    }

    // Determine if this menu uses grid layout
    var isGrid = this._settingsMenus.indexOf(name) !== -1;

    var buttonContainer = container;
    if (isGrid) {
      buttonContainer = document.createElement('div');
      buttonContainer.className = this._gridClass;
      container.appendChild(buttonContainer);
    }

    var self = this;
    var buttonClass = this._buttonClass;

    items.forEach(function(item, index) {
      var btn = document.createElement('button');
      btn.className = buttonClass;
      btn.innerHTML = resolveText(item);

      // Apply selected class to current item
      if (index === selectedIndex) {
        btn.classList.add('selected');
      }

      // Click handler — sync index and fire action
      btn.onclick = function() {
        self._selectedIndex = index;
        if (item.action) item.action();
      };

      // In grid layout, span last item across both columns (Back button)
      if (isGrid && index === items.length - 1) {
        btn.classList.add('span-two-cols');
      }

      buttonContainer.appendChild(btn);
    });
  };

  /**
   * Update just the selected item text and selected class (for live setting value display).
   * Avoids full re-render — only updates button innerHTML and class states.
   */
  NarbeMenuSystem.prototype.refreshSelectedItem = function() {
    if (!this._currentMenu || !this._menus[this._currentMenu]) return;

    // For canvas apps, delegate to renderOverride
    if (this._renderOverride) {
      var resolved = this.getCurrentItems();
      this._renderOverride(this._currentMenu, resolved, this._selectedIndex);
      return;
    }

    // Find buttons in the current container
    var container = this._menuContainer;
    if (!container) return;

    var buttons = container.querySelectorAll('.' + this._buttonClass);
    var items = this._menus[this._currentMenu];

    for (var i = 0; i < buttons.length && i < items.length; i++) {
      // Update text for all items (settings values may have changed)
      buttons[i].innerHTML = resolveText(items[i]);

      // Update selected class
      if (i === this._selectedIndex) {
        buttons[i].classList.add('selected');
      } else {
        buttons[i].classList.remove('selected');
      }
    }
  };

  /**
   * Internal: update selected class on buttons without re-rendering text
   */
  NarbeMenuSystem.prototype._updateSelected = function() {
    // For canvas apps, delegate to renderOverride
    if (this._renderOverride) {
      var resolved = this.getCurrentItems();
      this._renderOverride(this._currentMenu, resolved, this._selectedIndex);
      return;
    }

    var container = this._menuContainer;
    if (!container) return;

    var buttons = container.querySelectorAll('.' + this._buttonClass);
    var selectedIndex = this._selectedIndex;

    for (var i = 0; i < buttons.length; i++) {
      if (i === selectedIndex) {
        buttons[i].classList.add('selected');
      } else {
        buttons[i].classList.remove('selected');
      }
    }
  };

  /**
   * Clean up references
   */
  NarbeMenuSystem.prototype.destroy = function() {
    this._menus = null;
    this._menuContainer = null;
    this._pauseOverlay = null;
    this._speak = null;
    this._renderOverride = null;
    this._currentMenu = null;
    this._currentTitle = null;
    this._selectedIndex = 0;
  };

  return NarbeMenuSystem;
})();
