import * as Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { InteractionManager } from '../systems/InteractionManager.js';
import { Player } from '../objects/Player.js';
import { InteractableObject } from '../objects/InteractableObject.js';
import { BottomHUD } from '../objects/BottomHUD.js';
import { TopHUD } from '../objects/TopHUD.js';
import { ASSETS, hasTexture, playBgmWithFade } from '../systems/AssetManager.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

const STARTING_D_DAY = 28;
const D_DAY_TICK_MS = 10000;
const WALK_BOUNDS = { minX: 54, maxX: 1226, minY: 430, maxY: 510 };

const WORLD_LAYOUT = {
    player: { x: 403, y: 486 },
    evidence: { x: 165, y: 368, width: 118, height: 322 },
    assistant: { x: 600, y: 458, width: 100, height: 136 },
    reviewDesk: { x: 780, y: 431, width: 188, height: 196 },
    terminal: { x: 1150, y: 422, width: 120, height: 214 }
};

export class Stage7Scene extends Phaser.Scene {
    constructor() {
        super('Stage7Scene');
        this.mode = 'field';
        this.player = null;
        this.dialogue = null;
        this.interaction = null;
        this.interactables = [];
        this.clickTarget = null;
        this.timerEvent = null;
        this.deadlineText = null;
        this.timerText = null;
        this.deadlinePulse = null;
        this.transitionLocked = false;
        this.stage8TransitionRequested = false;
        this.onStage7CompletionDialogueClosed = null;
        this.reviewInProgress = false;
        this.hasBackground = false;
    }

    create() {
        this.initializeState();
        this.cameras.main.setBackgroundColor(0x090714);
        playBgmWithFade(this, ASSETS.audio.bgmMain.key, { loop: true, volume: 0.34 }, 900);
        this.drawBackground();
        this.createHud();
        this.createWorld();
        this.createDeadlineUi();
        this.createInput();
        this.startDeadlineTimer();

        this.time.delayedCall(250, () => {
            this.dialogue.say([
                { speaker: 'KCA 간사', text: '이곳은 보고서 마감실입니다.' },
                { speaker: 'KCA 간사', text: '최종보고서와 정산보고서는 2월 28일까지 제출해야 합니다.' },
                { speaker: 'KCA 간사', text: '성과증빙을 챙겨 최종보고서를 완성하고, 회계사 검토를 거쳐 정산보고서를 준비하세요.' },
                { speaker: 'KCA 간사', text: '시간 안에 PIMS 등록까지 완료해야 합니다.' }
            ]);
        });

        this.events.once('shutdown', () => this.cleanup());
    }

    initializeState() {
        GameState.set('currentChapter', 7);
        GameState.set('timeRunning', true);
        GameState.set('stage6GemCollected', true);
        GameState.set('stage7EvidenceCollected', false);
        GameState.set('stage7FinalReportCreated', false);
        GameState.set('stage7AccountingRequested', false);
        GameState.set('stage7SettlementReportReceived', false);
        GameState.set('stage7PimsSubmitted', false);
        GameState.set('stage7DeadlineTimerActive', true);
        GameState.set('stage7TimeRemaining', STARTING_D_DAY);
        GameState.set('stage7Failed', false);
        GameState.set('gameOverReason', null);
        GameState.set('gameOverRestartScene', null);
    }

