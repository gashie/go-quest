import { CodeEditor } from './codeEditor.js';
import { CodeRunner } from './codeRunner.js';
import { Progress } from './progress.js';
import { Gamification } from './gamification.js';
import { GameState } from './gameState.js';
import { Inventory, ITEM_DEFS } from './inventory.js';

/* ============================================
   DATA & SINGLETONS
   ============================================ */
const dataEl = document.getElementById('lesson-data');
if (!dataEl) throw new Error('No lesson data found');

const lessonData = JSON.parse(dataEl.textContent);
const progress = new Progress();
const gamification = new Gamification(progress);
const gameState = new GameState(progress);
const inventory = new Inventory(gameState);
const runner = new CodeRunner();

const challenge = lessonData.challenge || {};
const testCases = lessonData.testCases || [];

/* ============================================
   TAB ORDER & STATE
   ============================================ */
const TAB_ORDER = ['learn', 'compare', 'practice', 'challenge', 'test'];
const TUTORIAL_TABS = ['learn', 'compare'];
const EDITOR_TABS = ['practice', 'challenge', 'test'];
let currentStep = 'learn'; // tracks overall step

const DEV_MODE = false; // set true to skip locks

/* ============================================
   LAYOUT SYSTEM
   ============================================ */
const LAYOUTS = ['classic', 'tutorial', 'editor'];
let currentLayout = 'classic';

function setLayout(layout) {
    const main = document.querySelector('.game-layout');
    if (!main) return;
    main.dataset.layout = layout;
    currentLayout = layout;

    // Update layout switcher buttons
    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.layout === layout);
    });

    // Refresh editors when layout changes (they may have become visible)
    setTimeout(() => {
        if (window._practiceEditor) window._practiceEditor.refresh();
        if (window._challengeEditor) window._challengeEditor.refresh();
        if (window._testEditor) window._testEditor.refresh();
    }, 150);
}

function initLayoutSwitcher() {
    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const layout = btn.dataset.layout;
            if (layout && LAYOUTS.includes(layout)) {
                setLayout(layout);
            }
        });
    });
}

/* ============================================
   3-COLUMN PANEL SYSTEM (Editor Panel)
   All 3 columns always visible; locked ones are dimmed
   ============================================ */
const PANELS = ['practice', 'challenge', 'test'];
let panelState = {
    practice: 'unlocked',
    challenge: 'locked',
    test: 'locked'
};
let practiceRunCount = 0;
let testModeLocked = false;
let hintIndex = 0;

function expandPanel(name) {
    // No-op in column mode — panels are always visible
    setTimeout(() => {
        if (name === 'practice' && window._practiceEditor) window._practiceEditor.refresh();
        if (name === 'challenge' && window._challengeEditor) window._challengeEditor.refresh();
        if (name === 'test' && window._testEditor) window._testEditor.refresh();
    }, 100);
}

function collapsePanel(name) {
    // No-op in column mode
}

function unlockPanel(name) {
    const panel = document.getElementById(`panel-${name}`);
    if (!panel) return;
    panelState[name] = 'unlocked';
    panel.classList.remove('locked');
    const lock = document.getElementById(`lock-${name}`);
    if (lock) lock.style.display = 'none';
    // Refresh editor so it renders properly
    setTimeout(() => {
        if (name === 'practice' && window._practiceEditor) window._practiceEditor.refresh();
        if (name === 'challenge' && window._challengeEditor) window._challengeEditor.refresh();
        if (name === 'test' && window._testEditor) window._testEditor.refresh();
    }, 100);
}

function completePanel(name) {
    const panel = document.getElementById(`panel-${name}`);
    if (!panel) return;
    panelState[name] = 'completed';
    panel.classList.add('completed');
    const status = document.getElementById(`status-${name}`);
    if (status) status.textContent = '\u2705';

    markQuestDone(name);
    updateJourneyMap(name);
    playTabCompleteSound();
    wizardCelebrate();
}

function enterExamMode() {
    testModeLocked = true;
    ['practice', 'challenge'].forEach(name => {
        const panel = document.getElementById(`panel-${name}`);
        if (panel) panel.classList.add('dimmed');
    });
    consolePrint('TEST MODE: Other panels dimmed. Write from memory!', 'warning');
    wizardSay("Focus! Write the code from memory. No peeking!");
}

function exitExamMode() {
    testModeLocked = false;
    ['practice', 'challenge'].forEach(name => {
        const panel = document.getElementById(`panel-${name}`);
        if (panel) panel.classList.remove('dimmed');
    });
}

function initPanelHeaders() {
    // No accordion click handlers needed for column mode
}

/* ============================================
   TUTORIAL TAB SYSTEM (Learn / Compare)
   ============================================ */
function handleTabView(tabName) {
    currentStep = tabName;

    if (TUTORIAL_TABS.includes(tabName)) {
        // Switch tutorial tabs
        document.querySelectorAll('#tutorial-tab-bar .panel-tab').forEach(t => {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });
        document.querySelectorAll('.tutorial-panel .tab-panel').forEach(p => {
            p.classList.toggle('active', p.id === `tab-${tabName}`);
        });
    }

    // If switching to an editor tab, ensure editor layout is visible
    if (EDITOR_TABS.includes(tabName)) {
        if (currentLayout === 'tutorial') {
            setLayout('classic');
        }
    }
}

function completeCurrentTab(tabName) {
    // Mark tab as completed in tutorial tab bar
    const tabBtn = document.querySelector(`#tutorial-tab-bar .panel-tab[data-tab="${tabName}"]`);
    if (tabBtn) {
        tabBtn.classList.add('completed');
        tabBtn.classList.remove('locked');
    }

    // Save progress
    progress.completeTab(lessonData.slug, tabName, 0, 0);

    // Update quest + journey
    if (tabName === 'learn') {
        markQuestDone('read');
        updateJourneyMap('learn');
    } else if (tabName === 'compare') {
        markQuestDone('compare');
        updateJourneyMap('compare');
    }
}

