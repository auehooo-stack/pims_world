import * as Phaser from 'phaser';
import { chapter2Data } from '../data/chapter2Data.js';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { InteractionManager } from '../systems/InteractionManager.js';
import { Player } from '../objects/Player.js';
import { InteractableObject } from '../objects/InteractableObject.js';
import { BottomHUD } from '../objects/BottomHUD.js';
import { TopHUD } from '../objects/TopHUD.js';
import { CENTER_X, GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

const RECEIPT_COLORS = {
    운영비: 0x39e6c0,
    사업추진비: 0xffc86e,
    여비: 0x6f94ff,
    자산취득비: 0xffd36e,
    반려통: 0xff6b7d
};

const GENERIC_RECEIPT_LABEL = '영수증 조각';

const FLOOR_POINTS = [
    { x: 300, y: 250 },
    { x: 430, y: 286 },
    { x: 560, y: 238 },
    { x: 700, y: 302 },
    { x: 820, y: 260 },
    { x: 360, y: 350 },
    { x: 500, y: 344 },
    { x: 640, y: 336 }
];

export class ExecutionHouseScene extends Phaser.Scene {
    constructor() {
        super('ExecutionHouseScene');
        this.clickTarget = null;
        this.receiptQueue = [];
        this.pendingReceipts = [];
        this.worldReceipts = [];
        this.sortedCount = 0;
        this.collectedCount = 0;
        this.timerDays = chapter2Data.timerDays;
        this.stagePhase = 'briefing';
        this.stageResolved = false;
        this.bonusWaveTriggered = false;
        this.timerLoop = null;
        this.spawnLoop = null;
        this.assetReminderCall = null;
    }

    create() {
        GameState.set('currentChapter', 2);
        GameState.set('stage2BriefingDone', false);
        GameState.set('stage2Phase', 'briefing');
        GameState.set('stage2CollectedCount', 0);
        GameState.set('stage2SortedCount', 0);
        GameState.set('stage2ReceiptTarget', chapter2Data.receiptPool.length);
        GameState.set('stage2CurrentReceiptLabel', '');
        GameState.set('stage2CurrentReceiptCategory', '');
        GameState.set('stage2PendingAssetRegistration', false);
        GameState.set('stage2TimerRemaining', chapter2Data.timerDays);
        GameState.set('stage2Cleared', false);
        GameState.set('stage2Failed', false);
        GameState.set('executionRate', 0);
        GameState.set('timeRunning', true);
        this.bonusWaveTriggered = false;

        this.cameras.main.setBackgroundColor(0x070d18);
        this.drawBackground();
        this.createHud();
        this.createWorld();
        this.createReceiptPanel();
        this.dialogue = new DialogueManager(this, {
            showBackdrop: false,
            layout: this.bottomHud.getDialogLayout()
        });

        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.input.keyboard.on('keydown-SPACE', () => this.tryInteract());
        this.input.keyboard.on('keydown-ENTER', () => this.tryInteract());
        this.input.on('pointerdown', (pointer) => this.handlePointerDown(pointer));

        this.pendingReceipts = Phaser.Utils.Array.Shuffle([...chapter2Data.receiptPool]);
        this.time.delayedCall(300, () => {
            this.dialogue.say(chapter2Data.introLines, () => this.beginCollectionPhase());
        });

        this.refreshHud();
    }

    update() {
        const blocked = this.dialogue.isActive || this.stageResolved;
        this.worldReceipts.forEach((item) => item.update?.());
        this.interactables?.forEach((item) => item.update?.());
        this.interaction?.update(blocked);
        this.refreshHud();

        if (blocked) {
            this.player.setMovement(0, 0);
            return;
        }

        const axis = this.getKeyboardAxis();
        if (axis.x !== 0 || axis.y !== 0) {
            this.clickTarget = null;
            const length = Math.hypot(axis.x, axis.y) || 1;
            this.player.setMovement((axis.x / length) * this.player.speed, (axis.y / length) * this.player.speed);
        } else if (this.clickTarget) {
            this.moveTowardClickTarget();
        } else {
            this.player.setMovement(0, 0);
        }

        this.clampPlayerToWalkable();
        this.player.syncLabel();
    }

    drawBackground() {
        const g = this.add.graphics();
        g.fillStyle(0x05070f, 1).fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
        g.fillStyle(0x0b1120, 1).fillRect(0, 0, GAME_WIDTH, 140);
        g.fillStyle(0x111c30, 1).fillRect(0, 140, GAME_WIDTH, 240);
        g.fillStyle(0x17233b, 1).fillRect(0, 380, GAME_WIDTH, 130);
        g.fillStyle(0x0d1426, 1).fillRect(0, 510, GAME_WIDTH, 210);
        g.fillStyle(0x171329, 1).fillRect(0, 600, GAME_WIDTH, 120);

        g.fillStyle(0x1f2f4d, 0.9).fillRoundedRect(88, 168, 246, 140, 10);
        g.fillStyle(0x0a1424, 0.95).fillRoundedRect(352, 160, 516, 178, 12);
        g.fillStyle(0x1a2034, 0.95).fillRoundedRect(896, 152, 300, 210, 12);
        g.fillStyle(0x121826, 0.94).fillRoundedRect(620, 384, 268, 156, 10);
        g.fillStyle(0x2bf1d0, 0.08).fillRect(0, 154, GAME_WIDTH, 6);
        g.fillStyle(0xffd36e, 0.08).fillRect(0, 382, GAME_WIDTH, 6);
        g.fillStyle(0x6f94ff, 0.08).fillRect(0, 510, GAME_WIDTH, 4);

        this.add.text(CENTER_X, 74, '집행의 집', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '42px',
            color: '#fff4c9',
            stroke: '#2c1346',
            strokeThickness: 5,
            shadow: {
                offsetX: 2,
                offsetY: 2,
                blur: 0,
                color: '#000000',
                fill: true,
                stroke: true
            }
        }).setOrigin(0.5).setDepth(1);

        this.add.text(174, 196, '영수증 수거 구역', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#c9ffef'
        }).setDepth(1);

        this.add.text(846, 174, 'PIMS 등록 구역', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#c9ffef'
        }).setDepth(1);

        this.add.text(586, 402, '분류 바구니', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '13px',
            color: '#9aa0c8'
        }).setDepth(1);
    }

    createHud() {
        this.topHud = new TopHUD(this, { title: chapter2Data.title });
        this.bottomHud = new BottomHUD(this);
        this.timerText = this.add.text(GAME_WIDTH - 28, 16, 'D-15', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#fff5c7',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1, 0).setDepth(860);
    }

    createWorld() {
        this.assistant = new InteractableObject(this, {
            id: 'assistant',
            name: 'KCA 간사',
            prompt: chapter2Data.assistantHint,
            x: chapter2Data.assistant.x,
            y: chapter2Data.assistant.y,
            width: chapter2Data.assistant.width,
            height: chapter2Data.assistant.height,
            color: 0xff4f86,
            animated: true
        }, () => this.handleAssistantInteract());

        this.pims = new InteractableObject(this, {
            id: 'terminal',
            name: 'PIMS 단말기',
            prompt: chapter2Data.pimsHint,
            x: chapter2Data.pims.x,
            y: chapter2Data.pims.y,
            width: chapter2Data.pims.width,
            height: chapter2Data.pims.height,
            color: 0x22e6a8,
            animated: false
        }, () => this.handlePimsInteract());

        this.baskets = chapter2Data.baskets.map((basket) => this.createBasket(basket));

        this.player = new Player(this, chapter2Data.playerStart.x, chapter2Data.playerStart.y);
        this.player.speed = 274;

        this.interactables = [this.assistant, this.pims, ...this.baskets];
        this.interaction = new InteractionManager(this, this.player, this.interactables, (prompt) => this.bottomHud.setInteractionPrompt(prompt));
    }

    createBasket(config) {
        const container = this.add.container(config.x, config.y).setDepth(3);
        const shadow = this.add.ellipse(0, 28, config.width * 0.7, 12, 0x000000, 0.24).setScale(1, 0.8);
        const body = this.add.rectangle(0, 0, config.width, config.height, 0x11172a, 0.92)
            .setStrokeStyle(2, config.color, 0.58);
        const tag = this.add.rectangle(0, -20, config.width - 18, 8, config.color, 0.9);
        const label = this.add.text(0, -3, config.label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#f8f3ff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        container.add([shadow, body, tag, label]);

        const zone = {
            id: config.id,
            label: config.label,
            category: config.category,
            x: config.x,
            y: config.y,
            prompt: `Space: ${config.label} 바구니에 넣기`,
            onInteract: () => this.handleBasketInteract(zone),
            setInteractionFocus: (focused) => {
                body.setStrokeStyle(2, config.color, focused ? 0.98 : 0.58);
                body.setFillStyle(0x18233e, focused ? 1 : 0.92);
                label.setColor(focused ? '#fff5c7' : '#f8f3ff');
            },
            update: () => {
                zone.x = container.x;
                zone.y = container.y;
            },
            destroy: () => container.destroy(true),
            container
        };

        return zone;
    }

    createReceiptPanel() {
        this.receiptPanel = this.add.rectangle(422, 240, 360, 216, 0x070b18, 0.84)
            .setStrokeStyle(2, 0x75f6ff, 0.45)
            .setDepth(40);
        this.receiptTitle = this.add.text(206, 136, '현재 영수증', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#fff5c7'
        }).setDepth(41);
        this.receiptLabel = this.add.text(206, 164, '영수증을 모으는 중', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#f8f3ff',
            wordWrap: { width: 286 }
        }).setDepth(41);
        this.receiptMeta = this.add.text(206, 204, '수거 0/10 · 분류 0/10', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '13px',
            color: '#9aa0c8',
            wordWrap: { width: 286 },
            lineSpacing: 6
        }).setDepth(41);
        this.receiptPanel.setVisible(false);
        this.receiptTitle.setVisible(false);
        this.receiptLabel.setVisible(false);
        this.receiptMeta.setVisible(false);
    }

    openBriefing() {
        this.dialogue.say(chapter2Data.introLines, () => this.beginCollectionPhase());
    }

    handleAssistantInteract() {
        if (this.stageResolved) {
            return;
        }

        if (this.stagePhase === 'briefing') {
            this.openBriefing();
            return;
        }

        if (this.stagePhase === 'collect') {
            this.showAssistantBark('먼저 영수증을 모으세요.', 1800);
            return;
        }

        const current = this.receiptQueue[0];
        if (this.stagePhase === 'sort' && current) {
            if (current.asset && !current.registered) {
                this.showAssistantBark('자산취득비는 PIMS에 먼저 등록해야 합니다.', 2400);
                return;
            }
            this.showAssistantBark(`${current.label}은 ${current.invalid ? '반려통' : current.category}입니다.`, 2400);
            return;
        }

        this.showAssistantBark('영수증을 바구니에 분류하세요.', 1800);
    }

    beginCollectionPhase() {
        this.stagePhase = 'collect';
        GameState.set('stage2BriefingDone', true);
        GameState.set('stage2Phase', 'collect');
        this.updateReceiptState();
        this.spawnReceiptBurst(6);
        this.showToast('영수증을 주워 모으세요.', 0xc9ffef);
    }

    beginSortingPhase() {
        if (this.stagePhase === 'sort' || this.stageResolved) {
            return;
        }

        this.stagePhase = 'sort';
        GameState.set('stage2Phase', 'sort');
        this.timerDays = chapter2Data.timerDays;
        GameState.set('stage2TimerRemaining', this.timerDays);
        this.refreshTimerText();
        this.updateReceiptState();
        this.startSortingTimer();
        this.showToast('이제 바구니로 분류하세요.', 0xfff0a8);
    }

    startSortingTimer() {
        this.timerLoop?.remove(false);
        this.timerLoop = this.time.addEvent({
            delay: chapter2Data.timerTickMs,
            loop: true,
            callback: () => {
                if (this.stageResolved || this.stagePhase !== 'sort' || !GameState.get('timeRunning')) {
                    return;
                }
                this.timerDays = Math.max(0, this.timerDays - 1);
                GameState.set('stage2TimerRemaining', this.timerDays);
                this.refreshTimerText();
                if (this.timerDays <= 0) {
                    this.failStage('시간 초과! 집행의 집을 비워야 합니다.');
                }
            }
        });
    }

    refreshTimerText() {
        this.timerText?.setText(`D-${this.timerDays}`);
    }

    spawnReceiptBurst(count) {
        const burstCount = Math.min(count, this.pendingReceipts.length);
        for (let i = 0; i < burstCount; i += 1) {
            const def = this.pendingReceipts.shift();
            if (!def) {
                continue;
            }
            const point = FLOOR_POINTS[i % FLOOR_POINTS.length];
            const target = {
                x: point.x + Phaser.Math.Between(-18, 18),
                y: point.y + Phaser.Math.Between(-12, 12)
            };
            this.spawnReceipt(def, chapter2Data.assistant.x, chapter2Data.assistant.y - 22, true, target);
        }
    }

    spawnReceipt(def, x, y, thrown = false, target = null) {
        const color = RECEIPT_COLORS[def.category] || 0xc9ffef;
        const receipt = {
            id: def.id,
            label: def.label,
            category: def.category,
            purpose: def.purpose,
            amount: def.amount,
            place: def.place,
            note: def.note,
            asset: Boolean(def.asset),
            invalid: Boolean(def.invalid),
            registered: false,
            available: !thrown,
            x,
            y,
            prompt: 'Space: 영수증 줍기',
            onInteract: () => this.collectReceipt(receipt),
            setInteractionFocus: (focused) => {
                receipt.body?.setStrokeStyle(2, color, focused ? 1 : 0.45);
                receipt.body?.setFillStyle(0xf5f1e7, focused ? 1 : 0.94);
                receipt.fold?.setAlpha(focused ? 1 : 0.82);
            },
            update: () => {
                if (receipt.container) {
                    receipt.x = receipt.container.x;
                    receipt.y = receipt.container.y;
                }
            },
            destroy: () => receipt.container?.destroy(true)
        };

        const container = this.add.container(x, y).setDepth(thrown ? 5.5 : 5);
        const shadow = this.add.ellipse(0, 26, 84, 14, 0x000000, 0.28).setScale(1, 0.8);
        const body = this.add.rectangle(0, 0, 132, 52, 0xf5f1e7, 0.97).setStrokeStyle(2, color, 0.52);
        const fold = this.add.triangle(48, -20, 0, 0, 12, 0, 12, 12, 0xfdfbf2, 0.95)
            .setStrokeStyle(1, 0xd7d0c4, 0.45);
        const line1 = this.add.rectangle(-12, -8, 58, 3, 0xc9c4b8, 0.7);
        const line2 = this.add.rectangle(-10, 2, 48, 3, 0xc9c4b8, 0.54);
        const line3 = this.add.rectangle(-16, 12, 66, 3, 0xc9c4b8, 0.48);
        const stamp = this.add.rectangle(38, 10, 18, 12, color, 0.75);
        container.add([shadow, body, fold, line1, line2, line3, stamp]);
        receipt.container = container;
        receipt.body = body;
        receipt.fold = fold;
        receipt.shadow = shadow;
        receipt.color = color;

        if (thrown) {
            const startX = x + Phaser.Math.Between(-24, 24);
            const startY = y - Phaser.Math.Between(40, 70);
            container.setPosition(startX, startY);
            this.tweens.add({
                targets: container,
                x: target?.x || x,
                y: target?.y || y,
                duration: Phaser.Math.Between(420, 620),
                ease: 'Quad.easeOut',
                onComplete: () => {
                    receipt.available = true;
                    this.showToast('영수증이 도착했습니다.', 0x75f6ff);
                }
            });
        }

        this.worldReceipts.push(receipt);
        this.interactables.push(receipt);
        return receipt;
    }

    collectReceipt(receipt) {
        if (this.stageResolved || !receipt.available || receipt.collected) {
            return;
        }

        receipt.collected = true;
        const index = this.interactables.indexOf(receipt);
        if (index >= 0) {
            this.interactables.splice(index, 1);
        }

        this.tweens.add({
            targets: receipt.container,
            alpha: { from: 1, to: 0 },
            scale: { from: 1, to: 0.72 },
            duration: 180,
            onComplete: () => receipt.destroy()
        });

        this.receiptQueue.push(receipt);
        this.collectedCount += 1;
        this.showToast('영수증을 주웠습니다.', 0xc9ffef);
        this.updateReceiptState();

        if (!this.bonusWaveTriggered && this.stagePhase === 'collect' && this.collectedCount >= 3 && this.pendingReceipts.length > 0) {
            this.bonusWaveTriggered = true;
            this.time.delayedCall(500, () => {
                if (this.stageResolved || this.stagePhase !== 'collect') {
                    return;
                }
                this.showAssistantBark('아차! 대리님 여기 영수증 뭉치가 더 있네요!', 2200);
                this.spawnReceiptBurst(this.pendingReceipts.length);
            });
        }

        if (this.collectedCount >= chapter2Data.receiptPool.length && this.pendingReceipts.length === 0) {
            this.beginSortingPhase();
        }
    }

    updateReceiptState() {
        const current = this.receiptQueue[0] || null;
        GameState.set('stage2CollectedCount', this.collectedCount);
        GameState.set('stage2SortedCount', this.sortedCount);
        GameState.set('stage2CurrentReceiptLabel', current?.label || '');
        GameState.set('stage2CurrentReceiptCategory', current?.category || '');
        GameState.set('stage2PendingAssetRegistration', Boolean(current && current.asset && !current.registered));
        GameState.set('executionRate', Math.min(100, Math.round((this.sortedCount / chapter2Data.receiptPool.length) * 100)));
        this.bottomHud?.refresh();
        this.topHud?.refresh();
        this.refreshReceiptPanel();
        this.scheduleAssetReminder();
    }

    refreshReceiptPanel() {
        const current = this.receiptQueue[0] || null;
        const phase = this.stagePhase;
        if (phase === 'collect') {
            this.receiptPanel?.setVisible(false);
            this.receiptTitle?.setVisible(false);
            this.receiptLabel?.setVisible(false);
            this.receiptMeta?.setVisible(false);
            return;
        }

        if (phase !== 'sort') {
            this.receiptPanel?.setVisible(false);
            this.receiptTitle?.setVisible(false);
            this.receiptLabel?.setVisible(false);
            this.receiptMeta?.setVisible(false);
            return;
        }

        this.receiptPanel?.setVisible(true);
        this.receiptTitle?.setVisible(true);
        this.receiptLabel?.setVisible(true);
        this.receiptMeta?.setVisible(true);

        if (!current) {
            this.receiptLabel?.setText('대기 중');
            this.receiptMeta?.setText(`수거 ${this.collectedCount}/${chapter2Data.receiptPool.length} · 분류 ${this.sortedCount}/${chapter2Data.receiptPool.length}`);
            return;
        }

        this.receiptLabel?.setText(current.label);
        this.receiptMeta?.setText(this.buildReceiptDetailText(current));

        this.tweens.add({
            targets: this.receiptPanel,
            scaleX: { from: 1, to: 1.02 },
            scaleY: { from: 1, to: 1.02 },
            duration: 120,
            yoyo: true
        });
    }

    buildReceiptDetailText(receipt) {
        const lines = [
            `사용 목적: ${receipt.purpose || '-'}`,
            `금액: ${receipt.amount || '-'}`,
            `사용처: ${receipt.place || '-'}`
        ];
        if (receipt.note) {
            lines.push(`판단 포인트: ${receipt.note}`);
        }
        if (receipt.asset) {
            lines.push(receipt.registered ? 'PIMS 등록 완료' : 'PIMS 등록 필요');
        }
        if (receipt.invalid) {
            lines.push('반려 대상');
        }
        return lines.join('\n');
    }

    scheduleAssetReminder() {
        this.assetReminderCall?.remove(false);
        const current = this.receiptQueue[0];
        if (!current || !current.asset || current.registered || this.stagePhase !== 'sort') {
            return;
        }

        this.assetReminderCall = this.time.delayedCall(2400, () => {
            if (this.stageResolved) {
                return;
            }
            const active = this.receiptQueue[0];
            if (active && active.asset && !active.registered && this.stagePhase === 'sort') {
                this.showAssistantBark(chapter2Data.assetReminder, 2600);
            }
        });
    }

    handleBasketInteract(basket) {
        if (this.stagePhase !== 'sort') {
            this.showToast('먼저 영수증을 모두 모으세요.', 0xfff0a8);
            return;
        }

        const current = this.receiptQueue[0];
        if (!current) {
            this.showToast('먼저 영수증을 골라야 합니다.', 0xfff0a8);
            return;
        }

        if (basket.id === 'reject') {
            if (current.invalid) {
                this.completeReceiptSort(current);
                return;
            }
            this.rejectReceipt(current, chapter2Data.rejectMessage);
            return;
        }

        if (current.invalid) {
            this.rejectReceipt(current, chapter2Data.rejectMessage);
            return;
        }

        if (basket.id === 'asset') {
            if (!current.asset) {
                this.rejectReceipt(current, '이 영수증은 자산취득비가 아닙니다.');
                return;
            }
            if (!current.registered) {
                this.rejectReceipt(current, chapter2Data.assetReminder);
                return;
            }
            this.completeReceiptSort(current);
            return;
        }

        if (current.asset && !current.registered) {
            this.rejectReceipt(current, chapter2Data.assetReminder);
            return;
        }

        if (basket.category === current.category) {
            this.completeReceiptSort(current);
            return;
        }

        this.rejectReceipt(current, chapter2Data.rejectMessage);
    }

    handlePimsInteract() {
        if (this.stagePhase !== 'sort') {
            this.showToast('아직 영수증을 더 모아야 합니다.', 0xfff0a8);
            return;
        }

        const current = this.receiptQueue[0];
        if (!current) {
            this.showToast('등록할 영수증이 없습니다.', 0xfff0a8);
            return;
        }

        if (!current.asset) {
            this.showToast('이 영수증은 자산취득비가 아닙니다.', 0xfff0a8);
            return;
        }

        if (current.registered) {
            this.showToast('이미 PIMS에 등록했습니다.', 0x75f6ff);
            return;
        }

        current.registered = true;
        this.showAssistantBark(chapter2Data.assetRegistered, 2400);
        this.updateReceiptState();
    }

    rejectReceipt(_receipt, message) {
        GameState.decreaseHp(1);
        this.showAssistantBark(message, 2200);
        this.showToast('반려되었습니다. HP -1', 0xff6b7d);
        this.refreshHud();
    }

    completeReceiptSort(receipt) {
        this.receiptQueue.shift();
        this.sortedCount += 1;
        this.showToast('분류 완료!', 0x75f6ff);
        this.updateReceiptState();
        receipt?.destroy?.();
        if (this.receiptQueue.length === 0 && this.sortedCount >= chapter2Data.receiptPool.length) {
            this.completeStage2();
        }
    }

    completeStage2() {
        if (this.stageResolved) {
            return;
        }

        this.stageResolved = true;
        GameState.set('stage2Cleared', true);
        GameState.set('stage2Failed', false);
        GameState.set('timeRunning', false);
        this.assetReminderCall?.remove(false);
        this.timerLoop?.remove(false);

        this.showEndingScreen({
            title: '2단계 완료',
            body: '모든 영수증을 수거하고 분류했습니다.\n집행의 집 정리를 마쳤습니다.',
            primaryLabel: '처음으로 돌아가기',
            primaryAction: () => {
                GameState.reset();
                this.scene.start('StartScene');
            },
            secondaryLabel: '다시 하기',
            secondaryAction: () => {
                GameState.reset();
                this.scene.start('ExecutionHouseScene');
            }
        });
    }

    failStage(message) {
        if (this.stageResolved) {
            return;
        }

        this.stageResolved = true;
        GameState.set('stage2Cleared', false);
        GameState.set('stage2Failed', true);
        GameState.set('timeRunning', false);
        this.assetReminderCall?.remove(false);
        this.timerLoop?.remove(false);

        this.showEndingScreen({
            title: '시간 초과',
            body: message,
            primaryLabel: '다시 하기',
            primaryAction: () => {
                GameState.reset();
                this.scene.start('ExecutionHouseScene');
            },
            secondaryLabel: '처음으로 돌아가기',
            secondaryAction: () => {
                GameState.reset();
                this.scene.start('StartScene');
            }
        });
    }

    showEndingScreen({ title, body, primaryLabel, primaryAction, secondaryLabel, secondaryAction }) {
        this.endingOverlay = this.add.rectangle(CENTER_X, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x02030a, 0.72)
            .setOrigin(0.5)
            .setDepth(100);

        const overlayShade = this.add.graphics().setDepth(101);
        const steps = 42;
        const stepHeight = GAME_HEIGHT / steps;
        for (let i = 0; i < steps; i += 1) {
            const t = i / Math.max(1, steps - 1);
            const alpha = 0.04 + (0.82 - 0.04) * Math.pow(t, 1.08);
            overlayShade.fillStyle(0x02030a, alpha).fillRect(0, i * stepHeight, GAME_WIDTH, stepHeight + 1);
        }
        this.endingOverlayShade = overlayShade;

        this.add.text(CENTER_X, 130, title, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '42px',
            color: '#fff5c7',
            stroke: '#34145c',
            strokeThickness: 5
        }).setOrigin(0.5).setDepth(110);

        this.add.text(CENTER_X, 232, body, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '24px',
            color: '#f8f3ff',
            align: 'center',
            wordWrap: { width: 860 },
            lineSpacing: 10
        }).setOrigin(0.5).setDepth(110);

        this.createButton(440, 612, primaryLabel, primaryAction);
        this.createButton(840, 612, secondaryLabel, secondaryAction);
    }

    createButton(x, y, label, onClick) {
        let bg;
        let hoverBg = null;
        if (this.textures.exists('ui_button_normal')) {
            bg = this.add.image(x, y, 'ui_button_normal').setDisplaySize(260, 56).setDepth(110);
            if (this.textures.exists('ui_button_hover')) {
                hoverBg = this.add.image(x, y, 'ui_button_hover').setDisplaySize(260, 56).setVisible(false).setDepth(110);
            }
        } else {
            bg = this.add.rectangle(x, y, 260, 56, 0x24183f, 1).setStrokeStyle(2, 0x75f6ff, 0.72).setDepth(110);
        }

        const text = this.add.text(x, y, label, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '20px',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(111);

        const hit = this.add.rectangle(x, y, 260, 56, 0x000000, 0).setDepth(110).setInteractive({ useHandCursor: true });
        const select = (_pointer, _localX, _localY, event) => {
            event?.stopPropagation?.();
            onClick?.();
        };

        hit.on('pointerover', () => {
            if (hoverBg) {
                bg.setVisible(false);
                hoverBg.setVisible(true);
            } else if (bg.setFillStyle) {
                bg.setFillStyle(0x322159);
            }
        });
        hit.on('pointerout', () => {
            if (hoverBg) {
                bg.setVisible(true);
                hoverBg.setVisible(false);
            } else if (bg.setFillStyle) {
                bg.setFillStyle(0x24183f);
            }
        });
        hit.on('pointerdown', select);
        text.setInteractive({ useHandCursor: true }).on('pointerdown', select);
    }

    showAssistantBark(message, duration = 1800) {
        this.assistantBark?.destroy();
        this.assistantBark = this.add.text(
            chapter2Data.assistant.x + 22,
            chapter2Data.assistant.y - chapter2Data.assistant.height / 2 - 28,
            message,
            {
                fontFamily: 'GALMURI, Arial, sans-serif',
                fontSize: '15px',
                color: '#f8f3ff',
                backgroundColor: '#120c22',
                padding: { left: 8, right: 8, top: 5, bottom: 5 },
                wordWrap: { width: 250 }
            }
        ).setOrigin(0.5, 1).setDepth(90);

        this.tweens.add({
            targets: this.assistantBark,
            alpha: { from: 1, to: 0 },
            duration,
            delay: 1000,
            onComplete: () => this.assistantBark?.destroy()
        });
    }

    showToast(message, color = 0xc9ffef) {
        this.toast?.destroy();
        this.toast = this.add.text(CENTER_X, 440, message, {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#f8f3ff',
            stroke: '#000000',
            strokeThickness: 4,
            backgroundColor: '#05050a',
            padding: { left: 12, right: 12, top: 6, bottom: 6 }
        }).setOrigin(0.5).setDepth(95);
        this.toast.setColor(`#${color.toString(16).padStart(6, '0')}`);

        this.tweens.add({
            targets: this.toast,
            alpha: { from: 1, to: 0 },
            duration: 1400,
            delay: 900,
            onComplete: () => this.toast?.destroy()
        });
    }

    handlePointerDown(pointer) {
        if (this.dialogue.isActive || this.stageResolved) {
            return;
        }

        const worldBottom = chapter2Data.walkableArea.y + chapter2Data.walkableArea.height;
        if (pointer.y < 136 || pointer.y > worldBottom) {
            return;
        }

        this.clickTarget = this.clampToWalkable(pointer.x, pointer.y);
    }

    tryInteract() {
        if (!this.dialogue.isActive) {
            this.interaction.interact();
        }
    }

    getKeyboardAxis() {
        return {
            x: (this.cursors.left.isDown || this.wasd.A.isDown ? -1 : 0) + (this.cursors.right.isDown || this.wasd.D.isDown ? 1 : 0),
            y: (this.cursors.up.isDown || this.wasd.W.isDown ? -1 : 0) + (this.cursors.down.isDown || this.wasd.S.isDown ? 1 : 0)
        };
    }

    moveTowardClickTarget() {
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, this.clickTarget.x, this.clickTarget.y);
        if (distance < 4) {
            this.clickTarget = null;
            this.player.setMovement(0, 0);
            return;
        }

        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, this.clickTarget.x, this.clickTarget.y);
        this.player.setMovement(Math.cos(angle) * this.player.speed, Math.sin(angle) * this.player.speed);
    }

    clampToWalkable(x, y) {
        const area = chapter2Data.walkableArea;
        return {
            x: Phaser.Math.Clamp(x, area.x, area.x + area.width),
            y: Phaser.Math.Clamp(y, area.y, area.y + area.height)
        };
    }

    clampPlayerToWalkable() {
        const clamped = this.clampToWalkable(this.player.x, this.player.y);
        this.player.setPosition(clamped.x, clamped.y);
    }

    refreshHud() {
        this.topHud.refresh();
        this.bottomHud.refresh();
        this.refreshTimerText();
        this.refreshReceiptPanel();
    }
}
