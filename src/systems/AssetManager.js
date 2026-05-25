import * as Phaser from 'phaser';

const normalizeAssetPath = (path) => {
    if (typeof path !== 'string') {
        return path;
    }

    const normalized = path.replace(/^public\//, '').replace(/^assets\//, '/assets/');
    if (normalized.startsWith('/')) {
        return normalized;
    }
    return `/${normalized}`;
};

const image = (key, path) => ({ key, path: normalizeAssetPath(path), type: 'image' });
const spritesheet = (key, path, frameWidth, frameHeight) => ({
    key,
    path: normalizeAssetPath(path),
    type: 'spritesheet',
    frameWidth,
    frameHeight
});
const audio = (key, path) => ({ key, path: normalizeAssetPath(path), type: 'audio' });

export const ASSETS = {
    backgrounds: {
        startScreen: image('bg_start_screen', '/assets/backgrounds/start_screen.png'),
        sealedVault: image('bg_sealed_vault', '/assets/backgrounds/sealed_vault.png'),
        sealedVaultFar: image('bg_sealed_vault_far', '/assets/backgrounds/sealed_vault_far.png'),
        sealedVaultMid: image('bg_sealed_vault_mid', '/assets/backgrounds/sealed_vault_mid.png'),
        sealedVaultFront: image('bg_sealed_vault_front', '/assets/backgrounds/sealed_vault_front.png'),
        documentCheck: image('bg_document_check', '/assets/backgrounds/document_check_bg.png'),
        documentCheckClear: image('bg_document_check_clear', '/assets/backgrounds/document_check_clear_bg.png'),
        stageClear: image('bg_stage_clear', '/assets/backgrounds/StageClearScene.png'),
        stageClearClosed: image('bg_stage_clear_closed', '/assets/backgrounds/StageClearSceneClosed.png'),
        openingLogin: image('bg_opening_login', '/assets/opening/pims_login_screen.png')
    },
    characters: {
        kimDaeriIdle: image('char_kim_daeri_idle', '/assets/characters/kim_daeri_idle.png'),
        kimDaeriWalk: image('char_kim_daeri_walk', '/assets/characters/kim_daeri_walk.png'),
        kcaAssistantIdle: image('char_kca_assistant_idle', '/assets/characters/kca_assistant_idle.png'),
        kcaAssistantWalk: image('char_kca_assistant_walk', '/assets/characters/kca_assistant_walk.png')
    },
    objects: {
        cabinet: image('obj_cabinet', '/assets/objects/cabinet.png'),
        pimsTerminal: image('obj_pims_terminal', '/assets/objects/pims_terminal.png'),
        vaultDoorClosed: image('obj_vault_door_closed', '/assets/objects/vault_door_closed.png'),
        vaultDoorOpen: image('obj_vault_door_open', '/assets/objects/vault_door_open.png')
    },
    ui: {
        dialogPanel: image('ui_dialog_panel', '/assets/ui/dialog_panel.png'),
        hudPanel: image('ui_hud_panel', '/assets/ui/hud_panel.png'),
        objectiveBar: image('ui_objective_bar', '/assets/ui/objective_bar.png'),
        inventoryPanel: image('ui_inventory_panel', '/assets/ui/inventory_panel.png'),
        inventorySlot: image('ui_inventory_slot', '/assets/ui/inventory_slot.png'),
        buttonNormal: image('ui_button_normal', '/assets/ui/button_normal.png'),
        buttonHover: image('ui_button_hover', '/assets/ui/button_hover.png')
    },
    opening: {
        warningBackground: image('ui_opening_warning_background', '/assets/opening/warning_background.png'),
        glitchBackground: image('ui_opening_glitch_background', '/assets/opening/glitch_background.png'),
        worldBackground: image('ui_opening_world_background', '/assets/opening/pims_world_background.png'),
        assistantBackground: image('ui_opening_assistant_background', '/assets/opening/assistant_background.png'),
        warningPanel: image('ui_opening_warning_panel', '/assets/opening/error_warning_panel.png'),
        assistantCutin: image('ui_opening_assistant_cutin', '/assets/opening/kca_assistant_cutin.png')
    },
    icons: {
        guidelineBook: image('icon_guideline_book', '/assets/icons/guideline_book.png'),
        ndaDocument: image('icon_nda_document', '/assets/icons/nda_document.png'),
        budgetCoin: image('icon_budget_coin', '/assets/icons/budget_coin.png'),
        hpHeart: image('icon_hp_heart', '/assets/icons/hp_heart.png'),
        calendar: image('icon_calendar', '/assets/icons/calendar.png'),
        executionRate: image('icon_execution_rate', '/assets/icons/execution_rate.png'),
        interactMark: image('icon_interact_mark', '/assets/icons/interact_mark.png')
    },
    effects: {
        coin: image('fx_coin', '/assets/effects/coin.png'),
        sparkle: image('fx_sparkle', '/assets/effects/sparkle.png'),
        neonGlow: image('fx_neon_glow', '/assets/effects/neon_glow.png'),
        vaultFlash: image('fx_vault_flash', '/assets/effects/vault_flash.png')
    },
    audio: {
        bgmMain: audio('audio_bgm_main', '/assets/audio/bgm_main.mp3'),
        sfxClick: audio('audio_sfx_click', '/assets/audio/sfx_click.wav'),
        sfxInteract: audio('audio_sfx_interact', '/assets/audio/sfx_interact.wav'),
        sfxSuccess: audio('audio_sfx_success', '/assets/audio/sfx_success.wav'),
        sfxError: audio('audio_sfx_error', '/assets/audio/sfx_error.wav'),
        sfxVaultOpen: audio('audio_sfx_vault_open', '/assets/audio/sfx_vault_open.wav'),
        sfxCoin: audio('audio_sfx_coin', '/assets/audio/sfx_coin.wav')
    }
};

const collectAssets = (node) => {
    if (!node || typeof node !== 'object') {
        return [];
    }

    return Object.values(node).flatMap((value) => {
        if (value && typeof value === 'object' && typeof value.key === 'string' && typeof value.path === 'string' && typeof value.type === 'string') {
            return [value];
        }
        return collectAssets(value);
    });
};

export const ASSET_LIST = collectAssets(ASSETS);

export const ASSET_KEYS = Object.fromEntries(
    ASSET_LIST.map((asset) => [asset.key, asset])
);

export const loadAssets = (scene) => {
    ASSET_LIST.forEach((asset) => {
        if (asset.type === 'image') {
            scene.load.image(asset.key, asset.path);
            return;
        }
        if (asset.type === 'spritesheet') {
            scene.load.spritesheet(asset.key, asset.path, {
                frameWidth: asset.frameWidth,
                frameHeight: asset.frameHeight
            });
            return;
        }
        if (asset.type === 'audio') {
            scene.load.audio(asset.key, asset.path);
        }
    });
};

export const hasTexture = (scene, key) => Boolean(scene?.textures?.exists?.(key));
export const hasAudio = (scene, key) => Boolean(scene?.cache?.audio?.exists?.(key));

export const setLinearTextureFilter = (scene, key) => {
    if (!hasTexture(scene, key)) {
        return;
    }

    scene.textures.get(key)?.setFilter?.(Phaser.Textures.FilterMode.LINEAR);
};

export const getInteractableTextureKey = (id) => {
    switch (id) {
        case 'assistant':
            return ASSETS.characters.kcaAssistantIdle.key;
        case 'cabinet':
            return ASSETS.objects.cabinet.key;
        case 'terminal':
            return ASSETS.objects.pimsTerminal.key;
        default:
            return null;
    }
};

export const getInventoryIconKey = (id) => {
    switch (id) {
        case 'guidelineBook':
            return ASSETS.icons.guidelineBook.key;
        case 'ndaDocument':
            return ASSETS.icons.ndaDocument.key;
        case 'budgetCoin':
            return ASSETS.icons.budgetCoin.key;
        default:
            return null;
    }
};

export const playAudioIfAvailable = (scene, key, config = {}) => {
    if (!hasAudio(scene, key)) {
        return null;
    }

    const sound = scene.sound.add(key, config);
    sound.play();
    return sound;
};
