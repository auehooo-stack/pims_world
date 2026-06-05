import * as Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene.js';
import { StartScene } from './scenes/StartScene.js';
import { OpeningScene } from './scenes/OpeningScene.js';
import { SealedVaultScene } from './scenes/SealedVaultScene.js';
import { DocumentCheckMiniGameScene } from './scenes/DocumentCheckMiniGameScene.js';
import { StageClearScene } from './scenes/StageClearScene.js';
import { ExecutionHouseScene } from './scenes/ExecutionHouseScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { GAME_HEIGHT, GAME_WIDTH } from './config/gameDimensions.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#090714',
    pixelArt: false,
    antialias: true,
    roundPixels: false,
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
        PreloadScene,
        StartScene,
        OpeningScene,
        SealedVaultScene,
        DocumentCheckMiniGameScene,
        StageClearScene,
        ExecutionHouseScene,
        GameOverScene
    ]
};

window.addEventListener('load', () => {
    new Phaser.Game(config);
});
