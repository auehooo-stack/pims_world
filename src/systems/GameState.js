export const initialGameState = {
    hp: 100,
    currentChapter: 1,
    currentMonth: '1~2월',
    hasCheckedInventory: false,
    missingNdaCount: 0,
    requiredNdaCount: 10,
    currentNdaCount: 8,
    hasFoundMissingNdas: false,
    pimsRegistered: false,
    miniGameCleared: false,
    sealedVaultOpened: false,
    stage1Cleared: false
};

export const GameState = {
    data: { ...initialGameState },

    reset() {
        this.data = { ...initialGameState };
    },

    set(key, value) {
        this.data[key] = value;
    },

    get(key) {
        return this.data[key];
    },

    decreaseHp(amount) {
        this.data.hp = Math.max(0, this.data.hp - amount);
    }
};
