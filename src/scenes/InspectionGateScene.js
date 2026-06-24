import * as Phaser from 'phaser';
import { chapter4Data } from '../data/chapter4Data.js';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { InteractionManager } from '../systems/InteractionManager.js';
import { Player } from '../objects/Player.js';
import { InteractableObject } from '../objects/InteractableObject.js';
import { BottomHUD } from '../objects/BottomHUD.js';
import { TopHUD } from '../objects/TopHUD.js';
import { ASSETS, hasTexture, playBgmWithFade } from '../systems/AssetManager.js';
import { CENTER_X, DIALOG_TOP, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

const DEV_STAGE4_VIEW_KEY = 'pims_world.dev.stage4_view';
const DEV_STAGE4_LOCK_KEY = 'pims_world.dev.stage4_lock';
const DEV_STAGE4_VIEW_DEFAULT = import.meta.env.DEV;

const QUIZ_LAYOUT = {
    backdrop: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, width: GAME_WIDTH, height: GAME_HEIGHT },
    leftPanel: { x: 50, y: 110, width: 560, height: 470 },
    rightPanel: { x: 670, y: 110, width: 560, height: 470 },
    feedback: { x: CENTER_X, y: 614, width: 910, height: 43 },
    answerButtons: [
        { x: 480, y: 338, width: 540, height: 54 },
        { x: 480, y: 403, width: 540, height: 54 },
        { x: 480, y: 468, width: 540, height: 54 },
        { x: 480, y: 533, width: 540, height: 54 }
    ]
};

export class InspectionGateScene extends Phaser.Scene {
    constructor() {
        super('InspectionGateScene');
        this.mode = 'briefing';
        this.quizOverlay = null;
        this.resultOverlay = null;
        this.interaction = null;
        this.interactables = [];
        this.clickTarget = null;
        this.player = null;
        this.currentQuestionIndex = 0;
        this.transitionLocked = false;
        this.answerButtons = [];
        this.feedbackText = null;
        this.questionText = null;
        this.questionLabel = null;
        this.statusText = null;
        this.statusNodes = [];
        this.questionPortrait = null;
        this.questionPortraitLabel = null;
        this.auditFirmAccountant = null;
        this.auditFirmAccountantLabel = null;
        this.roomHintText = null;
        this.devLockIndicator = null;
        this.onF8Down = null;
        this.onWindowKeyDown = null;
        this.onPointerDown = null;
    }

    isDevQuizViewLocked() {
        if (!import.meta.env.DEV || typeof window === 'undefined') {
            return false;
        }

        try {
            const raw = window.sessionStorage.getItem(DEV_STAGE4_LOCK_KEY);
            if (raw === null) {
                return DEV_STAGE4_VIEW_DEFAULT;
            }
            return raw === '1';
        } catch {
            return DEV_STAGE4_VIEW_DEFAULT;
        }
    }

    create() {
        GameState.set('currentChapter', 4);
        GameState.set('timeRunning', true);
        GameState.set('stage4BriefingDone', false);
        GameState.set('stage4QuizActive', false);
        GameState.set('stage4QuestionIndex', 0);
        GameState.set('stage4QuestionTotal', chapter4Data.questions.length);
        GameState.set('stage4CorrectCount', 0);
        GameState.set('stage4WrongCount', 0);
        GameState.set('stage4Cleared', false);
        GameState.set('stage4Failed', false);
        this.restoreDevQuizView();

        playBgmWithFade(this, ASSETS.audio.bgmMain.key, { loop: true, volume: 0.35 }, 900);
        this.cameras.main.setBackgroundColor(0x090714);
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
        this.f8Key = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F8);