    drawBackground() {
        const key = ASSETS.backgrounds.reportDeadlineRoom.key;
        this.hasBackground = hasTexture(this, key);
        if (this.hasBackground) {
            this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setDepth(0);
            return;
        }

        const g = this.add.graphics().setDepth(0);
        g.fillStyle(0x10112b, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        g.fillStyle(0x211a42, 1).fillRect(0, 108, GAME_WIDTH, 370);
        g.fillStyle(0x352b51, 1).fillRect(0, 478, GAME_WIDTH, 80);
        g.fillStyle(0x171329, 1).fillRect(0, 558, GAME_WIDTH, GAME_HEIGHT - 558);
        g.lineStyle(2, 0x8b60e8, 0.22);
        for (let x = 0; x < GAME_WIDTH; x += 128) {
            g.lineBetween(x, 478, x + 70, 558);
        }
        g.fillStyle(0xffd36e, 0.14).fillRoundedRect(928, 126, 280, 94, 12);
    }

    createHud() {
        this.topHud = new TopHUD(this);
        this.bottomHud = new BottomHUD(this);
        this.dialogue = new DialogueManager(this, { layout: this.bottomHud.getDialogLayout() });
    }

    createWorld() {
        this.player = new Player(this, WORLD_LAYOUT.player.x, WORLD_LAYOUT.player.y);
        this.player.speed = 260;

        this.evidenceObject = this.createInteractable('stage7EvidenceCabinet', '성과증빙 보관함', 'SPACE : 성과증빙 확인', WORLD_LAYOUT.evidence, {
            textureKey: ASSETS.objects.cabinet.key,
            color: 0x6650a4,
            hideVisuals: true,
            labelOnly: true
        });
        this.assistantObject = this.createInteractable('assistant', 'KCA 간사', 'SPACE : 진행 안내', WORLD_LAYOUT.assistant, {
            textureKey: ASSETS.characters.kcaAssistantIdle.key,
            color: 0xff4f86
        });
        this.reviewDeskObject = this.createInteractable('stage7ReviewDesk', '회계사 검토 데스크', 'SPACE : 정산보고서 검토 의뢰', WORLD_LAYOUT.reviewDesk, {
            color: 0x5c6cc8,
            hideVisuals: true,
            labelOnly: true
        });
        this.terminalObject = this.createInteractable('terminal', 'PIMS 단말기', 'SPACE : 보고서 제출', WORLD_LAYOUT.terminal, {
            textureKey: ASSETS.objects.pimsTerminal.key,
            hideBorder: true,
            hideVisuals: true,
            labelOnly: true
        });

        this.interactables = [
            this.evidenceObject,
            this.assistantObject,
            this.reviewDeskObject,
            this.terminalObject
        ];
        this.interaction = new InteractionManager(this, this.player, this.interactables, (prompt) => {
            this.bottomHud.setInteractionPrompt(prompt);
        });
    }

    createInteractable(id, name, prompt, layout, options = {}) {
        return new InteractableObject(this, {
            id,
            name,
            prompt,
            ...layout,
            color: options.color ?? 0x8b60e8,
            textureKey: options.textureKey,
            hideBorder: Boolean(options.hideBorder),
            hideVisuals: Boolean(options.hideVisuals),
            labelOnly: Boolean(options.labelOnly),
            animated: false
        }, () => this.handleInteraction(id));
    }

    createDeadlineUi() {
        const panel = this.add.rectangle(960, 254, 200, 92, 0x100d24, 0).setDepth(930);
        this.deadlineText = this.add.text(960, 231, '제출기한: 2월 28일', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#fff5c7'
        }).setOrigin(0.5).setDepth(931);
        this.timerText = this.add.text(960, 275, '마감 D-28', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '22px',
            color: '#c9ffef'
        }).setOrigin(0.5).setDepth(931);
        this.deadlinePanel = panel;
    }

    createInput() {
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
            if (this.dialogue.isActive || this.transitionLocked || this.mode !== 'field') {
                return;
            }
            this.clickTarget = this.clampToWalkable(pointer.x, pointer.y);
        };
        this.spaceKey.on('down', this.onSpaceDown);
        this.enterKey.on('down', this.onEnterDown);
        this.input.on('pointerdown', this.onPointerDown);
    }

    startDeadlineTimer() {
        this.timerEvent?.remove(false);
        this.timerEvent = this.time.addEvent({
            delay: D_DAY_TICK_MS,
            loop: true,
            callback: () => {
                if (!GameState.get('stage7DeadlineTimerActive') || GameState.get('stage7PimsSubmitted')) {
                    return;
                }
                const next = Math.max(0, (GameState.get('stage7TimeRemaining') ?? STARTING_D_DAY) - 1);
                GameState.set('stage7TimeRemaining', next);
                this.refreshDeadlineUi();
                if (next <= 5) {
                    this.pulseDeadlineWarning();
                }
                if (next <= 0) {
                    this.failDeadline();
                }
            }
        });
    }

    update() {
        const blocked = this.dialogue.isActive || this.transitionLocked || this.mode !== 'field';
        this.interactables.forEach((item) => item.update?.());
        this.interaction.update(blocked);
        this.topHud.refresh();
        this.bottomHud.refresh();
        this.refreshPrompts();

        if (blocked) {
            this.player.setMovement(0, 0);
            return;
        }

        const axis = this.getKeyboardAxis();
        if (axis.x || axis.y) {
            this.clickTarget = null;
            const length = Math.hypot(axis.x, axis.y) || 1;
            this.player.setMovement(axis.x / length * this.player.speed, axis.y / length * this.player.speed);
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

    clampToWalkable(x, y) {
        return {
            x: Phaser.Math.Clamp(x, WALK_BOUNDS.minX, WALK_BOUNDS.maxX),
            y: Phaser.Math.Clamp(y, WALK_BOUNDS.minY, WALK_BOUNDS.maxY)
        };
    }

    clampPlayerToWalkable() {
        const position = this.clampToWalkable(this.player.x, this.player.y);
        this.player.setPosition(position.x, position.y);
    }

    moveTowardClickTarget() {
        const dx = this.clickTarget.x - this.player.x;
        const dy = this.clickTarget.y - this.player.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 7) {
            this.clickTarget = null;
            this.player.setMovement(0, 0);
            return;
        }
        this.player.setMovement(dx / distance * this.player.speed, dy / distance * this.player.speed);
    }

    tryInteract() {
        if (!this.dialogue.isActive && !this.transitionLocked && this.mode === 'field') {
            this.interaction.interact();
        }
    }

    handleInteraction(id) {
        if (id === 'stage7EvidenceCabinet') {
            this.collectEvidence();
        } else if (id === 'assistant') {
            this.showAssistantHint();
        } else if (id === 'stage7ReviewDesk') {
            this.requestAccountingReview();
        } else if (id === 'terminal') {
            this.submitToPims();
        }
    }

    collectEvidence() {
        if (GameState.get('stage7EvidenceCollected')) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '이미 성과증빙을 확인했습니다.' }]);
            return;
        }
        GameState.set('stage7EvidenceCollected', true);
        GameState.set('stage7FinalReportCreated', true);
        this.playItemPop(WORLD_LAYOUT.evidence.x, WORLD_LAYOUT.evidence.y - 70, ASSETS.icons.performanceEvidence.key, 42);
        this.playReportAssembly();
        this.bottomHud.refresh();
        this.dialogue.say([
            { speaker: 'KCA 간사', text: '성과증빙을 획득했습니다.' },
            { speaker: 'KCA 간사', text: '인벤토리의 성과보석과 성과증빙이 합쳐져 최종보고서가 완성되었습니다.' },
            { speaker: 'KCA 간사', text: '최종보고서는 성과와 관련 증빙을 함께 갖춰 제출해야 합니다.' }
        ]);
    }

    requestAccountingReview() {
        if (this.reviewInProgress) {
            return;
        }
        if (GameState.get('stage7SettlementReportReceived')) {
            this.dialogue.say([{ speaker: '회계사', text: '정산보고서는 이미 준비되었습니다.' }]);
            return;
        }

        this.reviewInProgress = true;
        GameState.set('stage7AccountingRequested', true);
        this.dialogue.say([
            { speaker: '회계사', text: '정산보고서는 회계사 검토가 필요합니다.' },
            { speaker: '회계사', text: '집행내역과 증빙을 검토한 뒤 정산보고서를 준비하겠습니다.' }
        ], () => {
            this.playReviewEffect(() => {
                GameState.set('stage7SettlementReportReceived', true);
                this.reviewInProgress = false;
                this.bottomHud.refresh();
                this.dialogue.say([
                    { speaker: '회계사', text: '회계사 검토가 완료되었습니다.' },
                    { speaker: '회계사', text: '정산보고서를 획득했습니다.' }
                ]);
            });
        });
    }

    submitToPims() {
        if (GameState.get('stage7PimsSubmitted')) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '두 보고서는 이미 PIMS에 제출되었습니다.' }]);
            return;
        }
        if ((GameState.get('stage7TimeRemaining') ?? 0) <= 0) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '제출기한을 넘겼습니다.' }]);
            return;
        }

        const hasFinal = GameState.get('stage7FinalReportCreated');
        const hasSettlement = GameState.get('stage7SettlementReportReceived');
        if (!hasFinal && !hasSettlement) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '최종보고서와 정산보고서를 모두 준비해야 합니다.' }]);
            return;
        }
        if (!hasFinal) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '최종보고서를 먼저 완성해야 합니다.' }]);
            return;
        }
        if (!hasSettlement) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '정산보고서를 먼저 준비해야 합니다.' }]);
            return;
        }

        GameState.set('stage7PimsSubmitted', true);
        GameState.set('stage7DeadlineTimerActive', false);
        if (this.timerEvent) {
            this.timerEvent.paused = true;
        }
        this.transitionLocked = true;
        this.timerText.setText('제출 완료').setColor('#fff5c7');
        this.playSubmissionEffect();
        this.onStage7CompletionDialogueClosed = () => this.transitionToStage8();
        this.events.once('dialogbox:close', this.onStage7CompletionDialogueClosed);
        this.dialogue.say([
            { speaker: 'KCA 간사', text: '최종보고서와 정산보고서를 PIMS에 제출했습니다.' },
            { speaker: 'KCA 간사', text: '2월 28일 기한 내 제출 완료!' },
            { speaker: 'KCA 간사', text: '보고서 제출까지 끝났군요.' },
            { speaker: 'KCA 간사', text: '남은 건 정산금 반납뿐입니다. 반납하러 가시죠!' }
        ], () => this.transitionToStage8());
    }

    transitionToStage8() {
        if (this.stage8TransitionRequested) {
            return;
        }
        this.stage8TransitionRequested = true;
        GameState.set('currentChapter', 8);
        this.time.delayedCall(30, () => this.scene.start('Stage8Scene'));
    }

    showAssistantHint() {
        let text = '먼저 성과증빙을 확인하세요.';
        if (GameState.get('stage7PimsSubmitted')) {
            text = '최종보고서와 정산보고서 제출을 모두 완료했습니다.';
        } else if (GameState.get('stage7FinalReportCreated') && GameState.get('stage7SettlementReportReceived')) {
            text = '이제 PIMS 단말기에서 두 보고서를 제출하세요.';
        } else if (!GameState.get('stage7EvidenceCollected')) {
            text = '먼저 성과증빙을 확인하세요.';
        } else if (!GameState.get('stage7FinalReportCreated')) {
            text = '성과보석과 성과증빙을 모아 최종보고서를 완성해야 합니다.';
        } else if (!GameState.get('stage7SettlementReportReceived')) {
            text = '정산보고서는 회계사 검토가 필요합니다.';
        }
        this.dialogue.say([{ speaker: 'KCA 간사', text }]);
    }

    refreshPrompts() {
        this.evidenceObject.prompt = GameState.get('stage7EvidenceCollected') ? '성과증빙 확인 완료' : 'SPACE : 성과증빙 확인';
        this.reviewDeskObject.prompt = GameState.get('stage7SettlementReportReceived') ? '정산보고서 검토 완료' : 'SPACE : 정산보고서 검토 의뢰';
        this.terminalObject.prompt = GameState.get('stage7PimsSubmitted') ? 'PIMS 제출 완료' : 'SPACE : 보고서 제출';
    }

    refreshDeadlineUi() {
        const remaining = GameState.get('stage7TimeRemaining') ?? 0;
        this.timerText?.setText(`마감 D-${String(remaining).padStart(2, '0')}`);
        this.timerText?.setColor(remaining <= 5 ? '#ffd36e' : '#c9ffef');
    }

    pulseDeadlineWarning() {
        if (this.deadlinePulse?.isPlaying()) {
            return;
        }
        this.deadlinePulse = this.tweens.add({
            targets: [this.deadlineText, this.timerText],
            alpha: { from: 1, to: 0.4 },
            duration: 260,
            yoyo: true,
            repeat: 3
        });
        this.cameras.main.shake(100, 0.002);
    }

    failDeadline() {
        if (GameState.get('stage7PimsSubmitted') || this.transitionLocked) {
            return;
        }
        this.transitionLocked = true;
        GameState.set('stage7DeadlineTimerActive', false);
        GameState.set('stage7Failed', true);
        GameState.set('gameOverReason', '제출기한을 넘겼습니다.\n최종보고서와 정산보고서는 2월 28일까지 PIMS에 제출해야 합니다.');
        GameState.set('gameOverRestartScene', 'Stage7Scene');
        this.cameras.main.fadeOut(500, 25, 8, 32);
        this.time.delayedCall(520, () => this.scene.start('GameOverScene'));
    }

    playItemPop(x, y, textureKey, displaySize = 42) {
        const node = hasTexture(this, textureKey)
            ? this.add.image(x, y, textureKey).setDisplaySize(displaySize, displaySize).setDepth(20)
            : this.add.rectangle(x, y, 44, 54, 0xfff5c7, 1).setStrokeStyle(2, 0x8b60e8, 0.8).setDepth(20);
        this.tweens.add({
            targets: node,
            y: y - 55,
            alpha: { from: 1, to: 0 },
            scale: { from: 0.7, to: 1.15 },
            duration: 700,
            ease: 'Cubic.easeOut',
            onComplete: () => node.destroy()
        });
    }

    playReportAssembly() {
        const targetX = WORLD_LAYOUT.evidence.x + 90;
        const targetY = WORLD_LAYOUT.evidence.y - 78;
        const gem = hasTexture(this, ASSETS.effects.performanceGem.key)
            ? this.add.image(targetX - 58, targetY, ASSETS.effects.performanceGem.key).setDisplaySize(52, 52).setDepth(20)
            : this.add.circle(targetX - 58, targetY, 18, 0xffd36e, 1).setDepth(20);
        const evidence = hasTexture(this, ASSETS.icons.performanceEvidence.key)
            ? this.add.image(targetX + 58, targetY, ASSETS.icons.performanceEvidence.key).setDisplaySize(40, 40).setDepth(20)
            : this.add.rectangle(targetX + 58, targetY, 36, 44, 0xfff5c7, 1).setDepth(20);
        this.tweens.add({
            targets: [gem, evidence],
            x: targetX,
            alpha: 0,
            duration: 450,
            ease: 'Sine.easeIn',
            onComplete: () => {
                gem.destroy();
                evidence.destroy();
                this.cameras.main.flash(130, 255, 238, 160, false);
                this.playItemPop(targetX, targetY, ASSETS.icons.finalReport.key);
            }
        });
    }

    playReviewEffect(onComplete) {
        const stamp = this.add.text(WORLD_LAYOUT.reviewDesk.x, WORLD_LAYOUT.reviewDesk.y - 88, '검토 완료', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '22px',
            color: '#ffdf87',
            stroke: '#3d235f',
            strokeThickness: 5
        }).setOrigin(0.5).setScale(1.8).setAlpha(0).setDepth(25);
        this.tweens.add({
            targets: stamp,
            alpha: 1,
            scale: 1,
            duration: 420,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.cameras.main.shake(90, 0.0025);
                this.time.delayedCall(350, () => {
                    stamp.destroy();
                    this.playItemPop(WORLD_LAYOUT.reviewDesk.x, WORLD_LAYOUT.reviewDesk.y - 76, ASSETS.icons.settlementReport.key);
                    onComplete?.();
                });
            }
        });
    }

    playSubmissionEffect() {
        this.terminalObject.image?.setTint?.(0xc9ffef);
        this.cameras.main.flash(180, 117, 246, 255, false);
        [ASSETS.icons.finalReport.key, ASSETS.icons.settlementReport.key].forEach((key, index) => {
            const startX = 620 + index * 90;
            const icon = hasTexture(this, key)
                ? this.add.image(startX, 390, key).setDisplaySize(48, 48).setDepth(25)
                : this.add.rectangle(startX, 390, 38, 48, 0xfff5c7, 1).setDepth(25);
            this.tweens.add({
                targets: icon,
                x: WORLD_LAYOUT.terminal.x,
                y: WORLD_LAYOUT.terminal.y - 35,
                alpha: 0,
                duration: 650,
                delay: index * 100,
                ease: 'Cubic.easeIn',
                onComplete: () => icon.destroy()
            });
        });
    }

    cleanup() {
        if (this.onStage7CompletionDialogueClosed) {
            this.events.off('dialogbox:close', this.onStage7CompletionDialogueClosed);
        }
        this.timerEvent?.remove(false);
        this.deadlinePulse?.stop?.();
        this.spaceKey?.off('down', this.onSpaceDown);
        this.enterKey?.off('down', this.onEnterDown);
        this.input.off('pointerdown', this.onPointerDown);
        this.interactables.forEach((item) => item.destroy?.());
        this.interactables = [];
    }
}
