import * as Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { miniGameData } from '../data/miniGameData.js';

export class DocumentCheckMiniGameScene extends Phaser.Scene {
    constructor() {
        super('DocumentCheckMiniGameScene');
        this.questionIndex = 0;
    }

    create() {
        this.questionIndex = 0;
        this.cameras.main.setBackgroundColor(0x090714);
        this.drawDesk();
        this.dialogue = new DialogueManager(this);
        this.hpText = this.add.text(622, 12, `HP ${GameState.get('hp')}`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#ffd36e'
        }).setOrigin(1, 0);
        this.questionText = this.add.text(320, 244, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            color: '#f8f3ff',
            align: 'center',
            wordWrap: { width: 580 }
        }).setOrigin(0.5);

        this.time.delayedCall(200, () => this.askQuestion());
    }

    drawDesk() {
        const g = this.add.graphics();
        g.fillStyle(0x090714, 1).fillRect(0, 0, 640, 360);
        g.fillStyle(0x18102c, 1).fillRect(0, 40, 640, 320);
        this.add.text(24, 12, miniGameData.title, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            color: '#75f6ff'
        });

        g.fillStyle(0xf2ead8, 1).fillRoundedRect(34, 62, 250, 154, 4);
        g.fillStyle(0x10121d, 1).fillRoundedRect(356, 62, 250, 154, 4);
        g.lineStyle(2, 0xffd36e, 0.65).strokeRoundedRect(34, 62, 250, 154, 4);
        g.lineStyle(2, 0x25f3ff, 0.65).strokeRoundedRect(356, 62, 250, 154, 4);
        this.add.text(54, 78, '수행계획서', { fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#2b2340' });
        this.add.text(376, 78, 'PIMS 입력창', { fontFamily: 'Arial, sans-serif', fontSize: '15px', color: '#c9ffef' });

        ['참여기간  ~ 6/30', '성과목표  90점', '계좌번호  101-44-9280'].forEach((line, index) => {
            this.add.text(58, 112 + index * 30, line, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '13px',
                color: '#2b2340'
            });
        });
        ['참여기간  ~ 12/31', '성과목표  91점', '계좌번호  101-4-9280'].forEach((line, index) => {
            this.add.text(380, 112 + index * 30, line, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '13px',
                color: '#f8f3ff'
            });
        });
    }

    askQuestion() {
        if (this.questionIndex >= miniGameData.questions.length) {
            GameState.set('pimsRegistered', true);
            GameState.set('miniGameCleared', true);
            this.dialogue.say([
                { speaker: 'PIMS', text: '필수서류 등록 완료. 사업비 교부 준비가 끝났다.' }
            ], () => this.scene.start('SealedVaultScene'));
            return;
        }

        const question = miniGameData.questions[this.questionIndex];
        this.questionText.setText(`문제 ${this.questionIndex + 1}/3\n${question.description}`);
        this.dialogue.choose({
            speaker: 'PIMS 검수',
            text: '수행계획서와 PIMS 입력창을 비교해 수정 방법을 선택하세요.',
            choices: question.choices.map((label) => ({ label }))
        }, (_, selectedIndex) => this.handleAnswer(selectedIndex));
    }

    handleAnswer(selectedIndex) {
        const question = miniGameData.questions[this.questionIndex];
        if (selectedIndex !== question.answer) {
            GameState.decreaseHp(5);
            this.hpText.setText(`HP ${GameState.get('hp')}`);
            const insult = miniGameData.wrongLines[this.questionIndex] || '그대로 저장하면 안 됩니다.';
            this.questionIndex += 1;
            this.dialogue.say([{ speaker: 'KCA 간사', text: insult }], () => this.askQuestion());
            return;
        }

        this.questionIndex += 1;
        this.askQuestion();
    }
}
