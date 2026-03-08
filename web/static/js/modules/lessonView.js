import { CodeEditor } from './codeEditor.js';
import { CodeRunner } from './codeRunner.js';
import { Progress } from './progress.js';
import { Gamification } from './gamification.js';
import { GameState } from './gameState.js';
import { Inventory, ITEM_DEFS } from './inventory.js';

const dataEl = document.getElementById('lesson-data');
if (!dataEl) throw new Error('No lesson data found');

const lessonData = JSON.parse(dataEl.textContent);
const progress = new Progress();
const gamification = new Gamification(progress);
const gameState = new GameState(progress);
const inventory = new Inventory(gameState);
const runner = new CodeRunner();

const TAB_ORDER = ['learn', 'compare', 'practice', 'challenge', 'test'];
const TUTORIAL_TABS = ['learn', 'compare'];
const EDITOR_TABS = ['practice', 'challenge', 'test'];
let currentStep = 0;

// DEV MODE: unlock all tabs for testing
const DEV_MODE = true;

const TIP_ICONS = {
    gotcha: '\u26A0\uFE0F',
    remember: '\u{1F4CC}',
    protip: '\u{1F4A1}',
    warning: '\u{1F6A8}',
};

// ============================================
// LESSON INTRO MODAL
// ============================================
let introActive = true;

function initIntro() {
    const overlay = document.getElementById('lesson-intro');
    if (!overlay) { introActive = false; return; }

    const saved = progress.getLessonState(lessonData.slug);
    if (saved.learnDone) {
        overlay.style.display = 'none';
        overlay.classList.add('hidden');
        introActive = false;
        startLesson();
        return;
    }

    const ready = document.getElementById('btn-intro-ready');
    const skip = document.getElementById('btn-intro-skip');

    function dismiss() {
        overlay.classList.add('closing');
        setTimeout(() => {
            overlay.classList.add('hidden');
            overlay.style.display = 'none';
            introActive = false;
            startLesson();
        }, 450);
    }

    if (ready) ready.addEventListener('click', dismiss);
    if (skip) skip.addEventListener('click', dismiss);
}

// ============================================
// WEB AUDIO — pleasant sounds
// ============================================
let audioCtx = null;
let soundMode = 'type';
let audioUnlocked = false;

function getAudioCtx() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    getAudioCtx();
    document.removeEventListener('click', unlockAudio);
    document.removeEventListener('keydown', unlockAudio);
}
document.addEventListener('click', unlockAudio, { once: false });
document.addEventListener('keydown', unlockAudio, { once: false });

function playTypeSound() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    const notes = [523, 587, 659, 784, 880];
    osc.frequency.value = notes[Math.floor(Math.random() * notes.length)];
    gain.gain.setValueAtTime(0.015, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
}

function playSuccessSound() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.08, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.5);
    });
}

function playErrorSound() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
}

function playTabCompleteSound() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    [784, 988, 1175].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.1;
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.35);
    });
}

