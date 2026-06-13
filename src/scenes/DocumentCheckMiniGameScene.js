import * as Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { ASSETS, hasTexture } from '../systems/AssetManager.js';

const LAYOUT = {
    title: { x: 640, y: 88 },
    progress: { x: 640, y: 118 },
    hp: { x: 1130, y: 55 },
    leftPanel: { x: 75, y: 155, width: 520, height: 245 },
    rightPanel: { x: 690, y: 155, width: 520, height: 245 },
    instruction: { x: 640, y: 420 },
    bottomPanel: { x: 75, y: 455, width: 1130, height: 190 },
    choiceButtons: [
        { x: 210, y: 528, width: 250, height: 44 },
        { x: 515, y: 528, width: 250, height: 44 },
        { x: 830, y: 528, width: 250, height: 44 }
    ],
    inputBox: { x: 120, y: 510, width: 420, height: 70 },
    keypad: { x: 690, y: 500, buttonWidth: 64, buttonHeight: 36, gapX: 14, gapY: 8 }
};

const COLORS = {
    title: '#fff5c7',
    progress: '#9cfaff',
    paperText: '#1b2140',
    paperAccent: '#30406d',
    darkText: '#f8f3ff',
    darkSubText: '#bcefff',
    bottomText: '#eafcff',
    buttonBg: 0x211834,
    buttonBorder: 0x75f6ff,
    buttonHoverBg: 0x322652,
    inputBorder: 0x34e6f1,
    inputText: '#fffad8',
    success: '#9cfaff',
    error: '#ff9aa9',
    highlight: 0xfff0a8,
    highlightBorder: 0xfff0a8
};

const PROBLEMS = [
    {
        type: 'choice',
        left: {
            title: '수행계획서',
            field: '참여인력 기간',
            value: '6월 30일'
        },
        right: {
            title: 'PIMS 입력창',
            field: '참여인력 기간',
            value: '12월 31일'
        },
        instruction: '날짜를 선택해서 수행계획서 기준으로 맞춰주세요.',
        choices: ['3월 31일', '6월 30일', '12월 31일'],
        answer: '6월 30일',
        wrongMessage: '참여인력 기간이 수행계획서와 다릅니다.'
    },
    {
        type: 'numeric',
        left: {
            title: '수행계획서',
            field: '성과 목표',
            value: '90점'
        },
        right: {
            title: 'PIMS 입력창',
            field: '성과 목표',
            value: '91점'
        },
        instruction: '숫자를 입력해 PIMS 값을 수행계획서와 일치시키세요.',
        answer: '90',
        suffix: '점',
        wrongMessage: '성과 목표 값이 수행계획서와 다릅니다.'
    },
    {
        type: 'numeric',
        left: {
            title: '수행계획서',
            field: '계좌번호',
            value: '101-44-9280'
        },
        right: {
            title: 'PIMS 입력창',
            field: '계좌번호',
            value: '101-4?-9280'
        },
        instruction: '누락된 숫자를 입력해 계좌번호를 완성하세요.',
        answer: '4',
        prefix: '101-4',
        suffix: '-9280',
        wrongMessage: '계좌번호 숫자가 하나가 빠져 있습니다.'
    }
];

export class DocumentCheckMiniGameScene extends Phaser.Scene {
    constructor() {
        super('DocumentCheckMiniGameScene');
        this.problemIndex = 0;
        this.currentInput = '';
        this.waitingForReturn = false;
        this.completed = false;
        this.dynamicObjects = [];
    }

    create() {
        this.problemIndex = 0;
        this.currentInput = '';
        this.waitingForReturn = false;
        this.completed = false;
        this.dynamicObjects = [];

        this.cameras.main.setBackgroundColor(0x090714);
        this.createBackdrop();
        this.createStaticHeader();
        this.input.keyboard.on('keydown', this.handleKeyboardInput, this);
        this.renderProblem(0);

        this.events.once('shutdown', () => this.cleanup());
    }

    createBackdrop() {
        const bgKey = ASSETS.backgrounds.documentCheck.key;
        if (hasTexture(this, bgKey)) {
            this.backdrop = this.add.image(640, 360, bgKey);
            this.backdrop.setDisplaySize(1280, 720);
            this.backdrop.setDepth(0);
            return;
        }

        this.backdrop = null;
        const g = this.add.graphics();
        g.setDepth(0);
        g.fillStyle(0x090714, 1).fillRect(0, 0, 1280, 720);
        g.fillStyle(0x18102c, 0.78).fillRect(LAYOUT.leftPanel.x, LAYOUT.leftPanel.y, LAYOUT.leftPanel.width, LAYOUT.leftPanel.height);
        g.fillStyle(0x10121d, 0.82).fillRect(LAYOUT.rightPanel.x, LAYOUT.rightPanel.y, LAYOUT.rightPanel.width, LAYOUT.rightPanel.height);
        g.fillStyle(0x05050a, 0.72).fillRect(LAYOUT.bottomPanel.x, LAYOUT.bottomPanel.y, LAYOUT.bottomPanel.width, LAYOUT.bottomPanel.height);
    }

