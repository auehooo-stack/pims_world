import * as Phaser from 'phaser';

export class InteractionManager {
    constructor(scene, player, interactables, promptTarget) {
        this.scene = scene;
        this.player = player;
        this.interactables = interactables;
        this.promptTarget = promptTarget;
        this.current = null;
        this.range = 72;
    }

    update(blocked) {
        if (blocked) {
            this.current = null;
            this.interactables.forEach((item) => item.setInteractionFocus?.(false));
            this.setPrompt('');
            return;
        }

        let closest = null;
        let closestDistance = Number.MAX_SAFE_INTEGER;
        this.interactables.forEach((item) => {
            if (item?.available === false) {
                return;
            }
            const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, item.x, item.y);
            if (distance < this.range && distance < closestDistance) {
                closest = item;
                closestDistance = distance;
            }
        });

        this.current = closest;
        this.interactables.forEach((item) => item.setInteractionFocus?.(item === closest));
        this.setPrompt(closest ? closest.prompt : '');
    }

    interact() {
        if (this.current?.onInteract) {
            this.current.onInteract(this.current);
        }
    }

    setPrompt(prompt) {
        if (typeof this.promptTarget === 'function') {
            this.promptTarget(prompt);
            return;
        }
        this.promptTarget?.setText(prompt);
    }
}
