import * as Phaser from 'phaser';
import { chapter3Data } from '../data/chapter3Data.js';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { InteractionManager } from '../systems/InteractionManager.js';
import { Player } from '../objects/Player.js';
import { InteractableObject } from '../objects/InteractableObject.js';
import { BottomHUD } from '../objects/BottomHUD.js';
import { TopHUD } from '../objects/TopHUD.js';
import { ASSETS, playBgmWithFade } from '../systems/AssetManager.js';
import { CENTER_X, DIALOG_TOP, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

const REPORT_REQUIRED_IDS = ['performance', 'execution', 'official_letter'];

const CARD_COLORS = {
    required: 0xffd36e,
    optional: 0x75f6ff,
    selected: 0x1b2140,
    base: 0x101425,
    warning: 0xff8fb0
};

export class MiddleFerrisWheelScene extends Phaser.Scene {
    constructor() {
        super('MiddleFerrisWheelScene');
        this.mode = 'briefing';
        this.stageResolved = false;
        this.clickTarget = null;
        this.pendingWorkshopPrompt = false;
        this.workshopTarget = null;
        this.selectedCardIds = [];
        this.writingOverlay = null;
        this.workshopOverlay = null;
        this.endingOverlay = null;
        this.endingOverlayShade = null;
    }

    create() {
        GameState.set('currentChapter', 3);
        GameState.set('timeRunning', true);
        playBgmWithFade(this, ASSETS.audio.bgmMain.key, { loop: true, volume: 0.35 }, 900);
        GameState.set('stage3BriefingDone', false);
        GameState.set('stage3Phase', 'briefing');
        GameState.set('stage3TimerRemaining', chapter3Data.timerDays);
        GameState.set('stage3CollectedCount', 0);
        GameState.set('stage3ReportTarget', 3);
        GameState.set('stage3HasPerformance', false);
        GameState.set('stage3HasExecution', false);
        GameState.set('stage3HasOfficialLetter', false);
        GameState.set('stage3ReportCreated', false);
        GameState.set('stage3ReportComplete', false);
        GameState.set('stage3Submitted', false);
        GameState.set('stage3SubmitEnabled', false);
        GameState.set('stage3MissingItems', []);
        GameState.set('stage3SelectedCardIds', []);
        GameState.set('stage3RejectionCount', 0);
        GameState.set('stage3Cleared', false);
        GameState.set('stage3Failed', false);

        this.cameras.main.setBackgroundColor(0x090714);
        this.drawBackground();

        this.topHud = new TopHUD(this, { title: chapter3Data.title });
        this.bottomHud = new BottomHUD(this);
        this.dialogue = new DialogueManager(this, { layout: this.bottomHud.getDialogLayout() });

        this.player = new Player(this, chapter3Data.playerStart.x, chapter3Data.playerStart.y);
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);

        this.interactables = [
            new InteractableObject(this, {
                id: 'assistant',
                name: 'KCA 간사',
                prompt: chapter3Data.assistantHint,
                ...chapter3Data.assistant,
                color: 0xff4f86,
                animated: true
            }, () => this.handleInteraction('assistant')),
            new InteractableObject(this, {
                id: 'reportTent',
                name: '보고서 작성천막',
                prompt: chapter3Data.reportTentPrompt,
                ...chapter3Data.reportTent,
                color: 0x7ce0c7
            }, () => this.handleInteraction('reportTent')),
            new InteractableObject(this, {
                id: 'submitBin',
                name: 'PIMS 전송함',
                prompt: chapter3Data.submitPrompt,
                ...chapter3Data.submitBin,
                color: 0x8bd6ff
            }, () => this.handleInteraction('submitBin'))
        ];

        this.reportTentObject = this.interactables.find((item) => item.id === 'reportTent');
        this.submitObject = this.interactables.find((item) => item.id === 'submitBin');

        this.interaction = new InteractionManager(this, this.player, this.interactables, (prompt) => this.bottomHud.setInteractionPrompt(prompt));

        this.spaceKey.on('down', () => this.tryInteract());
        this.enterKey.on('down', () => {
            if (!this.dialogue.isActive) {
                this.tryInteract();
            }
        });

        this.input.on('pointerdown', (pointer) => {
            if (this.dialogue.isActive || this.mode !== 'field' || pointer.y > DIALOG_TOP) {
                return;
            }
            this.clickTarget = this.clampToWalkable(pointer.x, pointer.y);
        });

        this.timerLoop = this.time.addEvent({
            delay: chapter3Data.timerTickMs,
            loop: true,
            callback: () => this.tickDeadline()
        });

        this.time.delayedCall(240, () => this.playBriefing());

        this.refreshHud();
        this.updateDeadlineDisplay();
    }

    drawBackground() {
        const g = this.add.graphics().setDepth(0);
        g.fillStyle(0x050814, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        g.fillStyle(0x11183a, 1).fillRect(0, 0, GAME_WIDTH, 188);
        g.fillStyle(0x1a2248, 1).fillRect(0, 188, GAME_WIDTH, 250);
        g.fillStyle(0x0c1020, 1).fillRect(0, 438, GAME_WIDTH, GAME_HEIGHT - 438);

        const ferrisX = 428;
        const ferrisY = 294;
        g.lineStyle(8, 0x8ddcff, 0.22).strokeCircle(ferrisX, ferrisY, 110);
        g.lineStyle(4, 0xffd36e, 0.28);
        for (let i = 0; i < 8; i += 1) {
            const angle = (Math.PI * 2 * i) / 8 - Math.PI / 8;
            const x = ferrisX + Math.cos(angle) * 110;
            const y = ferrisY + Math.sin(angle) * 110;
            g.lineBetween(ferrisX, ferrisY, x, y);
            g.fillStyle(i % 2 === 0 ? 0xffd36e : 0x75f6ff, 0.9);
            g.fillCircle(x, y, 8);
        }
        g.lineStyle(8, 0xffd36e, 0.22);
        g.lineBetween(ferrisX - 42, ferrisY + 130, ferrisX - 16, ferrisY + 20);
        g.lineBetween(ferrisX + 42, ferrisY + 130, ferrisX + 16, ferrisY + 20);
        g.lineBetween(ferrisX - 56, ferrisY + 130, ferrisX + 56, ferrisY + 130);

        g.fillStyle(0x0d1022, 0.92).fillRoundedRect(950, 360, 188, 238, 8);
        g.lineStyle(2, 0x75f6ff, 0.16).strokeRoundedRect(950, 360, 188, 238, 8);
        g.fillStyle(0x12162f, 0.96).fillRoundedRect(998, 388, 92, 94, 6);
        g.fillStyle(0xffd36e, 0.12).fillRoundedRect(974, 468, 136, 62, 6);
        g.fillStyle(0x0a0f1f, 1).fillRect(0, 530, GAME_WIDTH, 190);
    }

    update() {
        const blocked = this.dialogue.isActive || this.stageResolved || this.mode !== 'field';
        this.interactables.forEach((item) => item.update?.());
        this.interaction.update(blocked);
        this.refreshHud();

        if (blocked) {
            this.player.setMovement(0, 0);
            return;
        }

        if (this.pendingWorkshopPrompt && this.workshopTarget) {
            const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.workshopTarget.x, this.workshopTarget.y);
            if (distance <= 10) {
                this.pendingWorkshopPrompt = false;
                this.workshopTarget = null;
                this.openWorkshopPrompt();
                this.player.setMovement(0, 0);
                return;
            }
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

    refreshHud() {
        this.topHud?.refresh?.();
        this.bottomHud?.refresh?.();
        this.updateDeadlineDisplay();
    }

    updateDeadlineDisplay() {
        if (!this.deadlineText || !this.deadlineText.active) {
            this.deadlineText = this.add.text(GAME_WIDTH - 74, 78, '', {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '18px',
                color: '#fff0c4',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(1, 0).setDepth(860);
        }

        const remaining = Math.max(0, Number(GameState.get('stage3TimerRemaining') ?? 0));
        try {
            this.deadlineText.setText(`D-${remaining}`);
            this.deadlineText.setVisible(!this.stageResolved);
        } catch (error) {
            console.warn('[MiddleFerrisWheelScene] deadline display update failed', error);
        }
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
        const area = chapter3Data.walkableArea;
        return {
            x: Phaser.Math.Clamp(x, area.x, area.x + area.width),
            y: Phaser.Math.Clamp(y, area.y, area.y + area.height)
        };
    }

    clampPlayerToWalkable() {
        const area = chapter3Data.walkableArea;
        this.player.x = Phaser.Math.Clamp(this.player.x, area.x, area.x + area.width);
        this.player.y = Phaser.Math.Clamp(this.player.y, area.y, area.y + area.height);
    }

    tryInteract() {
        if (!this.dialogue.isActive && this.mode === 'field') {
            this.interaction.interact();
        }
    }

    handleInteraction(id) {
        if (this.stageResolved) {
            return;
        }

        if (id === 'assistant') {
            this.openAssistantDialog();
            return;
        }

        if (id === 'reportTent') {
            this.startTentApproach();
            return;
        }

        if (id === 'submitBin') {
            this.submitReport();
        }
    }

    playBriefing() {
        if (GameState.get('stage3BriefingDone')) {
            return;
        }

        this.dialogue.say(chapter3Data.briefingLines, () => {
            GameState.set('stage3BriefingDone', true);
            GameState.set('stage3Phase', 'field');
            this.mode = 'field';
        });
    }

    openAssistantDialog() {
        if (!GameState.get('stage3BriefingDone')) {
            this.playBriefing();
            return;
        }

        this.dialogue.say(chapter3Data.assistantReminderLines);
    }

    startTentApproach() {
        if (this.mode !== 'field' || this.stageResolved) {
            return;
        }

        this.workshopTarget = {
            x: chapter3Data.reportTent.x - 24,
            y: chapter3Data.reportTent.y + 78
        };
        this.clickTarget = { ...this.workshopTarget };
        this.pendingWorkshopPrompt = true;
    }

    openWorkshopPrompt() {
        if (this.mode !== 'field' || this.stageResolved) {
            return;
        }

        this.mode = 'tent';
        this.bottomHud?.setInteractionVisible?.(false);
        this.showWorkshopPrompt();
    }

    showWorkshopPrompt() {
        this.workshopOverlay?.destroy(true);
        this.workshopOverlay = this.add.container(0, 0).setDepth(980);

        const dim = this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02030a, 0.58);
        const panel = this.add.image(CENTER_X, 374, 'ui_dialog_panel')
            .setDisplaySize(640, 220)
            .setAlpha(0.9);
        const title = this.add.text(CENTER_X, 302, '보고서 작성천막', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '32px',
            color: '#fff5c7',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        const body = this.add.text(CENTER_X, 352, '보고서 작성대 앞에 도착했습니다.\n[보고서 작성하기]를 눌러 필요한 자료를 골라주세요.', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '20px',
            color: '#f8f3ff',
            align: 'center',
            wordWrap: { width: 500 },
            lineSpacing: 6
        }).setOrigin(0.5);
        const writeBtn = this.createOverlayButton(CENTER_X - 90, 444, '보고서 작성하기', () => {
            this.clearWorkshopOverlay();
            this.openWritingScreen();
        });
        const closeBtn = this.createOverlayButton(CENTER_X + 90, 444, '닫기', () => {
            this.clearWorkshopOverlay();
            this.mode = 'field';
        });

        this.workshopOverlay.add([dim, panel, title, body, writeBtn.container, closeBtn.container]);
    }

    createOverlayButton(x, y, label, onClick) {
        const container = this.add.container(0, 0);
        let bg = null;
        let hoverBg = null;

        if (this.textures.exists('ui_button_normal')) {
            bg = this.add.image(x, y, 'ui_button_normal')
                .setDisplaySize(200, 50)
                .setVisible(true)
                .setDepth(981);
            if (this.textures.exists('ui_button_hover')) {
                hoverBg = this.add.image(x, y, 'ui_button_hover')
                    .setDisplaySize(200, 50)
                    .setVisible(false)
                    .setDepth(981);
            }
        } else {
            bg = this.add.rectangle(x, y, 200, 50, 0x24183f, 1)
                .setStrokeStyle(2, 0x75f6ff, 0.7)
                .setDepth(981);
        }

        const text = this.add.text(x, y, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(982);

        const hit = this.add.rectangle(x, y, 200, 50, 0x000000, 0).setDepth(983).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            onClick?.();
        });
        hit.on('pointerover', () => {
            if (hoverBg) {
                bg.setVisible(false);
                hoverBg.setVisible(true);
            } else if (bg.setAlpha) {
                bg.setAlpha(0.96);
            }
        });
        hit.on('pointerout', () => {
            if (hoverBg) {
                bg.setVisible(true);
                hoverBg.setVisible(false);
            } else if (bg.setAlpha) {
                bg.setAlpha(1);
            }
        });

        container.add([bg, hoverBg, text, hit].filter(Boolean));
        return { container, bg, hoverBg, text, hit };
    }

    openWritingScreen() {
        this.mode = 'writing';
        this.bottomHud?.setInteractionVisible?.(false);
        this.selectedCardIds = [...(GameState.get('stage3SelectedCardIds') || [])].slice(0, 3);
        this.updateSelectionState();
        this.renderWritingScreen();
    }

    getRequiredCount(ids = this.selectedCardIds) {
        return REPORT_REQUIRED_IDS.filter((id) => ids.includes(id)).length;
    }

    updateSelectionState() {
        const requiredCount = this.getRequiredCount();
        GameState.set('stage3CollectedCount', requiredCount);
        GameState.set('stage3SubmitEnabled', Boolean(GameState.get('stage3ReportCreated')));
        GameState.set('stage3MissingItems', this.getMissingLabels());
        this.bottomHud?.refresh?.();
    }

    getMissingLabels() {
        return chapter3Data.reportCards
            .filter((card) => card.required && !this.selectedCardIds.includes(card.id))
            .map((card) => card.label);
    }

    getCardById(cardId) {
        return chapter3Data.reportCards.find((card) => card.id === cardId) || null;
    }

    renderWritingScreen(message = '') {
        this.writingOverlay?.destroy(true);
        this.writingOverlay = this.add.container(0, 0).setDepth(990);

        const dim = this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02030a, 0.78);
        const title = this.add.text(CENTER_X, 68, chapter3Data.subtitle, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '38px',
            color: '#fff5c7',
            stroke: '#34145c',
            strokeThickness: 5
        }).setOrigin(0.5);
        const hint = this.add.text(CENTER_X, 122, '중간보고서 작성에 필요한 자료를 선택하세요.', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '20px',
            color: '#c9ffef'
        }).setOrigin(0.5);

        const slots = [];
        const slotStartX = 300;
        const slotY = 548;
        const slotWidth = 210;
        const slotHeight = 54;
        for (let i = 0; i < 3; i += 1) {
            const x = slotStartX + i * 236;
            const slot = this.add.rectangle(x, slotY, slotWidth, slotHeight, 0x101425, 0.9)
                .setStrokeStyle(2, 0x75f6ff, 0.5);
            const text = this.add.text(x, slotY, this.selectedCardIds[i] ? this.getCardById(this.selectedCardIds[i])?.label || '' : '비어 있음', {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: '16px',
                color: '#f8f3ff',
                align: 'center',
                wordWrap: { width: 184 }
            }).setOrigin(0.5);
            slots.push(slot, text);
        }

        const cards = [];
        const cardWidth = 220;
        const cardHeight = 74;
        const startX = 226;
        const startY = 178;
        const gapX = 18;
        const gapY = 16;

        chapter3Data.reportCards.forEach((card, index) => {
            const col = index % 3;
            const row = Math.floor(index / 3);
            const x = startX + col * (cardWidth + gapX);
            const y = startY + row * (cardHeight + gapY);
            const selected = this.selectedCardIds.includes(card.id);
            const box = this.add.rectangle(x, y, cardWidth, cardHeight, selected ? CARD_COLORS.selected : CARD_COLORS.base, 0.98)
                .setStrokeStyle(2, card.required ? CARD_COLORS.required : CARD_COLORS.optional, selected ? 0.9 : 0.45)
                .setInteractive({ useHandCursor: true });
            const label = this.add.text(x - cardWidth / 2 + 16, y - 18, card.label, {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: '16px',
                color: '#f8f3ff'
            });
            const desc = this.add.text(x - cardWidth / 2 + 16, y + 2, card.description, {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: '12px',
                color: '#c9ffef',
                wordWrap: { width: cardWidth - 32 },
                lineSpacing: 2
            });
            box.on('pointerdown', (_pointer, _localX, _localY, event) => {
                event?.stopPropagation?.();
                this.toggleCardSelection(card.id);
            });
            cards.push(box, label, desc);
        });

        const info = this.add.text(CENTER_X, 476, message || '필수 자료 3개를 모두 선택해야 보고서를 완성할 수 있습니다.', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: message ? '#ff8fb0' : '#fff5c7',
            align: 'center',
            wordWrap: { width: 900 }
        }).setOrigin(0.5);

        const createBtn = this.add.text(448, 620, '보고서 만들기', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#24183f',
            padding: { left: 20, right: 20, top: 10, bottom: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        createBtn.on('pointerdown', () => this.createReport());

        const resetBtn = this.add.text(640, 620, '다시 선택', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#24183f',
            padding: { left: 20, right: 20, top: 10, bottom: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        resetBtn.on('pointerdown', () => this.resetSelection());

        const closeBtn = this.add.text(832, 620, '닫기', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            backgroundColor: '#24183f',
            padding: { left: 20, right: 20, top: 10, bottom: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => {
            this.clearWritingOverlay();
            this.mode = 'field';
        });

        this.writingOverlay.add([dim, title, hint, ...cards, ...slots, info, createBtn, resetBtn, closeBtn]);
        this.writingInfoText = info;
    }

    clearWritingOverlay() {
        this.writingOverlay?.destroy(true);
        this.writingOverlay = null;
        this.bottomHud?.setInteractionVisible?.(true);
        this.bottomHud?.refresh?.();
    }

    clearWorkshopOverlay() {
        this.workshopOverlay?.destroy(true);
        this.workshopOverlay = null;
        this.bottomHud?.setInteractionVisible?.(true);
        this.bottomHud?.refresh?.();
    }

    toggleCardSelection(cardId) {
        const index = this.selectedCardIds.indexOf(cardId);
        if (index >= 0) {
            this.selectedCardIds.splice(index, 1);
        } else if (this.selectedCardIds.length < 3) {
            this.selectedCardIds.push(cardId);
        }

        this.selectedCardIds = this.selectedCardIds.slice(0, 3);
        GameState.set('stage3SelectedCardIds', [...this.selectedCardIds]);
        GameState.set('stage3CollectedCount', this.getRequiredCount());
        this.bottomHud?.refresh?.();
        this.renderWritingScreen();
    }

    resetSelection() {
        this.selectedCardIds = [];
        GameState.set('stage3SelectedCardIds', []);
        GameState.set('stage3CollectedCount', 0);
        GameState.set('stage3ReportCreated', false);
        GameState.set('stage3ReportComplete', false);
        GameState.set('stage3SubmitEnabled', false);
        GameState.set('stage3MissingItems', []);
        this.bottomHud?.refresh?.();
        this.renderWritingScreen('다시 선택하세요.');
    }

    createReport() {
        const requiredCount = this.getRequiredCount();
        const selectedCount = this.selectedCardIds.length;
        const complete = requiredCount === 3 && selectedCount === 3;

        if (requiredCount <= 1) {
            this.renderWritingScreen('대리님, 이건 보고서라고 보기 어렵습니다. 필요한 자료부터 다시 확인하세요.');
            return;
        }

        const missingItems = this.getMissingLabels();
        GameState.set('stage3HasPerformance', this.selectedCardIds.includes('performance'));
        GameState.set('stage3HasExecution', this.selectedCardIds.includes('execution'));
        GameState.set('stage3HasOfficialLetter', this.selectedCardIds.includes('official_letter'));
        GameState.set('stage3ReportCreated', true);
        GameState.set('stage3ReportComplete', complete);
        GameState.set('stage3SubmitEnabled', true);
        GameState.set('stage3MissingItems', missingItems);
        GameState.set('stage3CollectedCount', requiredCount);
        GameState.set('stage3SelectedCardIds', [...this.selectedCardIds]);
        GameState.set('stage3Phase', 'field');

        this.clearWritingOverlay();
        this.mode = 'field';
        this.bottomHud?.refresh?.();
        this.dialogue.say(complete ? chapter3Data.successLines : chapter3Data.incompleteLines);
    }

    submitReport() {
        if (!GameState.get('stage3ReportCreated')) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '먼저 보고서를 작성하세요.' }]);
            return;
        }

        if (!GameState.get('stage3ReportComplete')) {
            const missingLabels = GameState.get('stage3MissingItems') || this.getMissingLabels();
            GameState.set('stage3RejectionCount', (GameState.get('stage3RejectionCount') || 0) + 1);
            GameState.set('stage3SubmitEnabled', false);
            this.dialogue.say([
                { speaker: 'PIMS', text: `반려: ${missingLabels.join(', ')}이(가) 누락되었습니다.` },
                { speaker: 'KCA 간사', text: '필수자료가 부족합니다. 보고서 작성천막으로 돌아가 수정하세요.' }
            ], () => {
                this.openWritingScreen();
            });
            return;
        }

        this.completeStage3();
    }

    tickDeadline() {
        if (this.stageResolved || this.dialogue.isActive || !GameState.get('timeRunning')) {
            return;
        }

        const current = Math.max(0, Number(GameState.get('stage3TimerRemaining') ?? chapter3Data.timerDays));
        if (current <= 0) {
            this.failStage(chapter3Data.failMessage);
            return;
        }

        const next = current - 1;
        GameState.set('stage3TimerRemaining', next);
        GameState.advanceDays(1);
        this.refreshHud();

        if (next <= 0) {
            this.failStage(chapter3Data.failMessage);
        }
    }

    completeStage3() {
        if (this.stageResolved) {
            return;
        }

        this.stageResolved = true;
        GameState.set('stage3Cleared', true);
        GameState.set('stage3Failed', false);
        GameState.set('stage3Submitted', true);
        GameState.set('timeRunning', false);
        GameState.set('stage3Phase', 'complete');
        this.timerLoop?.remove(false);

        this.showEndingScreen({
            title: '3단계 완료',
            body: '중간보고서가 PIMS에 제출되었습니다.\n다음 업데이트를 기다려 주세요.',
            primaryLabel: '처음으로 돌아가기',
            primaryAction: () => {
                GameState.reset();
                this.scene.start('StartScene');
            },
            secondaryLabel: '다시 하기',
            secondaryAction: () => {
                GameState.reset();
                this.scene.start('MiddleFerrisWheelScene');
            }
        });
    }

    failStage(message) {
        if (this.stageResolved) {
            return;
        }

        this.stageResolved = true;
        GameState.set('stage3Cleared', false);
        GameState.set('stage3Failed', true);
        GameState.set('timeRunning', false);
        GameState.set('stage3Phase', 'failed');
        this.timerLoop?.remove(false);

        this.showEndingScreen({
            title: '시간 초과',
            body: message,
            primaryLabel: '다시 하기',
            primaryAction: () => {
                GameState.reset();
                this.scene.start('MiddleFerrisWheelScene');
            },
            secondaryLabel: '처음으로 돌아가기',
            secondaryAction: () => {
                GameState.reset();
                this.scene.start('StartScene');
            }
        });
    }

    showEndingScreen({ title, body, primaryLabel, primaryAction, secondaryLabel, secondaryAction }) {
        this.bottomHud?.setInteractionVisible?.(false);
        this.endingOverlay?.destroy(true);
        this.endingOverlayShade?.destroy(true);
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

        this.createEndingButton(440, 612, primaryLabel, primaryAction);
        this.createEndingButton(840, 612, secondaryLabel, secondaryAction);
    }

    createEndingButton(x, y, label, onClick) {
        let bg;
        let hoverBg = null;
        if (this.textures.exists('ui_button_normal')) {
            bg = this.add.image(x, y, 'ui_button_normal').setDisplaySize(260, 56).setDepth(110);
            if (this.textures.exists('ui_button_hover')) {
                hoverBg = this.add.image(x, y, 'ui_button_hover').setDisplaySize(260, 56).setVisible(false).setDepth(110);
            }
        } else {
            bg = this.add.rectangle(x, y, 260, 56, 0x24183f, 1).setStrokeStyle(2, 0x75f6ff, 0.72).setDepth(110);
        }

        const text = this.add.text(x, y, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(111);

        const hit = this.add.rectangle(x, y, 260, 56, 0x000000, 0).setDepth(110).setInteractive({ useHandCursor: true });
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
    }
}
