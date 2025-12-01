// Click event handlers for comprehensive tracking
import { getLabelForElement } from '../../../util/dom_utils.js';
import { ariaSnapshotGenerator } from '../context/aria_snapshot.js';

export class ClickEventTracker {
    constructor(sendMessage, getXpaths) {
        this.sendMessage = sendMessage;
        this.getXpaths = getXpaths;
        this.dropdownDetector = null;
        this.fileUploadDetector = null;
        this.choiceDetector = null;
        this.radioDetector = null;
    }

    /**
     * Set the dropdown detector for reactive detection on clicks
     */
    setDropdownDetector(detector) {
        this.dropdownDetector = detector;
    }

    /**
     * Set the file upload detector for file input detection
     */
    setFileUploadDetector(detector) {
        this.fileUploadDetector = detector;
    }

    /**
     * Set the choice detector for Yes/No button group detection
     */
    setChoiceDetector(detector) {
        this.choiceDetector = detector;
    }

    /**
     * Set the radio detector for native radio/checkbox detection
     */
    setRadioDetector(detector) {
        this.radioDetector = detector;
    }

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /**
     * Promise version of sendMessage for async/await usage
     */
    sendMessageAsync(msg) {
        return new Promise(resolve => {
            this.sendMessage(msg, resolve);
        });
    }

    /**
     * Capture screenshot via background script
     */
    async captureScreenshot() {
        try {
            const response = await this.sendMessageAsync({ message: "captureScreenshot" });
            return response?.screenshot || null;
        } catch (error) {
            console.error('Screenshot capture failed:', error);
            return null;
        }
    }

    init() {
        // Click events - only handle left click
        document.addEventListener('click', this.handleClick.bind(this), true);
    }

    /**
     * Resolve SVG elements to their nearest interactive parent
     * When clicking on SVG/path/etc., find the button/anchor that contains it
     */
    resolveClickTarget(element) {
        if (!element) return element;

        // Check if element is SVG or inside SVG
        const isSvgElement = element instanceof SVGElement ||
                            element.namespaceURI === 'http://www.w3.org/2000/svg';

        if (isSvgElement) {
            // Find nearest interactive parent
            const interactiveParent = element.closest('button, a, [role="button"], [onclick], [tabindex]');
            if (interactiveParent) {
                console.log('🔄 Resolved SVG click to parent:', interactiveParent.tagName);
                return interactiveParent;
            }

            // If no interactive parent, try to find the SVG's parent element
            // that is not an SVG element
            let current = element.parentElement;
            while (current && (current instanceof SVGElement || current.namespaceURI === 'http://www.w3.org/2000/svg')) {
                current = current.parentElement;
            }
            if (current) {
                console.log('🔄 Resolved SVG to non-SVG parent:', current.tagName);
                return current;
            }
        }

        return element;
    }

    /**
     * Check if element is a navigation control (prev/next buttons in date pickers, carousels, etc.)
     */
    isNavigationControl(element) {
        if (!element) return false;

        // Check aria labels for navigation patterns
        const ariaLabel = (element.getAttribute('aria-label') || '').toLowerCase();
        if (/previous|next|prev|forward|backward|back|navigate/.test(ariaLabel)) {
            return true;
        }

        // Check class names for navigation patterns
        const className = (element.className?.baseVal ?? element.className ?? '').toString().toLowerCase();
        if (/nav|prev|next|arrow|chevron|caret/.test(className)) {
            return true;
        }

        // Check if inside a date picker header (common pattern)
        const datePickerHeader = element.closest('.react-datepicker__header, .datepicker-header, [class*="calendar-header"], [class*="month-nav"]');
        if (datePickerHeader) {
            return true;
        }

        // Check if it's a button inside a date picker that's NOT a day option
        const inDatePicker = element.closest('.react-datepicker, .datepicker, [class*="calendar"], [role="dialog"][aria-label*="date"]');
        if (inDatePicker) {
            const isButton = element.tagName === 'BUTTON' || element.getAttribute('role') === 'button';
            const isNotOption = !element.closest('[role="option"], [role="gridcell"], .react-datepicker__day');
            if (isButton && isNotOption) {
                return true;
            }
        }

        return false;
    }

