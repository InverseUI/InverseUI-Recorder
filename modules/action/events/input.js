// Input event handlers for comprehensive form interaction tracking
import { getLabelForElement } from '../../../util/dom_utils.js';
import { ariaSnapshotGenerator } from '../context/aria_snapshot.js';
import { getPlaywrightSelector } from '../../../util/playwright_selector.js';

export class InputEventTracker {
    constructor(sendMessage, getXpaths) {
        this.sendMessage = sendMessage;
        this.getXpaths = getXpaths;
        this.dropdownDetector = null;  // Reactive dropdown detector
    }

    /**
     * Set the dropdown detector for recording input interactions
     */
    setDropdownDetector(detector) {
        this.dropdownDetector = detector;
    }

    /**
     * Promise version of sendMessage for async/await usage
     */
    sendMessageAsync(msg) {
        return new Promise(resolve => {
            this.sendMessage(msg, resolve);
        });
    }

    init() {
        // Essential form events for Selenium automation
        document.addEventListener('input', this.handleInput.bind(this), true);
        document.addEventListener('change', this.handleChange.bind(this), true);
        document.addEventListener('select', this.handleSelect.bind(this), true);
        document.addEventListener('focus', this.handleFocus.bind(this), true);

        // Form submission events
        document.addEventListener('submit', this.handleSubmit.bind(this), true);
        document.addEventListener('reset', this.handleReset.bind(this), true);

        // Form validation events
        document.addEventListener('invalid', this.handleInvalid.bind(this), true);
    }

    /**
     * Handle focus events - record for dropdown correlation
     */
    handleFocus(event) {
        const target = event.target;

        // Only track focusable form elements
        if (!this.isFormElement(target)) return;

        // Record focus for dropdown detection correlation
        if (this.dropdownDetector) {
            this.dropdownDetector.recordFocus(target);
        }
    }

    /**
     * Check if element is a form input element
     */
    isFormElement(element) {
        const tagName = element.tagName;
        return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
    }

    handleInput(event) {
        const target = event.target;

        // Record input for dropdown detection correlation (always, even if not recording)
        if (this.dropdownDetector) {
            this.dropdownDetector.recordInput(target, target.value);
        }

        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const xpaths = this.getXpaths(target);

                this.sendMessage({
                    message: "onInput",
                    xPath: xpaths,
                    content: target.value,
                    locator: getPlaywrightSelector(target)
                });
            } else {
                console.log('❌ Recording not active, input ignored');
            }
        });
    }

    async handleChange(event) {
        // Check recording state first
        const recResponse = await this.sendMessageAsync({ message: "recState" });

        if (!recResponse || !recResponse.recState) {
            return;
        }

        const target = event.target;
        const xpaths = this.getXpaths(target);

        let changeData = {
            message: "onChange",
            xPath: xpaths,
            content: target.value,
            locator: getPlaywrightSelector(target)
        };

        if (target.type === 'checkbox' || target.type === 'radio') {
            changeData.checked = target.checked;
            changeData.value = target.value;
        } else if (target.tagName === 'SELECT') {
            // Capture comprehensive dropdown information (Layer 1: Native)
            const selectedOptions = Array.from(target.selectedOptions).map(opt => ({
                value: opt.value,
                text: opt.text,
                index: opt.index
            }));

            // Capture ALL available options
            const allOptions = Array.from(target.options).map(opt => ({
                value: opt.value,
                text: opt.text,
                index: opt.index,
                selected: opt.selected,
                disabled: opt.disabled
            }));

            changeData.dropdown = {
                kind: 'native',
                label: getLabelForElement(target),
                selectedValue: target.value,
                selectedText: target.selectedOptions[0]?.text || '',
                selectedIndex: target.selectedIndex,
                allOptions: allOptions,
                isMultiple: target.multiple,
                detectionConfidence: 1.0
            };

            // Keep backward compatibility
            changeData.selectedOptions = selectedOptions;
        } else if (target.type === 'file') {
            changeData.files = Array.from(target.files || []).map(file => ({
                name: file.name,
                size: file.size,
                type: file.type
            }));
        }

        // Generate ARIA snapshot for context
        const snapshot = ariaSnapshotGenerator.generateForElement(target);
        changeData.ariaSnapshot = snapshot.yaml;

        this.sendMessage(changeData);
    }


    handleSelect(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const target = event.target;
                const xpaths = this.getXpaths(target);

                const selection = {
                    start: target.selectionStart || 0,
                    end: target.selectionEnd || 0,
                    direction: target.selectionDirection || 'none',
                    selectedText: target.value ?
                        target.value.substring(target.selectionStart, target.selectionEnd) : ''
                };

                this.sendMessage({
                    message: "onSelect",
                    xPath: xpaths,
                    selection: selection
                });
            }
        });
    }

    handleSubmit(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const form = event.target;
                const xpaths = this.getXpaths(form);

                // Collect all form data
                const formData = new FormData(form);
                const data = {};
                for (let [key, value] of formData.entries()) {
                    if (data[key]) {
                        // Handle multiple values (like checkboxes with same name)
                        if (!Array.isArray(data[key])) {
                            data[key] = [data[key]];
                        }
                        data[key].push(value);
                    } else {
                        data[key] = value;
                    }
                }

                this.sendMessage({
                    message: "onSubmit",
                    xPath: xpaths,
                    formData: data,
                    action: form.action || '',
                    method: form.method || 'GET',
                    target: form.target || '',
                    enctype: form.enctype || 'application/x-www-form-urlencoded'
                });

                // Note: Not preventing default to allow form to submit if needed
            }
        });
    }

    handleReset(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const form = event.target;
                const xpaths = this.getXpaths(form);

                this.sendMessage({
                    message: "onReset",
                    xPath: xpaths
                });
            }
        });
    }

    handleInvalid(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const target = event.target;
                const xpaths = this.getXpaths(target);

                this.sendMessage({
                    message: "onInvalid",
                    xPath: xpaths,
                    validationMessage: target.validationMessage || ''
                });
            }
        });
    }
}
