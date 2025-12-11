// Choice detection - captures Yes/No button groups WITH question context

export class ChoiceDetector {
    constructor(getXpaths) {
        this.getXpaths = getXpaths;
    }

    /**
     * Enrich click data with choice group info if detected
     */
    enrichClick(clickData, clickedElement) {
        const choiceInfo = this.detectChoiceGroup(clickedElement);
        if (choiceInfo) {
            clickData.selection = choiceInfo;
            console.log('🔘 Button group detected:', choiceInfo.question || '(no question)', '→', choiceInfo.value);
        }
        return clickData;
    }

    /**
     * Detect if clicked element is part of a choice group (Yes/No, etc.)
     */
    detectChoiceGroup(element) {
        const buttonText = element.textContent?.trim();

        // Skip if not a button-like element
        if (!this.isChoiceButton(element)) return null;

        // Skip if text is too long (not a simple choice)
        if (!buttonText || buttonText.length > 30) return null;

        // Find sibling buttons that form a choice group
        const container = this.findChoiceContainer(element);
        if (!container) return null;

        const siblingButtons = this.findSiblingChoices(container);

        // Need at least 2 buttons to form a group
        if (siblingButtons.length < 2) return null;

        // Find the question context
        const questionText = this.findQuestionContext(element, container);

        const selectedIndex = siblingButtons.findIndex(btn => btn === element);

        return {
            kind: 'button-group',
            question: questionText,
            value: buttonText,
            label: buttonText,
            index: selectedIndex,
            options: siblingButtons.map(btn => btn.textContent?.trim()),
            action: 'click',
            // For Playwright code generation
            parameter: {
                name: this.generateParamName(questionText),
                type: 'choice'
            }
        };
    }

    /**
     * Check if element is a choice button (button, role="button", etc.)
     */
    isChoiceButton(element) {
        return element.tagName === 'BUTTON' ||
               element.getAttribute('role') === 'button' ||
               element.getAttribute('role') === 'radio' ||
               (element.tagName === 'DIV' && element.getAttribute('tabindex') !== null);
    }

    /**
     * Find the container that holds all choice buttons
     */
    findChoiceContainer(element) {
        // Strategy 1: Look for fieldset
        const fieldset = element.closest('fieldset');
        if (fieldset) return fieldset;

        // Strategy 2: Look for role="group" or role="radiogroup"
        const group = element.closest('[role="group"], [role="radiogroup"]');
        if (group) return group;

        // Strategy 3: Walk up to find container with multiple buttons
        let parent = element.parentElement;
        let depth = 0;

        while (parent && depth < 4) {
            const buttons = parent.querySelectorAll('button, [role="button"], [role="radio"]');
            const choiceButtons = Array.from(buttons).filter(b =>
                b.textContent?.trim().length <= 30
            );
            if (choiceButtons.length >= 2) return parent;
            parent = parent.parentElement;
            depth++;
        }

        return element.parentElement;
    }

    /**
     * Find sibling choice buttons in container
     */
    findSiblingChoices(container) {
        return Array.from(container.querySelectorAll('button, [role="button"], [role="radio"]'))
            .filter(el => {
                const text = el.textContent?.trim();
                return text && text.length > 0 && text.length <= 30;
            });
    }

    /**
     * Find the question text associated with the choice group
     * Uses multiple strategies to find the label/question
     */
    findQuestionContext(element, container) {
        // Strategy 1: fieldset > legend
        if (container.tagName === 'FIELDSET') {
            const legend = container.querySelector('legend');
            if (legend) return legend.textContent?.trim();
        }

        // Strategy 2: aria-labelledby on container
        const labelledBy = container.getAttribute('aria-labelledby');
        if (labelledBy) {
            const label = document.getElementById(labelledBy);
            if (label) return label.textContent?.trim();
        }

        // Strategy 3: aria-label on container
        const ariaLabel = container.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;

        // Strategy 4: role="group" aria-label
        const group = element.closest('[role="group"], [role="radiogroup"]');
        if (group) {
            const groupLabel = group.getAttribute('aria-label');
            if (groupLabel) return groupLabel;
        }

        // Strategy 5: Preceding text element (DOM traversal)
        return this.findPrecedingQuestion(container) || '';
    }

    /**
     * Find question text that precedes the choice container
     */
    findPrecedingQuestion(container) {
        // Check preceding siblings
        let sibling = container.previousElementSibling;
        let depth = 0;

        while (sibling && depth < 3) {
            const text = sibling.textContent?.trim();
            // Question text should be substantial (> 10 chars) and not too long
            if (text && text.length > 10 && text.length < 500) {
                // Skip if it's another form element
                if (!sibling.querySelector('input, select, textarea, button')) {
                    return text;
                }
            }
            sibling = sibling.previousElementSibling;
            depth++;
        }

        // Check parent's first child (common pattern: question + buttons in same container)
        const parent = container.parentElement;
        if (parent) {
            const firstChild = parent.firstElementChild;
            if (firstChild && firstChild !== container) {
                const text = firstChild.textContent?.trim();
                if (text && text.length > 10 && text.length < 500) {
                    if (!firstChild.querySelector('input, select, textarea, button')) {
                        return text;
                    }
                }
            }
        }

        return '';
    }

    /**
     * Generate parameter name from question text
     * "Will you require sponsorship?" → "REQUIRE_SPONSORSHIP"
     */
    generateParamName(question) {
        if (!question) return 'CHOICE';
        return question
            .replace(/[?.,!]/g, '')
            .replace(/^(will you|do you|are you|have you|can you|would you)\s+/i, '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '_')
            .substring(0, 30);
    }
}

export function initializeChoiceDetection(getXpaths) {
    return new ChoiceDetector(getXpaths);
}
