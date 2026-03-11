// --- Configuration & Constants ---
const config = {
    scanSpeeds: [
        { label: '1 Second', val: 1000 },
        { label: '2 Seconds', val: 2000 },
        { label: '3 Seconds', val: 3000 },
        { label: '5 Seconds', val: 5000 }
    ]
};

const playerColors = [
    { name: 'Red', hex: '#d32f2f' },
    { name: 'Black', hex: '#212121' },
    { name: 'White', hex: '#f5f5f5' },
    { name: 'Blue', hex: '#1976d2' },
    { name: 'Green', hex: '#388e3c' },
    { name: 'Purple', hex: '#7b1fa2' },
    { name: 'Orange', hex: '#f57c00' }
];

// --- Game State ---
const state = {
    mode: 'menu', // menu, game, pause, gameover
    gameMode: 'single', // single, two
    gameType: 'checkers', // checkers, chess

    // Board Representation:
    // Checkers: 8x8 array. 0 = empty. P1=1/2, P2=-1/-2
    // Chess: Managed by ChessGame instance
    board: [],

    turn: 1, // 1/w for Player 1, -1/b for Player 2

    // Selection state
    selectedPiece: null, // {r, c}
    availableMoves: [], // List of {r, c, type, capturedPiece}

    // Scanning state
    scanIndexV: -1, // Visible Items index (simplified from grid)
    scanItems: [], // List of interactable items currently available

    // Chess random side
    humanSide: 1, // 1 for White/P1, -1 for Black/P2
    computerSide: -1,

    timers: {
        status: null
    }
};

let chessGame = null; // Instance of ChessGame

const settings = {
    themeIndex: 0,
    tts: true,
    sound: true,
    p1ColorIndex: 0, // Red
    p2ColorIndex: 1, // Black
    highlightColorIndex: 0, // Yellow
    autoScan: false, // Default off
    scanSpeedIndex: 1, // Default 2 Seconds
    locationTTS: true, // Announce coordinates
    highlightStyle: 'outline' // 'outline' or 'full'
};

// --- Shared Module Instances ---
let switchInput = null;
let scanEngine = null;
let menuSystem = null;
let themeProvider = null;
let highlightRenderer = null;

// --- Sounds ---
let audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(()=>{});
    return audioCtx;
}

// Ensure unlock on first touch
window.addEventListener('touchstart', () => { getAudioCtx(); }, { once: true, passive: true });
window.addEventListener('click', () => { getAudioCtx(); }, { once: true });

function playSound(type) {
    if (!settings.sound) return;

    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'scan') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    } else if (type === 'select') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(660, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    } else if (type === 'move') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
    } else if (type === 'king') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.3);
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    }
}

// --- Initialization ---

window.onload = init;

function init() {
    loadSettings();
    initThemeProvider();
    initHighlightRenderer();
    initMenuSystem();
    initScanEngine();
    initSwitchInput();
    createDOMStructure();
    showMainMenu();
}

function loadSettings() {
    try {
        const saved = localStorage.getItem('bennys_checkers_settings');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(settings, parsed);

            // Validate indices safely
            const check = (key, max, def) => {
                if (typeof settings[key] !== 'number' || settings[key] < 0 || settings[key] >= max) {
                    settings[key] = def;
                }
            };

            check('themeIndex', 7, 0);
            check('p1ColorIndex', playerColors.length, 0);
            check('p2ColorIndex', playerColors.length, 1);
            check('highlightColorIndex', 10, 0);
            check('scanSpeedIndex', config.scanSpeeds.length, 1);

            if (settings.highlightStyle !== 'outline' && settings.highlightStyle !== 'full') {
                settings.highlightStyle = 'outline';
            }
        } else {
            // First run, save defaults
            saveSettings();
        }
    } catch(e) {
        console.error("Error loading settings:", e);
        // Fallback to safe defaults if JSON parse fails
        saveSettings();
    }
}

function saveSettings() {
    localStorage.setItem('bennys_checkers_settings', JSON.stringify(settings));
}

// --- Module 4: ThemeProvider ---
function initThemeProvider() {
    themeProvider = new NarbeThemeProvider({
        themes: [
            { name: 'Default', bg: 'linear-gradient(135deg, #ff4b1f, #ff9068)' },
            { name: 'Ocean', bg: 'linear-gradient(135deg, #2193b0, #6dd5ed)' },
            { name: 'Midnight', bg: 'linear-gradient(135deg, #232526, #414345)' },
            { name: 'Forest', bg: 'linear-gradient(135deg, #134e5e, #71b280)' },
            { name: 'Sunset', bg: 'linear-gradient(135deg, #f12711, #f5af19)' },
            { name: 'Lavender', bg: 'linear-gradient(135deg, #834d9b, #d04ed6)' },
            { name: 'Classic Wood', bg: 'url("https://www.transparenttextures.com/patterns/wood-pattern.png"), linear-gradient(135deg, #8b5a2b, #4e342e)' }
        ],
        initialIndex: settings.themeIndex,
        applyFn: (theme) => {
            document.body.style.background = theme.bg;
            document.body.style.backgroundSize = "cover";
            document.body.style.backgroundAttachment = "fixed";
        }
    });
    themeProvider.apply();
}

// --- Module 5: HighlightRenderer ---
function initHighlightRenderer() {
    highlightRenderer = new NarbeHighlightRenderer({
        colors: ['Yellow', 'Cyan', 'Lime', 'Magenta', 'Red', 'Orange', 'Gold', 'DeepSkyBlue', 'SpringGreen', 'Violet'],
        defaultColor: '#ffcc00',
        initialColorIndex: settings.highlightColorIndex,
        initialStyle: settings.highlightStyle
    });
}