function checkTutorialComplete() {
    const saved = progress.getLessonState(lessonData.slug);
    return saved.learnDone && saved.compareDone;
}

function updateEditorLockUI() {
    // If tutorial is complete, make sure practice is unlocked
    if (checkTutorialComplete() || DEV_MODE) {
        unlockPanel('practice');
    }
}

/* ============================================
   LEARN GUIDE (paginated reader)
   ============================================ */
let learnPages = [];
let learnPageIndex = 0;

function initLearnGuide() {
    const container = document.getElementById('learn-pages');
    const indicator = document.getElementById('learn-page-indicator');
    if (!container || !indicator) return;

    // Build pages from lesson explanation
    const explanation = lessonData.explanation || '';
    const sections = explanation.split(/(?=^## )/gm).filter(s => s.trim());

    if (sections.length === 0) {
        // Single page with all content
        sections.push(explanation || `<h2>${lessonData.title}</h2><p>Study the code examples to learn this concept.</p>`);
    }

    learnPages = sections;

    // Render pages
    sections.forEach((content, i) => {
        const page = document.createElement('div');
        page.className = 'learn-page' + (i === 0 ? ' active' : '');
        page.innerHTML = renderMarkdownish(content);
        container.appendChild(page);

        const dot = document.createElement('div');
        dot.className = 'learn-dot' + (i === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToLearnPage(i));
        indicator.appendChild(dot);
    });

    // Highlight code blocks
    container.querySelectorAll('pre code').forEach(block => {
        if (window.Prism) Prism.highlightElement(block);
    });

    // Nav buttons
    const prevBtn = document.getElementById('btn-learn-prev');
    const nextBtn = document.getElementById('btn-learn-next');
    if (prevBtn) prevBtn.addEventListener('click', () => goToLearnPage(learnPageIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => {
        if (learnPageIndex >= learnPages.length - 1) {
            // Complete learn
            completeCurrentTab('learn');
            wizardSay("Great reading! Now let's compare Go with other languages.");
            // Unlock compare tab
            const compareTab = document.querySelector('#tutorial-tab-bar .panel-tab[data-tab="compare"]');
            if (compareTab) compareTab.classList.remove('locked');
            handleTabView('compare');
        } else {
            goToLearnPage(learnPageIndex + 1);
        }
    });
}

function goToLearnPage(idx) {
    if (idx < 0 || idx >= learnPages.length) return;
    const pages = document.querySelectorAll('.learn-page');
    const dots = document.querySelectorAll('.learn-dot');

    // Exit current
    if (pages[learnPageIndex]) {
        pages[learnPageIndex].classList.remove('active');
        pages[learnPageIndex].classList.add(idx > learnPageIndex ? 'exit-left' : '');
    }
    if (dots[learnPageIndex]) dots[learnPageIndex].classList.remove('active');

    learnPageIndex = idx;

    // Enter new
    setTimeout(() => {
        pages.forEach(p => p.classList.remove('exit-left'));
        if (pages[idx]) pages[idx].classList.add('active');
        if (dots[idx]) dots[idx].classList.add('active');
    }, 50);

    // Mark previous dots as done
    dots.forEach((d, i) => { if (i < idx) d.classList.add('done'); });

    // Update nav buttons
    const prevBtn = document.getElementById('btn-learn-prev');
    const nextBtn = document.getElementById('btn-learn-next');
    if (prevBtn) prevBtn.disabled = idx === 0;
    if (nextBtn) nextBtn.textContent = idx >= learnPages.length - 1 ? 'Complete \u25B6' : 'Next \u25B6';
}

function renderMarkdownish(md) {
    // Simple markdown-ish to HTML
    let html = md
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
            const cls = lang ? `language-${lang}` : '';
            return `<pre><code class="${cls}">${escapeHtml(code.trim())}</code></pre>`;
        });

    // Wrap loose lines in paragraphs
    const lines = html.split('\n');
    let result = '';
    let inBlock = false;
    for (const line of lines) {
        if (line.startsWith('<pre>') || line.startsWith('<h')) {
            inBlock = line.startsWith('<pre>');
            result += line + '\n';
        } else if (line.startsWith('</pre>')) {
            inBlock = false;
            result += line + '\n';
        } else if (inBlock) {
            result += line + '\n';
        } else if (line.trim()) {
            result += `<p>${line.trim()}</p>\n`;
        }
    }
    return result;
}

/* ============================================
   COMPARE GUIDE (3-step reveal)
   ============================================ */
let compareStep = 0;

function initCompareGuide() {
    const grid = document.getElementById('compare-grid');
    const otherPane = document.getElementById('compare-pane-other');
    const goPane = document.getElementById('compare-pane-go');
    const stepLabel = document.getElementById('compare-step-label');
    const nextBtn = document.getElementById('btn-compare-next');

    if (!grid || !otherPane || !goPane) return;

    // Get compare data
    const otherLang = lessonData.otherLang || 'JavaScript';
    const otherCode = lessonData.otherCode || '// No comparison code available';
    const goCode = lessonData.goCode || '// No Go code available';

    // Set other language code
    const otherCodeEl = document.getElementById('compare-other-code');
    const goCodeEl = document.getElementById('compare-go-code');
    if (otherCodeEl) {
        otherCodeEl.textContent = otherCode;
        if (window.Prism) Prism.highlightElement(otherCodeEl);
    }
    if (goCodeEl) {
        goCodeEl.textContent = goCode;
        if (window.Prism) Prism.highlightElement(goCodeEl);
    }

    // Update pane label
    const otherLabel = otherPane.querySelector('.pane-label');
    if (otherLabel) otherLabel.textContent = otherLang;

    compareStep = 0;
    updateCompareStep();

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            compareStep++;
            updateCompareStep();
        });
    }

    function updateCompareStep() {
        if (compareStep === 0) {
            // Show only other language
            grid.classList.remove('side-by-side');
            grid.classList.add('single-mode');
            goPane.classList.add('hidden-pane');
            otherPane.classList.remove('hidden-pane');
            if (stepLabel) stepLabel.textContent = `Step 1: See how ${otherLang} does it`;
            if (nextBtn) nextBtn.textContent = 'See Go \u25B6';
        } else if (compareStep === 1) {
            // Show only Go
            goPane.classList.remove('hidden-pane');
            otherPane.classList.add('hidden-pane');
            if (stepLabel) stepLabel.textContent = 'Step 2: Now see the Go version';
            if (nextBtn) nextBtn.textContent = 'Compare Side-by-Side \u25B6';
        } else if (compareStep === 2) {
            // Side by side
            grid.classList.remove('single-mode');
            grid.classList.add('side-by-side');
            goPane.classList.remove('hidden-pane');
            otherPane.classList.remove('hidden-pane');
            if (stepLabel) stepLabel.textContent = 'Step 3: Compare them side-by-side';
            if (nextBtn) nextBtn.textContent = 'Got it! \u2713';
        } else {
            // Complete compare
            completeCurrentTab('compare');
            wizardSay("You see the differences! Time to write some Go code.");

            // Auto-switch to editor layout and unlock practice
            updateEditorLockUI();
            if (currentLayout === 'tutorial') {
                setLayout('classic');
            }
            expandPanel('practice');
        }
    }
}

