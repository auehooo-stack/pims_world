import * as Phaser from 'phaser';
import { chapter6Data } from '../data/chapter6Data.js';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { InteractionManager } from '../systems/InteractionManager.js';
import { Player } from '../objects/Player.js';
import { InteractableObject } from '../objects/InteractableObject.js';
import { BottomHUD } from '../objects/BottomHUD.js';
import { TopHUD } from '../objects/TopHUD.js';
import { ASSETS, hasTexture, playBgmWithFade } from '../systems/AssetManager.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

const DEV_START_STAGE6_QUIZ = false;

const QUIZ_LAYOUT = {
    titleX: GAME_WIDTH / 2,
    titleY: 34,
    leftCard: { x: 165, y: 222, width: 500, height: 290 },
    rightPanel: { x: 720, y: 161, width: 430, height: 453 },
    feedback: { x: 265, y: 630, width: 885, height: 75 },
    stoneStartX: 550,
    stoneY: 140,
    stoneGap: 36
};

const WORLD_LAYOUT = {
    playerStart: { x: 311, y: 486 },
    mailbox: { x: 130, y: 458, width: 83, height: 164 },
    assistant: { x: 401, y: 458, width: 100, height: 136 },
    altar: { x: 655, y: 408, width: 264, height: 214 },
    gem: { x: 655, y: 438, width: 64, height: 64 },
    terminal: { x: 1101, y: 458, width: 120, height: 154 }
};

const resetQuizState = () => ({
    selectedRoute: null,
    currentQuestionIndex: 0,
    correctCount: 0,
    feedbackMessage: '',
    isAnswerLocked: false
});

export class Stage6Scene extends Phaser.Scene {
    constructor() {
        super('Stage6Scene');
        this.mode = 'field';
        this.player = null;
        this.interaction = null;
        this.interactables = [];
        this.dialogue = null;
        this.topHud = null;
        this.bottomHud = null;
        this.mailPopup = null;
        this.quizOverlay = null;
        this.quizFeedbackText = null;
        this.quizProgressText = null;
        this.quizStaticNodes = [];
        this.quizDynamicNodes = [];
        this.quizChoiceButtons = [];
        this.quizRouteButtons = [];
        this.quizStoneNodes = [];
        this.quizStamp = null;
        this.devFreezeLocked = false;
        this.devFreezeIndicator = null;
        this.gemObject = null;
        this.gemTween = null;
        this.cursors = null;
        this.wasd = null;
        this.spaceKey = null;
        this.enterKey = null;
        this.onSpaceDown = null;
        this.onEnterDown = null;
        this.onPointerDown = null;
        this.clickTarget = null;
        this.mailBoxObject = null;
        this.assistantObject = null;
        this.altarObject = null;
        this.terminalObject = null;
        this.hasStage6Background = false;
        this.transitionRequested = false;
        this.routeState = resetQuizState();
        this.stage6MailChecked = false;
        this.stage6AltarUnlocked = false;
        this.stage6QuizStarted = false;
        this.stage6QuizCompleted = false;
        this.stage6GemSpawned = false;
        this.stage6GemCollected = false;
        this.stage6PimsRegistered = false;
        this.stage6SelectedRoute = null;
        this.stage6CurrentQuestionIndex = 0;
        this.stage6CorrectCount = 0;
        this.stage6FeedbackMessage = '';
        this.stage6IsAnswerLocked = false;
    }

    create() {
        GameState.set('currentChapter', 6);
        GameState.set('timeRunning', true);
        GameState.set('stage6MailChecked', false);
        GameState.set('stage6AltarUnlocked', false);
        GameState.set('stage6QuizStarted', false);
        GameState.set('stage6QuizCompleted', false);
        GameState.set('stage6GemSpawned', false);
        GameState.set('stage6GemCollected', false);
        GameState.set('stage6PimsRegistered', false);
        GameState.set('stage6SelectedRoute', null);
        GameState.set('stage6CurrentQuestionIndex', 0);
        GameState.set('stage6CorrectCount', 0);
        GameState.set('stage6FeedbackMessage', '');
        GameState.set('stage6IsAnswerLocked', false);

        this.cameras.main.setBackgroundColor(0x090714);
        playBgmWithFade(this, ASSETS.audio.bgmMain.key, { loop: true, volume: 0.34 }, 900);
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
            if (this.dialogue.isActive || this.mode !== 'field') {
                return;
            }
            this.clickTarget = this.clampToWalkable(pointer.x, pointer.y);
        };

        this.spaceKey.on('down', this.onSpaceDown);
        this.enterKey.on('down', this.onEnterDown);
        this.input.on('pointerdown', this.onPointerDown);
        this.events.once('shutdown', () => this.cleanup());

