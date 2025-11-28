// Keyboard event handlers for tracking key presses
export class KeyboardEventTracker {
    constructor(sendMessage, getXpaths) {
        this.sendMessage = sendMessage;
        this.getXpaths = getXpaths;
    }

    init() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
    }

    handleKeyDown(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                console.log(`Key pressed: ${event.key}`);

                this.sendMessage({
                    message: "onKeyDown",
                    xPath: this.getXpaths(event.target),
                    key: event.key
                });
            }
        });
    }
}