/* ============================================
   WIZARD SYSTEM (floating gopher)
   ============================================ */
const wizardEl = document.getElementById('wizard-container');
const wizardSpeechEl = document.getElementById('wizard-speech');
const wizardSpeechText = document.getElementById('wizard-speech-text');
const wizardSpeechClose = document.getElementById('wizard-speech-close');
let wizardAutoHideTimer = null;
let wizardRoamTimer = null;

const STEP_MESSAGES = {
    learn: "Read through the explanation carefully. Take your time!",
    compare: "See how Go compares to other languages you know.",
    practice: "Time to practice! Run the code, experiment with it, and make sure you understand each line.",
    challenge: "Apply what you've learned to solve this challenge. You can do it!",
    test: "The final test! Write the code from memory to prove your mastery."
};

function wizardSay(text) {
    if (!wizardEl || !wizardSpeechEl || !wizardSpeechText) return;
    clearTimeout(wizardAutoHideTimer);
    wizardSpeechEl.style.display = 'block';
    wizardSpeechText.textContent = text;
    wizardAutoHideTimer = setTimeout(() => wizardHide(), 10000);
}

function wizardHide() {
    if (!wizardSpeechEl) return;
    clearTimeout(wizardAutoHideTimer);
    wizardSpeechEl.style.display = 'none';
    wizardSpeechText.textContent = '';
}

function wizardCelebrate() {
    if (!wizardEl) return;
    wizardEl.classList.add('celebrating');
    playSuccessSound();
    setTimeout(() => wizardEl.classList.remove('celebrating'), 1500);
}

function wizardError() {
    if (!wizardEl) return;
    wizardEl.classList.add('error-state');
    playErrorSound();
    setTimeout(() => wizardEl.classList.remove('error-state'), 800);
}

function startWizardRoaming() {
    if (!wizardEl) return;
    // Gently float the wizard around
    function roam() {
        const x = 10 + Math.random() * 30;
        const y = 30 + Math.random() * 40;
        wizardEl.style.transition = 'bottom 8s ease-in-out, right 8s ease-in-out';
        wizardEl.style.bottom = y + 'px';
        wizardEl.style.right = x + 'px';
        wizardRoamTimer = setTimeout(roam, 10000 + Math.random() * 8000);
    }
    wizardRoamTimer = setTimeout(roam, 5000);
}

function initWizardDrag() {
    if (!wizardEl) return;
    let isDragging = false;
    let startX, startY, startRight, startBottom;

    const char = document.getElementById('wizard-body-wrap');
    if (!char) return;

    char.addEventListener('mousedown', (e) => {
        if (e.target.closest('.wizard-speech')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = wizardEl.getBoundingClientRect();
        startRight = window.innerWidth - rect.right;
        startBottom = window.innerHeight - rect.bottom;
        wizardEl.style.transition = 'none';
        clearTimeout(wizardRoamTimer);
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const dx = startX - e.clientX;
        const dy = startY - e.clientY;
        wizardEl.style.right = Math.max(0, startRight + dx) + 'px';
        wizardEl.style.bottom = Math.max(0, startBottom + dy) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            wizardEl.style.transition = '';
        }
    });
}

function initWizard() {
    if (!wizardEl) return;

    if (wizardSpeechClose) {
        wizardSpeechClose.addEventListener('click', (e) => {
            e.stopPropagation();
            wizardHide();
        });
    }

    wizardEl.addEventListener('click', (e) => {
        if (e.target.closest('.wizard-speech')) return;
        // Show contextual message based on current step
        const activePanel = PANELS.find(p => {
            const el = document.getElementById(`panel-${p}`);
            return el && el.classList.contains('expanded') && panelState[p] !== 'locked';
        });
        wizardSay(STEP_MESSAGES[activePanel || currentStep] || "Keep going! You're doing great!");
    });

    startWizardRoaming();
    initWizardDrag();
}

