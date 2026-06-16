import * as Phaser from 'phaser';
import { chapter1Data } from '../data/chapter1Data.js';
import { dialogueData } from '../data/dialogueData.js';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { InteractionManager } from '../systems/InteractionManager.js';
import { Player } from '../objects/Player.js';
import { InteractableObject } from '../objects/InteractableObject.js';
import { BottomHUD } from '../objects/BottomHUD.js';
import { TopHUD } from '../objects/TopHUD.js';
import { ASSETS, hasTexture } from '../systems/AssetManager.js';
import { CENTER_X, DIALOG_TOP, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

export class SealedVaultScene extends Phaser.Scene {
    constructor() {
        super('SealedVaultScene');
        this.clickTarget = null;
        this.vaultOpening = false;
        this.backgroundLayers = {};
    }

    create() {
        this.cameras.main.setBackgroundColor(0x090714);
        this.drawBackground();
        this.createHud();
        this.dialogue = new DialogueManager(this, {
            layout: this.bottomHud.getDialogLayout()
        });

        const savedPlayerPosition = GameState.get('savedPlayerPosition') || chapter1Data.playerStart;
        this.player = new Player(this, savedPlayerPosition.x, savedPlayerPosition.y);
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

        this.interactables = chapter1Data.objects.map((config) => new InteractableObject(
            this,
            config,
            () => this.handleInteraction(config.id)
        ));

        this.interaction = new InteractionManager(this, this.player, this.interactables, (prompt) => this.bottomHud.setInteractionPrompt(prompt));
        this.spaceKey.on('down', () => this.tryInteract());
        this.input.keyboard.on('keydown-SPACE', () => this.tryInteract());
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.dialogue.isActive) {
                return;
            }
            this.tryInteract();
        });

        this.input.on('pointerdown', (pointer) => {
            if (this.dialogue.isActive || pointer.y > DIALOG_TOP) {
                return;
            }
            this.clickTarget = this.clampToWalkable(pointer.x, pointer.y);
        });

        if (!GameState.get('hasCheckedInventory')) {
            this.time.delayedCall(250, () => {
                this.dialogue.say([
                    {
                        speaker: 'KCA 간사',
                        text: '김대리님, 참여인력이 총 10명인데 보안서약서가 8장 뿐이네요. 누락된 2장을 서류보관함에서 찾아 PIMS에 추가 등록해주세요.'
                    }
                ], () => {
                    GameState.set('hasCheckedInventory', true);
                });
            });
        }

        if (GameState.get('showDocumentCheckToast')) {
            GameState.set('showDocumentCheckToast', false);
            this.time.delayedCall(250, () => {
                const toastBg = this.add.rectangle(CENTER_X, 420, 420, 48, 0x05050a, 0.88)
                    .setStrokeStyle(1, 0x75f6ff, 0.45)
                    .setDepth(1200);
                const toastText = this.add.text(CENTER_X, 420, '필수서류 등록 완료', {
                    fontFamily: 'GALMURI, Arial, sans-serif',
                    fontSize: '18px',
                    color: '#f8f3ff',
                    stroke: '#000000',
                    strokeThickness: 3
                }).setOrigin(0.5).setDepth(1201);
                this.tweens.add({
                    targets: [toastBg, toastText],
                    alpha: { from: 1, to: 0 },
                    duration: 1900,
                    delay: 700,
                    onComplete: () => {
                        toastBg.destroy();
                        toastText.destroy();
                    }
                });
            });
        }

        this.refreshHud();
    }

    update() {
        const blocked = this.dialogue.isActive;
        this.interactables.forEach((item) => item.update?.());
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
            console.log('[SealedVaultScene] assistant interact');
            this.openAssistantDialog();
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
            const toastBg = this.add.rectangle(CENTER_X, 420, 420, 48, 0x05050a, 0.88)
                .setStrokeStyle(1, 0x75f6ff, 0.45)
                .setDepth(1200);
            const toastText = this.add.text(CENTER_X, 420, '서류 2장을 찾았습니다.', {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: '18px',
                color: '#f8f3ff',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(1201);
            this.tweens.add({
                targets: [toastBg, toastText],
                alpha: { from: 1, to: 0 },
                duration: 1900,
                delay: 700,
                onComplete: () => {
                    toastBg.destroy();
                    toastText.destroy();
                }
            });
            this.dialogue.say(dialogueData.cabinetFound);
            return;
        }

        if (id === 'terminal') {
            const required = GameState.get('requiredNdaCount') ?? 10;
            const current = GameState.get('currentNdaCount') ?? 0;
            if (current < required) {
                this.dialogue.say(`보안서약서가 ${required}장 있어야 PIMS 미니게임을 시작할 수 있습니다.`);
                return;
            }
            GameState.set('savedPlayerPosition', { x: this.player.x, y: this.player.y });
            this.dialogue.say(dialogueData.terminalReady, () => this.scene.start('DocumentCheckMiniGameScene'));
            return;
        }

        if (id === 'vault') {
            if (!GameState.get('miniGameCleared')) {
                this.dialogue.say(dialogueData.vaultLocked);
                return;
            }
            if (this.vaultOpening || GameState.get('sealedVaultOpened')) {
                return;
            }
            this.openVaultAndAdvance();
        }
    }

    openAssistantDialog() {
        const state = {
            currentObjective: GameState.getCurrentObjective(),
            hasGuidelineBook: Boolean(GameState.get('hasCheckedInventory')),
            hasSecurityPledge: GameState.get('currentNdaCount'),
            documentCheckCleared: Boolean(GameState.get('miniGameCleared')),
            inventory: {
                missingNdaCount: GameState.get('missingNdaCount'),
                requiredNdaCount: GameState.get('requiredNdaCount'),
                currentNdaCount: GameState.get('currentNdaCount'),
                hasFoundMissingNdas: Boolean(GameState.get('hasFoundMissingNdas')),
                pimsRegistered: Boolean(GameState.get('pimsRegistered'))
            },
            isDialogOpen: this.dialogue.isActive,
            dialogVisible: Boolean(this.dialogue.dialogBox?.container?.visible),
            currentInteractable: this.interaction?.current?.id || null
        };
        console.log('[SealedVaultScene] opening assistant dialog', state);

        this.dialogue.dialogBox?.container?.setVisible(true);
        this.dialogue.dialogBox?.container?.setDepth(1000);
        this.time.delayedCall(50, () => {
            console.log('[SealedVaultScene] assistant dialog showLines');
            this.dialogue.say([
                { speaker: 'KCA 간사', text: 'PIMS 단말기에 필수서류를 등록한 후, 금고를 확인하세요.' }
            ]);
        });
    }

    openVaultAndAdvance() {
        this.vaultOpening = true;
        GameState.set('sealedVaultOpened', true);
        this.player.setMovement(0, 0);
        this.interaction.update(true);

        Object.values(this.backgroundLayers || {}).forEach((layer) => {
            if (layer) {
                layer.setVisible(false);
            }
        });

        if (this.backgroundLayers.open) {
            this.backgroundLayers.open.setVisible(true);
            this.backgroundLayers.open.setAlpha(0);
            this.tweens.add({
                targets: this.backgroundLayers.open,
                alpha: { from: 0, to: 1 },
                duration: 220,
                ease: 'Sine.easeOut'
            });
        }

        this.dialogue.say([
            { speaker: 'KCA 간사', text: '좋습니다. 금고가 열렸습니다.' },
            { speaker: 'KCA 간사', text: '이제 2단계인 집행의 집에서 사업비를 집행하는 방법을 알아보시죠.' }
        ], () => {
            this.scene.start('ExecutionHouseScene');
        });
    }

    tryInteract() {
        if (!this.dialogue.isActive) {
            this.interaction.interact();
        }
    }

    drawBackground() {
        const farKey = ASSETS.backgrounds.sealedVaultFar.key;
        const midKey = ASSETS.backgrounds.sealedVaultMid.key;
        const legacyKey = ASSETS.backgrounds.sealedVault.key;
        const openKey = ASSETS.backgrounds.sealedVaultOpen.key;
        const bgY = GAME_HEIGHT / 2;

        if (hasTexture(this, farKey)) {
            this.backgroundLayers.far = this.add.image(CENTER_X, bgY, farKey)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setDepth(0);
        } else {
            this.backgroundLayers.far = this.drawFarFallback();
        }

        if (hasTexture(this, midKey)) {
            this.backgroundLayers.mid = this.add.image(CENTER_X, bgY, midKey)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setDepth(1);
        } else if (hasTexture(this, legacyKey)) {
            this.backgroundLayers.mid = this.add.image(CENTER_X, bgY, legacyKey)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setDepth(1);
            this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x090714, 0.12)
                .setDepth(1.1);
        } else {
            this.backgroundLayers.mid = this.drawMidFallback();
        }

        this.backgroundLayers.open = hasTexture(this, openKey)
            ? this.add.image(CENTER_X, bgY, openKey)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setDepth(2)
                .setVisible(false)
            : null;

    }

    drawFarFallback() {
        const g = this.add.graphics().setDepth(0);
        g.fillStyle(0x070710, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        g.fillStyle(0x100b21, 1).fillRect(0, 0, GAME_WIDTH, 160);
        g.fillStyle(0x1a1236, 1).fillRect(0, 52, GAME_WIDTH, 200);
        g.fillStyle(0x0d1630, 1).fillRect(0, 0, GAME_WIDTH, 110);
        g.fillStyle(0x2a1a4d, 0.45).fillRect(0, 88, GAME_WIDTH, 42);
        g.fillStyle(0x25153d, 0.55).fillCircle(168, 78, 78).fillCircle(1066, 62, 88);
        g.fillStyle(0x2a2047, 0.35).fillRect(96, 40, 80, 120).fillRect(1020, 26, 94, 138);
        g.fillStyle(0x0a0f18, 1).fillRect(0, 122, GAME_WIDTH, 6);
        return g;
    }

    drawMidFallback() {
        const g = this.add.graphics().setDepth(1);
        g.fillStyle(0x090714, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        g.fillStyle(0x130b2a, 1).fillRect(0, 134, GAME_WIDTH, 250);
        g.fillStyle(0x1b1234, 1).fillRect(0, 384, GAME_WIDTH, 150);
        g.fillStyle(0x20143c, 1).fillRect(0, 484, GAME_WIDTH, GAME_HEIGHT - 484);

        g.fillStyle(0x05050a, 1)
            .fillRect(74, 170, 150, 126)
            .fillRect(250, 108, 90, 202)
            .fillRect(406, 150, 136, 156)
            .fillRect(692, 152, 124, 154)
            .fillRect(846, 140, 72, 176);

        g.fillStyle(0x1a2240, 1).fillRect(52, 314, 232, 34).fillRect(318, 300, 186, 28).fillRect(548, 324, 192, 26);
        g.fillStyle(0xff4f86, 1).fillRect(110, 198, 16, 16).fillRect(168, 230, 16, 16);
        g.fillStyle(0x25f3ff, 1).fillRect(252, 124, 12, 108).fillRect(472, 176, 12, 72);
        g.fillStyle(0x4df0b6, 1).fillRect(720, 188, 14, 64).fillRect(872, 168, 14, 92);

        this.add.text(1012, 166, 'SEALED\nVAULT', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '30px',
            color: '#ffe58a',
            align: 'center',
            stroke: '#31125f',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1.1);

        g.lineStyle(1, 0x72f0ff, 0.18);
        const area = chapter1Data.walkableArea;
        g.strokeRect(area.x, area.y, area.width, area.height);
        return g;
    }

    createHud() {
        this.topHud = new TopHUD(this, { title: chapter1Data.title });
        this.bottomHud = new BottomHUD(this);
    }

    refreshHud() {
        this.topHud.refresh();
        this.bottomHud.refresh();
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