// --- Module 3: MenuSystem ---
function initMenuSystem() {
    menuSystem = new NarbeMenuSystem({
        menus: {
            main: [
                {
                    text: () => `Game: ${state.gameType.charAt(0).toUpperCase() + state.gameType.slice(1)}`,
                    action: () => toggleGameType()
                },
                { text: "Single Player", action: () => startGame('single') },
                { text: "Two Player", action: () => startGame('two') },
                { text: "Settings", action: () => showMenu('settings') },
                { text: "Exit", action: () => {
                    speak("Exiting to Hub");
                    setTimeout(() => {
                        if (window.parent && window.parent !== window) {
                            window.parent.postMessage({ action: 'focusBackButton' }, '*');
                        } else {
                            window.location.href = '../../../index.html';
                        }
                    }, 500);
                } }
            ],
            settings: [
                {
                    text: () => `TTS: ${window.NarbeVoiceManager ? (window.NarbeVoiceManager.getSettings().ttsEnabled ? 'On' : 'Off') : (settings.tts ? 'On' : 'Off')}`,
                    action: () => toggleSetting('tts'),
                    onPrev: () => toggleSetting('tts')
                },
                {
                    text: () => `Sound: ${settings.sound ? 'On' : 'Off'}`,
                    action: () => toggleSetting('sound'),
                    onPrev: () => toggleSetting('sound')
                },
                {
                    text: () => `Theme: ${themeProvider.getCurrent().name}`,
                    action: () => { themeProvider.cycle(1); settings.themeIndex = themeProvider.getIndex(); saveSettings(); refreshCurrentMenu(); },
                    onPrev: () => { themeProvider.cycle(-1); settings.themeIndex = themeProvider.getIndex(); saveSettings(); refreshCurrentMenu(); }
                },
                {
                    text: () => `Highlight: ${highlightRenderer.getStyle() === 'outline' ? 'Outline' : 'Full Cell'}`,
                    action: () => toggleHighlightStyle(),
                    onPrev: () => toggleHighlightStyle()
                },
                {
                    text: () => `P1 Color: ${playerColors[settings.p1ColorIndex].name} <span class="color-swatch-circle" style="background-color:${playerColors[settings.p1ColorIndex].hex};"></span>`,
                    action: () => cycleColor('p1ColorIndex', 1),
                    onPrev: () => cycleColor('p1ColorIndex', -1)
                },
                {
                    text: () => `P2 Color: ${playerColors[settings.p2ColorIndex].name} <span class="color-swatch-circle" style="background-color:${playerColors[settings.p2ColorIndex].hex};"></span>`,
                    action: () => cycleColor('p2ColorIndex', 1),
                    onPrev: () => cycleColor('p2ColorIndex', -1)
                },
                {
                    text: () => `Highlight Color: ${highlightRenderer.getColorName()}`,
                    action: () => { highlightRenderer.cycleColor(1); settings.highlightColorIndex = highlightRenderer.getColorIndex(); saveSettings(); refreshCurrentMenu(); },
                    onPrev: () => { highlightRenderer.cycleColor(-1); settings.highlightColorIndex = highlightRenderer.getColorIndex(); saveSettings(); refreshCurrentMenu(); }
                },
                {
                    text: () => {
                        if(window.NarbeScanManager) return `Auto Scan: ${window.NarbeScanManager.getSettings().autoScan ? 'On' : 'Off'}`;
                        return `Auto Scan: ${settings.autoScan ? 'On' : 'Off'}`;
                    },
                    action: () => {
                        if(window.NarbeScanManager) {
                             window.NarbeScanManager.updateSettings({autoScan: !window.NarbeScanManager.getSettings().autoScan});
                             refreshCurrentMenu();
                        } else {
                             toggleSetting('autoScan');
                        }
                    },
                    onPrev: () => {
                         if(window.NarbeScanManager) {
                             window.NarbeScanManager.updateSettings({autoScan: !window.NarbeScanManager.getSettings().autoScan});
                             refreshCurrentMenu();
                         } else {
                             toggleSetting('autoScan');
                         }
                    }
                },
                {
                    text: () => {
                         if(window.NarbeScanManager) return `Scan Speed: ${window.NarbeScanManager.getScanInterval()/1000} Seconds`;
                         return `Scan Speed: ${config.scanSpeeds[settings.scanSpeedIndex].label}`;
                    },
                    action: () => {
                        if(window.NarbeScanManager) {
                            window.NarbeScanManager.cycleScanSpeed();
                            refreshCurrentMenu();
                        }
                        else { settings.scanSpeedIndex = (settings.scanSpeedIndex + 1) % config.scanSpeeds.length; saveSettings(); refreshCurrentMenu(); }
                    },
                    onPrev: () => {
                        if(window.NarbeScanManager) {
                            window.NarbeScanManager.cycleScanSpeed();
                            refreshCurrentMenu();
                        }
                        else { settings.scanSpeedIndex = (settings.scanSpeedIndex - 1 + config.scanSpeeds.length) % config.scanSpeeds.length; saveSettings(); refreshCurrentMenu(); }
                    }
                },
                { text: "Back", action: () => showMainMenu() }
            ],
            pause: [
                { text: "Continue Game", action: () => resumeGame() },
                { text: "Reset Game", action: () => restartGame() },
                { text: "Settings", action: () => showPauseSettings() },
                { text: "Main Menu", action: () => showMainMenu() }
            ],
            pauseSettings: [] // Filled below
        },
        menuContainer: null, // Set after DOM creation
        pauseOverlay: null,  // Set after DOM creation
        titleTag: 'div',
        buttonClass: 'menu-button',
        gridClass: 'settings-layout',
        settingsMenus: ['settings', 'pauseSettings'],
        speak: (text) => speak(text)
    });

    // Build pauseSettings from settings items but with Back going to pause menu
    const settingsItems = menuSystem.getCurrentItems ? null : null; // not available yet
    // We need to reference the settings menu items directly
    const settingsMenu = menuSystem.menus ? menuSystem.menus.settings : null;
    // Since MenuSystem stores menus internally, we build pauseSettings from the same items
    // but override the Back action
    menuSystem.menus.pauseSettings = menuSystem.menus.settings.map(item => {
        if (item.text === "Back") return { text: "Back", action: () => openPauseMenu() };
        return item;
    });
}

