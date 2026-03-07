const STORAGE_KEY = 'goquest_progress';

const DEFAULT_STATE = {
    totalXP: 0,
    totalCoins: 0,
    level: 1,
    completedLessons: {},
    badges: [],
    currentPhase: 1,
};

export class Progress {
    constructor() {
        this._state = this._load();
    }

    _load() {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { ...DEFAULT_STATE };
        try {
            return JSON.parse(raw);
        } catch {
            return { ...DEFAULT_STATE };
        }
    }

    _save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state));
    }

    getState() {
        return { ...this._state };
    }

    getLessonState(slug) {
        return this._state.completedLessons[slug] || {
            learnDone: false,
            compareDone: false,
            practiceDone: false,
            challengeDone: false,
            testDone: false,
            xpEarned: 0,
        };
    }

    completeTab(slug, tabName, xpReward, coinReward = 0) {
        if (!this._state.completedLessons[slug]) {
            this._state.completedLessons[slug] = {
                learnDone: false,
                compareDone: false,
                practiceDone: false,
                challengeDone: false,
                testDone: false,
                xpEarned: 0,
                coinsEarned: 0,
            };
        }

        const key = tabName + 'Done';
        if (this._state.completedLessons[slug][key]) {
            return { xp: 0, coins: 0 }; // Already completed
        }

        this._state.completedLessons[slug][key] = true;
        this._state.completedLessons[slug].xpEarned += xpReward;
        this._state.completedLessons[slug].coinsEarned += coinReward;
        this._state.totalXP += xpReward;
        this._state.totalCoins = (this._state.totalCoins || 0) + coinReward;
        this._state.level = this._calculateLevel(this._state.totalXP);
        this._save();
        return { xp: xpReward, coins: coinReward };
    }

    addBadge(badgeId) {
        if (!this._state.badges.includes(badgeId)) {
            this._state.badges.push(badgeId);
            this._save();
        }
    }

    isLessonComplete(slug) {
        const s = this._state.completedLessons[slug];
        if (!s) return false;
        return s.learnDone && s.compareDone && s.practiceDone && s.challengeDone && s.testDone;
    }

    countCompleted() {
        return Object.keys(this._state.completedLessons)
            .filter(slug => this.isLessonComplete(slug)).length;
    }

    _calculateLevel(xp) {
        return Math.floor(Math.sqrt(xp / 25)) + 1;
    }
}
