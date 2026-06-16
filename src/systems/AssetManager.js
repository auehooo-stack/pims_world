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
        sealedVaultOpen: image('bg_sealed_vault_open', '/assets/backgrounds/sealed_vault_open.png'),
        executionHouse: image('bg_execution_house', '/assets/backgrounds/execution_house_bg.png'),
        documentCheck: image('bg_document_check', '/assets/backgrounds/document_check_bg.png'),
        documentCheckClear: image('bg_document_check_clear', '/assets/backgrounds/document_check_clear_bg.png'),
        stageClear: image('bg_stage_clear', '/assets/backgrounds/StageClearScene.png'),
        stageClearClosed: image('bg_stage_clear_closed', '/assets/backgrounds/StageClearSceneClosed.png'),
        openingLogin: image('bg_opening_login', '/assets/opening/pims_login_screen.png')
    },
    characters: {
        kimDaeriIdle: image('char_kim_daeri_idle', '/assets/characters/kim_daeri_idle.png'),
        kimDaeriWalk1: image('char_kim_daeri_walk_1', '/assets/characters/kim_daeri_walk_1.png'),
        kimDaeriWalk2: image('char_kim_daeri_walk_2', '/assets/characters/kim_daeri_walk_2.png'),
        kimDaeriWalk3: image('char_kim_daeri_walk_3', '/assets/characters/kim_daeri_walk_3.png'),
        kimDaeriWalk4: image('char_kim_daeri_walk_4', '/assets/characters/kim_daeri_walk_4.png'),
        kimDaeriWalk: image('char_kim_daeri_walk', '/assets/characters/kim_daeri_walk.png'),
        kimDaeriClosed: image('char_kim_daeri_closed', '/assets/characters/kim_daeri_closed.png'),
        kcaAssistantIdle: image('char_kca_assistant_idle', '/assets/characters/kca_assistant_idle.png'),
        kcaAssistantClosed: image('char_kca_assistant_closed', '/assets/characters/kca_assistant_closed.png'),
        kcaAssistantWalk: image('char_kca_assistant_walk', '/assets/characters/kca_assistant_walk.png')
    },
    objects: {
        cabinet: image('obj_cabinet', '/assets/objects/cabinet.png'),
        pimsTerminal: image('obj_pims_terminal', '/assets/objects/pims_terminal.png'),
        vaultDoorClosed: image('obj_vault_door_closed', '/assets/objects/vault_door_closed.png'),
        vaultDoorOpen: image('obj_vault_door_open', '/assets/objects/vault_door_open.png'),
        receipt: image('obj_receipt', '/assets/objects/receipt.png')
    },
    ui: {
        dialogPanel: image('ui_dialog_panel', '/assets/ui/dialog/dialog_panel.png'),
        dialogSpeakerBox: image('ui_dialog_speaker_box', '/assets/ui/dialog/speakerBox.png'),
        dialogPortraitFrame: image('ui_dialog_portrait_frame', '/assets/ui/dialog/portraitFrame.png'),
        dialogPortraitKcaAssistant: image('ui_dialog_portrait_kca_assistant', '/assets/ui/dialog/characters/kca_assistant.png'),
        dialogPortraitKimDaeri: image('ui_dialog_portrait_kim_daeri', '/assets/ui/dialog/characters/kim_daeri.png'),
        dialogPortraitPimsWorld: image('ui_dialog_portrait_pims_world', '/assets/ui/dialog/characters/pims_world.png'),
        hudPanel: image('ui_hud_panel', '/assets/ui/hud_panel.png'),
        objectiveBar: image('ui_objective_bar', '/assets/ui/objective_bar.png'),
        interactionPanel: image('ui_interaction_panel', '/assets/ui/bottom/interaction_panel.png'),
        inventoryPanel: image('ui_inventory_panel', '/assets/ui/bottom/inventory_panel.png'),
        inventorySlot: image('ui_inventory_slot', '/assets/ui/bottom/inventory_slot.png'),
        stageBox: image('ui_top_stage_box', '/assets/ui/top/ui_top_stage_box.png'),
        dateBox: image('ui_top_date_box', '/assets/ui/top/date_box.png'),
        executionBox: image('ui_top_execution_box', '/assets/ui/top/execution_box.png'),
        hpBox: image('ui_top_hp_box', '/assets/ui/top/hp_box.png'),
        settingsButton: image('ui_top_settings_button', '/assets/ui/top/settings_button.png'),
        buttonNormal: image('ui_button_normal', '/assets/ui/button_normal.png'),
        buttonHover: image('ui_button_hover', '/assets/ui/button_hover.png'),
        dialogNextIndicator: image('ui_dialog_next_indicator', '/assets/ui/dialog/dialog_next_indicator.png')
    },
    opening: {
        warningBackground: image('ui_opening_warning_background', '/assets/opening/warning_background.png'),
        glitchBackground: image('ui_opening_glitch_background', '/assets/opening/glitch_background.png'),
        worldBackground: image('ui_opening_world_background', '/assets/opening/pims_world_background.png'),
        worldBackgroundClosed: image('ui_opening_world_background_closed', '/assets/opening/pims_world_background_closed.png'),
        assistantBackground: image('ui_opening_assistant_background', '/assets/opening/assistant_background.png'),
        warningPanel: image('ui_opening_warning_panel', '/assets/opening/error_warning_panel.png'),
        assistantCutin: image('ui_opening_assistant_cutin', '/assets/opening/kca_assistant_cutin.png')
    },
    icons: {
        guidelineBook: image('icon_guideline_book', '/assets/icons/guideline_book.png'),
        ndaDocument: image('icon_nda_document', '/assets/icons/nda_document.png'),
        budgetCoin: image('icon_budget_coin', '/assets/icons/budget_coin.png'),
        hpHeart: image('icon_hp_heart', '/assets/icons/hp_heart.png'),
        hpHeartFull: image('icon_hp_heart_full', '/assets/icons/heart-full.png'),
        hpHeartThreeQuarter: image('icon_hp_heart_three_quarter', '/assets/icons/heart-1.png'),
        hpHeartHalf: image('icon_hp_heart_half', '/assets/icons/heart-half.png'),
        hpHeartQuarter: image('icon_hp_heart_quarter', '/assets/icons/heart-3.png'),
        hpHeartEmpty: image('icon_hp_heart_empty', '/assets/icons/heart-empty.png'),
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
        bgmMain: audio('audio_bgm_main', '/assets/audio/bgm_main.wav'),
        bgmOpeningTitle: audio('audio_bgm_opening_title', '/assets/audio/bgm_opening_title.wav'),
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
        case 'stage2Receipts':
        case 'receipt':
            return ASSETS.objects.receipt.key;
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

export const playBgmWithFade = (scene, key, config = {}, fadeDuration = 700) => {
    if (!hasAudio(scene, key)) {
        return null;
    }

    const game = scene?.game;
    const currentTrack = game?.__bgmTrack || null;
    const targetVolume = typeof config.volume === 'number' ? config.volume : 0.35;
    const loop = config.loop ?? true;

    if (currentTrack && currentTrack.key === key && currentTrack.isPlaying) {
        currentTrack.setVolume(targetVolume);
        return currentTrack;
    }

    const nextTrack = scene.sound.add(key, {
        ...config,
        loop,
        volume: 0
    });
    nextTrack.play();

    scene.tweens.add({
        targets: nextTrack,
        volume: { from: 0, to: targetVolume },
        duration: fadeDuration,
        ease: 'Sine.easeInOut'
    });

    if (currentTrack && currentTrack.isPlaying) {
        const previousTrack = currentTrack;
        scene.tweens.add({
            targets: previousTrack,
            volume: { from: previousTrack.volume, to: 0 },
            duration: fadeDuration,
            ease: 'Sine.easeInOut',
            onComplete: () => {
                previousTrack.stop();
            }
        });
    }

    if (game) {
        game.__bgmTrack = nextTrack;
        game.__bgmKey = key;
    }

    return nextTrack;
};
