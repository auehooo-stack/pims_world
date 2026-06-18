import * as Phaser from 'phaser';

export class InteractionManager {
    constructor(scene, player, interactables, promptTarget) {
        this.scene = scene;
        this.player = player;
        this.interactables = interactables;
        this.promptTarget = promptTarget;
        this.current = null;
        this.range = 132;
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
            const halfWidth = (item?.config?.width ?? 0) / 2;
            const halfHeight = (item?.config?.height ?? 0) / 2;
            const dx = Math.max(Math.abs(this.player.x - item.x) - halfWidth, 0);
            const dy = Math.max(Math.abs(this.player.y - item.y) - halfHeight, 0);
            const distance = Math.hypot(dx, dy);
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
