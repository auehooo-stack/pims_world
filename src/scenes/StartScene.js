import * as Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { CENTER_X, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';
import { ASSETS, hasTexture, playAudioIfAvailable } from '../systems/AssetManager.js';

export class StartScene extends Phaser.Scene {
    constructor() {
        super('StartScene');
    }

    create() {
        GameState.reset();
        this.cameras.main.setBackgroundColor(0x090714);

        if (hasTexture(this, ASSETS.backgrounds.startScreen.key)) {
            this.add.image(CENTER_X, GAME_HEIGHT / 2, ASSETS.backgrounds.startScreen.key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT);
            this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x090714, 0.22);
        } else {
            const g = this.add.graphics();
            g.fillStyle(0x12102a, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
            g.fillStyle(0x251348, 1).fillRect(0, 456, GAME_WIDTH, 264);
            g.lineStyle(2, 0x25f3ff, 0.45);
            for (let x = -80; x < GAME_WIDTH + 80; x += 80) {
                g.lineBetween(x, 496, x + 144, GAME_HEIGHT);
            }
            for (let y = 504; y < GAME_HEIGHT; y += 36) {
                g.lineBetween(0, y, GAME_WIDTH, y);
            }
        }

        // BGM only starts after a user gesture so browser autoplay rules are respected.
        this.input.once('pointerdown', () => {
            playAudioIfAvailable(this, ASSETS.audio.bgmMain.key, { loop: true, volume: 0.35 });
            this.scene.start('OpeningScene');
        });
    }
}

