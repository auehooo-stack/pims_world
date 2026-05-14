import * as Phaser from 'phaser';

export class Player extends Phaser.GameObjects.Rectangle {
    constructor(scene, x, y) {
        super(scene, x, y, 20, 30, 0xffd36e);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.body.setCollideWorldBounds(false);
        this.body.setSize(18, 26);
        this.body.setOffset(1, 2);
        this.speed = 96;

        this.nameText = scene.add.text(x, y - 28, '김대리', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            color: '#ffffff',
            backgroundColor: '#171024'
        }).setOrigin(0.5);
    }

    preUpdate() {
        this.syncLabel();
    }

    syncLabel() {
        this.nameText.setPosition(this.x, this.y - 28);
    }

    setMovement(vx, vy) {
        this.body.setVelocity(vx, vy);
    }

    destroy(fromScene) {
        this.nameText?.destroy();
        super.destroy(fromScene);
    }
}