/* ============================================
   CONSOLE — shared + per-panel
   ============================================ */
function consolePrint(msg, type = '') {
    const out = document.getElementById('console-output');
    if (!out) return;
    const line = document.createElement('div');
    line.className = 'console-line' + (type ? ' ' + type : '');
    line.innerHTML = `<span class="prompt">$</span> ${escapeHtml(msg)}`;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
}

function panelPrint(panelId, msg, type = '') {
    const out = document.getElementById(`${panelId}-console-output`);
    if (!out) { consolePrint(msg, type); return; }
    const line = document.createElement('div');
    line.className = 'console-line' + (type ? ' ' + type : '');
    line.innerHTML = `<span class="prompt">$</span> ${escapeHtml(msg)}`;
    out.appendChild(line);
    out.scrollTop = out.scrollHeight;
    const body = out.closest('.console-frame-body');
    if (body) body.scrollTop = body.scrollHeight;
    consolePrint(msg, type);
}

function panelPrintHtml(panelId, html) {
    const out = document.getElementById(`${panelId}-console-output`);
    if (!out) return;
    const div = document.createElement('div');
    div.innerHTML = html;
    out.appendChild(div);
    out.scrollTop = out.scrollHeight;
    const body = out.closest('.console-frame-body');
    if (body) body.scrollTop = body.scrollHeight;
}

function clearPanelConsole(panelId, placeholder) {
    const out = document.getElementById(`${panelId}-console-output`);
    if (out) out.innerHTML = `<div class="console-line info"><span class="prompt">$</span> ${placeholder || 'Cleared.'}</div>`;
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function initConsoles() {
    document.querySelectorAll('.console-clear-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetId = btn.dataset.target;
            if (targetId) {
                const out = document.getElementById(targetId);
                if (out) out.innerHTML = '<div class="console-line info"><span class="prompt">$</span> Cleared.</div>';
            }
        });
    });
    const sharedClear = document.getElementById('btn-clear-shared-console');
    if (sharedClear) {
        sharedClear.addEventListener('click', (e) => {
            e.stopPropagation();
            const out = document.getElementById('console-output');
            if (out) out.innerHTML = '<div class="console-line info"><span class="prompt">$</span> Console cleared.</div>';
        });
    }
}