    createStaticHeader() {
        this.progressText = this.add.text(LAYOUT.progress.x, LAYOUT.progress.y, '1/3', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: COLORS.progress
        }).setOrigin(0.5, 0.5).setDepth(50);

        this.hpText = this.add.text(LAYOUT.hp.x, LAYOUT.hp.y, `HP ${GameState.get('hp') ?? 100}`, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#ffd36e'
        }).setOrigin(1, 0.5).setDepth(50);

        this.instructionText = this.add.text(LAYOUT.instruction.x, LAYOUT.instruction.y, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: COLORS.bottomText,
            align: 'center',
            wordWrap: { width: 900 }
        }).setOrigin(0.5, 0.5).setDepth(80);
    }

    renderProblem(index) {
        this.clearDynamicUI();
        this.problemIndex = index;
        this.currentInput = '';
        this.waitingForReturn = false;

        const problem = PROBLEMS[index];
        this.progressText.setText(`${index + 1}/3`);
        this.instructionText.setText(problem.instruction);
        this.instructionText.setColor(COLORS.bottomText);
        this.instructionText.setY(LAYOUT.instruction.y + 10);
        this.hpText.setText(`HP ${GameState.get('hp') ?? 100}`);

        this.renderComparisonPanels(problem);

        if (problem.type === 'choice') {
            this.renderChoiceProblem(problem);
            return;
        }

        this.renderNumericProblem(problem);
    }

    renderComparisonPanels(problem) {
        const left = LAYOUT.leftPanel;
        const right = LAYOUT.rightPanel;

        const leftTitle = this.add.text(left.x + 30, left.y + 30, problem.left.title, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: COLORS.paperText
        }).setDepth(50);
        const leftField = this.add.text(left.x + 30, left.y + 70, problem.left.field, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: COLORS.paperAccent
        }).setDepth(50);
        const leftValue = this.add.text(left.x + 30, left.y + 120, problem.left.value, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '26px',
            color: COLORS.paperText
        }).setDepth(50);

        const rightTitle = this.add.text(right.x + 35, right.y + 30, problem.right.title, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: COLORS.darkSubText
        }).setDepth(50);
        const rightField = this.add.text(right.x + 35, right.y + 70, problem.right.field, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: COLORS.darkSubText
        }).setDepth(50);

        const rightValue = this.add.text(right.x + 35, right.y + 120, problem.right.value, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: problem.type === 'choice' ? '24px' : '26px',
            color: COLORS.darkText
        }).setDepth(50);

        const rightHighlightWidth = problem.type === 'choice' ? 180 : (problem.answer.length >= 2 ? 120 : 220);
        const rightHighlight = this.add.graphics().setDepth(5);
        rightHighlight.lineStyle(2, COLORS.highlightBorder, 0.95);
        rightHighlight.fillStyle(COLORS.highlight, 0.06);
        rightHighlight.fillRoundedRect(right.x + 28, right.y + 108, rightHighlightWidth, 46, 6);
        rightHighlight.strokeRoundedRect(right.x + 28, right.y + 108, rightHighlightWidth, 46, 6);

        this.trackDynamic(leftTitle, leftField, leftValue, rightTitle, rightField, rightValue, rightHighlight);
    }

    renderChoiceProblem(problem) {
        const buttons = LAYOUT.choiceButtons.map((layout, index) => this.createButton({
            x: layout.x,
            y: layout.y,
            width: layout.width,
            height: layout.height,
            label: problem.choices[index],
            onClick: () => this.handleChoiceSelection(problem.choices[index]),
            fontSize: '18px'
        }));

        this.choiceButtons = buttons;
    }

    renderNumericProblem(problem) {
        const inputBox = this.add.rectangle(
            LAYOUT.inputBox.x,
            LAYOUT.inputBox.y,
            LAYOUT.inputBox.width,
            LAYOUT.inputBox.height,
            0x000000,
            0.12
        ).setOrigin(0, 0).setStrokeStyle(1, COLORS.inputBorder, 0.9).setDepth(5);

        const inputLabel = this.add.text(LAYOUT.inputBox.x + 25, LAYOUT.inputBox.y + 15, '입력값', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: COLORS.bottomText
        }).setDepth(50);

        this.inputValueText = this.add.text(LAYOUT.inputBox.x + 25, LAYOUT.inputBox.y + 42, this.currentInput || '__', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '32px',
            color: COLORS.inputText
        }).setDepth(50);

        this.inputBox = inputBox;
        this.trackDynamic(inputBox, inputLabel, this.inputValueText);

        this.createNumberPad(problem);
    }

    createNumberPad(problem) {
        const rows = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['←', '0', '확인']
        ];

        this.keypadButtons = [];
        rows.forEach((row, rowIndex) => {
            row.forEach((label, colIndex) => {
                const isConfirm = label === '확인';
                const button = this.createButton({
                    x: LAYOUT.keypad.x + colIndex * (LAYOUT.keypad.buttonWidth + LAYOUT.keypad.gapX),
                    y: LAYOUT.keypad.y + rowIndex * (LAYOUT.keypad.buttonHeight + LAYOUT.keypad.gapY),
                    width: LAYOUT.keypad.buttonWidth,
                    height: LAYOUT.keypad.buttonHeight,
                    label,
                    onClick: () => {
                        if (label === '←') {
                            this.deleteLastDigit();
                            return;
                        }
                        if (label === '확인') {
                            this.submitNumericAnswer();
                            return;
                        }
                        this.handleNumberInput(label);
                    },
                    fontSize: isConfirm ? '11px' : '16px'
                });
                this.keypadButtons.push(button);
            });
        });
    }

    createButton({ x, y, width, height, label, onClick, fontSize }) {
        const bg = this.add.rectangle(x, y, width, height, COLORS.buttonBg, 1)
            .setOrigin(0, 0)
            .setDepth(100);

        const text = this.add.text(x + width / 2, y + height / 2, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize,
            color: '#f8f3ff',
            align: 'center'
        }).setOrigin(0.5).setDepth(101);

        const hit = this.add.rectangle(x, y, width, height, 0x000000, 0)
            .setOrigin(0, 0)
            .setInteractive({ useHandCursor: true })
            .setDepth(102);

        hit.on('pointerover', () => {
            bg.setFillStyle(COLORS.buttonHoverBg, 1);
        });
        hit.on('pointerout', () => {
            bg.setFillStyle(COLORS.buttonBg, 1);
        });
        hit.on('pointerdown', onClick);

        this.trackDynamic(bg, text, hit);
        return { bg, text, hit };
    }

    handleChoiceSelection(choice) {
        if (this.waitingForReturn) {
            return;
        }

        const problem = PROBLEMS[this.problemIndex];
        const selected = typeof choice === 'number' ? problem.choices[choice] : choice;
        if (selected === problem.answer) {
            this.handleCorrectAnswer(problem);
            return;
        }

        this.applyWrongAnswer(problem.wrongMessage);
    }

    handleKeyboardInput(event) {
        if (this.completed) {
            if (event.code === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space') {
                event.preventDefault?.();
                this.scene.start('SealedVaultScene');
            }
            return;
        }

        if (this.waitingForReturn) {
            return;
        }

        const problem = PROBLEMS[this.problemIndex];
        if (!problem || problem.type !== 'numeric') {
            return;
        }

        if (event.code === 'Backspace') {
            event.preventDefault?.();
            this.deleteLastDigit();
            return;
        }

        if (event.code === 'Enter' || event.code === 'NumpadEnter') {
            event.preventDefault?.();
            this.submitNumericAnswer();
            return;
        }

        const match = event.code.match(/^Digit([0-9])$/) || event.code.match(/^Numpad([0-9])$/);
        if (match) {
            this.handleNumberInput(match[1]);
        }
    }

    handleNumberInput(value) {
        if (this.waitingForReturn) {
            return;
        }

        const problem = PROBLEMS[this.problemIndex];
        if (problem.type !== 'numeric') {
            return;
        }

        const maxLength = this.getNumericMaxLength(problem);
        if (this.currentInput.length >= maxLength) {
            return;
        }

        this.currentInput += value;
        this.updateInputDisplay();
    }

    deleteLastDigit() {
        if (this.waitingForReturn) {
            return;
        }

        const problem = PROBLEMS[this.problemIndex];
        if (problem.type !== 'numeric') {
            return;
        }

        this.currentInput = this.currentInput.slice(0, -1);
        this.updateInputDisplay();
    }

    submitNumericAnswer() {
        if (this.waitingForReturn) {
            return;
        }

        const problem = PROBLEMS[this.problemIndex];
        if (problem.type !== 'numeric') {
            return;
        }

        if (this.currentInput === problem.answer) {
            this.handleCorrectAnswer(problem);
            return;
        }

        this.applyWrongAnswer(problem.wrongMessage, true);
    }

    handleCorrectAnswer(problem) {
        this.waitingForReturn = true;
        this.setSolvedValue(problem);
        this.showFeedback('수정 완료!', COLORS.success, 0.8);

        this.time.delayedCall(850, () => {
            if (this.problemIndex >= PROBLEMS.length - 1) {
                this.completeMiniGame();
                return;
            }

            this.renderProblem(this.problemIndex + 1);
        });
    }

    applyWrongAnswer(message, resetInput = false) {
        GameState.decreaseHp(8);
        this.hpText.setText(`HP ${GameState.get('hp') ?? 0}`);
        if ((GameState.get('hp') ?? 0) <= 0) {
            this.time.delayedCall(100, () => {
                this.scene.start('GameOverScene');
            });
            return;
        }

        if (resetInput) {
            this.currentInput = '';
            this.updateInputDisplay();
        }

        this.showFeedback(message, COLORS.error, 1.05);
    }

    updateInputDisplay() {
        if (!this.inputValueText) {
            return;
        }

        this.inputValueText.setText(this.currentInput || '__');
    }

    setSolvedValue(problem) {
        const solvedValue = this.getSolvedValue(problem);
        if (this.rightValueText) {
            this.rightValueText.setText(solvedValue);
        }
    }

    getSolvedValue(problem) {
        if (problem.type === 'choice') {
            return problem.answer;
        }

        const prefix = problem.prefix ?? '';
        const suffix = problem.suffix ?? '';
        return `${prefix}${problem.answer}${suffix}`;
    }

    getNumericMaxLength(problem) {
        if (typeof problem.maxLength === 'number') {
            return problem.maxLength;
        }

        return problem.answer.length >= 2 ? 3 : 1;
    }

    showFeedback(message, color, durationSeconds = 1) {
        if (this.feedbackText) {
            this.feedbackText.destroy();
        }

        this.feedbackText = this.add.text(640, 612, message, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color,
            align: 'center',
            wordWrap: { width: 1100 }
        }).setOrigin(0.5, 0.5).setDepth(200);

        this.time.delayedCall(durationSeconds * 1000, () => {
            if (this.feedbackText) {
                this.feedbackText.destroy();
                this.feedbackText = null;
            }
        });
    }

    completeMiniGame() {
        GameState.set('pimsRegistered', true);
        GameState.set('miniGameCleared', true);
        this.completed = true;
        this.waitingForReturn = false;

        const clearBgKey = ASSETS.backgrounds.documentCheckClear.key;
        if (this.backdrop && hasTexture(this, clearBgKey)) {
            this.backdrop.setTexture(clearBgKey);
            this.backdrop.setDisplaySize(1280, 720);
        }

        this.clearDynamicUI();

        this.progressText.setText('');
        this.instructionText.setText('필수서류 등록 완료');
        this.instructionText.setColor(COLORS.success);
        this.instructionText.setY(220);
        this.instructionText.setFontSize('28px');
        this.instructionText.setFontStyle('bold');

        this.subInstructionText = this.add.text(640, 274, '사업비 교부 준비가 끝났습니다.', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: COLORS.success,
            align: 'center'
        }).setOrigin(0.5, 0.5).setDepth(200);
        this.dynamicObjects.push(this.subInstructionText);

        this.flashOverlay = this.add.rectangle(640, 360, 1280, 720, 0xffffff, 0);
        this.flashOverlay.setDepth(190);
        this.flashOverlay.setAlpha(0);
        this.tweens.add({
            targets: this.flashOverlay,
            alpha: { from: 0, to: 0.22 },
            duration: 160,
            yoyo: true,
            ease: 'Sine.easeOut',
            onComplete: () => {
                this.flashOverlay.destroy();
                this.flashOverlay = null;
            }
        });

        const sparklePositions = [
            [360, 250],
            [470, 205],
            [805, 220],
            [930, 270]
        ];
        sparklePositions.forEach(([x, y]) => {
            const sparkle = this.add.circle(x, y, 3, 0xffffff, 0.9).setDepth(191);
            this.tweens.add({
                targets: sparkle,
                y: y - 30,
                alpha: 0,
                duration: 760,
                delay: 60,
                ease: 'Sine.easeOut',
                onComplete: () => sparkle.destroy()
            });
        });

        this.endPromptText = this.add.text(640, 672, 'Space 또는 Enter: 금고로 돌아가기', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: COLORS.darkSubText,
            align: 'center'
        }).setOrigin(0.5, 0.5).setDepth(200);
        this.dynamicObjects.push(this.endPromptText);
    }

    clearDynamicUI() {
        if (this.feedbackText) {
            this.feedbackText.destroy();
            this.feedbackText = null;
        }

        this.dynamicObjects.forEach((obj) => {
            if (obj && !obj.destroyed) {
                obj.destroy();
            }
        });
        this.dynamicObjects = [];
        this.choiceButtons = [];
        this.keypadButtons = [];
        this.inputBox = null;
        this.inputValueText = null;
    }

    trackDynamic(...objects) {
        objects.forEach((object) => {
            if (object) {
                this.dynamicObjects.push(object);
            }
        });
    }

    cleanup() {
        this.input.keyboard.off('keydown', this.handleKeyboardInput, this);
        this.clearDynamicUI();
    }
}