// --- Module 2: ScanEngine (LinearScan) ---
function initScanEngine() {
    // Start with menu scannable; will switch to game scannable when game starts
    scanEngine = new NarbeLinearScan({
        getItems: () => {
            if (state.mode === 'game') {
                return state.scanItems;
            }
            // Menu/pause mode — delegate to menuSystem
            return menuSystem.getCurrentItems() || [];
        },
        onFocus: (item, index) => {
            playSound('scan');
            if (state.mode === 'game') {
                state.scanIndexV = index;
                updateGameHighlights();
                announceCurrentGameItem();
            } else {
                menuSystem.setSelectedIndex(index);
                updateMenuHighlights();
                announceCurrentMenuItem();
            }
        },
        onSelect: (item, index) => {
            if (state.mode === 'game') {
                selectCurrentGameItem();
            } else {
                // Menu selection
                playSound('select');
                const menuItems = menuSystem.getCurrentItems();
                if (menuItems && menuItems[index]) {
                    menuItems[index].action();
                }
            }
        },
        onSelectPrev: (item, index) => {
            if (state.mode !== 'game') {
                const menuItems = menuSystem.getCurrentItems();
                if (menuItems && menuItems[index] && menuItems[index].onPrev) {
                    menuItems[index].onPrev();
                }
            }
        }
    });
}

// --- Module 1: SwitchInput ---
function initSwitchInput() {
    switchInput = new NarbeSwitchInput({
        longPressThreshold: 3000,
        enterLongPressThreshold: 5000,
        repeatInterval: 2000,
        onScanForward: () => {
            scanEngine.forward();
            scanEngine.resetAutoScan();
        },
        onScanBackwardStart: () => {
            scanEngine.backward();
        },
        onScanBackward: () => {
            scanEngine.backward();
        },
        onSelect: () => {
            scanEngine.select();
        },
        onSelectPrev: () => {
            scanEngine.selectPrev();
        },
        onPause: () => {
            if (state.mode === 'game') openPauseMenu();
        }
    });
}

function createDOMStructure() {
    const mainContent = document.getElementById('main-content');

    // Menu
    const menuContainer = document.createElement('div');
    menuContainer.id = 'menu-container';
    menuContainer.className = 'menu-container';
    mainContent.appendChild(menuContainer);

    // Game Board
    const gameContainer = document.createElement('div');
    gameContainer.id = 'game-board-container';
    gameContainer.className = 'game-container';
    gameContainer.style.display = 'none';

    const board = document.createElement('div');
    board.id = 'checkers-board';
    board.className = 'checkers-board';
    gameContainer.appendChild(board);

    mainContent.appendChild(gameContainer);

    // Pause Overlay
    const pauseOverlay = document.createElement('div');
    pauseOverlay.id = 'pause-overlay';
    pauseOverlay.className = 'pause-overlay';
    pauseOverlay.style.display = 'none';
    document.body.appendChild(pauseOverlay);

    // Pause Icon
    const pauseIcon = document.createElement('div');
    pauseIcon.id = 'pause-button-icon'; // Give it an ID to reference easily
    pauseIcon.className = 'pause-button-icon';
    pauseIcon.innerHTML = 'll';
    pauseIcon.title = "Pause Game";
    pauseIcon.style.display = 'none'; // Initially hidden
    pauseIcon.onclick = () => {
        if (state.mode === 'game') {
            openPauseMenu();
        }
    };
    document.body.appendChild(pauseIcon);

    // Now that DOM exists, update menuSystem container references
    menuSystem.menuContainer = menuContainer;
    menuSystem.pauseOverlay = pauseOverlay;
}

// --- Menu System Wiring ---

function renderMenu(menuName, menuItems, containerId) {
    const container = containerId ? document.getElementById(containerId) : document.getElementById('menu-container');
    container.innerHTML = '';

    // Toggle Layout Class for Settings
    if (menuName === 'settings') {
        container.classList.add('settings-layout');
        container.style.display = 'grid'; // Force grid
        container.style.gridTemplateColumns = '1fr 1fr'; // Ensure CSS hasn't been blocked
        container.style.alignContent = 'center';
    } else {
        container.classList.remove('settings-layout');
        container.style.display = 'flex'; // Restore flex
        container.style.flexDirection = 'column';
    }

    // Add Title
    const title = document.createElement('div');
    title.className = state.mode === 'menu' ? 'menu-title' : 'pause-title';

    if (menuName === 'main') {
        title.innerHTML = `BENNY'S<br>${state.gameType.toUpperCase()}`;
    } else {
        title.innerHTML = menuName === 'settings' ? "SETTINGS" :
                          menuName === 'pause' ? "PAUSED" :
                          menuName === 'gameover' ? "GAME OVER" : "SETTINGS";
    }
    container.appendChild(title);

    // Add Buttons
    menuItems.forEach((item, idx) => {
        const btn = document.createElement('button');
        btn.className = 'menu-button';
        btn.id = `btn-${container.id}-${idx}`;
        const txt = typeof item.text === 'function' ? item.text() : item.text;
        btn.innerHTML = txt;

        // Mouse click support
        btn.onclick = () => {
           menuSystem.setSelectedIndex(idx);
           item.action();
        };

        container.appendChild(btn);
    });

    updateMenuHighlights();
}

