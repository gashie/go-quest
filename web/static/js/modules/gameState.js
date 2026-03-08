import { Progress } from './progress.js';

const DEFAULT_EMPIRE_BUILDINGS = [
    { id: 'code_forge', level: 0, unlocked: false, position: { row: 0, col: 0 } },
    { id: 'debug_tower', level: 0, unlocked: false, position: { row: 0, col: 1 } },
    { id: 'syntax_garden', level: 0, unlocked: false, position: { row: 1, col: 0 } },
    { id: 'algorithm_arena', level: 0, unlocked: false, position: { row: 1, col: 1 } },
    { id: 'data_vault', level: 0, unlocked: false, position: { row: 2, col: 0 } },
];

export class GameState {
    constructor(progress) {
        this.progress = progress;
        this._migrate();
    }

    /** Ensure new schema fields exist on old localStorage data */
    _migrate() {
        const s = this.progress._state;
        let changed = false;

        if (!s.inventory) {
            s.inventory = { items: [], capacity: 50 };
            changed = true;
        }
        if (!s.empire) {
            s.empire = {
                buildings: JSON.parse(JSON.stringify(DEFAULT_EMPIRE_BUILDINGS)),
                resources: { stone: 0, circuits: 0, dataGems: 0 },
                lastCollected: null,
            };
            changed = true;
        }
        if (!s.dailyMissions) {
            s.dailyMissions = { date: null, missions: [], completed: [] };
            changed = true;
        }
        if (!s.teacher) {
            s.teacher = { stage: 'robot', interactions: 0 };
            changed = true;
        }
        if (!s.storyProgress) {
            s.storyProgress = { currentChapter: 1, completedChapters: [], unlockedItems: [] };
            changed = true;
        }
        if (!s.miniChallenges) {
            s.miniChallenges = {
                bestScores: { bugHunt: 0, syntaxSprint: 0, functionFrenzy: 0 },
                streaks: { current: 0, best: 0 },
            };
            changed = true;
        }
        if (!s.energy) {
            s.energy = { current: 5, max: 5, lastRegenTime: null };
            changed = true;
        }
        if (!s.stats) {
            s.stats = { totalPlayTime: 0, lessonsToday: 0, loginStreak: 0, lastLoginDate: null };
            changed = true;
        }

        if (changed) this.progress._save();
    }

    getState() { return this.progress.getState(); }
    getLessonState(slug) { return this.progress.getLessonState(slug); }

    // ---- Inventory ----
    getInventory() {
        return this.progress._state.inventory;
    }

    addItem(type, name, quantity = 1) {
        const inv = this.progress._state.inventory;
        const existing = inv.items.find(i => i.type === type);
        if (existing) {
            existing.quantity += quantity;
        } else {
            inv.items.push({
                id: type + '_' + Date.now(),
                type,
                name,
                quantity,
                earnedAt: new Date().toISOString().slice(0, 10),
            });
        }
        this.progress._save();
    }

    removeItem(type, quantity = 1) {
        const inv = this.progress._state.inventory;
        const item = inv.items.find(i => i.type === type);
        if (!item || item.quantity < quantity) return false;
        item.quantity -= quantity;
        if (item.quantity <= 0) {
            inv.items = inv.items.filter(i => i.type !== type);
        }
        this.progress._save();
        return true;
    }

    getItemCount(type) {
        const item = this.progress._state.inventory.items.find(i => i.type === type);
        return item ? item.quantity : 0;
    }

    // ---- Empire ----
    getEmpire() {
        return this.progress._state.empire;
    }

    addResource(type, amount) {
        this.progress._state.empire.resources[type] = (this.progress._state.empire.resources[type] || 0) + amount;
        this.progress._save();
    }

    // ---- Energy ----
    getEnergy() {
        this._regenerateEnergy();
        return this.progress._state.energy;
    }

    consumeEnergy(amount = 1) {
        this._regenerateEnergy();
        const energy = this.progress._state.energy;
        if (energy.current < amount) return false;
        energy.current -= amount;
        this.progress._save();
        return true;
    }

    _regenerateEnergy() {
        const energy = this.progress._state.energy;
        if (energy.current >= energy.max) return;
        if (!energy.lastRegenTime) {
            energy.lastRegenTime = new Date().toISOString();
            this.progress._save();
            return;
        }
        const now = Date.now();
        const last = new Date(energy.lastRegenTime).getTime();
        const elapsedMinutes = (now - last) / (1000 * 60);
        const regened = Math.floor(elapsedMinutes / 30); // 1 per 30 min
        if (regened > 0) {
            energy.current = Math.min(energy.max, energy.current + regened);
            energy.lastRegenTime = new Date().toISOString();
            this.progress._save();
        }
    }

    // ---- Daily Missions ----
    getDailyMissions() {
        return this.progress._state.dailyMissions;
    }

    setDailyMissions(data) {
        this.progress._state.dailyMissions = data;
        this.progress._save();
    }

    // ---- Teacher ----
    getTeacherStage() {
        const level = this.progress._state.level;
        if (level >= 10) return 'deity';
        if (level >= 5) return 'holographic';
        return 'robot';
    }

    // ---- Story ----
    getStoryProgress() {
        return this.progress._state.storyProgress;
    }

    // ---- Mini Challenges ----
    getMiniChallenges() {
        return this.progress._state.miniChallenges;
    }

    updateBestScore(mode, score) {
        const mc = this.progress._state.miniChallenges;
        if (score > (mc.bestScores[mode] || 0)) {
            mc.bestScores[mode] = score;
            this.progress._save();
        }
    }

    // ---- Stats ----
    getStats() {
        return this.progress._state.stats;
    }

    trackLogin() {
        const stats = this.progress._state.stats;
        const today = new Date().toISOString().slice(0, 10);
        if (stats.lastLoginDate !== today) {
            if (stats.lastLoginDate) {
                const last = new Date(stats.lastLoginDate);
                const diff = Math.floor((new Date(today) - last) / (1000 * 60 * 60 * 24));
                stats.loginStreak = diff === 1 ? stats.loginStreak + 1 : 1;
            } else {
                stats.loginStreak = 1;
            }
            stats.lastLoginDate = today;
            stats.lessonsToday = 0;
            this.progress._save();
        }
    }

    // ---- XP helpers (delegate to progress but also track stats) ----
    addXP(amount) {
        this.progress._state.totalXP += amount;
        this.progress._state.level = this.progress._calculateLevel(this.progress._state.totalXP);
        this.progress._save();
    }

    addCoins(amount) {
        this.progress._state.totalCoins = (this.progress._state.totalCoins || 0) + amount;
        this.progress._save();
    }
}
