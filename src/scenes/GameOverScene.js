import * as Phaser from 'phaser';
import { ASSETS, hasTexture } from '../systems/AssetManager.js';
import { GameState } from '../systems/GameState.js';

const WIDTH = 1280;
const HEIGHT = 720;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

export class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    create() {
        this.cameras.main.setBackgroundColor(0x090714);

        this.add.rectangle(CENTER_X, CENTER_Y, WIDTH, HEIGHT, 0x05050a, 0.92);
        this.add.rectangle(CENTER_X, CENTER_Y, WIDTH, HEIGHT, 0x2d1038, 0.10);

        this.add.text(CENTER_X, 170, 'GAME OVER', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '44px',
            color: '#ff9aac',
            stroke: '#000000',
            strokeThickness: 8,
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(CENTER_X, 245, 'HP가 모두 소진되었습니다.', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '26px',
            color: '#f8f3ff',
            align: 'center'
        }).setOrigin(0.5);

        this.add.text(CENTER_X, 292, '처음부터 다시 시작할 수 있습니다.', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#c9ffef',
            align: 'center'
        }).setOrigin(0.5);

        this.createButton(CENTER_X - 160, 430, '처음으로 돌아가기', () => {
            GameState.reset();
            this.scene.start('StartScene');
        });

        this.createButton(CENTER_X + 160, 430, '다시 시작', () => {
            GameState.reset();
            this.scene.start('StartScene');
        });
    }

    createButton(x, y, label, onClick) {
        const width = 260;
        const height = 56;
        let bg;
        let hoverBg = null;

        if (hasTexture(this, ASSETS.ui.buttonNormal.key)) {
            bg = this.add.image(x, y, ASSETS.ui.buttonNormal.key).setDisplaySize(width, height);
            if (hasTexture(this, ASSETS.ui.buttonHover.key)) {
                hoverBg = this.add.image(x, y, ASSETS.ui.buttonHover.key).setDisplaySize(width, height).setVisible(false);
            }
        } else {
            bg = this.add.rectangle(x, y, width, height, 0x24183f, 1).setStrokeStyle(2, 0x75f6ff, 0.8);
        }

        const text = this.add.text(x, y, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        const hitArea = this.add.rectangle(x, y, width, height, 0x000000, 0.001).setInteractive({ useHandCursor: true });
        hitArea.on('pointerdown', () => onClick?.());
        hitArea.on('pointerover', () => hoverBg?.setVisible(true));
        hitArea.on('pointerout', () => hoverBg?.setVisible(false));

        return { bg, hoverBg, text, hitArea };
    }
}
