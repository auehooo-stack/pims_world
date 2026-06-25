import { GAME_WIDTH, HUD_HEIGHT } from '../config/gameDimensions.js';
import { ASSETS, hasTexture } from '../systems/AssetManager.js';
import { GameState } from '../systems/GameState.js';

const OBJECTIVE_BAR_HEIGHT = 32;
const TOP_BOX_Y = 8;
const TOP_BOX_H = 42;
const TOP_WIDGET_H = 48;
const BOX_FILL = 0x120f1f;
const BOX_FILL_ALT = 0x17132a;
const BOX_STROKE = 0x9d5dd6;

export class TopHUD {
    constructor(scene, { title = '' } = {}) {
        this.scene = scene;
        this.container = scene.add.container(0, 0).setDepth(850);

        this.addBackground();
        this.createTopRow(title);
        this.createObjectiveRow();

        this.refresh();
        scene.events.once('shutdown', () => this.destroy());
    }

    addBackground() {
        if (hasTexture(this.scene, ASSETS.ui.hudPanel.key)) {
            this.container.add(
                this.scene.add.image(GAME_WIDTH / 2, HUD_HEIGHT / 2, ASSETS.ui.hudPanel.key)
                    .setDisplaySize(GAME_WIDTH, HUD_HEIGHT)
                    .setAlpha(0.82)
            );
        }
    }

    createTopRow(title) {
        this.stageBox = this.createLabelBox(16, TOP_BOX_Y - 2, 260, TOP_WIDGET_H, title, {
            fontSize: '18px',
            color: '#fff4c9',
            x: 18,
            y: 11,
            backgroundTextureKey: ASSETS.ui.stageBox.key
        });

        this.dateMetric = this.createMetricBox(283, TOP_BOX_Y - 2, 210, TOP_WIDGET_H, {
            iconKey: ASSETS.icons.calendar.key,
            value: GameState.formatCurrentDate(),
            backgroundTextureKey: ASSETS.ui.dateBox.key,
            showLabel: false,
            rightAlignValue: true
        });

        this.executionMetric = this.createMetricBox(500, TOP_BOX_Y - 2, 145, TOP_WIDGET_H, {
            iconKey: ASSETS.icons.executionRate.key,
            value: this.getExecutionDisplay(),
            backgroundTextureKey: ASSETS.ui.executionBox.key,
            showLabel: false,
            rightAlignValue: true
        });

        this.hpMetric = this.createHeartMetricBox(652, TOP_BOX_Y - 2, 190, TOP_WIDGET_H);

        this.settingsButton = this.createSettingsButton(1216, TOP_BOX_Y, 48, TOP_BOX_H - 6);

        this.container.add([
            this.stageBox.container,
            this.dateMetric.container,
            this.executionMetric.container,
            this.hpMetric.container,
            this.settingsButton.container
        ]);
    }

    createObjectiveRow() {
        this.objectiveText = this.scene.add.text(28, HUD_HEIGHT + 8, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '16px',
            color: '#fff5c7'
        }).setAlpha(0).setVisible(false);

