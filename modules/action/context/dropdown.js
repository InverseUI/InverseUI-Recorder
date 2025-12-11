/**
 * Reactive Dropdown Detection System
 *
 * Detects dropdowns by analyzing BACKWARDS when user clicks, not by predicting forward.
 * This approach is stable because we only analyze what IS there, not what MIGHT appear.
 *
 * Architecture:
 * - Layer 1: Native <select>        (confidence: 1.0)  - Direct DOM detection
 * - Layer 2: ARIA combobox/listbox  (confidence: 0.95) - W3C ARIA patterns
 * - Layer 3: Reactive Heuristic     (confidence: 0.85) - Click-time backward analysis
 */

import {
    DROPDOWN_CONFIDENCE,
    RECENT_INTERACTION_TIMEOUT,
    GEOMETRIC_PROXIMITY,
    POPUP_SELECTORS,
    OPTION_SELECTORS,
    POPUP_ARIA_ROLES,
    OPTION_ARIA_ROLES,
    POPUP_PARENT_ROLES
} from '../config/config.js';

import { getLabelForElement } from '../../../util/dom_utils.js';


/**
 * RecentInteractionTracker
 *
 * Tracks recent user interactions (focus, input, click) to correlate
 * with potential dropdown selections. Uses a simple time-windowed buffer.
 */
export class RecentInteractionTracker {
    constructor() {
        // Recent focused/active input elements
        this.recentInputs = [];  // { element, timestamp, value, type }

        // Recent clicks for context
        this.recentClicks = [];  // { element, timestamp }

        // Maximum items to track
        this.maxItems = 10;
    }

    /**
     * Record an input/focus interaction
     */
    recordInput(element, value = '') {
        const interaction = {
            element,
            timestamp: Date.now(),
            value,
            type: element.type || 'text',
            rect: element.getBoundingClientRect()
        };

        this.recentInputs.unshift(interaction);
        this.recentInputs = this.recentInputs.slice(0, this.maxItems);
        this.cleanup();
    }

    /**
     * Record a click interaction
     */
    recordClick(element) {
        const interaction = {
            element,
            timestamp: Date.now(),
            rect: element.getBoundingClientRect()
        };

        this.recentClicks.unshift(interaction);
        this.recentClicks = this.recentClicks.slice(0, this.maxItems);
        this.cleanup();
    }

    /**
     * Find the most recent input that could be a trigger for a popup
     * @param {DOMRect} popupRect - Bounding rect of the popup
     * @param {number} timeWindow - How far back to look (ms)
     */
    findRecentTrigger(popupRect, timeWindow = RECENT_INTERACTION_TIMEOUT) {
        const now = Date.now();
        this.cleanup();

        for (const interaction of this.recentInputs) {
            // Check time window
            if (now - interaction.timestamp > timeWindow) continue;

            // Check geometric proximity
            if (this.isGeometricallyRelated(interaction.rect, popupRect)) {
                return interaction;
            }
        }

        return null;
    }

    /**
     * Check if popup is geometrically related to trigger (below, above, or overlapping horizontally)
     */
    isGeometricallyRelated(triggerRect, popupRect) {
        // Horizontal overlap check
        const horizontalOverlap = Math.min(triggerRect.right, popupRect.right) -
                                  Math.max(triggerRect.left, popupRect.left);

        const minOverlap = Math.min(triggerRect.width, popupRect.width) * GEOMETRIC_PROXIMITY.MIN_HORIZONTAL_OVERLAP_RATIO;

        if (horizontalOverlap < minOverlap) return false;

        // Vertical proximity check - popup should be near trigger (above or below)
        const verticalGap = Math.min(
            Math.abs(popupRect.top - triggerRect.bottom),  // popup below trigger
            Math.abs(triggerRect.top - popupRect.bottom)   // popup above trigger
        );

        if (verticalGap <= GEOMETRIC_PROXIMITY.MAX_VERTICAL_GAP) {
            return true;
        }

        // Fallback: Check if popup width matches trigger (common pattern for Select2, Ant Design)
        const widthMatch = Math.abs(triggerRect.width - popupRect.width) < 50;
        if (widthMatch && popupRect.top >= triggerRect.top) {
            return true;
        }

        return false;
    }

