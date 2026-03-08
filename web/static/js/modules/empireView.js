import { Progress } from './progress.js';
import { GameState } from './gameState.js';
import { Inventory } from './inventory.js';

const progress = new Progress();
const gameState = new GameState(progress);
const inventory = new Inventory(gameState);

const BUILDING_DEFS = {
    code_forge: {
        name: 'Code Forge',
        icon: '\uD83D\uDD25', // fire
        description: 'Generates passive XP over time',
        maxLevel: 5,
        upgradeCosts: [
            { stone: 5, circuits: 0, dataGems: 0 },
            { stone: 10, circuits: 3, dataGems: 0 },
            { stone: 20, circuits: 8, dataGems: 0 },
            { stone: 40, circuits: 15, dataGems: 2 },
            { stone: 80, circuits: 30, dataGems: 5 },
        ],
        passiveXPPerHour: [0, 2, 5, 10, 20, 40],
        unlockRequirement: 'Complete Phase 1',
        unlockCheck: () => {
            const s = progress.getState();
            const phase1 = ['print','comments','variables','types','interpolation','ifelse','switch','for_loop','while_loop','functions','default_values','iife'];
            return phase1.some(slug => s.completedLessons[slug]);
        },
    },
    debug_tower: {
        name: 'Debug Tower',
        icon: '\uD83D\uDEE1\uFE0F', // shield
        description: 'Produces Debugger Tools periodically',
        maxLevel: 5,
        upgradeCosts: [
            { stone: 8, circuits: 2, dataGems: 0 },
            { stone: 15, circuits: 6, dataGems: 0 },
            { stone: 25, circuits: 12, dataGems: 1 },
            { stone: 50, circuits: 20, dataGems: 3 },
            { stone: 100, circuits: 40, dataGems: 8 },
        ],
        passiveXPPerHour: [0, 1, 3, 6, 12, 24],
        unlockRequirement: 'Complete 5 lessons',
        unlockCheck: () => progress.countCompleted() >= 5,
    },
    syntax_garden: {
        name: 'Syntax Garden',
        icon: '\uD83C\uDF31', // seedling
        description: 'Grows Syntax Boosters over time',
        maxLevel: 5,
        upgradeCosts: [
            { stone: 6, circuits: 1, dataGems: 0 },
            { stone: 12, circuits: 4, dataGems: 0 },
            { stone: 22, circuits: 10, dataGems: 1 },
            { stone: 45, circuits: 18, dataGems: 3 },
            { stone: 90, circuits: 35, dataGems: 6 },
        ],
        passiveXPPerHour: [0, 1, 2, 5, 10, 20],
        unlockRequirement: 'Complete 10 lessons',
        unlockCheck: () => progress.countCompleted() >= 10,
    },
    algorithm_arena: {
        name: 'Algorithm Arena',
        icon: '\u2694\uFE0F', // crossed swords
        description: 'Unlocks advanced mini-challenge modes',
        maxLevel: 5,
        upgradeCosts: [
            { stone: 10, circuits: 5, dataGems: 1 },
            { stone: 20, circuits: 10, dataGems: 2 },
            { stone: 35, circuits: 18, dataGems: 4 },
            { stone: 60, circuits: 30, dataGems: 7 },
            { stone: 120, circuits: 50, dataGems: 12 },
        ],
        passiveXPPerHour: [0, 2, 4, 8, 16, 32],
        unlockRequirement: 'Complete 20 lessons',
        unlockCheck: () => progress.countCompleted() >= 20,
    },
    data_vault: {
        name: 'Data Vault',
        icon: '\uD83C\uDFE6', // bank
        description: 'Increases inventory capacity and coin storage',
        maxLevel: 5,
        upgradeCosts: [
            { stone: 7, circuits: 3, dataGems: 0 },
            { stone: 14, circuits: 7, dataGems: 1 },
            { stone: 28, circuits: 14, dataGems: 2 },
            { stone: 55, circuits: 25, dataGems: 5 },
            { stone: 110, circuits: 45, dataGems: 10 },
        ],
        passiveXPPerHour: [0, 1, 2, 4, 8, 16],
        unlockRequirement: 'Complete 3 lessons',
        unlockCheck: () => progress.countCompleted() >= 3,
    },
};