/* ============================================
   AUDIO
   ============================================ */
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) {
        try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function playSuccessSound() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
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

document.addEventListener('click', () => { getAudioCtx(); }, { once: true });

/* ============================================
   JOURNEY MAP & QUEST CHECKLIST
   ============================================ */
function updateJourneyMap(completedStep) {
    const stepToNode = { learn: 0, compare: 1, practice: 2, challenge: 3, test: 4 };
    const nodeIdx = stepToNode[completedStep];
    if (nodeIdx !== undefined) {
        const node = document.getElementById(`jn-${nodeIdx}`);
        if (node) {
            node.classList.add('done');
            node.classList.remove('active');
            node.dataset.done = 'true';
        }
        const nextIdx = nodeIdx + 1;
        if (nextIdx <= 4) {
            const nextNode = document.getElementById(`jn-${nextIdx}`);
            if (nextNode && !nextNode.classList.contains('done')) {
                document.querySelectorAll('.journey-node').forEach(n => n.classList.remove('active'));
                nextNode.classList.add('active');
            }
        }
    }
}

function markQuestDone(step) {
    // Map step names to quest row IDs
    const stepToQuest = { learn: 'read', compare: 'compare', practice: 'practice', challenge: 'challenge', test: 'test',
                          read: 'read' };
    const questName = stepToQuest[step] || step;
    const row = document.getElementById(`quest-${questName}`);
    if (row) row.classList.add('done');
    const check = document.getElementById(`qc-${questName}`);
    if (check) check.textContent = '\u2713';
}

/* ============================================
   PRACTICE CHECKLIST
   ============================================ */
function getPracticeCheckedCount() {
    return document.querySelectorAll('.pcheck-box:checked').length;
}

function isPracticeComplete() {
    const checked = getPracticeCheckedCount();
    return (practiceRunCount >= 1 && checked >= 3) || (practiceRunCount >= 2);
}

function checkPracticeCompletion() {
    if (!isPracticeComplete()) return;
    if (panelState.practice === 'completed') return;

    completePanel('practice');
    progress.completeTab(lessonData.slug, 'practice', 0, 0);

    const practiceXP = Math.floor((lessonData.xpReward || 50) * 0.2);
    gamification.showXPPopup(practiceXP);
    gamification.checkNewBadges();
    consolePrint(`Practice complete! +${practiceXP} XP`, 'success');

    unlockPanel('challenge');
    consolePrint('Challenge unlocked!', 'success');
    wizardSay("Nice work! Now apply what you learned in the Challenge.");
}

function initPracticeChecklist() {
    document.querySelectorAll('.pcheck-box').forEach(cb => {
        cb.addEventListener('change', () => {
            const item = cb.closest('.checklist-item');
            if (item) item.classList.toggle('done', cb.checked);
            checkPracticeCompletion();
        });
    });
}

/* ============================================
   EDITORS — 3 separate CodeMirror instances
   ============================================ */
function initEditors() {
    // PRACTICE EDITOR: load FULL GoCode
    if (document.getElementById('practice-editor') && lessonData.goCode) {
        const practiceCode = `// PRACTICE: ${lessonData.title || 'Go Code'}\n// Run this code, then try changing values to see what happens.\n\n` + lessonData.goCode;
        window._practiceEditor = new CodeEditor('practice-editor', {
            mode: 'text/x-go',
            initialValue: practiceCode,
            theme: 'dracula'
        });
    }

    // CHALLENGE EDITOR: load starterCode
    if (document.getElementById('challenge-editor')) {
        const challengeCode = challenge.starterCode || 'package main\n\nimport "fmt"\n\nfunc main() {\n\t// Write your solution here\n\tfmt.Println()\n}\n';
        window._challengeEditor = new CodeEditor('challenge-editor', {
            mode: 'text/x-go',
            initialValue: challengeCode,
            theme: 'dracula'
        });
    }

    // TEST EDITOR: blank starter
    if (document.getElementById('test-editor')) {
        const testStarter = `package main\n\nimport "fmt"\n\n// Write your solution for "${lessonData.title}" from memory!\n\nfunc main() {\n\t// Your code here\n\tfmt.Println()\n}\n`;
        window._testEditor = new CodeEditor('test-editor', {
            mode: 'text/x-go',
            initialValue: testStarter,
            theme: 'dracula',
            readOnly: false
        });
    }

    // Disable paste in test editor
    const testEditorEl = document.getElementById('test-editor');
    if (testEditorEl) {
        testEditorEl.addEventListener('paste', (e) => {
            e.preventDefault();
            consolePrint('Paste disabled during test! Write from memory.', 'warning');
            wizardSay("No pasting allowed! You need to write this from memory.");
        });
    }
}

/* ============================================
   CHALLENGE SETUP
   ============================================ */
function initChallengeUI() {
    const promptText = document.getElementById('challenge-prompt-text');
    if (promptText) {
        const prompt = challenge.prompt || `Write Go code that demonstrates ${lessonData.title || 'this concept'}.`;
        promptText.innerHTML = escapeHtml(prompt).replace(/\n/g, '<br>');
    }

    const typeBadge = document.getElementById('challenge-type-badge');
    const briefType = document.getElementById('challenge-brief-type');
    if (challenge.type) {
        const typeConfig = {
            fix_bug:    { label: 'FIX BUG',  icon: '\u{1F41B}', badgeClass: 'badge-fix-bug' },
            rewrite:    { label: 'REWRITE',   icon: '\u{1F504}', badgeClass: 'badge-rewrite' },
            build:      { label: 'BUILD',     icon: '\u{1F3D7}\uFE0F', badgeClass: 'badge-build' },
            fill_blank: { label: 'FILL IN',   icon: '\u270F\uFE0F',   badgeClass: 'badge-fill-blank' },
        };
        const cfg = typeConfig[challenge.type] || typeConfig.build;
        if (typeBadge) {
            typeBadge.textContent = cfg.label;
            typeBadge.className = `step-type-badge ${cfg.badgeClass}`;
        }
        if (briefType) {
            briefType.textContent = `${cfg.icon} ${cfg.label}`;
        }
    }

    const bonusXP = document.getElementById('challenge-bonus-xp');
    const bonusCoins = document.getElementById('challenge-bonus-coins');
    if (bonusXP) bonusXP.textContent = `+${challenge.bonusXP || lessonData.xpReward || 0} XP`;
    if (bonusCoins) bonusCoins.textContent = `+${challenge.bonusCoins || lessonData.coinReward || 0} Coins`;
}

/* ============================================
   TEST OBJECTIVES
   ============================================ */
function initTestObjectives() {
    const container = document.getElementById('test-objectives');
    if (!container) return;

    const effectiveTests = testCases.length > 0 ? testCases : [{ name: 'Output check' }];
    effectiveTests.forEach(tc => {
        const row = document.createElement('div');
        row.className = 'test-obj-row';
        row.dataset.name = tc.name;
        row.innerHTML = `<span class="test-obj-icon">\u25CB</span> <span>${escapeHtml(tc.name)}</span>`;
        container.appendChild(row);
    });
}

function updateTestObjective(name, passed) {
    document.querySelectorAll('.test-obj-row').forEach(row => {
        if (row.dataset.name === name) {
            row.classList.add(passed ? 'pass' : 'fail');
            row.querySelector('.test-obj-icon').textContent = passed ? '\u2713' : '\u2717';
        }
    });
}

/* ============================================
   RUN BUTTONS — Practice, Challenge, Test
   ============================================ */
function initRunButtons() {
    // ---- Practice: Run ----
    const btnRun = document.getElementById('btn-run');
    if (btnRun) {
        btnRun.addEventListener('click', async () => {
            if (!window._practiceEditor) return;
            const code = window._practiceEditor.getValue();
            panelPrint('practice', 'Running code...', 'info');
            btnRun.disabled = true;
            practiceRunCount++;

            // Auto-check read & run
            const readCb = document.querySelector('#pcheck-read .pcheck-box');
            const runCb = document.querySelector('#pcheck-run .pcheck-box');
            if (readCb && !readCb.checked) { readCb.checked = true; readCb.closest('.checklist-item').classList.add('done'); }
            if (runCb && !runCb.checked) { runCb.checked = true; runCb.closest('.checklist-item').classList.add('done'); }
            if (practiceRunCount >= 2) {
                const modCb = document.querySelector('#pcheck-modify .pcheck-box');
                if (modCb && !modCb.checked) { modCb.checked = true; modCb.closest('.checklist-item').classList.add('done'); }
            }

            try {
                const result = await runner.run(code);
                if (result.error) {
                    panelPrint('practice', `Error: ${result.error}`, 'error');
                    wizardError();
                    wizardSay("Hmm, there's an error. Check the output and try again!");
                } else {
                    const output = result.output || '(no output)';
                    panelPrint('practice', output, 'success');
                    wizardCelebrate();
                    checkPracticeCompletion();
                }
            } catch (err) {
                panelPrint('practice', `Failed: ${err.message}`, 'error');
                wizardError();
            }
            btnRun.disabled = false;
        });
    }

    // ---- Practice: Reset ----
    const btnReset = document.getElementById('btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if (window._practiceEditor && lessonData.goCode) {
                const practiceCode = `// PRACTICE: ${lessonData.title || 'Go Code'}\n// Run this code, then try changing values to see what happens.\n\n` + lessonData.goCode;
                window._practiceEditor.setValue(practiceCode);
                consolePrint('Code reset to original.', 'warning');
            }
        });
    }

    // ---- Practice: Solution ----
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

    // ---- Challenge: Submit ----
    const btnChallengeSubmit = document.getElementById('btn-challenge-submit');
    if (btnChallengeSubmit) {
        btnChallengeSubmit.addEventListener('click', async () => {
            if (!window._challengeEditor) return;
            const code = window._challengeEditor.getValue();
            panelPrint('challenge', 'Submitting...', 'info');
            btnChallengeSubmit.disabled = true;

            try {
                const result = await runner.run(code);
                const resultEl = document.getElementById('challenge-result');

                if (result.error) {
                    panelPrint('challenge', `Error: ${result.error}`, 'error');
                    if (resultEl) {
                        resultEl.className = 'challenge-result fail';
                        resultEl.innerHTML = `<strong>ERROR:</strong> ${escapeHtml(result.error)}`;
                    }
                    wizardError();
                    wizardSay("Not quite right. Read the error and try again!");
                } else {
                    const output = (result.output || '').trim();
                    const expected = (challenge.expectedOutput || '').trim();
                    const passed = expected ? output === expected : true;

                    panelPrint('challenge', output || '(no output)', passed ? 'success' : 'warning');

                    if (resultEl) {
                        if (passed) {
                            resultEl.className = 'challenge-result pass';
                            resultEl.innerHTML = `<strong>CORRECT!</strong> Output matches expected result.`;
                        } else {
                            resultEl.className = 'challenge-result fail';
                            resultEl.innerHTML = `<strong>YOUR OUTPUT:</strong> ${escapeHtml(output)}<br><strong>EXPECTED:</strong> ${escapeHtml(expected)}`;
                        }
                    }

                    if (passed) {
                        completePanel('challenge');
                        const bonusXP = challenge.bonusXP || Math.floor((lessonData.xpReward || 50) * 0.3);
                        const bonusCoins = challenge.bonusCoins || Math.floor((lessonData.coinReward || 20) * 0.3);
                        gamification.showXPPopup(bonusXP);
                        gameState.addCoins(bonusCoins);
                        gamification.checkNewBadges();
                        progress.completeTab(lessonData.slug, 'challenge', bonusXP, bonusCoins);
                        consolePrint(`Challenge passed! +${bonusXP} XP, +${bonusCoins} Coins`, 'success');

                        unlockPanel('test');
                        wizardSay("Excellent! Now prove it in the Final Test -- from memory!");
                    } else {
                        wizardSay("Almost! Your output doesn't match. Check the expected output and try again.");
                    }
                }
            } catch (err) {
                panelPrint('challenge', `Failed: ${err.message}`, 'error');
                wizardError();
            }
            btnChallengeSubmit.disabled = false;
        });
    }

    // ---- Challenge: Hint ----
    const btnHint = document.getElementById('btn-challenge-hint');
    if (btnHint) {
        const hints = challenge.hints || [];
        if (hints.length === 0) {
            btnHint.style.display = 'none';
        } else {
            btnHint.addEventListener('click', () => {
                const hintsArea = document.getElementById('challenge-hints-area');
                if (!hintsArea) return;
                const hint = hints[hintIndex % hints.length];
                const card = document.createElement('div');
                card.className = 'hint-card';
                card.textContent = `\u{1F4A1} Hint ${hintIndex + 1}: ${hint}`;
                hintsArea.appendChild(card);
                hintIndex++;
                if (hintIndex >= hints.length) {
                    btnHint.disabled = true;
                    btnHint.textContent = 'No more hints';
                } else {
                    btnHint.textContent = `\u{1F4A1} HINT (${hintIndex}/${hints.length})`;
                }
            });
        }
    }

    // ---- Challenge: Reset ----
    const btnChallengeReset = document.getElementById('btn-challenge-reset');
    if (btnChallengeReset) {
        btnChallengeReset.addEventListener('click', () => {
            if (window._challengeEditor) {
                const code = challenge.starterCode || 'package main\n\nimport "fmt"\n\nfunc main() {\n\t// Write your solution here\n\tfmt.Println()\n}\n';
                window._challengeEditor.setValue(code);
                consolePrint('Challenge reset.', 'warning');
            }
        });
    }

    // ---- Test: Reset ----
    const btnTestReset = document.getElementById('btn-test-reset');
    if (btnTestReset) {
        btnTestReset.addEventListener('click', () => {
            if (window._testEditor) {
                window._testEditor.setValue(`package main\n\nimport "fmt"\n\nfunc main() {\n\t// Write your solution here\n\tfmt.Println()\n}\n`);
                consolePrint('Test code cleared.', 'warning');
            }
        });
    }

    // ---- Test: Run Tests ----
    const btnTests = document.getElementById('btn-run-tests');
    if (btnTests) {
        btnTests.addEventListener('click', async () => {
            if (!window._testEditor) return;
            const userCode = window._testEditor.getValue();

            if (userCode.trim().length < 30) {
                panelPrint('test', 'Write your solution first!', 'warning');
                wizardSay("You need to write your solution code first!");
                return;
            }

            clearPanelConsole('test', 'Running tests...');
            const testResultsEl = document.getElementById('test-results');
            if (testResultsEl) testResultsEl.innerHTML = '';
            btnTests.disabled = true;

            const effectiveTests = testCases.length > 0
                ? testCases
                : [{ name: 'Output check', expectedOutput: challenge.expectedOutput || '' }];

            let allPassed = true;
            let testResults = [];

            for (let i = 0; i < effectiveTests.length; i++) {
                const tc = effectiveTests[i];
                const expected = (tc.expectedOutput || '').trim();
                let codeToRun = userCode;

                if (tc.wrapperCode) {
                    codeToRun = buildWrappedCode(userCode, tc.wrapperCode);
                }

                try {
                    const result = await runner.run(codeToRun);

                    if (result.error) {
                        allPassed = false;
                        testResults.push({ name: tc.name, passed: false, error: result.error });
                        updateTestObjective(tc.name, false);
                        addTestResultCard(testResultsEl, tc.name, false, null, null, result.error);
                    } else {
                        const output = (result.output || '').trim();
                        const passed = expected ? output === expected : output.length > 0;
                        testResults.push({ name: tc.name, passed, output, expected });
                        updateTestObjective(tc.name, passed);
                        addTestResultCard(testResultsEl, tc.name, passed, output, expected);
                        if (!passed) allPassed = false;
                    }
                } catch (err) {
                    allPassed = false;
                    testResults.push({ name: tc.name, passed: false, error: err.message });
                    updateTestObjective(tc.name, false);
                    addTestResultCard(testResultsEl, tc.name, false, null, null, err.message);
                }
            }

            const passCount = testResults.filter(t => t.passed).length;
            const totalCount = testResults.length;

            if (allPassed) {
                panelPrint('test', `ALL TESTS PASSED (${passCount}/${totalCount})`, 'success');
                exitExamMode();
                completePanel('test');
                progress.completeTab(lessonData.slug, 'test', 0, 0);

                const xpEarned = lessonData.xpReward || 50;
                const coinsEarned = lessonData.coinReward || 20;
                gamification.showXPPopup(xpEarned);
                gameState.addCoins(coinsEarned);
                gamification.checkNewBadges();
                wizardSay("You did it FROM MEMORY! You truly understand this concept now!");
                checkAllComplete();
                setTimeout(() => showLessonComplete(xpEarned, coinsEarned), 2000);
            } else {
                panelPrint('test', `FAILED (${passCount}/${totalCount} passed)`, 'error');
                wizardError();
                wizardSay(`${passCount}/${totalCount} tests passed. Check the failing tests and try again!`);
            }

            btnTests.disabled = false;
        });
    }
}