        if (import.meta.env.DEV && DEV_START_STAGE6_QUIZ) {
            this.stage6MailChecked = true;
            this.stage6AltarUnlocked = true;
            GameState.set('stage6MailChecked', true);
            GameState.set('stage6AltarUnlocked', true);
            this.time.delayedCall(0, () => this.openQuizOverlay());
        }
    }

    update() {
        if (this.transitionRequested) {
            this.transitionRequested = false;
            this.goToStage7();
            return;
        }

        const blocked = this.dialogue.isActive || this.mode !== 'field';
        this.interactables.forEach((item) => item.update?.());
        this.interaction.update(blocked);
        this.refreshHud();
        this.refreshWorldState();

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

    drawBackground() {
        const bgKey = ASSETS.backgrounds.performanceAltar.key;
        this.hasStage6Background = hasTexture(this, bgKey);
        if (this.hasStage6Background) {
            this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, bgKey)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setOrigin(0.5)
                .setDepth(0);
            return;
        }

        const g = this.add.graphics().setDepth(0);
        g.fillStyle(0x070816, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        g.fillStyle(0x101535, 1).fillRect(0, 0, GAME_WIDTH, 160);
        g.fillStyle(0x18224a, 1).fillRect(0, 160, GAME_WIDTH, 260);
        g.fillStyle(0x09101f, 1).fillRect(0, 420, GAME_WIDTH, 300);
        g.fillStyle(0x24194b, 0.9).fillRoundedRect(248, 238, 772, 186, 24);
        g.fillStyle(0x151127, 0.98).fillRoundedRect(278, 272, 712, 128, 20);
        g.fillStyle(0x2d2050, 0.95).fillRoundedRect(526, 286, 188, 106, 14);
        g.fillStyle(0x35244f, 0.9).fillRoundedRect(90, 390, 170, 146, 14);
        g.fillStyle(0x2f2146, 0.9).fillRoundedRect(1030, 360, 180, 192, 14);
        g.fillStyle(0x5e4a20, 0.6).fillRect(588, 360, 96, 120);
        g.fillStyle(0x3b2d16, 0.88).fillRoundedRect(560, 314, 150, 58, 12);
    }

    createHud() {
        this.topHud = new TopHUD(this, { title: chapter6Data.title });
        this.bottomHud = new BottomHUD(this);
        this.bottomHud.setInteractionPrompt(chapter6Data.mailPrompt);
        this.bottomHud.setInteractionVisible(true);
    }

    createWorld() {
        this.player = new Player(this, WORLD_LAYOUT.playerStart.x, WORLD_LAYOUT.playerStart.y);
        this.player.speed = 260;
        this.assistantObject = new InteractableObject(this, {
            id: 'assistant',
            name: 'KCA 간사',
            prompt: 'Space: KCA 간사와 대화',
            x: WORLD_LAYOUT.assistant.x,
            y: WORLD_LAYOUT.assistant.y,
            width: WORLD_LAYOUT.assistant.width,
            height: WORLD_LAYOUT.assistant.height,
            textureKey: ASSETS.characters.kcaAssistantIdle.key,
            color: 0xff4f86,
            animated: false
        }, () => this.handleInteraction('assistant'));
        this.mailBoxObject = new InteractableObject(this, {
            id: 'mailbox',
            name: '성과조사 우편함',
            prompt: chapter6Data.mailPrompt,
            x: WORLD_LAYOUT.mailbox.x,
            y: WORLD_LAYOUT.mailbox.y,
            width: WORLD_LAYOUT.mailbox.width,
            height: WORLD_LAYOUT.mailbox.height,
            color: 0x7b59d7,
            animated: false,
            hideVisuals: this.hasStage6Background,
            labelOnly: this.hasStage6Background
        }, () => this.handleInteraction('mailbox'));
        this.altarObject = new InteractableObject(this, {
            id: 'altar',
            name: '성과의 제단',
            prompt: chapter6Data.altarPrompt,
            x: WORLD_LAYOUT.altar.x,
            y: WORLD_LAYOUT.altar.y,
            width: WORLD_LAYOUT.altar.width,
            height: WORLD_LAYOUT.altar.height,
            color: 0x8b60e8,
            animated: false,
            hideVisuals: this.hasStage6Background,
            labelOnly: this.hasStage6Background
        }, () => this.handleInteraction('altar'));
        this.terminalObject = new InteractableObject(this, {
            id: 'terminal',
            name: 'PIMS 단말기',
            prompt: chapter6Data.terminalPrompt,
            x: WORLD_LAYOUT.terminal.x,
            y: WORLD_LAYOUT.terminal.y,
            width: WORLD_LAYOUT.terminal.width,
            height: WORLD_LAYOUT.terminal.height,
            hideBorder: true,
            animated: false
        }, () => this.handleInteraction('terminal'));

        this.interactables = [this.mailBoxObject, this.assistantObject, this.altarObject, this.terminalObject];
        this.interaction = new InteractionManager(this, this.player, this.interactables, (prompt) => this.bottomHud.setInteractionPrompt(prompt));
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
        const area = { x: 46, y: 144, width: GAME_WIDTH - 92, height: 412 };
        return {
            x: Phaser.Math.Clamp(x, area.x, area.x + area.width),
            y: Phaser.Math.Clamp(y, area.y, area.y + area.height)
        };
    }

    clampPlayerToWalkable() {
        const clamped = this.clampToWalkable(this.player.x, this.player.y);
        this.player.setPosition(clamped.x, clamped.y);
    }

    refreshHud() {
        this.topHud?.refresh?.();
        this.bottomHud?.refresh?.();
    }

    tryInteract() {
        if (!this.dialogue.isActive && this.mode === 'field') {
            if (this.stage6GemSpawned && !this.stage6GemCollected && this.isNearInteractable(this.gemObject, 150)) {
                this.collectGem();
                return;
            }
            if (this.stage6GemCollected && !this.stage6PimsRegistered && this.isNearInteractable(this.terminalObject, 150)) {
                this.handleTerminalInteraction();
                return;
            }
            this.interaction.interact();
        }
    }

    isNearInteractable(interactable, range = 150) {
        if (!interactable || !this.player) {
            return false;
        }

        const halfWidth = (interactable?.config?.width ?? 0) / 2;
        const halfHeight = (interactable?.config?.height ?? 0) / 2;
        const dx = Math.max(Math.abs(this.player.x - interactable.x) - halfWidth, 0);
        const dy = Math.max(Math.abs(this.player.y - interactable.y) - halfHeight, 0);
        return Math.hypot(dx, dy) < range;
    }

    handleInteraction(id) {
        if (this.mode !== 'field') {
            return;
        }
        if (id === 'assistant') {
            this.handleAssistantInteraction();
        } else if (id === 'mailbox') {
            this.openMailPopup();
        } else if (id === 'altar') {
            this.handleAltarInteraction();
        } else if (id === 'terminal') {
            this.handleTerminalInteraction();
        } else if (id === 'stage6Gem') {
            this.collectGem();
        }
    }

    handleAssistantInteraction() {
        let text = '먼저 우편함에서 성과조사 협조 요청 공문을 확인하세요.';
        if (this.stage6MailChecked && !this.stage6QuizCompleted) {
            text = '공문을 확인했으니 성과의 제단에서 상황별 대응을 점검해 보세요.';
        } else if (this.stage6QuizCompleted && !this.stage6GemCollected) {
            text = '성과 보석이 생성되었습니다. 제단 앞에서 보석을 획득하세요.';
        } else if (this.stage6GemCollected && !this.stage6PimsRegistered) {
            text = '성과 보석을 획득했으니 PIMS 단말기에 대응 결과를 등록하세요.';
        } else if (this.stage6PimsRegistered) {
            text = '성과조사 대응 결과 등록까지 모두 완료했습니다.';
        }

        this.dialogue.say([{ speaker: 'KCA 간사', text }]);
    }

    openMailPopup() {
        if (this.stage6MailChecked) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '공문은 이미 확인했습니다.' }]);
            return;
        }

        this.mode = 'mail';
        this.bottomHud?.setInteractionVisible(false);
        this.mailPopup?.destroy(true);
        this.mailPopup = this.add.container(0, 0).setDepth(995);
        const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x04050f, 0.82);
        const panel = hasTexture(this, ASSETS.ui.performanceMailPopup.key)
            ? this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSETS.ui.performanceMailPopup.key).setDisplaySize(860, 500)
            : this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 860, 500, 0xf3e9ff, 1).setStrokeStyle(3, 0x8b60e8, 0.75);
        const body = this.add.text(GAME_WIDTH / 2, 177, chapter6Data.mailBody, { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '18px', color: '#24193b', align: 'center', wordWrap: { width: 780 }, lineSpacing: 20 }).setOrigin(0.5, 0);
        const footer = this.add.text(GAME_WIDTH / 2, 476, '공문을 확인한 뒤 제단에서 해야 할 일을 이어서 진행하세요.', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '16px', color: '#5e4a20', align: 'center', wordWrap: { width: 720 } }).setOrigin(0.5);
        const confirmButton = this.createOverlayButton(GAME_WIDTH / 2, 532, 150, 44, '확인', () => {
            this.stage6MailChecked = true;
            this.stage6AltarUnlocked = true;
            GameState.set('stage6MailChecked', true);
            GameState.set('stage6AltarUnlocked', true);
            this.closeMailPopup();
            this.bottomHud?.setInteractionVisible(true);
            this.dialogue.say([
                { speaker: 'KCA 간사', text: '성과조사 공문을 확인했습니다.' },
                { speaker: 'KCA 간사', text: '성과의 제단에서 전담기관 담당자가 해야할 일을 확인하세요.' }
            ]);
            this.refreshWorldState();
        }, ASSETS.ui.performanceMailConfirmButton);

        this.mailPopup.add([backdrop, panel, body, footer, confirmButton.container]);
    }

    closeMailPopup() {
        this.mailPopup?.destroy(true);
        this.mailPopup = null;
        this.mode = 'field';
    }

    handleAltarInteraction() {
        if (!this.stage6MailChecked) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '먼저 우편함에서 성과조사 협조 요청 공문을 확인하세요.' }]);
            return;
        }

        if (!this.stage6QuizCompleted) {
            this.openQuizOverlay();
            return;
        }

        if (this.stage6GemSpawned && !this.stage6GemCollected) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '성과 보석이 생성되었습니다. 보석을 획득하세요.' }]);
            return;
        }

        if (this.stage6GemCollected && !this.stage6PimsRegistered) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: 'PIMS 단말기에서 성과조사 대응 결과를 등록하세요.' }]);
            return;
        }

        if (this.stage6PimsRegistered) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '성과조사 대응 등록까지 이미 완료했습니다.' }]);
        }
    }

    handleTerminalInteraction() {
        if (!this.stage6GemCollected) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '먼저 성과의 제단에서 성과 보석을 획득하세요.' }]);
            return;
        }

        if (this.stage6PimsRegistered) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '성과조사 대응 결과는 이미 PIMS에 등록되었습니다.' }]);
            return;
        }

        this.stage6PimsRegistered = true;
        GameState.set('stage6PimsRegistered', true);
        this.refreshWorldState();
        this.bottomHud?.setInteractionPrompt('성과조사 대응 등록 완료');
        this.dialogue.say([
            { speaker: 'KCA 간사', text: '성과조사 결과가 PIMS에 등록되었습니다.' },
            { speaker: 'KCA 간사', text: '이제 정산을 시작해볼까요? 다음 단계로 이동합니다.' }
        ], () => {
            this.transitionRequested = true;
        });
    }

    openQuizOverlay() {
        if (!this.stage6MailChecked) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '먼저 우편함에서 성과조사 협조 요청 공문을 확인하세요.' }]);
            return;
        }
        if (this.stage6QuizCompleted || this.quizOverlay) {
            if (this.stage6QuizCompleted) {
                this.dialogue.say([{ speaker: 'KCA 간사', text: '성과 보석이 생성되었습니다. 제단 앞의 보석을 획득하세요.' }]);
            }
            return;
        }

        this.mode = 'quiz';
        this.stage6QuizStarted = true;
        GameState.set('stage6QuizStarted', true);
        this.bottomHud?.setInteractionVisible(false);
        this.createQuizOverlay();
        this.renderRouteSelection();
        this.refreshWorldState();
    }

    createQuizOverlay() {
        this.quizStoneNodes.forEach((stone) => {
            stone?.pulseTween?.stop?.();
            stone?.sparkleTween?.stop?.();
        });
        this.quizOverlay?.destroy(true);
        this.quizOverlay = this.add.container(0, 0).setDepth(990);
        this.quizStaticNodes = [];
        this.quizDynamicNodes = [];
        this.quizChoiceButtons = [];
        this.quizRouteButtons = [];
        this.quizStoneNodes = [];
        this.quizStamp = null;

        const backdrop = hasTexture(this, ASSETS.backgrounds.performanceAltarQuiz.key)
            ? this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, ASSETS.backgrounds.performanceAltarQuiz.key).setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
            : this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050611, 0.83);
        const leftPanel = this.add.rectangle(QUIZ_LAYOUT.leftCard.x, QUIZ_LAYOUT.leftCard.y, QUIZ_LAYOUT.leftCard.width, QUIZ_LAYOUT.leftCard.height, 0xf7f0ff, 0).setOrigin(0, 0);
        const rightPanel = this.add.rectangle(QUIZ_LAYOUT.rightPanel.x, QUIZ_LAYOUT.rightPanel.y, QUIZ_LAYOUT.rightPanel.width, QUIZ_LAYOUT.rightPanel.height, 0x120f24, 0).setOrigin(0, 0);
        const feedbackPanel = this.add.rectangle(QUIZ_LAYOUT.feedback.x, QUIZ_LAYOUT.feedback.y, QUIZ_LAYOUT.feedback.width, QUIZ_LAYOUT.feedback.height, 0x120f24, 0).setOrigin(0, 0);

        for (let i = 0; i < 6; i += 1) {
            this.quizStoneNodes.push(this.createStoneIndicator(QUIZ_LAYOUT.stoneStartX + i * QUIZ_LAYOUT.stoneGap, QUIZ_LAYOUT.stoneY));
        }

        this.quizFeedbackText = this.add.text(QUIZ_LAYOUT.feedback.x + 18, QUIZ_LAYOUT.feedback.y + QUIZ_LAYOUT.feedback.height / 2, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '17px',
            color: '#f8f3ff',
            wordWrap: { width: QUIZ_LAYOUT.feedback.width - 36 },
            lineSpacing: 6
        }).setOrigin(0, 0.5);
        this.quizProgressText = this.add.text(QUIZ_LAYOUT.stoneStartX - 24, QUIZ_LAYOUT.stoneY, '진행도 0 / -', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#fff5c7'
        }).setOrigin(1, 0.5);

        const stoneContainers = this.quizStoneNodes.map((stone) => stone.container);
        this.quizOverlay.add([backdrop, leftPanel, rightPanel, feedbackPanel, ...stoneContainers, this.quizProgressText, this.quizFeedbackText]);
        this.quizStaticNodes = [backdrop, leftPanel, rightPanel, feedbackPanel, ...stoneContainers, this.quizProgressText, this.quizFeedbackText];
        this.renderQuizFeedback('이번 사업 유형을 선택하세요.');
    }

    createStoneIndicator(x, y) {
        const container = this.add.container(x, y);
        const glow = this.add.circle(0, 0, 16, 0x75f6ff, 0).setBlendMode(Phaser.BlendModes.ADD);
        const outer = this.add.polygon(0, 0, [0, -12, 10, -2, 7, 8, 0, 13, -7, 8, -10, -2], 0x241b3b, 1)
            .setStrokeStyle(2, 0x6b568f, 0.45);
        const core = this.add.polygon(0, 1, [0, -8, 6, -1, 4, 6, 0, 9, -4, 6, -6, -1], 0x3b2d57, 1);
        const facet = this.add.polygon(-2, -2, [0, -5, 3, -1, 0, 3, -3, -1], 0x8b74b8, 0.22);
        const sparkleH = this.add.rectangle(8, -9, 9, 2, 0xfff5c7, 1).setAlpha(0);
        const sparkleV = this.add.rectangle(8, -9, 2, 9, 0xfff5c7, 1).setAlpha(0);
        container.add([glow, outer, core, facet, sparkleH, sparkleV]);

        return {
            container,
            glow,
            outer,
            core,
            facet,
            sparkleH,
            sparkleV,
            lit: false,
            pulseTween: null,
            sparkleTween: null
        };
    }

    renderRouteSelection() {
        this.clearQuizDynamicNodes();

        const prompt = this.add.text(QUIZ_LAYOUT.leftCard.x + QUIZ_LAYOUT.leftCard.width / 2, QUIZ_LAYOUT.leftCard.y - 30, chapter6Data.routeTitle, { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '18px', color: '#fff5c7' }).setOrigin(0.5);
        const guide = this.add.text(QUIZ_LAYOUT.leftCard.x + 26, QUIZ_LAYOUT.leftCard.y + 86, chapter6Data.subtitle, { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '18px', color: '#5e4a20' });
        const memo = this.add.text(QUIZ_LAYOUT.leftCard.x + 26, QUIZ_LAYOUT.leftCard.y + 142, '루트를 선택하면 해당 상황 문제 세트가 시작됩니다.', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '17px', color: '#24193b', wordWrap: { width: 604 }, lineSpacing: 8 });
        const label = this.add.text(QUIZ_LAYOUT.rightPanel.x + QUIZ_LAYOUT.rightPanel.width / 2, QUIZ_LAYOUT.rightPanel.y + 20, '사업 유형', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '20px', color: '#fff5c7' }).setOrigin(0.5, 0);

        chapter6Data.routeOptions.forEach((route, index) => {
            const button = this.createQuizButton(QUIZ_LAYOUT.rightPanel.x + QUIZ_LAYOUT.rightPanel.width / 2, QUIZ_LAYOUT.rightPanel.y + 119 + index * 126, QUIZ_LAYOUT.rightPanel.width - 48, 105, route.label, () => this.selectRoute(route.id));
            this.quizRouteButtons.push(button);
            this.quizOverlay.add(button.container);
        });

        this.quizOverlay.add([prompt, guide, memo, label]);
        this.quizDynamicNodes.push(prompt, guide, memo, label);
    }

    clearQuizDynamicNodes() {
        this.quizDynamicNodes.forEach((node) => node?.destroy?.(true));
        this.quizDynamicNodes = [];
        this.quizRouteButtons.forEach((button) => button?.container?.destroy?.(true));
        this.quizRouteButtons = [];
        this.quizStamp?.destroy?.(true);
        this.quizStamp = null;
    }

    selectRoute(routeId) {
        if (this.stage6SelectedRoute) {
            return;
        }
        this.stage6SelectedRoute = routeId;
        GameState.set('stage6SelectedRoute', routeId);
        this.stage6CurrentQuestionIndex = 0;
        this.stage6CorrectCount = 0;
        GameState.set('stage6CurrentQuestionIndex', 0);
        GameState.set('stage6CorrectCount', 0);
        this.renderQuestion();
    }

    renderQuestion() {
        this.clearQuizDynamicNodes();
        this.clearQuizAnswerButtons();

        const question = this.getCurrentQuestion();
        if (!question) {
            this.finishQuizAndSpawnGem();
            return;
        }

        const questionLabel = this.add.text(QUIZ_LAYOUT.leftCard.x + QUIZ_LAYOUT.leftCard.width / 2, QUIZ_LAYOUT.leftCard.y - 30, '상황', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '18px', color: '#fff5c7' }).setOrigin(0.5);
        const situation = this.add.text(QUIZ_LAYOUT.leftCard.x + 26, QUIZ_LAYOUT.leftCard.y + 62, question.situation, { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '22px', color: '#24193b', wordWrap: { width: 500 }, lineSpacing: 10 });
        const routeHint = this.add.text(QUIZ_LAYOUT.leftCard.x + 26, QUIZ_LAYOUT.leftCard.y + 228, chapter6Data.routeIntro[this.stage6SelectedRoute] || '', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '15px', color: '#8b60e8', wordWrap: { width: 540 }, lineSpacing: 8 });
        const label = this.add.text(QUIZ_LAYOUT.rightPanel.x + QUIZ_LAYOUT.rightPanel.width / 2, QUIZ_LAYOUT.rightPanel.y + 20, '선택지', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '20px', color: '#fff5c7' }).setOrigin(0.5, 0);

        this.quizOverlay.add([questionLabel, situation, routeHint, label]);
        this.quizDynamicNodes.push(questionLabel, situation, routeHint, label);

        question.options.forEach((optionText, index) => {
            const button = this.createQuizButton(QUIZ_LAYOUT.rightPanel.x + QUIZ_LAYOUT.rightPanel.width / 2, QUIZ_LAYOUT.rightPanel.y + 119 + index * 126, QUIZ_LAYOUT.rightPanel.width - 48, 105, optionText, () => this.submitAnswer(index));
            this.quizChoiceButtons.push(button);
            this.quizOverlay.add(button.container);
        });

        this.renderQuizFeedback('정답은 하나입니다. 천천히 읽고 고르세요.');
        this.updateQuizProgress();
        this.updateStoneIndicators();
    }

    createQuizButton(x, y, width, height, label, onClick) {
        const container = this.add.container(0, 0);
        const background = this.add.rectangle(x, y, width, height, 0x24193b, 0);
        const text = this.add.text(x - width / 2 + 59, y, label, { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '17px', color: '#f8f3ff', wordWrap: { width: width - 83 }, lineSpacing: 5 }).setOrigin(0, 0.5);
        const hit = this.add.rectangle(x, y, width, height, 0x000000, 0).setInteractive({ useHandCursor: true });
        let enabled = true;

        const normal = () => {
            background.setFillStyle(0x24193b, 0);
            text.setColor('#f8f3ff');
        };
        const hover = () => {
            background.setFillStyle(0x39295b, 0.72);
            text.setColor('#fff5c7');
        };

        hit.on('pointerover', () => { if (enabled) hover(); });
        hit.on('pointerout', () => { if (enabled) normal(); });
        hit.on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            if (!enabled) {
                return;
            }
            onClick?.();
        });

        container.add([background, text, hit]);
        return {
            container,
            setEnabled: (value) => {
                enabled = Boolean(value);
                hit.input.enabled = enabled;
                container.setAlpha(enabled ? 1 : 0.55);
                if (enabled) {
                    normal();
                } else {
                    background.setFillStyle(0x191325, 0.9);
                    text.setColor('#b9b9b9');
                }
            }
        };
    }

    clearQuizAnswerButtons() {
        this.quizChoiceButtons.forEach((button) => button?.container?.destroy?.(true));
        this.quizChoiceButtons = [];
    }

    submitAnswer(answerIndex) {
        if (this.stage6IsAnswerLocked) {
            return;
        }

        const question = this.getCurrentQuestion();
        if (!question) {
            return;
        }

        if (answerIndex === question.correctIndex) {
            this.handleCorrectAnswer(question);
            return;
        }

        GameState.decreaseHp(10);
        GameState.set('mistakeCount', (GameState.get('mistakeCount') || 0) + 1);
        this.renderQuizFeedback(question.wrongFeedback);
        this.cameras.main.shake(120, 0.0035);
        this.refreshHud();

        if ((GameState.get('hp') ?? 0) <= 0) {
            this.stage6IsAnswerLocked = true;
            GameState.set('stage6IsAnswerLocked', true);
            this.disableQuizButtons();
            this.time.delayedCall(220, () => this.scene.start('GameOverScene'));
        }
    }

    handleCorrectAnswer(question) {
        this.stage6IsAnswerLocked = true;
        GameState.set('stage6IsAnswerLocked', true);
        this.stage6CorrectCount += 1;
        GameState.set('stage6CorrectCount', this.stage6CorrectCount);
        this.renderQuizFeedback(question.correctFeedback);
        this.updateQuizProgress();
        this.showStamp('확인 완료');
        this.updateStoneIndicators();
        this.disableQuizButtons();

        this.time.delayedCall(700, () => {
            if (this.stage6CurrentQuestionIndex + 1 >= this.getQuizTotal()) {
                this.finishQuizAndSpawnGem();
                return;
            }

            this.stage6CurrentQuestionIndex += 1;
            GameState.set('stage6CurrentQuestionIndex', this.stage6CurrentQuestionIndex);
            this.stage6IsAnswerLocked = false;
            GameState.set('stage6IsAnswerLocked', false);
            this.renderQuestion();
        });
    }

    disableQuizButtons() {
        this.quizChoiceButtons.forEach((button) => button?.setEnabled?.(false));
        this.quizRouteButtons.forEach((button) => button?.setEnabled?.(false));
    }

    showStamp(label) {
        this.quizStamp?.destroy?.(true);
        const cardX = QUIZ_LAYOUT.leftCard.x + 426;
        const cardY = QUIZ_LAYOUT.leftCard.y + 302;
        this.quizStamp = this.add.container(cardX, cardY).setRotation(-0.18);
        const rect = this.add.rectangle(0, 0, 190, 78, 0xffd36e, 0.16).setStrokeStyle(4, 0x8b60e8, 0.9);
        const text = this.add.text(0, 0, label, { fontFamily: 'Arial Black, Arial, sans-serif', fontSize: '24px', color: '#8b60e8', stroke: '#fff5c7', strokeThickness: 4 }).setOrigin(0.5);
        this.quizStamp.add([rect, text]);
        this.quizOverlay.add(this.quizStamp);
        this.quizStamp.setScale(1.8);
        this.tweens.add({
            targets: this.quizStamp,
            scale: 1,
            duration: 220,
            ease: 'Back.easeOut'
        });
        this.cameras.main.shake(90, 0.0025);
    }

    updateStoneIndicators() {
        const total = this.getQuizTotal() || 6;
        const centeredStartX = GAME_WIDTH / 2 - ((total - 1) * QUIZ_LAYOUT.stoneGap) / 2;
        this.quizStoneNodes.forEach((stone, index) => {
            stone.container.setX(centeredStartX + index * QUIZ_LAYOUT.stoneGap);
            stone.container.setVisible(index < total);
            const lit = index < this.stage6CorrectCount;
            if (stone.lit === lit) {
                return;
            }

            stone.lit = lit;
            stone.pulseTween?.stop?.();
            stone.sparkleTween?.stop?.();
            stone.pulseTween = null;
            stone.sparkleTween = null;

            if (!lit) {
                stone.glow.setAlpha(0);
                stone.outer.setFillStyle(0x241b3b, 1).setStrokeStyle(2, 0x6b568f, 0.45);
                stone.core.setFillStyle(0x3b2d57, 1);
                stone.facet.setFillStyle(0x8b74b8, 0.22);
                stone.sparkleH.setAlpha(0);
                stone.sparkleV.setAlpha(0);
                stone.container.setScale(1);
                return;
            }

            stone.glow.setFillStyle(0x75f6ff, 0.2);
            stone.outer.setFillStyle(0x2dcddd, 1).setStrokeStyle(2, 0xfff5c7, 0.95);
            stone.core.setFillStyle(0xc9ffef, 1);
            stone.facet.setFillStyle(0xffffff, 0.78);

            this.tweens.add({
                targets: stone.container,
                scaleX: { from: 0.62, to: 1.12 },
                scaleY: { from: 0.62, to: 1.12 },
                duration: 260,
                yoyo: true,
                ease: 'Back.easeOut'
            });
            stone.pulseTween = this.tweens.add({
                targets: stone.glow,
                alpha: { from: 0.12, to: 0.55 },
                scaleX: { from: 0.8, to: 1.35 },
                scaleY: { from: 0.8, to: 1.35 },
                duration: 760,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
            stone.sparkleTween = this.tweens.add({
                targets: [stone.sparkleH, stone.sparkleV],
                alpha: { from: 0.12, to: 1 },
                scaleX: { from: 0.55, to: 1.2 },
                scaleY: { from: 0.55, to: 1.2 },
                duration: 520,
                delay: index * 90,
                yoyo: true,
                repeat: -1,
                repeatDelay: 380,
                ease: 'Sine.easeInOut'
            });
        });
    }

    updateQuizProgress() {
        const total = this.getQuizTotal();
        this.quizProgressText?.setText(`진행도 ${this.stage6CorrectCount} / ${total || '-'}`);
    }

    getCurrentQuestion() {
        if (!this.stage6SelectedRoute) {
            return null;
        }
        return (chapter6Data.questions[this.stage6SelectedRoute] || [])[this.stage6CurrentQuestionIndex] || null;
    }

    getQuizTotal() {
        if (!this.stage6SelectedRoute) {
            return 0;
        }
        return (chapter6Data.questions[this.stage6SelectedRoute] || []).length;
    }

    renderQuizFeedback(message) {
        this.stage6FeedbackMessage = message || '';
        GameState.set('stage6FeedbackMessage', this.stage6FeedbackMessage);
        GameState.set('feedbackMessage', this.stage6FeedbackMessage);
        this.quizFeedbackText?.setText(this.stage6FeedbackMessage || '');
    }

    finishQuizAndSpawnGem() {
        this.stage6QuizCompleted = true;
        this.stage6AltarUnlocked = true;
        this.stage6GemSpawned = true;
        this.stage6QuizStarted = false;
        GameState.set('stage6QuizCompleted', true);
        GameState.set('stage6AltarUnlocked', true);
        GameState.set('stage6GemSpawned', true);
        GameState.set('stage6QuizStarted', false);

        this.clearQuizAnswerButtons();
        this.quizRouteButtons.forEach((button) => button?.container?.destroy?.(true));
        this.quizRouteButtons = [];
        this.renderQuizFeedback('성과 보석이 깨어났습니다!');

        const gemX = GAME_WIDTH / 2;
        const gemY = QUIZ_LAYOUT.leftCard.y + QUIZ_LAYOUT.leftCard.height / 2 - 10;
        const completionShade = this.add.graphics();
        completionShade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.96, 0.96, 0.82, 0.82);
        completionShade.fillRect(0, 0, GAME_WIDTH, QUIZ_LAYOUT.feedback.y);
        const gemAura = this.add.circle(gemX, gemY, 108, 0xffc94f, 0.07).setBlendMode(Phaser.BlendModes.ADD);
        const gemWaveOuter = this.add.circle(gemX, gemY, 78, 0xffd36e, 0.14).setBlendMode(Phaser.BlendModes.ADD);
        const gemWaveInner = this.add.circle(gemX, gemY, 62, 0xfff0b6, 0.1).setBlendMode(Phaser.BlendModes.ADD);
        const gemGlow = this.add.circle(gemX, gemY, 66, 0xfff0b6, 0.12).setStrokeStyle(3, 0xffd36e, 0.6);
        const gemCore = hasTexture(this, ASSETS.effects.performanceGem.key)
            ? this.add.image(gemX, gemY, ASSETS.effects.performanceGem.key).setDisplaySize(96, 96)
            : this.add.star(gemX, gemY, 6, 26, 42, 0xffd36e, 1).setStrokeStyle(2, 0x8b60e8, 0.8);
        const confirmButton = this.createOverlayButton(gemX, QUIZ_LAYOUT.leftCard.y + 364, 168, 50, '확인', () => {
            this.closeQuizOverlay();
            this.spawnGemObject();
            this.bottomHud?.setInteractionVisible(true);
            this.dialogue.say([{ speaker: 'KCA 간사', text: '좋습니다. 이제 제단 앞의 성과 보석을 획득하세요.' }]);
        }, ASSETS.ui.performanceMailConfirmButton);

        this.quizOverlay.add([completionShade, gemAura, gemWaveOuter, gemWaveInner, gemGlow, gemCore, confirmButton.container]);
        this.tweens.add({
            targets: gemAura,
            alpha: { from: 0.05, to: 0.14 },
            scale: { from: 0.88, to: 1.22 },
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.tweens.add({
            targets: gemGlow,
            alpha: { from: 0.55, to: 0.18 },
            scale: { from: 0.94, to: 1.08 },
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
        this.tweens.add({
            targets: gemWaveInner,
            alpha: { from: 0.16, to: 0 },
            scale: { from: 0.82, to: 1.65 },
            duration: 1700,
            repeat: -1,
            ease: 'Sine.easeOut'
        });
        this.tweens.add({
            targets: gemWaveOuter,
            alpha: { from: 0.24, to: 0 },
            scale: { from: 0.88, to: 2.35 },
            duration: 2300,
            delay: 520,
            repeat: -1,
            ease: 'Sine.easeOut'
        });
    }

    closeQuizOverlay() {
        this.quizStoneNodes.forEach((stone) => {
            stone?.pulseTween?.stop?.();
            stone?.sparkleTween?.stop?.();
        });
        this.quizOverlay?.destroy(true);
        this.quizOverlay = null;
        this.quizStaticNodes = [];
        this.quizDynamicNodes = [];
        this.quizChoiceButtons = [];
        this.quizRouteButtons = [];
        this.quizStoneNodes = [];
        this.quizStamp = null;
        this.mode = 'field';
        this.bottomHud?.setInteractionVisible(true);
        this.bottomHud?.setInteractionPrompt(this.stage6GemSpawned && !this.stage6GemCollected ? chapter6Data.gemPrompt : chapter6Data.terminalPrompt);
    }

    spawnGemObject() {
        if (this.gemObject) {
            this.gemObject.container?.setVisible(true);
            this.gemObject.available = true;
            return;
        }

        this.gemObject = new InteractableObject(this, {
            id: 'stage6Gem',
            name: '성과 보석',
            prompt: chapter6Data.gemPrompt,
            x: WORLD_LAYOUT.gem.x,
            y: WORLD_LAYOUT.gem.y,
            width: WORLD_LAYOUT.gem.width,
            height: WORLD_LAYOUT.gem.height,
            textureKey: hasTexture(this, ASSETS.effects.performanceGem.key)
                ? ASSETS.effects.performanceGem.key
                : ASSETS.effects.sparkle.key,
            imageAlpha: 0.95,
            hideBorder: true,
            animated: false
        }, () => this.handleInteraction('stage6Gem'));

        this.interactables.push(this.gemObject);
        this.gemTween?.stop?.();
        this.gemTween = this.tweens.add({
            targets: this.gemObject.container,
            y: { from: this.gemObject.container.y, to: this.gemObject.container.y - 6 },
            duration: 820,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    collectGem() {
        if (!this.stage6GemSpawned || this.stage6GemCollected || !this.gemObject) {
            return;
        }

        this.stage6GemCollected = true;
        GameState.set('stage6GemCollected', true);
        this.gemTween?.stop?.();
        this.gemTween = null;
        this.gemObject.available = false;
        this.gemObject.container?.setVisible(false);
        this.bottomHud?.setInteractionPrompt('성과 보석 획득 완료');
        this.dialogue.say([{ speaker: 'KCA 간사', text: '성과 보석을 획득했습니다. 이제 PIMS 단말기에 등록하세요.' }]);
        this.refreshWorldState();
    }

    refreshWorldState() {
        if (this.mailBoxObject) {
            this.mailBoxObject.prompt = this.stage6MailChecked ? '성과조사 공문 확인 완료' : chapter6Data.mailPrompt;
        }
        if (this.altarObject) {
            this.altarObject.available = !(this.stage6GemSpawned && !this.stage6GemCollected);
            if (!this.stage6MailChecked) {
                this.altarObject.prompt = '먼저 우편함에서 공문을 확인하세요.';
            } else if (!this.stage6QuizCompleted) {
                this.altarObject.prompt = chapter6Data.altarPrompt;
            } else if (this.stage6GemSpawned && !this.stage6GemCollected) {
                this.altarObject.prompt = chapter6Data.gemPrompt;
            } else if (this.stage6GemCollected && !this.stage6PimsRegistered) {
                this.altarObject.prompt = 'PIMS 단말기에서 결과를 등록하세요.';
            } else {
                this.altarObject.prompt = '성과조사 대응 등록 완료';
            }
        }
        if (this.terminalObject) {
            this.terminalObject.prompt = !this.stage6GemCollected
                ? '먼저 성과 보석을 획득하세요.'
                : (this.stage6PimsRegistered ? '성과조사 대응 등록 완료' : chapter6Data.terminalPrompt);
            this.terminalObject.label?.setColor(this.stage6PimsRegistered ? '#c9ffef' : (this.stage6GemCollected ? '#fff5c7' : '#f8f3ff'));
        }
        if (this.gemObject) {
            this.gemObject.prompt = chapter6Data.gemPrompt;
        }
    }

    createOverlayButton(x, y, width, height, label, onClick, backgroundAsset = null) {
        const container = this.add.container(0, 0);
        const usesImage = backgroundAsset && hasTexture(this, backgroundAsset.key);
        const background = usesImage
            ? this.add.image(x, y, backgroundAsset.key).setDisplaySize(width, height)
            : this.add.rectangle(x, y, width, height, 0x24193b, 0.95).setStrokeStyle(2, 0x8b60e8, 0.8);
        const text = this.add.text(x, y, label, { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '18px', color: '#f8f3ff' }).setOrigin(0.5);
        const hit = this.add.rectangle(x, y, width, height, 0x000000, 0).setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            if (usesImage) {
                background.setTint(0xffe5a3);
            } else {
                background.setFillStyle(0x39295b, 1);
                background.setStrokeStyle(2, 0xffd36e, 0.95);
            }
            text.setColor('#fff5c7');
        });
        hit.on('pointerout', () => {
            if (usesImage) {
                background.clearTint();
            } else {
                background.setFillStyle(0x24193b, 0.95);
                background.setStrokeStyle(2, 0x8b60e8, 0.8);
            }
            text.setColor('#f8f3ff');
        });
        hit.on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            onClick?.();
        });
        container.add([background, text, hit]);
        return { container };
    }

    toggleDevFreeze() {
        if (!import.meta.env.DEV) {
            return;
        }

        this.devFreezeLocked = !this.devFreezeLocked;
        this.devFreezeIndicator?.destroy?.();
        this.devFreezeIndicator = this.add.text(GAME_WIDTH - 24, 24, this.devFreezeLocked ? 'LOCK ON' : 'LOCK OFF', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: this.devFreezeLocked ? '#fff5c7' : '#c9ffef',
            backgroundColor: 'rgba(7, 10, 20, 0.86)',
            padding: { left: 10, right: 10, top: 6, bottom: 6 }
        })
            .setOrigin(1, 0)
            .setScrollFactor(0)
            .setDepth(3000);

        if (this.devFreezeLocked) {
            this.scene.pause();
            return;
        }

        if (this.scene.isPaused()) {
            this.scene.resume();
        }
        this.time.delayedCall(700, () => {
            if (!this.devFreezeLocked) {
                this.devFreezeIndicator?.destroy?.();
                this.devFreezeIndicator = null;
            }
        });
    }

    goToStage7() {
        GameState.set('currentChapter', 7);
        this.scene.start('Stage7Scene');
    }

    clearQuizAnswerButtons() {
        this.quizChoiceButtons.forEach((button) => button?.container?.destroy?.(true));
        this.quizChoiceButtons = [];
    }

    cleanup() {
        this.spaceKey?.off('down', this.onSpaceDown);
        this.enterKey?.off('down', this.onEnterDown);
        this.input.off('pointerdown', this.onPointerDown);
        this.gemTween?.stop?.();
        this.devFreezeIndicator?.destroy?.();
        this.devFreezeIndicator = null;
        this.devFreezeLocked = false;
        this.quizStoneNodes.forEach((stone) => {
            stone?.pulseTween?.stop?.();
            stone?.sparkleTween?.stop?.();
        });
        this.mailPopup?.destroy(true);
        this.quizOverlay?.destroy(true);
        this.dialogue?.dialogBox?.destroy?.();
        this.topHud?.destroy?.();
        this.bottomHud?.destroy?.();
        this.gemObject = null;
    }
}
