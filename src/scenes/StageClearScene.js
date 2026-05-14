import * as Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { dialogueData } from '../data/dialogueData.js';

export class StageClearScene extends Phaser.Scene {
    constructor() {
        super('StageClearScene');
    }

    create() {
        GameState.set('stage1Cleared', true);
        GameState.set('sealedVaultOpened', true);
        this.cameras.main.setBackgroundColor(0x090714);
        this.drawClearScene();
        this.dialogue = new DialogueManager(this);
        this.time.delayedCall(350, () => {
            this.dialogue.say(dialogueData.stageClear, () => this.showButtons());
        });
    }

    drawClearScene() {
        const g = this.add.graphics();
        g.fillStyle(0x090714, 1).fillRect(0, 0, 640, 360);
        g.fillStyle(0x170d2b, 1).fillRect(0, 210, 640, 150);
        g.fillStyle(0x4b3f64, 1).fillRoundedRect(238, 58, 164, 176, 8);
        g.fillStyle(0x090714, 1).fillRoundedRect(278, 84, 124, 150, 8);
        g.fillStyle(0x3b3154, 1).fillRoundedRect(238, 58, 76, 176, 8);
        g.lineStyle(4, 0xffd36e, 0.9).strokeCircle(326, 142, 28);
        g.fillStyle(0xffd36e, 1);

        for (let i = 0; i < 24; i += 1) {
            const x = 260 + (i * 37) % 130;
            const y = 208 + (i * 19) % 72;
            g.fillCircle(x, y, 6);
            this.add.text(x, y - 3, '₩', {
                fontFamily: 'Arial, sans-serif',
                fontSize: '8px',
                color: '#553500'
            }).setOrigin(0.5);
        }

        this.add.text(320, 34, '금고 개방', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '28px',
            color: '#fff5c7',
            stroke: '#5c1dff',
            strokeThickness: 5
        }).setOrigin(0.5);
        this.add.text(320, 194, '사업비', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '18px',
            color: '#ffd36e'
        }).setOrigin(0.5);
    }

    showButtons() {
        this.add.text(320, 252, '1단계 클리어! 다음 업데이트에서 2단계 [집행의 집]이 열립니다.', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            color: '#c9ffef',
            align: 'center',
            wordWrap: { width: 560 }
        }).setOrigin(0.5);

        this.createButton(230, 308, '처음으로 돌아가기', () => this.scene.start('StartScene'));
        this.createButton(410, 308, '다시 플레이', () => {
            GameState.reset();
            this.scene.start('SealedVaultScene');
        });
    }

    createButton(x, y, label, onClick) {
        const rect = this.add.rectangle(x, y, 146, 32, 0x24183f, 1)
            .setStrokeStyle(2, 0x75f6ff, 0.8)
            .setInteractive({ useHandCursor: true });
        const text = this.add.text(x, y, label, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            color: '#f8f3ff'
        }).setOrigin(0.5);
        rect.on('pointerover', () => rect.setFillStyle(0x322159));
        rect.on('pointerout', () => rect.setFillStyle(0x24183f));
        rect.on('pointerdown', onClick);
        text.setInteractive({ useHandCursor: true }).on('pointerdown', onClick);
    }
}