    /**
     * Get the most recent input element (for context)
     */
    getMostRecentInput() {
        this.cleanup();
        return this.recentInputs[0] || null;
    }

    /**
     * Cleanup stale interactions
     */
    cleanup() {
        const now = Date.now();
        const timeout = RECENT_INTERACTION_TIMEOUT;

        this.recentInputs = this.recentInputs.filter(i => now - i.timestamp < timeout);
        this.recentClicks = this.recentClicks.filter(i => now - i.timestamp < timeout);
    }

    /**
     * Clear all tracked interactions
     */
    clear() {
        this.recentInputs = [];
        this.recentClicks = [];
    }
}


/**
 * Layer 2: ARIA Dropdown Detector
 *
 * Detects ARIA combobox/listbox patterns following W3C specifications.
 * Confidence: 0.95
 */
export class ARIADropdownDetector {
    constructor(interactionTracker = null) {
        this.tracker = interactionTracker;
    }

    /**
     * Detect if clicked element is an ARIA option
     * Returns full context if found, null otherwise
     */
    detectARIAOption(clickedElement) {
        if (!clickedElement) return null;

        try {
            // Check if element has option role
            const role = clickedElement.getAttribute('role');
            if (!OPTION_ARIA_ROLES.includes(role)) {
                // Also check parent in case click was on text inside option
                const parent = clickedElement.parentElement;
                if (!parent || !OPTION_ARIA_ROLES.includes(parent.getAttribute('role'))) {
                    return null;
                }
                // Use parent as the actual option
                clickedElement = parent;
            }

            // Find parent listbox/menu
            const listbox = this.findParentListbox(clickedElement);
            if (!listbox) return null;

            // Find trigger element - try ARIA first, then fall back to interaction tracker
            let trigger = this.findTriggerForListbox(listbox);
            let triggerValue = null;
            let hadRecentTrigger = false;

            // If no ARIA trigger found, try RecentInteractionTracker for autocomplete patterns
            if (!trigger && this.tracker) {
                const listboxRect = listbox.getBoundingClientRect();
                const recentTrigger = this.tracker.findRecentTrigger(listboxRect);
                if (recentTrigger) {
                    trigger = recentTrigger.element;
                    triggerValue = recentTrigger.value;
                    hadRecentTrigger = true;
                }
            }

            // Extract all options
            const options = this.extractOptions(listbox);

            // Find clicked option info
            const clickedOptionInfo = options.find(opt => opt.element === clickedElement);

            return {
                kind: 'aria',
                trigger: trigger,
                triggerValue: triggerValue,
                hadRecentTrigger: hadRecentTrigger,
                popup: listbox,
                clickedOption: clickedElement,
                optionText: clickedOptionInfo?.text || clickedElement.textContent?.trim() || '',
                optionValue: clickedOptionInfo?.value || clickedElement.getAttribute('data-value') || '',
                optionIndex: clickedOptionInfo?.index ?? -1,
                allOptions: options,
                confidence: DROPDOWN_CONFIDENCE.ARIA
            };
        } catch (error) {
            console.error('ARIA detection error:', error);
            return null;
        }
    }

    /**
     * Find parent listbox/menu container
     */
    findParentListbox(element) {
        const roleSelector = POPUP_PARENT_ROLES.map(r => `[role="${r}"]`).join(',');
        return element.closest(roleSelector);
    }

    /**
     * Find the trigger element that controls a listbox
     */
    findTriggerForListbox(listbox) {
        const listboxId = listbox.id;
        if (!listboxId) return null;

        // Standard ARIA patterns: aria-controls or aria-owns
        let trigger = document.querySelector(
            `[aria-controls="${listboxId}"],[aria-owns="${listboxId}"]`
        );
        if (trigger) return trigger;

        // aria-activedescendant pattern (React Select, Downshift)
        trigger = document.querySelector(`[aria-activedescendant^="${listboxId}"]`);
        if (trigger) return trigger;

        // React Select ID pattern: listbox id = "react-select-X-listbox"
        const reactSelectMatch = listboxId.match(/^react-select-(\d+)-listbox$/);
        if (reactSelectMatch) {
            const inputId = `react-select-${reactSelectMatch[1]}-input`;
            trigger = document.getElementById(inputId);
            if (trigger) return trigger;
        }

        return null;
    }