function speakText(text) {
    if (soundMode !== 'voice' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 0.85;
    utter.pitch = 0.7;
    utter.volume = 0.8;
    utter.onstart = () => { if (wizard) wizard.classList.add('talking'); };
    utter.onend = () => { if (wizard) wizard.classList.remove('talking'); };
    window.speechSynthesis.speak(utter);
}

// ============================================
// JOURNEY WORLD
// ============================================
const WAYPOINT_POSITIONS = [8, 27, 46, 65, 84];

function updateJourneyWorld(completedStep) {
    for (let i = 0; i <= completedStep && i < 5; i++) {
        const wp = document.getElementById(`wp-${i}`);
        if (wp) wp.classList.add('reached');
        const bld = document.getElementById(`building-${i}`);
        if (bld) bld.classList.add('visible');
    }

    const character = document.getElementById('journey-character');
    if (character) {
        const targetPos = completedStep >= 0 ? WAYPOINT_POSITIONS[Math.min(completedStep, 4)] : 5;
        character.style.left = targetPos + '%';
    }

    const status = document.getElementById('journey-status');
    if (status) {
        if (completedStep >= 4) {
            status.textContent = 'Quest Complete!';
            status.className = 'journey-status status-success';
        } else if (completedStep >= 0) {
            const labels = ['Learned', 'Compared', 'Practiced', 'Challenged', 'Tested'];
            status.textContent = `${labels[completedStep]} - ${completedStep + 1}/5`;
        } else {
            status.textContent = 'Begin your quest!';
        }
    }
}

// ============================================
// WIZARD CONTROLLER
// ============================================
const wizard = document.getElementById('wizard-container');
const speechBubble = document.getElementById('wizard-speech');
const speechText = document.getElementById('wizard-speech-text');
const speechClose = document.getElementById('wizard-speech-close');
const speechAction = document.getElementById('wizard-speech-action');
const soundToggle = document.getElementById('wizard-sound-toggle');

let wizardTypingInterval = null;
let wizardAutoHideTimer = null;
let wizardRoamTimer = null;
let isUserDragging = false;
let roamingActive = false;

const ROAM_POSITIONS = [
    { top: '70px', left: '30px', right: 'auto', bottom: 'auto' },
    { top: '70px', right: '30px', left: 'auto', bottom: 'auto' },
    { top: '50%', left: '30px', right: 'auto', bottom: 'auto' },
    { top: '50%', right: '30px', left: 'auto', bottom: 'auto' },
    { bottom: '260px', left: '30px', right: 'auto', top: 'auto' },
    { bottom: '260px', right: '30px', left: 'auto', top: 'auto' },
    { bottom: '60px', left: '50%', right: 'auto', top: 'auto' },
    { bottom: '60px', right: '24px', left: 'auto', top: 'auto' },
];

const ROAM_MESSAGES = [
    "Read the explanation carefully before moving on!",
    "Compare the Node.js and Go syntax - spot the differences!",
    "Practice makes perfect. Try writing the code yourself!",
    "You're doing great, keep up the good work!",
    "The Challenge will test what you've learned.",
    "Run the tests to prove your mastery!",
    "Check the Mission panel for objectives!",
    "Each completed step builds your skills!",
    "I believe in you, young Gopher!",
    "Go is elegant and powerful. You'll love it!",
];

const TAB_MESSAGES = {
    learn: "Read through the explanation carefully. Understanding the concept is the first step to mastery!",
    compare: "Look at both code samples side by side. Notice how Go handles things differently from Node.js!",
    practice: "Time to write some Go code! Click Run Code to see your output. Don't be afraid of errors!",
    challenge: "Apply what you've learned to solve this challenge. You can do it!",
    test: "The final test! Run the tests to prove you've mastered this concept.",
};

function initWizard() {
    if (!wizard) return;

    if (soundToggle) {
        soundToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            if (soundMode === 'type') {
                soundMode = 'voice';
                soundToggle.textContent = '\u{1F50A} Voice On';
            } else {
                soundMode = 'type';
                soundToggle.textContent = '\u{1F508} Type';
            }
        });
    }

    if (speechClose) {
        speechClose.addEventListener('click', (e) => {
            e.stopPropagation();
            wizardHide();
        });
    }

    wizard.addEventListener('click', (e) => {
        if (e.target.closest('.wizard-speech') || e.target === soundToggle) return;
        const tab = TAB_ORDER[currentStep] || 'learn';
        wizardSay(TAB_MESSAGES[tab] || "Keep going!");
    });

    initWizardDrag();
    setTimeout(() => startWizardRoaming(), 8000);
}

function wizardSay(text, actionText, actionCb) {
    if (!wizard || !speechBubble || !speechText) return;

    clearInterval(wizardTypingInterval);
    clearTimeout(wizardAutoHideTimer);

    wizard.classList.add('talking');
    speechBubble.style.display = 'block';
    speechText.textContent = '';

    // Clean up old action handler
    if (speechAction) {
        speechAction.style.display = 'none';
        speechAction.replaceWith(speechAction.cloneNode(true));
    }
    // Re-grab reference after clone (removes all old listeners)
    const freshAction = document.getElementById('wizard-speech-action');

    if (soundMode === 'voice') {
        speakText(text);
    }

    const hasAction = !!(actionText && actionCb);

    let i = 0;
    wizardTypingInterval = setInterval(() => {
        if (i < text.length) {
            speechText.textContent += text[i];
            if (soundMode === 'type') playTypeSound();
            i++;
        } else {
            clearInterval(wizardTypingInterval);
            if (soundMode !== 'voice') {
                wizard.classList.remove('talking');
            }

            if (hasAction && freshAction) {
                freshAction.textContent = actionText;
                freshAction.style.display = 'inline-block';
                freshAction.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    try { actionCb(); } catch (err) { console.error('Wizard action error:', err); }
                    wizardHide();
                }, { once: true });
            }
        }
    }, 25);

    // Don't auto-hide if there's an action button — user needs time to click
    if (hasAction) {
        wizardAutoHideTimer = setTimeout(() => wizardHide(), 60000);
    } else {
        wizardAutoHideTimer = setTimeout(() => wizardHide(), 12000);
    }
}

