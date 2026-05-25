import * as Phaser from 'phaser';
import { loadAssets } from '../systems/AssetManager.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

const DEV_START_SCENE = 'StartScene';

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
    }

    preload() {
        this.failedAssets = [];
        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;
        const barWidth = 460;
        const barHeight = 18;

        this.cameras.main.setBackgroundColor(0x090714);
        this.add.text(centerX, centerY - 54, 'LOADING ASSETS', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '28px',
            color: '#fff5c7'
        }).setOrigin(0.5);

        const frame = this.add.rectangle(centerX, centerY, barWidth + 8, barHeight + 8, 0x05050a, 0.9)
            .setStrokeStyle(2, 0x75f6ff, 0.7);
        const bar = this.add.rectangle(centerX - barWidth / 2, centerY, 0, barHeight, 0x75f6ff, 1)
            .setOrigin(0, 0.5);
        const status = this.add.text(centerX, centerY + 34, '0%', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            color: '#c9ffef'
        }).setOrigin(0.5);

        this.load.on('progress', (value) => {
            bar.displayWidth = barWidth * value;
            status.setText(`${Math.round(value * 100)}%`);
        });

        this.load.on('loaderror', (file) => {
            console.warn(`Asset failed to load: ${file.key} (${file.src})`);
            this.failedAssets.push(file.key);
            this.registry.set('assetFailures', [...this.failedAssets]);
        });

        loadAssets(this);

        this._preloadFrame = frame;
        this._preloadBar = bar;
        this._preloadStatus = status;
    }

    create() {
        this.registry.set('assetFailures', [...(this.failedAssets || [])]);
        this.scene.start(DEV_START_SCENE);
    }
}
