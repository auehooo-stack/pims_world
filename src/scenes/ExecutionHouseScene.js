import * as Phaser from 'phaser';
import { chapter2Data } from '../data/chapter2Data.js';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { InteractionManager } from '../systems/InteractionManager.js';
import { Player } from '../objects/Player.js';
import { InteractableObject } from '../objects/InteractableObject.js';
import { BottomHUD } from '../objects/BottomHUD.js';
import { TopHUD } from '../objects/TopHUD.js';
import { ASSETS, hasTexture } from '../systems/AssetManager.js';
import { CENTER_X, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

const RECEIPT_TOTAL = chapter2Data.receiptPool.length;
const INITIAL_RECEIPT_COUNT = 6;
const RECEIPT_DISPLAY_SIZE = 54;
const RECEIPT_TILT_RANGE = 8;
const HP_LOSS = 8;

const CATEGORY_ORDER = ['운영비', '사업추진비', '여비', '자산취득비', '반려'];
const EVIDENCE_KEYS = ['minutes', 'participants', 'signature', 'asset'];
const EXTRA_ACTION_ORDER = ['minutes', 'participants', 'signature', 'asset', 'none'];
const CLASSIFICATION_LAYOUT = {
    backdrop: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, width: GAME_WIDTH, height: GAME_HEIGHT },
    title: { x: CENTER_X, y: 40 },
    topRowY: 78,
    leftPanel: { x: 60, y: 115, width: 570, height: 350 },
    rightPanel: { x: 670, y: 115, width: 550, height: 350 },
    cardTitle: { x: 84, y: 150 },
    cardBody: { x: 84, y: 190, width: 500 },
    statusTitle: { x: 700, y: 150 },
    statusText: { x: 700, y: 180, width: 248 },
    stamp: { x: 1120, y: 205 },
    checklistTitle: { x: 700, y: 240 },
    checklistNote: { x: 700, y: 266, width: 250 },
    checklistStartY: 300,
    checklistGapY: 32,
    categoryLabelY: 500,
    categoryButtonsY: 530,
    actionLabelY: 606,
    actionButtonsY: 635,
    feedback: { x: CENTER_X, y: 575, width: 1160 }
};

const moneyToNumber = (value) => {
    const digits = String(value || '').replace(/[^\d]/g, '');
    return digits ? Number(digits) : 0;
};

export class ExecutionHouseScene extends Phaser.Scene {
    constructor() {
        super('ExecutionHouseScene');
        this.clickTarget = null;
        this.pendingArrivalAction = null;
        this.popupMode = null;
        this.bonusTriggered = false;
        this.timerLoop = null;
        this.stageResolved = false;
        this.processedCount = 0;
        this.registeredCount = 0;
        this.rejectedCount = 0;
        this.assetRegistered = false;
        this.receiptQueue = [];
        this.bonusQueue = [];
        this.pendingPimsReceipts = [];
        this.popupNodes = [];
        this.actionNodes = [];
    }