function showMainMenu() {
    state.mode = 'menu';
    menuSystem.showMenu('main');

    document.getElementById('menu-container').style.display = 'flex';
    document.getElementById('game-board-container').style.display = 'none';
    document.getElementById('pause-overlay').style.display = 'none';

    // Hide Pause Button in Menu
    const pauseIcon = document.getElementById('pause-button-icon');
    if (pauseIcon) pauseIcon.style.display = 'none';

    renderMenu('main', menuSystem.getCurrentItems());
    speak("Benny's Checkers. Single Player.");

    scanEngine.reset();
    scanEngine.startAutoScan();
}

function showMenu(menuName) {
    state.mode = 'menu';
    menuSystem.showMenu(menuName);

    // Hide pause button if showing settings from main menu
    const pauseIcon = document.getElementById('pause-button-icon');
    if (pauseIcon) pauseIcon.style.display = 'none';

    renderMenu(menuName, menuSystem.getCurrentItems());
    announceCurrentMenuItem();
    scanEngine.reset();
    scanEngine.startAutoScan();
}

function openPauseMenu() {
    state.mode = 'pause';
    menuSystem.showMenu('pause');

    const ov = document.getElementById('pause-overlay');
    ov.style.display = 'flex';

    renderMenu('pause', menuSystem.getCurrentItems(), 'pause-overlay');
    speak("Paused. Continue Game.");
    scanEngine.reset();
    scanEngine.startAutoScan();
}

function showPauseSettings() {
    state.mode = 'pause';
    menuSystem.showMenu('pauseSettings');
    renderMenu('settings', menuSystem.getCurrentItems(), 'pause-overlay');
    announceCurrentMenuItem();
    scanEngine.reset();
    scanEngine.startAutoScan();
}

function resumeGame() {
    document.getElementById('pause-overlay').style.display = 'none';
    state.mode = 'game';
    // Re-calculate scan items for board
    updateGameScanItems();
    speak("Resuming Game.");
    scanEngine.reset();
    scanEngine.startAutoScan();
}

// --- Settings Logic ---

function toggleSetting(key) {
    if (key === 'tts' && window.NarbeVoiceManager) {
        window.NarbeVoiceManager.toggleTTS();
        settings.tts = window.NarbeVoiceManager.getSettings().ttsEnabled;
    } else {
        settings[key] = !settings[key];
    }
    saveSettings();
    refreshCurrentMenu();
}

function cycleColor(key, dir) {
    const otherKey = key === 'p1ColorIndex' ? 'p2ColorIndex' : 'p1ColorIndex';
    let nextVal = settings[key];

    // Loop until we find a color that isn't the opponent's
    do {
        nextVal = (nextVal + dir + playerColors.length) % playerColors.length;
    } while(nextVal === settings[otherKey]);

    settings[key] = nextVal;
    saveSettings();
    refreshCurrentMenu();
}

function refreshCurrentMenu() {
    if (state.mode === 'menu') {
        const currentMenu = menuSystem.getCurrentMenu();
        renderMenu(currentMenu, menuSystem.getCurrentItems());
        announceCurrentMenuItem();
    } else if (state.mode === 'pause') {
        const currentMenu = menuSystem.getCurrentMenu();
        const renderName = currentMenu === 'pauseSettings' ? 'settings' : currentMenu;
        renderMenu(renderName, menuSystem.getCurrentItems(), 'pause-overlay');
        announceCurrentMenuItem();
    }
}

function toggleHighlightStyle() {
    highlightRenderer.toggleStyle();
    settings.highlightStyle = highlightRenderer.getStyle();
    saveSettings();
    refreshCurrentMenu();
    updateGameHighlights(); // Force update in case board is underneath overlay
}

// --- Game Logic ---

function initBoard() {
    if (state.gameType === 'chess') {
        if (!chessGame) chessGame = new ChessGame();
        else chessGame.reset();
    } else {
        // Checkers Initialization
        state.board = Array(8).fill(null).map(() => Array(8).fill(0));
        for(let r=0; r<8; r++) {
            for(let c=0; c<8; c++) {
                if ((r+c)%2 !== 0) {
                    if (r < 3) state.board[r][c] = -1; // P2
                    else if (r > 4) state.board[r][c] = 1; // P1
                }
            }
        }
    }
}

function renderBoard() {
    const boardEl = document.getElementById('checkers-board');
    boardEl.innerHTML = ''; // Clear

    const isFlipped = (state.humanSide === -1);

    for(let dispR=0; dispR<8; dispR++) {
        for(let dispC=0; dispC<8; dispC++) {
            let r = dispR;
            let c = dispC;

            if (isFlipped) {
                r = 7 - dispR;
                c = 7 - dispC;
            }

            const cell = document.createElement('div');
            cell.className = 'cell ' + ((r+c)%2 === 0 ? 'light' : 'dark');
            cell.id = `cell-${r}-${c}`;

            // Mouse Interaction for selecting
            cell.onclick = () => handleCellClick(r, c);

            let pieceVal = 0;
            let displayPiece = null;
            let pColorIndex = 0;

            if (state.gameType === 'chess') {
                const cp = chessGame.getPiece(r, c);
                if (cp) {
                    displayPiece = CHESS_PIECES[cp.color][cp.type];
                    pColorIndex = cp.color === 'w' ? 2 : 1;
                }
            } else {
                pieceVal = state.board[r][c];
                if (pieceVal !== 0) {
                     pColorIndex = pieceVal > 0 ? settings.p1ColorIndex : settings.p2ColorIndex;
                }
            }

            if ((state.gameType === 'checkers' && pieceVal !== 0) || (state.gameType === 'chess' && displayPiece)) {
                const piece = document.createElement('div');

                if (state.gameType === 'checkers') {
                    piece.className = 'checker';
                    if (Math.abs(pieceVal) === 2) piece.classList.add('king');
                    piece.style.backgroundColor = playerColors[pColorIndex].hex;
                } else {
                     // Chess Piece
                    piece.className = 'chess-piece';
                    piece.innerText = displayPiece;
                    piece.style.color = playerColors[pColorIndex].hex;
                    // Use responsive font size
                    piece.style.fontSize = 'min(40px, 8vmin)';
                    piece.style.display = 'flex';
                    piece.style.justifyContent = 'center';
                    piece.style.alignItems = 'center';
                    piece.style.width = '100%';
                    piece.style.height = '100%';
                    piece.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';
                }

                // Visual selected state
                if (state.selectedPiece && state.selectedPiece.r === r && state.selectedPiece.c === c) {
                    if (state.gameType === 'checkers') piece.classList.add('selected');
                    else piece.style.background = 'rgba(255, 255, 0, 0.4)';
                }

                cell.appendChild(piece);
            }

            // Highlight Moves
            if (state.selectedPiece) {
                const moveNode = state.availableMoves.find(m => m.r===r && m.c===c);
                if (moveNode) {
                    cell.classList.add('possible-move');
                }
            }

            boardEl.appendChild(cell);
        }
    }

    updateGameHighlights();
}

