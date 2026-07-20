import * as Phaser from 'phaser';
import { GameState } from '../systems/GameState.js';
import { DialogueManager } from '../systems/DialogueManager.js';
import { InteractionManager } from '../systems/InteractionManager.js';
import { Player } from '../objects/Player.js';
import { InteractableObject } from '../objects/InteractableObject.js';
import { BottomHUD } from '../objects/BottomHUD.js';
import { TopHUD } from '../objects/TopHUD.js';
import { ASSETS, hasTexture, playBgmWithFade } from '../systems/AssetManager.js';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameDimensions.js';

const SECONDS_PER_DAY = 15;
const DAY_TICK_MS = SECONDS_PER_DAY * 1000;
const MAX_BOSS_APPROACH = 5;
const WALK_BOUNDS = { minX: 300, maxX: 1228, minY: 430, maxY: 510 };

const SETTLEMENT = {
    reportDate: '2월 15일',
    balance: 2512380,
    interest: 9510,
    additionalInterest: 3200,
    total: 2525090
};

const WORLD_LAYOUT = {
    player: { x: 390, y: 486 },
    assistant: { x: 510, y: 454, width: 92, height: 132 },
    calendar: { x: 690, y: 402, width: 126, height: 170 },
    bank: { x: 900, y: 408, width: 142, height: 160 },
    gate: { x: 1130, y: 390, width: 178, height: 196 }
};

const formatWon = (value) => `${Number(value).toLocaleString('ko-KR')}원`;

export class Stage8Scene extends Phaser.Scene {
    constructor() {
        super('Stage8Scene');
        this.mode = 'field';
        this.player = null;
        this.dialogue = null;
        this.interaction = null;
        this.interactables = [];
        this.clickTarget = null;
        this.dayTimer = null;
        this.overlay = null;
        this.transitionLocked = false;
        this.resultPanelExpanded = false;
        this.noticeSelections = {};
        this.milestonesShown = new Set();
    }

    create() {
        this.initializeState();
        this.cameras.main.setBackgroundColor(0x090714);
        playBgmWithFade(this, ASSETS.audio.bgmMain.key, { loop: true, volume: 0.32 }, 900);
        this.drawBackground();
        this.createHud();
        this.createBossShadow();
        this.createWorld();
        this.createStageUi();
        this.createInput();
        this.startDayTimer();
        this.refreshStageUi();
        this.refreshBossApproach(false);

        this.time.delayedCall(260, () => {
            this.dialogue.say([
                { speaker: 'KCA 간사', text: '정산보고서 제출은 끝났지만, 아직 퇴근은 아닙니다.' },
                { speaker: 'KCA 간사', text: '정산잔액이 발생했으니, 정산금을 반납해야 합니다.' },
                { speaker: 'KCA 간사', text: '반납 마감은 3월 31일입니다.' },
                { speaker: 'KCA 간사', text: '정산결과는 상단 패널에서 확인하고, 먼저 반납예정일을 정하세요.' }
            ]);
        });

        this.events.once('shutdown', () => this.cleanup());
    }

    initializeState() {
        GameState.set('currentChapter', 8);
        GameState.set('currentDate', { year: 2, month: 3, day: 1 });
        GameState.set('timeRunning', true);
        GameState.set('stage8CurrentDay', 1);
        GameState.set('stage8SecondsPerDay', SECONDS_PER_DAY);
        GameState.set('stage8ReturnDateSelected', false);
        GameState.set('stage8SelectedReturnDay', null);
        GameState.set('stage8AdditionalInterestChecked', false);
        GameState.set('stage8AdditionalInterest', SETTLEMENT.additionalInterest);
        GameState.set('stage8NoticeApproved', false);
        GameState.set('stage8ReturnNoticeReceived', false);
        GameState.set('stage8PaymentCompleted', false);
        GameState.set('stage8WrongCount', 0);
        GameState.set('stage8BossPenaltyLevel', 0);
        GameState.set('stage8BossApproachLevel', 0);
        GameState.set('stage8GameOver', false);
        GameState.set('stage8ReportDate', SETTLEMENT.reportDate);
        GameState.set('stage8SettlementBalance', SETTLEMENT.balance);
        GameState.set('stage8Interest', SETTLEMENT.interest);
        GameState.set('stage8TotalReturnAmount', SETTLEMENT.total);
        GameState.set('gameOverReason', null);
        GameState.set('gameOverRestartScene', null);
    }

    drawBackground() {
        const key = ASSETS.backgrounds.returnValley.key;
        if (hasTexture(this, key)) {
            this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, key)
                .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
                .setDepth(0);
            return;
        }

