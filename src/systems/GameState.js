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
    stage2BriefingDone: false,
    stage2Phase: 'briefing',
    stage2CollectedCount: 0,
    stage2SortedCount: 0,
    stage2ReceiptTarget: 10,
    stage2CurrentReceiptLabel: '',
    stage2CurrentReceiptCategory: '',
    stage2PendingAssetRegistration: false,
    stage2InventoryItems: [],
    stage2TimerRemaining: 15,
    stage2Cleared: false,
    stage2Failed: false,
    stage3BriefingDone: false,
    stage3Phase: 'briefing',
    stage3TimerRemaining: 15,
    stage3CollectedCount: 0,
    stage3ReportTarget: 3,
    stage3HasPerformance: false,
    stage3HasExecution: false,
    stage3HasOfficialLetter: false,
    stage3ReportCreated: false,
    stage3ReportComplete: false,
    stage3Submitted: false,
    stage3SubmitEnabled: false,
    stage3MissingItems: [],
    stage3SelectedCardIds: [],
    stage3RejectionCount: 0,
    stage3Cleared: false,
    stage3Failed: false,
    stage4BriefingDone: false,
    stage4QuizActive: false,
    stage4QuestionIndex: 0,
    stage4QuestionTotal: 6,
    stage4CorrectCount: 0,
    stage4WrongCount: 0,
    stage4Cleared: false,
    stage4Failed: false,
    currentCaseIndex: 0,
    selectedChangeType: null,
    shownAttachmentList: [],
    isAnswerLocked: false,
    mistakeCount: 0,
    processedCount: 0,
    villainEventTriggered: false,
    feedbackMessage: '',
    isMiniGameActive: false,
    stage5BriefingDone: false,
    stage5QuizCompleted: false,
    stage5PimsReady: false,
    stage5PimsRegistered: false,
    stage5Cleared: false,
    stage6MailChecked: false,
    stage6AltarUnlocked: false,
    stage6QuizStarted: false,
    stage6QuizCompleted: false,
    stage6GemSpawned: false,
    stage6GemCollected: false,
    stage6PimsRegistered: false,
    stage6SelectedRoute: null,
    stage6CurrentQuestionIndex: 0,
    stage6CorrectCount: 0,
    stage6FeedbackMessage: '',
    stage6IsAnswerLocked: false,
    stage7EvidenceCollected: false,
    stage7FinalReportCreated: false,
    stage7AccountingRequested: false,
    stage7SettlementReportReceived: false,
    stage7PimsSubmitted: false,
    stage7DeadlineTimerActive: false,
    stage7TimeRemaining: 28,
    stage7Failed: false,
    stage8CurrentDay: 1,
    stage8SecondsPerDay: 15,
    stage8ReturnDateSelected: false,
    stage8SelectedReturnDay: null,
    stage8AdditionalInterestChecked: false,
    stage8AdditionalInterest: 3200,
    stage8NoticeApproved: false,
    stage8ReturnNoticeReceived: false,
    stage8PaymentCompleted: false,
    stage8WrongCount: 0,
    stage8BossPenaltyLevel: 0,
    stage8BossApproachLevel: 0,
    stage8GameOver: false,
    stage8ReportDate: '2월 15일',
    stage8SettlementBalance: 2512380,
    stage8Interest: 9510,
    stage8TotalReturnAmount: 2525090,
    gameOverReason: null,
    gameOverRestartScene: null,
    savedPlayerPosition: null
};