function startGame(mode) {
    state.gameMode = mode;
    state.mode = 'game';
    state.turn = 1; // P1 starts (White always starts)
    state.selectedPiece = null;
    state.availableMoves = [];

    // Randomize sides for Chess Single Player
    if (state.gameType === 'chess' && state.gameMode === 'single') {
        state.humanSide = Math.random() < 0.5 ? 1 : -1;
        state.computerSide = -state.humanSide;

        let sideText = state.humanSide === 1 ? "White" : "Black";
        speak(`You are playing as ${sideText}`);
        showTurnNotification(`You are ${sideText}`, 3000);
    } else {
        // Default
        state.humanSide = 1;
        state.computerSide = -1;
    }

    document.getElementById('menu-container').style.display = 'none';
    document.getElementById('game-board-container').style.display = 'flex';

    // Show Pause Button
    const pauseIcon = document.getElementById('pause-button-icon');
    if (pauseIcon) pauseIcon.style.display = 'flex';

    initBoard();
    updateGameScanItems();
    renderBoard();

    let turnText = "White's Turn";
    if (state.gameType === 'checkers') {
        turnText = "Player 1's Turn";
    }

    showTurnNotification(turnText);
    speak("Game Started. " + turnText);

    // If Human is Black (-1) and It's White's Turn (1), Computer moves
    if (state.gameType === 'chess' && state.gameMode === 'single' && state.humanSide === -1) {
         setTimeout(computerMove, 1000);
    } else {
         scanEngine.reset();
         scanEngine.startAutoScan();
    }
}

function restartGame() {
    document.getElementById('pause-overlay').style.display = 'none';
    startGame(state.gameMode);
}

// Data structure for scannable game items:
// We can either scan available pieces OR scan target moves.
function updateGameScanItems() {
    if (state.mode !== 'game') return;

    state.scanItems = [];

    // Chess Logic
    if (state.gameType === 'chess') {
        if (!state.selectedPiece) {
            // Find all pieces with legal moves
            const moves = chessGame.getAllMoves(chessGame.turn);
            const pieces = new Set();
            moves.forEach(m => pieces.add(`${m.from.r},${m.from.c}`));

            pieces.forEach(pStr => {
                const [r, c] = pStr.split(',').map(Number);
                const piece = chessGame.getPiece(r, c);
                const name = piece ? getChessPieceName(piece.type) : 'Piece';

                state.scanItems.push({
                    type: 'piece',
                    r, c,
                    text: `${name} at ${coordsToText(r, c)}`
                });
            });
        } else {
            // Selected: Show moves
            state.availableMoves.forEach(m => {
                const isCap = m.moveData.captured;
                state.scanItems.push({
                    type: 'move',
                    r: m.r,
                    c: m.c,
                    moveData: m, // Store the wrapper, so executeMove gets consistent input
                    text: `${isCap ? 'Capture ' : 'Move to '}${coordsToText(m.r, m.c)}`
                });
            });

            state.scanItems.push({
                type: 'cancel',
                text: "Select different piece"
            });
        }
        state.scanIndexV = 0;
        return;
    }

    // Checkers Logic
    const possibleFrom = getPiecesWithMoves(state.turn);

    if (!state.selectedPiece) {
        state.scanItems = possibleFrom.map(p => ({
            type: 'piece',
            r: p.r,
            c: p.c,
            text: `Checker at ${coordsToText(p.r, p.c)}`
        }));
    } else {
        const moves = getMovesForPiece(state.selectedPiece.r, state.selectedPiece.c);
        state.scanItems = moves.map(m => ({
            type: 'move',
            r: m.r,
            c: m.c,
            moveData: m,
            text: `Move to ${coordsToText(m.r, m.c)}`
        }));

        state.scanItems.push({
            type: 'cancel',
            text: "Select different piece"
        });
    }
    state.scanIndexV = 0;
}

function getChessPieceName(type) {
    const names = {k:'King', q:'Queen', r:'Rook', b:'Bishop', n:'Knight', p:'Pawn'};
    return names[type] || 'Piece';
}

function getPiecesWithMoves(playerSign) {
    // Checkers Only Helper
    const pieces = [];
    for(let r=0; r<8; r++) {
        for(let c=0; c<8; c++) {
            const val = state.board[r][c];
            if (val !== 0 && Math.sign(val) === Math.sign(playerSign)) {
                if (getMovesForPiece(r, c).length > 0) {
                    pieces.push({r, c});
                }
            }
        }
    }
    const allMoves = [];
    pieces.forEach(p => {
        const moves = getMovesForPiece(p.r, p.c);
        if (moves.some(m => m.isJump)) p.hasJump = true;
    });

    const hasAnyJump = pieces.some(p => p.hasJump);
    if (hasAnyJump) {
        return pieces.filter(p => p.hasJump);
    }
    return pieces;
}