function addTestResultCard(container, name, passed, output, expected, error) {
    if (!container) return;
    const card = document.createElement('div');
    card.className = `test-case-row ${passed ? 'test-case-pass' : 'test-case-fail'}`;
    card.innerHTML = `<span class="test-case-icon">${passed ? '\u2705' : '\u274C'}</span><span class="test-case-name">${escapeHtml(name)}</span>`;
    container.appendChild(card);

    if (!passed) {
        const detail = document.createElement('div');
        detail.className = 'test-case-detail';
        if (error) {
            detail.style.color = '#f87171';
            detail.textContent = `Error: ${error}`;
        } else if (expected) {
            detail.style.color = '#f87171';
            detail.textContent = `Got: "${output}" | Expected: "${expected}"`;
        }
        container.appendChild(detail);
    }
}

function buildWrappedCode(userCode, wrapperMain) {
    const mainPattern = /func\s+main\s*\(\s*\)\s*\{/;
    const mainMatch = userCode.match(mainPattern);
    if (!mainMatch) return userCode + '\n' + wrapperMain;

    const mainIdx = userCode.indexOf(mainMatch[0]);
    const beforeMain = userCode.substring(0, mainIdx);

    let braceCount = 0;
    let endIdx = mainIdx + mainMatch[0].length;
    braceCount = 1;
    while (endIdx < userCode.length && braceCount > 0) {
        if (userCode[endIdx] === '{') braceCount++;
        else if (userCode[endIdx] === '}') braceCount--;
        endIdx++;
    }
    const afterMain = userCode.substring(endIdx);
    return beforeMain + wrapperMain + '\n' + afterMain;
}

/* ============================================
   TEACHER TIPS
   ============================================ */
const TIP_ICONS = {
    gotcha: '\u26A0\uFE0F',
    remember: '\u{1F4CC}',
    protip: '\u{1F4A1}',
    warning: '\u{1F6A8}',
};

function renderTeacherTips() {
    const container = document.getElementById('teacher-tips');
    if (!container || !lessonData.teacherTips) return;

    lessonData.teacherTips.forEach(tip => {
        const tipType = tip.type || 'protip';
        const tipTitle = tip.title || tipType.toUpperCase();
        const tipContent = tip.content || tip.text || '';
        if (!tipContent) return;

        const icon = TIP_ICONS[tipType] || TIP_ICONS.protip;
        const div = document.createElement('div');
        div.className = `game-teacher-tip ${tipType}`;
        div.innerHTML = `<div class="game-tip-title">${icon} ${tipTitle}</div><div class="game-tip-text">${tipContent}</div>`;
        container.appendChild(div);
    });
}

/* ============================================
   LESSON COMPLETE
   ============================================ */
function showLessonComplete(xp, coins) {
    const overlay = document.getElementById('lesson-complete');
    if (!overlay) return;
    const xpEl = document.getElementById('total-xp-earned');
    const coinsEl = document.getElementById('total-coins-earned');
    if (xpEl) xpEl.textContent = xp;
    if (coinsEl) coinsEl.textContent = coins;
    overlay.classList.remove('hidden');
}

function checkAllComplete() {
    const allDone = panelState.practice === 'completed' &&
                    panelState.challenge === 'completed' &&
                    panelState.test === 'completed';
    const nextBtn = document.getElementById('btn-next-lesson');
    if (nextBtn && allDone) {
        nextBtn.classList.remove('locked');
        nextBtn.classList.add('unlocked');
        nextBtn.innerHTML = '\u25B6 Next';
    }
    return allDone;
}

/* ============================================
   EXPLANATION RENDERING (for Learn tab)
   ============================================ */
function renderExplanation() {
    // Already handled by initLearnGuide
}

/* ============================================
   ANNOTATIONS RENDERING
   ============================================ */
function renderAnnotations() {
    // Annotations are displayed inline in the learn pages if present
    if (!lessonData.annotations) return;
    // Could add annotation markers to code blocks in learn pages
}

/* ============================================
   INVENTORY GRID
   ============================================ */
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
}