    create() {
        GameState.set('currentChapter', 2);
        GameState.set('stage2BriefingDone', false);
        GameState.set('stage2Phase', 'briefing');
        GameState.set('stage2CollectedCount', 0);
        GameState.set('stage2SortedCount', 0);
        GameState.set('stage2ReceiptTarget', RECEIPT_TOTAL);
        GameState.set('stage2CurrentReceiptLabel', '');
        GameState.set('stage2CurrentReceiptCategory', '');
        GameState.set('stage2PendingAssetRegistration', false);
        GameState.set('stage2InventoryItems', ['吏移⑥꽌']);
        GameState.set('stage2TimerRemaining', chapter2Data.timerDays);
        GameState.set('stage2Cleared', false);
        GameState.set('stage2Failed', false);
        GameState.set('executionRate', 0);
        GameState.set('pimsRegistered', false);
        GameState.set('timeRunning', true);

        this.receipts = chapter2Data.receiptPool.map((receipt, index) => ({
            ...receipt,
            index,
            selectedCategory: null,
            evidenceFlags: {
                minutes: false,
                participants: false,
                signature: false,
                asset: Boolean(receipt.asset)
            },
            classified: false,
            rejected: false,
            registered: false,
            assetRegistered: false
        }));
        this.receiptQueue = [...this.receipts.slice(0, INITIAL_RECEIPT_COUNT)];
        this.bonusQueue = [...this.receipts.slice(INITIAL_RECEIPT_COUNT)];

        this.cameras.main.setBackgroundColor(0x070d18);
        this.drawBackground();
        this.createHud();
        this.createWorld();
        this.createDoorBanner();
        this.dialogue = new DialogueManager(this, {
            layout: this.bottomHud.getDialogLayout()
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.input.keyboard.on('keydown-SPACE', () => this.tryInteract());
        this.input.keyboard.on('keydown-ENTER', () => this.tryInteract());
        this.input.on('pointerdown', (pointer) => this.handlePointerDown(pointer));

        this.time.delayedCall(300, () => {
            this.dialogue.say(chapter2Data.introLines, () => this.beginFieldPhase());
        });

        this.startTimer();
        this.refreshHud();
    }

    drawBackground() {
        if (hasTexture(this, ASSETS.backgrounds.executionHouse.key)) {
            this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSETS.backgrounds.executionHouse.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setOrigin(0.5)
                .setDepth(0);
            return;
        }

        const g = this.add.graphics().setDepth(0);
        g.fillStyle(0x05070f, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        g.fillStyle(0x0b1120, 1).fillRect(0, 0, GAME_WIDTH, 150);
        g.fillStyle(0x121c31, 1).fillRect(0, 150, GAME_WIDTH, 220);
        g.fillStyle(0x18243d, 1).fillRect(0, 370, GAME_WIDTH, 150);
        g.fillStyle(0x0d1426, 1).fillRect(0, 520, GAME_WIDTH, 200);
        g.fillStyle(0x171329, 1).fillRect(0, 610, GAME_WIDTH, 110);
        g.fillStyle(0x2bf1d0, 0.08).fillRect(0, 148, GAME_WIDTH, 4);
        g.fillStyle(0xffd36e, 0.08).fillRect(0, 370, GAME_WIDTH, 4);
        g.fillStyle(0x6f94ff, 0.08).fillRect(0, 520, GAME_WIDTH, 4);
    }

    createHud() {
        this.topHud = new TopHUD(this, { title: chapter2Data.title });
        this.bottomHud = new BottomHUD(this);
    }

    createWorld() {
        this.assistant = new InteractableObject(this, {
            id: 'assistant',
            name: 'KCA 간사',
            prompt: chapter2Data.assistantHint,
            x: chapter2Data.assistant.x,
            y: chapter2Data.assistant.y,
            width: chapter2Data.assistant.width,
            height: chapter2Data.assistant.height,
            color: 0xff4f86,
            animated: true
        }, () => this.handleAssistantInteract());

        this.receiptPile = new InteractableObject(this, {
            id: 'receipt',
            name: '영수증 더미',
            prompt: chapter2Data.receiptPilePrompt,
            x: chapter2Data.receiptPile.x,
            y: chapter2Data.receiptPile.y,
            width: chapter2Data.receiptPile.width,
            height: chapter2Data.receiptPile.height,
            color: 0xffd36e,
            animated: false
        }, () => this.handleReceiptPileInteract());

        this.pims = new InteractableObject(this, {
            id: 'terminal',
            name: 'PIMS 단말기',
            prompt: chapter2Data.pimsHint,
            x: chapter2Data.pims.x,
            y: chapter2Data.pims.y,
            width: chapter2Data.pims.width,
            height: chapter2Data.pims.height,
            color: 0x22e6a8,
            animated: false
        }, () => this.handlePimsInteract());

        this.player = new Player(this, chapter2Data.playerStart.x, chapter2Data.playerStart.y);
        this.player.speed = 260;

        this.interactables = [this.assistant, this.receiptPile, this.pims];
        this.interaction = new InteractionManager(this, this.player, this.interactables, (prompt) => this.bottomHud.setInteractionPrompt(prompt));

        this.decorativeBanners = chapter2Data.decorativeBaskets.map((basket) => this.createDecorationBanner(basket));
    }

    createDecorationBanner(config) {
        const container = this.add.container(config.x, config.y).setDepth(2);
        const shadow = this.add.ellipse(0, 22, config.width * 0.86, 11, 0x000000, 0.22).setScale(1, 0.8);
        const body = this.add.rectangle(0, 0, config.width, config.height, 0x11172a, 0.78)
            .setStrokeStyle(2, config.color, 0.38);
        const label = this.add.text(0, 0, config.label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#f8f3ff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        container.add([shadow, body, label]);
        return container;
    }

    createDoorBanner() {
        this.add.text(CENTER_X, 72, chapter2Data.subtitle, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '38px',
            color: '#fff4c9',
            stroke: '#2c1346',
            strokeThickness: 5,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                blur: 0,
                color: '#000000',
                fill: true,
                stroke: true
            }
        }).setOrigin(0.5).setDepth(1);
    }

    update() {
        const blocked = this.dialogue?.isActive || this.stageResolved || this.popupMode;
        this.interactables?.forEach((item) => item.update?.());
        this.interaction?.update(Boolean(blocked));
        this.refreshHud();

        if (blocked) {
            this.player.setMovement(0, 0);
            return;
        }

        const axis = this.getKeyboardAxis();
        if (axis.x !== 0 || axis.y !== 0) {
            this.clickTarget = null;
            this.pendingArrivalAction = null;
            const length = Math.hypot(axis.x, axis.y) || 1;
            this.player.setMovement((axis.x / length) * this.player.speed, (axis.y / length) * this.player.speed);
        } else if (this.clickTarget) {
            this.moveTowardClickTarget();
        } else {
            this.player.setMovement(0, 0);
        }

        this.clampPlayerToWalkable();
        this.player.syncLabel();
    }

    beginFieldPhase() {
        if (this.stageResolved) {
            return;
        }

        this.stagePhase = 'field';
        GameState.set('stage2BriefingDone', true);
        GameState.set('stage2Phase', 'field');
        GameState.setTimeRunning(true);
        this.bottomHud.setInteractionVisible(true);
        this.bottomHud.setInteractionPrompt(chapter2Data.receiptPilePrompt);
        this.refreshHud();
    }

    startTimer() {
        this.timerLoop?.remove(false);
        this.timerDays = chapter2Data.timerDays;
        GameState.set('stage2TimerRemaining', this.timerDays);
        this.timerLoop = this.time.addEvent({
            delay: chapter2Data.timerTickMs,
            loop: true,
            callback: () => {
                if (this.stageResolved || !GameState.get('timeRunning')) {
                    return;
                }

                this.timerDays = Math.max(0, this.timerDays - 1);
                GameState.set('stage2TimerRemaining', this.timerDays);
                if (this.timerDays <= 0) {
                    this.failStage(chapter2Data.failMessage);
                }
            }
        });
    }

    handleAssistantInteract() {
        if (this.stageResolved) {
            return;
        }

        if (this.popupMode === 'classification') {
            this.showPopupNotice('먼저 현재 영수증을 처리하세요.', 0xffd36e);
            return;
        }

        if (this.popupMode === 'registration') {
            this.showPopupNotice('먼저 등록 대기 목록을 확인하세요.', 0xffd36e);
            return;
        }

        if (this.stagePhase === 'briefing') {
            this.dialogue.say(chapter2Data.introLines, () => this.beginFieldPhase());
            return;
        }

        if (this.stagePhase === 'field') {
            this.dialogue.say([
                { speaker: 'KCA 간사', text: '영수증 더미를 클릭해 집행 처리를 시작하세요.' }
            ]);
            return;
        }

        if (this.stagePhase === 'classification') {
            const current = this.getCurrentReceipt();
            if (current?.asset && !current.assetRegistered) {
                this.dialogue.say([
                    { speaker: 'KCA 간사', text: chapter2Data.assetReminder }
                ]);
                return;
            }

            this.dialogue.say([
                { speaker: 'KCA 간사', text: '분류가 끝나면 PIMS 단말기로 이동하세요.' }
            ]);
            return;
        }

        if (this.stagePhase === 'pimsApproach' || this.stagePhase === 'registration') {
            this.dialogue.say(chapter2Data.registrationPromptLines);
            return;
        }

        this.dialogue.say([
            { speaker: 'KCA 간사', text: '영수증을 분류하고 PIMS 등록까지 완료해야 합니다.' }
        ]);
    }

    handleReceiptPileInteract() {
        if (this.stageResolved) {
            return;
        }

        if (this.stagePhase !== 'field') {
            this.showPopupNotice('먼저 간사와 대화를 마치고 영수증 처리를 시작하세요.', 0xffd36e);
            return;
        }

        const target = {
            x: chapter2Data.receiptPile.x - 66,
            y: chapter2Data.receiptPile.y + 48
        };

        this.stagePhase = 'receiptApproach';
        GameState.set('stage2Phase', 'receiptApproach');
        this.bottomHud.setInteractionPrompt(chapter2Data.receiptPilePrompt);
        this.bottomHud.refresh();
        this.movePlayerTo(target, () => {
            this.showActionPanel({
                title: chapter2Data.receiptStartLabel,
                hint: chapter2Data.receiptStartHint,
                buttonLabel: chapter2Data.receiptStartLabel,
                onClick: () => this.openClassificationPopup(),
                color: 0xffd36e,
                x: chapter2Data.receiptPile.x + 92,
                y: chapter2Data.receiptPile.y - 10
            });
        });
    }

    handlePimsInteract() {
        if (this.stageResolved) {
            return;
        }

        if (this.stagePhase !== 'pimsApproach' && this.stagePhase !== 'registration') {
            this.showPopupNotice('먼저 분류를 완료한 뒤 PIMS 등록으로 이동하세요.', 0xffd36e);
            return;
        }

        if (!this.receipts.every((receipt) => receipt.classified || receipt.rejected)) {
            this.showPopupNotice('아직 분류되지 않은 영수증이 있습니다.', 0xffd36e);
            return;
        }

        const target = {
            x: chapter2Data.pims.x - 72,
            y: chapter2Data.pims.y + 72
        };

        this.stagePhase = 'pimsApproach';
        GameState.set('stage2Phase', 'pimsApproach');
        this.bottomHud.setInteractionPrompt(chapter2Data.pimsHint);
        this.bottomHud.refresh();
        this.movePlayerTo(target, () => {
            this.showActionPanel({
                title: chapter2Data.pimsStartLabel,
                hint: chapter2Data.pimsStartHint,
                buttonLabel: chapter2Data.pimsStartLabel,
                onClick: () => this.openRegistrationPopup(),
                color: 0x75f6ff,
                x: chapter2Data.pims.x - 20,
                y: chapter2Data.pims.y + 10
            });
        });
    }

    movePlayerTo(target, onArrive) {
        this.clickTarget = target;
        this.pendingArrivalAction = onArrive || null;
    }

    moveTowardClickTarget() {
        if (!this.clickTarget) {
            return;
        }

        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.clickTarget.x, this.clickTarget.y);
        if (distance < 4) {
            this.clickTarget = null;
            this.player.setMovement(0, 0);
            const callback = this.pendingArrivalAction;
            this.pendingArrivalAction = null;
            callback?.();
            return;
        }

        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.clickTarget.x, this.clickTarget.y);
        this.player.setMovement(Math.cos(angle) * this.player.speed, Math.sin(angle) * this.player.speed);
    }

