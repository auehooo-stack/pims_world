import * as Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { ASSETS, hasTexture, playAudioIfAvailable } from '../systems/AssetManager.js';
import { CENTER_X, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

const STAGE_CLEAR_LINES = [
    { speaker: 'KCA 간사', text: '축하해요, 김대리님. 서류의 봉인을 풀고 사업비를 확보하셨군요.' },
    { speaker: 'KCA 간사', text: '하지만 좋아하긴 일러요. 이제 진짜 돈을 쓰는 법을 배울 시간입니다.' },
    { speaker: 'KCA 간사', text: '저기 보이는 집행의 집으로 가시죠.' }
];

export class StageClearScene extends Phaser.Scene {
    constructor() {
        super('StageClearScene');
    }

    create() {
        GameState.set('stage1Cleared', true);
        GameState.set('sealedVaultOpened', true);
        GameState.set('budgetStatus', '교부 완료');
        GameState.set('businessCostCoin', true);
        this.cameras.main.setBackgroundColor(0x090714);

        this.coinGroup = this.add.group();
        this.drawClearScene();
        this.dialogue = new DialogueManager(this);

        this.time.delayedCall(500, () => this.playVaultOpenSequence());
    }

    drawClearScene() {
        this.hasClosedBackdrop = hasTexture(this, ASSETS.backgrounds.stageClearClosed.key);
        this.hasOpenBackdrop = hasTexture(this, ASSETS.backgrounds.stageClear.key);
        this.useBackdropTransition = this.hasClosedBackdrop && this.hasOpenBackdrop;

        if (this.useBackdropTransition) {
            this.clearBackdropOpen = this.add.image(CENTER_X, GAME_HEIGHT / 2, ASSETS.backgrounds.stageClear.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setDepth(0)
                .setAlpha(0);
            this.clearBackdropClosed = this.add.image(CENTER_X, GAME_HEIGHT / 2, ASSETS.backgrounds.stageClearClosed.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setDepth(0.05);
        } else if (this.hasOpenBackdrop) {
            this.add.image(CENTER_X, GAME_HEIGHT / 2, ASSETS.backgrounds.stageClear.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setDepth(0);
        } else {
            const g = this.add.graphics();
            g.fillStyle(0x090714, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            g.fillStyle(0x170d2b, 1).fillRect(0, 420, GAME_WIDTH, GAME_HEIGHT - 420);
            g.fillStyle(0x4b3f64, 1).fillRoundedRect(476, 116, 328, 352, 8);
            g.fillStyle(0x3b3154, 1).fillRoundedRect(476, 116, 152, 352, 8);
            g.fillStyle(0x090714, 1).fillRoundedRect(556, 168, 248, 300, 8);
            g.lineStyle(7, 0xffd36e, 0.9).strokeCircle(652, 284, 56);
            g.fillStyle(0xffd36e, 1);

            for (let i = 0; i < 24; i += 1) {
                const x = 520 + (i * 75) % 260;
                const y = 416 + (i * 39) % 144;
                g.fillCircle(x, y, 12);
                this.add.text(x, y - 3, 'COIN', {
                    fontFamily: 'GALMURI, Arial, sans-serif',
                    fontSize: '12px',
                    color: '#553500'
                }).setOrigin(0.5);
            }
        }

        if (!this.useBackdropTransition) {
            if (hasTexture(this, ASSETS.objects.vaultDoorOpen.key)) {
                this.vaultOpenImage = this.add.image(CENTER_X, GAME_HEIGHT / 2 + 6, ASSETS.objects.vaultDoorOpen.key)
                    .setDisplaySize(328, 352);
            } else {
                this.leftDoor = this.add.rectangle(518, 292, 148, 330, 0x3b3154, 1)
                    .setStrokeStyle(2, 0xffd36e, 0.55);
                this.rightDoor = this.add.rectangle(634, 292, 148, 330, 0x4b3f64, 1)
                    .setStrokeStyle(2, 0xffd36e, 0.55);
                this.vaultCore = this.add.circle(576, 292, 42, 0x090714, 1)
                    .setStrokeStyle(4, 0xffd36e, 0.85);
                this.vaultLock = this.add.circle(576, 292, 14, 0xffd36e, 1);
                this.vaultBeam = this.add.rectangle(576, 292, 176, 10, 0xffd36e, 0.85);
            }
        }

        if (hasTexture(this, ASSETS.effects.vaultFlash.key)) {
            this.vaultFlash = this.add.image(CENTER_X, 286, ASSETS.effects.vaultFlash.key)
                .setDisplaySize(220, 220)
                .setAlpha(0);
        } else {
            this.vaultFlash = this.add.circle(CENTER_X, 286, 18, 0xfff0a8, 0)
                .setStrokeStyle(0, 0x000000, 0);
        }

        this.add.text(CENTER_X, 72, '금고 개방', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '48px',
            color: '#fff5c7',
            stroke: '#5c1dff',
            strokeThickness: 5,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                blur: 0,
                color: '#000000',
                fill: true,
                stroke: true
            }
        }).setOrigin(0.5);

        this.subText = this.add.text(CENTER_X, 154, '사업비 교부 완료', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '22px',
            color: '#f8f3ff'
        }).setOrigin(0.5);
    }

    playVaultOpenSequence() {
        playAudioIfAvailable(this, ASSETS.audio.sfxVaultOpen.key, { volume: 0.7 });
        if (this.useBackdropTransition) {
            this.playBackdropTransitionSequence();
            return;
        }

        if (this.vaultOpenImage) {
            this.tweens.add({
                targets: this.vaultOpenImage,
                scale: { from: 1, to: 1.04 },
                yoyo: true,
                repeat: 1,
                duration: 450,
                ease: 'Sine.easeInOut'
            });
        } else {
            this.tweens.add({
                targets: [this.leftDoor, this.vaultLock],
                x: { from: this.leftDoor.x, to: this.leftDoor.x - 54 },
                angle: { from: 0, to: -5 },
                duration: 900,
                ease: 'Cubic.easeOut'
            });

            this.tweens.add({
                targets: [this.rightDoor, this.vaultBeam],
                x: { from: this.rightDoor.x, to: this.rightDoor.x + 54 },
                angle: { from: 0, to: 5 },
                duration: 900,
                ease: 'Cubic.easeOut'
            });

            this.tweens.add({
                targets: this.vaultCore,
                scale: { from: 1, to: 1.18 },
                duration: 450,
                yoyo: true,
                repeat: 1
            });
        }

        if (this.vaultFlash) {
            this.tweens.add({
                targets: this.vaultFlash,
                alpha: { from: 0, to: 0.9 },
                scale: { from: 0.8, to: 1.1 },
                duration: 240,
                yoyo: true,
                repeat: 1
            });
        }

        if (hasTexture(this, ASSETS.effects.sparkle.key)) {
            for (let i = 0; i < 5; i += 1) {
                const sparkle = this.add.image(CENTER_X + Phaser.Math.Between(-70, 70), 286 + Phaser.Math.Between(-40, 40), ASSETS.effects.sparkle.key)
                    .setDisplaySize(28, 28)
                    .setAlpha(0.1);
                this.tweens.add({
                    targets: sparkle,
                    alpha: { from: 0.2, to: 1 },
                    scale: { from: 0.7, to: 1.15 },
                    angle: Phaser.Math.Between(-30, 30),
                    duration: 520,
                    yoyo: true,
                    repeat: 1,
                    onComplete: () => sparkle.destroy()
                });
            }
        }

        this.time.delayedCall(420, () => this.spawnCoinBurst());
        this.time.delayedCall(1050, () => this.playDialogue());
    }

    playBackdropTransitionSequence() {
        this.cameras.main.shake(220, 0.0045);

        const centerLight = this.add.circle(CENTER_X, 286, 46, 0xfff2c4, 0)
            .setDepth(1.5)
            .setBlendMode(Phaser.BlendModes.ADD);

        this.tweens.add({
            targets: centerLight,
            alpha: { from: 0, to: 0.58 },
            scale: { from: 0.7, to: 2.3 },
            duration: 320,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeOut',
            onComplete: () => centerLight.destroy()
        });

        if (this.clearBackdropClosed && this.clearBackdropOpen) {
            this.tweens.add({
                targets: this.clearBackdropClosed,
                alpha: { from: 1, to: 0 },
                x: { from: CENTER_X, to: CENTER_X - 4 },
                y: { from: GAME_HEIGHT / 2, to: GAME_HEIGHT / 2 - 2 },
                duration: 540,
                ease: 'Sine.easeInOut'
            });

            this.tweens.add({
                targets: this.clearBackdropOpen,
                alpha: { from: 0, to: 1 },
                x: { from: CENTER_X + 4, to: CENTER_X },
                y: { from: GAME_HEIGHT / 2 + 2, to: GAME_HEIGHT / 2 },
                duration: 540,
                ease: 'Sine.easeInOut'
            });
        }

        const flash = this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xfff0c4, 0)
            .setDepth(1.6)
            .setBlendMode(Phaser.BlendModes.ADD);
        this.tweens.add({
            targets: flash,
            alpha: { from: 0, to: 0.16 },
            duration: 180,
            yoyo: true,
            repeat: 1,
            onComplete: () => flash.destroy()
        });

        if (hasTexture(this, ASSETS.effects.sparkle.key)) {
            for (let i = 0; i < 8; i += 1) {
                const sparkle = this.add.image(
                    CENTER_X + Phaser.Math.Between(-160, 160),
                    Phaser.Math.Between(170, 360),
                    ASSETS.effects.sparkle.key
                )
                    .setDisplaySize(18, 18)
                    .setAlpha(0)
                    .setDepth(2.2)
                    .setBlendMode(Phaser.BlendModes.ADD);
                this.tweens.add({
                    targets: sparkle,
                    alpha: { from: 0, to: 0.75 },
                    scale: { from: 0.7, to: 1.12 },
                    y: sparkle.y - Phaser.Math.Between(12, 30),
                    duration: Phaser.Math.Between(420, 760),
                    yoyo: true,
                    repeat: 1,
                    ease: 'Sine.easeOut',
                    onComplete: () => sparkle.destroy()
                });
            }
        }

        this.time.delayedCall(420, () => this.playDialogue());
    }

    spawnCoinBurst() {
        playAudioIfAvailable(this, ASSETS.audio.sfxCoin.key, { volume: 0.5 });
        for (let i = 0; i < 34; i += 1) {
            const x = Phaser.Math.Between(500, 760);
            const y = Phaser.Math.Between(190, 280);
            const hasCoinTexture = hasTexture(this, ASSETS.effects.coin.key);
            const coin = hasCoinTexture
                ? this.add.image(x, y, ASSETS.effects.coin.key).setDisplaySize(16, 16)
                : this.add.circle(x, y, Phaser.Math.Between(4, 7), 0xffd36e, 1);
            if (!hasCoinTexture) {
                coin.setStrokeStyle(1, 0xfff0a8, 0.9);
            }
            this.coinGroup.add(coin);

            this.tweens.add({
                targets: coin,
                x: x + Phaser.Math.Between(-120, 120),
                y: y + Phaser.Math.Between(150, 280),
                alpha: 0,
                scale: 0.5,
                duration: Phaser.Math.Between(700, 1100),
                ease: 'Quad.easeIn',
                onComplete: () => coin.destroy()
            });
        }
    }

    playDialogue() {
        this.dialogue.say(STAGE_CLEAR_LINES, () => this.showButtons());
    }

    showButtons() {
        this.createEndingOverlay();

        this.add.text(CENTER_X, 510, '다음 업데이트에서 2단계 [집행의 집]이 열립니다.', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '24px',
            color: '#c9ffef',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 5,
            wordWrap: { width: 980 }
        }).setOrigin(0.5).setDepth(110);

        this.createButton(480, 616, '처음으로 돌아가기', () => this.scene.start('StartScene'));
        this.createButton(800, 616, '다시 플레이', () => {
            GameState.reset();
            this.scene.start('SealedVaultScene');
        });
    }

    createEndingOverlay() {
        if (this.endingOverlay) {
            return;
        }

        this.baseShade = this.add.rectangle(640, 360, 1280, 720, 0x02030a, 0.04)
            .setOrigin(0.5)
            .setDepth(19);

        const overlay = this.add.graphics().setDepth(20);
        const startY = 0;
        const height = 720;
        const bands = 60;
        const bandHeight = height / bands;
        for (let i = 0; i < bands; i += 1) {
            const t = i / Math.max(1, bands - 1);
            const minAlpha = 0.03;
            const maxAlpha = 0.84;
            const alpha = minAlpha + (maxAlpha - minAlpha) * Math.pow(t, 1.2);
            overlay.fillStyle(0x02030a, alpha).fillRect(0, startY + (i * bandHeight), GAME_WIDTH, bandHeight + 1);
        }
        this.endingOverlay = overlay;
    }
    createButton(x, y, label, onClick) {
        let bg;
        let hoverBg = null;
        if (hasTexture(this, ASSETS.ui.buttonNormal.key)) {
            bg = this.add.image(x, y, ASSETS.ui.buttonNormal.key).setDisplaySize(252, 56).setDepth(100);
            if (hasTexture(this, ASSETS.ui.buttonHover.key)) {
                hoverBg = this.add.image(x, y, ASSETS.ui.buttonHover.key).setDisplaySize(252, 56).setVisible(false).setDepth(100);
            }
        } else {
            bg = this.add.rectangle(x, y, 252, 56, 0x24183f, 1)
                .setStrokeStyle(2, 0x75f6ff, 0.8)
                .setDepth(100);
        }
        const text = this.add.text(x, y, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(101);
        const hit = this.add.rectangle(x, y, 252, 56, 0x000000, 0)
            .setDepth(100)
            .setInteractive({ useHandCursor: true });
        hit.on('pointerover', () => {
            if (hoverBg) {
                bg.setVisible(false);
                hoverBg.setVisible(true);
            }
            if (!hoverBg && bg.setFillStyle) {
                bg.setFillStyle(0x322159);
            }
        });
        hit.on('pointerout', () => {
            if (hoverBg) {
                bg.setVisible(true);
                hoverBg.setVisible(false);
            }
            if (!hoverBg && bg.setFillStyle) {
                bg.setFillStyle(0x24183f);
            }
        });
        hit.on('pointerdown', onClick);
        text.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
    }
}

