import * as Phaser from 'phaser';

export class InteractionManager {
    constructor(scene, player, interactables, promptText) {
        this.scene = scene;
        this.player = player;
        this.interactables = interactables;
        this.promptText = promptText;
        this.current = null;
        this.range = 58;
    }

    update(blocked) {
        if (blocked) {
            this.current = null;
            this.promptText.setText('');
            return;
        }

        let closest = null;
        let closestDistance = Number.MAX_SAFE_INTEGER;
        this.interactables.forEach((item) => {
            const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
            if (distance < this.range && distance < closestDistance) {
                closest = item;
                closestDistance = distance;
            }
        });

        this.current = closest;
        this.promptText.setText(closest ? closest.prompt : '');
    }

    interact() {
        if (this.current?.onInteract) {
            this.current.onInteract(this.current);
        }
    }
}