    /**
     * Extract all options from a listbox
     */
    extractOptions(listbox) {
        const optionSelector = OPTION_ARIA_ROLES.map(r => `[role="${r}"]`).join(',');
        const optionElements = Array.from(listbox.querySelectorAll(optionSelector));

        return optionElements.map((el, index) => ({
            element: el,
            text: el.textContent?.trim() || '',
            value: el.getAttribute('data-value') || el.getAttribute('value') || el.textContent?.trim() || '',
            index,
            isSelected: el.getAttribute('aria-selected') === 'true',
            isDisabled: el.getAttribute('aria-disabled') === 'true'
        }));
    }
}


/**
 * Layer 3: Reactive Heuristic Detector
 *
 * Analyzes clicks BACKWARDS to detect custom dropdown selections.
 * Only fires when user actually clicks - no prediction or timing guesses.
 * Confidence: 0.85
 */
export class ReactiveHeuristicDetector {
    constructor(interactionTracker) {
        this.tracker = interactionTracker;
    }

    /**
     * Analyze a click to determine if it's a dropdown option selection
     * This is the main entry point - called on every click
     */
    analyzeClick(clickedElement) {
        if (!clickedElement) return null;

        try {
            // Step 1: Is the clicked element inside a popup-like container?
            const popup = this.findAncestorPopup(clickedElement);
            if (!popup) return null;

            // Step 2: Does the clicked element look like an option?
            if (!this.looksLikeOption(clickedElement)) return null;

            // Step 3: Find a recent trigger (input element) that could have opened this popup
            const popupRect = popup.getBoundingClientRect();
            const recentTrigger = this.tracker.findRecentTrigger(popupRect);

            // If no recent trigger found, this might still be a dropdown but we can't correlate it
            // We'll still detect it but with lower confidence

            // Step 4: Extract sibling options from popup
            const options = this.extractOptions(popup, clickedElement);

            // Step 5: Get clicked option info
            const clickedOptionInfo = this.getOptionInfo(clickedElement, options);

            return {
                kind: 'heuristic',
                trigger: recentTrigger?.element || null,
                triggerValue: recentTrigger?.value || null,
                popup: popup,
                clickedOption: clickedElement,
                optionText: clickedOptionInfo.text,
                optionValue: clickedOptionInfo.value,
                optionIndex: clickedOptionInfo.index,
                allOptions: options,
                confidence: recentTrigger ? DROPDOWN_CONFIDENCE.HEURISTIC : DROPDOWN_CONFIDENCE.HEURISTIC_NO_TRIGGER,
                hadRecentTrigger: !!recentTrigger
            };
        } catch (error) {
            console.error('Heuristic detection error:', error);
            return null;
        }
    }

    /**
     * Find ancestor that looks like a popup container
     */
    findAncestorPopup(element) {
        // First, try direct CSS selector match
        const popup = element.closest(POPUP_SELECTORS.join(','));
        if (popup && this.validatePopup(popup)) {
            return popup;
        }

        // Walk up the tree looking for popup-like containers
        let current = element.parentElement;
        while (current && current !== document.body) {
            if (this.looksLikePopup(current)) {
                return current;
            }
            current = current.parentElement;
        }

        return null;
    }

    /**
     * Check if element looks like a popup container
     */
    looksLikePopup(element) {
        const style = window.getComputedStyle(element);
        // SVG elements have className.baseVal instead of string
        const classes = (element.className?.baseVal ?? element.className ?? '').toString().toLowerCase();
        const role = element.getAttribute('role');

        // Role-based should be auto-pass (most reliable signal)
        const hasPopupRole = POPUP_ARIA_ROLES.includes(role);
        if (hasPopupRole) return true;

        // Must be positioned (absolute/fixed) or have popup class
        const isPositioned = ['absolute', 'fixed'].includes(style.position);
        const hasPopupClass = /dropdown|menu|popup|popper|autocomplete|suggest|listbox|options|combobox/.test(classes);

        // Must have multiple children (options)
        const hasMultipleChildren = element.children.length >= 2;

        // Score-based decision for non-ARIA elements
        let score = 0;
        if (isPositioned) score += 2;
        if (hasPopupClass) score += 2;
        if (hasMultipleChildren) score += 1;

        return score >= 3;
    }

    /**
     * Validate that a popup candidate is actually visible and reasonable
     */
    validatePopup(popup) {
        const style = window.getComputedStyle(popup);

        // Must be visible
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }

