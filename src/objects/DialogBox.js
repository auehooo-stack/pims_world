import * as Phaser from 'phaser';
import { CENTER_X, DIALOG_HEIGHT, DIALOG_TOP, DIALOG_WIDTH, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';
import { ASSETS, hasTexture } from '../systems/AssetManager.js';
import { GameState } from '../systems/GameState.js';

const TEXT_STYLE = {
    fontFamily: 'GALMURI, Arial, sans-serif',
    fontSize: '17px',
    color: '#f8f3ff',
    wordWrap: { width: DIALOG_WIDTH - 52 },
    lineSpacing: 4
};

export class DialogBox {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.active = false;
        this.lines = [];
        this.lineIndex = 0;
        this.onComplete = null;
        this.choiceCallbacks = [];
        this.choiceNodes = [];
        this.choiceBounds = [];
        this.layout = {
            panelX: 16,
            panelWidth: 764,
            x: 34,
            y: DIALOG_TOP + 17,
            bodyWidth: 526,
            choiceX: 46,
            choiceY: DIALOG_TOP + 82,
            hintX: 688,
            hintY: GAME_HEIGHT - 38,
            speakerBoxX: 152,
            speakerBoxY: DIALOG_TOP + 34,
            speakerBoxWidth: 147,
            speakerBoxHeight: 30,
            portraitX: 30,
            portraitY: DIALOG_TOP + 26,
            portraitWidth: 105,
            portraitHeight: 120,
            ...options.layout
        };

        this.container = scene.add.container(0, 0).setDepth(1000).setVisible(false);
        if (options.showBackdrop !== false) {
            if (hasTexture(scene, ASSETS.ui.dialogPanel.key)) {
                this.backdrop = scene.add.image(this.layout.panelX + this.layout.panelWidth / 2, DIALOG_TOP + DIALOG_HEIGHT / 2, ASSETS.ui.dialogPanel.key)
                    .setDisplaySize(this.layout.panelWidth, DIALOG_HEIGHT - 18);
            } else {
                this.backdrop = scene.add.rectangle(this.layout.panelX + this.layout.panelWidth / 2, DIALOG_TOP + DIALOG_HEIGHT / 2, this.layout.panelWidth, DIALOG_HEIGHT, 0x05050a, 0.88)
                    .setStrokeStyle(2, 0x765dff, 0.8);
            }
            this.container.add(this.backdrop);
        }

        this.speakerBox = hasTexture(scene, ASSETS.ui.dialogSpeakerBox.key)
            ? scene.add.image(this.layout.speakerBoxX, this.layout.speakerBoxY, ASSETS.ui.dialogSpeakerBox.key)
                .setOrigin(0, 0)
                .setDisplaySize(this.layout.speakerBoxWidth, this.layout.speakerBoxHeight)
            : scene.add.rectangle(this.layout.speakerBoxX, this.layout.speakerBoxY, this.layout.speakerBoxWidth, this.layout.speakerBoxHeight, 0x17132a, 0.94)
                .setOrigin(0, 0)
                .setStrokeStyle(2, 0x9d5dd6, 0.72);
        this.portraitFrame = hasTexture(scene, ASSETS.ui.dialogPortraitFrame.key)
            ? scene.add.image(this.layout.portraitX, this.layout.portraitY, ASSETS.ui.dialogPortraitFrame.key)
                .setOrigin(0, 0)
                .setDisplaySize(this.layout.portraitWidth, this.layout.portraitHeight)
            : scene.add.rectangle(this.layout.portraitX, this.layout.portraitY, this.layout.portraitWidth, this.layout.portraitHeight, 0x0b0c18, 0.92)
                .setOrigin(0, 0)
                .setStrokeStyle(2, 0x2be8ff, 0.42);
        this.portraitImage = scene.add.image(this.layout.portraitX + this.layout.portraitWidth / 2, this.layout.portraitY + this.layout.portraitHeight / 2, ASSETS.characters.kcaAssistantIdle.key)
            .setDisplaySize(this.layout.portraitWidth - 12, this.layout.portraitHeight - 12)
            .setOrigin(0.5);

        this.speakerText = scene.add.text(this.layout.speakerBoxX + 14, this.layout.speakerBoxY + this.layout.speakerBoxHeight / 2, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#ffd36e'
        }).setOrigin(0, 0.5);
        this.bodyText = scene.add.text(this.layout.speakerBoxX, this.layout.speakerBoxY + this.layout.speakerBoxHeight + 14, '', {
            ...TEXT_STYLE,
            wordWrap: { width: this.layout.bodyWidth }
        });
        this.hintText = scene.add.text(this.layout.hintX, this.layout.hintY, 'Space/Enter', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '12px',
            color: '#9aa0c8'
        }).setOrigin(1, 0.5);
        this.nextIndicator = scene.add.image(this.layout.panelX + this.layout.panelWidth - 24, DIALOG_TOP + DIALOG_HEIGHT - 23, ASSETS.ui.dialogNextIndicator.key)
            .setDisplaySize(16, 12)
            .setOrigin(0.5)
            .setVisible(false);

        this.advanceArea = scene.add.rectangle(this.layout.panelX + this.layout.panelWidth / 2, DIALOG_TOP + DIALOG_HEIGHT / 2, this.layout.panelWidth, DIALOG_HEIGHT, 0x000000, 0.001)
            .setInteractive({ useHandCursor: true });
        this.advanceArea.on('pointerdown', (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            console.log('[DialogBox] advance clicked');
            this.advance();
        });

        this.container.add([this.advanceArea, this.speakerBox, this.portraitFrame, this.portraitImage, this.speakerText, this.bodyText, this.hintText, this.nextIndicator]);
        this.keydownHandler = (event) => this.handleKeydown(event);
        this.scenePointerHandler = (pointer) => this.handlePointerDown(pointer);
        scene.input.keyboard.addCapture([
            Phaser.Input.Keyboard.KeyCodes.SPACE,
            Phaser.Input.Keyboard.KeyCodes.ENTER,
            Phaser.Input.Keyboard.KeyCodes.ONE,
            Phaser.Input.Keyboard.KeyCodes.TWO,
            Phaser.Input.Keyboard.KeyCodes.NUMPAD_ONE,
            Phaser.Input.Keyboard.KeyCodes.NUMPAD_TWO
        ]);
        scene.input.keyboard.on('keydown', this.keydownHandler);
        scene.input.on('pointerdown', this.scenePointerHandler);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    }

    showLines(lines, onComplete = null) {
        this.clearChoices();
        GameState.setTimeRunning(false);
        this.active = true;
        this.lines = lines;
        this.lineIndex = 0;
        this.onComplete = onComplete;
        this.container.setVisible(true);
        this.advanceArea.setVisible(true);
        this.advanceArea.setInteractive({ useHandCursor: true });
        this.renderLine();
    }

    showChoice({ speaker, text, choices }, onChoice) {
        GameState.setTimeRunning(false);
        console.log('[DialogBox] showChoice', speaker, choices?.length || 0);
        this.active = true;
        this.lines = [];
        this.onComplete = null;
        this.container.setVisible(true);
        this.advanceArea.disableInteractive();
        this.advanceArea.setVisible(false);
        this.setNextIndicatorVisible(false);
        this.updateSpeakerVisuals(speaker);
        this.bodyText.setText(text);
        this.hintText.setText('1/2 or Click');
        this.clearChoices();
        this.choiceBounds = [];

        choices.forEach((choice, index) => {
            const buttonWidth = this.layout.bodyWidth;
            const buttonHeight = 28;
            const buttonY = this.layout.choiceY + index * 30;
            const buttonCenterX = this.layout.choiceX + buttonWidth / 2;
            const normalKey = ASSETS.ui.buttonNormal.key;
            const hoverKey = ASSETS.ui.buttonHover.key;

            let bg;
            let hoverBg = null;
            if (hasTexture(this.scene, normalKey)) {
                bg = this.scene.add.image(buttonCenterX, buttonY + buttonHeight / 2, normalKey)
                    .setDisplaySize(buttonWidth, buttonHeight);
                if (hasTexture(this.scene, hoverKey)) {
                    hoverBg = this.scene.add.image(buttonCenterX, buttonY + buttonHeight / 2, hoverKey)
                        .setDisplaySize(buttonWidth, buttonHeight)
                        .setVisible(false);
                }
            } else {
                bg = this.scene.add.rectangle(buttonCenterX, buttonY + buttonHeight / 2, buttonWidth, buttonHeight, 0x24183f, 0.95)
                    .setStrokeStyle(1, 0x75f6ff, 0.5);
            }

            const textObj = this.scene.add.text(this.layout.choiceX + 12, buttonY + 5, `${index + 1}. ${choice.label}`, {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: '13px',
                color: '#c9ffef',
                wordWrap: { width: buttonWidth - 24 }
            });

            const hitArea = this.scene.add.rectangle(buttonCenterX, buttonY + buttonHeight / 2, buttonWidth, buttonHeight, 0x000000, 0.001)
                .setInteractive({ useHandCursor: true });
            const select = (_pointer, _localX, _localY, event) => {
                event?.stopPropagation?.();
                console.log('choice clicked', choice);
                this.choose(index);
            };
            bg.setInteractive?.({ useHandCursor: true }).on('pointerdown', select);
            hoverBg?.setInteractive?.({ useHandCursor: true }).on('pointerdown', select);
            hitArea.on('pointerdown', select);
            hitArea.on('pointerover', () => {
                if (hoverBg) {
                    bg.setVisible(false);
                    hoverBg.setVisible(true);
                }
            });
            hitArea.on('pointerout', () => {
                if (hoverBg) {
                    bg.setVisible(true);
                    hoverBg.setVisible(false);
                }
            });
            textObj.setInteractive({ useHandCursor: true }).on('pointerdown', select);

            this.choiceNodes.push(bg, hoverBg, textObj, hitArea);
            this.container.add([bg, hoverBg, textObj, hitArea].filter(Boolean));
            this.choiceCallbacks[index] = () => onChoice(choice, index);
            this.choiceBounds.push({
                index,
                x: this.layout.choiceX,
                y: buttonY,
                width: buttonWidth,
                height: buttonHeight
            });
        });
    }

    renderLine() {
        const line = this.lines[this.lineIndex];
        if (!line) {
            this.close();
            return;
        }
        this.updateSpeakerVisuals(line.speaker);
        this.bodyText.setText(line.text || '');
        this.hintText.setText('Click / Space / Enter');
        this.setNextIndicatorVisible(this.lineIndex < this.lines.length - 1);
    }

    advance() {
        if (!this.active || this.choiceCallbacks.length > 0) {
            return;
        }
        this.lineIndex += 1;
        if (this.lineIndex >= this.lines.length) {
            this.close();
            return;
        }
        this.renderLine();
    }

    choose(index) {
        if (!this.active || !this.choiceCallbacks[index]) {
            return;
        }
        console.log('[DialogBox] choose', index);
        const callback = this.choiceCallbacks[index];
        this.close();
        callback();
    }

    handleKeydown(event) {
        if (!this.active) {
            return;
        }

        const code = event?.code;
        const key = event?.key;
        const keyCode = event?.keyCode;

        if (this.choiceCallbacks.length > 0) {
            if (code === 'Digit1' || code === 'Numpad1' || key === '1' || keyCode === 49 || keyCode === 97) {
                event?.preventDefault?.();
                this.choose(0);
                return;
            }
            if (code === 'Digit2' || code === 'Numpad2' || key === '2' || keyCode === 50 || keyCode === 98) {
                event?.preventDefault?.();
                this.choose(1);
            }
            return;
        }

        if (code === 'Space' || code === 'Enter' || code === 'NumpadEnter' || key === ' ' || key === 'Enter' || keyCode === 32 || keyCode === 13) {
            event?.preventDefault?.();
            this.advance();
        }
    }

    handlePointerDown(pointer) {
        if (!this.active || this.choiceCallbacks.length === 0) {
            return;
        }

        const hitChoice = this.choiceBounds.find((bounds) =>
            pointer.x >= bounds.x &&
            pointer.x <= bounds.x + bounds.width &&
            pointer.y >= bounds.y &&
            pointer.y <= bounds.y + bounds.height
        );

        if (hitChoice) {
            console.log('[DialogBox] pointer hit choice', hitChoice.index);
            this.choose(hitChoice.index);
        }
    }

    close() {
        const complete = this.onComplete;
        this.active = false;
        this.onComplete = null;
        this.lines = [];
        this.lineIndex = 0;
        this.clearChoices();
        this.setNextIndicatorVisible(false);
        this.container.setVisible(false);
        this.advanceArea.setVisible(true);
        this.advanceArea.setInteractive({ useHandCursor: true });
        GameState.setTimeRunning(true);
        if (complete) {
            complete();
        }
    }

    clearChoices() {
        this.choiceCallbacks = [];
        this.choiceBounds = [];
        this.choiceNodes.forEach((node) => node?.destroy?.());
        this.choiceNodes = [];
    }

    getPortraitKey(speaker) {
        const name = String(speaker || '');
        if (name.includes('김대리')) {
            if (hasTexture(this.scene, ASSETS.ui.dialogPortraitKimDaeri.key)) {
                return ASSETS.ui.dialogPortraitKimDaeri.key;
            }
            return ASSETS.characters.kimDaeriIdle.key;
        }
        if (hasTexture(this.scene, ASSETS.ui.dialogPortraitKcaAssistant.key)) {
            return ASSETS.ui.dialogPortraitKcaAssistant.key;
        }
        return ASSETS.characters.kcaAssistantIdle.key;
    }

    updateSpeakerVisuals(speaker) {
        const portraitKey = this.getPortraitKey(speaker);
        if (this.portraitImage?.setTexture) {
            this.portraitImage.setTexture(portraitKey);
            this.portraitImage.setVisible(true);
        }
        this.speakerText?.setText(speaker || '');
    }

    setNextIndicatorVisible(visible) {
        if (this.nextIndicator) {
            this.nextIndicator.setVisible(Boolean(visible));
        }
    }

    destroy() {
        this.scene?.input?.keyboard?.off('keydown', this.keydownHandler);
        this.scene?.input?.off('pointerdown', this.scenePointerHandler);
        this.container?.destroy(true);
    }
}

