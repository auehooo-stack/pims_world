import * as Phaser from 'phaser';
import { ASSETS, hasTexture, setLinearTextureFilter } from '../systems/AssetManager.js';

export class Player extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        super(scene, x, y, 98, 126, 0xffd36e);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setCollideWorldBounds(false);
        this.body.setSize(90, 116);
        this.body.setOffset(4, 5);
        this.setDepth(2);
        this.speed = 192;
        this.shadow = scene.add.ellipse(x, y + 44, 62, 14, 0x000000, 0.3)
            .setScale(1, 0.8)
            .setDepth(1);

        this.idleTextureKey = ASSETS.characters.kimDaeriIdle.key;
        this.walkTextureKeys = [
            ASSETS.characters.kimDaeriWalk1.key,
            ASSETS.characters.kimDaeriWalk2.key,
            ASSETS.characters.kimDaeriWalk3.key,
            ASSETS.characters.kimDaeriWalk4.key
        ];
        this.legacyWalkTextureKey = ASSETS.characters.kimDaeriWalk.key;
        this.closedTextureKey = ASSETS.characters.kimDaeriClosed.key;
        setLinearTextureFilter(scene, this.idleTextureKey);
        this.walkTextureKeys.forEach((key) => setLinearTextureFilter(scene, key));
        setLinearTextureFilter(scene, this.legacyWalkTextureKey);
        setLinearTextureFilter(scene, this.closedTextureKey);
        this.useTexture = hasTexture(scene, this.idleTextureKey);
        this.walkFrames = this.walkTextureKeys.filter((key) => hasTexture(scene, key));
        if (!this.walkFrames.length && hasTexture(scene, this.legacyWalkTextureKey)) {
            this.walkFrames = [this.legacyWalkTextureKey];
        }

        if (this.useTexture) {
            this.sprite = scene.add.image(x, y + 48, this.idleTextureKey)
                .setOrigin(0.5, 1)
                .setDisplaySize(106, 136)
                .setDepth(2);
            this.sprite.disableInteractive?.();
            this.setAlpha(0);
            this.currentVisualState = 'idle';
            this.currentWalkFrameIndex = 0;
            this.walkFrameInterval = 110;
            this.lastWalkFrameTime = 0;
            this.idleDisplaySize = { width: 106, height: 136 };
            this.walkDisplaySize = { width: 104, height: 134 };
            this.blinkCall = null;
            this.queueBlink(Phaser.Math.Between(1000, 2400));
        }

        this.nameText = scene.add.text(x, y + 52, '김대리', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#ffffff',
            backgroundColor: 'rgba(23, 16, 36, 0.45)'
        }).setOrigin(0.5).setDepth(3);
    }

    preUpdate() {
        this.syncVisual();
        this.syncLabel();
    }

    syncVisual() {
        if (!this.sprite) {
            return;
        }

        this.sprite.setPosition(this.x, this.y + 48);
        this.shadow.setPosition(this.x, this.y + 44);
        this.sprite.setFlipX(this.body.velocity.x < 0);

        const moving = Math.abs(this.body.velocity.x) > 1 || Math.abs(this.body.velocity.y) > 1;
        const nextState = moving && this.walkFrames.length > 0 ? 'walk' : 'idle';

        if (nextState !== this.currentVisualState) {
            this.currentVisualState = nextState;
            if (nextState === 'walk') {
                this.currentWalkFrameIndex = 0;
                this.lastWalkFrameTime = 0;
                this.applyWalkFrame(0);
                this.blinkCall?.remove(false);
            } else {
                this.sprite.setTexture(this.idleTextureKey);
                this.sprite.setDisplaySize(this.idleDisplaySize.width, this.idleDisplaySize.height);
                this.queueBlink(Phaser.Math.Between(1100, 2600));
            }
        } else if (nextState === 'walk' && this.walkFrames.length > 0) {
            const now = this.scene.time.now;
            if (!this.lastWalkFrameTime) {
                this.lastWalkFrameTime = now;
            }
            if (now - this.lastWalkFrameTime >= this.walkFrameInterval) {
                this.currentWalkFrameIndex = (this.currentWalkFrameIndex + 1) % this.walkFrames.length;
                this.applyWalkFrame(this.currentWalkFrameIndex);
                this.lastWalkFrameTime = now;
            }
        }

        this.sprite.setAlpha(1);
        this.setAlpha(0);
        this.sprite.setDepth(2);
        this.shadow.setDepth(1);
        this.nameText.setDepth(3);
    }

    applyWalkFrame(index) {
        if (!this.sprite || !this.walkFrames.length) {
            return;
        }

        const textureKey = this.walkFrames[index % this.walkFrames.length];
        if (textureKey && hasTexture(this.scene, textureKey)) {
            this.sprite.setTexture(textureKey);
            this.sprite.setDisplaySize(this.walkDisplaySize.width, this.walkDisplaySize.height);
        }
    }

    queueBlink(delayMs) {
        if (!this.sprite || !this.closedTextureKey || !hasTexture(this.scene, this.closedTextureKey)) {
            return;
        }

        this.blinkCall?.remove(false);
        this.blinkCall = this.scene.time.delayedCall(delayMs, () => {
            if (!this.sprite || this.currentVisualState !== 'idle') {
                return;
            }
            this.sprite.setTexture(this.closedTextureKey);
            this.sprite.setDisplaySize(this.idleDisplaySize.width + 4, this.idleDisplaySize.height + 4);
            this.scene.time.delayedCall(120, () => {
                if (!this.sprite || this.currentVisualState !== 'idle') {
                    return;
                }
                this.sprite.setTexture(this.idleTextureKey);
                this.sprite.setDisplaySize(this.idleDisplaySize.width, this.idleDisplaySize.height);
                this.queueBlink(Phaser.Math.Between(1600, 3200));
            });
        });
    }

    syncLabel() {
        this.nameText.setPosition(this.x, this.y + 52);
    }

    setMovement(vx, vy) {
        this.body.setVelocity(vx, vy);
    }

    destroy(fromScene) {
        this.sprite?.destroy();
        this.shadow?.destroy();
        this.nameText?.destroy();
        this.blinkCall?.remove(false);
        super.destroy(fromScene);
    }
}

