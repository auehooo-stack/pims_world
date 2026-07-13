import * as Phaser from 'phaser';
import { chapter6Data } from '../data/chapter6Data.js';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { InteractionManager } from '../systems/InteractionManager.js';
import { Player } from '../objects/Player.js';
import { InteractableObject } from '../objects/InteractableObject.js';
import { BottomHUD } from '../objects/BottomHUD.js';
import { TopHUD } from '../objects/TopHUD.js';
import { ASSETS, playBgmWithFade } from '../systems/AssetManager.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

const QUIZ_LAYOUT = {
    titleX: GAME_WIDTH / 2,
    titleY: 34,
    leftCard: { x: 52, y: 108, width: 696, height: 446 },
    rightPanel: { x: 780, y: 108, width: 448, height: 446 },
    feedback: { x: 52, y: 582, width: 1176, height: 90 },
    stoneStartX: 520,
    stoneY: 56,
    stoneGap: 36
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
        this.quizStaticNodes = [];
        this.quizDynamicNodes = [];
        this.quizChoiceButtons = [];
        this.quizRouteButtons = [];
        this.quizStoneNodes = [];
        this.quizStamp = null;
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
        this.altarObject = null;
        this.terminalObject = null;
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
        this.player = new Player(this, 160, 484);
        this.player.speed = 260;
        this.mailBoxObject = new InteractableObject(this, {
            id: 'mailbox',
            name: '성과조사 우편함',
            prompt: chapter6Data.mailPrompt,
            x: 126,
            y: 432,
            width: 118,
            height: 138,
            color: 0x7b59d7,
            animated: false
        }, () => this.handleInteraction('mailbox'));
        this.altarObject = new InteractableObject(this, {
            id: 'altar',
            name: '성과의 제단',
            prompt: chapter6Data.altarPrompt,
            x: 612,
            y: 374,
            width: 168,
            height: 116,
            color: 0x8b60e8,
            animated: false
        }, () => this.handleInteraction('altar'));
        this.terminalObject = new InteractableObject(this, {
            id: 'terminal',
            name: 'PIMS 단말기',
            prompt: chapter6Data.terminalPrompt,
            x: 1168,
            y: 428,
            width: 112,
            height: 148,
            hideBorder: true,
            animated: false
        }, () => this.handleInteraction('terminal'));

        this.interactables = [this.mailBoxObject, this.altarObject, this.terminalObject];
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
        if (id === 'mailbox') {
            this.openMailPopup();
        } else if (id === 'altar') {
            this.handleAltarInteraction();
        } else if (id === 'terminal') {
            this.handleTerminalInteraction();
        } else if (id === 'stage6Gem') {
            this.collectGem();
        }
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
        const panel = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 860, 438, 0xf3e9ff, 1).setStrokeStyle(3, 0x8b60e8, 0.75);
        const title = this.add.text(GAME_WIDTH / 2, 154, chapter6Data.mailTitle, { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '30px', color: '#3d235f' }).setOrigin(0.5);
        const body = this.add.text(GAME_WIDTH / 2, 232, chapter6Data.mailBody, { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '18px', color: '#24193b', align: 'center', wordWrap: { width: 736 }, lineSpacing: 8 }).setOrigin(0.5);
        const footer = this.add.text(GAME_WIDTH / 2, 454, '공문을 확인한 뒤 제단에서 해야 할 일을 이어서 진행하세요.', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '16px', color: '#5e4a20', align: 'center', wordWrap: { width: 720 } }).setOrigin(0.5);
        const confirmButton = this.createOverlayButton(GAME_WIDTH / 2 - 84, 520, 168, 52, '확인', () => {
            this.stage6MailChecked = true;
            this.stage6AltarUnlocked = true;
            GameState.set('stage6MailChecked', true);
            GameState.set('stage6AltarUnlocked', true);
            this.closeMailPopup();
            this.bottomHud?.setInteractionVisible(true);
            this.dialogue.say([
                { speaker: 'KCA 간사', text: '성과조사 공문을 확인했습니다.' },
                { speaker: 'KCA 간사', text: '성과의 제단에서 내가 해야 할 일을 확인하세요.' }
            ]);
            this.refreshWorldState();
        });

        this.mailPopup.add([backdrop, panel, title, body, footer, confirmButton.container]);
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
            { speaker: 'KCA 간사', text: '성과조사 대응 결과가 PIMS에 등록되었습니다.' },
            { speaker: 'KCA 간사', text: '다음 구역으로 이동합니다.' }
        ]);
        this.time.delayedCall(100, () => this.goToStage7());
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
        this.quizOverlay?.destroy(true);
        this.quizOverlay = this.add.container(0, 0).setDepth(990);
        this.quizStaticNodes = [];
        this.quizDynamicNodes = [];
        this.quizChoiceButtons = [];
        this.quizRouteButtons = [];
        this.quizStoneNodes = [];
        this.quizStamp = null;

        const backdrop = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x050611, 0.83);
        const title = this.add.text(QUIZ_LAYOUT.titleX, QUIZ_LAYOUT.titleY, '성과의 제단 : 성과조사 대응', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '26px', color: '#fff5c7' }).setOrigin(0.5);
        const subtitle = this.add.text(QUIZ_LAYOUT.titleX, 66, '성과조사 협조 요청 공문을 확인한 뒤, 상황에 맞는 대응을 선택하세요.', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '16px', color: '#c9ffef' }).setOrigin(0.5);
        const leftPanel = this.add.rectangle(QUIZ_LAYOUT.leftCard.x, QUIZ_LAYOUT.leftCard.y, QUIZ_LAYOUT.leftCard.width, QUIZ_LAYOUT.leftCard.height, 0xf7f0ff, 1).setOrigin(0, 0).setStrokeStyle(3, 0x8b60e8, 0.7);
        const rightPanel = this.add.rectangle(QUIZ_LAYOUT.rightPanel.x, QUIZ_LAYOUT.rightPanel.y, QUIZ_LAYOUT.rightPanel.width, QUIZ_LAYOUT.rightPanel.height, 0x120f24, 0.94).setOrigin(0, 0).setStrokeStyle(2, 0x75f6ff, 0.4);
        const feedbackPanel = this.add.rectangle(QUIZ_LAYOUT.feedback.x, QUIZ_LAYOUT.feedback.y, QUIZ_LAYOUT.feedback.width, QUIZ_LAYOUT.feedback.height, 0x120f24, 0.96).setOrigin(0, 0).setStrokeStyle(2, 0xffd36e, 0.35);

        for (let i = 0; i < 6; i += 1) {
            this.quizStoneNodes.push(this.add.circle(QUIZ_LAYOUT.stoneStartX + i * QUIZ_LAYOUT.stoneGap, QUIZ_LAYOUT.stoneY, 9, 0x3b2d57, 1).setStrokeStyle(2, 0xffd36e, 0.12));
        }

        this.quizFeedbackText = this.add.text(QUIZ_LAYOUT.feedback.x + 18, QUIZ_LAYOUT.feedback.y + 18, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '17px',
            color: '#f8f3ff',
            wordWrap: { width: QUIZ_LAYOUT.feedback.width - 36 },
            lineSpacing: 6
        });

        this.quizOverlay.add([backdrop, title, subtitle, leftPanel, rightPanel, feedbackPanel, ...this.quizStoneNodes, this.quizFeedbackText]);
        this.quizStaticNodes = [backdrop, title, subtitle, leftPanel, rightPanel, feedbackPanel, ...this.quizStoneNodes, this.quizFeedbackText];
        this.renderQuizFeedback('이번 사업 유형을 선택하세요.');
    }

    renderRouteSelection() {
        this.clearQuizDynamicNodes();

        const prompt = this.add.text(QUIZ_LAYOUT.leftCard.x + 26, QUIZ_LAYOUT.leftCard.y + 28, chapter6Data.routeTitle, { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '28px', color: '#3d235f' });
        const guide = this.add.text(QUIZ_LAYOUT.leftCard.x + 26, QUIZ_LAYOUT.leftCard.y + 86, chapter6Data.subtitle, { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '18px', color: '#5e4a20' });
        const memo = this.add.text(QUIZ_LAYOUT.leftCard.x + 26, QUIZ_LAYOUT.leftCard.y + 142, '루트를 선택하면 해당 상황 문제 세트가 시작됩니다.', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '17px', color: '#24193b', wordWrap: { width: 604 }, lineSpacing: 8 });
        const label = this.add.text(QUIZ_LAYOUT.rightPanel.x + 24, QUIZ_LAYOUT.rightPanel.y + 20, '사업 유형', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '20px', color: '#fff5c7' });

        chapter6Data.routeOptions.forEach((route, index) => {
            const button = this.createQuizButton(QUIZ_LAYOUT.rightPanel.x + 26, QUIZ_LAYOUT.rightPanel.y + 86 + index * 112, QUIZ_LAYOUT.rightPanel.width - 52, 86, `${index + 1}. ${route.label}`, () => this.selectRoute(route.id));
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

        const questionLabel = this.add.text(QUIZ_LAYOUT.leftCard.x + 26, QUIZ_LAYOUT.leftCard.y + 24, '상황', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '18px', color: '#7a5b1f' });
        const situation = this.add.text(QUIZ_LAYOUT.leftCard.x + 26, QUIZ_LAYOUT.leftCard.y + 62, question.situation, { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '22px', color: '#24193b', wordWrap: { width: 500 }, lineSpacing: 10 });
        const routeHint = this.add.text(QUIZ_LAYOUT.leftCard.x + 26, QUIZ_LAYOUT.leftCard.y + 180, chapter6Data.routeIntro[this.stage6SelectedRoute] || '', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '16px', color: '#4f5d4f', wordWrap: { width: 540 }, lineSpacing: 8 });
        const note = this.add.text(QUIZ_LAYOUT.leftCard.x + 26, QUIZ_LAYOUT.leftCard.y + 258, '정답은 하나입니다. 천천히 읽고 고르세요.', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '15px', color: '#8b60e8' });
        const label = this.add.text(QUIZ_LAYOUT.rightPanel.x + 24, QUIZ_LAYOUT.rightPanel.y + 20, '선택지', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '20px', color: '#fff5c7' });

        this.quizOverlay.add([questionLabel, situation, routeHint, note, label]);
        this.quizDynamicNodes.push(questionLabel, situation, routeHint, note, label);

        question.options.forEach((optionText, index) => {
            const button = this.createQuizButton(QUIZ_LAYOUT.rightPanel.x + 24, QUIZ_LAYOUT.rightPanel.y + 74 + index * 108, QUIZ_LAYOUT.rightPanel.width - 48, 88, `${index + 1}. ${optionText}`, () => this.submitAnswer(index));
            this.quizChoiceButtons.push(button);
            this.quizOverlay.add(button.container);
        });

        this.renderQuizFeedback(`진행도 ${this.stage6CorrectCount} / ${this.getQuizTotal()}`);
        this.updateStoneIndicators();
    }

    createQuizButton(x, y, width, height, label, onClick) {
        const container = this.add.container(0, 0);
        const background = this.add.rectangle(x, y, width, height, 0x24193b, 0.92).setStrokeStyle(2, 0x8b60e8, 0.8);
        const text = this.add.text(x + 24, y, label, { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '17px', color: '#f8f3ff', wordWrap: { width: width - 58 } }).setOrigin(0, 0.5);
        const numberBox = this.add.rectangle(x + 28, y, 30, 30, 0xffd36e, 1).setStrokeStyle(2, 0x3d235f, 0.9);
        const numberText = this.add.text(x + 28, y, label.charAt(0), { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '18px', color: '#3d235f' }).setOrigin(0.5);
        const hit = this.add.rectangle(x, y, width, height, 0x000000, 0).setInteractive({ useHandCursor: true });
        let enabled = true;

        const normal = () => {
            background.setFillStyle(0x24193b, 0.92);
            background.setStrokeStyle(2, 0x8b60e8, 0.8);
            text.setColor('#f8f3ff');
            numberBox.setFillStyle(0xffd36e, 1);
        };
        const hover = () => {
            background.setFillStyle(0x39295b, 0.98);
            background.setStrokeStyle(2, 0xffd36e, 0.95);
            text.setColor('#fff5c7');
            numberBox.setFillStyle(0xfff0b6, 1);
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

        container.add([background, numberBox, numberText, text, hit]);
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
                    numberBox.setFillStyle(0x5f5f5f, 1);
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

        this.renderQuizFeedback(question.wrongFeedback);
        this.cameras.main.shake(80, 0.002);
    }

    handleCorrectAnswer(question) {
        this.stage6IsAnswerLocked = true;
        GameState.set('stage6IsAnswerLocked', true);
        this.stage6CorrectCount += 1;
        GameState.set('stage6CorrectCount', this.stage6CorrectCount);
        this.renderQuizFeedback(question.correctFeedback);
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
        this.quizStoneNodes.forEach((stone, index) => {
            const lit = index < this.stage6CorrectCount;
            stone.setFillStyle(lit ? 0xffd36e : 0x3b2d57, 1);
            stone.setStrokeStyle(2, lit ? 0xfff5c7 : 0x8b60e8, lit ? 0.9 : 0.12);
        });
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

        const gemX = QUIZ_LAYOUT.leftCard.x + QUIZ_LAYOUT.leftCard.width / 2;
        const gemY = QUIZ_LAYOUT.leftCard.y + QUIZ_LAYOUT.leftCard.height / 2 - 10;
        const gemGlow = this.add.circle(gemX, gemY, 66, 0xfff0b6, 0.12).setStrokeStyle(3, 0xffd36e, 0.6);
        const gemCore = this.add.star(gemX, gemY, 6, 26, 42, 0xffd36e, 1).setStrokeStyle(2, 0x8b60e8, 0.8);
        const notice = this.add.text(gemX, QUIZ_LAYOUT.leftCard.y + 86, '성과 보석이 깨어났습니다!', { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '26px', color: '#3d235f' }).setOrigin(0.5);
        const confirmButton = this.createOverlayButton(gemX - 84, QUIZ_LAYOUT.leftCard.y + 364, 168, 50, '확인', () => {
            this.closeQuizOverlay();
            this.spawnGemObject();
            this.bottomHud?.setInteractionVisible(true);
            this.dialogue.say([{ speaker: 'KCA 간사', text: '좋습니다. 이제 제단 앞의 성과 보석을 획득하세요.' }]);
        });

        this.quizOverlay.add([gemGlow, gemCore, notice, confirmButton.container]);
    }

    closeQuizOverlay() {
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
            x: 666,
            y: 362,
            width: 56,
            height: 56,
            textureKey: ASSETS.effects.sparkle.key,
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

    createOverlayButton(x, y, width, height, label, onClick) {
        const container = this.add.container(0, 0);
        const background = this.add.rectangle(x, y, width, height, 0x24193b, 0.95).setStrokeStyle(2, 0x8b60e8, 0.8);
        const text = this.add.text(x, y, label, { fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '18px', color: '#f8f3ff' }).setOrigin(0.5);
        const hit = this.add.rectangle(x, y, width, height, 0x000000, 0).setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            background.setFillStyle(0x39295b, 1);
            background.setStrokeStyle(2, 0xffd36e, 0.95);
            text.setColor('#fff5c7');
        });
        hit.on('pointerout', () => {
            background.setFillStyle(0x24193b, 0.95);
            background.setStrokeStyle(2, 0x8b60e8, 0.8);
            text.setColor('#f8f3ff');
        });
        hit.on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            onClick?.();
        });
        container.add([background, text, hit]);
        return { container };
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
        this.mailPopup?.destroy(true);
        this.quizOverlay?.destroy(true);
        this.dialogue?.dialogBox?.destroy?.();
        this.topHud?.destroy?.();
        this.bottomHud?.destroy?.();
        this.gemObject = null;
    }
}
