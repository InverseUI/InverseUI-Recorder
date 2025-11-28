// Main behavior tracking module that combines all event trackers
import { MouseEventTracker } from './mouse_actions.js';
import { KeyboardEventTracker } from './keyboard_actions.js';
import { FormEventTracker } from './form_actions.js';
import { ElementAssertions } from '../../util/dom_utils.js';
import { ClipboardEventTracker } from './clipboard_actions.js';
import { WindowEventTracker } from './window_actions.js';
import { initializeDropdownDetection } from './dropdown_detection.js';

export class ActionTracker {
    constructor(sendMessage, getXpaths) {
        this.sendMessage = sendMessage;
        this.getXpaths = getXpaths;

        // Initialize all trackers
        this.trackers = {
            mouse: new MouseEventTracker(sendMessage, getXpaths),
            keyboard: new KeyboardEventTracker(sendMessage, getXpaths),
            form: new FormEventTracker(sendMessage, getXpaths),
            assertions: new ElementAssertions(sendMessage, getXpaths),
            clipboard: new ClipboardEventTracker(sendMessage, getXpaths),
            window: new WindowEventTracker(sendMessage, getXpaths)
        };

        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        // Initialize all event trackers
        Object.values(this.trackers).forEach(tracker => {
            if (tracker.init) {
                console.log('🔧 Initializing tracker:', tracker.constructor.name);
                tracker.init();
            }
        });

        this.initialized = true;
        console.log('✅ InverseUI: All behavior trackers initialized');
    }

    // Expose assertion methods for direct access
    assertElement(xpath, assertion) {
        return this.trackers.assertions.assertElement(xpath, assertion);
    }

    getElementValue(xpath) {
        return this.trackers.assertions.getElementValue(xpath);
    }

    getElementProperties(xpath) {
        return this.trackers.assertions.getElementProperties(xpath);
    }

    waitForElement(xpath, timeout) {
        return this.trackers.assertions.waitForElement(xpath, timeout);
    }

    // Get specific tracker if needed
    getTracker(name) {
        return this.trackers[name];
    }

}

/**
 * Initialize comprehensive action tracking system
 */
export async function initializeActionTracking(sendMessage, getXpaths) {
    try {
        console.log('🎯 Initializing comprehensive action tracking...');

        // Initialize reactive dropdown detection system
        const dropdownDetector = initializeDropdownDetection(sendMessage, getXpaths);
        console.log('✅ Reactive dropdown detection initialized');

        // Create and initialize the action tracker
        const actionTracker = new ActionTracker(sendMessage, getXpaths);

        // Wire dropdown detector to mouse and form trackers
        // - Mouse tracker uses it for reactive detection on clicks
        // - Form tracker uses it to record input interactions for correlation
        actionTracker.trackers.mouse.setDropdownDetector(dropdownDetector);
        actionTracker.trackers.form.setDropdownDetector(dropdownDetector);
        console.log('✅ Dropdown detection wired to event trackers');

        // Initialize all trackers
        actionTracker.init();

        console.log('InverseUI: Comprehensive action tracking initialized with reactive dropdown detection');
        return actionTracker;
    } catch (error) {
        console.error('Failed to initialize action tracking:', error);
        throw error;
    }
}