        this.onSpaceDown = () => this.tryInteract();
        this.onEnterDown = () => {
            if (!this.dialogue.isActive) {
                this.tryInteract();
            }
        };
        this.onF8Down = () => this.toggleDevQuizLock();
        this.onWindowKeyDown = (event) => {
            if (event?.code === 'F8' || event?.key === 'F8') {
                event.preventDefault?.();
                this.toggleDevQuizLock();
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
        this.f8Key.on('down', this.onF8Down);
        this.input.on('pointerdown', this.onPointerDown);
        window?.addEventListener?.('keydown', this.onWindowKeyDown);
        this.events.once('shutdown', () => this.cleanup());

        if (this.isDevQuizViewLocked()) {
            this.mode = 'quiz';
            GameState.set('stage4BriefingDone', true);
            GameState.set('stage4QuizActive', true);
            this.bottomHud.container?.setVisible(false);
            this.bottomHud.setInteractionVisible(false);
            this.createQuizOverlay();
            this.renderQuestion();
        } else {
            this.time.delayedCall(220, () => this.playBriefing());
        }
        this.refreshHud();
    }

    drawBackground() {
        const bgKey = ASSETS.backgrounds.inspectionGate.key;
        if (hasTexture(this, bgKey)) {
            this.add.image(CENTER_X, GAME_HEIGHT / 2, bgKey)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setOrigin(0.5)
                .setDepth(0);
            return;
        }

        const g = this.add.graphics().setDepth(0);
        g.fillStyle(0x060812, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        g.fillStyle(0x121731, 1).fillRect(0, 0, GAME_WIDTH, 178);
        g.fillStyle(0x1b2240, 1).fillRect(0, 178, GAME_WIDTH, 264);
        g.fillStyle(0x0c1020, 1).fillRect(0, 442, GAME_WIDTH, 278);
        g.fillStyle(0x090714, 0.75).fillRoundedRect(960, 200, 210, 250, 10);
        g.fillStyle(0x24183f, 0.8).fillRoundedRect(980, 228, 168, 86, 8);
        g.fillStyle(0x24183f, 0.8).fillRoundedRect(980, 328, 168, 86, 8);
        g.fillStyle(0x0f1220, 0.88).fillRoundedRect(70, 396, 520, 86, 8);
    }

    createHud() {
        this.topHud = new TopHUD(this, { title: chapter4Data.title });
        this.bottomHud = new BottomHUD(this);
        this.bottomHud.setInteractionPrompt(chapter4Data.roomPrompt);
        this.bottomHud.setInteractionVisible(true);
    }

    createWorld() {
        this.player = new Player(this, chapter4Data.playerStart.x, chapter4Data.playerStart.y);
        this.player.speed = 260;
        this.auditFirmAccountant?.destroy?.();
        this.auditFirmAccountantLabel?.destroy?.();
        const accountantX = chapter4Data.inspectionDesk.x + chapter4Data.inspectionDesk.width - 78;
        const accountantY = chapter4Data.inspectionDesk.y + 32;
        this.auditFirmAccountantLabel = this.add.text(accountantX, accountantY + 88, '회계사', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '14px',
            color: '#f8f3ff',
            backgroundColor: 'rgba(18, 12, 34, 0.45)'
        }).setOrigin(0.5, 1).setDepth(3);
        this.auditFirmAccountant = hasTexture(this, ASSETS.characters.auditFirmAccountantIdle.key)
            ? this.add.image(accountantX, accountantY, ASSETS.characters.auditFirmAccountantIdle.key)
                .setDisplaySize(86, 136)
                .setFlipX(true)
                .setDepth(2)
            : this.add.rectangle(accountantX, accountantY, 86, 136, 0x7a5cff, 0.18)
                .setStrokeStyle(2, 0x7a5cff, 0.45)
                .setDepth(2);

        this.interactables = [
            new InteractableObject(this, {
                id: 'assistant',
                name: 'KCA 간사',
                prompt: chapter4Data.roomPrompt,
                x: chapter4Data.assistantNpc.x,
                y: chapter4Data.assistantNpc.y,
                width: chapter4Data.assistantNpc.width,
                height: chapter4Data.assistantNpc.height,
                textureKey: ASSETS.characters.kcaAssistantIdle.key,
                color: 0xff4f86,
                animated: false
            }, () => this.handleInteraction('assistant')),
            new InteractableObject(this, {
                id: 'inspectionDesk',
                name: '점검 데스크',
                prompt: chapter4Data.inspectionDeskPrompt,
                x: chapter4Data.inspectionDesk.x,
                y: chapter4Data.inspectionDesk.y,
                width: chapter4Data.inspectionDesk.width,
                height: chapter4Data.inspectionDesk.height,
                color: 0x75f6ff,
                animated: false,
                hideVisuals: true,
                labelOnly: true
            }, () => this.handleInteraction('inspectionDesk')),
        ];

        this.interaction = new InteractionManager(
            this,
            this.player,
            this.interactables,
            (prompt) => this.bottomHud.setInteractionPrompt(prompt)
        );
    }

    update() {
        const blocked = this.dialogue.isActive || this.mode !== 'field';
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
            if (!GameState.get('stage4BriefingDone')) {
                this.playBriefing();
                return;
            }

            this.dialogue.say([
                { speaker: 'KCA Assistant', text: 'Please check the next item.' }
            ]);
            return;
        }

        if (id === 'inspectionDesk') {
            if (!GameState.get('stage4BriefingDone')) {
                this.playBriefing();
                return;
            }

            if (GameState.get('stage4Cleared')) {
                this.dialogue.say([
                    { speaker: 'KCA Assistant', text: 'Please review the requested item.' }
                ]);
                return;
            }

            this.openInspectionQuiz();
        }
    }

