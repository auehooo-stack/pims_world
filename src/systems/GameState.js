const cloneDate = (date) => ({ ...date });

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const initialGameState = {
    hp: 100,
    currentChapter: 1,
    currentMonth: '1~2월',
    startDate: { year: 1, month: 1, day: 1 },
    currentDate: { year: 1, month: 1, day: 1 },
    endDate: { year: 2, month: 3, day: 31 },
    executionRate: 0,
    budgetStatus: '미교부',
    timeRunning: true,
    idleHpDecayEnabled: false,
    hasCheckedInventory: false,
    missingNdaCount: 0,
    requiredNdaCount: 10,
    currentNdaCount: 8,
    hasFoundMissingNdas: false,
    pimsRegistered: false,
    miniGameCleared: false,
    sealedVaultOpened: false,
    stage1Cleared: false,
    businessCostCoin: false,
    savedPlayerPosition: null
};

const cloneInitialState = () => ({
    ...initialGameState,
    startDate: cloneDate(initialGameState.startDate),
    currentDate: cloneDate(initialGameState.currentDate),
    endDate: cloneDate(initialGameState.endDate)
});

export const GameState = {
    data: cloneInitialState(),

    reset() {
        this.data = cloneInitialState();
    },

    set(key, value) {
        this.data[key] = value;
    },

    get(key) {
        return this.data[key];
    },

    getCurrentObjective() {
        if (this.get('miniGameCleared')) {
            return '봉인된 금고 문을 확인하세요.';
        }
        if (this.get('hasFoundMissingNdas')) {
            return 'PIMS 단말기에서 필수서류를 등록하세요.';
        }
        if (this.get('hasCheckedInventory')) {
            return '서류 보관함에서 누락된 보안서약서 2장을 찾으세요.';
        }
        return '보안서약서 보유 수량을 확인하세요.';
    },

    decreaseHp(amount) {
        this.data.hp = Math.max(0, this.data.hp - amount);
    },

    advanceDays(days) {
        const wholeDays = Math.max(0, Math.floor(days));
        for (let i = 0; i < wholeDays; i += 1) {
            if (this.isSameDate(this.data.currentDate, this.data.endDate)) {
                return;
            }
            this.advanceOneDay();
        }
    },

    advanceOneDay() {
        const date = this.data.currentDate;
        const daysInCurrentMonth = DAYS_IN_MONTH[date.month - 1];

        date.day += 1;
        if (date.day <= daysInCurrentMonth) {
            return;
        }

        date.day = 1;
        date.month += 1;
        if (date.month <= 12) {
            return;
        }

        date.month = 1;
        date.year += 1;
    },

    formatCurrentDate() {
        const { year, month, day } = this.data.currentDate;
        return `${year}년차 ${month}월 ${day}일`;
    },

    setTimeRunning(isRunning) {
        this.data.timeRunning = Boolean(isRunning);
    },

    isSameDate(a, b) {
        return a.year === b.year && a.month === b.month && a.day === b.day;
    }
};