    async handleClick(event) {
        console.log('🖱️ Click detected on element:', event.target);

        // Capture click coordinates immediately before any async operations
        const clickX = event.clientX;
        const clickY = event.clientY;

        // Resolve SVG elements to their interactive parent
        const rawTarget = event.target;
        const target = this.resolveClickTarget(rawTarget);

        if (target !== rawTarget) {
            console.log('🔄 Target resolved from', rawTarget.tagName || rawTarget.nodeName, 'to', target.tagName);
        }

        // Check recording state first
        const recResponse = await this.sendMessageAsync({ message: "recState" });
        console.log('📝 Recording state response:', recResponse);

        if (!recResponse || !recResponse.recState) {
            console.log('❌ Recording not active, click ignored');
            return;
        }

        // Generate ARIA snapshot for context
        // This captures the semantic structure around the clicked element
        const snapshot = ariaSnapshotGenerator.generateForElement(target);
        console.log('📋 ARIA snapshot generated:', snapshot.yaml?.substring(0, 200) + '...');

        const xpaths = this.getXpaths(target);
        const coords = { x: clickX, y: clickY };

        // Build click action data
        let clickData = {
            message: "onClick",
            xPath: xpaths,
            coordinates: coords,
            button: event.button,
            ariaSnapshot: snapshot.yaml
        };

        // Layer 1: Check if clicking on a native SELECT element or OPTION within SELECT
        let selectElement = null;
        if (target.tagName === 'SELECT') {
            selectElement = target;
        } else if (target.tagName === 'OPTION' && target.parentElement?.tagName === 'SELECT') {
            selectElement = target.parentElement;
        }

        // === SELECTION DETECTION (priority order, only one selection per click) ===

        // 1. Native <select> (highest priority - most reliable)
        if (selectElement) {
            const allOptions = Array.from(selectElement.options).map(opt => ({
                value: opt.value,
                text: opt.text,
                index: opt.index,
                selected: opt.selected
            }));

            const questionText = getLabelForElement(selectElement);

            clickData.selection = {
                kind: 'native-select',
                questionText: questionText,
                selectedValue: selectElement.value,
                selectedText: selectElement.selectedOptions[0]?.text || '',
                selectedIndex: selectElement.selectedIndex,
                allOptions: allOptions.map(opt => opt.text),
                playwrightAction: 'selectOption',
                isMultiple: selectElement.multiple,
                parameter: {
                    name: this.generateParamName(questionText),
                    type: 'choice'
                }
            };

            console.log('📋 Native select detected:', clickData.selection.questionText);
        }

        // 2. Custom dropdown (ARIA + heuristic) - skip if already have selection or if it's a navigation control
        const isNavControl = this.isNavigationControl(target);
        if (this.dropdownDetector && !clickData.selection && !isNavControl) {
            clickData = this.dropdownDetector.enrichClick(clickData, target);
        } else if (isNavControl) {
            console.log('🧭 Navigation control detected, skipping dropdown detection');
        }

        // 3. Radio/Checkbox - skip if already have selection or navigation control
        if (this.radioDetector && !clickData.selection && !isNavControl) {
            clickData = this.radioDetector.enrichClick(clickData, target);
        }

        // 4. Button group (lowest priority - most heuristic) - skip if already have selection or navigation control
        if (this.choiceDetector && !clickData.selection && !isNavControl) {
            clickData = this.choiceDetector.enrichClick(clickData, target);
        }

        // === NON-SELECTION ENRICHMENTS (can coexist with selection) ===

        // File input detection - find actual input when clicking upload buttons
        if (this.fileUploadDetector) {
            clickData = this.fileUploadDetector.enrichClick(clickData, target);
        }

        // ARIA snapshot was already generated early in the function
        console.log('✅ Sending click action:', clickData);
        this.sendMessage(clickData);
    }

    /**
     * Generate parameter name from question text
     */
    generateParamName(question) {
        if (!question) return 'SELECTION';
        return question
            .replace(/[?.,!:]/g, '')
            .replace(/^(select|choose|pick)\s+/i, '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '_')
            .substring(0, 30);
    }
}
