import { CodeEditor } from './codeEditor.js';
import { CodeRunner } from './codeRunner.js';
import { Progress } from './progress.js';
import { Gamification } from './gamification.js';

const dataEl = document.getElementById('lesson-data');
if (!dataEl) throw new Error('No lesson data found');

const lessonData = JSON.parse(dataEl.textContent);
const progress = new Progress();
const gamification = new Gamification(progress);
const runner = new CodeRunner();

const TAB_ORDER = ['learn', 'compare', 'practice', 'challenge', 'test'];
let currentStep = 0; // which tab is the furthest unlocked

// ---- Teacher tip icons ----
const TIP_ICONS = {
    gotcha: '\u26A0\uFE0F',    // warning sign
    remember: '\u{1F4CC}',      // pushpin
    protip: '\u{1F4A1}',        // lightbulb
    warning: '\u{1F6A8}',       // rotating light
};

// ---- Navigation Bar ----
function updateNav() {
    const state = progress.getState();
    const levelEl = document.getElementById('nav-level');
    const xpEl = document.getElementById('nav-xp');
    const fillEl = document.getElementById('nav-xp-fill');
    const coinsEl = document.getElementById('nav-coins');
    if (levelEl) levelEl.textContent = `Lvl ${state.level}`;
    if (xpEl) xpEl.textContent = `${state.totalXP} XP`;
    if (fillEl) fillEl.style.width = `${gamification.percentToNextLevel(state.totalXP)}%`;
    if (coinsEl) coinsEl.textContent = `${state.totalCoins || 0} coins`;
}

function checkBadges() {
    const newBadges = gamification.checkNewBadges();
    newBadges.forEach(b => gamification.showBadgeUnlock(b));
}

function awardXP(tab, xpAmount, coinAmount = 0) {
    const result = progress.completeTab(lessonData.slug, tab, xpAmount, coinAmount);
    if (result.xp > 0 || result.coins > 0) {
        if (result.xp > 0) gamification.showXPPopup(result.xp);
        if (result.coins > 0) showCoinPopup(result.coins);
        updateNav();
        checkBadges();
        updateTabStates();
        checkLessonComplete();
    }
    return result;
}

function showCoinPopup(amount) {
    const popup = document.getElementById('xp-popup');
    if (!popup) return;
    setTimeout(() => {
        popup.textContent = `+${amount} coins`;
        popup.style.background = '#a78bfa';
        popup.classList.remove('hidden', 'animate');
        void popup.offsetWidth;
        popup.classList.add('animate');
        setTimeout(() => {
            popup.classList.remove('animate');
            popup.classList.add('hidden');
            popup.style.background = '';
        }, 2000);
    }, 1500);
}

// ---- Tab Locking System ----
const tabBtns = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

function unlockTab(step) {
    if (step > currentStep) currentStep = step;
    tabBtns.forEach(btn => {
        const btnStep = parseInt(btn.dataset.step);
        if (btnStep <= currentStep) {
            btn.classList.remove('locked');
        }
    });
}

function switchToTab(tabName) {
    const btn = document.querySelector(`[data-tab="${tabName}"]`);
    if (!btn || btn.classList.contains('locked')) return;

    tabBtns.forEach(b => b.classList.remove('active'));
    tabPanels.forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    const panel = document.getElementById(`tab-${tabName}`);
    if (panel) panel.classList.add('active');

    handleTabView(tabName);

    if (tabName === 'practice' && practiceEditor) practiceEditor.refresh();
    if (tabName === 'challenge' && challengeEditor) challengeEditor.refresh();
    if (tabName === 'test' && testEditor) testEditor.refresh();
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.classList.contains('locked')) return;
        switchToTab(btn.dataset.tab);
    });
});

// Next tab buttons — unlock the next tab when clicked
document.querySelectorAll('.btn-next-tab').forEach(btn => {
    btn.addEventListener('click', () => {
        const nextTab = btn.dataset.next;
        const nextStep = TAB_ORDER.indexOf(nextTab);
        unlockTab(nextStep);
        switchToTab(nextTab);
    });
});

function handleTabView(tabName) {
    const xpPerTab = Math.floor(lessonData.xpReward / 5);
    const coinsPerTab = Math.floor(lessonData.coinReward / 5);
    if (tabName === 'learn' || tabName === 'compare') {
        awardXP(tabName, xpPerTab, coinsPerTab);
    }
}

function updateTabStates() {
    const state = progress.getLessonState(lessonData.slug);
    const tabs = {
        learn: state.learnDone,
        compare: state.compareDone,
        practice: state.practiceDone,
        challenge: state.challengeDone,
        test: state.testDone,
    };

    tabBtns.forEach(btn => {
        const tab = btn.dataset.tab;
        if (tabs[tab]) {
            btn.classList.add('completed');
            // Unlock the next tab if this one is done
            const step = TAB_ORDER.indexOf(tab);
            if (step + 1 < TAB_ORDER.length) unlockTab(step + 1);
        }
    });
}

