import * as Phaser from 'phaser';
import { chapter1Data } from '../data/chapter1Data.js';
import { dialogueData } from '../data/dialogueData.js';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { InteractionManager } from '../systems/InteractionManager.js';
import { Player } from '../objects/Player.js';
import { InteractableObject } from '../objects/InteractableObject.js';

export class SealedVaultScene extends Phaser.Scene {
    constructor() {
        super('SealedVaultScene');
        this.clickTarget = null;
    }

    create() {
        this.cameras.main.setBackgroundColor(0x090714);
        this.drawBackground();
        this.dialogue = new DialogueManager(this);

        this.player = new Player(this, chapter1Data.playerStart.x, chapter1Data.playerStart.y);
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.interactables = chapter1Data.objects.map((config) => new InteractableObject(
            this,
            config,
            () => this.handleInteraction(config.id)
        ));

        this.createHud();
        this.interaction = new InteractionManager(this, this.player, this.interactables, this.promptText);
        this.spaceKey.on('down', () => {
            if (!this.dialogue.isActive) {
                this.interaction.interact();
            }
        });

        this.input.on('pointerdown', (pointer) => {
            if (this.dialogue.isActive || pointer.y > 296) {
                return;
            }
            this.clickTarget = this.clampToWalkable(pointer.x, pointer.y);
        });

        if (!GameState.get('hasCheckedInventory')) {
            this.time.delayedCall(250, () => {
                this.dialogue.choose(dialogueData.intro, (choice) => this.resolveIntroChoice(choice.result));
            });
        }

        this.refreshHud();
    }

    update() {
        const blocked = this.dialogue.isActive;
        this.interaction.update(blocked);
        this.refreshHud();

        if (blocked) {
            this.player.setMovement(0, 0);
            return;
        }

        const axis = this.getKeyboardAxis();
        if (axis.x !== 0 || axis.y !== 0) {
            this.clickTarget = null;
            const length = Math.hypot(axis.x, axis.y) || 1;
            this.player.setMovement(
                (axis.x / length) * this.player.speed,
                (axis.y / length) * this.player.speed
            );
        } else if (this.clickTarget) {
            this.moveTowardClickTarget();
        } else {
            this.player.setMovement(0, 0);
        }

        this.clampPlayerToWalkable();
        this.player.syncLabel();
    }

    getKeyboardAxis() {
        return {
            x: (this.cursors.left.isDown || this.wasd.A.isDown ? -1 : 0) + (this.cursors.right.isDown || this.wasd.D.isDown ? 1 : 0),
            y: (this.cursors.up.isDown || this.wasd.W.isDown ? -1 : 0) + (this.cursors.down.isDown || this.wasd.S.isDown ? 1 : 0)
        };
    }

    moveTowardClickTarget() {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.clickTarget.x, this.clickTarget.y);
        if (distance < 4) {
            this.clickTarget = null;
            this.player.setMovement(0, 0);
            return;
        }

        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.clickTarget.x, this.clickTarget.y);
        this.player.setMovement(Math.cos(angle) * this.player.speed, Math.sin(angle) * this.player.speed);
    }

    handleInteraction(id) {
        if (id === 'assistant') {
            this.dialogue.say(dialogueData.assistantDefault);
            return;
        }

        if (id === 'cabinet') {
            if (GameState.get('hasFoundMissingNdas')) {
                this.dialogue.say(dialogueData.cabinetAlreadyFound);
                return;
            }
            GameState.set('missingNdaCount', 2);
            GameState.set('currentNdaCount', 10);
            GameState.set('hasFoundMissingNdas', true);
            this.dialogue.say(dialogueData.cabinetFound);
            return;
        }

        if (id === 'terminal') {
            if (!GameState.get('hasFoundMissingNdas')) {
                this.dialogue.say(dialogueData.terminalLocked);
                return;
            }
            this.dialogue.say(dialogueData.terminalReady, () => this.scene.start('DocumentCheckMiniGameScene'));
            return;
        }

        if (id === 'vault') {
            if (!GameState.get('miniGameCleared')) {
                this.dialogue.say(dialogueData.vaultLocked);
                return;
            }
            GameState.set('sealedVaultOpened', true);
            this.scene.start('StageClearScene');
        }
    }

    resolveIntroChoice(result) {
        GameState.set('hasCheckedInventory', true);
        if (result === 'confident') {
            GameState.decreaseHp(5);
            this.dialogue.say(dialogueData.confidentResult);
            return;
        }
        this.dialogue.say(dialogueData.carefulResult);
    }

    drawBackground() {
        const g = this.add.graphics();
        g.fillStyle(0x090714, 1).fillRect(0, 0, 640, 360);
        g.fillStyle(0x140b2c, 1).fillRect(0, 72, 640, 180);
        g.fillStyle(0x20143c, 1).fillRect(0, 242, 640, 118);
        g.lineStyle(1, 0x2be8ff, 0.25);
        for (let x = 0; x < 640; x += 24) {
            g.lineBetween(x, 252, x - 38, 360);
            g.lineBetween(x, 252, x + 38, 360);
        }
        g.fillStyle(0x05050a, 1).fillRect(40, 84, 72, 68).fillRect(118, 54, 46, 98).fillRect(202, 76, 70, 76);
        g.fillStyle(0xff4f86, 1).fillRect(56, 98, 8, 8).fillRect(84, 116, 8, 8);
        g.fillStyle(0x25f3ff, 1).fillRect(124, 62, 6, 52).fillRect(236, 88, 7, 36);

        // Replace with public/assets/backgrounds/sealed_vault.png when art is ready.
        this.add.text(506, 84, 'SEALED\nVAULT', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '17px',
            color: '#ffe58a',
            align: 'center',
            stroke: '#31125f',
            strokeThickness: 4
        }).setOrigin(0.5);
        g.lineStyle(4, 0x8d7cff, 0.65).strokeCircle(518, 164, 46);
        g.lineStyle(2, 0xffd36e, 0.8).strokeCircle(518, 164, 18);
        g.lineBetween(500, 164, 536, 164).lineBetween(518, 146, 518, 182);

        const area = chapter1Data.walkableArea;
        g.lineStyle(1, 0x72f0ff, 0.25).strokeRect(area.x, area.y, area.width, area.height);
    }

    createHud() {
        this.add.rectangle(320, 18, 640, 36, 0x05050a, 0.78);
        this.titleText = this.add.text(16, 10, chapter1Data.title, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#f8f3ff'
        });
        this.monthText = this.add.text(320, 10, chapter1Data.month, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#75f6ff'
        }).setOrigin(0.5, 0);
        this.hpText = this.add.text(624, 10, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#ffd36e'
        }).setOrigin(1, 0);
        this.promptText = this.add.text(320, 326, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#c9ffef',
            backgroundColor: '#05050ad8',
            padding: { x: 8, y: 4 }
        }).setOrigin(0.5);
    }

    refreshHud() {
        this.hpText.setText(`HP ${GameState.get('hp')}`);
    }

    clampToWalkable(x, y) {
        const area = chapter1Data.walkableArea;
        return {
            x: Phaser.Math.Clamp(x, area.x, area.x + area.width),
            y: Phaser.Math.Clamp(y, area.y, area.y + area.height)
        };
    }

    clampPlayerToWalkable() {
        const clamped = this.clampToWalkable(this.player.x, this.player.y);
        this.player.setPosition(clamped.x, clamped.y);
    }
}