function wizardHide() {
    if (!speechBubble) return;
    clearInterval(wizardTypingInterval);
    clearTimeout(wizardAutoHideTimer);
    wizard.classList.remove('talking');
    speechBubble.style.display = 'none';
    speechText.textContent = '';
    const act = document.getElementById('wizard-speech-action');
    if (act) {
        act.style.display = 'none';
    }
    if (soundMode === 'voice' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
}

function wizardCelebrate() {
    if (!wizard) return;
    wizard.classList.add('celebrating');
    playSuccessSound();
    setTimeout(() => wizard.classList.remove('celebrating'), 1500);
}

function wizardError() {
    if (!wizard) return;
    wizard.classList.add('error-state');
    playErrorSound();
    setTimeout(() => wizard.classList.remove('error-state'), 800);
}

function startWizardRoaming() {
    if (roamingActive) return;
    roamingActive = true;

    function roam() {
        if (isUserDragging) return;
        const pos = ROAM_POSITIONS[Math.floor(Math.random() * ROAM_POSITIONS.length)];

        wizard.classList.add('roaming');
        wizard.style.top = pos.top;
        wizard.style.left = pos.left;
        wizard.style.right = pos.right;
        wizard.style.bottom = pos.bottom;

        if (Math.random() < 0.35) {
            const msg = ROAM_MESSAGES[Math.floor(Math.random() * ROAM_MESSAGES.length)];
            setTimeout(() => wizardSay(msg), 2800);
        }

        setTimeout(() => wizard.classList.remove('roaming'), 3000);
    }

    wizardRoamTimer = setInterval(roam, 22000 + Math.random() * 15000);
}

function initWizardDrag() {
    if (!wizard) return;
    let startX, startY, startLeft, startTop;
    let dragging = false;

    wizard.addEventListener('mousedown', (e) => {
        if (e.target.closest('.wizard-speech') || e.target === soundToggle) return;
        dragging = true;
        isUserDragging = true;
        wizard.classList.add('dragging');
        wizard.classList.remove('roaming');

        const rect = wizard.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;

        wizard.style.left = rect.left + 'px';
        wizard.style.top = rect.top + 'px';
        wizard.style.right = 'auto';
        wizard.style.bottom = 'auto';

        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!dragging) return;
        wizard.style.left = (startLeft + (e.clientX - startX)) + 'px';
        wizard.style.top = (startTop + (e.clientY - startY)) + 'px';
        wizard.style.right = 'auto';
        wizard.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
        if (!dragging) return;
        dragging = false;
        wizard.classList.remove('dragging');
        setTimeout(() => { isUserDragging = false; }, 30000);
    });

    wizard.addEventListener('touchstart', (e) => {
        if (e.target.closest('.wizard-speech') || e.target === soundToggle) return;
        const touch = e.touches[0];
        dragging = true;
        isUserDragging = true;
        wizard.classList.add('dragging');
        wizard.classList.remove('roaming');

        const rect = wizard.getBoundingClientRect();
        startX = touch.clientX;
        startY = touch.clientY;
        startLeft = rect.left;
        startTop = rect.top;

        wizard.style.left = rect.left + 'px';
        wizard.style.top = rect.top + 'px';
        wizard.style.right = 'auto';
        wizard.style.bottom = 'auto';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
        if (!dragging) return;
        const touch = e.touches[0];
        wizard.style.left = (startLeft + (touch.clientX - startX)) + 'px';
        wizard.style.top = (startTop + (touch.clientY - startY)) + 'px';
        wizard.style.right = 'auto';
        wizard.style.bottom = 'auto';
    }, { passive: true });

    document.addEventListener('touchend', () => {
        if (!dragging) return;
        dragging = false;
        wizard.classList.remove('dragging');
        setTimeout(() => { isUserDragging = false; }, 30000);
    });
}

// ============================================
// SIDEBAR CARD COLLAPSE
// ============================================
function initSidebarCards() {
    document.querySelectorAll('.sidebar-card-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('collapsed');
        });
    });
}

// ============================================
// CONSOLE
// ============================================
function consolePrint(msg, type = '') {
    const out = document.getElementById('console-output');
    if (!out) return;
    const line = document.createElement('div');
    line.className = 'console-line' + (type ? ' ' + type : '');
    line.innerHTML = `<span class="prompt">$</span> ${msg}`;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
}

function initConsole() {
    const clearBtn = document.querySelector('.panel-clear-console');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            const out = document.getElementById('console-output');
            if (out) out.innerHTML = '<div class="console-line info"><span class="prompt">$</span> Console cleared.</div>';
        });
    }
}

