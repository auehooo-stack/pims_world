import { BOTTOM_HUD_HEIGHT, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';
import { ASSETS, getInventoryIconKey, hasTexture } from '../systems/AssetManager.js';
import { GameState } from '../systems/GameState.js';

const PANEL_TOP = GAME_HEIGHT - BOTTOM_HUD_HEIGHT;
const LEFT_PANEL_WIDTH = 722;
const RIGHT_PANEL_X = LEFT_PANEL_WIDTH + 16;
const RIGHT_PANEL_WIDTH = GAME_WIDTH - RIGHT_PANEL_X - 16;

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
        g.fillStyle(0x05050a, 0.14).fillRect(0, PANEL_TOP, GAME_WIDTH, BOTTOM_HUD_HEIGHT);
        g.fillStyle(0x0d1020, 0.18).fillRect(16, PANEL_TOP + 16, LEFT_PANEL_WIDTH - 16, BOTTOM_HUD_HEIGHT - 32);
        g.fillStyle(0x10121d, 0.12).fillRect(RIGHT_PANEL_X, PANEL_TOP + 16, RIGHT_PANEL_WIDTH, BOTTOM_HUD_HEIGHT - 32);
        g.lineStyle(1, 0x2be8ff, 0.16);
        g.lineBetween(LEFT_PANEL_WIDTH, PANEL_TOP + 16, LEFT_PANEL_WIDTH, GAME_HEIGHT - 16);
        this.container.add(g);

        if (hasTexture(this.scene, ASSETS.ui.inventoryPanel.key)) {
            this.container.add(this.scene.add.image(RIGHT_PANEL_X + RIGHT_PANEL_WIDTH / 2, PANEL_TOP + BOTTOM_HUD_HEIGHT / 2, ASSETS.ui.inventoryPanel.key)
                .setDisplaySize(RIGHT_PANEL_WIDTH, BOTTOM_HUD_HEIGHT)
                .setAlpha(0.82));
        }
    }

    createInventory() {
        this.inventoryTitle = this.scene.add.text(RIGHT_PANEL_X + 18, PANEL_TOP + 18, 'INVENTORY', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '14px',
            color: '#ffd36e'
        });
        this.container.add(this.inventoryTitle);

        const startX = RIGHT_PANEL_X + 18;
        const startY = PANEL_TOP + 42;
        const slotWidth = 64;
        const slotHeight = 64;
        const gap = 7;

        for (let col = 0; col < 6; col += 1) {
            const x = startX + col * (slotWidth + gap);
            const y = startY;
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

    createInteractionPrompt() {
        this.interactionPanel = this.scene.add.rectangle(26, PANEL_TOP + 18, LEFT_PANEL_WIDTH - 34, 134, 0x07111f, 0.08)
            .setOrigin(0, 0)
            .setStrokeStyle(1, 0x2be8ff, 0.14);
        this.container.add(this.interactionPanel);

        this.interactionPrompt = this.scene.add.text(42, PANEL_TOP + 24, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#c9ffef',
            wordWrap: { width: LEFT_PANEL_WIDTH - 80 }
        });
        this.container.add(this.interactionPrompt);
    }

    getDialogLayout() {
        return {
            panelX: 0,
            panelWidth: LEFT_PANEL_WIDTH,
            x: 34,
            y: PANEL_TOP + 17,
            bodyWidth: 526,
            choiceX: 46,
            choiceY: PANEL_TOP + 82,
            hintX: LEFT_PANEL_WIDTH - 34,
            hintY: PANEL_TOP + 20,
            speakerBoxX: 152,
            speakerBoxY: PANEL_TOP + 18,
            speakerBoxWidth: 220,
            speakerBoxHeight: 30,
            portraitX: 28,
            portraitY: PANEL_TOP + 52,
            portraitSize: 112
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
        let items = [
            { id: 'guidelineBook', label: '지침서', color: 0x75f6ff },
            { id: 'ndaDocument', label: `보안서약서 ${GameState.get('currentNdaCount')}/${GameState.get('requiredNdaCount')}`, color: 0xffd36e }
        ];

        if (GameState.get('currentChapter') === 2) {
            items = [
                { id: 'guidelineBook', label: '지침서', color: 0x75f6ff },
                {
                    id: 'stage2Receipts',
                    label: `영수증 ${GameState.get('stage2CollectedCount') || 0}개`,
                    color: 0xffd36e,
                    fontSize: '9px'
                }
            ];
        } else {
            // TODO: add the budget coin item to inventory when stage 1 clear rewards are wired in.
            if (GameState.get('businessCostCoin')) {
                items.push({ id: 'budgetCoin', label: '사업비 코인', color: 0xffd36e });
            }
        }

        const slotCount = this.inventorySlotTexts.length;
        const visibleItems = items.length > slotCount
            ? [...items.slice(0, slotCount - 1), { id: 'inventoryOverflow', label: `+${items.length - (slotCount - 1)}`, color: 0x8bd6ff, fontSize: '10px' }]
            : items;

        this.inventoryTitle?.setText('INVENTORY');

        this.inventorySlotTexts.forEach((text, index) => {
            const item = visibleItems[index];
            const iconKey = item ? getInventoryIconKey(item.id) : null;
            text.setText(item?.label || '');
            if (item?.fontSize) {
                text.setFontSize(item.fontSize);
            } else if (GameState.get('currentChapter') === 2) {
                text.setFontSize('9px');
            }
            const iconSize = item?.id === 'budgetCoin' ? 60 : (item?.id === 'ndaDocument' ? 41 : (item?.id === 'stage2Receipts' ? 40 : 43));
            const isGuideline = item?.id === 'guidelineBook';
            const iconY = this.inventorySlotShapes[index].y + (isGuideline ? 16 : 18);
            const textGap = isGuideline ? 3 : (item?.id === 'stage2Receipts' ? 2 : 5);
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