/* ============================================
   MINI HUD
   ============================================ */
function updateMiniHud() {
    const state = gameState.getState();
    const lvl = document.getElementById('mini-level');
    const xp = document.getElementById('mini-xp');
    const coins = document.getElementById('mini-coins');
    if (lvl) lvl.textContent = `Lvl ${state.level || 1}`;
    if (xp) xp.textContent = state.xp || state.totalXP || 0;
    if (coins) coins.textContent = state.coins || state.totalCoins || 0;
}

/* ============================================
   INTRO OVERLAY
   ============================================ */
let introActive = true;

function initIntro() {
    const overlay = document.getElementById('lesson-intro');
    if (!overlay) { introActive = false; return; }

    const saved = progress.getLessonState(lessonData.slug);
    if (saved.practiceDone) {
        overlay.style.display = 'none';
        overlay.classList.add('hidden');
        introActive = false;
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
            wizardSay(`Welcome to "${lessonData.title}"! Start by reading the lesson.`);
        }, 450);
    }

    if (ready) ready.addEventListener('click', dismiss);
    if (skip) skip.addEventListener('click', dismiss);
}

/* ============================================
   RESTORE STATE
   ============================================ */
function restoreState() {
    const saved = progress.getLessonState(lessonData.slug);

    // Restore learn tab state
    if (saved.learnDone) {
        markQuestDone('read');
        updateJourneyMap('learn');
        const learnTab = document.querySelector('#tutorial-tab-bar .panel-tab[data-tab="learn"]');
        if (learnTab) learnTab.classList.add('completed');
        // Unlock compare
        const compareTab = document.querySelector('#tutorial-tab-bar .panel-tab[data-tab="compare"]');
        if (compareTab) compareTab.classList.remove('locked');
    }

    // Restore compare tab state
    if (saved.compareDone) {
        markQuestDone('compare');
        updateJourneyMap('compare');
        const compareTab = document.querySelector('#tutorial-tab-bar .panel-tab[data-tab="compare"]');
        if (compareTab) {
            compareTab.classList.add('completed');
            compareTab.classList.remove('locked');
        }
    }

    // If both tutorial tabs done, unlock practice
    if (saved.learnDone && saved.compareDone) {
        unlockPanel('practice');
    }

    // Restore practice state
    if (saved.practiceDone) {
        panelState.practice = 'completed';
        const panel = document.getElementById('panel-practice');
        if (panel) panel.classList.add('completed');
        const status = document.getElementById('status-practice');
        if (status) status.textContent = '\u2705';
        markQuestDone('practice');
        updateJourneyMap('practice');
        unlockPanel('challenge');
    }

    // Restore challenge state
    if (saved.challengeDone) {
        panelState.challenge = 'completed';
        const panel = document.getElementById('panel-challenge');
        if (panel) panel.classList.add('completed');
        const status = document.getElementById('status-challenge');
        if (status) status.textContent = '\u2705';
        markQuestDone('challenge');
        updateJourneyMap('challenge');
        unlockPanel('test');
    }

    // Restore test state
    if (saved.testDone) {
        panelState.test = 'completed';
        const panel = document.getElementById('panel-test');
        if (panel) panel.classList.add('completed');
        const status = document.getElementById('status-test');
        if (status) status.textContent = '\u2705';
        markQuestDone('test');
        updateJourneyMap('test');
    }

    // Auto-complete learn/compare in progress if not already
    // This ensures isLessonComplete() works when all 3 panels are done
    if (!saved.learnDone) progress.completeTab(lessonData.slug, 'learn', 0, 0);
    if (!saved.compareDone) progress.completeTab(lessonData.slug, 'compare', 0, 0);

    // Refresh all editors after restore
    setTimeout(() => {
        if (window._practiceEditor) window._practiceEditor.refresh();
        if (window._challengeEditor) window._challengeEditor.refresh();
        if (window._testEditor) window._testEditor.refresh();
    }, 200);

    checkAllComplete();
}

/* ============================================
   TUTORIAL TAB CLICK HANDLERS
   ============================================ */
function initTutorialTabs() {
    document.querySelectorAll('#tutorial-tab-bar .panel-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            if (!tabName) return;
            if (tab.classList.contains('locked') && !DEV_MODE) return;
            handleTabView(tabName);
        });
    });
}

/* ============================================
   BOOTSTRAP
   ============================================ */
function init() {
    initIntro();
    initLayoutSwitcher();
    initTutorialTabs();
    initLearnGuide();
    initCompareGuide();
    initPanelHeaders();
    initConsoles();
    initEditors();
    initChallengeUI();
    initTestObjectives();
    initPracticeChecklist();
    initRunButtons();
    initWizard();
    renderTeacherTips();
    renderAnnotations();
    renderInventoryGrid();
    updateMiniHud();
    restoreState();
}

init();