// ============================================
// TAB SYSTEM — Split panels
// Tutorial panel: learn, compare
// Editor panel: practice, challenge, test
// ============================================
function handleTabView(tabName) {
    if (introActive) return;

    const idx = TAB_ORDER.indexOf(tabName);
    if (idx === -1) return;

    currentStep = idx;

    const isTutorialTab = TUTORIAL_TABS.includes(tabName);
    const isEditorTab = EDITOR_TABS.includes(tabName);

    if (isTutorialTab) {
        // Activate tab in tutorial panel
        document.querySelectorAll('#tutorial-tab-bar .panel-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        // Show correct panel in tutorial
        const tutorialContent = document.querySelector('.tutorial-panel .panel-content');
        if (tutorialContent) {
            tutorialContent.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            const panel = document.getElementById(`tab-${tabName}`);
            if (panel) panel.classList.add('active');
        }
    }

    if (isEditorTab) {
        // Hide placeholder, show editor tab
        const placeholder = document.getElementById('tab-editor-placeholder');
        if (placeholder) placeholder.classList.remove('active');

        // Activate tab in editor panel
        document.querySelectorAll('#editor-tab-bar .panel-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        // Show correct panel in editor
        const editorContent = document.querySelector('.editor-panel .panel-content');
        if (editorContent) {
            editorContent.querySelectorAll('.tab-panel').forEach(p => {
                if (p.id !== 'tab-editor-placeholder') {
                    p.classList.remove('active');
                }
            });
            const panel = document.getElementById(`tab-${tabName}`);
            if (panel) panel.classList.add('active');
        }

        // Refresh CodeMirror editors
        if (tabName === 'practice' && window._practiceEditor) {
            setTimeout(() => window._practiceEditor.refresh(), 50);
        }
        if (tabName === 'challenge' && window._challengeEditor) {
            setTimeout(() => window._challengeEditor.refresh(), 50);
        }
        if (tabName === 'test' && window._testEditor) {
            setTimeout(() => window._testEditor.refresh(), 50);
        }
    }

    // Highlight active quest
    document.querySelectorAll('.quest-item').forEach(q => q.classList.remove('active'));
    const qi = document.getElementById(`quest-${tabName}`);
    if (qi) qi.classList.add('active');

    // Update editor status
    const status = document.getElementById('editor-status');
    if (status) {
        if (isEditorTab) {
            status.textContent = tabName.charAt(0).toUpperCase() + tabName.slice(1);
            status.style.color = 'var(--accent-go)';
        } else {
            status.textContent = 'Waiting...';
            status.style.color = 'var(--text-muted)';
        }
    }

    consolePrint(`Switched to: ${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`, 'info');
}

function markQuestDone(tabName) {
    const qc = document.getElementById(`qc-${tabName}`);
    if (qc) qc.classList.add('done');
    const qi = document.getElementById(`quest-${tabName}`);
    if (qi) qi.classList.add('done');
}

// ============================================
// GUIDED LEARN — paginated reader
// ============================================
let learnPage = 0;
let learnTotalPages = 0;

function initLearnGuide() {
    const pages = document.querySelectorAll('#learn-pages .learn-page');
    learnTotalPages = pages.length;
    if (learnTotalPages === 0) return;

    const dotsContainer = document.getElementById('learn-dots');
    const btnNext = document.getElementById('btn-learn-next');
    const btnPrev = document.getElementById('btn-learn-prev');
    const btnDone = document.getElementById('btn-learn-done');

    if (dotsContainer) {
        for (let i = 0; i < learnTotalPages; i++) {
            const dot = document.createElement('span');
            dot.className = 'learn-dot' + (i === 0 ? ' active' : '');
            dot.dataset.page = i;
            dot.addEventListener('click', () => showLearnPage(i));
            dotsContainer.appendChild(dot);
        }
    }

    function showLearnPage(idx) {
        learnPage = idx;
        pages.forEach((p, i) => {
            p.classList.remove('active', 'exit-left');
            if (i < idx) p.classList.add('exit-left');
            else if (i === idx) p.classList.add('active');
        });
        document.querySelectorAll('.learn-dot').forEach((d, i) => {
            d.classList.toggle('active', i === idx);
            d.classList.toggle('done', i < idx);
        });
        if (btnPrev) btnPrev.style.display = idx > 0 ? '' : 'none';
        if (btnNext) btnNext.style.display = idx < learnTotalPages - 1 ? '' : 'none';
        if (btnDone) btnDone.style.display = idx === learnTotalPages - 1 ? '' : 'none';

        if (window.Prism) Prism.highlightAll();
    }

    if (btnNext) btnNext.addEventListener('click', (e) => {
        e.preventDefault();
        if (learnPage < learnTotalPages - 1) showLearnPage(learnPage + 1);
    });
    if (btnPrev) btnPrev.addEventListener('click', (e) => {
        e.preventDefault();
        if (learnPage > 0) showLearnPage(learnPage - 1);
    });

    showLearnPage(0);
}

// ============================================
// COMPARE — sequential reveal (3 steps)
// ============================================
let compareStep = 0;

function initCompareGuide() {
    const grid = document.getElementById('compare-grid');
    const nodePane = document.getElementById('compare-node-pane');
    const goPane = document.getElementById('compare-go-pane');
    const btnNext = document.getElementById('btn-compare-next');
    const btnPrev = document.getElementById('btn-compare-prev');
    const btnDone = document.getElementById('btn-compare-done');
    const stepLabel = document.getElementById('compare-step-text');
    const stepNum = document.getElementById('compare-step-num');

    if (!grid || !nodePane || !goPane) return;

    const steps = [
        { label: "Here's the Node.js version you already know", showNode: true, showGo: false, sideBySide: false },
        { label: "Now see how Go handles the same thing", showNode: false, showGo: true, sideBySide: false },
        { label: "Compare them side by side!", showNode: true, showGo: true, sideBySide: true },
    ];

    function showCompareStep(idx) {
        compareStep = idx;
        const step = steps[idx];

        if (stepLabel) stepLabel.textContent = step.label;
        if (stepNum) stepNum.textContent = idx + 1;

        if (step.sideBySide) {
            grid.className = 'compare-panel-grid side-by-side';
            nodePane.classList.remove('hidden-pane');
            goPane.classList.remove('hidden-pane');
        } else {
            grid.className = 'compare-panel-grid single-mode';
            nodePane.classList.toggle('hidden-pane', !step.showNode);
            goPane.classList.toggle('hidden-pane', !step.showGo);
        }

        if (btnPrev) btnPrev.style.display = idx > 0 ? '' : 'none';
        if (btnNext) {
            btnNext.style.display = idx < 2 ? '' : 'none';
            btnNext.textContent = idx === 0 ? 'Show Go Version \u25B6' : 'Side by Side \u25B6';
        }
        if (btnDone) btnDone.style.display = idx === 2 ? '' : 'none';

        if (window.Prism) Prism.highlightAll();
    }

    if (btnNext) btnNext.addEventListener('click', (e) => {
        e.preventDefault();
        if (compareStep < 2) showCompareStep(compareStep + 1);
    });
    if (btnPrev) btnPrev.addEventListener('click', (e) => {
        e.preventDefault();
        if (compareStep > 0) showCompareStep(compareStep - 1);
    });

    showCompareStep(0);
}

// ============================================
// COMPLETE TAB — mark done and move to next
// ============================================
function completeCurrentTab(nextTab) {
    try {
        const currentTab = TAB_ORDER[currentStep];
        consolePrint(`Completing: ${currentTab} → ${nextTab}`, 'info');

        markQuestDone(currentTab);

        // Mark tab button as completed in the correct panel
        const tabBtn = document.querySelector(`.panel-tab[data-tab="${currentTab}"]`);
        if (tabBtn) {
            tabBtn.classList.remove('active');
            tabBtn.classList.add('completed');
        }

        // Unlock next tab
        const nextBtn = document.querySelector(`.panel-tab[data-tab="${nextTab}"]`);
        if (nextBtn) nextBtn.classList.remove('locked');

        updateJourneyWorld(currentStep);
        playTabCompleteSound();
        wizardCelebrate();
        consolePrint(`Completed: ${currentTab}`, 'success');

        try {
            const state = progress.getLessonState(lessonData.slug);
            state[currentTab + 'Done'] = true;
            progress.saveLessonState(lessonData.slug, state);
        } catch (e) {
            console.warn('Progress save failed:', e);
        }

        setTimeout(() => {
            try {
                handleTabView(nextTab);
            } catch (e) {
                console.error('handleTabView failed:', e);
                // Force-switch as fallback
                const panel = document.getElementById(`tab-${nextTab}`);
                if (panel) panel.classList.add('active');
            }
        }, 300);
    } catch (err) {
        console.error('completeCurrentTab error:', err);
        // Fallback: just navigate
        setTimeout(() => handleTabView(nextTab), 100);
    }
}

function initTabSystem() {
    // Tab click handlers — both panels
    document.querySelectorAll('.panel-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            if (!DEV_MODE && btn.classList.contains('locked')) return;
            handleTabView(tab);
        });
    });

    // Next-tab buttons (btn-next-tab class)
    document.querySelectorAll('.btn-next-tab').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const nextTab = btn.dataset.next;
            consolePrint(`Button clicked: → ${nextTab}`, 'info');
            if (nextTab) {
                completeCurrentTab(nextTab);
            }
        });
    });

    // In DEV_MODE, unlock all tabs
    if (DEV_MODE) {
        document.querySelectorAll('.panel-tab').forEach(btn => {
            btn.classList.remove('locked');
        });
    }
}