const cloneInitialState = () => ({
    ...initialGameState,
    startDate: cloneDate(initialGameState.startDate),
    currentDate: cloneDate(initialGameState.currentDate),
    endDate: cloneDate(initialGameState.endDate),
    stage3MissingItems: [...initialGameState.stage3MissingItems],
    stage2InventoryItems: [...initialGameState.stage2InventoryItems],
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
        if (this.get('currentChapter') === 3) {
            if (this.get('stage3Cleared')) {
                return '중간 관람차 정리를 마쳤습니다.';
            }
            if (this.get('stage3Failed')) {
                return '중간보고서 제출 기한을 넘겼습니다.';
            }
            if (!this.get('stage3BriefingDone')) {
                return 'KCA 간사의 설명을 듣고 중간보고서를 준비하세요.';
            }
            if (!this.get('stage3ReportCreated')) {
                return '보고서 작성천막에서 중간보고서를 작성하세요.';
            }
            if (!this.get('stage3ReportComplete')) {
                return '필수 자료를 다시 골라 보고서를 완성하세요.';
            }
            return 'PIMS 전송함에 보고서를 제출하세요.';
        }

        if (this.get('currentChapter') === 4) {
            if (this.get('stage4Cleared')) {
                return '실태점검 컨설팅을 마쳤습니다.';
            }
            if (this.get('stage4Failed')) {
                return '실태점검 대응을 다시 정리하세요.';
            }
            if (!this.get('stage4BriefingDone')) {
                return '점검 데스크에서 실태점검 안내를 확인하세요.';
            }
            return '점검 질문에 가장 적절한 답변을 선택하세요.';
        }

        if (this.get('currentChapter') === 5) {
            if (this.get('stage5PimsRegistered') || this.get('stage5Cleared')) {
                return 'PIMS 변경정보 등록을 마쳤습니다.';
            }
            if (this.get('stage5PimsReady')) {
                return 'PIMS 단말기에서 변경정보를 등록하세요.';
            }
            if (!this.get('isMiniGameActive')) {
                return '협약변경의 방에서 변경유형을 판정하세요.';
            }
            return '변경 유형을 선택해 첨부서류를 확인하세요.';
        }

        if (this.get('currentChapter') === 6) {
            if (this.get('stage6PimsRegistered')) {
                return '성과조사 대응 등록을 마쳤습니다.';
            }
            if (this.get('stage6GemCollected')) {
                return 'PIMS 단말기에서 성과조사 대응 결과를 등록하세요.';
            }
            if (this.get('stage6QuizCompleted')) {
                return '성과 보석을 획득하세요.';
            }
            if (this.get('stage6MailChecked')) {
                return '성과의 제단에서 퀴즈를 시작하세요.';
            }
            return '우편함에서 성과조사 협조 요청 공문을 확인하세요.';
        }

        if (this.get('currentChapter') === 7) {
            if (this.get('stage7PimsSubmitted')) {
                return '최종보고서와 정산보고서 제출을 완료했습니다.';
            }
            if (!this.get('stage7EvidenceCollected')) {
                return '성과증빙 보관함에서 성과증빙을 확인하세요.';
            }
            if (!this.get('stage7FinalReportCreated')) {
                return '성과증빙을 확인해 최종보고서를 완성하세요.';
            }
            if (!this.get('stage7SettlementReportReceived')) {
                return '회계사에게 정산보고서 검토를 의뢰하세요.';
            }
            return 'PIMS 단말기에서 두 보고서를 제출하세요.';
        }

        if (this.get('currentChapter') === 8) {
            if (this.get('stage8PaymentCompleted')) {
                return '정산금 반납을 완료했습니다.';
            }
            if (this.get('stage8ReturnNoticeReceived')) {
                return '반납 게이트에서 정산금을 최종 반납하세요.';
            }
            if (!this.get('stage8ReturnDateSelected')) {
                return '달력에서 반납예정일을 정하세요.';
            }
            if (!this.get('stage8AdditionalInterestChecked')) {
                return '은행 전화기에서 추가반납이자를 확인하세요.';
            }
            return '공문 작성대에서 고지서 발급 요청 공문을 작성하세요.';
        }

        if (this.get('currentChapter') === 2) {
            if (this.get('stage2Cleared')) {
                return '집행의 집 정리를 마쳤습니다.';
            }
            if (this.get('stage2Failed')) {
                return '집행의 집 처리 기한을 넘겼습니다.';
            }
            const phase = this.get('stage2Phase');
            if (phase === 'briefing' || !this.get('stage2BriefingDone')) {
                return 'KCA 간사의 설명을 듣고 영수증 폭풍 규칙을 확인하세요.';
            }
            if (phase === 'field') {
                return '영수증 더미를 클릭해 집행 처리를 시작하세요.';
            }
            if (phase === 'receiptApproach') {
                return '영수증 더미 앞으로 이동 중입니다.';
            }
            if (phase === 'classification') {
                return '영수증 10건을 분류하세요.';
            }
            if (phase === 'pimsApproach') {
                return 'PIMS 단말기로 이동 중입니다.';
            }
            if (this.get('stage2PendingAssetRegistration')) {
                return '자산취득비는 PIMS 자산등록을 먼저 하세요.';
            }
            return 'PIMS 단말기에서 최종 등록을 완료하세요.';
        }

        if (this.get('sealedVaultOpened')) {
            return '사업비 금고를 확인하세요.';
        }
        if (this.get('miniGameCleared')) {
            return 'PIMS 단말기에서 필수서류를 등록하세요.';
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