function getMovesForPiece(r, c) {
    const moves = [];
    const piece = state.board[r][c];
    const isKing = Math.abs(piece) === 2;
    const playerDir = Math.sign(piece) === 1 ? -1 : 1; // P1 (val 1) moves UP (-r), P2 (val -1) moves DOWN (+r)

    const directions = [];
    // Regular moves
    if (isKing || Math.sign(piece) === 1) { // Up
        directions.push([-1, -1], [-1, 1]);
    }
    if (isKing || Math.sign(piece) === -1) { // Down
        directions.push([1, -1], [1, 1]);
    }

    // Check simple slides
    directions.forEach(d => {
        const nr = r + d[0];
        const nc = c + d[1];
        if (isValidPos(nr, nc) && state.board[nr][nc] === 0) {
            moves.push({r: nr, c: nc, isJump: false});
        }
    });

    // Check jumps
    directions.forEach(d => {
        const nr = r + d[0];
        const nc = c + d[1];
        const nnr = r + d[0] * 2;
        const nnc = c + d[1] * 2;

        if (isValidPos(nr, nc) && isValidPos(nnr, nnc)) {
            const mid = state.board[nr][nc];
            // If mid piece is opponent
            if (mid !== 0 && Math.sign(mid) !== Math.sign(piece)) {
                if (state.board[nnr][nnc] === 0) {
                    moves.push({
                        r: nnr,
                        c: nnc,
                        isJump: true,
                        captured: {r: nr, c: nc}
                    });
                }
            }
        }
    });

    // Filter non-jumps if jumps exist for THIS piece
    const hasJump = moves.some(m => m.isJump);
    if (hasJump) return moves.filter(m => m.isJump);

    return moves;
}