    handlePointerDown(pointer) {
        if (this.dialogue?.isActive || this.stageResolved || this.popupMode) {
            return;
        }

        const worldBottom = chapter2Data.walkableArea.y + chapter2Data.walkableArea.height;
        if (pointer.y < 136 || pointer.y > worldBottom) {
            return;
        }

        this.clickTarget = this.clampToWalkable(pointer.x, pointer.y);
        this.pendingArrivalAction = null;
    }

    tryInteract() {
        if (this.dialogue?.isActive || this.popupMode || this.stageResolved) {
            return;
        }
        this.interaction.interact();
    }

    openClassificationPopup() {
        if (this.stageResolved) {
            return;
        }

        this.stagePhase = 'classification';
        GameState.set('stage2Phase', 'classification');
        GameState.setTimeRunning(false);
        this.clearActionPanel();
        this.setHudVisible(false);
        this.clearPopup();

        this.currentPopupIndex = 0;
        this.popupMode = 'classification';
        this.classificationWorkingQueue = [...this.receiptQueue];
        if (!this.classificationWorkingQueue.length) {
            this.classificationWorkingQueue = this.receipts.slice(0, INITIAL_RECEIPT_COUNT);
            this.receiptQueue = [...this.classificationWorkingQueue];
        }

        this.createClassificationPopup();
        this.refreshClassificationPopup();
    }

