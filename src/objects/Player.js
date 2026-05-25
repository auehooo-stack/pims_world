import * as Phaser from 'phaser';
import { ASSETS, hasTexture, setLinearTextureFilter } from '../systems/AssetManager.js';

export class Player extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        super(scene, x, y, 60, 96, 0xffd36e);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setCollideWorldBounds(false);
        this.body.setSize(54, 88);
        this.body.setOffset(3, 4);
        this.setDepth(2);
        this.speed = 192;
        this.shadow = scene.add.ellipse(x, y + 36, 46, 12, 0x000000, 0.3)
            .setScale(1, 0.8)
            .setDepth(1);

        this.idleTextureKey = ASSETS.characters.kimDaeriIdle.key;
        this.walkTextureKey = ASSETS.characters.kimDaeriWalk.key;
        setLinearTextureFilter(scene, this.idleTextureKey);
        setLinearTextureFilter(scene, this.walkTextureKey);
        this.useTexture = hasTexture(scene, this.idleTextureKey);

        if (this.useTexture) {
            this.sprite = scene.add.image(x, y + 48, this.idleTextureKey)
                .setOrigin(0.5, 1)
                .setDisplaySize(60, 96)
                .setDepth(2);
            this.sprite.disableInteractive?.();
            this.setAlpha(0);
            this.currentVisualState = 'idle';
        }

        this.nameText = scene.add.text(x, y + 58, '김대리', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            color: '#ffffff',
            backgroundColor: '#171024'
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
        this.shadow.setPosition(this.x, this.y + 38);
        this.sprite.setFlipX(this.body.velocity.x < 0);

        const moving = Math.abs(this.body.velocity.x) > 1 || Math.abs(this.body.velocity.y) > 1;
        const nextState = moving && hasTexture(this.scene, this.walkTextureKey) ? 'walk' : 'idle';

        if (nextState !== this.currentVisualState) {
            this.currentVisualState = nextState;
            if (nextState === 'walk') {
                this.sprite.setTexture(this.walkTextureKey);
            } else {
                this.sprite.setTexture(this.idleTextureKey);
            }
        }

        this.sprite.setAlpha(1);
        this.setAlpha(0);
        this.sprite.setDepth(2);
        this.shadow.setDepth(1);
        this.nameText.setDepth(3);
    }

    syncLabel() {
        this.nameText.setPosition(this.x, this.y + 58);
    }

    setMovement(vx, vy) {
        this.body.setVelocity(vx, vy);
    }

    destroy(fromScene) {
        this.sprite?.destroy();
        this.shadow?.destroy();
        this.nameText?.destroy();
        super.destroy(fromScene);
    }
}