        const g = this.add.graphics().setDepth(0);
        g.fillGradientStyle(0x15112f, 0x15112f, 0x382555, 0x382555, 1);
        g.fillRect(0, 0, GAME_WIDTH, 490);
        g.fillStyle(0x211935, 1).fillRect(0, 490, GAME_WIDTH, 82);
        g.fillStyle(0x0f0c1d, 1).fillRect(0, 572, GAME_WIDTH, GAME_HEIGHT - 572);
        g.fillStyle(0x8c65b7, 0.16);
        for (let x = 40; x < GAME_WIDTH; x += 155) {
            g.fillTriangle(x, 490, x + 86, 300, x + 170, 490);
        }
        g.lineStyle(2, 0xffd36e, 0.18).lineBetween(300, 490, GAME_WIDTH, 490);
    }

    createHud() {
        this.topHud = new TopHUD(this);
        this.bottomHud = new BottomHUD(this);
        this.dialogue = new DialogueManager(this, { layout: this.bottomHud.getDialogLayout() });
    }

    createBossShadow() {
        this.bossContainer = this.add.container(-80, 368).setDepth(1).setAlpha(0.42);
        const shadow = this.add.ellipse(0, 124, 190, 48, 0x020107, 0.62);
        const body = this.add.ellipse(0, 25, 112, 220, 0x040309, 0.92);
        const shoulders = this.add.ellipse(0, -20, 176, 72, 0x040309, 0.92);
        const head = this.add.circle(0, -126, 42, 0x030208, 0.96);
        const eyes = this.add.text(0, -126, '·  ·', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '20px',
            color: '#ffcf70'
        }).setOrigin(0.5).setAlpha(0.25);
        this.bossContainer.add([shadow, body, shoulders, head, eyes]);
        this.bossEyes = eyes;
    }

    createWorld() {
        this.drawObjectArt();
        this.player = new Player(this, WORLD_LAYOUT.player.x, WORLD_LAYOUT.player.y);
        this.player.speed = 255;

        this.assistantObject = this.createInteractable('assistant', 'KCA 간사', 'SPACE : 진행 안내', WORLD_LAYOUT.assistant, {
            textureKey: ASSETS.characters.kcaAssistantIdle.key,
            color: 0xff4f86
        });
        this.calendarObject = this.createInteractable('stage8Calendar', '반납예정일 달력', 'SPACE : 반납예정일 선택', WORLD_LAYOUT.calendar, {
            hideVisuals: true,
            labelOnly: true
        });
        this.bankObject = this.createInteractable('stage8Bank', '은행 전화기', 'SPACE : 추가반납이자 확인', WORLD_LAYOUT.bank, {
            hideVisuals: true,
            labelOnly: true
        });
        this.gateObject = this.createInteractable('stage8Gate', '고지서 발급 요청', 'SPACE : 공문 작성', WORLD_LAYOUT.gate, {
            hideVisuals: true,
            labelOnly: true
        });

        this.interactables = [this.assistantObject, this.calendarObject, this.bankObject, this.gateObject];
        this.interaction = new InteractionManager(this, this.player, this.interactables, (prompt) => {
            this.bottomHud.setInteractionPrompt(prompt);
        });
    }

    drawObjectArt() {
        const g = this.add.graphics().setDepth(1);

        const calendar = WORLD_LAYOUT.calendar;
        g.fillStyle(0xf3e7d0, 0.96).fillRoundedRect(calendar.x - 54, calendar.y - 68, 108, 128, 8);
        g.fillStyle(0x6b3f86, 1).fillRoundedRect(calendar.x - 54, calendar.y - 68, 108, 28, 8);
        g.lineStyle(2, 0xffd36e, 0.65).strokeRoundedRect(calendar.x - 54, calendar.y - 68, 108, 128, 8);
        for (let row = 0; row < 4; row += 1) {
            for (let col = 0; col < 5; col += 1) {
                g.fillStyle(0x6b3f86, 0.35).fillRect(calendar.x - 39 + col * 17, calendar.y - 25 + row * 18, 8, 8);
            }
        }

        const bank = WORLD_LAYOUT.bank;
        g.fillStyle(0x243653, 0.98).fillRoundedRect(bank.x - 64, bank.y - 52, 128, 110, 12);
        g.lineStyle(2, 0x75f6ff, 0.65).strokeRoundedRect(bank.x - 64, bank.y - 52, 128, 110, 12);
        g.fillStyle(0x75f6ff, 0.25).fillRoundedRect(bank.x - 40, bank.y - 35, 80, 42, 6);
        g.lineStyle(7, 0xf2dca7, 0.9).strokeArc(bank.x, bank.y - 8, 42, Phaser.Math.DegToRad(205), Phaser.Math.DegToRad(335));
        g.fillStyle(0xf2dca7, 0.9).fillCircle(bank.x - 36, bank.y + 9, 10).fillCircle(bank.x + 36, bank.y + 9, 10);

        const gate = WORLD_LAYOUT.gate;
        g.fillStyle(0x231538, 0.98).fillRoundedRect(gate.x - 76, gate.y - 78, 152, 154, 12);
        g.lineStyle(4, 0xffd36e, 0.72).strokeRoundedRect(gate.x - 76, gate.y - 78, 152, 154, 12);
        g.fillStyle(0xfff5c7, 0.94).fillRoundedRect(gate.x - 42, gate.y - 45, 84, 98, 5);
        g.lineStyle(2, 0x6b3f86, 0.5);
        for (let i = 0; i < 4; i += 1) {
            g.lineBetween(gate.x - 25, gate.y - 22 + i * 17, gate.x + 25, gate.y - 22 + i * 17);
        }
        this.gateGlow = this.add.rectangle(gate.x, gate.y, 168, 170, 0xffd36e, 0)
            .setStrokeStyle(3, 0xffd36e, 0)
            .setDepth(1.2);
    }

    createInteractable(id, name, prompt, layout, options = {}) {
        return new InteractableObject(this, {
            id,
            name,
            prompt,
            ...layout,
            color: options.color ?? 0x6650a4,
            textureKey: options.textureKey,
            hideVisuals: Boolean(options.hideVisuals),
            labelOnly: Boolean(options.labelOnly),
            hideBorder: true,
            animated: false
        }, () => this.handleInteraction(id));
    }

    createStageUi() {
        this.resultToggle = this.add.rectangle(166, 120, 238, 42, 0x18112c, 0.92)
            .setStrokeStyle(2, 0x75f6ff, 0.55)
            .setDepth(940)
            .setInteractive({ useHandCursor: true });
        this.resultToggleText = this.add.text(166, 120, '정산결과 ▼', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '17px',
            color: '#f8f3ff'
        }).setOrigin(0.5).setDepth(941);
        this.resultToggle.on('pointerdown', () => this.toggleResultPanel());

        this.resultPanel = this.add.container(38, 148).setDepth(939).setVisible(false);
        const resultBg = this.add.rectangle(0, 0, 350, 236, 0x100d24, 0.96)
            .setOrigin(0, 0)
            .setStrokeStyle(2, 0x75f6ff, 0.5);
        this.resultText = this.add.text(18, 18, '', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '14px',
            color: '#f8f3ff',
            lineSpacing: 8
        });
        this.resultPanel.add([resultBg, this.resultText]);

        this.dayText = this.add.text(865, 119, '현재 날짜: 3월 1일', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#c9ffef',
            stroke: '#090714',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(940);
        this.deadlineText = this.add.text(1080, 119, '반납 마감: 3월 31일', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '18px',
            color: '#ffd36e',
            stroke: '#090714',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(940);
        this.bossStatusText = this.add.text(972, 154, '본부장님 접근도 0 / 5', {
            fontFamily: 'GALMURI, Arial, sans-serif',
            fontSize: '15px',
            color: '#d9c8ff',
            stroke: '#090714',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(940);
    }

    toggleResultPanel() {
        this.resultPanelExpanded = !this.resultPanelExpanded;
        this.resultPanel.setVisible(this.resultPanelExpanded);
        this.resultToggleText.setText(this.resultPanelExpanded ? '정산결과 ▲' : '정산결과 ▼');
        this.refreshResultPanel();
    }

    refreshResultPanel() {
        const lines = [
            `정산보고서 작성일: ${SETTLEMENT.reportDate}`,
            `정산잔액: ${formatWon(SETTLEMENT.balance)}`,
            `발생이자: ${formatWon(SETTLEMENT.interest)}`
        ];
        if (GameState.get('stage8ReturnDateSelected')) {
            lines.push('', `반납예정일: 3월 ${GameState.get('stage8SelectedReturnDay')}일`);
        }
        if (GameState.get('stage8AdditionalInterestChecked')) {
            lines.push(`추가반납이자: ${formatWon(SETTLEMENT.additionalInterest)}`);
            lines.push(`총 반납금액: ${formatWon(SETTLEMENT.total)}`);
        }
        this.resultText?.setText(lines.join('\n'));
    }

    createInput() {
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,A,S,D');
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.onSpaceDown = () => this.tryInteract();
        this.onEnterDown = () => {
            if (!this.dialogue.isActive) this.tryInteract();
        };
        this.onPointerDown = (pointer) => {
            if (this.isFieldBlocked()) return;
            this.clickTarget = this.clampToWalkable(pointer.x, pointer.y);
        };
        this.spaceKey.on('down', this.onSpaceDown);
        this.enterKey.on('down', this.onEnterDown);
        this.input.on('pointerdown', this.onPointerDown);
    }

    startDayTimer() {
        this.dayTimer?.remove(false);
        this.dayTimer = this.time.addEvent({
            delay: DAY_TICK_MS,
            loop: true,
            callback: () => this.advanceDay()
        });
    }

    advanceDay() {
        if (this.transitionLocked || GameState.get('stage8PaymentCompleted') || GameState.get('stage8GameOver')) return;
        const nextDay = (GameState.get('stage8CurrentDay') ?? 1) + 1;
        GameState.set('stage8CurrentDay', nextDay);
        GameState.set('currentDate', { year: 2, month: nextDay > 31 ? 4 : 3, day: nextDay > 31 ? 1 : nextDay });

        if (nextDay > 31) {
            this.failStage('3월 31일이 지났습니다.\n정산금 반납 마감기한을 넘겼습니다.\nPIMS WORLD를 탈출하지 못했습니다.');
            return;
        }

        this.refreshStageUi();
        this.refreshBossApproach(true);
        if (nextDay === 25) {
            this.queueMilestoneDialogue(25, [
                { speaker: 'KCA 간사', text: '휴... 지금부터는 이틀 정도만 여유 주셔도 감사할 따름이겠어요.' },
                { speaker: 'KCA 간사', text: '얼른 반납하세요!' }
            ]);
        } else if (nextDay === 29) {
            this.queueMilestoneDialogue(29, [
                { speaker: 'KCA 간사', text: '이제 선택지는 없습니다.' },
                { speaker: 'KCA 간사', text: '3월 31일 반납으로 즉시 진행해야 합니다.' }
            ]);
        }
    }

    queueMilestoneDialogue(day, lines) {
        if (this.milestonesShown.has(day)) return;
        if (this.transitionLocked || GameState.get('stage8GameOver') || GameState.get('stage8PaymentCompleted')) return;
        if (this.mode !== 'field' || this.dialogue.isActive) {
            this.time.delayedCall(500, () => this.queueMilestoneDialogue(day, lines));
            return;
        }
        this.milestonesShown.add(day);
        this.dialogue.say(lines);
    }

    update() {
        const blocked = this.isFieldBlocked();
        this.interactables.forEach((item) => item.update?.());
        this.interaction.update(blocked);
        this.topHud.refresh();
        this.bottomHud.refresh();
        this.refreshPrompts();

        if (blocked) {
            this.player.setMovement(0, 0);
            return;
        }

        const axis = this.getKeyboardAxis();
        if (axis.x || axis.y) {
            this.clickTarget = null;
            const length = Math.hypot(axis.x, axis.y) || 1;
            this.player.setMovement(axis.x / length * this.player.speed, axis.y / length * this.player.speed);
        } else if (this.clickTarget) {
            this.moveTowardClickTarget();
        } else {
            this.player.setMovement(0, 0);
        }
        this.clampPlayerToWalkable();
        this.player.syncLabel();
    }

    isFieldBlocked() {
        return this.dialogue.isActive || this.transitionLocked || this.mode !== 'field';
    }

    getKeyboardAxis() {
        return {
            x: (this.cursors.left.isDown || this.wasd.A.isDown ? -1 : 0) + (this.cursors.right.isDown || this.wasd.D.isDown ? 1 : 0),
            y: (this.cursors.up.isDown || this.wasd.W.isDown ? -1 : 0) + (this.cursors.down.isDown || this.wasd.S.isDown ? 1 : 0)
        };
    }

    clampToWalkable(x, y) {
        return {
            x: Phaser.Math.Clamp(x, WALK_BOUNDS.minX, WALK_BOUNDS.maxX),
            y: Phaser.Math.Clamp(y, WALK_BOUNDS.minY, WALK_BOUNDS.maxY)
        };
    }

    clampPlayerToWalkable() {
        const position = this.clampToWalkable(this.player.x, this.player.y);
        this.player.setPosition(position.x, position.y);
    }

    moveTowardClickTarget() {
        const dx = this.clickTarget.x - this.player.x;
        const dy = this.clickTarget.y - this.player.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 7) {
            this.clickTarget = null;
            this.player.setMovement(0, 0);
            return;
        }
        this.player.setMovement(dx / distance * this.player.speed, dy / distance * this.player.speed);
    }

    tryInteract() {
        if (!this.isFieldBlocked()) this.interaction.interact();
    }

    handleInteraction(id) {
        if (id === 'assistant') this.showAssistantHint();
        if (id === 'stage8Calendar') this.openCalendar();
        if (id === 'stage8Bank') this.checkAdditionalInterest();
        if (id === 'stage8Gate') this.handleGateInteraction();
    }

    showAssistantHint() {
        let text = GameState.getCurrentObjective();
        if (!GameState.get('stage8ReturnDateSelected')) {
            text = '고지서 발급 요청일과 반납일자 사이에는 5일 정도의 여유가 필요합니다.';
        }
        this.dialogue.say([{ speaker: 'KCA 간사', text }]);
    }

    openCalendar() {
        if (GameState.get('stage8NoticeApproved')) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '고지서가 이미 발급되어 반납예정일을 바꿀 수 없습니다.' }]);
            return;
        }
        this.closeOverlay();
        this.mode = 'calendar';
        this.overlay = this.add.container(0, 0).setDepth(1200);
        const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x04030b, 0.48)
            .setInteractive();
        const panel = this.add.rectangle(790, 338, 820, 470, 0x17122d, 0.98)
            .setStrokeStyle(3, 0xffd36e, 0.72);
        const title = this.add.text(790, 128, `반납예정일 선택 · 현재 3월 ${GameState.get('stage8CurrentDay')}일`, {
            fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '23px', color: '#fff5c7'
        }).setOrigin(0.5);
        const hint = this.add.text(790, 162, this.getCalendarHint(), {
            fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '14px', color: '#c9ffef'
        }).setOrigin(0.5);
        this.overlay.add([shade, panel, title, hint]);

        for (let day = 1; day <= 31; day += 1) {
            const col = (day - 1) % 7;
            const row = Math.floor((day - 1) / 7);
            const x = 495 + col * 98;
            const y = 215 + row * 62;
            const past = day < GameState.get('stage8CurrentDay');
            const button = this.add.rectangle(x, y, 80, 44, past ? 0x1a1724 : 0x34244d, past ? 0.55 : 0.96)
                .setStrokeStyle(2, past ? 0x5e586b : 0x8bd6ff, past ? 0.25 : 0.52)
                .setInteractive({ useHandCursor: true });
            const label = this.add.text(x, y, `${day}일`, {
                fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '16px', color: past ? '#77717f' : '#ffffff'
            }).setOrigin(0.5);
            if (!past) {
                button.on('pointerover', () => button.setFillStyle(0x5c3d7d, 1));
                button.on('pointerout', () => button.setFillStyle(0x34244d, 0.96));
                button.on('pointerdown', () => this.selectReturnDay(day));
            }
            this.overlay.add([button, label]);
        }
        this.addOverlayCloseButton(1080, 520);
    }

    getCalendarHint() {
        const day = GameState.get('stage8CurrentDay');
        if (day <= 24) return '고지서 발급 요청일과 반납일자 사이에 5일 이상 여유를 두세요.';
        if (day <= 28) return '마감 임박: 반납일까지 최소 이틀의 여유를 확보하세요.';
        return '최후 구간: 3월 31일 반납만 가능합니다.';
    }

    selectReturnDay(selectedDay) {
        const currentDay = GameState.get('stage8CurrentDay');
        let valid = false;
        let successLines = [];
        let failureLines = [];

        if (currentDay <= 24) {
            valid = selectedDay >= currentDay + 5 && selectedDay <= 31;
            successLines = [{ speaker: 'KCA 간사', text: '좋습니다. 고지서 발급 요청일과 반납일자 사이에 5일 이상 여유가 확보되었습니다.' }];
            failureLines = [
                { speaker: 'KCA 간사', text: '고지서 발급 요청일과 반납일자 사이에는 5일 정도의 여유가 필요합니다.' },
                { speaker: 'KCA 간사', text: '반납예정일을 다시 선택해 주세요.' }
            ];
        } else if (currentDay <= 28) {
            valid = selectedDay >= currentDay + 2 && selectedDay <= 31;
            successLines = [
                { speaker: 'KCA 간사', text: '마감이 임박했습니다.' },
                { speaker: 'KCA 간사', text: '이틀 이상 여유를 확보했으니, 바로 은행에 추가반납이자를 확인해 주세요.' }
            ];
            failureLines = [
                { speaker: 'KCA 간사', text: '그래도 이틀은 주셔야죠!' },
                { speaker: 'KCA 간사', text: '반납예정일을 다시 선택해 주세요.' }
            ];
        } else {
            valid = selectedDay === 31;
            successLines = [
                { speaker: 'KCA 간사', text: '정말 아슬아슬합니다.' },
                { speaker: 'KCA 간사', text: 'KCA에 사전에 상황을 설명하고, 바로 고지서 발급 요청을 진행해야겠어요.' }
            ];
            failureLines = [
                { speaker: 'KCA 간사', text: '지금은 3월 31일 반납으로 진행해야 합니다!' },
                { speaker: 'KCA 간사', text: '다른 날짜를 선택할 시간이 없습니다.' }
            ];
        }

        this.closeOverlay();
        if (!valid) {
            this.applyBossPenalty();
            if (!GameState.get('stage8GameOver')) this.dialogue.say(failureLines);
            return;
        }

        GameState.set('stage8ReturnDateSelected', true);
        GameState.set('stage8SelectedReturnDay', selectedDay);
        GameState.set('stage8AdditionalInterestChecked', false);
        GameState.set('stage8NoticeApproved', false);
        GameState.set('stage8ReturnNoticeReceived', false);
        this.refreshStageUi();
        this.dialogue.say(successLines);
    }

    checkAdditionalInterest() {
        if (!GameState.get('stage8ReturnDateSelected')) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '먼저 반납예정일을 정해야 추가반납이자를 확인할 수 있습니다.' }]);
            return;
        }
        if (GameState.get('stage8AdditionalInterestChecked')) {
            this.dialogue.say([{ speaker: '은행', text: '추가반납이자는 3,200원으로 확인되었습니다.' }]);
            return;
        }

        GameState.set('stage8AdditionalInterestChecked', true);
        GameState.set('stage8AdditionalInterest', SETTLEMENT.additionalInterest);
        this.refreshStageUi();
        this.cameras.main.flash(140, 117, 246, 255, false);
        this.dialogue.say([
            { speaker: '은행', text: `선택하신 3월 ${GameState.get('stage8SelectedReturnDay')}일 기준 추가반납이자는 3,200원입니다.` },
            { speaker: 'KCA 간사', text: '추가반납이자는 반납예정일에 맞춰 은행에 확인해야 합니다.' },
            { speaker: 'KCA 간사', text: '이 금액을 고지서 발급 요청 공문에 넣어 주세요.' }
        ]);
    }

    handleGateInteraction() {
        if (GameState.get('stage8ReturnNoticeReceived')) {
            this.openPaymentConfirmation();
            return;
        }
        if (!GameState.get('stage8ReturnDateSelected')) {
            this.dialogue.say([{ speaker: 'KCA 간사', text: '먼저 반납예정일을 정해야 합니다.' }]);
            return;
        }
        if (!GameState.get('stage8AdditionalInterestChecked')) {
            this.dialogue.say([
                { speaker: 'KCA 간사', text: '추가반납이자는 은행에 확인해야 합니다.' },
                { speaker: 'KCA 간사', text: '은행 전화기로 먼저 확인해 주세요.' }
            ]);
            return;
        }
        this.openNoticeForm();
    }

    openNoticeForm() {
        this.closeOverlay();
        this.mode = 'notice';
        this.noticeSelections = {};
        this.overlay = this.add.container(0, 0).setDepth(1200);
        const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x04030b, 0.52)
            .setInteractive();
        const panel = this.add.rectangle(800, 335, 870, 500, 0x17122d, 0.98)
            .setStrokeStyle(3, 0x75f6ff, 0.65);
        const title = this.add.text(800, 103, '반납내역확인서 및 고지서 발급 요청', {
            fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '23px', color: '#fff5c7'
        }).setOrigin(0.5);
        this.noticeFeedbackText = this.add.text(800, 507, '정산결과와 은행 확인 금액에 맞는 항목을 선택하세요.', {
            fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '14px', color: '#c9ffef', align: 'center'
        }).setOrigin(0.5);
        this.overlay.add([shade, panel, title, this.noticeFeedbackText]);

        const selectedDay = GameState.get('stage8SelectedReturnDay');
        const dayAlternatives = [selectedDay, selectedDay === 31 ? 30 : selectedDay + 1, Math.max(1, selectedDay - 1)];
        const rows = [
            { key: 'balance', label: '정산잔액', correct: SETTLEMENT.balance, options: [SETTLEMENT.balance, 2521380, 2512830], format: formatWon },
            { key: 'interest', label: '발생이자', correct: SETTLEMENT.interest, options: [SETTLEMENT.interest, 3200, 12710], format: formatWon },
            { key: 'additional', label: '추가반납이자', correct: SETTLEMENT.additionalInterest, options: [SETTLEMENT.additionalInterest, 9510, 0], format: formatWon },
            { key: 'returnDay', label: '반납예정일', correct: selectedDay, options: dayAlternatives, format: (value) => `3월 ${value}일` },
            { key: 'total', label: '총 반납금액', correct: SETTLEMENT.total, options: [SETTLEMENT.total, 2521890, 2515580], format: formatWon }
        ];

        rows.forEach((row, rowIndex) => {
            const y = 160 + rowIndex * 66;
            const rowLabel = this.add.text(405, y, row.label, {
                fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '15px', color: '#d9c8ff'
            }).setOrigin(0, 0.5);
            this.overlay.add(rowLabel);
            const options = Phaser.Utils.Array.Shuffle([...new Set(row.options)]);
            options.forEach((value, optionIndex) => {
                const x = 635 + optionIndex * 190;
                const button = this.add.rectangle(x, y, 174, 44, 0x302047, 0.96)
                    .setStrokeStyle(2, 0x8b60e8, 0.5)
                    .setInteractive({ useHandCursor: true });
                const text = this.add.text(x, y, row.format(value), {
                    fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '13px', color: '#ffffff'
                }).setOrigin(0.5);
                button.on('pointerdown', () => {
                    this.noticeSelections[row.key] = value;
                    row.buttons.forEach((node) => node.setFillStyle(0x302047, 0.96).setStrokeStyle(2, 0x8b60e8, 0.5));
                    button.setFillStyle(0x285965, 1).setStrokeStyle(3, 0x75f6ff, 0.9);
                });
                row.buttons ??= [];
                row.buttons.push(button);
                this.overlay.add([button, text]);
            });
        });

        this.createOverlayButton(935, 552, 190, 48, '공문 검토 요청', () => this.submitNoticeForm());
        this.addOverlayCloseButton(1125, 552);
    }

    submitNoticeForm() {
        const requiredKeys = ['balance', 'interest', 'additional', 'returnDay', 'total'];
        if (requiredKeys.some((key) => this.noticeSelections[key] === undefined)) {
            this.noticeFeedbackText.setText('모든 항목을 선택해야 합니다.').setColor('#ffd36e');
            return;
        }

        const checks = [
            ['balance', SETTLEMENT.balance, '정산잔액이 맞지 않습니다. 정산결과에 표시된 금액을 다시 확인해 주세요.'],
            ['interest', SETTLEMENT.interest, '발생이자는 정산결과에 이미 표시된 이자입니다. 추가반납이자와 혼동하지 마세요.'],
            ['additional', SETTLEMENT.additionalInterest, '추가반납이자는 은행에서 확인한 금액을 입력해야 합니다.'],
            ['returnDay', GameState.get('stage8SelectedReturnDay'), '공문에 적은 반납예정일이 달력에서 선택한 날짜와 다릅니다.'],
            ['total', SETTLEMENT.total, '총 반납금액이 맞지 않습니다. 정산잔액, 발생이자, 추가반납이자를 모두 합산해야 합니다.']
        ];
        const failed = checks.find(([key, correct]) => this.noticeSelections[key] !== correct);
        if (failed) {
            this.noticeFeedbackText.setText(`간사: ${failed[2]}`).setColor('#ffb0be');
            this.applyBossPenalty();
            return;
        }

        GameState.set('stage8NoticeApproved', true);
        GameState.set('stage8ReturnNoticeReceived', true);
        this.closeOverlay();
        this.activateReturnGate();
        this.dialogue.say([
            { speaker: 'KCA 간사', text: '좋습니다. 반납내역확인서와 고지서 발급 요청 공문을 보낼 수 있겠습니다.' },
            { speaker: 'PIMS WORLD', text: '고지서가 발급되었습니다.' },
            { speaker: 'PIMS WORLD', text: `반납예정일: 3월 ${GameState.get('stage8SelectedReturnDay')}일 · 총 반납금액: ${formatWon(SETTLEMENT.total)}` }
        ]);
    }

    activateReturnGate() {
        this.gateObject.name = '정산금 반납 포털';
        this.gateObject.label?.setText('정산금 반납 포털');
        this.gateObject.prompt = 'SPACE : 정산금 최종 반납';
        this.gateGlow.setAlpha(0.2).setStrokeStyle(4, 0xffd36e, 0.85);
        this.tweens.add({
            targets: this.gateGlow,
            alpha: { from: 0.14, to: 0.36 },
            duration: 650,
            yoyo: true,
            repeat: -1
        });
    }

    openPaymentConfirmation() {
        this.closeOverlay();
        this.mode = 'payment';
        this.overlay = this.add.container(0, 0).setDepth(1200);
        const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x04030b, 0.58)
            .setInteractive();
        const panel = this.add.rectangle(790, 330, 650, 310, 0x17122d, 0.98)
            .setStrokeStyle(3, 0xffd36e, 0.75);
        const title = this.add.text(790, 225, '정산금 최종 반납', {
            fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '26px', color: '#fff5c7'
        }).setOrigin(0.5);
        const body = this.add.text(790, 310,
            `반납예정일: 3월 ${GameState.get('stage8SelectedReturnDay')}일\n총 반납금액: ${formatWon(SETTLEMENT.total)}\n\n고지서에 따라 정산금을 반납하시겠습니까?`, {
                fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '17px', color: '#f8f3ff', align: 'center', lineSpacing: 9
            }).setOrigin(0.5);
        this.overlay.add([shade, panel, title, body]);
        this.createOverlayButton(700, 430, 170, 50, '반납 처리', () => this.completePayment());
        this.createOverlayButton(890, 430, 150, 50, '취소', () => this.closeOverlay());
    }

    completePayment() {
        if (GameState.get('stage8CurrentDay') > 31 || GameState.get('stage8GameOver')) return;
        GameState.set('stage8PaymentCompleted', true);
        GameState.set('timeRunning', false);
        this.dayTimer?.remove(false);
        this.closeOverlay();
        this.transitionLocked = true;
        this.cameras.main.flash(300, 255, 222, 132, false);
        this.dialogue.say([
            { speaker: 'PIMS WORLD', text: `정산금 반납이 완료되었습니다. 총 반납금액 ${formatWon(SETTLEMENT.total)}이 정상 반납 처리되었습니다.` },
            { speaker: 'KCA 간사', text: '정산잔액, 발생이자, 추가반납이자, 반납일자까지 모두 확인되었습니다.' },
            { speaker: 'KCA 간사', text: '이제 정말 마지막입니다.' },
            { speaker: '본부장님', text: '...기한 내 처리했군요.' },
            { speaker: '본부장님', text: '퇴근하세요.' }
        ], () => this.showEnding());
    }

    showEnding() {
        const ending = this.add.container(0, 0).setDepth(2000);
        const shade = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x05040d, 0.94);
        const glow = this.add.circle(GAME_WIDTH / 2, 270, 118, 0xffd36e, 0.11)
            .setStrokeStyle(3, 0xffd36e, 0.45);
        const title = this.add.text(GAME_WIDTH / 2, 220, 'PIMS WORLD CLEAR', {
            fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '43px', color: '#fff5c7', stroke: '#4a2870', strokeThickness: 7
        }).setOrigin(0.5);
        const subtitle = this.add.text(GAME_WIDTH / 2, 300, '8단계 반납의 계곡 완료', {
            fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '24px', color: '#c9ffef'
        }).setOrigin(0.5);
        const body = this.add.text(GAME_WIDTH / 2, 375, '3월 31일 기한 내 정산금 반납을 완료했습니다.\n김대리님의 PIMS WORLD 업무 여정이 끝났습니다.', {
            fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '18px', color: '#f8f3ff', align: 'center', lineSpacing: 10
        }).setOrigin(0.5);
        ending.add([shade, glow, title, subtitle, body]);
        const button = this.createStandaloneButton(GAME_WIDTH / 2, 500, 220, 56, '처음으로 돌아가기', () => {
            GameState.reset();
            this.scene.start('StartScene');
        }, 2001);
        ending.add(button.nodes);
        this.tweens.add({ targets: glow, scale: { from: 0.92, to: 1.12 }, alpha: { from: 0.08, to: 0.2 }, duration: 1000, yoyo: true, repeat: -1 });
    }

    applyBossPenalty() {
        if (GameState.get('stage8GameOver')) return;
        GameState.set('stage8WrongCount', (GameState.get('stage8WrongCount') ?? 0) + 1);
        GameState.set('stage8BossPenaltyLevel', (GameState.get('stage8BossPenaltyLevel') ?? 0) + 1);
        this.cameras.main.shake(190, 0.006);
        const thump = this.add.text(245, 325, '쿵...', {
            fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '32px', color: '#d9c8ff', stroke: '#08060d', strokeThickness: 6
        }).setOrigin(0.5).setDepth(1500).setAlpha(0);
        this.tweens.add({
            targets: thump,
            alpha: { from: 0, to: 1 },
            scale: { from: 1.3, to: 1 },
            duration: 220,
            yoyo: true,
            hold: 260,
            onComplete: () => thump.destroy()
        });
        this.refreshBossApproach(true);
    }

    getDateBossLevel(day = GameState.get('stage8CurrentDay')) {
        if (day <= 10) return 0;
        if (day <= 20) return 1;
        if (day <= 24) return 2;
        if (day <= 28) return 3;
        return 4;
    }

    refreshBossApproach(animate) {
        const dateLevel = this.getDateBossLevel();
        const penalty = GameState.get('stage8BossPenaltyLevel') ?? 0;
        const total = Math.min(MAX_BOSS_APPROACH, dateLevel + penalty);
        GameState.set('stage8BossApproachLevel', total);
        this.bossStatusText?.setText(`본부장님 접근도 ${total} / ${MAX_BOSS_APPROACH}`);
        this.bossStatusText?.setColor(total >= 4 ? '#ffb0be' : '#d9c8ff');

        const targetX = -70 + total * 72;
        const targetScale = 0.72 + total * 0.1;
        const targetAlpha = 0.4 + total * 0.1;
        if (animate) {
            this.tweens.add({
                targets: this.bossContainer,
                x: targetX,
                scale: targetScale,
                alpha: targetAlpha,
                duration: 520,
                ease: 'Cubic.easeOut'
            });
        } else {
            this.bossContainer.setX(targetX).setScale(targetScale).setAlpha(targetAlpha);
        }
        this.bossEyes?.setAlpha(total >= 4 ? 0.8 : 0.18 + total * 0.1);

        if (total >= MAX_BOSS_APPROACH) {
            this.failStage('본부장님: “보고가 늦었군요.”\n\n간사: “...다시 처음부터 정리하셔야겠습니다.”');
        }
    }

    failStage(reason) {
        if (GameState.get('stage8GameOver') || GameState.get('stage8PaymentCompleted')) return;
        GameState.set('stage8GameOver', true);
        GameState.set('timeRunning', false);
        GameState.set('gameOverReason', reason);
        GameState.set('gameOverRestartScene', 'Stage8Scene');
        this.transitionLocked = true;
        this.dayTimer?.remove(false);
        this.closeOverlay();
        this.cameras.main.fadeOut(620, 18, 5, 24);
        this.time.delayedCall(650, () => this.scene.start('GameOverScene'));
    }

    refreshStageUi() {
        const day = GameState.get('stage8CurrentDay') ?? 1;
        this.dayText?.setText(`현재 날짜: 3월 ${day}일`);
        this.dayText?.setColor(day >= 29 ? '#ffb0be' : day >= 25 ? '#ffd36e' : '#c9ffef');
        this.refreshResultPanel();
        this.refreshPrompts();
    }

    refreshPrompts() {
        if (!this.calendarObject) return;
        this.calendarObject.prompt = GameState.get('stage8ReturnDateSelected')
            ? `SPACE : 반납예정일 확인 (3월 ${GameState.get('stage8SelectedReturnDay')}일)`
            : 'SPACE : 반납예정일 선택';
        this.bankObject.prompt = GameState.get('stage8AdditionalInterestChecked')
            ? '추가반납이자 확인 완료'
            : 'SPACE : 추가반납이자 확인';
        this.gateObject.prompt = GameState.get('stage8ReturnNoticeReceived')
            ? 'SPACE : 정산금 최종 반납'
            : 'SPACE : 고지서 발급 요청 공문 작성';
    }

    createOverlayButton(x, y, width, height, label, onClick) {
        const button = this.add.rectangle(x, y, width, height, 0x3a285c, 0.98)
            .setStrokeStyle(2, 0xffd36e, 0.72)
            .setInteractive({ useHandCursor: true });
        const text = this.add.text(x, y, label, {
            fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '15px', color: '#ffffff'
        }).setOrigin(0.5);
        button.on('pointerover', () => button.setFillStyle(0x6650a4, 1));
        button.on('pointerout', () => button.setFillStyle(0x3a285c, 0.98));
        button.on('pointerdown', () => onClick?.());
        this.overlay.add([button, text]);
        return { button, text };
    }

    addOverlayCloseButton(x, y) {
        this.createOverlayButton(x, y, 132, 46, '닫기', () => this.closeOverlay());
    }

    createStandaloneButton(x, y, width, height, label, onClick, depth) {
        const button = this.add.rectangle(x, y, width, height, 0x3a285c, 0.98)
            .setStrokeStyle(2, 0xffd36e, 0.8)
            .setDepth(depth)
            .setInteractive({ useHandCursor: true });
        const text = this.add.text(x, y, label, {
            fontFamily: 'GALMURI, Arial, sans-serif', fontSize: '17px', color: '#ffffff'
        }).setOrigin(0.5).setDepth(depth + 1);
        button.on('pointerover', () => button.setFillStyle(0x6650a4, 1));
        button.on('pointerout', () => button.setFillStyle(0x3a285c, 0.98));
        button.on('pointerdown', () => onClick?.());
        return { nodes: [button, text] };
    }

    closeOverlay() {
        this.overlay?.destroy(true);
        this.overlay = null;
        if (!this.transitionLocked) this.mode = 'field';
    }

    cleanup() {
        this.dayTimer?.remove(false);
        this.spaceKey?.off('down', this.onSpaceDown);
        this.enterKey?.off('down', this.onEnterDown);
        this.input.off('pointerdown', this.onPointerDown);
        this.interactables.forEach((item) => item.destroy?.());
        this.interactables = [];
        this.overlay?.destroy(true);
    }
}