// ============================================
// CODE EDITORS & RUNNERS
// ============================================
function initEditors() {
    if (document.getElementById('practice-editor') && lessonData.goCode) {
        // Add helpful comments to practice code
        let practiceCode = lessonData.goCode;
        if (!practiceCode.startsWith('//')) {
            practiceCode = `// PRACTICE: ${lessonData.title || 'Go Code'}\n// Try running this code, then modify it to experiment!\n// Click "Run Code" to see the output in the Console below.\n\n` + practiceCode;
        }
        window._practiceEditor = new CodeEditor('practice-editor', {
            mode: 'text/x-go',
            initialValue: practiceCode,
            theme: 'dracula'
        });

        // Update practice guide with lesson-specific info
        const guide = document.getElementById('practice-guide');
        if (guide && lessonData.explanation) {
            guide.innerHTML = `Study the Go code below for <strong>${lessonData.title || 'this concept'}</strong>. Try changing values and re-running to understand how it works.`;
        }
    }

    if (document.getElementById('challenge-editor')) {
        let challengeCode = lessonData.challengeStart || lessonData.goCode || '// Write your solution here\npackage main\n\nfunc main() {\n}\n';
        // Add challenge comments
        if (!challengeCode.startsWith('// CHALLENGE')) {
            challengeCode = `// CHALLENGE: Solve the task described above\n// Modify this code to match the requirements, then click "Submit"\n\n` + challengeCode;
        }
        window._challengeEditor = new CodeEditor('challenge-editor', {
            mode: 'text/x-go',
            initialValue: challengeCode,
            theme: 'dracula'
        });

        // Update challenge guide
        const cGuide = document.getElementById('challenge-guide');
        if (cGuide && lessonData.challengePrompt) {
            cGuide.innerHTML = `Read the challenge prompt below, then modify the code to solve it. Click <strong>Submit</strong> to check.`;
        }
    }

    if (document.getElementById('test-editor') && lessonData.testCode) {
        window._testEditor = new CodeEditor('test-editor', {
            mode: 'text/x-go',
            initialValue: lessonData.testCode,
            theme: 'dracula',
            readOnly: true
        });
    } else {
        // Show fallback when no test code
        const testFallback = document.getElementById('test-fallback');
        const testEditorDiv = document.getElementById('test-editor');
        if (testFallback) testFallback.style.display = 'flex';
        if (testEditorDiv) testEditorDiv.style.display = 'none';
    }

    const promptEl = document.getElementById('challenge-prompt');
    if (promptEl) {
        if (lessonData.challengePrompt) {
            promptEl.textContent = lessonData.challengePrompt;
        } else {
            promptEl.textContent = `Modify the code to demonstrate your understanding of ${lessonData.title || 'this concept'}. Make changes, then click Submit.`;
        }
    }

    // Update test guide with lesson context
    const testGuide = document.getElementById('test-guide');
    if (testGuide) {
        if (lessonData.testCode) {
            testGuide.innerHTML = `The test below verifies your <strong>${lessonData.title || 'code'}</strong> solution. Click <strong>Run Tests</strong> — all tests must pass to complete this lesson!`;
        } else {
            testGuide.innerHTML = `Click <strong>Run Tests</strong> to verify your <strong>${lessonData.title || 'code'}</strong> runs correctly. Your code from the Challenge tab will be tested.`;
        }
    }
}

