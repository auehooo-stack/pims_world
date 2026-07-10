import * as Phaser from 'phaser';
import { chapter5Data, changeTypeMeta } from '../data/chapter5Data.js';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { InteractionManager } from '../systems/InteractionManager.js';
import { Player } from '../objects/Player.js';
import { InteractableObject } from '../objects/InteractableObject.js';
import { BottomHUD } from '../objects/BottomHUD.js';
import { TopHUD } from '../objects/TopHUD.js';
import { ASSETS, hasTexture, playBgmWithFade } from '../systems/AssetManager.js';
import { CENTER_X, DIALOG_TOP, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

const TYPE_ORDER = ['approval', 'notification', 'etc'];
const DEV_STAGE5_VIEW_KEY = 'pims_world.dev.stage5_view';
const DEV_STAGE5_LOCK_KEY = 'pims_world.dev.stage5_lock';
const DEV_STAGE5_VIEW_DEFAULT = false;

const LAYOUT = {
    top: {
        warningX: CENTER_X,
        warningY: 143,
        progressX: 1040,
        progressY: 34,
        hpX: 1160,
        hpY: 66
    },
    caseCard: { x: 156, y: 230, width: 310, height: 270 },
    typePanel: { x: 500, y: 230, width: 280, height: 270 },
    attachmentPanel: { x: 810, y: 230, width: 310, height: 270 },
    feedbackPanel: { x: 150, y: 530, width: 630, height: 120 },
    nextButton: { x: 873, y: 588, width: 150, height: 70 },
    resetButton: { x: 1053, y: 588, width: 150, height: 70 }
};

const arraysEqualAsSet = (a, b) => {
    if (a.length !== b.length) {
        return false;
    }
    const setA = new Set(a);
    return b.every((item) => setA.has(item));
};

const makeBlankCaseState = () => ({
    selectedChangeType: null,
    shownAttachmentList: [],
    feedbackMessage: '',
    isAnswerLocked: false
});

export class TransformationRoomScene extends Phaser.Scene {
    constructor() {
        super('TransformationRoomScene');
        this.mode = 'field';
        this.player = null;
        this.interaction = null;
        this.interactables = [];
        this.clickTarget = null;
        this.dialogue = null;
        this.topHud = null;
        this.bottomHud = null;
        this.packageOverlay = null;
        this.caseNodes = [];
        this.typeButtons = [];
        this.attachmentNodes = [];
        this.warningPulseTween = null;
        this.pimsReadyTween = null;
        this.trapTweens = [];
        this.devFreezeIndicator = null;
        this.currentCaseIndex = 0;
        this.selectedChangeType = null;
        this.shownAttachmentList = [];
        this.feedbackMessage = '';
        this.isAnswerLocked = false;
        this.isMiniGameActive = false;
        this.villainEventTriggered = false;
        this.stage5QuizCompleted = false;
        this.stage5PimsReady = false;
        this.stage5PimsRegistered = false;
        this.stage5Cleared = false;
        this.hp = 100;
        this.mistakeCount = 0;
        this.processedCount = 0;
        this.caseTitleText = null;
        this.caseDescriptionText = null;
        this.caseNoteText = null;
        this.caseMetaText = null;
        this.attachmentNoticeBg = null;
        this.attachmentBody = null;
        this.feedbackText = null;
        this.headerWarningText = null;
        this.headerProgressText = null;
        this.headerHpText = null;
        this.warningPulseText = null;
        this.nextButton = null;
        this.resetButton = null;
        this.pimsTerminalObject = null;
        this.onSpaceDown = null;
        this.onEnterDown = null;
        this.onPointerDown = null;
    }

    isDevFreezeLocked() {
        if (!import.meta.env.DEV || typeof window === 'undefined') {
            return false;
        }

        try {
            const raw = window.sessionStorage.getItem(DEV_STAGE5_LOCK_KEY);
            if (raw === null) {
                return DEV_STAGE5_VIEW_DEFAULT;
            }
            return raw === '1';
        } catch {
            return DEV_STAGE5_VIEW_DEFAULT;
        }
    }

    getDevFreezeView() {
        if (!import.meta.env.DEV || typeof window === 'undefined') {
            return null;
        }

        try {
            const raw = window.sessionStorage.getItem(DEV_STAGE5_VIEW_KEY);
            if (!raw) {
                return null;
            }
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    saveDevFreezeView() {
        if (!import.meta.env.DEV || typeof window === 'undefined') {
            return;
        }

        try {
            window.sessionStorage.setItem(DEV_STAGE5_VIEW_KEY, JSON.stringify({
                currentCaseIndex: this.currentCaseIndex,
                selectedChangeType: this.selectedChangeType,
                shownAttachmentList: this.shownAttachmentList,
                feedbackMessage: this.feedbackMessage,
                isAnswerLocked: this.isAnswerLocked,
                isMiniGameActive: this.isMiniGameActive,
                mode: this.mode,
                villainEventTriggered: this.villainEventTriggered,
                processedCount: this.processedCount,
                mistakeCount: this.mistakeCount,
                stage5Cleared: this.stage5Cleared,
                stage5QuizCompleted: this.stage5QuizCompleted,
                stage5PimsReady: this.stage5PimsReady,
                stage5PimsRegistered: this.stage5PimsRegistered
            }));
        } catch {
            // Ignore storage failures in dev.
        }
    }

    clearDevFreezeView() {
        if (!import.meta.env.DEV || typeof window === 'undefined') {
            return;
        }

        try {
            window.sessionStorage.removeItem(DEV_STAGE5_VIEW_KEY);
        } catch {
            // Ignore storage failures in dev.
        }
    }

    restoreDevFreezeView() {
        const saved = this.getDevFreezeView();
        if (!saved) {
            return;
        }

        this.currentCaseIndex = Phaser.Math.Clamp(saved.currentCaseIndex ?? 0, 0, chapter5Data.changeCases.length - 1);
        this.selectedChangeType = saved.selectedChangeType ?? null;
        this.shownAttachmentList = Array.isArray(saved.shownAttachmentList) ? [...saved.shownAttachmentList] : [];
        this.feedbackMessage = saved.feedbackMessage ?? '';
        this.isAnswerLocked = Boolean(saved.isAnswerLocked);
        this.isMiniGameActive = Boolean(saved.isMiniGameActive);
        this.villainEventTriggered = Boolean(saved.villainEventTriggered);
        this.processedCount = Number.isFinite(saved.processedCount) ? saved.processedCount : 0;
        this.mistakeCount = Number.isFinite(saved.mistakeCount) ? saved.mistakeCount : 0;
        this.stage5Cleared = Boolean(saved.stage5Cleared);
        this.stage5QuizCompleted = Boolean(saved.stage5QuizCompleted);
        this.stage5PimsReady = Boolean(saved.stage5PimsReady);
        this.stage5PimsRegistered = Boolean(saved.stage5PimsRegistered);

        GameState.set('currentCaseIndex', this.currentCaseIndex);
        GameState.set('selectedChangeType', this.selectedChangeType);
        GameState.set('shownAttachmentList', [...this.shownAttachmentList]);
        GameState.set('feedbackMessage', this.feedbackMessage);
        GameState.set('isAnswerLocked', this.isAnswerLocked);
        GameState.set('isMiniGameActive', this.isMiniGameActive);
        GameState.set('villainEventTriggered', this.villainEventTriggered);
        GameState.set('processedCount', this.processedCount);
        GameState.set('mistakeCount', this.mistakeCount);
        GameState.set('stage5Cleared', this.stage5Cleared);
        GameState.set('stage5QuizCompleted', this.stage5QuizCompleted);
        GameState.set('stage5PimsReady', this.stage5PimsReady);
        GameState.set('stage5PimsRegistered', this.stage5PimsRegistered);
    }

    create() {
        GameState.set('currentChapter', 5);
        GameState.set('timeRunning', true);
        GameState.set('currentCaseIndex', 0);
        GameState.set('selectedChangeType', null);
        GameState.set('shownAttachmentList', []);
        GameState.set('isAnswerLocked', false);
        GameState.set('mistakeCount', 0);
        GameState.set('processedCount', 0);
        GameState.set('villainEventTriggered', false);
        GameState.set('feedbackMessage', '');
        GameState.set('isMiniGameActive', false);
        GameState.set('stage5QuizCompleted', false);
        GameState.set('stage5PimsReady', false);
        GameState.set('stage5PimsRegistered', false);
        GameState.set('stage5Cleared', false);
        GameState.set('stage5BriefingDone', false);
        this.hp = GameState.get('hp') ?? 100;

        this.cameras.main.setBackgroundColor(0x090714);
        playBgmWithFade(this, ASSETS.audio.bgmMain.key, { loop: true, volume: 0.35 }, 900);
        this.drawBackground();
        this.createHud();
        this.createWorld();

        this.dialogue = new DialogueManager(this, {
            layout: this.bottomHud.getDialogLayout()
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        this.onSpaceDown = () => this.tryInteract();
        this.onEnterDown = () => {
            if (!this.dialogue.isActive) {
                this.tryInteract();
            }
        };
        this.onPointerDown = (pointer) => {
            if (this.dialogue.isActive || this.mode !== 'field' || pointer.y > DIALOG_TOP) {
                return;
            }
            this.clickTarget = this.clampToWalkable(pointer.x, pointer.y);
        };

        this.spaceKey.on('down', this.onSpaceDown);
        this.enterKey.on('down', this.onEnterDown);
        this.input.on('pointerdown', this.onPointerDown);
        this.events.once('shutdown', () => this.cleanup());

        if (this.isDevFreezeLocked()) {
            this.mode = 'package';
            this.isMiniGameActive = true;
            GameState.set('isMiniGameActive', true);
            this.bottomHud.container?.setVisible(false);
            this.bottomHud.setInteractionVisible(false);
            this.buildMiniGameOverlay();
            this.restoreDevFreezeView();
            this.showCase(this.currentCaseIndex);
            this.renderAttachmentPanel();
            this.renderFeedback(this.feedbackMessage, Boolean(this.feedbackMessage));
            this.renderHeader();
            this.refreshStage5TerminalState();
            this.scene.pause();
        } else {
            this.time.delayedCall(220, () => this.playBriefing());
        }

        this.refreshHud();
    }

    drawBackground() {
        if (hasTexture(this, ASSETS.backgrounds.transformationRoom.key)) {
            this.add.image(CENTER_X, GAME_HEIGHT / 2, ASSETS.backgrounds.transformationRoom.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setOrigin(0.5)
                .setDepth(0);
            return;
        }

        const g = this.add.graphics().setDepth(0);
        g.fillStyle(0x040710, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        g.fillStyle(0x11172d, 1).fillRect(0, 0, GAME_WIDTH, 160);
        g.fillStyle(0x1b2240, 1).fillRect(0, 160, GAME_WIDTH, 260);
        g.fillStyle(0x0b1020, 1).fillRect(0, 420, GAME_WIDTH, 300);
        g.fillStyle(0x0f1220, 0.9).fillRoundedRect(70, 382, 510, 98, 8);
        g.fillStyle(0x24183f, 0.92).fillRoundedRect(930, 260, 240, 250, 12);
        g.fillStyle(0x0f1220, 0.95).fillRoundedRect(952, 288, 196, 166, 8);
    }

    createHud() {
        this.topHud = new TopHUD(this, { title: chapter5Data.title });
        this.bottomHud = new BottomHUD(this);
        this.bottomHud.setInteractionPrompt(chapter5Data.roomPrompt);
        this.bottomHud.setInteractionVisible(true);
    }

    createWorld() {
        this.player = new Player(this, chapter5Data.playerStart.x, chapter5Data.playerStart.y);
        this.player.speed = 260;

        this.interactables = [
            new InteractableObject(this, {
                id: 'assistant',
                name: 'KCA 간사',
                prompt: chapter5Data.roomPrompt,
                x: 238,
                y: 458,
                width: 100,
                height: 136,
                textureKey: ASSETS.characters.kcaAssistantIdle.key,
                color: 0xff4f86,
                animated: false
            }, () => this.handleInteraction('assistant')),
            new InteractableObject(this, {
                id: 'changePackage',
                name: '변경의 거울',
                prompt: chapter5Data.roomPrompt,
                x: chapter5Data.roomInteractable.x,
                y: chapter5Data.roomInteractable.y,
                width: chapter5Data.roomInteractable.width,
                height: chapter5Data.roomInteractable.height,
                hideBorder: true,
                animated: false
            }, () => this.handleInteraction('changePackage')),
            new InteractableObject(this, {
                id: 'terminal',
                name: 'PIMS 단말기',
                prompt: '먼저 변경유형 판정이 필요합니다.',
                x: 1188,
                y: 420,
                width: 118,
                height: 146,
                hideBorder: true,
                animated: false
            }, () => this.handleInteraction('terminal'))
        ];

        this.pimsTerminalObject = this.interactables.find((item) => item.id === 'terminal') || null;

        this.interaction = new InteractionManager(
            this,
            this.player,
            this.interactables,
            (prompt) => this.bottomHud.setInteractionPrompt(prompt)
        );
        this.refreshStage5TerminalState();
    }

    playBriefing() {
        if (GameState.get('stage5BriefingDone') || this.dialogue.isActive || this.mode !== 'field') {
            return;
        }

        GameState.set('stage5BriefingDone', true);
        this.dialogue.say([
            { speaker: 'KCA 간사', text: '협약변경의 방에 오신 걸 환영합니다.' },
            { speaker: 'KCA 간사', text: '변경 유형을 먼저 판정하고, 필요한 첨부서류를 확인해 주세요.' }
        ]);
    }

    update() {
        const blocked = this.dialogue.isActive || this.mode !== 'field' || this.isMiniGameActive;
        this.interactables.forEach((item) => item.update?.());
        this.interaction.update(blocked);
        this.refreshHud();
        this.refreshStage5TerminalState();

        if (blocked) {
            this.player.setMovement(0, 0);
            return;
        }

        const axis = this.getKeyboardAxis();
        if (axis.x !== 0 || axis.y !== 0) {
            this.clickTarget = null;
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

    getKeyboardAxis() {
        return {
            x: (this.cursors.left.isDown || this.wasd.A.isDown ? -1 : 0) + (this.cursors.right.isDown || this.wasd.D.isDown ? 1 : 0),
            y: (this.cursors.up.isDown || this.wasd.W.isDown ? -1 : 0) + (this.cursors.down.isDown || this.wasd.S.isDown ? 1 : 0)
        };
    }

    moveTowardClickTarget() {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.clickTarget.x, this.clickTarget.y);
        if (distance < 4) {
            this.clickTarget = null;
            this.player.setMovement(0, 0);
            return;
        }

        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.clickTarget.x, this.clickTarget.y);
        this.player.setMovement(Math.cos(angle) * this.player.speed, Math.sin(angle) * this.player.speed);
    }

    clampToWalkable(x, y) {
        const area = { x: 48, y: 146, width: GAME_WIDTH - 96, height: 398 };
        return {
            x: Phaser.Math.Clamp(x, area.x, area.x + area.width),
            y: Phaser.Math.Clamp(y, area.y, area.y + area.height)
        };
    }

    clampPlayerToWalkable() {
        const clamped = this.clampToWalkable(this.player.x, this.player.y);
        this.player.setPosition(clamped.x, clamped.y);
    }

    handleInteraction(id) {
        if (this.mode !== 'field') {
            return;
        }

        if (id === 'assistant') {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '변경유형을 먼저 판정해 주세요.' }]);
            return;
        }

        if (id === 'changePackage') {
            if (this.isStage5PimsRegistered()) {
                this.dialogue.say([{ speaker: 'KCA 간사', text: 'PIMS 변경정보 등록까지 이미 완료했습니다.' }]);
                return;
            }

            if (this.stage5QuizCompleted) {
                this.dialogue.say([{ speaker: 'KCA 간사', text: '변경유형 판정은 끝났습니다. 이제 PIMS 단말기에서 등록하세요.' }]);
                return;
            }
            this.openMiniGame();
            return;
        }

        if (id === 'terminal') {
            this.handlePimsTerminalInteraction();
        }
    }

    openMiniGame() {
        if (this.isMiniGameActive || this.stage5QuizCompleted || this.isStage5PimsRegistered()) {
            if (this.stage5QuizCompleted && !this.isStage5PimsRegistered()) {
                this.dialogue.say([{ speaker: 'KCA 간사', text: '이제 PIMS 단말기에서 변경정보를 등록하세요.' }]);
            }
            return;
        }

        this.mode = 'package';
        this.isMiniGameActive = true;
        GameState.set('isMiniGameActive', true);
        this.bottomHud?.container?.setVisible(false);
        this.bottomHud?.setInteractionVisible(false);
        this.buildMiniGameOverlay();
        this.showCase(this.currentCaseIndex);
    }

    handlePimsTerminalInteraction() {
        if (this.isStage5PimsRegistered()) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: 'PIMS 변경정보 등록은 이미 완료되었습니다.' }]);
            return;
        }

        if (!this.stage5QuizCompleted || !this.stage5PimsReady) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '먼저 변경의 거울에서 변경유형을 판정해야 합니다.' }]);
            return;
        }

        this.registerStage5Pims();
    }

    buildMiniGameOverlay() {
        this.packageOverlay?.destroy(true);
        this.packageOverlay = this.add.container(0, 0).setDepth(980);
        this.caseNodes = [];
        this.typeButtons = [];
        this.attachmentNodes = [];

        const backdrop = hasTexture(this, ASSETS.backgrounds.transformationRoomQuiz.key)
            ? this.add.image(CENTER_X, GAME_HEIGHT / 2, ASSETS.backgrounds.transformationRoomQuiz.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setOrigin(0.5)
            : this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02030a, 0.5)
                .setOrigin(0.5);
        const warning = this.add.text(LAYOUT.top.warningX, LAYOUT.top.warningY, chapter5Data.warningText, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#ffd36e',
            backgroundColor: 'rgba(65, 38, 7, 0.45)',
            padding: { left: 10, right: 10, top: 4, bottom: 4 }
        }).setOrigin(0.5);
        const progress = this.add.text(LAYOUT.top.progressX, LAYOUT.top.progressY, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#f8f3ff',
            backgroundColor: 'rgba(18, 12, 34, 0.5)',
            padding: { left: 8, right: 8, top: 3, bottom: 3 }
        }).setOrigin(1, 0);
        const hp = this.add.text(LAYOUT.top.hpX, LAYOUT.top.hpY, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '17px',
            color: '#c9ffef',
            backgroundColor: 'rgba(18, 12, 34, 0.45)',
            padding: { left: 8, right: 8, top: 3, bottom: 3 }
        }).setOrigin(1, 0);

        this.caseTitleText = this.add.text(LAYOUT.caseCard.x + 18, LAYOUT.caseCard.y + 18, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '22px',
            color: '#3d235f',
            wordWrap: { width: 274 }
        });
        this.caseDescriptionText = this.add.text(LAYOUT.caseCard.x + 18, LAYOUT.caseCard.y + 66, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '17px',
            color: '#2c2c2c',
            wordWrap: { width: 274 },
            lineSpacing: 8
        });
        this.caseNoteText = this.add.text(LAYOUT.caseCard.x + 18, LAYOUT.caseCard.y + 196, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#4f5d4f',
            wordWrap: { width: 274 },
            lineSpacing: 6
        });
        this.caseMetaText = this.add.text(LAYOUT.caseCard.x + 18, LAYOUT.caseCard.y + 308, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '14px',
            color: '#7a5b1f',
            wordWrap: { width: 274 }
        });

        this.attachmentNoticeBg = this.add.rectangle(
            LAYOUT.attachmentPanel.x,
            LAYOUT.attachmentPanel.y,
            LAYOUT.attachmentPanel.width,
            LAYOUT.attachmentPanel.height,
            0x111111,
            0.58
        ).setOrigin(0, 0);

        this.attachmentBody = this.add.text(LAYOUT.attachmentPanel.x + 18, LAYOUT.attachmentPanel.y + 20, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#f8f3ff',
            wordWrap: { width: LAYOUT.attachmentPanel.width - 36 },
            lineSpacing: 8
        });

        this.feedbackText = this.add.text(LAYOUT.feedbackPanel.x + 18, LAYOUT.feedbackPanel.y + 12, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#111111',
            wordWrap: { width: LAYOUT.feedbackPanel.width - 36 },
            lineSpacing: 6
        });

        this.nextButton = this.createSimpleButton(LAYOUT.nextButton.x, LAYOUT.nextButton.y, LAYOUT.nextButton.width, LAYOUT.nextButton.height, '다음 변경사항', () => this.goToNextCase());
        this.resetButton = this.createSimpleButton(LAYOUT.resetButton.x, LAYOUT.resetButton.y, LAYOUT.resetButton.width, LAYOUT.resetButton.height, '다시 보기', () => this.resetCurrentSelection());
        this.nextButton.setEnabled(false);

        this.warningPulseText = this.add.text(LAYOUT.top.warningX, LAYOUT.top.warningY, '11월 30일 지나면 협약변경 안됩니다!', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#fff0b6'
        }).setOrigin(0.5).setVisible(false);
        this.packageOverlay.add([
            backdrop,
            warning,
            progress,
            hp,
            this.caseTitleText,
            this.caseDescriptionText,
            this.caseNoteText,
            this.caseMetaText,
            this.attachmentNoticeBg,
            this.attachmentBody,
            this.feedbackText,
            this.nextButton.container,
            this.resetButton.container,
            this.warningPulseText
        ].filter(Boolean));

        this.headerWarningText = warning;
        this.headerProgressText = progress;
        this.headerHpText = hp;
        this.renderHeader();
        this.raiseOverlayMessages();
    }

    createSimpleButton(x, y, width, height, label, onClick) {
        const container = this.add.container(0, 0);
        const text = this.add.text(x, y, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#f8f3ff'
        }).setOrigin(0.5);
        const hit = this.add.rectangle(x, y, width, height, 0x000000, 0).setInteractive({ useHandCursor: true });
        let enabled = true;
        hit.on('pointerover', () => {
            if (!enabled) {
                return;
            }
            text.setColor('#fff5c7');
            text.setScale(1.03);
        });
        hit.on('pointerout', () => {
            text.setColor('#f8f3ff');
            text.setScale(1);
        });
        hit.on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            if (!enabled) {
                return;
            }
            onClick?.();
        });
        container.add([text, hit]);
        return {
            container,
            text,
            hit,
            setEnabled: (value) => {
                enabled = Boolean(value);
                container.setAlpha(enabled ? 1 : 0.55);
                hit.input.enabled = enabled;
                if (!enabled) {
                    text.setColor('#b9b9b9');
                    text.setScale(1);
                }
            }
        };
    }

    renderHeader() {
        const total = chapter5Data.changeCases.length;
        this.headerWarningText?.setText(this.villainEventTriggered ? '11월 30일 지나면 협약변경 안됩니다!' : chapter5Data.warningText);
        this.headerProgressText?.setText(`변경사항 ${Math.min(this.currentCaseIndex + 1, total)} / ${total}`);
        this.headerHpText?.setText(`HP: ${GameState.get('hp') ?? this.hp}`);
        this.warningPulseText?.setVisible(false);
    }

    showCase(index) {
        const nextIndex = Phaser.Math.Clamp(index, 0, chapter5Data.changeCases.length - 1);
        this.currentCaseIndex = nextIndex;
        GameState.set('currentCaseIndex', this.currentCaseIndex);
        this.selectedChangeType = null;
        this.shownAttachmentList = [];
        this.feedbackMessage = '';
        this.isAnswerLocked = false;
        GameState.set('selectedChangeType', null);
        GameState.set('shownAttachmentList', []);
        GameState.set('feedbackMessage', '');
        GameState.set('isAnswerLocked', false);
        this.renderCaseCard();
        this.renderTypeButtons();
        this.renderAttachmentPanel();
        this.renderFeedback('');
        this.renderHeader();
        this.nextButton?.setEnabled(false);
    }

    renderCaseCard() {
        const currentCase = this.getCurrentCase();
        if (!currentCase) {
            return;
        }

        this.caseTitleText?.setText(currentCase.title);
        this.caseDescriptionText?.setText(currentCase.description);
        this.caseNoteText?.setText(currentCase.note || '');
        this.caseMetaText?.setText('');
    }

    renderTypeButtons() {
        this.typeButtons.forEach((button) => {
            if (button?.trapTween) {
                button.trapTween.stop();
                button.trapTween = null;
            }
            button?.container?.destroy?.(true);
        });
        this.typeButtons = [];

        TYPE_ORDER.forEach((type, index) => {
            const meta = changeTypeMeta[type];
            const x = LAYOUT.typePanel.x + 138;
            const y = LAYOUT.typePanel.y + 47 + index * 81;
            const button = this.createTypeButton(x, y, type, meta.label, meta.subLabel);
            this.typeButtons.push(button);
            this.packageOverlay.add(button.container);
        });
        this.raiseOverlayMessages();
    }

    createTypeButton(x, y, type, label, subLabel) {
        const width = 245;
        const height = 62;
        const container = this.add.container(0, 0);
        const isSelected = this.selectedChangeType === type;
        const background = this.add.rectangle(x, y, width, height, 0x000000, isSelected ? 0.5 : 0.28);
        background.setStrokeStyle(2, isSelected ? 0xffd36e : 0x000000, isSelected ? 0.65 : 0.18);
        const text = this.add.text(x, y - 10, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#f8f3ff'
        }).setOrigin(0.5);
        const sub = this.add.text(x, y + 12, subLabel, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '11px',
            color: isSelected ? '#fff5c7' : '#c9ffef'
        }).setOrigin(0.5);
        const hit = this.add.rectangle(x, y, width, height, 0x000000, 0).setInteractive({ useHandCursor: true });

        hit.on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            background.setFillStyle(0x000000, 0.72);
            background.setStrokeStyle(2, 0xfff5c7, 0.95);
            this.tweens.add({
                targets: [background, text, sub],
                scaleX: { from: 1, to: 1.04 },
                scaleY: { from: 1, to: 1.04 },
                duration: 120,
                yoyo: true,
                ease: 'Sine.easeOut'
            });
            this.selectChangeType(type);
        });

        hit.on('pointerover', () => {
            if (this.selectedChangeType === type) {
                background.setFillStyle(0x000000, 0.62);
                background.setStrokeStyle(2, 0xffe7a8, 0.95);
                text.setColor('#fff6cf');
                sub.setColor('#fff0b6');
                return;
            }
            background.setFillStyle(0x000000, 0.46);
            background.setStrokeStyle(2, 0xc9ffef, 0.55);
            text.setColor('#fff5c7');
            sub.setColor('#ffd36e');
            text.setScale(1.02);
            sub.setScale(1.02);
        });

        hit.on('pointerout', () => {
            const selected = this.selectedChangeType === type;
            background.setFillStyle(0x000000, selected ? 0.5 : 0.28);
            background.setStrokeStyle(2, selected ? 0xffd36e : 0x000000, selected ? 0.65 : 0.18);
            text.setColor('#f8f3ff');
            sub.setColor(selected ? '#fff5c7' : '#c9ffef');
            text.setScale(1);
            sub.setScale(1);
        });

        container.add([background, text, sub, hit]);

        const button = { container, background, text, sub, hit, type, trapTween: null };
        const currentCase = this.getCurrentCase();
        const glowType = this.getGlowType(currentCase);
        if (glowType === type) {
            button.trapTween = this.tweens.add({
                targets: [button.background, button.text, button.sub],
                alpha: { from: 0.45, to: 1 },
                scaleX: { from: 1, to: 1.08 },
                scaleY: { from: 1, to: 1.08 },
                duration: 360,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        return button;
    }

    getGlowType(currentCase) {
        if (!this.villainEventTriggered || !currentCase) {
            return null;
        }

        const correctSlot = ((this.currentCaseIndex + this.processedCount) % 4) === 0;
        if (correctSlot) {
            return currentCase.correctType;
        }

        const wrongTypes = TYPE_ORDER.filter((type) => type !== currentCase.correctType);
        if (!wrongTypes.length) {
            return null;
        }

        const offset = (this.currentCaseIndex + this.processedCount) % wrongTypes.length;
        return wrongTypes[offset];
    }

    renderAttachmentPanel() {
        this.attachmentNodes.forEach((node) => node?.destroy?.(true));
        this.attachmentNodes = [];

        const currentCase = this.getCurrentCase();
        if (!currentCase) {
            return;
        }

        if (!this.shownAttachmentList.length) {
            this.attachmentNoticeBg?.setVisible(true);
            this.attachmentBody?.setColor('#f8f3ff');
            this.attachmentBody?.setText('유형을 선택하면 필요한 첨부서류가 표시됩니다.');
            return;
        }

        this.attachmentNoticeBg?.setVisible(false);
        this.attachmentBody?.setColor('#000000');
        this.attachmentBody?.setText('');
        const startX = LAYOUT.attachmentPanel.x + 18;
        const startY = LAYOUT.attachmentPanel.y + 20;
        const rowHeight = 47;

        this.shownAttachmentList.forEach((label, index) => {
            const row = this.add.container(0, 0);
            const y = startY - 3 + index * (rowHeight + 4);
            const text = this.add.text(startX + 34, y + 18, label, {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: '15px',
                color: '#31204f'
            }).setOrigin(0, 0.5).setWordWrapWidth(LAYOUT.attachmentPanel.width - 90, true);
            row.add([text]);
            row.setAlpha(0);
            this.packageOverlay.add(row);
            this.attachmentNodes.push(row);
            this.tweens.add({
                targets: row,
                alpha: 1,
                duration: 180 + index * 40,
                ease: 'Sine.easeOut'
            });
        });
    }

    selectChangeType(type) {
        if (this.isAnswerLocked) {
            return;
        }

        const currentCase = this.getCurrentCase();
        if (!currentCase) {
            return;
        }

        this.selectedChangeType = type;
        GameState.set('selectedChangeType', type);

        if (this.villainEventTriggered && currentCase.trapType === type) {
            this.handleTrapSelection(currentCase);
            this.renderTypeButtons();
            return;
        }

        if (type === currentCase.correctType) {
            this.handleCorrectSelection(currentCase);
        } else {
            this.handleWrongSelection(currentCase, type);
        }

        this.renderTypeButtons();
    }

    handleCorrectSelection(currentCase) {
        this.isAnswerLocked = true;
        GameState.set('isAnswerLocked', true);
        this.shownAttachmentList = [...currentCase.attachmentList];
        GameState.set('shownAttachmentList', [...this.shownAttachmentList]);
        this.renderAttachmentPanel();
        this.renderFeedback(currentCase.explanation, true);
        this.nextButton?.setEnabled(true);
        this.cameras.main.flash(120, 255, 238, 111, false);
    }

    handleWrongSelection(currentCase, type) {
        this.mistakeCount += 1;
        GameState.set('mistakeCount', this.mistakeCount);
        GameState.decreaseHp(10);
        this.shownAttachmentList = [];
        GameState.set('shownAttachmentList', []);
        this.renderAttachmentPanel();
        this.renderFeedback(this.buildWrongMessage(currentCase, type), true);
        this.renderHeader();
        this.cameras.main.shake(120, 0.0035);

        if ((GameState.get('hp') ?? 0) <= 0) {
            this.time.delayedCall(240, () => this.scene.start('GameOverScene'));
        }
    }

    handleTrapSelection(currentCase) {
        this.mistakeCount += 1;
        GameState.set('mistakeCount', this.mistakeCount);
        GameState.decreaseHp(10);
        this.shownAttachmentList = [];
        GameState.set('shownAttachmentList', []);
        this.renderAttachmentPanel();
        this.renderFeedback(currentCase.trapMessage, true);
        this.showVillainSpeech(`낚였습니다! ${currentCase.trapMessage}`);
        this.cameras.main.shake(180, 0.005);

        if ((GameState.get('hp') ?? 0) <= 0) {
            this.time.delayedCall(240, () => this.scene.start('GameOverScene'));
        }
    }

    buildWrongMessage(currentCase, type) {
        if (type === 'approval' && currentCase.correctType === 'notification') {
            return '이 변경은 통보사항입니다. 승인사항으로 고르면 안 됩니다.';
        }
        if (type === 'notification' && currentCase.correctType === 'approval') {
            return '이 변경은 승인사항입니다. 승인요청공문과 승인공문이 필요한지 다시 보세요.';
        }
        if (type === 'etc') {
            return currentCase.correctType === 'etc'
                ? '이 변경은 PIMS 정보수정으로 처리할 수 있습니다.'
                : '이 변경은 기타사항이 아닙니다. 승인사항 또는 통보사항인지 다시 확인하세요.';
        }
        return '변경사항을 다시 읽어보세요. 승인사항, 통보사항, 기타사항을 구분해야 합니다.';
    }

    triggerVillainEvent() {
        this.villainEventTriggered = true;
        GameState.set('villainEventTriggered', true);
        this.headerWarningText?.setText('11월 30일 지나면 협약변경 안됩니다!');
        this.warningPulseText?.setVisible(true);
        this.cameras.main.shake(220, 0.005);

        this.typeButtons.forEach((button) => {
            if (button?.trapTween) {
                button.trapTween.stop();
                button.trapTween = null;
            }
        });
        this.renderTypeButtons();

        this.warningPulseTween?.stop();
        this.warningPulseTween = this.tweens.add({
            targets: this.warningPulseText,
            alpha: { from: 0.2, to: 1 },
            duration: 500,
            yoyo: true,
            repeat: 3,
            ease: 'Sine.easeInOut'
        });
        this.raiseOverlayMessages();

        this.time.delayedCall(1800, () => {
            this.warningPulseText?.setVisible(false);
            this.headerWarningText?.setText('11월 30일 지나면 협약변경 안됩니다!');
        });
    }

    renderFeedback(message, isWarning = false) {
        this.feedbackMessage = message || '';
        GameState.set('feedbackMessage', this.feedbackMessage);
        if (!this.feedbackText) {
            return;
        }

        this.feedbackText.setText(this.feedbackMessage || '');
        this.feedbackText.setColor(isWarning ? '#000000' : '#111111');
    }

    resetCurrentSelection() {
        if (this.stage5Cleared) {
            return;
        }

        this.selectedChangeType = null;
        this.shownAttachmentList = [];
        this.feedbackMessage = '';
        this.isAnswerLocked = false;
        GameState.set('selectedChangeType', null);
        GameState.set('shownAttachmentList', []);
        GameState.set('feedbackMessage', '');
        GameState.set('isAnswerLocked', false);
        this.renderTypeButtons();
        this.renderAttachmentPanel();
        this.renderFeedback('');
        this.nextButton?.setEnabled(false);
        this.renderHeader();
    }

    goToNextCase() {
        if (!this.isAnswerLocked) {
            return;
        }

        this.processedCount += 1;
        GameState.set('processedCount', this.processedCount);
        this.renderHeader();

        if (!this.villainEventTriggered && this.processedCount >= 3) {
            this.triggerVillainEvent();
        }

        if (this.currentCaseIndex >= chapter5Data.changeCases.length - 1) {
            this.completeMiniGame();
            return;
        }

        this.currentCaseIndex += 1;
        this.showCase(this.currentCaseIndex);
    }

    completeMiniGame() {
        this.stage5QuizCompleted = true;
        this.stage5PimsReady = true;
        this.stage5PimsRegistered = false;
        this.isMiniGameActive = false;
        GameState.set('stage5QuizCompleted', true);
        GameState.set('stage5PimsReady', true);
        GameState.set('stage5PimsRegistered', false);
        GameState.set('isMiniGameActive', false);
        this.mode = 'field';
        this.packageOverlay?.destroy(true);
        this.packageOverlay = null;
        this.topHud?.container?.setVisible(true);
        this.bottomHud?.container?.setVisible(true);
        this.bottomHud?.setInteractionVisible(true);
        this.refreshStage5TerminalState();
        this.bottomHud?.setInteractionPrompt('SPACE : PIMS 변경정보 등록');
        this.renderFeedback('변경유형 판정 완료!\n이제 PIMS 단말기에서 변경정보를 등록하세요.', true);
        this.dialogue.say([
            { speaker: 'KCA 간사', text: '좋습니다. 이제 변경된 정보를 PIMS에 등록해야 합니다.' }
        ]);
    }

    registerStage5Pims() {
        if (this.isStage5PimsRegistered()) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: 'PIMS 변경정보 등록은 이미 완료되었습니다.' }]);
            return;
        }

        this.stage5PimsRegistered = true;
        this.stage5PimsReady = false;
        this.stage5Cleared = true;
        GameState.set('stage5PimsRegistered', true);
        GameState.set('stage5PimsReady', false);
        GameState.set('stage5Cleared', true);
        this.refreshStage5TerminalState();
        this.bottomHud?.setInteractionPrompt('PIMS 변경정보 등록 완료');
        this.renderFeedback('PIMS 변경정보 등록 완료!\n변경된 내용이 시스템에도 반영되었습니다.', true);
        this.dialogue.say([
            { speaker: 'KCA 간사', text: '변경유형과 첨부서류, PIMS 정보수정까지 확인했습니다. 이제 다음 단계로 이동합니다.' }
        ], () => {
            this.time.delayedCall(1000, () => this.goToStage6());
        });
    }

    refreshStage5TerminalState() {
        if (!this.pimsTerminalObject) {
            return;
        }

        const ready = Boolean(this.stage5PimsReady);
        const registered = this.isStage5PimsRegistered();
        const labelColor = registered ? '#c9ffef' : (ready ? '#fff5c7' : '#f8f3ff');
        const prompt = registered
            ? 'PIMS 변경정보 등록 완료'
            : (ready ? 'SPACE : PIMS 변경정보 등록' : '먼저 변경유형 판정이 필요합니다.');

        this.pimsTerminalObject.prompt = prompt;
        this.pimsTerminalObject.label?.setColor(labelColor);
        this.pimsTerminalObject.image?.setAlpha(registered ? 0.95 : (ready ? 1 : 0.82));
        if (this.pimsTerminalObject.image?.setTint) {
            if (registered) {
                this.pimsTerminalObject.image.setTint(0xc9ffef);
            } else if (ready) {
                this.pimsTerminalObject.image.setTint(0xfff5c7);
            } else {
                this.pimsTerminalObject.image.clearTint?.();
            }
        }

        if (ready && !registered) {
            if (!this.pimsReadyTween && this.pimsTerminalObject.image) {
                this.pimsReadyTween = this.tweens.add({
                    targets: this.pimsTerminalObject.image,
                    alpha: { from: 0.82, to: 1 },
                    scaleX: { from: 1, to: 1.04 },
                    scaleY: { from: 1, to: 1.04 },
                    duration: 420,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
            this.pimsTerminalObject.mark?.setVisible?.(true);
            return;
        }

        this.pimsReadyTween?.stop?.();
        this.pimsReadyTween = null;
        this.pimsTerminalObject.mark?.setVisible?.(false);
    }

    goToStage6() {
        GameState.set('currentChapter', 6);
        GameState.set('stage5QuizCompleted', true);
        GameState.set('stage5PimsReady', false);
        GameState.set('stage5PimsRegistered', true);
        this.scene.start('Stage6Scene');
    }

    isStage5PimsRegistered() {
        return Boolean(this.stage5PimsRegistered && this.stage5Cleared);
    }

    showVillainSpeech(text) {
        this.renderFeedback(text, true);
    }

    toggleDevFreeze() {
        if (!import.meta.env.DEV) {
            return;
        }

        const nextLocked = !this.isDevFreezeLocked();
        try {
            window.sessionStorage.setItem(DEV_STAGE5_LOCK_KEY, nextLocked ? '1' : '0');
        } catch {
            // Ignore storage failures in dev.
        }

        if (nextLocked) {
            this.saveDevFreezeView();
            this.devFreezeIndicator?.destroy?.();
            this.devFreezeIndicator = this.add.text(GAME_WIDTH - 24, 24, 'LOCK ON', {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: '16px',
                color: '#fff5c7',
                backgroundColor: 'rgba(7, 10, 20, 0.82)',
                padding: { left: 10, right: 10, top: 6, bottom: 6 }
            })
                .setOrigin(1, 0)
                .setScrollFactor(0)
                .setDepth(2000);
            this.scene.pause();
            return;
        }

        this.clearDevFreezeView();
        this.devFreezeIndicator?.destroy?.();
        this.devFreezeIndicator = null;
        if (this.scene.isPaused()) {
            this.scene.resume();
        }
    }

    raiseOverlayMessages() {
        if (!this.packageOverlay) {
            return;
        }

        if (typeof this.packageOverlay.bringToTop === 'function') {
            if (this.warningPulseText) {
                this.packageOverlay.bringToTop(this.warningPulseText);
            }
        }
    }

    getCurrentCase() {
        return chapter5Data.changeCases[this.currentCaseIndex] || null;
    }

    refreshHud() {
        this.topHud?.refresh?.();
        this.bottomHud?.refresh?.();
    }

    tryInteract() {
        if (!this.dialogue.isActive && this.mode === 'field' && !this.stage5Cleared) {
            this.interaction.interact();
        }
    }

    cleanup() {
        this.spaceKey?.off('down', this.onSpaceDown);
        this.enterKey?.off('down', this.onEnterDown);
        this.input.off('pointerdown', this.onPointerDown);
        this.typeButtons.forEach((button) => {
            if (button?.trapTween) {
                button.trapTween.stop();
            }
        });
        this.warningPulseTween?.stop();
        this.pimsReadyTween?.stop();
        this.devFreezeIndicator?.destroy?.();
        this.devFreezeIndicator = null;
        this.pimsReadyTween = null;
        this.pimsTerminalObject = null;
        this.packageOverlay?.destroy(true);
        this.packageOverlay = null;
        this.topHud?.destroy?.();
        this.bottomHud?.destroy?.();
    }
}