        // Must have reasonable dimensions
        const rect = popup.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 20) {
            return false;
        }

        return true;
    }

    /**
     * Check if element looks like a selectable option
     */
    looksLikeOption(element) {
        // SVG elements have className.baseVal instead of string
        const classes = (element.className?.baseVal ?? element.className ?? '').toString().toLowerCase();
        const role = element.getAttribute('role');
        const style = window.getComputedStyle(element);

        // Has option-like role
        if (OPTION_ARIA_ROLES.includes(role)) return true;

        // Has option-like class
        if (/option|item|suggestion|result|choice|entry/.test(classes)) return true;

        // Is clickable (cursor: pointer)
        if (style.cursor === 'pointer') return true;

        // Has reasonable text content (not too long, not empty)
        const text = element.textContent?.trim() || '';
        if (text.length > 0 && text.length < 200) {
            // Check if it's a leaf-ish node (not too many nested elements)
            if (element.children.length <= 3) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extract all option-like elements from popup
     */
    extractOptions(popup, clickedElement) {
        const options = [];
        const seen = new Set();

        // First, try ARIA roles
        const ariaOptions = popup.querySelectorAll(
            OPTION_ARIA_ROLES.map(r => `[role="${r}"]`).join(',')
        );

        ariaOptions.forEach((el, index) => {
            if (!seen.has(el)) {
                seen.add(el);
                options.push(this.createOptionInfo(el, index));
            }
        });

        // If no ARIA options, use heuristic detection
        if (options.length === 0) {
            const candidates = this.findOptionCandidates(popup);
            candidates.forEach((el, index) => {
                if (!seen.has(el)) {
                    seen.add(el);
                    options.push(this.createOptionInfo(el, index));
                }
            });
        }

        // Make sure clicked element is included
        if (!seen.has(clickedElement)) {
            options.push(this.createOptionInfo(clickedElement, options.length));
        }

        return options;
    }

    /**
     * Find option candidates using heuristics
     */
    findOptionCandidates(popup) {
        // Common option selectors (removed 'div[class]' - too broad)
        const selectorCandidates = [
            'li',
            '[class*="option"]',
            '[class*="item"]:not([class*="menu-item-group"])',
            '[class*="suggestion"]',
            '[class*="result"]',
            '[class*="choice"]'
        ];

        const candidates = [];
        const seen = new Set();

        for (const selector of selectorCandidates) {
            try {
                const elements = popup.querySelectorAll(selector);
                for (const el of elements) {
                    if (seen.has(el)) continue;
                    if (this.looksLikeOption(el)) {
                        seen.add(el);
                        candidates.push(el);
                    }
                }
            } catch (e) {
                // Invalid selector, skip
            }
        }

        // Filter to only direct-ish children of popup (avoid deeply nested elements)
        return candidates.filter(el => {
            let depth = 0;
            let current = el;
            while (current && current !== popup) {
                depth++;
                current = current.parentElement;
            }
            return depth <= 4;  // Max 4 levels deep
        });
    }

    /**
     * Create option info object
     */
    createOptionInfo(element, index) {
        return {
            element,
            text: element.textContent?.trim() || '',
            value: element.getAttribute('data-value') ||
                   element.getAttribute('value') ||
                   element.textContent?.trim() || '',
            index,
            isSelected: element.classList.contains('selected') ||
                       element.getAttribute('aria-selected') === 'true',
            isDisabled: element.classList.contains('disabled') ||
                       element.getAttribute('aria-disabled') === 'true' ||
                       element.hasAttribute('disabled')
        };
    }

    /**
     * Get info for the clicked option
     */
    getOptionInfo(clickedElement, options) {
        const found = options.find(opt => opt.element === clickedElement);
        if (found) {
            return { text: found.text, value: found.value, index: found.index };
        }

        // Fallback
        return {
            text: clickedElement.textContent?.trim() || '',
            value: clickedElement.getAttribute('data-value') || clickedElement.textContent?.trim() || '',
            index: -1
        };
    }
}


/**
 * DropdownDetector
 *
 * Main entry point that orchestrates all detection layers.
 * Uses "highest confidence wins" strategy.
 */
export class DropdownDetector {
    constructor(getXpaths) {
        this.getXpaths = getXpaths;
        this.interactionTracker = new RecentInteractionTracker();
        this.ariaDetector = new ARIADropdownDetector(this.interactionTracker);
        this.heuristicDetector = new ReactiveHeuristicDetector(this.interactionTracker);
    }

    /**
     * Record an input event (call this from input_actions.js)
     */
    recordInput(element, value) {
        this.interactionTracker.recordInput(element, value);
    }

    /**
     * Record a focus event
     */
    recordFocus(element) {
        this.interactionTracker.recordInput(element, element.value || '');
    }

    /**
     * Analyze a click and enrich with dropdown metadata if detected
     * This is the main detection method - call on every click
     *
     * @param {Object} clickData - The click event data to enrich
     * @param {Element} clickedElement - The clicked element
     * @returns {Object} Enriched click data
     */
    enrichClick(clickData, clickedElement) {
        if (!clickedElement) return clickData;

        try {
            // Layer 1: Native SELECT (already handled in click_actions.js, skip if present)
            if (clickData.selection?.kind === 'native-select') {
                return clickData;
            }

            // Layer 2: ARIA detection (confidence: 0.95)
            const ariaResult = this.ariaDetector.detectARIAOption(clickedElement);
            if (ariaResult) {
                clickData.selection = this.formatDetectionResult(ariaResult);
                console.log('✅ ARIA dropdown detected:', ariaResult.optionText);
                return clickData;
            }

            // Layer 3: Reactive heuristic detection (confidence: 0.85)
            const heuristicResult = this.heuristicDetector.analyzeClick(clickedElement);
            if (heuristicResult) {
                clickData.selection = this.formatDetectionResult(heuristicResult);
                console.log('✅ Heuristic dropdown detected:', heuristicResult.optionText);
                return clickData;
            }

            return clickData;
        } catch (error) {
            console.error('Dropdown detection error:', error);
            return clickData;
        }
    }

    /**
     * Format detection result into unified selection structure
     */
    formatDetectionResult(result) {
        const questionText = result.trigger ? getLabelForElement(result.trigger) : '';

        return {
            kind: result.kind,
            question: questionText,
            value: result.optionValue,
            label: result.optionText,
            index: result.optionIndex,
            options: result.allOptions.map(opt => opt.text),
            action: 'click',
            parameter: {
                name: this.generateParamName(questionText),
                type: 'choice'
            }
        };
    }

    /**
     * Generate parameter name from question text
     */
    generateParamName(question) {
        if (!question) return 'DROPDOWN';
        return question
            .replace(/[?.,!:]/g, '')
            .replace(/^(select|choose|pick)\s+/i, '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '_')
            .substring(0, 30);
    }

    /**
     * Get CSS selector for element
     */
    getSelector(element) {
        if (!element) return null;

        // Prefer ID
        if (element.id) {
            return `#${CSS.escape(element.id)}`;
        }

        // Build class-based selector
        let selector = element.tagName.toLowerCase();
        if (element.className && typeof element.className === 'string') {
            const classes = element.className.trim().split(/\s+/).filter(Boolean);
            if (classes.length > 0) {
                selector += '.' + classes.map(c => CSS.escape(c)).join('.');
            }
        }

        return selector;
    }

    /**
     * Cleanup - call periodically or on page unload
     */
    cleanup() {
        this.interactionTracker.cleanup();
    }

    /**
     * Clear all state
     */
    clear() {
        this.interactionTracker.clear();
    }
}


/**
 * Initialize the dropdown detection system
 *
 * @param {Function} getXpaths - XPath generation function
 * @returns {DropdownDetector} The detector instance
 */
export function initializeDropdownDetection(sendMessage, getXpaths) {
    console.log('🎯 Initializing reactive dropdown detection system...');

    const detector = new DropdownDetector(getXpaths);

    // Setup periodic cleanup
    const cleanupInterval = setInterval(() => {
        detector.cleanup();
    }, 30000);  // Every 30 seconds

    // Cleanup on page unload
    const cleanup = () => {
        clearInterval(cleanupInterval);
        detector.clear();
        console.log('🧹 Dropdown detection cleaned up');
    };

    // beforeunload doesn't always fire (bfcache, mobile browsers)
    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);

    console.log('✅ Reactive dropdown detection initialized');
    return detector;
}
