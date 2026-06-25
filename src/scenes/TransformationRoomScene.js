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

const LAYOUT = {
    top: {
        titleX: CENTER_X,
        titleY: 34,
        warningX: CENTER_X,
        warningY: 66,
        progressX: 1040,
        progressY: 34,
        hpX: 1160,
        hpY: 66
    },
    caseCard: { x: 50, y: 114, width: 360, height: 360 },
    typePanel: { x: 440, y: 114, width: 280, height: 360 },
    attachmentPanel: { x: 750, y: 114, width: 480, height: 360 },
    feedbackPanel: { x: 50, y: 520, width: 840, height: 90 },
    nextButton: { x: 960, y: 545, width: 180, height: 60 },
    resetButton: { x: 1150, y: 545, width: 140, height: 60 }
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
        this.trapTweens = [];
        this.currentCaseIndex = 0;
        this.selectedChangeType = null;
        this.shownAttachmentList = [];
        this.feedbackMessage = '';
        this.isAnswerLocked = false;
        this.isMiniGameActive = false;
        this.villainEventTriggered = false;
        this.stage5Cleared = false;
        this.hp = 100;
        this.mistakeCount = 0;
        this.processedCount = 0;
        this.caseTitleText = null;
        this.caseDescriptionText = null;
        this.caseNoteText = null;
        this.caseMetaText = null;
        this.typePanelTitle = null;
        this.attachmentTitleText = null;
        this.attachmentBody = null;
        this.feedbackText = null;
        this.headerTitleText = null;
        this.headerWarningText = null;
        this.headerProgressText = null;
        this.headerHpText = null;
        this.warningPulseText = null;
        this.nextButton = null;
        this.resetButton = null;
        this.onSpaceDown = null;
        this.onEnterDown = null;
        this.onPointerDown = null;
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

        this.time.delayedCall(220, () => this.playBriefing());
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
                color: 0x7a5cff,
                animated: false
            }, () => this.handleInteraction('changePackage'))
        ];

        this.interaction = new InteractionManager(
            this,
            this.player,
            this.interactables,
            (prompt) => this.bottomHud.setInteractionPrompt(prompt)
        );
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
            if (this.stage5Cleared) {
                this.dialogue.say([{ speaker: 'KCA 간사', text: '이미 변경유형 판정을 마쳤습니다.' }]);
                return;
            }
            this.openMiniGame();
        }
    }

    openMiniGame() {
        if (this.isMiniGameActive || this.stage5Cleared) {
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
        const title = this.add.text(LAYOUT.top.titleX, LAYOUT.top.titleY, '변경유형 판정', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '28px',
            color: '#fff5c7',
            stroke: '#34145c',
            strokeThickness: 4
        }).setOrigin(0.5);
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

        const caseCardBg = this.add.rectangle(LAYOUT.caseCard.x, LAYOUT.caseCard.y, LAYOUT.caseCard.width, LAYOUT.caseCard.height, 0x11172a, 0.94)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0xffd36e, 0.58);
        this.caseTitleText = this.add.text(LAYOUT.caseCard.x + 18, LAYOUT.caseCard.y + 18, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '22px',
            color: '#fff5c7'
        });
        this.caseDescriptionText = this.add.text(LAYOUT.caseCard.x + 18, LAYOUT.caseCard.y + 66, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '17px',
            color: '#f8f3ff',
            wordWrap: { width: 320 },
            lineSpacing: 8
        });
        this.caseNoteText = this.add.text(LAYOUT.caseCard.x + 18, LAYOUT.caseCard.y + 196, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#c9ffef',
            wordWrap: { width: 320 },
            lineSpacing: 6
        });
        this.caseMetaText = this.add.text(LAYOUT.caseCard.x + 18, LAYOUT.caseCard.y + 308, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '14px',
            color: '#ffd36e'
        });

        const typePanelBg = this.add.rectangle(LAYOUT.typePanel.x, LAYOUT.typePanel.y, LAYOUT.typePanel.width, LAYOUT.typePanel.height, 0x11172a, 0.94)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0x75f6ff, 0.58);
        this.typePanelTitle = this.add.text(LAYOUT.typePanel.x + 18, LAYOUT.typePanel.y + 18, '변경유형', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '22px',
            color: '#fff5c7'
        });

        const attachmentPanelBg = this.add.rectangle(LAYOUT.attachmentPanel.x, LAYOUT.attachmentPanel.y, LAYOUT.attachmentPanel.width, LAYOUT.attachmentPanel.height, 0x11172a, 0.94)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0x75f6ff, 0.58);
        this.attachmentTitleText = this.add.text(LAYOUT.attachmentPanel.x + 18, LAYOUT.attachmentPanel.y + 18, '첨부서류', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '22px',
            color: '#fff5c7'
        });
        this.attachmentBody = this.add.text(LAYOUT.attachmentPanel.x + 18, LAYOUT.attachmentPanel.y + 64, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#f8f3ff',
            wordWrap: { width: 430 },
            lineSpacing: 8
        });

        const feedbackBg = this.add.rectangle(LAYOUT.feedbackPanel.x, LAYOUT.feedbackPanel.y, LAYOUT.feedbackPanel.width, LAYOUT.feedbackPanel.height, 0x05050a, 0.28)
            .setOrigin(0, 0)
            .setStrokeStyle(0, 0x000000, 0);
        this.feedbackText = this.add.text(LAYOUT.feedbackPanel.x + 18, LAYOUT.feedbackPanel.y + 12, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#f8f3ff',
            wordWrap: { width: 810 },
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
            title,
            warning,
            progress,
            hp,
            caseCardBg,
            this.caseTitleText,
            this.caseDescriptionText,
            this.caseNoteText,
            this.caseMetaText,
            typePanelBg,
            this.typePanelTitle,
            attachmentPanelBg,
            this.attachmentTitleText,
            this.attachmentBody,
            feedbackBg,
            this.feedbackText,
            this.nextButton.container,
            this.resetButton.container,
            this.warningPulseText
        ].filter(Boolean));

        this.headerTitleText = title;
        this.headerWarningText = warning;
        this.headerProgressText = progress;
        this.headerHpText = hp;
        this.renderHeader();
        this.raiseOverlayMessages();
    }

    createSimpleButton(x, y, width, height, label, onClick) {
        const container = this.add.container(0, 0);
        const bg = this.add.rectangle(x, y, width, height, 0x24183f, 0.96)
            .setStrokeStyle(2, 0x75f6ff, 0.72)
            .setOrigin(0.5);
        const hover = this.add.rectangle(x, y, width, height, 0x3a2860, 0.96)
            .setStrokeStyle(2, 0xffd36e, 0.86)
            .setOrigin(0.5)
            .setVisible(false);
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
            bg.setVisible(false);
            hover.setVisible(true);
        });
        hit.on('pointerout', () => {
            bg.setVisible(true);
            hover.setVisible(false);
        });
        hit.on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            if (!enabled) {
                return;
            }
            onClick?.();
        });
        container.add([bg, hover, text, hit]);
        return {
            container,
            bg,
            hover,
            text,
            hit,
            setEnabled: (value) => {
                enabled = Boolean(value);
                container.setAlpha(enabled ? 1 : 0.55);
                hit.input.enabled = enabled;
                if (!enabled) {
                    bg.setVisible(true);
                    hover.setVisible(false);
                }
            }
        };
    }

    renderHeader() {
        const total = chapter5Data.changeCases.length;
        this.headerTitleText?.setText('변경유형 판정');
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
            const x = LAYOUT.typePanel.x + 140;
            const y = LAYOUT.typePanel.y + 82 + index * 86;
            const button = this.createTypeButton(x, y, type, meta.label, meta.subLabel);
            this.typeButtons.push(button);
            this.packageOverlay.add(button.container);
        });
        this.raiseOverlayMessages();
    }

    createTypeButton(x, y, type, label, subLabel) {
        const width = 224;
        const height = 66;
        const container = this.add.container(0, 0);
        const isSelected = this.selectedChangeType === type;
        const bg = this.add.rectangle(x, y, width, height, isSelected ? 0x322159 : 0x1a1f35, 0.96)
            .setOrigin(0.5)
            .setStrokeStyle(2, isSelected ? 0xffd36e : 0x75f6ff, isSelected ? 0.92 : 0.6);
        const glow = this.add.rectangle(x, y, width + 10, height + 10, 0xffd36e, 0.22)
            .setOrigin(0.5)
            .setVisible(false);
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
            this.selectChangeType(type);
        });

        container.add([glow, bg, text, sub, hit]);

        const button = { container, glow, bg, text, sub, hit, type, trapTween: null };
        const currentCase = this.getCurrentCase();
        if (this.villainEventTriggered && currentCase?.trapType === type) {
            button.glow.setVisible(true);
            button.trapTween = this.tweens.add({
                targets: button.glow,
                alpha: { from: 0.28, to: 1 },
                scaleX: { from: 1, to: 1.08 },
                scaleY: { from: 1, to: 1.08 },
                duration: 360,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            this.tweens.add({
                targets: [button.bg, button.text, button.sub],
                alpha: { from: 0.82, to: 1 },
                duration: 360,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        }

        return button;
    }

    renderAttachmentPanel() {
        this.attachmentNodes.forEach((node) => node?.destroy?.(true));
        this.attachmentNodes = [];

        const currentCase = this.getCurrentCase();
        if (!currentCase) {
            return;
        }

        if (!this.shownAttachmentList.length) {
            this.attachmentBody?.setText('유형을 선택하면 필요한 첨부서류가 표시됩니다.');
            return;
        }

        this.attachmentBody?.setText('');
        const startX = LAYOUT.attachmentPanel.x + 18;
        const startY = LAYOUT.attachmentPanel.y + 62;
        const rowHeight = 46;

        this.shownAttachmentList.forEach((label, index) => {
            const row = this.add.container(0, 0);
            const y = startY + index * (rowHeight + 8);
            const bg = this.add.rectangle(startX + 220, y + 18, 430, rowHeight, 0x161b2f, 0.92)
                .setOrigin(0.5)
                .setStrokeStyle(1, 0x75f6ff, 0.34);
            const icon = this.add.text(startX + 8, y + 18, '✓', {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: '18px',
                color: '#ffd36e'
            }).setOrigin(0, 0.5);
            const text = this.add.text(startX + 34, y + 18, label, {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: '15px',
                color: '#f8f3ff'
            }).setOrigin(0, 0.5);
            row.add([bg, icon, text]);
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
        this.feedbackText.setColor(isWarning ? '#fff0c4' : '#f8f3ff');
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
        this.stage5Cleared = true;
        this.isMiniGameActive = false;
        GameState.set('stage5Cleared', true);
        GameState.set('isMiniGameActive', false);
        this.mode = 'field';
        this.packageOverlay?.destroy(true);
        this.packageOverlay = null;
        this.topHud?.container?.setVisible(true);
        this.bottomHud?.container?.setVisible(true);
        this.bottomHud?.setInteractionVisible(true);
        this.bottomHud?.setInteractionPrompt('변경유형 판정 완료');
        this.renderFeedback('변경유형 판정 완료!\n승인사항, 통보사항, 기타사항을 구분하고 필요한 첨부서류와 PIMS 정보수정까지 확인했습니다.', true);
        this.dialogue.say([
            { speaker: 'KCA 간사', text: '좋습니다. 변경 유형, 첨부서류, PIMS 정보수정까지 확인했습니다.' },
            { speaker: 'KCA 간사', text: '이제 다음 단계로 넘어가시죠.' }
        ]);
    }

    showVillainSpeech(text) {
        this.renderFeedback(text, true);
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
        this.packageOverlay?.destroy(true);
        this.packageOverlay = null;
        this.topHud?.destroy?.();
        this.bottomHud?.destroy?.();
    }
}