// ---- Lesson Complete Check ----
function checkLessonComplete() {
    if (progress.isLessonComplete(lessonData.slug)) {
        const completeEl = document.getElementById('lesson-complete');
        if (completeEl && completeEl.classList.contains('hidden')) {
            completeEl.classList.remove('hidden');
            const state = progress.getLessonState(lessonData.slug);
            const xpEl = document.getElementById('total-xp-earned');
            const coinsEl = document.getElementById('total-coins-earned');
            if (xpEl) xpEl.textContent = state.xpEarned || lessonData.xpReward;
            if (coinsEl) coinsEl.textContent = state.coinsEarned || lessonData.coinReward;
        }
    }
}

// ---- Teacher Tips Rendering ----
const tipsContainer = document.getElementById('teacher-tips');
if (tipsContainer && lessonData.teacherTips && lessonData.teacherTips.length > 0) {
    lessonData.teacherTips.forEach(tip => {
        const icon = TIP_ICONS[tip.type] || '\u{1F4AC}';
        const div = document.createElement('div');
        div.className = `teacher-tip ${tip.type}`;
        div.innerHTML = `
            <div class="tip-header">
                <span class="tip-icon">${icon}</span>
                <span>${escapeHtml(tip.title)}</span>
            </div>
            <div class="tip-content">${escapeHtml(tip.content)}</div>
        `;
        tipsContainer.appendChild(div);
    });
}

// ---- Explanation Rendering ----
const explanationEl = document.getElementById('learn-explanation');
if (explanationEl && lessonData.explanation) {
    let html = lessonData.explanation
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
        .replace(/^- (.+)$/gm, '<li>$1</li>')
        .replace(/(<li>[\s\S]*?<\/li>)/g, function(match) { return '<ul>' + match + '</ul>'; })
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    explanationEl.innerHTML = `<p>${html}</p>`;
}

// ---- Annotations ----
const annotationsEl = document.getElementById('annotations');
if (annotationsEl && lessonData.annotations) {
    lessonData.annotations.forEach(ann => {
        const div = document.createElement('div');
        div.className = 'annotation-row';
        div.innerHTML = `
            <span class="ann-line-ref">JS:${ann.lineNode} &harr; Go:${ann.lineGo}</span>
            <span class="ann-text">${escapeHtml(ann.text)}</span>
        `;
        annotationsEl.appendChild(div);
    });
}

// ---- Practice Editor ----
let practiceEditor = null;
const practiceEditorEl = document.getElementById('practice-editor');
if (practiceEditorEl && lessonData.playable) {
    const starterCode = lessonData.goCode.replace(
        /func main\(\) \{[\s\S]*\}/,
        'func main() {\n\t// Your code here\n}'
    );
    practiceEditor = new CodeEditor('practice-editor', { initialValue: starterCode });
}

const btnRun = document.getElementById('btn-run');
if (btnRun) {
    btnRun.addEventListener('click', async () => {
        if (!practiceEditor) return;
        const outputPanel = document.getElementById('practice-output');
        const outputText = document.getElementById('output-text');
        outputPanel.classList.remove('hidden', 'error');
        outputText.textContent = 'Running...';
        btnRun.disabled = true;

        const result = await runner.run(practiceEditor.getValue());
        btnRun.disabled = false;

        if (result.success) {
            outputText.textContent = result.output || '(no output)';
            outputPanel.classList.remove('error');
            const xpPerTab = Math.floor(lessonData.xpReward / 5);
            const coinsPerTab = Math.floor(lessonData.coinReward / 5);
            awardXP('practice', xpPerTab, coinsPerTab);
            // Unlock challenge tab after successful run
            unlockTab(TAB_ORDER.indexOf('challenge'));
        } else {
            outputText.textContent = result.error;
            outputPanel.classList.add('error');
        }
    });
}

const btnReset = document.getElementById('btn-reset');
if (btnReset && practiceEditor) {
    btnReset.addEventListener('click', () => {
        const starterCode = lessonData.goCode.replace(
            /func main\(\) \{[\s\S]*\}/,
            'func main() {\n\t// Your code here\n}'
        );
        practiceEditor.setValue(starterCode);
    });
}

const btnSolution = document.getElementById('btn-solution');
if (btnSolution && practiceEditor) {
    btnSolution.addEventListener('click', () => {
        practiceEditor.setValue(lessonData.goCode);
    });
}

