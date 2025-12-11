// Keyboard event handlers for tracking key presses
// Only tracks special keys - regular typing is captured by form change events
import { getPlaywrightSelector } from '../../../util/playwright_selector.js';

const SPECIAL_KEYS = ['Enter', 'Tab', 'Escape', 'Backspace', 'Delete'];
const NAVIGATION_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];

export class KeyboardEventTracker {
    constructor(sendMessage, getXpaths) {
        this.sendMessage = sendMessage;
        this.getXpaths = getXpaths;
    }

    init() {
        document.addEventListener('keydown', this.handleKeyDown.bind(this), true);
    }

    handleKeyDown(event) {
        const key = event.key;
        const isSpecialKey = SPECIAL_KEYS.includes(key);
        const isNavigation = NAVIGATION_KEYS.includes(key);
        const isShortcut = (event.ctrlKey || event.metaKey) && key.length === 1;

        // Only track special keys, navigation, or shortcuts
        if (!isSpecialKey && !isNavigation && !isShortcut) {
            return;
        }

        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                console.log(`⌨️ Key pressed: ${key} (special: ${isSpecialKey}, nav: ${isNavigation}, shortcut: ${isShortcut})`);

                // Build key combo string for shortcuts
                let keyCombo = null;
                if (isShortcut) {
                    const modifiers = [];
                    if (event.ctrlKey) modifiers.push('Ctrl');
                    if (event.metaKey) modifiers.push('Cmd');
                    if (event.altKey) modifiers.push('Alt');
                    if (event.shiftKey) modifiers.push('Shift');
                    modifiers.push(key.toUpperCase());
                    keyCombo = modifiers.join('+');
                }

                this.sendMessage({
                    message: "onKeyDown",
                    xPath: this.getXpaths(event.target),
                    key: key,
                    keyCombo: keyCombo,
                    isSpecialKey: isSpecialKey,
                    isNavigation: isNavigation,
                    isShortcut: isShortcut,
                    locator: getPlaywrightSelector(event.target),
                    target: {
                        tagName: event.target.tagName,
                        type: event.target.type || null
                    }
                });
            }
        });
    }
}
