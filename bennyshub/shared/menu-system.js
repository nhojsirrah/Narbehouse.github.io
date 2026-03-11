/**
 * NarbeMenuSystem — Shared Module 3
 * Manages declarative menu definitions, state machine transitions, and provides
 * a Scannable interface to the scan engine.
 */
(function() {
    'use strict';

    function NarbeMenuSystem(config) {
        this._menus = config.menus || {};
        this._menuContainer = config.menuContainer || null;
        this._pauseOverlay = config.pauseOverlay || null;
        this._speak = config.speak || function() {};
        this._renderOverride = config.renderOverride || null;

        // Rendering options
        this._titleTag = config.titleTag || 'div';
        this._buttonClass = config.buttonClass || 'menu-button';
        this._gridClass = config.gridClass || 'menu-grid';
        this._settingsMenus = config.settingsMenus || [];

        // State
        this._currentMenu = null;
        this._selectedIndex = 0;
    }

    NarbeMenuSystem.prototype.showMenu = function(name, title) {
        this._currentMenu = name;
        this._selectedIndex = 0;

        if (this._renderOverride) {
            var items = this.getCurrentItems();
            this._renderOverride(name, items, this._selectedIndex);
        } else {
            this.render();
        }

        if (title) {
            this._speak(title);
        }
    };

    NarbeMenuSystem.prototype.getCurrentMenu = function() {
        return this._currentMenu;
    };

    NarbeMenuSystem.prototype.getCurrentItems = function() {
        var menu = this._menus[this._currentMenu];
        if (!menu) return [];
        return Array.isArray(menu) ? menu : (typeof menu === 'function' ? menu() : []);
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
                } else {
                    self.refreshSelectedItem();
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
        // DOM rendering — only for DOM-based apps
        if (!this._menuContainer) return;

        var items = this.getCurrentItems();
        var isSettings = this._settingsMenus.indexOf(this._currentMenu) >= 0;
        var container = this._menuContainer;

        container.innerHTML = '';

        if (isSettings) {
            container.className = this._gridClass;
        } else {
            container.className = '';
        }

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            var text = typeof item.text === 'function' ? item.text() : item.text;
            var btn = document.createElement('button');
            btn.className = this._buttonClass;
            btn.textContent = text;
            btn.dataset.menuIndex = i;

            if (i === this._selectedIndex) {
                btn.classList.add('narbe-highlight');
            }

            (function(action, idx) {
                btn.addEventListener('click', function() {
                    if (action) action();
                });
            })(item.action, i);

            container.appendChild(btn);
        }
    };

    NarbeMenuSystem.prototype.refreshSelectedItem = function() {
        if (!this._menuContainer) return;

        var buttons = this._menuContainer.querySelectorAll('.' + this._buttonClass);
        var items = this.getCurrentItems();

        for (var i = 0; i < buttons.length; i++) {
            buttons[i].classList.remove('narbe-highlight');
            if (items[i]) {
                var text = typeof items[i].text === 'function' ? items[i].text() : items[i].text;
                buttons[i].textContent = text;
            }
        }

        if (buttons[this._selectedIndex]) {
            buttons[this._selectedIndex].classList.add('narbe-highlight');
        }
    };

    NarbeMenuSystem.prototype.destroy = function() {
        this._menus = {};
        this._currentMenu = null;
    };

    window.NarbeMenuSystem = NarbeMenuSystem;
})();