    createClassificationPopup() {
        const layout = CLASSIFICATION_LAYOUT;
        const backdrop = this.add.rectangle(layout.backdrop.x, layout.backdrop.y, layout.backdrop.width, layout.backdrop.height, 0x050816, 0.96)
            .setOrigin(0.5)
            .setDepth(1000);
        const topBand = this.add.rectangle(layout.backdrop.x, 36, GAME_WIDTH, 88, 0x091022, 0.92)
            .setOrigin(0.5)
            .setDepth(1001);
        const leftPanel = this.add.rectangle(layout.leftPanel.x + layout.leftPanel.width / 2, layout.leftPanel.y + layout.leftPanel.height / 2, layout.leftPanel.width, layout.leftPanel.height, 0x11172a, 0.96)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0xffd36e, 0.34)
            .setDepth(1001);
        const rightPanel = this.add.rectangle(layout.rightPanel.x + layout.rightPanel.width / 2, layout.rightPanel.y + layout.rightPanel.height / 2, layout.rightPanel.width, layout.rightPanel.height, 0x11172a, 0.96)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0x75f6ff, 0.34)
            .setDepth(1001);
        const bottomBand = this.add.rectangle(layout.backdrop.x, layout.feedback.y, layout.feedback.width, 52, 0x05050a, 0.78)
            .setOrigin(0.5)
            .setStrokeStyle(1, 0x2be8ff, 0.22)
            .setDepth(1001);
        const title = this.add.text(layout.title.x, layout.title.y, '영수증 폭풍 : 비세목 분류 대작전', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '32px',
            color: '#fff4c9',
            stroke: '#2c1346',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1002);

        const progressText = this.add.text(54, layout.topRowY, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#c9ffef'
        }).setDepth(1002);
        const timerText = this.add.text(260, layout.topRowY, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#fff5c7'
        }).setDepth(1002);
        const hpText = this.add.text(470, layout.topRowY, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#ffd36e'
        }).setDepth(1002);
        const summaryText = this.add.text(675, layout.topRowY, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#c9ffef'
        }).setDepth(1002);

        const cardTitle = this.add.text(layout.cardTitle.x, layout.cardTitle.y, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '24px',
            color: '#fff5c7'
        }).setDepth(1002);
        const cardBody = this.add.text(layout.cardBody.x, layout.cardBody.y, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '17px',
            color: '#f8f3ff',
            wordWrap: { width: layout.cardBody.width },
            lineSpacing: 8
        }).setDepth(1002);

        const statusTitle = this.add.text(layout.statusTitle.x, layout.statusTitle.y, '처리 상태', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '20px',
            color: '#c9ffef'
        }).setDepth(1002);
        const statusText = this.add.text(layout.statusText.x, layout.statusText.y, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#f8f3ff',
            wordWrap: { width: layout.statusText.width },
            lineSpacing: 8
        }).setDepth(1002);
        const stampText = this.add.text(layout.stamp.x, layout.stamp.y, '', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '26px',
            color: '#ffd36e',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(1002);

        const checklistTitle = this.add.text(layout.checklistTitle.x, layout.checklistTitle.y, '필요 추가 처리', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#c9ffef'
        }).setDepth(1002);
        const checklistNote = this.add.text(layout.checklistNote.x, layout.checklistNote.y, '추가 처리 항목을 선택하세요.', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#f8f3ff',
            wordWrap: { width: layout.checklistNote.width },
            lineSpacing: 6
        }).setDepth(1002);

        const messageText = this.add.text(layout.feedback.x, layout.feedback.y, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#c9ffef',
            align: 'center',
            wordWrap: { width: 1100 },
            lineSpacing: 4
        }).setOrigin(0.5).setDepth(1002);

        this.popupContainer = this.add.container(0, 0).setDepth(1000);
        this.popupContainer.add([
            backdrop,
            topBand,
            leftPanel,
            rightPanel,
            bottomBand,
            title,
            progressText,
            timerText,
            hpText,
            summaryText,
            cardTitle,
            cardBody,
            statusTitle,
            statusText,
            stampText,
            checklistTitle,
            checklistNote,
            messageText
        ]);

        this.popupNodes = [backdrop, topBand, leftPanel, rightPanel, bottomBand, title, progressText, timerText, hpText, summaryText, cardTitle, cardBody, statusTitle, statusText, stampText, checklistTitle, checklistNote, messageText];
        this.popupProgressText = progressText;
        this.popupTimerText = timerText;
        this.popupHpText = hpText;
        this.popupSummaryText = summaryText;
        this.popupCardTitle = cardTitle;
        this.popupCardBody = cardBody;
        this.popupStatusText = statusText;
        this.popupStampText = stampText;
        this.popupMessageText = messageText;
        this.popupChecklistNote = checklistNote;

        this.classificationCategoryButtons = [];
        this.classificationActionButtons = {};
        this.classificationChecklistRows = {};

        this.add.text(92, layout.categoryLabelY, '1. 비세목 선택', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#fff4c9'
        }).setDepth(1002);
        CATEGORY_ORDER.forEach((label, index) => {
            const button = this.createButton(this.popupContainer, 92 + index * 212, layout.categoryButtonsY, label, () => this.selectCategory(label), {
                width: 194,
                height: 46,
                fontSize: 18,
                depth: 1002
            });
            this.classificationCategoryButtons.push({ label, ...button });
        });

        this.classificationChecklistRows.minutes = this.createChecklistRow(this.popupContainer, layout.checklistTitle.x, layout.checklistStartY, '회의록 첨부', () => this.toggleEvidence('minutes'), {
            width: 260,
            depth: 1002
        });
        this.classificationChecklistRows.participants = this.createChecklistRow(this.popupContainer, layout.checklistTitle.x, layout.checklistStartY + layout.checklistGapY, '참여명단 첨부', () => this.toggleEvidence('participants'), {
            width: 260,
            depth: 1002
        });
        this.classificationChecklistRows.signature = this.createChecklistRow(this.popupContainer, layout.checklistTitle.x, layout.checklistStartY + layout.checklistGapY * 2, '서명 증빙 첨부', () => this.toggleEvidence('signature'), {
            width: 260,
            depth: 1002
        });
        this.classificationChecklistRows.asset = this.createChecklistRow(this.popupContainer, layout.checklistTitle.x, layout.checklistStartY + layout.checklistGapY * 3, 'PIMS 자산등록', () => this.toggleEvidence('asset'), {
            width: 260,
            depth: 1002
        });
        this.classificationChecklistRows.none = this.createChecklistRow(this.popupContainer, layout.checklistTitle.x, layout.checklistStartY + layout.checklistGapY * 4, '추가 증빙 없음', () => this.toggleEvidence('none'), {
            width: 260,
            depth: 1002
        });

        this.classificationActionLabel = this.add.text(92, layout.actionLabelY, '2. 처리', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#fff5c7'
        }).setDepth(1002);
        this.classificationActionButtons.complete = this.createButton(this.popupContainer, 300, layout.actionButtonsY, '분류 완료', () => this.completeCurrentReceipt(), {
            width: 240,
            height: 52,
            fontSize: 19,
            depth: 1002
        });
        this.classificationActionButtons.reject = this.createButton(this.popupContainer, 580, layout.actionButtonsY, '반려 처리', () => this.rejectCurrentReceipt(), {
            width: 240,
            height: 52,
            fontSize: 19,
            depth: 1002
        });
        this.classificationActionButtons.refresh = this.createButton(this.popupContainer, 860, layout.actionButtonsY, '다시 보기', () => this.refreshClassificationPopup(), {
            width: 240,
            height: 52,
            fontSize: 19,
            depth: 1002
        });

        this.classificationActionLabel?.setVisible?.(true);
    }

    refreshClassificationPopup() {
        if (!this.popupContainer || this.popupMode !== 'classification') {
            return;
        }

        const receipt = this.getCurrentReceipt();
        this.updateClassificationPopupControls(receipt);

        if (!receipt) {
            this.popupCardTitle.setText('영수증 분류 완료');
            this.popupCardBody.setText('모든 영수증을 처리했습니다.');
            this.popupStatusText.setText('이제 PIMS 단말기로 이동하세요.');
            this.popupStampText.setText('');
            this.popupProgressText.setText(`처리 현황: ${this.processedCount}/${RECEIPT_TOTAL}`);
            this.popupTimerText.setText(`D-${this.timerDays}`);
            this.popupHpText.setText(`HP: ${GameState.get('hp')} / 100`);
            this.popupSummaryText.setText(`정상 ${this.registeredCount}건 / 반려 ${this.rejectedCount}건 / 실수 ${this.mistakeCount || 0}회`);
            this.popupMessageText.setText('');
            return;
        }

        const currentNumber = Math.min(this.processedCount + 1, RECEIPT_TOTAL);
        this.popupProgressText.setText(`영수증 ${currentNumber} / ${RECEIPT_TOTAL}`);
        this.popupTimerText.setText(`PIMS 등록기한 D-${this.timerDays}`);
        this.popupHpText.setText(`HP: ${GameState.get('hp')} / 100`);
        this.popupSummaryText.setText(`정상 ${this.registeredCount}건 / 반려 ${this.rejectedCount}건 / 실수 ${this.mistakeCount || 0}회`);
        this.popupCardTitle.setText(receipt.title);
        this.popupCardBody.setText([
            `품목: ${receipt.itemName}`,
            `사용 목적: ${receipt.purpose}`,
            `집행일: ${receipt.expenseDate}`,
            `사용 시간: ${receipt.useTime}`,
            `금액: ${receipt.amount}`
        ].join('\n'));
        this.popupStampText.setText(receipt.rejected ? '반려 완료' : receipt.classified ? '분류 완료' : '');
        this.popupMessageText.setText('영수증 정보를 보고 비세목과 추가 처리를 판단하세요.');
    }

    updateClassificationPopupControls(receipt) {
        if (!this.popupContainer || this.popupMode !== 'classification') {
            return;
        }

        const selected = receipt?.selectedCategory || '미선택';
        const amount = moneyToNumber(receipt?.amount);
        const isPromotion = selected === '사업추진비';
        const needsMeetingExtras = isPromotion && amount >= 500000;
        const isAsset = selected === '자산취득비';
        const isReject = selected === '반려';
        const requiredActions = this.getRequiredExtraActions(receipt);
        const registrationState = receipt?.rejected
            ? '등록 제외'
            : receipt?.asset
                ? (receipt.assetRegistered ? '자산등록 완료' : '등록 대기')
                : (receipt?.classified ? '등록 대기' : '-');

        this.classificationCategoryButtons?.forEach((entry) => {
            entry?.setEnabled?.(true);
            entry?.setSelected?.(selected === entry.label);
        });

        Object.values(this.classificationChecklistRows || {}).forEach((row) => {
            row?.setVisible?.(true);
            row?.setEnabled?.(true);
            row?.setChecked?.(false);
        });

        let checklistNote = '추가 처리 항목을 선택하세요.';
        if (!receipt) {
            checklistNote = '비세목을 먼저 선택하세요.';
        } else if (isReject) {
            checklistNote = '반려 처리 대상입니다.';
        } else if (selected === '미선택') {
            checklistNote = '비세목을 먼저 선택하세요.';
        } else {
            checklistNote = '필요한 항목만 직접 선택하세요.';
        }

        if (this.popupChecklistNote) {
            this.popupChecklistNote.setText(checklistNote);
        }

        const rows = this.classificationChecklistRows || {};
        const showAll = Boolean(receipt);
        if (showAll) {
            rows.none?.setVisible?.(true);
            rows.none?.setEnabled?.(selected !== '미선택');
            rows.none?.setChecked?.(Boolean(receipt?.evidenceFlags.none));

            rows.minutes?.setVisible?.(true);
            rows.participants?.setVisible?.(true);
            rows.signature?.setVisible?.(true);
            rows.asset?.setVisible?.(true);

            rows.minutes?.setEnabled?.(true);
            rows.participants?.setEnabled?.(true);
            rows.signature?.setEnabled?.(true);
            rows.asset?.setEnabled?.(true);

            rows.minutes?.setChecked?.(Boolean(receipt?.evidenceFlags.minutes));
            rows.participants?.setChecked?.(Boolean(receipt?.evidenceFlags.participants));
            rows.signature?.setChecked?.(Boolean(receipt?.evidenceFlags.signature));
            rows.asset?.setChecked?.(Boolean(receipt?.assetRegistered));
        }

        this.classificationActionButtons?.complete?.setEnabled?.(Boolean(receipt && selected !== '미선택' && selected !== '반려'));
        this.classificationActionButtons?.reject?.setEnabled?.(true);
        this.classificationActionButtons?.refresh?.setEnabled?.(true);

        if (this.popupStatusText) {
            this.popupStatusText.setText([
                `선택 비세목: ${selected}`,
                `PIMS 등록 상태: ${registrationState}`
            ].join('\n'));
        }

        if (this.popupMessageText && receipt) {
            this.popupMessageText.setText('체크박스를 눌러 추가 처리 후 분류 완료를 누르세요.');
            this.popupMessageText.setColor('#c9ffef');
        }
    }

    getCurrentReceipt() {
        return this.receiptQueue[0] || null;
    }

    getReceiptRequirementSummary(receipt) {
        if (!receipt) {
            return '-';
        }

        if (receipt.invalid) {
            return '반려 처리';
        }

        if (receipt.asset) {
            return 'PIMS 자산등록 후 분류 완료';
        }

        const requiredActions = this.getRequiredExtraActions(receipt);
        if (!requiredActions.length || requiredActions.includes('none')) {
            return '추가 증빙 없음';
        }

        if (requiredActions.includes('asset')) {
            return 'PIMS 자산등록';
        }

        if (requiredActions.length >= 3) {
            return '회의록 + 참여명단 + 서명 증빙';
        }

        if (requiredActions.includes('minutes')) {
            return '회의록 첨부';
        }

        return '기본 증빙 확인 후 분류';
    }

    getRequiredExtraActions(receipt) {
        if (!receipt) {
            return [];
        }

        if (Array.isArray(receipt.requiredExtraActions) && receipt.requiredExtraActions.length) {
            return [...receipt.requiredExtraActions];
        }

        if (receipt.invalid || receipt.correctCategory === '반려') {
            return [];
        }

        if (receipt.correctCategory === '자산취득비') {
            return ['asset'];
        }

        if (receipt.correctCategory === '사업추진비') {
            const amount = moneyToNumber(receipt.amount);
            return amount >= 500000
                ? ['minutes', 'participants', 'signature']
                : ['minutes'];
        }

        return ['none'];
    }

    getSelectedExtraActions(receipt) {
        if (!receipt) {
            return [];
        }

        const selected = [];
        if (receipt.evidenceFlags?.minutes) {
            selected.push('minutes');
        }
        if (receipt.evidenceFlags?.participants) {
            selected.push('participants');
        }
        if (receipt.evidenceFlags?.signature) {
            selected.push('signature');
        }
        if (receipt.assetRegistered) {
            selected.push('asset');
        }
        if (receipt.evidenceFlags?.none) {
            selected.push('none');
        }
        return selected;
    }

    areActionsEqual(expected, actual) {
        const expectedSet = [...new Set(expected || [])].sort((a, b) => EXTRA_ACTION_ORDER.indexOf(a) - EXTRA_ACTION_ORDER.indexOf(b));
        const actualSet = [...new Set(actual || [])].sort((a, b) => EXTRA_ACTION_ORDER.indexOf(a) - EXTRA_ACTION_ORDER.indexOf(b));
        if (expectedSet.length !== actualSet.length) {
            return false;
        }
        return expectedSet.every((value, index) => value === actualSet[index]);
    }

    getExtraActionMismatchMessage(receipt, expected, actual) {
        return '추가 처리 항목이 맞지 않습니다.';
    }

    selectCategory(category) {
        const receipt = this.getCurrentReceipt();
        if (!receipt || this.popupMode !== 'classification') {
            return;
        }

        if (receipt.selectedCategory !== category) {
            receipt.evidenceFlags.minutes = false;
            receipt.evidenceFlags.participants = false;
            receipt.evidenceFlags.signature = false;
            receipt.assetRegistered = false;
            receipt.evidenceFlags.none = false;
        }
        receipt.selectedCategory = category;
        this.refreshClassificationPopup();
    }

    toggleEvidence(key) {
        const receipt = this.getCurrentReceipt();
        if (!receipt || this.popupMode !== 'classification') {
            return;
        }

        if (key === 'none') {
            receipt.evidenceFlags.none = !receipt.evidenceFlags.none;
            if (receipt.evidenceFlags.none) {
                receipt.evidenceFlags.minutes = false;
                receipt.evidenceFlags.participants = false;
                receipt.evidenceFlags.signature = false;
                receipt.assetRegistered = false;
            }
            this.refreshClassificationPopup();
            return;
        }

        if (key === 'asset') {
            receipt.assetRegistered = !receipt.assetRegistered;
            if (receipt.assetRegistered) {
                receipt.evidenceFlags.none = false;
            }
            this.refreshClassificationPopup();
            return;
        }

        if (!EVIDENCE_KEYS.includes(key)) {
            return;
        }

        receipt.evidenceFlags[key] = !receipt.evidenceFlags[key];
        if (receipt.evidenceFlags[key]) {
            receipt.evidenceFlags.none = false;
        }
        this.refreshClassificationPopup();
    }

    registerAssetCurrentReceipt() {
        this.toggleEvidence('asset');
    }

    completeCurrentReceipt() {
        const receipt = this.getCurrentReceipt();
        if (!receipt || this.popupMode !== 'classification') {
            return;
        }

        if (!receipt.selectedCategory) {
            this.showPopupNotice('비세목을 먼저 선택하세요.', 0xfff0a8);
            return;
        }

        if (receipt.invalid) {
            if (receipt.selectedCategory !== '반려') {
                this.applyWrongAnswer('사업 목적과 관련 없는 지출은 반려해야 합니다.', receipt);
                return;
            }
            this.markReceiptRejected(receipt, '반려 완료');
            return;
        }

        if (receipt.selectedCategory === '반려') {
            this.applyWrongAnswer('반려 대상이 아닌 영수증입니다.', receipt);
            return;
        }

        if (receipt.selectedCategory !== receipt.correctCategory) {
            this.applyWrongAnswer(receipt.feedbackWrong || '비세목이 맞지 않습니다.', receipt);
            return;
        }

        const requiredActions = this.getRequiredExtraActions(receipt);
        const selectedActions = this.getSelectedExtraActions(receipt);
        if (!this.areActionsEqual(requiredActions, selectedActions)) {
            this.applyWrongAnswer(this.getExtraActionMismatchMessage(receipt, requiredActions, selectedActions), receipt);
            return;
        }

        this.markReceiptClassified(receipt);
    }

    rejectCurrentReceipt() {
        const receipt = this.getCurrentReceipt();
        if (!receipt || this.popupMode !== 'classification') {
            return;
        }

        receipt.selectedCategory = '반려';
        this.completeCurrentReceipt();
    }

    applyWrongAnswer(message, receipt = null) {
        this.mistakeCount = (this.mistakeCount || 0) + 1;
        GameState.decreaseHp(HP_LOSS);
        this.showPopupNotice(message, 0xff6b7d);
        this.tweens.add({
            targets: this.popupContainer,
            x: { from: this.popupContainer.x - 8, to: this.popupContainer.x + 8 },
            duration: 60,
            yoyo: true,
            repeat: 2
        });
        this.refreshHud();
        if ((GameState.get('hp') ?? 0) <= 0) {
            this.time.delayedCall(100, () => this.scene.start('GameOverScene'));
        }
        if (receipt) {
            receipt.selectedCategory = receipt.selectedCategory || null;
        }
    }

    markReceiptRejected(receipt, stampText) {
        receipt.rejected = true;
        receipt.classified = true;
        this.rejectedCount += 1;
        this.processedCount += 1;
        GameState.set('stage2CollectedCount', this.processedCount);
        GameState.set('stage2SortedCount', this.registeredCount);
        GameState.set('stage2CurrentReceiptLabel', receipt.title);
        GameState.set('stage2CurrentReceiptCategory', '반려');
        GameState.set('stage2PendingAssetRegistration', this.hasPendingAssetRegistration());
        this.popupStampText.setText(stampText || '반려 완료');
        this.popupMessageText.setText(chapter2Data.rejectLines[0].text);
        this.finishReceiptAndAdvance(receipt);
    }

    markReceiptClassified(receipt) {
        receipt.classified = true;
        this.processedCount += 1;
        GameState.set('stage2CollectedCount', this.processedCount);
        GameState.set('stage2CurrentReceiptLabel', receipt.title);
        GameState.set('stage2CurrentReceiptCategory', receipt.selectedCategory);

        this.pendingPimsReceipts.push(receipt);
        GameState.set('stage2PendingAssetRegistration', this.hasPendingAssetRegistration());

        this.popupStampText.setText('분류 완료');
        this.popupMessageText.setText(this.getSuccessMessageForReceipt(receipt));

        if (!this.bonusTriggered && this.processedCount >= 4 && this.bonusQueue.length > 0) {
            this.triggerBonusWave();
        }

        this.finishReceiptAndAdvance(receipt);
    }

    getSuccessMessageForReceipt(receipt) {
        if (!receipt) {
            return '';
        }

        if (receipt.correctCategory === '반려') {
            return '반려 처리되었습니다.';
        }

        return '분류가 완료되었습니다.';
    }

    finishReceiptAndAdvance(receipt) {
        this.updateReceiptState();
        this.time.delayedCall(380, () => {
            receipt?.destroy?.();
            this.receiptQueue.shift();
            if (this.receiptQueue.length === 0) {
                this.finishPopupAndResume();
                this.enterPimsApproachPhase();
                return;
            }
            this.refreshClassificationPopup();
        });
    }

    enterPimsApproachPhase() {
        if (this.stageResolved) {
            return;
        }

        this.stagePhase = 'pimsApproach';
        GameState.set('stage2Phase', 'pimsApproach');
        GameState.setTimeRunning(true);
        this.bottomHud.setInteractionVisible(true);
        this.bottomHud.setInteractionPrompt(chapter2Data.pimsHint);
        this.refreshHud();
        this.dialogue.say(chapter2Data.registrationPromptLines);
    }

    triggerBonusWave() {
        this.bonusTriggered = true;
        if (this.bonusQueue.length) {
            this.receiptQueue.push(...this.bonusQueue);
            this.bonusQueue = [];
        }
        this.showPopupNotice(chapter2Data.bonusWaveLines.map((line) => line.text).join('\n'), 0xffd36e);
    }

    updateReceiptState() {
        const current = this.getCurrentReceipt();
        GameState.set('stage2CollectedCount', this.processedCount);
        GameState.set('stage2SortedCount', this.registeredCount);
        GameState.set('stage2CurrentReceiptLabel', current?.title || '');
        GameState.set('stage2CurrentReceiptCategory', current?.selectedCategory || current?.correctCategory || '');
        GameState.set('stage2PendingAssetRegistration', this.hasPendingAssetRegistration());
        GameState.set('executionRate', Math.min(100, Math.round((this.registeredCount / RECEIPT_TOTAL) * 100)));
        this.bottomHud?.refresh();
        this.topHud?.refresh();
        this.refreshHud();
    }

    hasPendingAssetRegistration() {
        return this.pendingPimsReceipts.some((receipt) => receipt.asset && !receipt.assetRegistered);
    }

    openRegistrationPopup() {
        if (this.stageResolved) {
            return;
        }

        if (!this.receipts.every((receipt) => receipt.classified)) {
            this.showPopupNotice('아직 분류되지 않은 영수증이 있습니다.', 0xffd36e);
            return;
        }

        this.clearActionPanel();
        this.setHudVisible(false);
        this.popupMode = 'registration';
        this.stagePhase = 'registration';
        GameState.set('stage2Phase', 'registration');
        GameState.setTimeRunning(false);
        this.clearPopup();
        this.createRegistrationPopup();
        this.refreshRegistrationPopup();
    }

    createRegistrationPopup() {
        const overlay = this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02030a, 0.72)
            .setOrigin(0.5)
            .setDepth(1000);
        const panel = this.add.rectangle(CENTER_X, 320, 1040, 560, 0x0f1020, 0.96)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0x75f6ff, 0.45)
            .setDepth(1001);
        const title = this.add.text(CENTER_X, 50, 'PIMS 집행 등록', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '32px',
            color: '#fff4c9',
            stroke: '#2c1346',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1002);
        const infoText = this.add.text(64, 102, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '17px',
            color: '#c9ffef',
            wordWrap: { width: 920 },
            lineSpacing: 6
        }).setDepth(1002);
        const listText = this.add.text(64, 150, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '17px',
            color: '#f8f3ff',
            wordWrap: { width: 540 },
            lineSpacing: 8
        }).setDepth(1002);
        const statusText = this.add.text(630, 150, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '17px',
            color: '#f8f3ff',
            wordWrap: { width: 340 },
            lineSpacing: 8
        }).setDepth(1002);
        const footerText = this.add.text(CENTER_X, 480, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#c9ffef',
            align: 'center',
            wordWrap: { width: 900 }
        }).setOrigin(0.5).setDepth(1002);

        this.popupContainer = this.add.container(0, 0).setDepth(1000);
        this.popupContainer.add([overlay, panel, title, infoText, listText, statusText, footerText]);
        this.popupNodes = [overlay, panel, title, infoText, listText, statusText, footerText];
        this.registrationInfoText = infoText;
        this.registrationListText = listText;
        this.registrationStatusText = statusText;
        this.registrationFooterText = footerText;
        this.popupMessageText = footerText;

        this.createButton(this.popupContainer, 286, 530, 'PIMS 자산등록', () => this.performAssetRegistration(), {
            width: 220,
            height: 50,
            fontSize: 18,
            depth: 1002
        });
        this.createButton(this.popupContainer, 540, 530, '전체 집행등록', () => this.performBatchRegistration(), {
            width: 220,
            height: 50,
            fontSize: 18,
            depth: 1002
        });
        this.createButton(this.popupContainer, 794, 530, '최종 등록 완료', () => this.finalizeRegistration(), {
            width: 220,
            height: 50,
            fontSize: 18,
            depth: 1002
        });
    }

    refreshRegistrationPopup() {
        if (!this.popupContainer || this.popupMode !== 'registration') {
            return;
        }

        const assetPending = this.pendingPimsReceipts.filter((receipt) => receipt.asset && !receipt.assetRegistered);
        const pendingItems = this.pendingPimsReceipts.filter((receipt) => receipt.classified && !receipt.rejected);
        const registeredItems = this.pendingPimsReceipts.filter((receipt) => receipt.registered);

        this.registrationInfoText.setText([
            `등록 대기 ${pendingItems.length}건 / 반려 ${this.rejectedCount}건`,
            `집행률 ${GameState.get('executionRate')}%`,
            `D-${this.timerDays}`
        ].join('\n'));
        this.registrationListText.setText(
            pendingItems.length
                ? pendingItems.map((receipt) => {
                    const status = receipt.asset
                        ? (receipt.assetRegistered ? '자산등록 완료' : '자산등록 필요')
                        : (receipt.registered ? '집행등록 완료' : '등록 대기');
                    return `- ${receipt.title} / ${receipt.correctCategory} / ${status}`;
                }).join('\n')
                : '등록 대기 목록이 없습니다.'
        );
        this.registrationStatusText.setText([
            `자산등록 필요: ${assetPending.length}`,
            `집행등록 완료: ${registeredItems.length}`,
            `반려 제외: ${this.rejectedCount}`,
            '',
            assetPending.length ? '자산취득비는 먼저 자산등록하세요.' : '이제 전체 집행등록을 진행할 수 있습니다.'
        ].join('\n'));
        this.registrationFooterText.setText(
            assetPending.length
                ? chapter2Data.assetReminder
                : '분류 완료한 영수증을 PIMS에 최종 등록하세요.'
        );
    }

    performAssetRegistration() {
        if (this.stageResolved || this.popupMode !== 'registration') {
            return;
        }

        const assetReceipts = this.pendingPimsReceipts.filter((receipt) => receipt.asset && !receipt.assetRegistered);
        if (!assetReceipts.length) {
            this.showPopupNotice('자산등록 대상이 없습니다.', 0x75f6ff);
            return;
        }

        assetReceipts.forEach((receipt) => {
            receipt.assetRegistered = true;
        });
        this.assetRegistered = true;
        GameState.set('stage2PendingAssetRegistration', false);
        this.showPopupNotice(chapter2Data.assetRegistered, 0x75f6ff);
        this.refreshRegistrationPopup();
    }

    performBatchRegistration() {
        if (this.stageResolved || this.popupMode !== 'registration') {
            return;
        }

        const assetPending = this.pendingPimsReceipts.filter((receipt) => receipt.asset && !receipt.assetRegistered);
        if (assetPending.length) {
            this.showPopupNotice(chapter2Data.assetReminder, 0xffd36e);
            return;
        }

        this.pendingPimsReceipts.forEach((receipt) => {
            if (!receipt.rejected) {
                receipt.registered = true;
            }
        });
        this.registeredCount = this.pendingPimsReceipts.filter((receipt) => receipt.registered).length;
        GameState.set('stage2SortedCount', this.registeredCount);
        GameState.set('executionRate', Math.min(100, Math.round((this.registeredCount / RECEIPT_TOTAL) * 100)));
        this.showPopupNotice('전체 집행등록이 완료되었습니다.', 0xc9ffef);
        this.refreshRegistrationPopup();
    }

    finalizeRegistration() {
        if (this.stageResolved || this.popupMode !== 'registration') {
            return;
        }

        const assetPending = this.pendingPimsReceipts.filter((receipt) => receipt.asset && !receipt.assetRegistered);
        if (assetPending.length) {
            this.showPopupNotice(chapter2Data.assetReminder, 0xffd36e);
            return;
        }

        const pendingUnregistered = this.pendingPimsReceipts.filter((receipt) => !receipt.rejected && !receipt.registered);
        if (pendingUnregistered.length) {
            this.showPopupNotice('등록 대기 목록을 모두 처리해야 합니다.', 0xffd36e);
            return;
        }

        this.registeredCount = this.pendingPimsReceipts.filter((receipt) => receipt.registered).length;
        GameState.set('stage2SortedCount', this.registeredCount);
        GameState.set('executionRate', Math.min(100, Math.round((this.registeredCount / RECEIPT_TOTAL) * 100)));
        this.completeStage2();
    }

    showActionPanel({ title, hint, buttonLabel, onClick, color = 0xffd36e, x = chapter2Data.receiptPile.x + 92, y = chapter2Data.receiptPile.y - 10 }) {
        this.clearActionPanel();
        this.bottomHud.setInteractionVisible(false);
        this.actionPanel = this.add.container(0, 0).setDepth(960);
        const panelX = x;
        const panelY = y;
        const overlay = this.add.rectangle(panelX, panelY, 360, 132, 0x05050a, 0.92)
            .setOrigin(0.5)
            .setStrokeStyle(2, color, 0.55);
        const titleText = this.add.text(panelX, panelY - 35, title, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#fff5c7'
        }).setOrigin(0.5);
        const hintText = this.add.text(panelX, panelY - 2, hint, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '14px',
            color: '#c9ffef',
            align: 'center',
            wordWrap: { width: 316 }
        }).setOrigin(0.5);
        this.actionPanel.add([overlay, titleText, hintText]);
        this.createButton(this.actionPanel, panelX, panelY + 38, buttonLabel, onClick, {
            width: 220,
            height: 44,
            fontSize: 17,
            depth: 961
        });
    }

    clearActionPanel() {
        this.actionPanel?.destroy(true);
        this.actionPanel = null;
        this.bottomHud.setInteractionVisible(true);
        this.bottomHud.refresh();
    }

    clearPopup() {
        this.popupContainer?.destroy(true);
        this.popupContainer = null;
        this.popupNodes = [];
        this.popupProgressText = null;
        this.popupTimerText = null;
        this.popupHpText = null;
        this.popupSummaryText = null;
        this.popupCardTitle = null;
        this.popupCardBody = null;
        this.popupStatusText = null;
        this.popupStampText = null;
        this.popupMessageText = null;
        this.popupChecklistNote = null;
        this.popupMode = null;
    }

    showPopupNotice(message, color = 0xc9ffef) {
        if (!this.popupMessageText) {
            this.showToast(message, color);
            return;
        }

        this.popupMessageText.setColor(`#${color.toString(16).padStart(6, '0')}`);
        this.popupMessageText.setText(message);
        this.tweens.add({
            targets: this.popupMessageText,
            alpha: { from: 0.4, to: 1 },
            duration: 120,
            yoyo: true
        });
    }

    showToast(message, color = 0xc9ffef) {
        this.toast?.destroy();
        this.toast = this.add.text(CENTER_X, 440, message, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#f8f3ff',
            stroke: '#000000',
            strokeThickness: 4,
            backgroundColor: '#05050a',
            padding: { left: 12, right: 12, top: 6, bottom: 6 }
        }).setOrigin(0.5).setDepth(95);
        this.toast.setColor(`#${color.toString(16).padStart(6, '0')}`);

        this.tweens.add({
            targets: this.toast,
            alpha: { from: 1, to: 0 },
            duration: 1400,
            delay: 900,
            onComplete: () => this.toast?.destroy()
        });
    }

    getKeyboardAxis() {
        return {
            x: (this.cursors.left.isDown || this.wasd.A.isDown ? -1 : 0) + (this.cursors.right.isDown || this.wasd.D.isDown ? 1 : 0),
            y: (this.cursors.up.isDown || this.wasd.W.isDown ? -1 : 0) + (this.cursors.down.isDown || this.wasd.S.isDown ? 1 : 0)
        };
    }

    clampToWalkable(x, y) {
        const area = chapter2Data.walkableArea;
        return {
            x: Phaser.Math.Clamp(x, area.x, area.x + area.width),
            y: Phaser.Math.Clamp(y, area.y, area.y + area.height)
        };
    }

    clampPlayerToWalkable() {
        const clamped = this.clampToWalkable(this.player.x, this.player.y);
        this.player.setPosition(clamped.x, clamped.y);
    }

    finishPopupAndResume() {
        this.clearPopup();
        this.setHudVisible(true);
        this.bottomHud.setInteractionVisible(true);
        this.bottomHud.refresh();
        GameState.setTimeRunning(true);
        this.refreshHud();
    }

    completeStage2() {
        if (this.stageResolved) {
            return;
        }

        this.stageResolved = true;
        GameState.set('stage2Cleared', true);
        GameState.set('stage2Failed', false);
        GameState.set('timeRunning', false);
        GameState.set('executionRate', 100);
        this.timerLoop?.remove(false);
        this.clearActionPanel();
        this.clearPopup();
        this.setHudVisible(false);

        this.showEndingScreen({
            title: '2단계 완료',
            body: '영수증 분류와 PIMS 등록까지 모두 마쳤습니다.\n집행 처리를 완료했습니다.',
            primaryLabel: '3단계 시작',
            primaryAction: () => this.scene.start('MiddleFerrisWheelScene'),
            secondaryLabel: '처음으로 돌아가기',
            secondaryAction: () => {
                GameState.reset();
                this.scene.start('StartScene');
            },
            tertiaryLabel: '다시 하기',
            tertiaryAction: () => {
                GameState.reset();
                this.scene.start('ExecutionHouseScene');
            }
        });
    }

    setHudVisible(visible) {
        this.topHud?.container?.setVisible(Boolean(visible));
        this.bottomHud?.container?.setVisible(Boolean(visible));
    }

    failStage(message) {
        if (this.stageResolved) {
            return;
        }

        this.stageResolved = true;
        GameState.set('stage2Cleared', false);
        GameState.set('stage2Failed', true);
        GameState.set('timeRunning', false);
        this.timerLoop?.remove(false);
        this.clearActionPanel();
        this.clearPopup();
        this.setHudVisible(false);
        this.bottomHud.setInteractionVisible(false);

        this.showEndingScreen({
            title: '시간 초과',
            body: message,
            primaryLabel: '다시 하기',
            primaryAction: () => {
                GameState.reset();
                this.scene.start('ExecutionHouseScene');
            },
            secondaryLabel: '처음으로 돌아가기',
            secondaryAction: () => {
                GameState.reset();
                this.scene.start('StartScene');
            }
        });
    }

    showEndingScreen({ title, body, primaryLabel, primaryAction, secondaryLabel, secondaryAction, tertiaryLabel, tertiaryAction }) {
        this.endingOverlay = this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02030a, 0.72)
            .setOrigin(0.5)
            .setDepth(100);

        const overlayShade = this.add.graphics().setDepth(101);
        const steps = 42;
        const stepHeight = GAME_HEIGHT / steps;
        for (let i = 0; i < steps; i += 1) {
            const t = i / Math.max(1, steps - 1);
            const alpha = 0.04 + (0.82 - 0.04) * Math.pow(t, 1.08);
            overlayShade.fillStyle(0x02030a, alpha).fillRect(0, i * stepHeight, GAME_WIDTH, stepHeight + 1);
        }
        this.endingOverlayShade = overlayShade;

        this.add.text(CENTER_X, 130, title, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '42px',
            color: '#fff5c7',
            stroke: '#34145c',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(110);

        this.add.text(CENTER_X, 232, body, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '24px',
            color: '#f8f3ff',
            align: 'center',
            wordWrap: { width: 860 },
            lineSpacing: 10
        }).setOrigin(0.5).setDepth(110);

        if (tertiaryLabel && tertiaryAction) {
            this.createButton(null, 320, 612, primaryLabel, primaryAction);
            this.createButton(null, 640, 612, secondaryLabel, secondaryAction);
            this.createButton(null, 960, 612, tertiaryLabel, tertiaryAction);
            return;
        }

        this.createButton(null, 440, 612, primaryLabel, primaryAction);
        this.createButton(null, 840, 612, secondaryLabel, secondaryAction);
    }

    createButton(parent, x, y, label, onClick, options = {}) {
        const width = options.width || 260;
        const height = options.height || 56;
        const fontSize = options.fontSize || 20;
        const depth = options.depth || 110;
        let bg;
        let hoverBg = null;

        if (this.textures.exists('ui_button_normal')) {
            bg = this.add.image(x, y, 'ui_button_normal').setDisplaySize(width, height).setDepth(depth);
            if (this.textures.exists('ui_button_hover')) {
                hoverBg = this.add.image(x, y, 'ui_button_hover').setDisplaySize(width, height).setVisible(false).setDepth(depth);
            }
        } else {
            bg = this.add.rectangle(x, y, width, height, 0x24183f, 1).setStrokeStyle(2, 0x75f6ff, 0.72).setDepth(depth);
        }

        const text = this.add.text(x, y, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: `${fontSize}px`,
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(depth + 1);

        const hit = this.add.rectangle(x, y, width, height, 0x000000, 0).setDepth(depth).setInteractive({ useHandCursor: true });
        const select = (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            onClick?.();
        };
        hit.on('pointerover', () => {
            if (hoverBg) {
                bg.setVisible(false);
                hoverBg.setVisible(true);
            } else if (bg.setFillStyle) {
                bg.setFillStyle(0x322159);
            }
        });
        hit.on('pointerout', () => {
            if (hoverBg) {
                bg.setVisible(true);
                hoverBg.setVisible(false);
            } else if (bg.setFillStyle) {
                bg.setFillStyle(0x24183f);
            }
        });
        hit.on('pointerdown', select);
        text.setInteractive({ useHandCursor: true }).on('pointerdown', select);
        bg.setInteractive?.({ useHandCursor: true }).on('pointerdown', select);
        hoverBg?.setInteractive?.({ useHandCursor: true }).on('pointerdown', select);

        let enabled = true;
        const nodes = [bg, hoverBg, text, hit].filter(Boolean);
        if (parent?.add) {
            parent.add(nodes);
        }

        return {
            bg,
            hoverBg,
            text,
            hit,
            nodes,
            setEnabled: (nextEnabled) => {
                enabled = Boolean(nextEnabled);
                if (enabled) {
                    hit?.setInteractive?.({ useHandCursor: true });
                    bg?.setAlpha?.(1);
                    hoverBg?.setAlpha?.(1);
                    text?.setAlpha?.(1);
                } else {
                    hit?.disableInteractive?.();
                    bg?.setAlpha?.(0.42);
                    hoverBg?.setAlpha?.(0.42);
                    text?.setAlpha?.(0.56);
                    hoverBg?.setVisible?.(false);
                }
            },
            setSelected: (selected) => {
                if (!enabled) {
                    return;
                }
                if (selected) {
                    if (bg?.setTint) {
                        bg.setTint(0xdbe9ff);
                    }
                    if (hoverBg?.setTint) {
                        hoverBg.setTint(0xdbe9ff);
                    }
                    text?.setColor?.('#1b2140');
                } else {
                    if (bg?.clearTint) {
                        bg.clearTint();
                    }
                    if (hoverBg?.clearTint) {
                        hoverBg.clearTint();
                    }
                    text?.setColor?.('#ffffff');
                }
            }
        };
    }

    createChecklistRow(parent, x, y, label, onClick, options = {}) {
        const width = options.width || 246;
        const depth = options.depth || 1002;
        const row = this.add.container(x, y).setDepth(depth);
        const box = this.add.rectangle(0, 0, 18, 18, 0x11172a, 1)
            .setStrokeStyle(2, 0x75f6ff, 0.9);
        const mark = this.add.text(0, 0, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#fff5c7',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        const text = this.add.text(26, 0, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#f8f3ff'
        }).setOrigin(0, 0.5);
        const hit = this.add.rectangle(width / 2, 0, width, 26, 0x000000, 0)
            .setInteractive({ useHandCursor: true });

        const select = (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            onClick?.();
        };

        hit.on('pointerdown', select);

        row.add([box, mark, text, hit]);
        parent?.add?.(row);

        let enabled = true;
        let visible = true;

        return {
            row,
            box,
            mark,
            text,
            hit,
            setEnabled(nextEnabled) {
                enabled = Boolean(nextEnabled);
                if (enabled) {
                    hit.setInteractive({ useHandCursor: true });
                    row.setAlpha(1);
                } else {
                    hit.disableInteractive();
                    row.setAlpha(0.45);
                }
            },
            setChecked(nextChecked) {
                const checked = Boolean(nextChecked);
                mark.setText(checked ? '✓' : '');
                box.setFillStyle(checked ? 0x75f6ff : 0x11172a, checked ? 0.92 : 1);
                text.setColor(checked ? '#fff5c7' : '#f8f3ff');
                return checked;
            },
            setVisible(nextVisible) {
                visible = Boolean(nextVisible);
                row.setVisible(visible);
            },
            setLabel(nextLabel) {
                text.setText(nextLabel);
            },
            isEnabled() {
                return enabled;
            },
            isVisible() {
                return visible;
            }
        };
    }

    refreshHud() {
        this.topHud.refresh();
        this.bottomHud.refresh();
    }
}