function isValidPos(r, c) {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function handleCellClick(r, c) {
    if (state.mode !== 'game') return;

    if (state.gameType === 'chess') {
        handleChessClick(r, c);
        return;
    }

    // 1. Is it a piece we can select?
    if (state.board[r][c] !== 0 && Math.sign(state.board[r][c]) === state.turn) {
        // Check if it's in the valid pieces list (forced jumps)
        const validPieces = getPiecesWithMoves(state.turn);
        if (validPieces.some(p => p.r === r && p.c === c)) {
             selectPiece(r, c);
             return;
        } else {
             // Feedback for unselectable pieces
             const moves = getMovesForPiece(r, c);
             if (moves.length === 0) {
                 // Silent or "Blocked"
             } else {
                 // Has moves but not valid -> Mandatory Jump
                 speak("Jump Mandatory.");
                 showTurnNotification("Jump Mandatory!", 1000);
             }
             return;
        }
    }

    // 2. Is it a valid move destination?
    if (state.selectedPiece) {
        const move = state.availableMoves.find(m => m.r === r && m.c === c);
        if (move) {
            executeMove(move);
            return;
        }
    }
}

function handleChessClick(r, c) {
    // Chess selection logic
    const piece = chessGame.getPiece(r, c);
    const turnColor = state.turn === 1 ? 'w' : 'b';

    // Safety check: Don't allow clicking if it's computer turn (and we are single player)
    if (state.gameMode === 'single' && state.turn === state.computerSide) return;

    // Special Helper: Allow Castling by clicking the Rook
    if (state.selectedPiece) {
        const selP = chessGame.getPiece(state.selectedPiece.r, state.selectedPiece.c);
        if (selP && selP.type === 'k' && piece && piece.type === 'r' && piece.color === selP.color) {
            // User clicked King then own Rook. Check for castling move.
            let targetC = -1;
            if (c === 7) targetC = 6; // Kingside
            if (c === 0) targetC = 2; // Queenside

            if (targetC !== -1) {
                const castleMove = state.availableMoves.find(m => m.r === r && m.c === targetC && m.moveData.isCastle);
                if (castleMove) {
                    executeMove(castleMove);
                    return;
                }
            }
        }
    }

    // Logic: Select piece of own turn
    if (piece && piece.color === turnColor) {
        // Deselect or Select New
        selectPiece(r, c);
        return;
    }

    // Execute Move if target
    if (state.selectedPiece) {
        // Target empty or opponent
        const move = state.availableMoves.find(m => m.r === r && m.c === c);
        if (move) {
            executeMove(move);
        }
    }
}

function selectPiece(r, c) {
    state.selectedPiece = {r, c};

    if (state.gameType === 'chess') {
        // Chess Logic
        // Use getValidMoves instead of getMovesForPiece to ensure King safety
        const validMoves = chessGame.getValidMoves(r, c);

        // Map to UI format
        state.availableMoves = validMoves.map(m => ({
            r: m.to.r,
            c: m.to.c,
            moveData: m
        }));
    } else {
        // Checkers Logic
        state.availableMoves = getMovesForPiece(r, c);
    }

    updateGameScanItems(); // Now scanning moves
    renderBoard();

    // Announce
    speak(`Selected ${coordsToText(r,c)}. ${state.availableMoves.length} moves available.`);
    playSound('select');
}

function executeMove(move) {
    if (state.gameType === 'chess') {
        const moveData = move.moveData;
        const captured = moveData.captured;

        chessGame.makeMove(moveData);

        if (captured) playSound('scan'); // Capture sound
        else playSound('move');

        // Announcements
        if (state.gameType === 'chess') {
            if (moveData.isCastle) {
                speak("Castle");
                showTurnNotification("Castling", 2000);
            }
            if (moveData.isEnPassant) {
                speak("En Passant");
            }
        }

        // Promotion Sound?
        if (moveData.promotion) {
             playSound('king');
             speak("Promoted!");
        }

        endTurn();
        return;
    }

    // --- Checkers Logic ---
    const {r, c} = state.selectedPiece;
    const pieceVal = state.board[r][c];

    // Move piece
    state.board[r][c] = 0;
    state.board[move.r][move.c] = pieceVal;

    // Capture
    if (move.isJump && move.captured) {
        state.board[move.captured.r][move.captured.c] = 0;
        playSound('scan'); // Capture sound
    }

    // King Promotion
    let promoted = false;
    // Check if not already a king (absolute value 1 means Man, 2 means King)
    if (Math.abs(pieceVal) === 1) {
        if (Math.sign(pieceVal) === 1 && move.r === 0) {
            state.board[move.r][move.c] = 2; // King P1
            promoted = true;
            playSound('king');
            speak("King Me!");
        } else if (Math.sign(pieceVal) === -1 && move.r === 7) {
            state.board[move.r][move.c] = -2; // King P2
            promoted = true;
            playSound('king');
            speak("King Me!");
        }
    }

    // Multi-jump logic?
    // If it was a jump, check if more jumps are available from new pos.
    let turnEnds = true;
    if (move.isJump && !promoted) {
        // Look for subsequent jumps from move.r, move.c
        const subsequentMoves = getMovesForPiece(move.r, move.c);

        if (subsequentMoves.some(m => m.isJump)) {
             turnEnds = false;
             // Continue turn
             state.selectedPiece = {r: move.r, c: move.c};
             state.availableMoves = subsequentMoves; // filter to jumps (logic inside getMoves handles this if jumps exist)
             state.board[move.r][move.c] = pieceVal; // Ensure board is updated

             updateGameScanItems();
             renderBoard();

             // If Computer Turn, execute next jump immediately
             if (state.gameMode === 'single' && state.turn === -1) {
                 speak("Computer jumping again.");
                 setTimeout(() => {
                     // Pick a random jump if multiple
                     const nextMove = subsequentMoves[Math.floor(Math.random() * subsequentMoves.length)];
                     executeMove(nextMove);
                 }, 500);
             } else {
                 speak("Double Jump available.");
                 playSound('move');
             }
        }
    }

    if (turnEnds) {
        endTurn();
    }
}

function endTurn() {
    // Determine Turn Flip
    if (state.gameType === 'chess') {
        // Chess already flipped in makeMove internal state, but we need to update our global `state.turn`
        // ChessGame.turn is 'w' or 'b'
        state.turn = chessGame.turn === 'w' ? 1 : -1;
    } else {
        state.turn = state.turn === 1 ? -1 : 1;
        playSound('move');
    }

    state.selectedPiece = null;
    state.availableMoves = [];
    state.scanItems = [];
    state.scanIndexV = -1;

    // Clear highlights
    document.querySelectorAll('.cell').forEach(c => {
        c.classList.remove('highlight-outline', 'highlight-full');
        c.style.boxShadow = '';
        c.style.backgroundColor = '';
    });

    // Check Win/Loss
    if (state.gameType === 'chess') {
        // Check for Mate
        const legalMoves = chessGame.getAllMoves(chessGame.turn);
        if (legalMoves.length === 0) {
            if (chessGame.isInCheck(chessGame.turn)) {
                // Checkmate
                const winner = chessGame.turn === 'b' ? "Player 1" : (state.gameMode === 'single' ? "Computer" : "Player 2");
                gameOver(`${winner} Wins by Checkmate!`);
                return;
            } else {
                gameOver("Stalemate! Draw.");
                return;
            }
        }
        else if (chessGame.isInCheck(chessGame.turn)) {
            speak("Check!");
            showTurnNotification("Check!", 1000);
        }
    }
    else {
        // Checkers Win/Loss
        const p1Pieces = countPieces(1);
        const p2Pieces = countPieces(-1);
        const p1Moves = getPiecesWithMoves(1).length;
        const p2Moves = getPiecesWithMoves(-1).length;

        if (p1Pieces === 0 || p1Moves === 0) {
            const winner = (state.gameMode === 'single') ? "Computer" : "Player 2";
            gameOver(`${winner} Wins!`);
            return;
        }
        if (p2Pieces === 0 || p2Moves === 0) {
            gameOver("Player 1 Wins!");
            return;
        }
    }

    renderBoard();

    // Delay for next turn setup
    setTimeout(() => {
        updateGameScanItems();
        state.scanIndexV = -1;

        let playerText = state.turn === 1 ? "Player 1" : "Player 2";
        if (state.gameType === 'chess') {
            playerText = state.turn === 1 ? "White" : "Black";
        }

        if (state.gameMode === 'single') {
             if (state.gameType === 'chess') {
                 if (state.turn === state.computerSide) playerText = "Computer";
             } else {
                 if (state.turn === -1) playerText = "Computer";
             }
        }

        showTurnNotification(`${playerText}'s Turn`);

        // Check Computer Turn
        let isComputerTurn = false;
        if (state.gameMode === 'single') {
             if (state.gameType === 'chess' && state.turn === state.computerSide) isComputerTurn = true;
             else if (state.gameType === 'checkers' && state.turn === -1) isComputerTurn = true;
        }

        if (isComputerTurn) {
            speak("Computer's Turn.");
            // Short delay for computer
            setTimeout(computerMove, 500);
        } else {
            speak(`${playerText}'s Turn.`);
            scanEngine.reset();
            scanEngine.startAutoScan();
        }
    }, 500);
}

function computerMove() {
    if (state.gameType === 'chess') {
        const aiColor = state.computerSide === 1 ? 'w' : 'b';
        // Chess AI
        const bestMove = chessGame.getBestMove(aiColor, 3); // Depth 3
        if (bestMove) {
             const uiMove = { r: bestMove.to.r, c: bestMove.to.c, moveData: bestMove };
             // Emulate UI move structure for executeMove
             executeMove(uiMove);
        } else {
             // Should indicate game over in endTurn
        }
        return;
    }

    // Checkers AI
    const pieces = getPiecesWithMoves(-1);
    if (pieces.length === 0) return;

    const piece = pieces[Math.floor(Math.random() * pieces.length)];
    const moves = getMovesForPiece(piece.r, piece.c);
    const move = moves[Math.floor(Math.random() * moves.length)];

    state.selectedPiece = piece;
    state.availableMoves = moves;
    executeMove(move);
}

function countPieces(sign) {
    let count = 0;
    state.board.forEach(row => row.forEach(val => {
        if (val !== 0 && Math.sign(val) === Math.sign(sign)) count++;
    }));
    return count;
}

function gameOver(msg) {
    state.mode = 'gameover';
    speak("Game Over. " + msg);
    showTurnNotification(msg, 5000); // Show for longer

    // Instead of opening pause menu, wait and go to main menu
    setTimeout(() => {
        speak("Returning to Main Menu");
        showMainMenu();
    }, 4000);
}

function coordsToText(r, c) {
    // Standard notation: A-H for cols, 1-8 for rows
    const cols = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const row = 8 - r;
    return `${cols[c]} ${row}`;
}

// --- Game Item Selection (board scanning) ---

function selectCurrentGameItem() {
    if (state.scanItems.length === 0) return;
    const item = state.scanItems[state.scanIndexV];
    if (item.type === 'piece') {
        handleCellClick(item.r, item.c);
    } else if (item.type === 'move') {
        executeMove(item.moveData);
    } else if (item.type === 'cancel') {
         // Deselect
         state.selectedPiece = null;
         state.availableMoves = [];
         updateGameScanItems();
         renderBoard();
         speak("Selection Cancelled.");
    }
}

// --- Highlighting UI ---

function updateMenuHighlights() {
    // Clear all menu button highlights
    document.querySelectorAll('.menu-button').forEach(b => {
         b.classList.remove('highlight');
         b.style.borderColor = 'transparent';
         // Reset potentially changed styles from "Full Highlight"
         b.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
         b.style.color = '#333';
    });

    let container = state.mode === 'menu' ? 'menu-container' : 'pause-overlay';
    let idx = menuSystem.getSelectedIndex();

    const btn = document.getElementById(`btn-${container}-${idx}`);
    if (!btn) {
         // Fallback
         const c = document.getElementById(container);
         const buttons = c.querySelectorAll('button');
         if (buttons[idx]) {
             highlightMenuButton(buttons[idx]);
         }
    } else {
        highlightMenuButton(btn);
    }
}

function highlightMenuButton(btn) {
    btn.classList.add('highlight');
    const uiColor = highlightRenderer.getColor();

    // Apply Highlight Style (Outline or Full)
    if (highlightRenderer.getStyle() === 'full') {
        btn.style.backgroundColor = uiColor;
        btn.style.color = '#000';
        btn.style.borderColor = 'transparent';
    } else {
        // Outline Style
        btn.style.backgroundColor = 'rgba(255, 255, 255, 0.9)'; // Reset to default
        btn.style.color = '#333'; // Reset
        btn.style.borderColor = uiColor;
        btn.style.borderWidth = '6px';
    }
}

function updateGameHighlights() {
    // Clear old highlights on board
    document.querySelectorAll('.cell').forEach(c => {
        c.classList.remove('highlight-outline', 'highlight-full');
        c.style.boxShadow = ''; // Clear inline box shadow
        c.style.backgroundColor = ''; // Clear inline background color from full highlight
    });

    if (state.scanItems.length === 0) return;
    const item = state.scanItems[state.scanIndexV];
    if (!item) return;

    let targetR, targetC;

    if (item.type === 'cancel') {
        // Highlight the selectedPiece to indicate "Cancel / Back to Piece"
        if (state.selectedPiece) {
            targetR = state.selectedPiece.r;
            targetC = state.selectedPiece.c;
        } else {
            return;
        }
    } else if (item.r !== undefined && item.c !== undefined) {
        targetR = item.r;
        targetC = item.c;
    }

    if (targetR !== undefined && targetC !== undefined) {
        const cell = document.getElementById(`cell-${targetR}-${targetC}`);
        if(cell) {
             const style = highlightRenderer.getStyle();
             cell.classList.add(style === 'full' ? 'highlight-full' : 'highlight-outline');
             let color = highlightRenderer.getColor();

             cell.style.setProperty('--highlight-color', color);

             if (style === 'full') {
                 cell.style.backgroundColor = color;
             } else {
                 // Increased thickness from 5px to 8px for better visibility
                 cell.style.boxShadow = `inset 0 0 0 10px ${color}`;
             }
        }
    }
}

// --- TTS & Announcements ---

function speak(text) {
    if (window.NarbeVoiceManager) {
        window.NarbeVoiceManager.speak(text);
    } else if (settings.tts && 'speechSynthesis' in window) {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        speechSynthesis.speak(u);
    }
}

function announceCurrentMenuItem() {
    const items = menuSystem.getCurrentItems();
    const idx = menuSystem.getSelectedIndex();
    const item = items ? items[idx] : null;

    if (item) {
        let t = typeof item.text === 'function' ? item.text() : item.text;
        // Strip HTML tag for clean TTS (removes swatch span etc)
        t = t.replace(/<[^>]*>?/gm, '');
        speak(t);
    }
}

function announceCurrentGameItem() {
    if (state.scanItems.length === 0) return;
    const item = state.scanItems[state.scanIndexV];
    if (item && item.text) {
        speak(item.text);
    }
}

function showTurnNotification(text, duration = 1500) {
    const el = document.getElementById('status-display');
    if (!el) return;
    el.innerText = text;
    el.classList.add('visible');

    // Clear existing timeout if any to prevent hiding early
    if (state.timers.status) clearTimeout(state.timers.status);

    state.timers.status = setTimeout(() => {
        el.classList.remove('visible');
    }, duration);
}

// Toggle between Checkers and Chess
function toggleGameType() {
    state.gameType = state.gameType === 'checkers' ? 'chess' : 'checkers';
    saveSettings();
    refreshCurrentMenu();
    speak(`Game changed to ${state.gameType}`);
}