function renderEmpire() {
    const empire = gameState.getEmpire();
    const grid = document.getElementById('empire-grid');
    if (!grid) return;

    grid.innerHTML = '';

    // Update resource display
    const stoneEl = document.getElementById('res-stone');
    const circuitsEl = document.getElementById('res-circuits');
    const dagemsEl = document.getElementById('res-datagems');
    if (stoneEl) stoneEl.textContent = empire.resources.stone || 0;
    if (circuitsEl) circuitsEl.textContent = empire.resources.circuits || 0;
    if (dagemsEl) dagemsEl.textContent = empire.resources.dataGems || 0;

    for (const [id, def] of Object.entries(BUILDING_DEFS)) {
        const bState = empire.buildings.find(b => b.id === id) || { id, level: 0, unlocked: false };
        const isUnlocked = def.unlockCheck();
        const card = document.createElement('div');
        const levelClass = bState.level > 0 ? `level-${bState.level}` : '';
        card.className = `building-card ${isUnlocked ? 'unlocked' : 'locked'} ${levelClass}`;

        const nextLevel = bState.level + 1;
        const canUpgrade = nextLevel <= def.maxLevel && isUnlocked;
        const cost = canUpgrade ? def.upgradeCosts[bState.level] : null;
        const hasResources = cost
            ? (empire.resources.stone || 0) >= cost.stone &&
              (empire.resources.circuits || 0) >= cost.circuits &&
              (empire.resources.dataGems || 0) >= cost.dataGems
            : false;

        card.innerHTML = `
            <div class="building-visual">
                <div class="building-icon">${def.icon}</div>
                <div class="building-level-indicator">${bState.level > 0 ? 'Lv. ' + bState.level : ''}</div>
            </div>
            <div class="building-info">
                <h3>${def.name}</h3>
                <p>${def.description}</p>
            </div>
            <div class="building-production">
                ${bState.level > 0 ? `+${def.passiveXPPerHour[bState.level]} XP/hour` : 'Not built yet'}
            </div>
            ${canUpgrade ? `
                <div class="upgrade-cost">
                    ${cost.stone ? `<span>&#x1FAA8; ${cost.stone}</span>` : ''}
                    ${cost.circuits ? `<span>&#x1F50C; ${cost.circuits}</span>` : ''}
                    ${cost.dataGems ? `<span>&#x1F48E; ${cost.dataGems}</span>` : ''}
                </div>
                <button class="btn-upgrade" data-building="${id}" ${!hasResources ? 'disabled' : ''}>
                    ${bState.level === 0 ? 'Build' : `Upgrade to Lv. ${nextLevel}`}
                </button>
            ` : bState.level >= def.maxLevel ? '<div class="building-production">MAX LEVEL</div>' : `<div class="upgrade-cost">${def.unlockRequirement}</div>`}
        `;

        grid.appendChild(card);
    }

    // Attach upgrade handlers
    grid.querySelectorAll('.btn-upgrade').forEach(btn => {
        btn.addEventListener('click', () => {
            const buildingId = btn.dataset.building;
            upgradeBuilding(buildingId);
        });
    });

    // Render passive info
    renderPassiveInfo(empire);
}

function upgradeBuilding(buildingId) {
    const empire = gameState.getEmpire();
    const bState = empire.buildings.find(b => b.id === buildingId);
    const def = BUILDING_DEFS[buildingId];
    if (!bState || !def) return;

    const nextLevel = bState.level + 1;
    if (nextLevel > def.maxLevel) return;

    const cost = def.upgradeCosts[bState.level];
    const res = empire.resources;

    if ((res.stone || 0) < cost.stone || (res.circuits || 0) < cost.circuits || (res.dataGems || 0) < cost.dataGems) {
        return;
    }

    // Deduct resources
    res.stone -= cost.stone;
    res.circuits -= cost.circuits;
    res.dataGems -= cost.dataGems;

    // Upgrade
    bState.level = nextLevel;
    bState.unlocked = true;

    progress._save();
    renderEmpire();
}

function collectPassiveRewards(empire) {
    const now = Date.now();
    const lastCollected = empire.lastCollected ? new Date(empire.lastCollected).getTime() : now;
    const elapsedHours = Math.min((now - lastCollected) / (1000 * 60 * 60), 8); // cap at 8h

    let totalXP = 0;
    for (const bState of empire.buildings) {
        if (bState.level <= 0) continue;
        const def = BUILDING_DEFS[bState.id];
        if (!def) continue;
        const xpGained = Math.floor(def.passiveXPPerHour[bState.level] * elapsedHours);
        totalXP += xpGained;
    }

    if (totalXP > 0) {
        gameState.addXP(totalXP);
    }

    empire.lastCollected = new Date().toISOString();
    progress._save();
    return totalXP;
}

function renderPassiveInfo(empire) {
    const div = document.getElementById('empire-passive');
    if (!div) return;

    let totalPerHour = 0;
    for (const bState of empire.buildings) {
        if (bState.level <= 0) continue;
        const def = BUILDING_DEFS[bState.id];
        if (def) totalPerHour += def.passiveXPPerHour[bState.level];
    }

    div.innerHTML = `
        <h3>Passive Income</h3>
        <p>Your empire generates <strong>+${totalPerHour} XP/hour</strong> while you're away (max 8 hours).</p>
    `;
}

// ---- Init ----
const empire = gameState.getEmpire();
const collected = collectPassiveRewards(empire);
renderEmpire();
inventory.renderBar('inventory-bar');

if (collected > 0) {
    // Show collection notification
    const div = document.createElement('div');
    div.className = 'item-drop-popup show';
    div.innerHTML = `
        <span class="item-drop-icon">\u2728</span>
        <span class="item-drop-name" style="color:#f59e0b">Passive Rewards</span>
        <span class="item-drop-qty">+${collected} XP</span>
    `;
    document.body.appendChild(div);
    setTimeout(() => {
        div.classList.add('fade-out');
        setTimeout(() => div.remove(), 500);
    }, 3000);
}
