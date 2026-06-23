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

const QUIZ_LAYOUT = {
    backdrop: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, width: GAME_WIDTH, height: GAME_HEIGHT },
    leftPanel: { x: 50, y: 110, width: 560, height: 470 },
    rightPanel: { x: 670, y: 110, width: 560, height: 470 },
    feedback: { x: CENTER_X, y: 618, width: 1140, height: 52 },
    answerButtons: [
        { x: 74, y: 410, width: 228, height: 56 },
        { x: 384, y: 410, width: 228, height: 56 },
        { x: 74, y: 490, width: 228, height: 56 },
        { x: 384, y: 490, width: 228, height: 56 }
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
        this.statusText = null;
        this.questionPortrait = null;
        this.questionPortraitLabel = null;
        this.roomHintText = null;
        this.onSpaceDown = null;
        this.onEnterDown = null;
        this.onPointerDown = null;
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
                { speaker: 'KCA 간사', text: '실태점검에서는 사유와 향후 계획, 그리고 증빙 상태를 함께 설명하시면 됩니다.' }
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
                    { speaker: 'KCA 간사', text: '실태점검 컨설팅을 이미 마쳤습니다. 다음 준비를 이어가세요.' }
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
        this.bottomHud.container?.setVisible(false);
        this.bottomHud.setInteractionVisible(false);
        this.createQuizOverlay();
        this.renderQuestion();
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
            ? this.add.image(QUIZ_LAYOUT.leftPanel.x + 220, QUIZ_LAYOUT.leftPanel.y + 132, ASSETS.characters.kcaTeamLeaderIdle.key)
                .setDisplaySize(116, 160)
                .setFlipX(true)
            : this.add.rectangle(QUIZ_LAYOUT.leftPanel.x + 220, QUIZ_LAYOUT.leftPanel.y + 132, 116, 160, 0xff4f86, 0.18)
                .setStrokeStyle(2, 0xff4f86, 0.6);
        const portraitLabel = this.add.text(QUIZ_LAYOUT.leftPanel.x + 136, QUIZ_LAYOUT.leftPanel.y + 96, 'KCA 팀장님', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '14px',
            color: '#ffd36e',
            backgroundColor: 'rgba(18, 12, 34, 0.62)',
            padding: { left: 8, right: 8, top: 3, bottom: 3 }
        }).setOrigin(0.5);

        const questionText = this.add.text(QUIZ_LAYOUT.leftPanel.x + 286, QUIZ_LAYOUT.leftPanel.y + 88, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#000000',
            wordWrap: { width: 446 },
            lineSpacing: 6
        });

        const statusBox = this.add.rectangle(QUIZ_LAYOUT.rightPanel.x + 66, QUIZ_LAYOUT.rightPanel.y + 84, 250, 360, 0x090714, 0.5)
            .setOrigin(0, 0)
            .setVisible(false);
        const statusText = this.add.text(QUIZ_LAYOUT.rightPanel.x + 190, QUIZ_LAYOUT.rightPanel.y + 70, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#000000',
            wordWrap: { width: 468 },
            lineSpacing: 8
        });

        const feedbackBox = this.add.rectangle(QUIZ_LAYOUT.feedback.x, QUIZ_LAYOUT.feedback.y, QUIZ_LAYOUT.feedback.width, QUIZ_LAYOUT.feedback.height, 0x05050a, 0.76)
            .setOrigin(0.5)
            .setStrokeStyle(1, 0x9d5dd6, 0.65);
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
            portraitLabel,
            questionText,
            statusBox,
            statusText,
            feedbackBox,
            feedbackText
        ]);

        this.questionText = questionText;
        this.statusText = statusText;
        this.feedbackText = feedbackText;
        this.questionPortrait = portrait;
        this.questionPortraitLabel = portraitLabel;
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
        this.statusText?.setText(question.statusLines.join('\n'));
        this.setFeedback('', false);

        this.answerButtons = question.answers.map((answer, index) => {
            const layout = QUIZ_LAYOUT.answerButtons[index];
            return this.createAnswerButton(layout.x + 180, layout.y, layout.width, layout.height, answer.text, () => this.handleAnswerSelection(index));
        });
        this.quizOverlay.add(this.answerButtons.flatMap((button) => button.nodes));
    }

    createAnswerButton(x, y, width, height, label, onClick) {
        let bg;
        let hoverBg = null;

        if (hasTexture(this, ASSETS.ui.buttonNormal.key)) {
            bg = this.add.image(x, y, ASSETS.ui.buttonNormal.key).setDisplaySize(width, height).setDepth(982).setAlpha(0.16);
            if (hasTexture(this, ASSETS.ui.buttonHover.key)) {
                hoverBg = this.add.image(x, y, ASSETS.ui.buttonHover.key).setDisplaySize(width, height).setVisible(false).setDepth(982).setAlpha(0.3);
            }
        } else {
            bg = this.add.rectangle(x, y, width, height, 0x24183f, 1).setStrokeStyle(0, 0x000000, 0).setDepth(982).setAlpha(0.16);
        }

        const text = this.add.text(x + 110, y, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#f8f3ff',
            align: 'center',
            wordWrap: { width: width - 10 },
            lineSpacing: 4
        }).setOrigin(0.5).setDepth(983);

        const hit = this.add.rectangle(x, y, width, height, 0x000000, 0).setDepth(984).setInteractive({ useHandCursor: true });
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
            text.setColor('#fff5c7');
        });
        hit.on('pointerout', () => {
            if (!enabled) {
                return;
            }
            if (!selected) {
                text.setColor('#f8f3ff');
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

    handleAnswerSelection(index) {
        if (this.transitionLocked || this.mode !== 'quiz') {
            return;
        }

        const question = chapter4Data.questions[this.currentQuestionIndex];
        if (!question) {
            return;
        }

        const answer = question.answers[index];
        if (!answer) {
            return;
        }

        this.answerButtons.forEach((button, buttonIndex) => button.setSelected(buttonIndex === index));

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

    setFeedback(message, success = false) {
        if (!this.feedbackText) {
            return;
        }

        this.feedbackText.setText(message || '');
        this.feedbackText.setColor(success ? '#c9ffef' : '#fff0c4');
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
        const title = this.add.text(CENTER_X, 178, '실태점검 컨설팅 완료', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '40px',
            color: '#fff5c7',
            stroke: '#34145c',
            strokeThickness: 5
        }).setOrigin(0.5);
        const summary = this.add.text(CENTER_X, 262, [
            `총 질문 수: ${chapter4Data.questions.length}`,
            `정답 수: ${GameState.get('stage4CorrectCount') || 0}`,
            `오답 수: ${GameState.get('stage4WrongCount') || 0}`,
            `남은 HP: ${GameState.get('hp') ?? 0}`
        ].join('\n'), {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '20px',
            color: '#f8f3ff',
            align: 'center',
            lineSpacing: 10
        }).setOrigin(0.5);
        const body = this.add.text(CENTER_X, 404, '실태점검 대응 완료!\n사업 현황, 집행률, 미집행 사유, 증빙 관리 상태를 점검했습니다.', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#c9ffef',
            align: 'center',
            wordWrap: { width: 680 },
            lineSpacing: 8
        }).setOrigin(0.5);

        this.createResultButton(CENTER_X - 160, 580, '방으로 돌아가기', () => {
            this.returnToRoom();
        });
        this.createResultButton(CENTER_X + 160, 580, '다시 점검하기', () => {
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
        this.scene.restart();
    }

    clearQuizNodes() {
        this.questionText?.destroy();
        this.statusText?.destroy();
        this.questionPortrait?.destroy();
        this.questionPortraitLabel?.destroy();
        this.feedbackText?.destroy();
        this.questionText = null;
        this.statusText = null;
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
        this.clearQuizOverlay();
        this.clearResultOverlay();
    }
}
