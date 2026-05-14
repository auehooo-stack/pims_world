import { DialogBox } from '../objects/DialogBox.js';

export class DialogueManager {
    constructor(scene) {
        this.dialogBox = new DialogBox(scene);
    }

    get isActive() {
        return this.dialogBox.active;
    }

    say(lines, onComplete) {
        this.dialogBox.showLines(lines, onComplete);
    }

    choose(dialogue, onChoice) {
        this.dialogBox.showChoice(dialogue, onChoice);
    }
}
