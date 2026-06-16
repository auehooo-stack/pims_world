import * as Phaser from 'phaser';
import { CENTER_X, CENTER_Y, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';
import { ASSETS, hasTexture, playBgmWithFade } from '../systems/AssetManager.js';
import { GameState } from '../systems/GameState.js';

const ASSISTANT_LINES = [
    '어서오세요, 신입 담당자님.\n지금 당신은 현실의 시간이 멈춘 PIMS 월드에 와있습니다.',
    '나가고 싶다고요? 방법은 하나뿐입니다.',
    '가상의 15개월 사업 사이클을 완수하고, 3월 31일의 반납 포털을 통과하세요. \n실패하면? 당신은 영원히 이 놀이공원의 청소부가 될 겁니다.',
    '자, 첫 번째 관문입니다. \nPIMS에 협약서류를 등록하고 사업비를 교부받으세요.'
];

const DEV_HOLD_ON_WORLD_TITLE = true;

const ASSISTANT_LAYOUT = {
    panelX: 666,
    panelY: 590,
    panelWidth: 870,
    panelHeight: 156,
    nameX: 243,
    nameY: 510,
    nameBoxWidth: 141,
    nameBoxHeight: 34,
    bodyX: 270,
    bodyY: 560,
    bodyFontSize: 22,
    bodyWrapWidth: 920,
    bodyLineSpacing: 4,
    promptX: 1148,
    promptY: 590
};

const ASSISTANT_DEPTHS = {
    background: 0,
    overlay: 1,
    character: 2,
    dialogue: 3,
    text: 4,
    button: 5
};

function formatAssistantDialogue(text) {
    if (!text || text.includes('\n')) {
        return text;
    }

    const midpoint = Math.floor(text.length / 2);
    let splitIndex = -1;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (let i = 0; i < text.length; i += 1) {
        if (text[i] !== ' ') {
            continue;
        }

        const distance = Math.abs(i - midpoint);
        if (distance < closestDistance) {
            closestDistance = distance;
            splitIndex = i;
        }
    }

    if (splitIndex > 0) {
        return `${text.slice(0, splitIndex)}\n${text.slice(splitIndex + 1)}`;
    }

    return `${text.slice(0, midpoint)}\n${text.slice(midpoint)}`;
}

export class OpeningScene extends Phaser.Scene {
    constructor() {
        super('OpeningScene');
        this.sceneObjects = [];
        this.currentPhase = 'login';
        this.assistantIndex = 0;
        this.transitioning = false;
        this.skipHandler = null;
        this.assistantKeyHandler = null;
        this.phaseAdvanceTimer = null;
        this.assistantAdvanceTimer = null;
        this.phaseToken = 0;
        this.assistantToken = 0;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x05040a);
        GameState.setTimeRunning(false);

        this.createSkipButton();

        this.input.keyboard.addCapture(Phaser.Input.Keyboard.KeyCodes.ESC);
        this.skipHandler = () => this.skipToStageOne();
        this.input.keyboard.on('keydown-ESC', this.skipHandler);
        this.assistantKeyHandler = (event) => {
            if (this.currentPhase === 'assistant' && !this.transitioning) {
                if (event.key === 'Enter') {
                    this.advanceAssistantLine();
                }
            }
        };
        this.input.keyboard.on('keydown', this.assistantKeyHandler);
        this.input.on('pointerdown', this.handlePointerDown, this);

        this.events.once('shutdown', () => this.cleanup());

        this.showLoginSequence();
    }

    track(object) {
        this.sceneObjects.push(object);
        return object;
    }

    clearSceneObjects() {
        this.tweens.killAll();
        this.clearScheduledTimers();
        this.sceneObjects.forEach((object) => object?.destroy?.());
        this.sceneObjects = [];
    }

    clearScheduledTimers() {
        this.phaseAdvanceTimer?.remove(false);
        this.assistantAdvanceTimer?.remove(false);
        this.phaseAdvanceTimer = null;
        this.assistantAdvanceTimer = null;
        this.phaseToken += 1;
        this.assistantToken += 1;
    }

    cleanup() {
        this.tweens.killAll();
        this.clearSceneObjects();
        if (this.skipHandler) {
            this.input.keyboard.off('keydown-ESC', this.skipHandler);
            this.skipHandler = null;
        }
        if (this.assistantKeyHandler) {
            this.input.keyboard.off('keydown', this.assistantKeyHandler);
            this.assistantKeyHandler = null;
        }
        this.input.off('pointerdown', this.handlePointerDown, this);
        this.skipButton?.destroy();
        this.skipButtonText?.destroy();
        this.skipButton = null;
        this.skipButtonText = null;
    }

    createSkipButton() {
        this.skipButton = this.add.rectangle(GAME_WIDTH - 88, GAME_HEIGHT - 46, 120, 30, 0x24183f, 0.92)
            .setStrokeStyle(2, 0xb86bff, 0.78)
            .setInteractive({ useHandCursor: true })
            .setDepth(ASSISTANT_DEPTHS.button + 20);
        this.skipButtonText = this.add.text(GAME_WIDTH - 88, GAME_HEIGHT - 46, 'Skip', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#f8f3ff'
        }).setOrigin(0.5).setDepth(ASSISTANT_DEPTHS.button + 21);

        this.skipButton.on('pointerdown', () => this.skipToStageOne());
        this.skipButton.on('pointerover', () => this.skipButton.setFillStyle(0x322159, 0.98));
        this.skipButton.on('pointerout', () => this.skipButton.setFillStyle(0x24183f, 0.92));
        this.skipButtonText.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.skipToStageOne());
        this.input.on('gameobjectdown', (pointer, gameObject) => {
            if (gameObject === this.skipButton || gameObject === this.skipButtonText) {
                this.skipToStageOne();
            }
        });
    }

    handlePointerDown(pointer) {
        if (this.transitioning) {
            return;
        }

        if (this.skipButton?.getBounds?.().contains(pointer.x, pointer.y)) {
            return;
        }

        if (this.currentPhase === 'assistant') {
            this.advanceAssistantLine();
            return;
        }

        this.advancePhase();
    }

    showLoginSequence() {
        this.currentPhase = 'login';
        this.clearSceneObjects();
        this.cameras.main.setBackgroundColor(0x05040a);
        playBgmWithFade(this, ASSETS.audio.bgmOpeningTitle.key, { loop: true, volume: 0.32 }, 900);

        if (hasTexture(this, ASSETS.backgrounds.openingLogin.key)) {
            this.track(this.add.image(CENTER_X, CENTER_Y, ASSETS.backgrounds.openingLogin.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT));
            this.track(this.add.rectangle(CENTER_X, CENTER_Y, GAME_WIDTH, GAME_HEIGHT, 0x05040a, 0.22));
        } else {
            const g = this.add.graphics();
            g.fillStyle(0x0b0a14, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            g.fillStyle(0x141027, 1).fillRect(0, 96, GAME_WIDTH, GAME_HEIGHT - 96);
            g.fillStyle(0x241348, 1).fillRect(0, 420, GAME_WIDTH, GAME_HEIGHT - 420);
            g.lineStyle(2, 0x25f3ff, 0.2);
            for (let x = -60; x < GAME_WIDTH + 60; x += 70) {
                g.lineBetween(x, 420, x + 120, GAME_HEIGHT);
            }
            g.fillStyle(0x05050a, 1).fillRoundedRect(356, 186, 568, 244, 8);
            g.lineStyle(2, 0x75f6ff, 0.4).strokeRoundedRect(356, 186, 568, 244, 8);
            this.track(g);
        }

        this.track(this.add.text(CENTER_X, 188, 'PIMS', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '72px',
            color: '#fff5c7',
            stroke: '#5c1dff',
            strokeThickness: 6,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                blur: 0,
                color: '#000000',
                fill: true,
                stroke: true
            }
        }).setOrigin(0.5));

        this.track(this.add.text(CENTER_X, 274, 'ICT기금 사업관리 시스템 접속 중...', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '26px',
            color: '#c9ffef'
        }).setOrigin(0.5));

        this.schedulePhaseAdvance('warning', 1700);
    }

    showWarningSequence() {
        this.currentPhase = 'warning';
        this.clearSceneObjects();
        this.cameras.main.setBackgroundColor(0x1a0608);
        playBgmWithFade(this, ASSETS.audio.bgmOpeningTitle.key, { loop: true, volume: 0.32 }, 900);

        const hasWarningBackground = hasTexture(this, ASSETS.opening.warningBackground.key);
        if (hasWarningBackground) {
            this.track(this.add.image(CENTER_X, CENTER_Y, ASSETS.opening.warningBackground.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT));
        }
        this.track(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x12070a, hasWarningBackground ? 0.26 : 1).setOrigin(0));
        this.track(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xff3344, hasWarningBackground ? 0.06 : 0.1).setOrigin(0));

        let warningPanel;
        if (hasTexture(this, ASSETS.opening.warningPanel.key)) {
            warningPanel = this.track(this.add.image(CENTER_X, CENTER_Y - 18, ASSETS.opening.warningPanel.key));
            warningPanel.setDisplaySize(720, 260);
        } else {
            warningPanel = this.track(this.add.rectangle(CENTER_X, CENTER_Y - 18, 720, 260, 0x3b0f14, 0.92)
                .setStrokeStyle(4, 0xff6b7a, 0.95));
        }

        const warningTitle = this.track(this.add.text(CENTER_X, 264, '[비정상적인 접근입니다.]', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '30px',
            color: '#fff5c7',
            stroke: '#7e1018',
            strokeThickness: 6,
            align: 'center',
            shadow: {
                offsetX: 2,
                offsetY: 2,
                blur: 0,
                color: '#000000',
                fill: true,
                stroke: true
            }
        }).setOrigin(0.5));

        const warningBody = this.track(this.add.text(CENTER_X, 324, '운영 체제를 강제 재구성합니다.', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '24px',
            color: '#ffe5ea',
            align: 'center'
        }).setOrigin(0.5));

        this.tweens.add({
            targets: [warningPanel, warningTitle, warningBody],
            alpha: { from: 0.25, to: 1 },
            duration: 110,
            yoyo: true,
            repeat: 5
        });

        this.schedulePhaseAdvance('glitch', 1700);
    }

    showGlitchSequence() {
        this.currentPhase = 'glitch';
        this.clearSceneObjects();
        this.cameras.main.setBackgroundColor(0x090714);
        playBgmWithFade(this, ASSETS.audio.bgmOpeningTitle.key, { loop: true, volume: 0.32 }, 900);

        const hasGlitchBackground = hasTexture(this, ASSETS.opening.glitchBackground.key);
        if (hasGlitchBackground) {
            this.track(this.add.image(CENTER_X, CENTER_Y, ASSETS.opening.glitchBackground.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT));
        }
        const base = this.track(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x090714, hasGlitchBackground ? 0.18 : 0.82).setOrigin(0));
        const tint = this.track(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x251348, hasGlitchBackground ? 0.12 : 0.22).setOrigin(0));
        this.tweens.add({
            targets: [base, tint],
            alpha: { from: 0.75, to: 1 },
            duration: 90,
            yoyo: true,
            repeat: 10
        });
        this.cameras.main.shake(1100, 0.009);

        const mainText = this.track(this.add.text(CENTER_X, 266, 'SYSTEM REBUILDING...', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '34px',
            color: '#75f6ff',
            stroke: '#1c0f35',
            strokeThickness: 6,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                blur: 0,
                color: '#000000',
                fill: true,
                stroke: true
            }
        }).setOrigin(0.5));
        const subText = this.track(this.add.text(CENTER_X, 322, 'PIMS WORLD LOADING...', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '24px',
            color: '#fff5c7'
        }).setOrigin(0.5));

        this.tweens.add({
            targets: [mainText, subText],
            alpha: { from: 0.35, to: 1 },
            duration: 120,
            yoyo: true,
            repeat: 8
        });

        for (let i = 0; i < 12; i += 1) {
            this.spawnGlitchFragment(90 + i * 140);
        }

        this.schedulePhaseAdvance('world', 2300);
    }

    spawnGlitchFragment(offset) {
        this.time.delayedCall(offset, () => {
            if (this.currentPhase !== 'glitch') {
                return;
            }

            const x = Phaser.Math.Between(80, GAME_WIDTH - 80);
            const y = Phaser.Math.Between(112, GAME_HEIGHT - 120);
            const fragmentText = ['PIMS', 'WORLD', 'REBUILD', '//', 'ACCESS', 'ERROR'][Phaser.Math.Between(0, 5)];
            const fragment = this.track(this.add.text(x, y, fragmentText, {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: `${Phaser.Math.Between(12, 24)}px`,
                color: Phaser.Math.Between(0, 1) ? '#75f6ff' : '#ff6b7a',
                stroke: '#090714',
                strokeThickness: 3
            }).setOrigin(0.5));

            const bar = this.track(this.add.rectangle(
                Phaser.Math.Between(0, GAME_WIDTH),
                Phaser.Math.Between(96, GAME_HEIGHT - 96),
                Phaser.Math.Between(32, 180),
                Phaser.Math.Between(3, 10),
                Phaser.Math.Between(0, 1) ? 0x75f6ff : 0xff6b7a,
                0.75
            ).setOrigin(0.5));

            this.tweens.add({
                targets: [fragment, bar],
                x: `+=${Phaser.Math.Between(-24, 24)}`,
                alpha: { from: 1, to: 0 },
                duration: Phaser.Math.Between(180, 360),
                onComplete: () => {
                    fragment.destroy();
                    bar.destroy();
                }
            });
        });
    }

    showWorldTitleSequence() {
        this.currentPhase = 'world';
        this.clearSceneObjects();
        this.cameras.main.setBackgroundColor(0x12071f);
        playBgmWithFade(this, ASSETS.audio.bgmMain.key, { loop: true, volume: 0.35 }, 900);

        const hasWorldBackgroundClosed = hasTexture(this, ASSETS.opening.worldBackgroundClosed.key);
        const hasWorldBackground = hasTexture(this, ASSETS.opening.worldBackground.key);
        let closedBackground = null;
        let openBackground = null;
        if (hasWorldBackgroundClosed) {
            closedBackground = this.track(this.add.image(CENTER_X, CENTER_Y, ASSETS.opening.worldBackgroundClosed.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setAlpha(1)
                .setDepth(ASSISTANT_DEPTHS.background));
            if (hasWorldBackground) {
                openBackground = this.track(this.add.image(CENTER_X, CENTER_Y, ASSETS.opening.worldBackground.key)
                    .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                    .setAlpha(0)
                    .setDepth(ASSISTANT_DEPTHS.background + 1));
            }
        } else if (hasWorldBackground) {
            openBackground = this.track(this.add.image(CENTER_X, CENTER_Y, ASSETS.opening.worldBackground.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setDepth(ASSISTANT_DEPTHS.background));
        }
        const worldShade = this.track(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x12071f, (hasWorldBackgroundClosed || hasWorldBackground) ? 0.40 : 1).setOrigin(0).setDepth(ASSISTANT_DEPTHS.overlay));
        const worldFlash = this.track(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0).setOrigin(0).setDepth(ASSISTANT_DEPTHS.overlay + 1));

        const titleText = this.track(this.add.text(CENTER_X, 470, '퇴근 없는 테마파크', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '28px',
            color: '#7f3cff',
            stroke: '#2a104f',
            strokeThickness: 5
        }).setOrigin(0.5).setAlpha(0).setDepth(ASSISTANT_DEPTHS.text));

        const subtitleText = this.track(this.add.text(CENTER_X, 518, 'ICT기금 사업관리 15개월 사이클을 완수하라', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '24px',
            color: '#f8f3ff'
        }).setOrigin(0.5).setAlpha(0).setDepth(ASSISTANT_DEPTHS.text));

        this.time.delayedCall(420, () => {
            this.cameras.main.shake(420, 0.004);
            this.tweens.add({
                targets: closedBackground,
                alpha: { from: 1, to: 0 },
                duration: 620,
                ease: 'Sine.easeOut'
            });
            if (openBackground) {
                this.tweens.add({
                    targets: openBackground,
                    alpha: { from: 0, to: 1 },
                    duration: 620,
                    ease: 'Sine.easeOut'
                });
            }
            this.tweens.add({
                targets: worldShade,
                alpha: { from: hasWorldBackgroundClosed || hasWorldBackground ? 0.40 : 1, to: 0.14 },
                duration: 620,
                ease: 'Sine.easeOut'
            });
            this.tweens.add({
                targets: worldFlash,
                alpha: { from: 0, to: 0.22 },
                yoyo: true,
                duration: 160,
                ease: 'Sine.easeOut'
            });
            this.tweens.add({
                targets: titleText,
                alpha: { from: 0, to: 1 },
                y: { from: 470, to: 458 },
                duration: 680,
                delay: 240,
                ease: 'Sine.easeOut'
            });
            this.tweens.add({
                targets: subtitleText,
                alpha: { from: 0, to: 1 },
                y: { from: 518, to: 506 },
                duration: 680,
                delay: 360,
                ease: 'Sine.easeOut'
            });
        });

        if (!DEV_HOLD_ON_WORLD_TITLE) {
            this.schedulePhaseAdvance('assistant', 2200);
        }
    }

    showAssistantIntro() {
        this.currentPhase = 'assistant';
        this.assistantIndex = 0;
        this.clearSceneObjects();
        this.cameras.main.setBackgroundColor(0x0c0820);
        playBgmWithFade(this, ASSETS.audio.bgmMain.key, { loop: true, volume: 0.35 }, 900);

        const hasAssistantBackground = hasTexture(this, ASSETS.opening.assistantBackground.key);
        if (hasAssistantBackground) {
            this.track(this.add.image(CENTER_X, CENTER_Y, ASSETS.opening.assistantBackground.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setDepth(ASSISTANT_DEPTHS.background));
        }
        if (!hasAssistantBackground) {
            this.track(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x0c0820, 1).setOrigin(0).setDepth(ASSISTANT_DEPTHS.background));
            this.track(this.add.rectangle(0, 0, GAME_WIDTH, 410, 0x12102a, 0.9).setOrigin(0).setDepth(ASSISTANT_DEPTHS.background));
            this.track(this.add.rectangle(0, 410, GAME_WIDTH, 310, 0x05050a, 0.92).setOrigin(0).setDepth(ASSISTANT_DEPTHS.background));
        }
        this.track(this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.30)
            .setOrigin(0)
            .setDepth(ASSISTANT_DEPTHS.overlay));
        const fadeColors = [0x05050a, 0x090714, 0x0d1020, 0x12102a];
        const fadeAlphas = [0.14, 0.10, 0.07, 0.04];
        const fadeHeights = [56, 72, 90, 112];
        let fadeTop = GAME_HEIGHT;
        for (let i = 0; i < fadeColors.length; i += 1) {
            const height = fadeHeights[i];
            fadeTop -= height;
            this.track(this.add.rectangle(0, fadeTop, GAME_WIDTH, height, fadeColors[i], fadeAlphas[i]).setOrigin(0).setDepth(ASSISTANT_DEPTHS.overlay));
        }
        if (hasTexture(this, ASSETS.opening.assistantCutin.key)) {
            const assistantShadow = this.track(this.add.image(CENTER_X - 20, 336, ASSETS.opening.assistantCutin.key)
                .setDisplaySize(372, 512)
                .setTint(0xa56bff)
                .setAlpha(0)
                .setDepth(ASSISTANT_DEPTHS.character - 1));
            const assistant = this.track(this.add.image(CENTER_X, 336, ASSETS.opening.assistantCutin.key).setDepth(ASSISTANT_DEPTHS.character));
            assistant.setDisplaySize(360, 500);
            this.tweens.add({
                targets: assistantShadow,
                x: { from: CENTER_X - 40, to: CENTER_X - 20 },
                alpha: { from: 0, to: 0.14 },
                duration: 250,
                ease: 'Sine.easeOut'
            });
            this.tweens.add({
                targets: assistant,
                x: { from: CENTER_X - 20, to: CENTER_X },
                alpha: { from: 0, to: 1 },
                duration: 250,
                ease: 'Sine.easeOut'
            });

            const assistantFade = this.add.graphics();
            assistantFade.fillStyle(0x05050a, 0.05).fillRect(CENTER_X - 160, 486, 320, 116);
            assistantFade.fillStyle(0x05050a, 0.03).fillRect(CENTER_X - 160, 448, 320, 44);
            assistantFade.fillStyle(0x05050a, 0.02).fillRect(CENTER_X - 160, 406, 320, 36);
            assistantFade.fillStyle(0x05050a, 0.02).fillRect(CENTER_X - 174, 132, 14, 468);
            assistantFade.fillStyle(0x05050a, 0.02).fillRect(CENTER_X + 160, 132, 14, 468);
            this.track(assistantFade.setDepth(ASSISTANT_DEPTHS.character + 1));
        } else {
            const silhouette = this.add.graphics();
            silhouette.fillStyle(0x1d2140, 1).fillRoundedRect(CENTER_X - 158, 140, 316, 420, 24);
            silhouette.fillStyle(0x0b0a14, 1).fillCircle(CENTER_X, 190, 68);
            silhouette.fillStyle(0x75f6ff, 0.22).fillRoundedRect(CENTER_X - 96, 260, 192, 204, 16);
            silhouette.lineStyle(3, 0x75f6ff, 0.55).strokeRoundedRect(CENTER_X - 158, 140, 316, 420, 24);
            this.track(silhouette.setDepth(ASSISTANT_DEPTHS.character));
        }

        const nameBox = this.track(this.add.rectangle(
            ASSISTANT_LAYOUT.nameX + 86,
            ASSISTANT_LAYOUT.nameY,
            ASSISTANT_LAYOUT.nameBoxWidth,
            ASSISTANT_LAYOUT.nameBoxHeight,
            0x05050a,
            0.88
        ).setDepth(ASSISTANT_DEPTHS.text + 2));

        const dialoguePanel = this.track(this.add.rectangle(
            ASSISTANT_LAYOUT.panelX,
            ASSISTANT_LAYOUT.panelY,
            ASSISTANT_LAYOUT.panelWidth,
            ASSISTANT_LAYOUT.panelHeight,
            0x05050a,
            0.88
        ).setDepth(ASSISTANT_DEPTHS.dialogue));

        const nameLabel = this.track(this.add.text(
            ASSISTANT_LAYOUT.nameX + 86,
            ASSISTANT_LAYOUT.nameY,
            'KCA 간사',
            {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: '20px',
                color: '#ffd36e'
            }
        ).setOrigin(0.5).setDepth(ASSISTANT_DEPTHS.text + 3));

        this.assistantLineText = this.track(this.add.text(
            ASSISTANT_LAYOUT.bodyX,
            ASSISTANT_LAYOUT.bodyY,
            '',
            {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: `${ASSISTANT_LAYOUT.bodyFontSize}px`,
                color: '#f8f3ff',
                wordWrap: { width: ASSISTANT_LAYOUT.bodyWrapWidth },
                lineSpacing: ASSISTANT_LAYOUT.bodyLineSpacing
            }
        ).setDepth(ASSISTANT_DEPTHS.text));

        this.tweens.add({
            targets: [nameBox, dialoguePanel, nameLabel, this.assistantLineText],
            alpha: { from: 0, to: 1 },
            duration: 200,
            ease: 'Sine.easeOut'
        });

        this.renderAssistantLine();
    }

    renderAssistantLine() {
        const line = ASSISTANT_LINES[this.assistantIndex];
        this.assistantLineText.setText(line);
    }

    advancePhase() {
        if (this.currentPhase === 'login') {
            this.showWarningSequence();
            return;
        }

        if (this.currentPhase === 'warning') {
            this.showGlitchSequence();
            return;
        }

        if (this.currentPhase === 'glitch') {
            this.showWorldTitleSequence();
            return;
        }

        if (this.currentPhase === 'world') {
            this.showAssistantIntro();
        }
    }

    advanceAssistantLine() {
        if (this.transitioning) {
            return;
        }

        if (this.assistantIndex < ASSISTANT_LINES.length - 1) {
            this.assistantIndex += 1;
            this.renderAssistantLine();
            return;
        }

        this.launchSealedVaultScene();
    }

    launchSealedVaultScene() {
        if (this.transitioning) {
            return;
        }

        this.transitioning = true;
        GameState.setTimeRunning(true);
        this.clearSceneObjects();
        this.scene.start('SealedVaultScene');
    }

    skipToStageOne() {
        if (this.transitioning) {
            return;
        }

        this.transitioning = true;
        this.clearScheduledTimers();
        GameState.setTimeRunning(true);
        this.clearSceneObjects();
        this.scene.start('SealedVaultScene');
    }

    schedulePhaseAdvance(nextPhase, delay) {
        this.phaseToken += 1;
        const token = this.phaseToken;
        this.phaseAdvanceTimer?.remove(false);
        this.phaseAdvanceTimer = this.time.delayedCall(delay, () => {
            if (this.transitioning || token !== this.phaseToken) {
                return;
            }
            if (nextPhase === 'warning') {
                this.showWarningSequence();
            } else if (nextPhase === 'glitch') {
                this.showGlitchSequence();
            } else if (nextPhase === 'world') {
                this.showWorldTitleSequence();
            } else if (nextPhase === 'assistant') {
                this.showAssistantIntro();
            }
        });
    }

    scheduleAssistantAdvance(delay) {
        // no-op: assistant lines now advance only by click or Enter.
    }
}
