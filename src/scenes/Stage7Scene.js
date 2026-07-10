import * as Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { CENTER_X, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

export class Stage7Scene extends Phaser.Scene {
    constructor() {
        super('Stage7Scene');
    }

    create() {
        GameState.set('currentChapter', 7);
        this.cameras.main.setBackgroundColor(0x090714);

        const g = this.add.graphics();
        g.fillStyle(0x070816, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        g.fillStyle(0x151a39, 1).fillRect(0, 0, GAME_WIDTH, 168);
        g.fillStyle(0x0e1326, 1).fillRect(0, 168, GAME_WIDTH, GAME_HEIGHT - 168);
        g.fillStyle(0x8b60e8, 0.12).fillRoundedRect(258, 154, 764, 332, 20);
        g.fillStyle(0x120f24, 0.96).fillRoundedRect(300, 188, 680, 264, 16);

        this.add.text(CENTER_X, 228, '7단계 이동 완료', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '38px',
            color: '#fff5c7'
        }).setOrigin(0.5);

        this.add.text(CENTER_X, 308, '다음 구역은 준비 중입니다.', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '20px',
            color: '#c9ffef'
        }).setOrigin(0.5);

        this.add.text(CENTER_X, 374, '성과의 제단에서 등록한 내용이 다음 흐름으로 이어집니다.', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#f8f3ff'
        }).setOrigin(0.5);
    }
}