function initRunButtons() {
    // Run (practice)
    const btnRun = document.getElementById('btn-run');
    if (btnRun) {
        btnRun.addEventListener('click', async () => {
            if (!window._practiceEditor) return;
            const code = window._practiceEditor.getValue();
            consolePrint('Running code...', 'info');
            btnRun.disabled = true;
            try {
                const result = await runner.run(code);
                if (result.error) {
                    consolePrint(`Error: ${result.error}`, 'error');
                    wizardError();
                    wizardSay("Hmm, there's an error. Check the console and try again!");
                } else {
                    consolePrint(result.output || '(no output)', 'success');
                    wizardCelebrate();
                    wizardSay("Your code ran! Ready to try the challenge?", "Challenge \u25B6", () => {
                        completeCurrentTab('challenge');
                    });
                }
            } catch (err) {
                consolePrint(`Failed: ${err.message}`, 'error');
                wizardError();
            }
            btnRun.disabled = false;
        });
    }

    // Reset (practice)
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (window._practiceEditor && lessonData.goCode) {
                window._practiceEditor.setValue(lessonData.goCode);
                consolePrint('Code reset to original.', 'warning');
            }
        });
    }

    // Solution
    const btnSolution = document.getElementById('btn-solution');
    if (btnSolution) {
        btnSolution.addEventListener('click', () => {
            if (window._practiceEditor && lessonData.goCode) {
                window._practiceEditor.setValue(lessonData.goCode);
                consolePrint('Solution loaded.', 'info');
                wizardSay("Here's the solution. Study it carefully!");
            }
        });
    }

    // Challenge run
    const btnChallengeRun = document.getElementById('btn-challenge-run');
    if (btnChallengeRun) {
        btnChallengeRun.addEventListener('click', async () => {
            if (!window._challengeEditor) return;
            const code = window._challengeEditor.getValue();
            consolePrint('Submitting challenge...', 'info');
            btnChallengeRun.disabled = true;
            try {
                const result = await runner.run(code);
                const resultEl = document.getElementById('challenge-result');
                if (result.error) {
                    consolePrint(`Challenge Error: ${result.error}`, 'error');
                    if (resultEl) {
                        resultEl.classList.remove('hidden');
                        resultEl.innerHTML = `<div style="color:var(--accent-error)">Error: ${result.error}</div>`;
                    }
                    wizardError();
                    wizardSay("Not quite right. Read the error and try again!");
                } else {
                    consolePrint(`Challenge Output: ${result.output || '(no output)'}`, 'success');
                    if (resultEl) {
                        resultEl.classList.remove('hidden');
                        resultEl.innerHTML = `<div style="color:var(--accent-success)">Output: ${result.output || '(no output)'}</div>`;
                    }
                    const toTest = document.getElementById('btn-to-test');
                    if (toTest) toTest.classList.remove('hidden');
                    wizardCelebrate();
                    wizardSay("Excellent! Now prove it with the tests!", "Run Tests \u25B6", () => {
                        completeCurrentTab('test');
                    });
                }
            } catch (err) {
                consolePrint(`Failed: ${err.message}`, 'error');
                wizardError();
            }
            btnChallengeRun.disabled = false;
        });
    }

    // Challenge reset
    const btnChallengeReset = document.getElementById('btn-challenge-reset');
    if (btnChallengeReset) {
        btnChallengeReset.addEventListener('click', () => {
            if (window._challengeEditor) {
                const code = lessonData.challengeStart || lessonData.goCode || '';
                window._challengeEditor.setValue(code);
                consolePrint('Challenge reset.', 'warning');
            }
        });
    }

    // Run tests
    const btnTests = document.getElementById('btn-run-tests');
    if (btnTests) {
        btnTests.addEventListener('click', async () => {
            consolePrint('Running tests...', 'info');
            btnTests.disabled = true;
            try {
                const code = window._challengeEditor ? window._challengeEditor.getValue() : (lessonData.goCode || '');
                const result = await runner.run(code);
                const resultsEl = document.getElementById('test-results');
                if (result.error) {
                    consolePrint(`Test Error: ${result.error}`, 'error');
                    if (resultsEl) resultsEl.innerHTML = `<div style="color:var(--accent-error)">FAIL: ${result.error}</div>`;
                    wizardError();
                } else {
                    consolePrint('All tests passed!', 'success');
                    if (resultsEl) resultsEl.innerHTML = `<div style="color:var(--accent-success)">PASS: All tests passed!</div>`;

                    markQuestDone('test');
                    updateJourneyWorld(4);
                    wizardCelebrate();
                    wizardSay("You did it! Level complete! You're becoming a Go master!");

                    const state = progress.getLessonState(lessonData.slug);
                    state.testDone = true;
                    state.completed = true;
                    progress.saveLessonState(lessonData.slug, state);

                    const xpEarned = lessonData.xpReward || 50;
                    const coinsEarned = lessonData.coinReward || 20;
                    gamification.awardXP(xpEarned);
                    gameState.addCoins(coinsEarned);

                    setTimeout(() => showLessonComplete(xpEarned, coinsEarned), 2000);
                }
            } catch (err) {
                consolePrint(`Failed: ${err.message}`, 'error');
                wizardError();
            }
            btnTests.disabled = false;
        });
    }

    // Hint button
    const btnHint = document.getElementById('btn-hint');
    if (btnHint) {
        btnHint.addEventListener('click', () => {
            const hints = lessonData.hints || ["Try reading the Go documentation for this concept."];
            const hint = hints[Math.floor(Math.random() * hints.length)];
            wizardSay(hint);
            consolePrint(`Hint: ${hint}`, 'info');
        });
    }
}