    playBriefing() {
        if (GameState.get('stage4BriefingDone') || this.dialogue.isActive) {
            return;
        }

        this.mode = 'briefing';
        this.bottomHud.setInteractionVisible(false);
        this.dialogue.say(chapter4Data.briefingLines, () => {
            GameState.set('stage4BriefingDone', true);
            this.mode = 'field';
            this.bottomHud.setInteractionVisible(true);
            this.bottomHud.setInteractionPrompt(chapter4Data.roomPrompt);
        });
    }

    openInspectionQuiz() {
        if (this.quizOverlay || this.resultOverlay || this.transitionLocked) {
            return;
        }

        this.mode = 'quiz';
        GameState.set('stage4QuizActive', true);
        if (this.isDevQuizViewLocked()) {
            this.saveDevQuizView();
        }
        this.bottomHud.container?.setVisible(false);
        this.bottomHud.setInteractionVisible(false);
        this.createQuizOverlay();
        this.renderQuestion();
    }

    toggleDevQuizLock() {
        if (!import.meta.env.DEV || typeof window === 'undefined') {
            return;
        }

        const nextLocked = !this.isDevQuizViewLocked();
        try {
            window.sessionStorage.setItem(DEV_STAGE4_LOCK_KEY, nextLocked ? '1' : '0');
        } catch {
            // Ignore storage failures in dev.
        }

        if (nextLocked) {
            GameState.set('stage4BriefingDone', true);
            GameState.set('stage4QuizActive', true);
            this.mode = 'quiz';
            this.bottomHud.container?.setVisible(false);
            this.bottomHud.setInteractionVisible(false);
            this.clearQuizOverlay();
            this.restoreDevQuizView();
            this.createQuizOverlay();
            this.renderQuestion();
            this.showDevLockIndicator('LOCK ON');
            return;
        }

        this.clearDevQuizView();
        GameState.set('stage4QuizActive', false);
        this.mode = 'field';
        this.clearQuizOverlay();
        this.topHud?.container?.setVisible(true);
        this.bottomHud?.container?.setVisible(true);
        this.bottomHud?.setInteractionVisible(true);
        this.bottomHud?.setInteractionPrompt(GameState.get('stage4Cleared') ? '' : chapter4Data.roomPrompt);
        this.refreshHud();
        this.showDevLockIndicator('LOCK OFF');
    }

    showDevLockIndicator(text) {
        if (!import.meta.env.DEV) {
            return;
        }

        this.devLockIndicator?.destroy?.();
        this.devLockIndicator = this.add.text(GAME_WIDTH - 24, 24, text, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#fff5c7',
            backgroundColor: 'rgba(7, 10, 20, 0.82)',
            padding: { left: 10, right: 10, top: 6, bottom: 6 }
        })
            .setOrigin(1, 0)
            .setScrollFactor(0)
            .setDepth(2000);