// ---- Challenge ----
let challengeEditor = null;
const challengeEditorEl = document.getElementById('challenge-editor');
const challenge = lessonData.challenge;
let hintIndex = 0;
const hasChallenge = challenge && challenge.type;
const hasTests = lessonData.testCases && lessonData.testCases.length > 0;

// If no challenge content, show a message and auto-complete on button click
if (challengeEditorEl && !hasChallenge) {
    const panel = document.getElementById('tab-challenge');
    if (panel) {
        const header = panel.querySelector('.challenge-header') || panel;
        header.innerHTML = `<div class="no-content-msg">
            <h2>No Challenge for This Lesson</h2>
            <p>This lesson doesn't have an interactive challenge. You can move on to the next step!</p>
        </div>`;
        // Hide editor and controls
        challengeEditorEl.style.display = 'none';
        const controls = panel.querySelector('.editor-controls');
        if (controls) controls.style.display = 'none';
    }
    // Auto-complete challenge when tab is viewed
    const challengeBtn = document.querySelector('[data-tab="challenge"]');
    if (challengeBtn) {
        const origClick = () => {
            const xpPerTab = Math.floor(lessonData.xpReward / 5);
            const coinsPerTab = Math.floor(lessonData.coinReward / 5);
            awardXP('challenge', xpPerTab, coinsPerTab);
            unlockTab(TAB_ORDER.indexOf('test'));
            const btnToTest = document.getElementById('btn-to-test');
            if (btnToTest) btnToTest.classList.remove('hidden');
            challengeBtn.removeEventListener('click', origClick);
        };
        // Wait for tab unlock, then auto-award on first view
        const obs = new MutationObserver(() => {
            if (!challengeBtn.classList.contains('locked')) {
                origClick();
                obs.disconnect();
            }
        });
        obs.observe(challengeBtn, { attributes: true, attributeFilter: ['class'] });
    }
}

if (challengeEditorEl && hasChallenge) {
    const promptEl = document.getElementById('challenge-prompt');
    if (promptEl) {
        promptEl.innerHTML = `<span class="challenge-type-tag">${challenge.type.replace(/_/g, ' ')}</span>
            <p>${challenge.prompt.replace(/\n/g, '<br>')}</p>`;
    }

    const bonusEl = document.getElementById('bonus-xp-display');
    if (bonusEl && challenge.bonusXP) {
        bonusEl.textContent = `+${challenge.bonusXP} XP  +${challenge.bonusCoins || 0} coins`;
    }

    challengeEditor = new CodeEditor('challenge-editor', { initialValue: challenge.starterCode || '' });

    const btnSubmit = document.getElementById('btn-challenge-run');
    if (btnSubmit) {
        btnSubmit.addEventListener('click', async () => {
            const resultDiv = document.getElementById('challenge-result');
            resultDiv.classList.remove('hidden');
            resultDiv.innerHTML = '<p>Running...</p>';
            btnSubmit.disabled = true;

            const result = await runner.run(challengeEditor.getValue());
            btnSubmit.disabled = false;

            if (!result.success) {
                resultDiv.innerHTML = `<div class="result-fail">
                    <h3>Compile Error</h3>
                    <pre>${escapeHtml(result.error)}</pre>
                </div>`;
                return;
            }

            const expected = (challenge.expectedOutput || '').trim();
            const actual = (result.output || '').trim();

            if (actual === expected) {
                resultDiv.innerHTML = `<div class="result-pass">
                    <h3>Correct!</h3>
                    <pre>${escapeHtml(result.output)}</pre>
                </div>`;
                awardXP('challenge', challenge.bonusXP || 5, challenge.bonusCoins || 3);
                // Unlock test tab and show next button
                unlockTab(TAB_ORDER.indexOf('test'));
                const btnToTest = document.getElementById('btn-to-test');
                if (btnToTest) btnToTest.classList.remove('hidden');
            } else {
                resultDiv.innerHTML = `<div class="result-fail">
                    <h3>Not quite...</h3>
                    <p><strong>Expected:</strong></p><pre>${escapeHtml(expected)}</pre>
                    <p><strong>Your output:</strong></p><pre>${escapeHtml(actual)}</pre>
                </div>`;
            }
        });
    }

    const btnHint = document.getElementById('btn-hint');
    if (btnHint && challenge.hints) {
        btnHint.addEventListener('click', () => {
            if (hintIndex >= challenge.hints.length) return;
            const resultDiv = document.getElementById('challenge-result');
            resultDiv.classList.remove('hidden');
            const hint = challenge.hints[hintIndex++];
            const hintEl = document.createElement('div');
            hintEl.className = 'hint';
            hintEl.textContent = `Hint ${hintIndex}: ${hint}`;
            resultDiv.appendChild(hintEl);
        });
    }

    const btnChallengeReset = document.getElementById('btn-challenge-reset');
    if (btnChallengeReset) {
        btnChallengeReset.addEventListener('click', () => {
            challengeEditor.setValue(challenge.starterCode || '');
            hintIndex = 0;
            const resultDiv = document.getElementById('challenge-result');
            resultDiv.classList.add('hidden');
            resultDiv.innerHTML = '';
        });
    }
}