function showLessonComplete(xp, coins) {
    const overlay = document.getElementById('lesson-complete');
    if (!overlay) return;
    const xpEl = document.getElementById('total-xp-earned');
    const coinsEl = document.getElementById('total-coins-earned');
    if (xpEl) xpEl.textContent = xp;
    if (coinsEl) coinsEl.textContent = coins;
    overlay.classList.remove('hidden');
}

// ============================================
// TEACHER TIPS
// ============================================
function renderTeacherTips() {
    const container = document.getElementById('teacher-tips');
    if (!container || !lessonData.teacherTips) return;

    lessonData.teacherTips.forEach(tip => {
        const tipType = tip.type || 'protip';
        const tipTitle = tip.title || (tipType.toUpperCase());
        const tipContent = tip.content || tip.text || '';
        if (!tipContent) return;

        const icon = TIP_ICONS[tipType] || TIP_ICONS.protip;
        const div = document.createElement('div');
        div.className = `game-teacher-tip ${tipType}`;
        div.innerHTML = `
            <div class="game-tip-title">${icon} ${tipTitle}</div>
            <div class="game-tip-text">${tipContent}</div>
        `;
        container.appendChild(div);
    });
}

// ============================================
// EXPLANATION (Learn tab)
// ============================================
function renderExplanation() {
    const el = document.getElementById('learn-explanation');
    if (!el) return;

    let html = '';
    if (lessonData.goCode) {
        html += `<p style="color: var(--text-secondary); margin-bottom: 4px; font-size: 0.68rem;">Here's how Go handles this:</p>`;
        html += `<pre style="max-height: 180px; overflow: auto; font-size: 0.65rem; line-height: 1.4;"><code class="language-go">${lessonData.goCode}</code></pre>`;
    }
    if (lessonData.explanation) {
        const explHtml = lessonData.explanation
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<code style="background:rgba(0,173,216,0.1);padding:1px 4px;border-radius:3px;font-size:0.63rem;">$1</code>')
            .replace(/^## (.*$)/gm, '<h3 style="color:var(--accent-go);margin:8px 0 3px;font-size:0.75rem;">$1</h3>')
            .replace(/^- (.*$)/gm, '<div style="padding:1px 0 1px 12px;color:var(--text-secondary);font-size:0.68rem;">\u2022 $1</div>')
            .replace(/\n\n/g, '<br><br>');
        html += `<div style="margin-top:6px; color: var(--text-secondary); line-height: 1.5; font-size: 0.68rem;">${explHtml}</div>`;
    }
    el.innerHTML = html;

    if (window.Prism) Prism.highlightAll();
}

// ============================================
// ANNOTATIONS (Compare tab)
// ============================================
function renderAnnotations() {
    const container = document.getElementById('annotations');
    if (!container || !lessonData.annotations) return;

    const html = lessonData.annotations.map(a =>
        `<div style="padding:3px 0; font-size:0.75rem; color:var(--text-secondary);"><strong style="color:var(--accent-go);">${a.title || 'Note'}:</strong> ${a.text || a.content || ''}</div>`
    ).join('');
    container.innerHTML = html;
}

// ============================================
// RESTORE STATE
// ============================================
function restoreState() {
    const saved = progress.getLessonState(lessonData.slug);
    let lastDone = -1;

    TAB_ORDER.forEach((tab, i) => {
        if (saved[tab + 'Done']) {
            markQuestDone(tab);
            const btn = document.querySelector(`.panel-tab[data-tab="${tab}"]`);
            if (btn) {
                btn.classList.add('completed');
                btn.classList.remove('locked');
            }
            if (i + 1 < TAB_ORDER.length) {
                const nextBtn = document.querySelector(`.panel-tab[data-tab="${TAB_ORDER[i + 1]}"]`);
                if (nextBtn) nextBtn.classList.remove('locked');
            }
            lastDone = i;
        }
    });

    updateJourneyWorld(lastDone);

    if (lastDone >= 0 && lastDone < 4) {
        handleTabView(TAB_ORDER[lastDone + 1]);
    }
}

function startLesson() {
    handleTabView('learn');
    initWizard();

    setTimeout(() => {
        wizardSay(`Welcome to "${lessonData.title}"! Let's learn something new today.`, "Let's go!", () => handleTabView('learn'));
    }, 1000);
}

// ============================================
// INVENTORY GRID
// ============================================
function renderInventoryGrid() {
    const grid = document.getElementById('inv-grid');
    if (!grid) return;

    grid.innerHTML = '';
    const inv = gameState.getInventory();
    const grouped = {};

    if (inv && inv.items) {
        for (const item of inv.items) {
            grouped[item.type] = (grouped[item.type] || 0) + item.quantity;
        }
    }

    let slotCount = 0;
    for (const [type, qty] of Object.entries(grouped)) {
        const def = ITEM_DEFS[type];
        if (!def || qty <= 0) continue;
        const slot = document.createElement('div');
        slot.className = `inv-grid-slot rarity-${def.rarity}`;
        slot.title = `${def.name}: ${def.description}`;
        slot.innerHTML = `<span class="slot-icon">${def.icon}</span><span class="slot-qty">${qty}</span>`;
        grid.appendChild(slot);
        slotCount++;
    }

    const totalSlots = Math.max(8, slotCount);
    for (let i = slotCount; i < totalSlots; i++) {
        const slot = document.createElement('div');
        slot.className = 'inv-grid-slot empty';
        grid.appendChild(slot);
    }

    if (slotCount === 0) {
        const msg = document.createElement('div');
        msg.className = 'inv-empty-msg';
        msg.textContent = 'Complete lessons to earn items!';
        grid.insertBefore(msg, grid.firstChild);
    }
}

// ============================================
// MINI HUD
// ============================================
function updateMiniHud() {
    const state = gameState.getState();
    const lvl = document.getElementById('mini-level');
    const xp = document.getElementById('mini-xp');
    const coins = document.getElementById('mini-coins');
    if (lvl) lvl.textContent = `Lvl ${state.level || 1}`;
    if (xp) xp.textContent = state.xp || 0;
    if (coins) coins.textContent = state.coins || 0;
}

// ============================================
// BOOTSTRAP
// ============================================
function init() {
    initIntro();
    initSidebarCards();
    initConsole();
    renderExplanation();
    initLearnGuide();
    initCompareGuide();
    initTabSystem();
    initEditors();
    initRunButtons();
    renderTeacherTips();
    renderAnnotations();
    restoreState();
    renderInventoryGrid();
    updateMiniHud();
}

init();