        this.container.add(this.objectiveText);
    }

    createLabelBox(x, y, width, height, label, { fontSize = '17px', color = '#f8f3ff', x: labelX = 16, y: labelY = 11, backgroundTextureKey = null } = {}) {
        const container = this.scene.add.container(0, 0);
        const box = backgroundTextureKey && hasTexture(this.scene, backgroundTextureKey)
            ? this.scene.add.image(x, y, backgroundTextureKey).setOrigin(0, 0).setDisplaySize(width, height)
            : this.scene.add.rectangle(x, y, width, height, BOX_FILL_ALT, 0.94).setOrigin(0, 0);
        if (!backgroundTextureKey || !hasTexture(this.scene, backgroundTextureKey)) {
            box.setStrokeStyle(2, BOX_STROKE, 0.72);
        }
        const text = this.scene.add.text(x + labelX, y + labelY, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize,
            color
        });
        container.add([box, text]);
        return { container, box, text };
    }

    createMetricBox(x, y, width, height, { iconKey, label, value, valueFontSize = '16px', backgroundTextureKey = null, showLabel = true, rightAlignValue = false } = {}) {
        const container = this.scene.add.container(0, 0);
        const box = backgroundTextureKey && hasTexture(this.scene, backgroundTextureKey)
            ? this.scene.add.image(x, y, backgroundTextureKey).setOrigin(0, 0).setDisplaySize(width, height)
            : this.scene.add.rectangle(x, y, width, height, BOX_FILL, 0.9).setOrigin(0, 0);

        if (!backgroundTextureKey || !hasTexture(this.scene, backgroundTextureKey)) {
            box.setStrokeStyle(2, BOX_STROKE, 0.62);
        }
        container.add(box);

        if (hasTexture(this.scene, iconKey)) {
            container.add(
                this.scene.add.image(x + 16, y + height / 2, iconKey)
                    .setDisplaySize(16, 16)
                    .setOrigin(0.5)
            );
        }

        const labelText = showLabel ? this.scene.add.text(x + 38, y + 7, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '12px',
            color: '#c9ffef'
        }) : null;
        const valueText = this.scene.add.text(rightAlignValue ? x + width - 14 : x + 38, showLabel ? y + 21 : y + 12, value, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: valueFontSize,
            color: '#f8f3ff'
        }).setOrigin(rightAlignValue ? 1 : 0, 0);

        container.add([labelText, valueText].filter(Boolean));
        return { container, box, labelText, valueText };
    }

    createHeartMetricBox(x, y, width, height) {
        const container = this.scene.add.container(0, 0);
        const box = hasTexture(this.scene, ASSETS.ui.hpBox.key)
            ? this.scene.add.image(x, y, ASSETS.ui.hpBox.key).setOrigin(0, 0).setDisplaySize(width, height)
            : this.scene.add.rectangle(x, y, width, height, BOX_FILL, 0.9).setOrigin(0, 0);
        if (!hasTexture(this.scene, ASSETS.ui.hpBox.key)) {
            box.setStrokeStyle(2, BOX_STROKE, 0.62);
        }
        container.add(box);

        this.hpHeartNodes = [];
        const startX = x + 87;
        const heartY = y + 24;
        const heartSize = 20;
        const gap = 5;

        for (let i = 0; i < 3; i += 1) {
            const centerX = startX + i * (heartSize + gap);
            const heart = this.scene.add.image(centerX, heartY, ASSETS.icons.hpHeartEmpty.key)
                .setDisplaySize(heartSize, heartSize)
                .setOrigin(0.5);
            container.add(heart);
            this.hpHeartNodes.push(heart);
        }

        return { container, box };
    }

    createSettingsButton(x, y, width, height) {
        const container = this.scene.add.container(0, 0);
        const textureKey = ASSETS.ui.settingsButton.key;
        const box = hasTexture(this.scene, textureKey)
            ? this.scene.add.image(x, y, textureKey).setOrigin(0, 0).setDisplaySize(width, height)
            : this.scene.add.rectangle(x, y, width, height, BOX_FILL_ALT, 0.94).setOrigin(0, 0).setStrokeStyle(2, BOX_STROKE, 0.72);

        container.add(box);

        if (box.setInteractive) {
            box.setInteractive({ useHandCursor: true });
        }

        let isHovered = false;
        let isPressed = false;
        const baseWidth = width;
        const baseHeight = height;
        const applyButtonState = () => {
            if (isPressed) {
                box.setDisplaySize?.(baseWidth * 0.96, baseHeight * 0.96);
                box.setAlpha?.(0.92);
                return;
            }

            if (isHovered) {
                box.setDisplaySize?.(baseWidth, baseHeight);
                box.setAlpha?.(0.96);
                return;
            }

            box.setDisplaySize?.(baseWidth, baseHeight);
            box.setAlpha?.(1);
        };

        box.on?.('pointerover', () => {
            isHovered = true;
            applyButtonState();
        });
        box.on?.('pointerout', () => {
            isHovered = false;
            isPressed = false;
            applyButtonState();
        });
        box.on?.('pointerdown', () => {
            isPressed = true;
            applyButtonState();
        });
        box.on?.('pointerup', () => {
            isPressed = false;
            applyButtonState();
        });
        box.on?.('pointerupoutside', () => {
            isPressed = false;
            applyButtonState();
        });

        return { container, box };
    }

    getExecutionDisplay() {
        if (GameState.get('currentChapter') === 1) {
            return '미교부';
        }
        if (GameState.get('currentChapter') === 4) {
            if (GameState.get('stage4Cleared')) {
                return '완료';
            }
            if (GameState.get('stage4Failed')) {
                return '실패';
            }
            if (!GameState.get('stage4QuizActive')) {
                return '대기';
            }
            const current = Number(GameState.get('stage4QuestionIndex') || 0) + 1;
            const total = Number(GameState.get('stage4QuestionTotal') || 6);
            return `질문 ${Math.min(current, total)} / ${total}`;
        }
        if (GameState.get('currentChapter') === 5) {
            if (GameState.get('stage5Cleared')) {
                return '완료';
            }
            if (!GameState.get('isMiniGameActive')) {
                return '대기';
            }
            const current = Number(GameState.get('currentCaseIndex') || 0) + 1;
            const total = 6;
            return `패키지 ${Math.min(current, total)} / ${total}`;
        }
        return `${GameState.get('executionRate')}%`;
    }

    updateHeartDisplay() {
        if (!this.hpHeartNodes?.length) {
            return;
        }

        const hp = Math.max(0, Number(GameState.get('hp') ?? 0));
        const quarterUnits = Math.max(0, Math.min(12, Math.round((hp / 100) * 12)));

        this.hpHeartNodes.forEach((heart, index) => {
            const remaining = quarterUnits - (index * 4);
            let textureKey = ASSETS.icons.hpHeartEmpty.key;
            if (remaining >= 4) {
                textureKey = ASSETS.icons.hpHeartFull.key;
            } else if (remaining === 3) {
                textureKey = ASSETS.icons.hpHeartThreeQuarter.key;
            } else if (remaining === 2) {
                textureKey = ASSETS.icons.hpHeartHalf.key;
            } else if (remaining === 1) {
                textureKey = ASSETS.icons.hpHeartQuarter.key;
            }
            heart.setTexture(textureKey);
            heart.setAlpha(1);
        });
    }

    refresh() {
        const chapter = GameState.get('currentChapter');
        this.stageBox.text?.setText(
            chapter === 4 ? '4단계: 실태점검의 관문'
                : chapter === 5 ? '5단계: 협약변경의 방'
                : chapter === 3 ? '3단계: 중간 관람차'
                : chapter === 2 ? '2단계: 집행의 집'
                : '1단계: 봉인된 금고'
        );
        this.dateMetric?.valueText?.setText(GameState.formatCurrentDate());
        this.updateHeartDisplay();
        this.executionMetric?.valueText?.setText(this.getExecutionDisplay());
        this.objectiveText?.setText('');
    }

    destroy() {
        this.container?.destroy(true);
    }
}

