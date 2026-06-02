import * as Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { CENTER_X, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';
import { ASSETS, hasTexture, playAudioIfAvailable } from '../systems/AssetManager.js';

export class StartScene extends Phaser.Scene {
    constructor() {
        super('StartScene');
    }

    create() {
        GameState.reset();
        this.cameras.main.setBackgroundColor(0x090714);

        if (hasTexture(this, ASSETS.backgrounds.startScreen.key)) {
            this.add.image(CENTER_X, GAME_HEIGHT / 2, ASSETS.backgrounds.startScreen.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
            this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x090714, 0.22);
        } else {
            const g = this.add.graphics();
            g.fillStyle(0x12102a, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            g.fillStyle(0x251348, 1).fillRect(0, 456, GAME_WIDTH, 264);
            g.lineStyle(2, 0x25f3ff, 0.45);
            for (let x = -80; x < GAME_WIDTH + 80; x += 80) {
                g.lineBetween(x, 496, x + 144, GAME_HEIGHT);
            }
            for (let y = 504; y < GAME_HEIGHT; y += 36) {
                g.lineBetween(0, y, GAME_WIDTH, y);
            }
        }

        this.add.text(CENTER_X, 208, 'PIMS WORLD', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '78px',
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
        }).setOrigin(0.5);

        this.add.text(CENTER_X, 302, '퇴근없는 테마파크', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '34px',
            color: '#75f6ff'
        }).setOrigin(0.5);

        this.add.text(CENTER_X, 386, 'ICT기금 사업관리 15개월 사이클을 완수하라', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '24px',
            color: '#f8f3ff'
        }).setOrigin(0.5);

        const startText = this.add.text(CENTER_X, 612, 'Click or Tap to Start', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '24px',
            color: '#ffd36e'
        }).setOrigin(0.5);
        this.tweens.add({ targets: startText, alpha: 0.35, yoyo: true, repeat: -1, duration: 650 });

        // BGM only starts after a user gesture so browser autoplay rules are respected.
        this.input.once('pointerdown', () => {
            playAudioIfAvailable(this, ASSETS.audio.bgmMain.key, { loop: true, volume: 0.35 });
            this.scene.start('OpeningScene');
        });
    }
}

