import { BOTTOM_HUD_HEIGHT, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';
import { ASSETS, getInventoryIconKey, hasTexture } from '../systems/AssetManager.js';
import { GameState } from '../systems/GameState.js';

const PANEL_TOP = GAME_HEIGHT - BOTTOM_HUD_HEIGHT;

export class BottomHUD {
    constructor(scene) {
        this.scene = scene;
        this.inventorySlotTexts = [];
        this.inventorySlotShapes = [];
        this.inventorySlotIcons = [];

        this.container = scene.add.container(0, 0).setDepth(900);
        this.drawPanel();
        this.createInteractionPrompt();
        this.createInventory();

        scene.events.once('shutdown', () => this.destroy());
    }

    drawPanel() {
        const g = this.scene.add.graphics();
        g.fillStyle(0x05050a, 0.86).fillRect(0, PANEL_TOP, GAME_WIDTH, BOTTOM_HUD_HEIGHT);
        g.fillStyle(0x0d1020, 0.22).fillRect(16, PANEL_TOP + 16, 900, BOTTOM_HUD_HEIGHT - 32);
        g.fillStyle(0x10121d, 0.14).fillRect(916, PANEL_TOP + 16, GAME_WIDTH - 932, BOTTOM_HUD_HEIGHT - 32);
        g.lineStyle(1, 0x2be8ff, 0.25);
        for (let x = 16; x < GAME_WIDTH; x += 16) {
            g.lineBetween(x, PANEL_TOP + 8, x, PANEL_TOP + 14);
            g.lineBetween(x, GAME_HEIGHT - 14, x, GAME_HEIGHT - 8);
        }
        this.container.add(g);

        if (hasTexture(this.scene, ASSETS.ui.inventoryPanel.key)) {
            this.container.add(this.scene.add.image(GAME_WIDTH - 160, PANEL_TOP + BOTTOM_HUD_HEIGHT / 2, ASSETS.ui.inventoryPanel.key)
                .setDisplaySize(320, BOTTOM_HUD_HEIGHT));
        }
    }

    createInventory() {
        this.inventoryTitle = this.scene.add.text(930, PANEL_TOP + 18, 'INVENTORY', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '14px',
            color: '#ffd36e'
        });
        this.container.add(this.inventoryTitle);

        const startX = 930;
        const startY = PANEL_TOP + 40;
        const slotWidth = 76;
        const slotHeight = 56;
        const gap = 8;

        for (let row = 0; row < 2; row += 1) {
            for (let col = 0; col < 4; col += 1) {
                const x = startX + col * (slotWidth + gap);
                const y = startY + row * (slotHeight + gap);
                let slotShape;
                if (hasTexture(this.scene, ASSETS.ui.inventorySlot.key)) {
                    slotShape = this.scene.add.image(x + slotWidth / 2, y + slotHeight / 2, ASSETS.ui.inventorySlot.key)
                        .setDisplaySize(slotWidth, slotHeight)
                        .setOrigin(0.5);
                } else {
                    slotShape = this.scene.add.rectangle(x, y, slotWidth, slotHeight, 0x10121d, 0.92)
                        .setOrigin(0)
                        .setStrokeStyle(2, 0x8d7cff, 0.58);
                }

                const icon = null;
                const text = this.scene.add.text(x + slotWidth / 2, y + slotHeight / 2, '', {
                    fontFamily: 'GALMURI, Arial, sans-serif',
                    fontSize: '8px',
                    color: '#f8f3ff',
                    align: 'center',
                    wordWrap: { width: slotWidth - 6 }
                }).setOrigin(0.5);

                this.inventorySlotShapes.push(slotShape);
                this.inventorySlotIcons.push(icon);
                this.inventorySlotTexts.push(text);
                this.container.add([slotShape, text]);
            }
        }
    }

    createInteractionPrompt() {
        this.interactionPrompt = this.scene.add.text(34, PANEL_TOP + 20, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#c9ffef',
            wordWrap: { width: 820 }
        });
        this.container.add(this.interactionPrompt);
    }

    getDialogLayout() {
        return {
            x: 34,
            y: PANEL_TOP + 17,
            bodyWidth: 842,
            choiceX: 46,
            choiceY: PANEL_TOP + 82,
            hintX: 846,
            hintY: PANEL_TOP + 20
        };
    }

    refresh() {
        this.refreshInventory();
    }

    setInteractionPrompt(prompt) {
        this.interactionPrompt?.setText(prompt || '');
        this.interactionPrompt?.setVisible(Boolean(prompt));
    }

    refreshInventory() {
        const items = [
            { id: 'guidelineBook', label: '지침서', color: 0x75f6ff },
            { id: 'ndaDocument', label: `보안서약서 ${GameState.get('currentNdaCount')}/${GameState.get('requiredNdaCount')}`, color: 0xffd36e }
        ];

        // TODO: add the budget coin item to inventory when stage 1 clear rewards are wired in.
        if (GameState.get('businessCostCoin')) {
            items.push({ id: 'budgetCoin', label: '사업비 코인', color: 0xffd36e });
        }

        this.inventorySlotTexts.forEach((text, index) => {
            const item = items[index];
            const iconKey = item ? getInventoryIconKey(item.id) : null;
            text.setText(item?.label || '');
            const iconSize = item?.id === 'budgetCoin' ? 60 : (item?.id === 'ndaDocument' ? 41 : 43);
            const isGuideline = item?.id === 'guidelineBook';
            const iconY = this.inventorySlotShapes[index].y + (isGuideline ? 16 : 18);
            const textGap = isGuideline ? 3 : 5;
            const textY = iconY + (iconSize / 2) + textGap + 4;

            if (iconKey && hasTexture(this.scene, iconKey)) {
                if (!this.inventorySlotIcons[index]) {
                    this.inventorySlotIcons[index] = this.scene.add.image(this.inventorySlotShapes[index].x + 0, this.inventorySlotShapes[index].y + 0, iconKey)
                        .setDisplaySize(iconSize, iconSize)
                        .setOrigin(0.5);
                    this.container.add(this.inventorySlotIcons[index]);
                } else {
                    this.inventorySlotIcons[index].setTexture(iconKey).setVisible(true).setDisplaySize(iconSize, iconSize);
                }
                this.inventorySlotIcons[index].setPosition(this.inventorySlotShapes[index].x + 40, iconY);
                text.setPosition(this.inventorySlotShapes[index].x + 40, textY);
            } else {
                this.inventorySlotIcons[index]?.setVisible(false);
                text.setPosition(this.inventorySlotShapes[index].x + 40, this.inventorySlotShapes[index].y + (isGuideline ? 44 : 49));
            }

            if (this.inventorySlotShapes[index].setFillStyle) {
                this.inventorySlotShapes[index].setFillStyle(item ? item.color : 0x10121d, item ? 0.22 : 0.92);
            }
        });
    }

    destroy() {
        this.interactionPrompt?.destroy();
        this.container?.destroy(true);
    }
}