        this.time.delayedCall(1200, () => {
            this.devLockIndicator?.destroy?.();
            this.devLockIndicator = null;
        });
    }

    createQuizOverlay() {
        this.quizOverlay?.destroy(true);
        this.clearQuizNodes();
        this.quizOverlay = this.add.container(0, 0).setDepth(980);

        const background = hasTexture(this, ASSETS.backgrounds.inspectionGateQuiz.key)
            ? this.add.image(CENTER_X, GAME_HEIGHT / 2, ASSETS.backgrounds.inspectionGateQuiz.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setOrigin(0.5)
                .setDepth(979)
            : null;
        const shade = this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02030a, 0.18)
            .setOrigin(0.5)
            .setDepth(980);
        const leftPanel = this.add.rectangle(QUIZ_LAYOUT.leftPanel.x, QUIZ_LAYOUT.leftPanel.y, QUIZ_LAYOUT.leftPanel.width, QUIZ_LAYOUT.leftPanel.height, 0x11172a, 0)
            .setOrigin(0, 0)
            .setStrokeStyle(0, 0x000000, 0);
        const rightPanel = this.add.rectangle(QUIZ_LAYOUT.rightPanel.x, QUIZ_LAYOUT.rightPanel.y, QUIZ_LAYOUT.rightPanel.width, QUIZ_LAYOUT.rightPanel.height, 0x11172a, 0)
            .setOrigin(0, 0)
            .setStrokeStyle(0, 0x000000, 0);
        const portrait = hasTexture(this, ASSETS.characters.kcaTeamLeaderIdle.key)
            ? this.add.image(QUIZ_LAYOUT.leftPanel.x + 195, QUIZ_LAYOUT.leftPanel.y + 112, ASSETS.characters.kcaTeamLeaderIdle.key)
                .setDisplaySize(90, 144)
                .setFlipX(true)
            : this.add.rectangle(QUIZ_LAYOUT.leftPanel.x + 195, QUIZ_LAYOUT.leftPanel.y + 112, 90, 144, 0xff4f86, 0.18)
                .setStrokeStyle(2, 0xff4f86, 0.6);
        if (portrait?.setFlipX && portrait?.texture) {
            portrait.setFlipX(true);
            portrait.setScale(-Math.abs(portrait.scaleX || 1), portrait.scaleY || 1);
        }
        const questionLabel = this.add.text(QUIZ_LAYOUT.leftPanel.x + 265, QUIZ_LAYOUT.leftPanel.y + 54, 'KCA 팀장', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '14px',
            color: '#ffd36e',
            backgroundColor: 'rgba(18, 12, 34, 0.62)',
            padding: { left: 8, right: 8, top: 3, bottom: 3 }
        }).setOrigin(0, 0.5);
        const questionText = this.add.text(QUIZ_LAYOUT.leftPanel.x + 265, QUIZ_LAYOUT.leftPanel.y + 78, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#000000',
            wordWrap: { width: 446 },
            lineSpacing: 6
        });
        const statusBox = this.add.rectangle(QUIZ_LAYOUT.rightPanel.x + 66, QUIZ_LAYOUT.rightPanel.y + 84, 250, 360, 0x090714, 0.5)
            .setOrigin(0, 0)
            .setVisible(false);
        const feedbackBox = this.add.rectangle(QUIZ_LAYOUT.feedback.x, QUIZ_LAYOUT.feedback.y, QUIZ_LAYOUT.feedback.width, QUIZ_LAYOUT.feedback.height, 0x05050a, 0.28)
            .setOrigin(0.5)
            .setStrokeStyle(0, 0x000000, 0);
        const feedbackText = this.add.text(QUIZ_LAYOUT.feedback.x, QUIZ_LAYOUT.feedback.y, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#f8f3ff',
            align: 'center',
            wordWrap: { width: 1100 }
        }).setOrigin(0.5);

        this.quizOverlay.add([
            background,
            shade,
            leftPanel,
            rightPanel,
            portrait,
            questionLabel,
            questionText,
            statusBox,
            feedbackBox,
            feedbackText
        ]);

        this.questionText = questionText;
        this.statusText = null;
        this.feedbackText = feedbackText;
        this.questionPortrait = portrait;
        this.questionLabel = questionLabel;
        this.questionPortraitLabel = null;
        this.statusNodes = [];
    }

    renderQuestion() {
        if (!this.quizOverlay) {
            return;
        }

        this.clearAnswerButtons();
        this.transitionLocked = false;
        this.mode = 'quiz';

        const question = chapter4Data.questions[this.currentQuestionIndex];
        if (!question) {
            this.completeInspectionGate();
            return;
        }

        GameState.set('stage4QuestionIndex', this.currentQuestionIndex);

        this.questionText?.setText(question.question);
        this.questionLabel?.setText(question.speaker === '회계법인 회계사' ? '회계사' : 'KCA 팀장');
        if (this.questionPortrait?.setTexture && this.questionPortrait?.setDisplaySize) {
            if (question.speaker === '회계법인 회계사' && hasTexture(this, ASSETS.characters.auditFirmAccountantIdle.key)) {
                this.questionPortrait.setTexture(ASSETS.characters.auditFirmAccountantIdle.key);
                this.questionPortrait.setDisplaySize(80, 136);
                this.questionPortrait.setFlipX(true);
                this.questionPortrait.setScale(-Math.abs(this.questionPortrait.scaleX || 1), this.questionPortrait.scaleY || 1);
            } else {
                this.questionPortrait.setTexture(ASSETS.characters.kcaTeamLeaderIdle.key);
                this.questionPortrait.setDisplaySize(90, 144);
                this.questionPortrait.setFlipX(true);
                this.questionPortrait.setScale(-Math.abs(this.questionPortrait.scaleX || 1), this.questionPortrait.scaleY || 1);
            }
        }
        this.renderStatusLines(question.statusLines);
        this.setFeedback('', false);
        if (this.isDevQuizViewLocked()) {
            this.saveDevQuizView();
        }

        const shuffledAnswers = this.shuffleAnswers(question.answers);
        this.answerButtons = shuffledAnswers.map((answer, index) => {
            const layout = QUIZ_LAYOUT.answerButtons[index];
            return this.createAnswerButton(layout.x, layout.y, layout.width, layout.height, answer.text, () => this.handleAnswerSelection(answer));
        });
        this.quizOverlay.add(this.answerButtons.flatMap((button) => button.nodes));
    }

    createAnswerButton(x, y, width, height, label, onClick) {
        const leftExtend = 33;
        const rightExtend = 20;
        const buttonX = x - leftExtend / 2 + rightExtend / 2;
        const buttonWidth = width + leftExtend + rightExtend;
        let bg;
        let hoverBg = null;

        if (hasTexture(this, ASSETS.ui.buttonNormal.key)) {
            bg = this.add.image(buttonX, y, ASSETS.ui.buttonNormal.key).setDisplaySize(buttonWidth, height).setDepth(982).setAlpha(0.12);
            if (hasTexture(this, ASSETS.ui.buttonHover.key)) {
                hoverBg = this.add.image(buttonX, y, ASSETS.ui.buttonHover.key).setDisplaySize(buttonWidth, height).setVisible(false).setDepth(982).setAlpha(0.68);
            }
        } else {
            bg = this.add.rectangle(buttonX, y, buttonWidth, height, 0x24183f, 0.14).setStrokeStyle(0, 0x000000, 0).setDepth(982);
        }

        const text = this.add.text(x - width / 2 + 18, y, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#f8f3ff',
            align: 'left',
            wordWrap: { width: width - 36 },
            lineSpacing: 4
        }).setOrigin(0, 0.5).setDepth(983);

        const hit = this.add.rectangle(buttonX, y, buttonWidth, height, 0x000000, 0).setDepth(984).setInteractive({ useHandCursor: true });
        let selected = false;
        let enabled = true;

        const applyState = () => {
            if (!enabled) {
                bg?.setAlpha?.(0.08);
                hoverBg?.setAlpha?.(0.08);
                text?.setAlpha?.(0.58);
                return;
            }

            if (selected) {
                text?.setColor?.('#fff5c7');
                text?.setFontStyle?.('bold');
                return;
            }

            text?.setColor?.('#f8f3ff');
            text?.setFontStyle?.('normal');
        };

        hit.on('pointerover', () => {
            if (!enabled || selected) {
                return;
            }
            text.setColor('#f8f3ff');
            text.setFontStyle('normal');
            if (hoverBg) {
                bg.setVisible(false);
                hoverBg.setVisible(true);
            } else {
                bg.setFillStyle(0xffffff, 0.14);
            }
        });
        hit.on('pointerout', () => {
            if (!enabled) {
                return;
            }
            if (!selected) {
                text.setColor('#f8f3ff');
                text.setFontStyle('normal');
            }
            if (hoverBg) {
                bg.setVisible(true);
                hoverBg.setVisible(false);
            } else {
                bg.setFillStyle(0x24183f, 0.14);
            }
        });
        hit.on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            if (!enabled) {
                return;
            }
            onClick?.();
        });
        bg.setInteractive?.({ useHandCursor: true })?.on?.('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            if (enabled) {
                onClick?.();
            }
        });
        hoverBg?.setInteractive?.({ useHandCursor: true })?.on?.('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            if (enabled) {
                onClick?.();
            }
        });

        return {
            bg,
            hoverBg,
            text,
            hit,
            nodes: [bg, hoverBg, text, hit].filter(Boolean),
            setSelected(nextSelected) {
                selected = Boolean(nextSelected);
                applyState();
            },
            setEnabled(nextEnabled) {
                enabled = Boolean(nextEnabled);
                if (enabled) {
                    hit.setInteractive({ useHandCursor: true });
                    text.setAlpha(1);
                } else {
                    hit.disableInteractive();
                }
                applyState();
            }
        };
    }

    handleAnswerSelection(answer) {
        if (this.transitionLocked || this.mode !== 'quiz') {
            return;
        }

        const question = chapter4Data.questions[this.currentQuestionIndex];
        if (!question) {
            return;
        }

        if (answer.correct) {
            this.transitionLocked = true;
            GameState.set('stage4CorrectCount', (GameState.get('stage4CorrectCount') || 0) + 1);
            this.setFeedback(question.correctFeedback, true);
            this.answerButtons.forEach((button) => button.setEnabled(false));

            this.time.delayedCall(800, () => {
                this.currentQuestionIndex += 1;
                GameState.set('stage4QuestionIndex', this.currentQuestionIndex);
                if (this.currentQuestionIndex >= chapter4Data.questions.length) {
                    this.completeInspectionGate();
                    return;
                }
                this.renderQuestion();
            });
            return;
        }

        GameState.decreaseHp(10);
        GameState.set('stage4WrongCount', (GameState.get('stage4WrongCount') || 0) + 1);
        this.cameras.main.shake(120, 0.0035);
        this.setFeedback(question.wrongFeedback, false);

        if ((GameState.get('hp') ?? 0) <= 0) {
            this.transitionLocked = true;
            this.time.delayedCall(220, () => this.scene.start('GameOverScene'));
            return;
        }

        this.refreshHud();
        this.time.delayedCall(320, () => {
            this.answerButtons.forEach((button) => button.setSelected(false));
        });
    }

    shuffleAnswers(answers) {
        const shuffled = [...(answers || [])];
        for (let i = shuffled.length - 1; i > 0; i -= 1) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    setFeedback(message, success = false) {
        if (!this.feedbackText) {
            return;
        }

        this.feedbackText.setText(message || '');
        this.feedbackText.setColor(success ? '#c9ffef' : '#fff0c4');
        this.feedbackText.setAlpha(1);
    }

    clearStatusNodes() {
        this.statusNodes?.forEach((node) => node?.destroy?.());
        this.statusNodes = [];
    }

    renderStatusLines(lines = []) {
        this.clearStatusNodes();
        if (!this.quizOverlay) {
            return;
        }

        const baseX = QUIZ_LAYOUT.rightPanel.x + 180;
        const baseY = QUIZ_LAYOUT.rightPanel.y + 70;
        const lineStep = 23;
        const baseStyle = {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#000000'
        };
        const boldLabels = new Set([
            '현재 시점',
            '전체 집행률',
            '비세목별 집행률',
            '특이사항',
            '주요 집행 내역',
            '구매 장비',
            '당초 계획',
            '현재 상태'
        ]);

        lines.forEach((rawLine, index) => {
            const line = String(rawLine ?? '');
            const y = baseY + (index * lineStep);

            if (!line.trim()) {
                return;
            }

            const colonIndex = line.indexOf(':');
            if (colonIndex >= 0) {
                const prefix = line.slice(0, colonIndex + 1);
                const suffix = line.slice(colonIndex + 1);
                const prefixLabel = prefix.replace(/:$/, '');
                if (boldLabels.has(prefixLabel)) {
                    const prefixText = this.add.text(baseX, y, prefix, {
                        ...baseStyle,
                        fontStyle: 'bold'
                    }).setOrigin(0, 0);
                    const prefixWidth = prefixText.displayWidth || prefixText.width || 0;
                    const suffixText = this.add.text(baseX + prefixWidth, y, suffix, baseStyle).setOrigin(0, 0);
                    this.quizOverlay.add([prefixText, suffixText]);
                    this.statusNodes.push(prefixText, suffixText);
                    return;
                }

                const fullText = this.add.text(baseX, y, line, baseStyle).setOrigin(0, 0);
                this.quizOverlay.add(fullText);
                this.statusNodes.push(fullText);
                return;
            }

            const headingText = this.add.text(baseX, y, line, {
                ...baseStyle,
                fontStyle: boldLabels.has(line) ? 'bold' : 'normal'
            }).setOrigin(0, 0);
            this.quizOverlay.add(headingText);
            this.statusNodes.push(headingText);
        });
    }

    completeInspectionGate() {
        if (GameState.get('stage4Cleared')) {
            return;
        }

        GameState.set('stage4Cleared', true);
        GameState.set('stage4Failed', false);
        GameState.set('stage4QuizActive', false);
        GameState.set('stage4QuestionIndex', chapter4Data.questions.length);
        GameState.set('timeRunning', false);
        this.transitionLocked = true;

        this.showResultOverlay();
    }

    showResultOverlay() {
        this.clearQuizOverlay();
        this.topHud?.container?.setVisible(false);
        this.bottomHud?.container?.setVisible(false);

        this.resultOverlay?.destroy(true);
        this.resultOverlay = this.add.container(0, 0).setDepth(990);

        const shade = this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02030a, 0.76)
            .setOrigin(0.5);
        const panel = this.add.rectangle(CENTER_X, 348, 840, 340, 0x11172a, 0.92)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0x9d5dd6, 0.78);
        const title = this.add.text(CENTER_X, 178, 'Stage 4 Inspection Complete', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '40px',
            color: '#fff5c7',
            stroke: '#34145c',
            strokeThickness: 5
        }).setOrigin(0.5);
        const summary = this.add.text(CENTER_X, 262, [
            `????????椰???????????????? ${chapter4Data.questions.length}`,
            `???????嫄???????????????? ${GameState.get('stage4CorrectCount') || 0}`,
            `????????釉먮폁??????饔낅떽???????꾩렯???????? ${GameState.get('stage4WrongCount') || 0}`,
            `??? HP: ${GameState.get('hp') ?? 0}`
        ].join('\n'), {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '20px',
            color: '#f8f3ff',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);
        const body = this.add.text(CENTER_X, 404, '?????????????沅걔??? ??????????????諛몃마嶺뚮?????????????硫λ젒??\n??????????????????? ??????椰?????????癲됱빖???嶺???????????????????? ??????????????????癲됱빖???嶺??亦껋꼷伊볡댚?쒗닧???????耀붾굝????????????, ??????椰????????????????傭?끆?????용벥????????????????嶺뚮ㅎ?볠꽴??????????????????????????????????????살몝??', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#c9ffef',
            align: 'center',
            wordWrap: { width: 680 },
            lineSpacing: 8
        }).setOrigin(0.5);

        this.createResultButton(CENTER_X - 160, 580, 'Back to Room', () => {
            this.returnToRoom();
        });
        this.createResultButton(CENTER_X + 160, 580, 'Retry Inspection', () => {
            this.restartStage4();
        });

        this.resultOverlay.add([shade, panel, title, summary, body].filter(Boolean));
    }

    createResultButton(x, y, label, onClick) {
        let bg;
        let hoverBg = null;
        if (hasTexture(this, ASSETS.ui.buttonNormal.key)) {
            bg = this.add.image(x, y, ASSETS.ui.buttonNormal.key).setDisplaySize(250, 54).setDepth(991);
            if (hasTexture(this, ASSETS.ui.buttonHover.key)) {
                hoverBg = this.add.image(x, y, ASSETS.ui.buttonHover.key).setDisplaySize(250, 54).setVisible(false).setDepth(991);
            }
        } else {
            bg = this.add.rectangle(x, y, 250, 54, 0x24183f, 1).setStrokeStyle(0, 0x000000, 0).setDepth(991);
        }

        const text = this.add.text(x, y, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '19px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(992);

        const hit = this.add.rectangle(x, y, 250, 54, 0x000000, 0).setDepth(993).setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            if (hoverBg) {
                bg.setVisible(false);
                hoverBg.setVisible(true);
            } else {
                bg.setFillStyle(0x322159, 1);
            }
        });
        hit.on('pointerout', () => {
            if (hoverBg) {
                bg.setVisible(true);
                hoverBg.setVisible(false);
            } else {
                bg.setFillStyle(0x24183f, 1);
            }
        });
        hit.on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            onClick?.();
        });
        text.setInteractive({ useHandCursor: true }).on('pointerdown', (pointer, localX, localY, event) => {
            event?.stopPropagation?.();
            onClick?.();
        });

        this.resultOverlay.add([bg, hoverBg, text, hit].filter(Boolean));
    }

    returnToRoom() {
        this.clearResultOverlay();
        this.mode = 'field';
        GameState.set('timeRunning', true);
        GameState.set('stage4QuizActive', false);
        if (this.isDevQuizViewLocked()) {
            this.saveDevQuizView();
        }
        this.topHud?.container?.setVisible(true);
        this.bottomHud?.container?.setVisible(true);
        this.bottomHud?.setInteractionVisible(true);
        this.bottomHud?.setInteractionPrompt(GameState.get('stage4Cleared') ? '' : chapter4Data.roomPrompt);
        this.refreshHud();
    }

    restartStage4() {
        GameState.set('hp', 100);
        GameState.set('stage4BriefingDone', false);
        GameState.set('stage4QuizActive', false);
        GameState.set('stage4QuestionIndex', 0);
        GameState.set('stage4QuestionTotal', chapter4Data.questions.length);
        GameState.set('stage4CorrectCount', 0);
        GameState.set('stage4WrongCount', 0);
        GameState.set('stage4Cleared', false);
        GameState.set('stage4Failed', false);
        GameState.set('timeRunning', true);
        this.clearDevQuizView();
        this.scene.restart();
    }

    getDevQuizView() {
        if (!import.meta.env.DEV || typeof window === 'undefined') {
            return null;
        }

        try {
            const raw = window.sessionStorage.getItem(DEV_STAGE4_VIEW_KEY);
            if (!raw) {
                return null;
            }

            const parsed = JSON.parse(raw);
            return Number.isInteger(parsed?.questionIndex) ? parsed : null;
        } catch {
            return null;
        }
    }

    saveDevQuizView() {
        if (!import.meta.env.DEV || typeof window === 'undefined') {
            return;
        }

        try {
            window.sessionStorage.setItem(DEV_STAGE4_VIEW_KEY, JSON.stringify({
                questionIndex: this.currentQuestionIndex
            }));
        } catch {
            // Ignore storage failures in dev.
        }
    }

    restoreDevQuizView() {
        const saved = this.getDevQuizView();
        if (!saved) {
            return;
        }

        const maxIndex = Math.max(0, chapter4Data.questions.length - 1);
        this.currentQuestionIndex = Phaser.Math.Clamp(saved.questionIndex, 0, maxIndex);
    }

    clearDevQuizView() {
        if (!import.meta.env.DEV || typeof window === 'undefined') {
            return;
        }

        try {
            window.sessionStorage.removeItem(DEV_STAGE4_VIEW_KEY);
        } catch {
            // Ignore storage failures in dev.
        }
    }

    clearQuizNodes() {
        this.questionText?.destroy();
        this.questionLabel?.destroy();
        this.statusText?.destroy();
        this.clearStatusNodes();
        this.questionPortrait?.destroy();
        this.questionPortraitLabel?.destroy();
        this.feedbackText?.destroy();
        this.questionText = null;
        this.questionLabel = null;
        this.statusText = null;
        this.statusNodes = [];
        this.questionPortrait = null;
        this.questionPortraitLabel = null;
        this.feedbackText = null;
    }

    clearAnswerButtons() {
        this.answerButtons.forEach((button) => {
            button.nodes?.forEach((node) => node?.destroy?.());
        });
        this.answerButtons = [];
    }

    clearQuizOverlay() {
        this.clearAnswerButtons();
        this.clearQuizNodes();
        this.quizOverlay?.destroy(true);
        this.quizOverlay = null;
    }

    clearResultOverlay() {
        this.resultOverlay?.destroy(true);
        this.resultOverlay = null;
    }

    refreshHud() {
        this.topHud?.refresh?.();
        this.bottomHud?.refresh?.();
    }

    tryInteract() {
        if (!this.dialogue.isActive && this.mode === 'field') {
            this.interaction.interact();
        }
    }

    cleanup() {
        this.spaceKey?.off('down', this.onSpaceDown);
        this.enterKey?.off('down', this.onEnterDown);
        this.input.off('pointerdown', this.onPointerDown);
        window?.removeEventListener?.('keydown', this.onWindowKeyDown);
        this.clearQuizOverlay();
        this.clearResultOverlay();
        this.devLockIndicator?.destroy?.();
        this.devLockIndicator = null;
        this.auditFirmAccountant?.destroy?.();
        this.auditFirmAccountant = null;
        this.auditFirmAccountantLabel?.destroy?.();
        this.auditFirmAccountantLabel = null;
    }
}




