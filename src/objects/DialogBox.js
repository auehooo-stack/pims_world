import * as Phaser from 'phaser';

const TEXT_STYLE = {
    fontFamily: 'Arial, sans-serif',
    fontSize: '15px',
    color: '#f8f3ff',
    wordWrap: { width: 568 },
    lineSpacing: 4
};

export class DialogBox {
    constructor(scene) {
        this.scene = scene;
        this.active = false;
        this.lines = [];
        this.lineIndex = 0;
        this.onComplete = null;
        this.choiceCallbacks = [];

        this.container = scene.add.container(0, 0).setDepth(1000).setVisible(false);
        this.backdrop = scene.add.rectangle(320, 304, 610, 96, 0x05050a, 0.88)
            .setStrokeStyle(2, 0x765dff, 0.8);
        this.speakerText = scene.add.text(28, 263, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#ffd36e'
        });
        this.bodyText = scene.add.text(28, 284, '', TEXT_STYLE);
        this.hintText = scene.add.text(612, 340, 'Space/Enter', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '10px',
            color: '#9aa0c8'
        }).setOrigin(1, 0.5);
        this.choiceTexts = [];

        this.container.add([this.backdrop, this.speakerText, this.bodyText, this.hintText]);
        this.spaceKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.enterKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        this.oneKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
        this.twoKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);

        this.spaceHandler = () => this.advance();
        this.enterHandler = () => this.advance();
        this.oneHandler = () => this.choose(0);
        this.twoHandler = () => this.choose(1);
        this.spaceKey.on('down', this.spaceHandler);
        this.enterKey.on('down', this.enterHandler);
        this.oneKey.on('down', this.oneHandler);
        this.twoKey.on('down', this.twoHandler);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    }

    showLines(lines, onComplete = null) {
        this.clearChoices();
        this.active = true;
        this.lines = lines;
        this.lineIndex = 0;
        this.onComplete = onComplete;
        this.container.setVisible(true);
        this.renderLine();
    }

    showChoice({ speaker, text, choices }, onChoice) {
        this.active = true;
        this.lines = [];
        this.onComplete = null;
        this.container.setVisible(true);
        this.speakerText.setText(speaker || '');
        this.bodyText.setText(text);
        this.hintText.setText('1/2 or Click');
        this.clearChoices();

        choices.forEach((choice, index) => {
            const choiceText = this.scene.add.text(42, 318 + index * 20, `${index + 1}. ${choice.label}`, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '13px',
                color: '#c9ffef',
                wordWrap: { width: 545 }
            }).setInteractive({ useHandCursor: true });
            choiceText.on('pointerdown', () => this.choose(index));
            this.container.add(choiceText);
            this.choiceTexts.push(choiceText);
            this.choiceCallbacks[index] = () => onChoice(choice, index);
        });
    }

    renderLine() {
        const line = this.lines[this.lineIndex];
        if (!line) {
            this.close();
            return;
        }
        this.speakerText.setText(line.speaker || '');
        this.bodyText.setText(line.text || '');
        this.hintText.setText('Space/Enter');
    }

    advance() {
        if (!this.active || this.choiceCallbacks.length > 0) {
            return;
        }
        this.lineIndex += 1;
        if (this.lineIndex >= this.lines.length) {
            this.close();
            return;
        }
        this.renderLine();
    }

    choose(index) {
        if (!this.active || !this.choiceCallbacks[index]) {
            return;
        }
        const callback = this.choiceCallbacks[index];
        this.close();
        callback();
    }

    close() {
        const complete = this.onComplete;
        this.active = false;
        this.onComplete = null;
        this.lines = [];
        this.lineIndex = 0;
        this.clearChoices();
        this.container.setVisible(false);
        if (complete) {
            complete();
        }
    }

    clearChoices() {
        this.choiceCallbacks = [];
        this.choiceTexts.forEach((choiceText) => choiceText.destroy());
        this.choiceTexts = [];
    }

    destroy() {
        this.spaceKey?.off('down', this.spaceHandler);
        this.enterKey?.off('down', this.enterHandler);
        this.oneKey?.off('down', this.oneHandler);
        this.twoKey?.off('down', this.twoHandler);
        this.container?.destroy(true);
    }
}
