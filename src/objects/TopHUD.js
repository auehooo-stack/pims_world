import { GAME_WIDTH, HUD_HEIGHT } from '../config/gameDimensions.js';
import { ASSETS, hasTexture } from '../systems/AssetManager.js';
import { GameState } from '../systems/GameState.js';

const OBJECTIVE_BAR_HEIGHT = 32;

export class TopHUD {
    constructor(scene, { title = '' } = {}) {
        this.scene = scene;
        this.container = scene.add.container(0, 0).setDepth(850);

        if (hasTexture(scene, ASSETS.ui.hudPanel.key)) {
            this.container.add(scene.add.image(GAME_WIDTH / 2, HUD_HEIGHT / 2, ASSETS.ui.hudPanel.key).setDisplaySize(GAME_WIDTH, HUD_HEIGHT));
        } else {
            this.container.add(scene.add.rectangle(GAME_WIDTH / 2, HUD_HEIGHT / 2, GAME_WIDTH, HUD_HEIGHT, 0x05050a, 0.82));
        }

        this.container.add(scene.add.rectangle(GAME_WIDTH / 2, HUD_HEIGHT - 2, GAME_WIDTH, 2, 0x75f6ff, 0.45));

        if (hasTexture(scene, ASSETS.ui.objectiveBar.key)) {
            this.container.add(scene.add.image(GAME_WIDTH / 2, HUD_HEIGHT + OBJECTIVE_BAR_HEIGHT / 2, ASSETS.ui.objectiveBar.key)
                .setDisplaySize(GAME_WIDTH, OBJECTIVE_BAR_HEIGHT)
                .setAlpha(0.42));
        } else {
            this.container.add(scene.add.rectangle(GAME_WIDTH / 2, HUD_HEIGHT + OBJECTIVE_BAR_HEIGHT / 2, GAME_WIDTH, OBJECTIVE_BAR_HEIGHT, 0x120f1a, 0.36));
        }
        this.titleText = scene.add.text(28, 18, title, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '20px',
            color: '#f8f3ff'
        });

        this.dateText = this.createMetric(392, 18, ASSETS.icons.calendar.key, '날짜');
        this.hpText = this.createMetric(620, 18, ASSETS.icons.hpHeart.key, 'HP');
        this.executionText = this.createMetric(810, 18, ASSETS.icons.executionRate.key, '집행률');
        this.budgetText = this.createMetric(1008, 18, ASSETS.icons.budgetCoin.key, '사업비');
        this.objectiveText = scene.add.text(28, HUD_HEIGHT + 8, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            color: '#fff5c7'
        }).setAlpha(0.92);

        this.container.add([
            this.titleText,
            this.dateText.container,
            this.hpText.container,
            this.executionText.container,
            this.budgetText.container,
            this.objectiveText
        ]);
        this.refresh();

        scene.events.once('shutdown', () => this.destroy());
    }

    createMetric(x, y, iconKey, label) {
        const container = this.scene.add.container(x, y);
        if (hasTexture(this.scene, iconKey)) {
            container.add(this.scene.add.image(0, 10, iconKey).setDisplaySize(14, 14).setOrigin(0, 0.5));
        }
        const text = this.scene.add.text(hasTexture(this.scene, iconKey) ? 20 : 0, 0, `${label}:`, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '17px',
            color: '#c9ffef'
        });
        container.add(text);
        return { container, text };
    }

    refresh() {
        this.dateText.text.setText(`날짜: ${GameState.formatCurrentDate()}`);
        this.hpText.text.setText(`HP: ${GameState.get('hp')}`);
        this.executionText.text.setText(`집행률: ${GameState.get('executionRate')}%`);
        this.budgetText.text.setText(`사업비: ${GameState.get('budgetStatus')}`);
        this.objectiveText.setText(`현재 목표: ${GameState.getCurrentObjective()}`);
    }

    destroy() {
        this.container?.destroy(true);
    }
}
