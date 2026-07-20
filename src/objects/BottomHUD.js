import { BOTTOM_HUD_HEIGHT, DIALOG_HEIGHT, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';
import { ASSETS, getInventoryIconKey, hasTexture } from '../systems/AssetManager.js';
import { GameState } from '../systems/GameState.js';

const PANEL_TOP = GAME_HEIGHT - BOTTOM_HUD_HEIGHT;
const LEFT_PANEL_WIDTH = 780;
const RIGHT_PANEL_X = LEFT_PANEL_WIDTH + 2;
const RIGHT_PANEL_WIDTH = GAME_WIDTH - RIGHT_PANEL_X - 16;
const INVENTORY_SLOT_WIDTH = 68;
const INVENTORY_SLOT_HEIGHT = 90;
const INVENTORY_SLOT_GAP = 8;
const INVENTORY_SLOT_START_Y = PANEL_TOP + 62;
const INVENTORY_ICON_SIZE = 54;

export class BottomHUD {
    constructor(scene) {
        this.scene = scene;
        this.inventorySlotTexts = [];
        this.inventorySlotShapes = [];
        this.inventorySlotIcons = [];
        this.inventorySlotBadges = [];
        this.inventorySlotBadgeTexts = [];
        this.interactionVisible = true;

        this.container = scene.add.container(0, 0).setDepth(900);
        this.drawPanel();
        this.createInteractionPrompt();
        this.createInventory();

        scene.events.once('shutdown', () => this.destroy());
    }

    drawPanel() {
        const g = this.scene.add.graphics();
        this.container.add(g);

        if (hasTexture(this.scene, ASSETS.ui.inventoryPanel.key)) {
            this.container.add(this.scene.add.image(RIGHT_PANEL_X + RIGHT_PANEL_WIDTH / 2, PANEL_TOP + BOTTOM_HUD_HEIGHT / 2, ASSETS.ui.inventoryPanel.key)
                .setDisplaySize(RIGHT_PANEL_WIDTH, BOTTOM_HUD_HEIGHT - 18)
                .setAlpha(0.82));
        }
    }

    createInventory() {
        const startX = RIGHT_PANEL_X + 18;
        const startY = INVENTORY_SLOT_START_Y;
        const slotWidth = INVENTORY_SLOT_WIDTH;
        const slotHeight = INVENTORY_SLOT_HEIGHT;
        const gap = INVENTORY_SLOT_GAP;

        for (let col = 0; col < 6; col += 1) {
            const x = startX + col * (slotWidth + gap);
            const y = startY;
            let slotShape;
            if (hasTexture(this.scene, ASSETS.ui.inventorySlot.key)) {
                slotShape = this.scene.add.image(x + slotWidth / 2, y + slotHeight / 2, ASSETS.ui.inventorySlot.key)
                    .setDisplaySize(slotWidth, slotHeight)
                    .setOrigin(0.5);
            } else {
                slotShape = this.scene.add.rectangle(x, y, slotWidth, slotHeight, 0x000000, 0.0)
                    .setOrigin(0);
            }

            const icon = null;
            const nameText = this.scene.add.text(x + slotWidth / 2, y + slotHeight / 2, '', {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: '9px',
                color: '#f8f3ff',
                align: 'center',
                wordWrap: { width: slotWidth - 6 }
            }).setOrigin(0.5);
            const badge = this.scene.add.graphics().setVisible(false);
            const badgeText = this.scene.add.text(0, 0, '', {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: '10px',
                color: '#f8f3ff',
                align: 'center'
            }).setOrigin(0.5).setVisible(false);

            this.inventorySlotShapes.push(slotShape);
            this.inventorySlotIcons.push(icon);
            this.inventorySlotTexts.push(nameText);
            this.inventorySlotBadges.push(badge);
            this.inventorySlotBadgeTexts.push(badgeText);
            this.container.add([slotShape, badge, badgeText, nameText]);
        }
    }

    createInteractionPrompt() {
        const layout = this.getDialogLayout();
        const panelX = layout.panelX;
        const panelY = PANEL_TOP + 9;
        const panelWidth = layout.panelWidth;
        const panelHeight = DIALOG_HEIGHT - 18;
        const speakerBoxWidth = layout.speakerBoxWidth;
        const speakerBoxHeight = layout.speakerBoxHeight;
        const speakerBoxX = layout.speakerBoxX;
        const speakerBoxY = layout.speakerBoxY;
        const portraitX = layout.portraitX;
        const portraitY = layout.portraitY;
        const portraitWidth = layout.portraitWidth;
        const portraitHeight = layout.portraitHeight;
        this.interactionGroup = this.scene.add.container(0, 0);

        if (hasTexture(this.scene, ASSETS.ui.dialogPanel.key)) {
            this.interactionPanel = this.scene.add.image(panelX + panelWidth / 2, panelY + panelHeight / 2, ASSETS.ui.dialogPanel.key)
                .setDisplaySize(panelWidth, panelHeight)
                .setOrigin(0.5)
                .setAlpha(0.82);
        } else {
            this.interactionPanel = this.scene.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x07111f, 0.82)
                .setOrigin(0, 0)
                .setStrokeStyle(1, 0x2be8ff, 0.14);
        }
        this.container.add(this.interactionPanel);

        this.interactionPortraitFrame = hasTexture(this.scene, ASSETS.ui.dialogPortraitFrame.key)
            ? this.scene.add.image(portraitX, portraitY, ASSETS.ui.dialogPortraitFrame.key)
                .setOrigin(0, 0)
                .setDisplaySize(portraitWidth, portraitHeight)
            : this.scene.add.rectangle(portraitX, portraitY, portraitWidth, portraitHeight, 0x0b0c18, 0.92)
                .setOrigin(0, 0)
                .setStrokeStyle(2, 0x2be8ff, 0.42);

        this.interactionPortraitImage = hasTexture(this.scene, ASSETS.ui.dialogPortraitPimsWorld.key)
            ? this.scene.add.image(portraitX + portraitWidth / 2, portraitY + portraitHeight / 2 + 0, ASSETS.ui.dialogPortraitPimsWorld.key)
                .setOrigin(0.5)
                .setDisplaySize(portraitWidth - 20, portraitHeight - 20)
            : null;

        this.interactionSpeakerBox = hasTexture(this.scene, ASSETS.ui.dialogSpeakerBox.key)
            ? this.scene.add.image(speakerBoxX, speakerBoxY, ASSETS.ui.dialogSpeakerBox.key)
                .setOrigin(0, 0)
                .setDisplaySize(speakerBoxWidth, speakerBoxHeight)
            : this.scene.add.rectangle(speakerBoxX, speakerBoxY, speakerBoxWidth, speakerBoxHeight, 0x17132a, 0.5)
                .setOrigin(0, 0)
                .setStrokeStyle(2, 0x9d5dd6, 0.72);

        this.interactionSpeakerText = this.scene.add.text(speakerBoxX + 14, speakerBoxY + speakerBoxHeight / 2, 'PIMS WORLD', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '14px',
            color: '#ffd36e'
        }).setOrigin(0, 0.5);

        this.interactionPrompt = this.scene.add.text(layout.x, speakerBoxY + speakerBoxHeight + 14, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#c9ffef',
            wordWrap: { width: layout.bodyWidth }
        });

        this.interactionGroup.add([this.interactionPanel, this.interactionPortraitFrame, this.interactionPortraitImage, this.interactionSpeakerBox, this.interactionSpeakerText, this.interactionPrompt].filter(Boolean));
        this.container.add(this.interactionGroup);
    }

    getDialogLayout() {
        return {
            panelX: 16,
            panelWidth: 764,
            x: 34,
            y: PANEL_TOP + 17,
            bodyWidth: 526,
            choiceX: 46,
            choiceY: PANEL_TOP + 82,
            hintX: 688,
            hintY: PANEL_TOP + 20,
            speakerBoxX: 152,
            speakerBoxY: PANEL_TOP + 34,
            speakerBoxWidth: 147,
            speakerBoxHeight: 30,
            portraitX: 30,
            portraitY: PANEL_TOP + 26,
            portraitWidth: 105,
            portraitHeight: 120
        };
    }

    refresh() {
        this.refreshInventory();
        this.refreshInteractionPrompt();
    }

    setInteractionPrompt(prompt) {
        this.lastInteractionPrompt = prompt || '';
        this.refreshInteractionPrompt();
    }

    refreshInteractionPrompt() {
        if (!this.interactionVisible) {
            this.interactionGroup?.setVisible(false);
            this.interactionPanel?.setVisible(false);
            this.interactionPortraitFrame?.setVisible(false);
            this.interactionPortraitImage?.setVisible(false);
            this.interactionSpeakerBox?.setVisible(false);
            this.interactionSpeakerText?.setVisible(false);
            this.interactionPrompt?.setVisible(false);
            return;
        }

        const prompt = String(this.lastInteractionPrompt || '').trim();
        const hasPrompt = Boolean(prompt);
        const objectiveText = `현재 목표: ${GameState.getCurrentObjective()}`;

        this.interactionGroup?.setVisible(true);
        this.interactionPanel?.setVisible(true);
        this.interactionPortraitFrame?.setVisible(true);
        this.interactionPortraitImage?.setVisible(true);
        this.interactionSpeakerBox?.setVisible(true);
        this.interactionSpeakerText?.setVisible(true);
        this.interactionSpeakerText?.setText('PIMS WORLD');
        this.interactionPrompt?.setPosition(164, PANEL_TOP + 68);
        this.interactionPrompt?.setFontSize('16px');
        this.interactionPrompt?.setVisible(true);

        if (hasPrompt) {
            this.interactionPrompt?.setColor('#c9ffef');
            this.interactionPrompt?.setText(prompt);
            return;
        }

        this.interactionPrompt?.setColor('#fff5c7');
        this.interactionPrompt?.setText(objectiveText);
    }

    setInteractionVisible(visible) {
        this.interactionVisible = Boolean(visible);
        this.interactionGroup?.setVisible(this.interactionVisible);
        this.refreshInteractionPrompt();
    }

    refreshInventory() {
        let items = [
            { id: 'guidelineBook', label: '지침서', color: 0x75f6ff, count: 1 }
        ];

        if (GameState.get('currentChapter') === 2) {
            items = [
                { id: 'guidelineBook', label: '지침서', color: 0x75f6ff, count: 1 },
                {
                    id: 'stage2Receipts',
                    label: '영수증',
                    color: 0xffd36e,
                    fontSize: '9px',
                    count: GameState.get('stage2CollectedCount') || 0
                }
            ];
        } else if (GameState.get('currentChapter') === 3) {
            items = [
                { id: 'guidelineBook', label: '지침서', color: 0x75f6ff, count: 1 },
                {
                    id: 'stage3ReportBundle',
                    label: '중간보고서',
                    color: 0xffd36e,
                    fontSize: '9px',
                    count: GameState.get('stage3ReportCreated') ? 1 : 0
                }
            ];
        } else if (GameState.get('currentChapter') === 6) {
            items = [
                { id: 'guidelineBook', label: '지침서', color: 0x75f6ff, count: 1 }
            ];
            if (GameState.get('stage6GemCollected')) {
                items.push({
                    id: 'stage6Gem',
                    label: '성과 보석',
                    color: 0xffd36e,
                    fontSize: '9px',
                    count: 1
                });
            }
        } else if (GameState.get('currentChapter') === 7) {
            items = [
                { id: 'guidelineBook', label: '지침서', color: 0x75f6ff, count: 1 }
            ];
            if (!GameState.get('stage7FinalReportCreated') && GameState.get('stage6GemCollected')) {
                items.push({ id: 'stage6Gem', label: '성과 보석', color: 0xffd36e, fontSize: '9px', count: 1 });
            }
            if (GameState.get('stage7EvidenceCollected') && !GameState.get('stage7FinalReportCreated')) {
                items.push({ id: 'stage7Evidence', label: '성과증빙', color: 0xc9ffef, fontSize: '9px', iconSize: 40, count: 1 });
            }
            if (GameState.get('stage7FinalReportCreated') && !GameState.get('stage7PimsSubmitted')) {
                items.push({ id: 'stage7FinalReport', label: '최종보고서', color: 0xfff5c7, fontSize: '9px', iconSize: 40, count: 1 });
            }
            if (GameState.get('stage7SettlementReportReceived') && !GameState.get('stage7PimsSubmitted')) {
                items.push({ id: 'stage7SettlementReport', label: '정산보고서', color: 0xd9c8ff, fontSize: '9px', iconSize: 40, count: 1 });
            }
        } else if (GameState.get('currentChapter') === 8) {
            items = [
                { id: 'guidelineBook', label: '지침서', color: 0x75f6ff, count: 1 }
            ];
        } else {
            // TODO: add the budget coin item to inventory when stage 1 clear rewards are wired in.
            if (GameState.get('businessCostCoin')) {
                items.push({ id: 'budgetCoin', label: '사업비 코인', color: 0xffd36e, count: 1 });
            }
        }

        const slotCount = this.inventorySlotTexts.length;
        const visibleItems = items.length > slotCount
            ? [...items.slice(0, slotCount - 1), { id: 'inventoryOverflow', label: `+${items.length - (slotCount - 1)}`, color: 0x8bd6ff, fontSize: '10px' }]
            : items;

        this.inventorySlotTexts.forEach((text, index) => {
            const item = visibleItems[index];
            const iconKey = item ? getInventoryIconKey(item.id) : null;
            text.setText(item?.label || '');
            if (item?.fontSize) {
                text.setFontSize(item.fontSize);
            } else if (GameState.get('currentChapter') === 2) {
                text.setFontSize('9px');
            }
            const iconSize = item?.iconSize ?? INVENTORY_ICON_SIZE;
            const isGuideline = item?.id === 'guidelineBook';
            const iconCenterX = this.inventorySlotShapes[index].x + (INVENTORY_SLOT_WIDTH / 2);
            const iconY = this.inventorySlotShapes[index].y + (isGuideline ? 25 : 27);
            const textGap = isGuideline ? 2 : (item?.id === 'stage2Receipts' ? 2 : 4);
            const textY = iconY + (iconSize / 2) + textGap + 8;
            const badgeCount = item?.count;

            if (iconKey && hasTexture(this.scene, iconKey)) {
                if (!this.inventorySlotIcons[index]) {
                    this.inventorySlotIcons[index] = this.scene.add.image(this.inventorySlotShapes[index].x + 0, this.inventorySlotShapes[index].y + 0, iconKey)
                        .setDisplaySize(iconSize, iconSize)
                        .setOrigin(0.5);
                    this.container.add(this.inventorySlotIcons[index]);
                } else {
                    this.inventorySlotIcons[index].setTexture(iconKey).setVisible(true).setDisplaySize(iconSize, iconSize);
                }
                this.inventorySlotIcons[index].setPosition(iconCenterX, iconY);
                text.setPosition(iconCenterX, textY);
            } else {
                this.inventorySlotIcons[index]?.setVisible(false);
                text.setPosition(iconCenterX, this.inventorySlotShapes[index].y + (isGuideline ? 52 : 58));
            }

            const badge = this.inventorySlotBadges[index];
            const badgeText = this.inventorySlotBadgeTexts[index];
            if (badge && badgeText) {
                if (badgeCount !== undefined && badgeCount !== null && badgeCount !== '') {
                    const badgeRadius = 12;
                    const badgeCenterX = this.inventorySlotShapes[index].x + INVENTORY_SLOT_WIDTH - 12;
                    const badgeCenterY = this.inventorySlotShapes[index].y + INVENTORY_SLOT_HEIGHT - 12;
                    badge.clear();
                    badge.fillStyle(0x000000, 0.9);
                    badge.fillCircle(badgeCenterX, badgeCenterY, badgeRadius);
                    badgeText.setText(String(badgeCount));
                    badgeText.setPosition(badgeCenterX, badgeCenterY + 0.5);
                    badgeText.setVisible(true);
                    badge.setVisible(true);
                } else {
                    badge.clear();
                    badge.setVisible(false);
                    badgeText.setVisible(false);
                }
            }
        });
    }

    destroy() {
        this.interactionPrompt?.destroy();
        this.interactionPortraitFrame?.destroy();
        this.interactionPortraitImage?.destroy();
        this.interactionSpeakerBox?.destroy();
        this.interactionSpeakerText?.destroy();
        this.container?.destroy(true);
    }
}






