import * as Phaser from 'phaser';
import { ASSETS, getInteractableTextureKey, hasTexture, setLinearTextureFilter } from '../systems/AssetManager.js';
import { GameState } from '../systems/GameState.js';

export class InteractableObject {
    constructor(scene, config, onInteract) {
        this.id = config.id;
        this.name = config.name;
        this.prompt = config.prompt;
        this.config = config;
        this.x = config.x;
        this.y = config.y;
        this.onInteract = onInteract;
        this.isVault = this.id === 'vault';
        this.isAssistant = this.id === 'assistant';
        this.animated = Boolean(config.animated);
        this.textureKey = config.textureKey || getInteractableTextureKey(this.id);
        this.assistantOpenTextureKey = this.isAssistant ? ASSETS.characters.kcaAssistantIdle.key : null;
        this.assistantClosedTextureKey = this.animated && this.isAssistant ? ASSETS.characters.kcaAssistantClosed.key : null;
        this.hideVisuals = Boolean(config.hideVisuals);
        this.labelOnly = Boolean(config.labelOnly);
        this.imageAlpha = typeof config.imageAlpha === 'number' ? config.imageAlpha : 1;
        setLinearTextureFilter(scene, this.textureKey);
        if (this.assistantOpenTextureKey) {
            setLinearTextureFilter(scene, this.assistantOpenTextureKey);
        }
        if (this.assistantClosedTextureKey) {
            setLinearTextureFilter(scene, this.assistantClosedTextureKey);
        }
        this.assistantBlinkCall = null;

        this.container = scene.add.container(config.x, config.y).setDepth(2).setAngle(config.angle ?? 0);
        this.shadow = scene.add.ellipse(0, config.height / 2 - 2, config.width * (this.isVault ? 0.9 : 0.82), this.isVault ? 14 : 12, 0x000000, this.isVault ? 0.24 : 0.3)
            .setScale(1, 0.8)
            .setDepth(1);
        const bodyColor = this.isVault ? 0x000000 : config.color;
        const bodyAlpha = this.isVault ? 0 : 1;
        this.body = scene.add.rectangle(0, 0, config.width, config.height, bodyColor, bodyAlpha)
            .setStrokeStyle(this.isVault ? 0 : 2, this.isVault ? 0xf0dd9c : 0xffffff, this.isVault ? 0 : 0.35);
        const labelOffset = this.isVault ? 20 : 10;
        const labelY = config.height / 2 + labelOffset;
        const labelBackgroundColor = config.labelBackgroundColor ?? 'rgba(18, 12, 34, 0.45)';
        this.label = scene.add.text(0, labelY, config.name, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#f8f3ff',
            backgroundColor: labelBackgroundColor
        }).setOrigin(0.5);
        if (this.isVault) {
            this.vaultGlow = scene.add.graphics();
        }

        this.container.add([this.shadow, this.body]);
        if (this.vaultGlow) {
            this.container.add(this.vaultGlow);
        }

        if (this.hideVisuals) {
            this.shadow.setVisible(false);
            this.body.setVisible(false);
            if (!this.labelOnly) {
                this.label.setVisible(false);
            }
        }
        if (this.isVault) {
            this.shadow.setVisible(false);
            this.body.setVisible(false);
        }

        if (this.textureKey && hasTexture(scene, this.textureKey)) {
            this.image = scene.add.image(0, 0, this.textureKey);
            this.image.setDisplaySize(config.width, config.height);
            this.image.setAlpha(this.imageAlpha);
            this.image.disableInteractive?.();
            this.body.setVisible(false);
            this.container.add(this.image);
            if (this.hideVisuals) {
                this.image.setVisible(false);
            }
        }

        const needsFallbackMark = !this.image;
        if (needsFallbackMark) {
            const interactMarkKey = ASSETS.icons.interactMark.key;
            if (hasTexture(scene, interactMarkKey)) {
                this.mark = scene.add.image(0, -config.height / 2 - 20, interactMarkKey)
                    .setDisplaySize(18, 18)
                    .setOrigin(0.5);
            } else {
                this.mark = scene.add.text(0, -config.height / 2 - 20, '!', {
                    fontFamily: 'GALMURI, Arial, sans-serif',
                    fontSize: '18px',
                    color: '#ffd36e'
                }).setOrigin(0.5);
            }
            this.container.add(this.mark);
            this.mark.setVisible(false);
            if (this.hideVisuals) {
                this.mark.setVisible(false);
            }
        }

        this.container.add(this.label);

        if (this.isAssistant) {
            this.queueAssistantBlink(Phaser.Math.Between(1100, 2600));
        }
    }

    update() {
        this.x = this.container.x;
        this.y = this.container.y;
        if (this.isVault && this.vaultGlow) {
            const cleared = Boolean(GameState.get('miniGameCleared'));
            const opened = Boolean(GameState.get('sealedVaultOpened'));
            this.vaultGlow.clear();
            if (cleared && !opened) {
                const pulse = 0.42 + Math.sin(Date.now() / 250) * 0.12;
                this.vaultGlow.lineStyle(3, 0xffd36e, pulse);
                this.vaultGlow.strokeRoundedRect(-this.config.width / 2 - 4, -this.config.height / 2 - 4, this.config.width + 8, this.config.height + 8, 10);
                this.vaultGlow.lineStyle(6, 0xfff0b6, pulse * 0.10);
                this.vaultGlow.strokeRoundedRect(-this.config.width / 2 - 10, -this.config.height / 2 - 10, this.config.width + 20, this.config.height + 20, 14);
            }
            this.vaultGlow.setVisible(cleared && !opened);
        }
    }

    setAssistantTexture(textureKey) {
        if (!this.isAssistant || !this.image || !textureKey || !hasTexture(this.container.scene, textureKey)) {
            return;
        }

        this.image.setTexture(textureKey);
    }

    queueAssistantBlink(delayMs) {
        if (!this.isAssistant) {
            return;
        }

        this.assistantBlinkCall?.remove(false);
        this.assistantBlinkCall = this.container.scene.time.delayedCall(delayMs, () => this.startAssistantBlink());
    }

    startAssistantBlink() {
        if (!this.isAssistant || !this.container?.scene) {
            return;
        }

        if (!this.image || !this.assistantClosedTextureKey || !hasTexture(this.container.scene, this.assistantClosedTextureKey)) {
            this.queueAssistantBlink(Phaser.Math.Between(1600, 2800));
            return;
        }

        this.image.setTexture(this.assistantClosedTextureKey);
        this.assistantBlinkCall = this.container.scene.time.delayedCall(140, () => {
            if (!this.image) {
                return;
            }
            this.image.setTexture(this.assistantOpenTextureKey || this.textureKey);
            this.queueAssistantBlink(Phaser.Math.Between(1800, 3200));
        });
    }

    setInteractionFocus(isFocused) {
        if (!this.mark || this.hideVisuals) {
            return;
        }
        this.mark.setVisible(Boolean(isFocused));
    }

    destroy(fromScene) {
        this.assistantBlinkCall?.remove(false);
        this.image?.destroy();
        this.mark?.destroy();
        this.label?.destroy();
        this.body?.destroy();
        this.shadow?.destroy();
        this.vaultGlow?.destroy();
        this.container?.destroy();
    }
}

