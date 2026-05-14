export class InteractableObject {
    constructor(scene, config, onInteract) {
        this.id = config.id;
        this.name = config.name;
        this.prompt = config.prompt;
        this.x = config.x;
        this.y = config.y;
        this.onInteract = onInteract;

        this.container = scene.add.container(config.x, config.y);
        this.body = scene.add.rectangle(0, 0, config.width, config.height, config.color)
            .setStrokeStyle(2, 0xffffff, 0.35);
        this.label = scene.add.text(0, -config.height / 2 - 14, config.name, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '11px',
            color: '#f6f0ff',
            backgroundColor: '#120c22'
        }).setOrigin(0.5);
        this.container.add([this.body, this.label]);
    }
}
