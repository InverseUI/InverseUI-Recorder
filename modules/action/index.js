// Main behavior tracking module that combines all event trackers
import {
    ClickEventTracker,
    InputEventTracker,
    KeyboardEventTracker,
    WindowEventTracker,
    initializeNavigationTracking
} from './events/index.js';
import {
    initializeDropdownDetection,
    initializeFileUploadDetection,
    initializeChoiceDetection,
    initializeRadioDetection
} from './context/index.js';
import { ElementAssertions } from '../../util/dom_utils.js';

export class ActionTracker {
    constructor(sendMessage, getXpaths) {
        this.sendMessage = sendMessage;
        this.getXpaths = getXpaths;

        // Initialize all trackers
        this.trackers = {
            click: new ClickEventTracker(sendMessage, getXpaths),
            keyboard: new KeyboardEventTracker(sendMessage, getXpaths),
            input: new InputEventTracker(sendMessage, getXpaths),
            assertions: new ElementAssertions(sendMessage, getXpaths),
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

        // Wire dropdown detector to click and input trackers
        // - Click tracker uses it for reactive detection on clicks
        // - Input tracker uses it to record input interactions for correlation
        actionTracker.trackers.click.setDropdownDetector(dropdownDetector);
        actionTracker.trackers.input.setDropdownDetector(dropdownDetector);
        console.log('✅ Dropdown detection wired to event trackers');

        // Initialize file upload detection
        const fileUploadDetector = initializeFileUploadDetection(getXpaths);
        actionTracker.trackers.click.setFileUploadDetector(fileUploadDetector);
        console.log('✅ File upload detection wired to click tracker');

        // Initialize choice detection for Yes/No button groups
        const choiceDetector = initializeChoiceDetection(getXpaths);
        actionTracker.trackers.click.setChoiceDetector(choiceDetector);
        console.log('✅ Choice detection wired to click tracker');

        // Initialize radio/checkbox detection
        const radioDetector = initializeRadioDetection(getXpaths);
        actionTracker.trackers.click.setRadioDetector(radioDetector);
        console.log('✅ Radio detection wired to click tracker');

        // Initialize navigation tracking for cross-page URL context
        initializeNavigationTracking(sendMessage);
        console.log('✅ Navigation tracking initialized');

        // Initialize all trackers
        actionTracker.init();

        console.log('InverseUI: Comprehensive action tracking initialized with reactive dropdown detection');
        return actionTracker;
    } catch (error) {
        console.error('Failed to initialize action tracking:', error);
        throw error;
    }
}
