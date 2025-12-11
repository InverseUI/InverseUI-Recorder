// Radio/Checkbox detection - captures native form input groups

import { getLabelForElement } from '../../../util/dom_utils.js';

export class RadioDetector {
    constructor(getXpaths) {
        this.getXpaths = getXpaths;
    }

    /**
     * Enrich click data with radio/checkbox group info if detected
     */
    enrichClick(clickData, clickedElement) {
        // Only handle native radio/checkbox inputs
        if (clickedElement.type !== 'radio' && clickedElement.type !== 'checkbox') {
            return clickData;
        }

        clickData.selection = this.detectRadioGroup(clickedElement);
        console.log('🔘 Radio/checkbox group detected:', clickData.selection?.question);
        return clickData;
    }

    /**
     * Detect radio/checkbox group info
     */
    detectRadioGroup(element) {
        const groupName = element.name;
        let groupElements = [element];

        // Find all options in the same group by name attribute
        if (groupName) {
            groupElements = Array.from(document.querySelectorAll(
                `input[name="${CSS.escape(groupName)}"]`
            ));
        }

        // Find selected element and its index
        const selectedIndex = groupElements.findIndex(el => el.checked);
        const selectedEl = groupElements[selectedIndex] || element;

        const questionText = getLabelForElement(element);

        return {
            kind: element.type,  // 'radio' or 'checkbox'
            question: questionText,
            value: selectedEl.value,
            label: this.getOptionText(selectedEl),
            index: selectedIndex >= 0 ? selectedIndex : null,
            options: groupElements.map(el => this.getOptionText(el)),
            action: 'check',
            // For parameterization
            parameter: {
                name: this.generateParamName(questionText),
                type: 'choice'
            }
        };
    }

    /**
     * Get the option text (e.g., "Yes", "No") - the label for this specific option
     */
    getOptionText(inputElement) {
        // 1. Check if wrapped in a label
        const label = inputElement.closest('label');
        if (label) {
            const clone = label.cloneNode(true);
            const inputInClone = clone.querySelector('input');
            if (inputInClone) inputInClone.remove();
            const text = clone.textContent?.replace(/\s+/g, ' ').trim();
            if (text) return text;
        }

        // 2. Check for adjacent text node
        const next = inputElement.nextSibling;
        if (next && next.nodeType === Node.TEXT_NODE) {
            const text = next.textContent?.trim();
            if (text) return text;
        }

        // 3. Check next element sibling
        const nextEl = inputElement.nextElementSibling;
        if (nextEl) {
            const text = nextEl.textContent?.trim();
            if (text && text.length < 50) return text;
        }

        // 4. Check for label[for="id"]
        if (inputElement.id) {
            const forLabel = document.querySelector(`label[for="${CSS.escape(inputElement.id)}"]`);
            if (forLabel) return forLabel.textContent?.trim();
        }

        // 5. Fallback to value
        return inputElement.value;
    }

    /**
     * Generate parameter name from question text
     */
    generateParamName(question) {
        if (!question) return 'OPTION';
        return question
            .replace(/[?.,!]/g, '')
            .replace(/^(select|choose|pick)\s+/i, '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '_')
            .substring(0, 30);
    }
}

export function initializeRadioDetection(getXpaths) {
    return new RadioDetector(getXpaths);
}