// ---- Tests ----
let testEditor = null;
const testEditorEl = document.getElementById('test-editor');
const testCases = lessonData.testCases || [];

// If no test cases, show message and auto-complete on tab view
if (testEditorEl && testCases.length === 0) {
    const panel = document.getElementById('tab-test');
    if (panel) {
        panel.innerHTML = `<div class="no-content-msg">
            <h2>No Tests for This Lesson</h2>
            <p>This lesson doesn't have automated tests. You've completed all available steps!</p>
        </div>`;
    }
    // Auto-complete test when tab is unlocked/viewed
    const testBtn = document.querySelector('[data-tab="test"]');
    if (testBtn) {
        const autoComplete = () => {
            const xpPerTab = Math.floor(lessonData.xpReward / 5);
            const coinsPerTab = Math.floor(lessonData.coinReward / 5);
            awardXP('test', xpPerTab, coinsPerTab);
            testBtn.removeEventListener('click', autoComplete);
        };
        const obs = new MutationObserver(() => {
            if (!testBtn.classList.contains('locked')) {
                autoComplete();
                obs.disconnect();
            }
        });
        obs.observe(testBtn, { attributes: true, attributeFilter: ['class'] });
    }
}

if (testEditorEl && testCases.length > 0) {
    testEditor = new CodeEditor('test-editor', { initialValue: lessonData.goCode });

    const btnRunTests = document.getElementById('btn-run-tests');
    if (btnRunTests) {
        btnRunTests.addEventListener('click', async () => {
            const resultsDiv = document.getElementById('test-results');
            resultsDiv.innerHTML = '';
            let allPassed = true;
            btnRunTests.disabled = true;

            for (const test of testCases) {
                const card = document.createElement('div');
                card.className = 'test-card running';
                card.innerHTML = `<span class="test-name">${escapeHtml(test.name)}</span><span class="test-status">Running...</span>`;
                resultsDiv.appendChild(card);

                let fullCode = testEditor.getValue();
                if (test.wrapperCode) {
                    fullCode = fullCode.replace(/func main\(\)[\s\S]*$/, '') + '\n' + test.wrapperCode;
                }

                const result = await runner.run(fullCode);

                if (!result.success) {
                    card.className = 'test-card fail';
                    card.querySelector('.test-status').textContent = 'FAIL';
                    const errPre = document.createElement('pre');
                    errPre.className = 'test-error';
                    errPre.textContent = result.error;
                    card.appendChild(errPre);
                    allPassed = false;
                    continue;
                }

                const passed = result.output.trim() === (test.expectedOutput || '').trim();
                card.className = `test-card ${passed ? 'pass' : 'fail'}`;
                card.querySelector('.test-status').textContent = passed ? 'PASS' : 'FAIL';

                if (!passed) {
                    const diff = document.createElement('pre');
                    diff.className = 'test-diff';
                    diff.textContent = `Expected: ${test.expectedOutput}\nGot:      ${result.output}`;
                    card.appendChild(diff);
                    allPassed = false;
                }
            }

            btnRunTests.disabled = false;

            if (allPassed) {
                const xpPerTab = Math.floor(lessonData.xpReward / 5);
                const coinsPerTab = Math.floor(lessonData.coinReward / 5);
                awardXP('test', xpPerTab, coinsPerTab);
            }
        });
    }
}

// ---- Keyboard Shortcut ----
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const activeTab = document.querySelector('.tab-btn.active');
        if (!activeTab) return;
        const tab = activeTab.dataset.tab;
        if (tab === 'practice') btnRun?.click();
        else if (tab === 'challenge') document.getElementById('btn-challenge-run')?.click();
        else if (tab === 'test') document.getElementById('btn-run-tests')?.click();
    }
});

// ---- Syntax Highlighting ----
if (typeof Prism !== 'undefined') {
    Prism.highlightAll();
}

// ---- Init ----
updateNav();
updateTabStates();
handleTabView('learn');
checkLessonComplete();

// Restore tab state from progress — unlock tabs already completed
const savedState = progress.getLessonState(lessonData.slug);
if (savedState.learnDone) unlockTab(1);
if (savedState.compareDone) unlockTab(2);
if (savedState.practiceDone) unlockTab(3);
if (savedState.challengeDone) {
    unlockTab(4);
    const btnToTest = document.getElementById('btn-to-test');
    if (btnToTest) btnToTest.classList.remove('hidden');
}

// ---- Util ----
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
