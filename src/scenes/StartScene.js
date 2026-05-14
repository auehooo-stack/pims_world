import * as Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';

export class StartScene extends Phaser.Scene {
    constructor() {
        super('StartScene');
    }

    create() {
        GameState.reset();
        this.cameras.main.setBackgroundColor(0x090714);

        const g = this.add.graphics();
        g.fillStyle(0x12102a, 1).fillRect(0, 0, 640, 360);
        g.fillStyle(0x251348, 1).fillRect(0, 228, 640, 132);
        g.lineStyle(2, 0x25f3ff, 0.45);
        for (let x = -40; x < 680; x += 40) {
            g.lineBetween(x, 248, x + 72, 360);
        }
        for (let y = 252; y < 360; y += 18) {
            g.lineBetween(0, y, 640, y);
        }

        this.add.text(320, 104, 'PIMS WORLD', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '46px',
            color: '#fff5c7',
            stroke: '#5c1dff',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(320, 154, '퇴근 없는 테마파크', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '22px',
            color: '#75f6ff'
        }).setOrigin(0.5);

        this.add.text(320, 195, 'ICT기금 사업관리 15개월 사이클을 탈출하라', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            color: '#f8f3ff'
        }).setOrigin(0.5);

        const startText = this.add.text(320, 286, 'Click or Tap to Start', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            color: '#ffd36e'
        }).setOrigin(0.5);
        this.tweens.add({ targets: startText, alpha: 0.35, yoyo: true, repeat: -1, duration: 650 });

        // Future audio hook: this.sound.add('bgm') can use public/assets/audio/bgm.mp3 later.
        this.input.once('pointerdown', () => this.scene.start('SealedVaultScene'));
    }
}
