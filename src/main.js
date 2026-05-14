import * as Phaser from 'phaser';
import { StartScene } from './scenes/StartScene.js';
import { SealedVaultScene } from './scenes/SealedVaultScene.js';
import { DocumentCheckMiniGameScene } from './scenes/DocumentCheckMiniGameScene.js';
import { StageClearScene } from './scenes/StageClearScene.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 640,
    height: 360,
    backgroundColor: '#090714',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: false
        }
    },
    scene: [
        StartScene,
        SealedVaultScene,
        DocumentCheckMiniGameScene,
        StageClearScene
    ]
};

window.addEventListener('load', () => {
    new Phaser.Game(config);
});
