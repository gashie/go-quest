/**
 * Inventory System — Item definitions, drop tables, rendering
 */

export const ITEM_DEFS = {
    xp_crystal: {
        name: 'XP Crystal',
        icon: '\u2728',       // sparkles
        rarity: 'common',
        color: '#f59e0b',
        effect: 'bonus_xp_25',
        description: '+25% XP on next lesson',
    },
    code_scroll: {
        name: 'Code Scroll',
        icon: '\uD83D\uDCDC', // scroll
        rarity: 'uncommon',
        color: '#8b5cf6',
        effect: 'unlock_hint',
        description: 'Reveals a challenge hint',
    },
    debugger_tool: {
        name: 'Debugger Tool',
        icon: '\uD83D\uDD27', // wrench
        rarity: 'rare',
        color: '#ef4444',
        effect: 'highlight_errors',
        description: 'Highlights errors in your code',
    },
    syntax_booster: {
        name: 'Syntax Booster',
        icon: '\u26A1',       // lightning
        rarity: 'uncommon',
        color: '#06b6d4',
        effect: 'auto_complete',
        description: 'Auto-completes syntax',
    },
    blueprint: {
        name: 'Blueprint',
        icon: '\uD83D\uDCD0', // triangular ruler
        rarity: 'rare',
        color: '#3b82f6',
        effect: 'unlock_building',
        description: 'Unlocks a new empire building',
    },
    stone: {
        name: 'Stone',
        icon: '\uD83E\uDEA8', // rock
        rarity: 'common',
        color: '#78716c',
        effect: 'resource',
        description: 'Building material for your empire',
    },
    circuit: {
        name: 'Circuit',
        icon: '\uD83D\uDD0C', // plug
        rarity: 'uncommon',
        color: '#22c55e',
        effect: 'resource',
        description: 'Tech component for upgrades',
    },
    data_gem: {
        name: 'Data Gem',
        icon: '\uD83D\uDC8E', // gem
        rarity: 'rare',
        color: '#a855f7',
        effect: 'resource',
        description: 'Premium resource for advanced buildings',
    },
};

const RARITY_COLORS = {
    common: '#94a3b8',
    uncommon: '#8b5cf6',
    rare: '#f59e0b',
};

/** Drop tables per context — each entry is { type, chance (0-1) } */
const DROP_TABLES = {
    lesson_complete: [
        { type: 'xp_crystal', chance: 0.35 },
        { type: 'stone', chance: 0.55 },
        { type: 'circuit', chance: 0.15 },
    ],
    challenge_perfect: [
        { type: 'code_scroll', chance: 0.40 },
        { type: 'circuit', chance: 0.35 },
        { type: 'data_gem', chance: 0.08 },
        { type: 'syntax_booster', chance: 0.15 },
    ],
    test_all_pass: [
        { type: 'stone', chance: 0.45 },
        { type: 'debugger_tool', chance: 0.12 },
        { type: 'blueprint', chance: 0.04 },
        { type: 'syntax_booster', chance: 0.18 },
    ],
    daily_mission: [
        { type: 'data_gem', chance: 0.25 },
        { type: 'blueprint', chance: 0.08 },
        { type: 'xp_crystal', chance: 0.40 },
        { type: 'code_scroll', chance: 0.30 },
    ],
};

export class Inventory {
    constructor(gameState) {
        this.gs = gameState;
    }

    /** Roll drops for a given context. Returns array of { type, name, quantity } */
    rollDrop(context) {
        const table = DROP_TABLES[context];
        if (!table) return [];

        const drops = [];
        for (const entry of table) {
            if (Math.random() < entry.chance) {
                const def = ITEM_DEFS[entry.type];
                drops.push({ type: entry.type, name: def.name, quantity: 1 });
                this.gs.addItem(entry.type, def.name, 1);
                // resources go to empire resources too
                if (entry.type === 'stone') this.gs.addResource('stone', 1);
                if (entry.type === 'circuit') this.gs.addResource('circuits', 1);
                if (entry.type === 'data_gem') this.gs.addResource('dataGems', 1);
            }
        }
        return drops;
    }

    /** Render the bottom inventory bar */
    renderBar(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const inv = this.gs.getInventory();
        container.innerHTML = '';

        // Group by type
        const grouped = {};
        for (const item of inv.items) {
            grouped[item.type] = (grouped[item.type] || 0) + item.quantity;
        }

        // Render each item type
        for (const [type, qty] of Object.entries(grouped)) {
            const def = ITEM_DEFS[type];
            if (!def || qty <= 0) continue;
            const slot = document.createElement('div');
            slot.className = `inv-slot rarity-${def.rarity}`;
            slot.title = `${def.name}: ${def.description}`;
            slot.innerHTML = `
                <span class="inv-icon">${def.icon}</span>
                <span class="inv-qty">${qty}</span>
            `;
            container.appendChild(slot);
        }

        // Empty state
        if (container.children.length === 0) {
            container.innerHTML = '<span class="inv-empty">Complete lessons to earn items!</span>';
        }
    }

    /** Show item drop popup animation */
    showItemPopup(item) {
        const def = ITEM_DEFS[item.type];
        if (!def) return;

        const popup = document.createElement('div');
        popup.className = 'item-drop-popup';
        popup.innerHTML = `
            <span class="item-drop-icon">${def.icon}</span>
            <span class="item-drop-name" style="color:${def.color}">${def.name}</span>
            <span class="item-drop-qty">+${item.quantity}</span>
        `;
        document.body.appendChild(popup);

        // Trigger animation
        requestAnimationFrame(() => {
            popup.classList.add('show');
            setTimeout(() => {
                popup.classList.add('fade-out');
                setTimeout(() => popup.remove(), 500);
            }, 2000);
        });
    }

    /** Show all drops with staggered animation */
    showDrops(drops) {
        drops.forEach((drop, i) => {
            setTimeout(() => this.showItemPopup(drop), i * 600);
        });
    }
}
