/**
 * iOS/Mobile Audio — Lazy per-game AudioContext unlock
 *
 * Previous approaches unlocked ALL AudioContexts globally on any keydown.
 * This stole the iOS audio session from speechSynthesis (Web Speech API),
 * breaking TTS — which is load-bearing for accessibility.
 *
 * New approach:
 *   - Do NOT pre-unlock AudioContext on keydown globally
 *   - Each game calls NarBeIOSAudio.tryUnlock(ctx, callback) when it
 *     actually needs to play a sound
 *   - tryUnlock defers if speechSynthesis is currently speaking, so TTS
 *     is never interrupted
 *   - speechSynthesis warm-up (silent utterance) still happens on first
 *     user gesture — that's safe and needed on iOS
 *
 * Exports:
 *   window.NarBeIOSAudio.tryUnlock(audioContext, callback)
 *   window.NarbeAudioHelper.play(url, volume)  — backward compat helper
 */
(function() {
    'use strict';

    if (window.NarbeAudioFixLoaded) return;
    window.NarbeAudioFixLoaded = true;

    // ---- Speech warm-up on first interaction (does NOT touch AudioContext) ----
    let speechWarmedUp = false;

    function warmUpSpeech() {
        if (speechWarmedUp) return;
        speechWarmedUp = true;

        if (window.speechSynthesis && !window.speechSynthesis.speaking) {
            const silent = new SpeechSynthesisUtterance('');
            silent.volume = 0;
            silent.rate = 10;
            window.speechSynthesis.speak(silent);
        }

        // Remove listeners after first interaction
        ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'].forEach(evt =>
            document.removeEventListener(evt, warmUpSpeech, true)
        );
    }

    ['touchstart', 'touchend', 'mousedown', 'keydown', 'click'].forEach(evt =>
        document.addEventListener(evt, warmUpSpeech, { capture: true, passive: true })
    );

    // ---- Lazy per-game AudioContext unlock ----

    /**
     * NarBeIOSAudio.tryUnlock(audioContext, callback)
     *
     * Safely resumes an AudioContext without interfering with TTS.
     *
     * - If audioContext.state is already 'running': calls callback immediately.
     * - If speechSynthesis is currently speaking: waits until speech ends,
     *   then resumes the context and calls callback.
     * - Otherwise: resumes the context, then calls callback.
     *
     * @param {AudioContext} audioContext - The game's own AudioContext
     * @param {Function} callback - Called once the context is running (or best-effort)
     */
    function tryUnlock(audioContext, callback) {
        if (!audioContext) {
            if (callback) callback();
            return;
        }

        // Already running — just go
        if (audioContext.state === 'running') {
            if (callback) callback();
            return;
        }

        // If TTS is actively speaking, defer so we don't steal the audio session
        if (window.speechSynthesis && window.speechSynthesis.speaking) {
            _deferUntilSpeechEnds(audioContext, callback);
            return;
        }

        // Not speaking — safe to resume now
        _resumeAndCallback(audioContext, callback);
    }

    function _resumeAndCallback(audioContext, callback) {
        if (audioContext.state === 'running') {
            if (callback) callback();
            return;
        }
        audioContext.resume().then(function() {
            if (callback) callback();
        }).catch(function() {
            // Best effort — call callback anyway so game logic isn't stuck
            if (callback) callback();
        });
    }

    function _deferUntilSpeechEnds(audioContext, callback) {
        // Poll every 50ms for up to 5s. If speech doesn't end, proceed anyway.
        var attempts = 0;
        var maxAttempts = 100; // 5 seconds
        var timer = setInterval(function() {
            attempts++;
            if (!window.speechSynthesis.speaking || attempts >= maxAttempts) {
                clearInterval(timer);
                _resumeAndCallback(audioContext, callback);
            }
        }, 50);
    }

    window.NarBeIOSAudio = {
        tryUnlock: tryUnlock
    };

    // ---- NarbeAudioHelper: backward-compatible file playback helper ----
    // Uses its own AudioContext lazily, and routes through tryUnlock
    // so it won't interfere with TTS.

    let sharedCtx = null;
    const bufferCache = new Map();

    async function loadBuffer(url, ctx) {
        if (bufferCache.has(url)) return bufferCache.get(url);
        try {
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            bufferCache.set(url, audioBuffer);
            return audioBuffer;
        } catch (e) {
            console.error('Failed to load audio:', url, e);
            return null;
        }
    }

    function getSharedCtx() {
        if (sharedCtx) return sharedCtx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        sharedCtx = new AC();
        return sharedCtx;
    }

    window.NarbeAudioHelper = {
        play: function(url, volume) {
            if (typeof volume !== 'number') volume = 1.0;
            var ctx = getSharedCtx();
            if (!ctx) return;

            var controller = {
                source: null,
                stop: function() {
                    try { if (this.source) this.source.stop(); } catch(e){}
                    this.source = null;
                    this.stopped = true;
                },
                stopped: false
            };

            // Use tryUnlock to ensure context is running before playing
            tryUnlock(ctx, function() {
                loadBuffer(url, ctx).then(function(buffer) {
                    if (!buffer || controller.stopped) return;
                    var source = ctx.createBufferSource();
                    source.buffer = buffer;
                    var gain = ctx.createGain();
                    gain.gain.value = volume;
                    source.connect(gain);
                    gain.connect(ctx.destination);
                    source.onended = function() { controller.source = null; };
                    source.start(0);
                    controller.source = source;
                });
            });

            return controller;
        },
        resumeAll: function() {
            // No-op for backward compat. Games should use tryUnlock instead.
        }
    };

})();
