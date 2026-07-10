import * as Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene.js';
import { StartScene } from './scenes/StartScene.js';
import { OpeningScene } from './scenes/OpeningScene.js';
import { SealedVaultScene } from './scenes/SealedVaultScene.js';
import { DocumentCheckMiniGameScene } from './scenes/DocumentCheckMiniGameScene.js';
import { StageClearScene } from './scenes/StageClearScene.js';
import { ExecutionHouseScene } from './scenes/ExecutionHouseScene.js';
import { MiddleFerrisWheelScene } from './scenes/MiddleFerrisWheelScene.js';
import { InspectionGateScene } from './scenes/InspectionGateScene.js';
import { TransformationRoomScene } from './scenes/TransformationRoomScene.js';
import { Stage6Scene } from './scenes/Stage6Scene.js';
import { Stage7Scene } from './scenes/Stage7Scene.js';
import { GameOverScene } from './scenes/GameOverScene.js';
import { GAME_HEIGHT, GAME_WIDTH } from './config/gameDimensions.js';

const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    resolution: Math.max(window.devicePixelRatio || 1, 1),
    backgroundColor: '#090714',
    render: {
        pixelArt: false,
        antialias: true,
        roundPixels: true
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        autoRound: true
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
        MiddleFerrisWheelScene,
        InspectionGateScene,
        TransformationRoomScene,
        Stage6Scene,
        Stage7Scene,
        GameOverScene
    ]
};

const installDevFreezeHandler = () => {
    if (typeof window === 'undefined') {
        return;
    }

    if (window.__pimsWorldDevFreezeHandlerInstalled) {
        return;
    }
    window.__pimsWorldDevFreezeHandlerInstalled = true;

    const handleFreezeToggle = (event) => {
        if (event?.code !== 'F8' && event?.key !== 'F8') {
            return;
        }

        event.preventDefault?.();
        event.stopPropagation?.();
        event.stopImmediatePropagation?.();

        const game = window.__pimsWorldGame;
        const scenes = game?.scene?.scenes || [];
        const activeScenes = scenes.filter((scene) => scene?.scene?.isActive?.() || scene?.scene?.isPaused?.());
        const scene = activeScenes[activeScenes.length - 1] || scenes[scenes.length - 1] || null;
        if (!scene) {
            return;
        }

        if (typeof scene.toggleDevFreeze === 'function') {
            scene.toggleDevFreeze();
            return;
        }

        if (typeof scene.toggleDevQuizLock === 'function') {
            scene.toggleDevQuizLock();
            return;
        }

        if (scene.scene?.isPaused?.()) {
            scene.scene.resume();
        } else {
            scene.scene.pause();
        }
    };

    window.addEventListener('keydown', handleFreezeToggle, true);
};

installDevFreezeHandler();

window.addEventListener('load', () => {
    const game = new Phaser.Game(config);
    window.__pimsWorldGame = game;
});
