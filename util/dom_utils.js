// Element utilities - shared functions for element manipulation and validation
// Can be used by both content scripts and background scripts

// Standalone utility functions (can be used without instantiating a class)

/**
 * Find element by XPath
 */
export function findElement(xpath) {
    try {
        const result = document.evaluate(
            xpath, 
            document, 
            null, 
            XPathResult.FIRST_ORDERED_NODE_TYPE, 
            null
        );
        return result.singleNodeValue;
    } catch (e) {
        console.error('XPath evaluation error:', e);
        return null;
    }
}

/**
 * Check if element is visible to user
 */
export function isElementVisible(element) {
    if (!element) return false;
    
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    
    return style.display !== 'none' &&
           style.visibility !== 'hidden' &&
           style.opacity !== '0' &&
           rect.width > 0 &&
           rect.height > 0 &&
           (rect.top + rect.height) > 0 &&
           (rect.left + rect.width) > 0;
}

/**
 * Validate XPath syntax and check if it finds elements
 */
export function validateXPath(xpath) {
    try {
        const result = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
        let count = 0;
        let node = result.iterateNext();
        while (node) {
            count++;
            node = result.iterateNext();
        }
        return { 
            valid: true, 
            count: count,
            isUnique: count === 1 
        };
    } catch (e) {
        return { 
            valid: false, 
            error: e.message 
        };
    }
}

/**
 * Get element value handling different input types
 */
export function getElementValue(element) {
    if (!element) return '';
    
    const tagName = element.tagName.toLowerCase();
    
    if (tagName === 'input' || tagName === 'textarea') {
        return element.value;
    } else if (tagName === 'select') {
        const selectedOption = element.options[element.selectedIndex];
        return {
            value: element.value,
            text: selectedOption ? selectedOption.text : '',
            selectedIndex: element.selectedIndex
        };
    } else if (element.isContentEditable) {
        return element.textContent;
    } else {
        return element.textContent.trim();
    }
}

/**
 * Check if element is interactive (clickable, editable, etc.)
 */
export function isElementInteractive(element) {
    if (!element) return false;
    
    const tagName = element.tagName.toLowerCase();
    const interactiveTags = ['button', 'a', 'input', 'select', 'textarea'];
    
    return interactiveTags.includes(tagName) ||
           element.onclick !== null ||
           element.getAttribute('onclick') !== null ||
           element.hasAttribute('role') ||
           element.tabIndex >= 0 ||
           element.isContentEditable;
}

/**
 * Get element's position relative to viewport
 */
export function getElementPosition(element) {
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    return {
        top: rect.top,
        left: rect.left,
        bottom: rect.bottom,
        right: rect.right,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2
    };
}

/**
 * Extract label text for an element using multiple strategies
 * Priority: explicit label > aria-labelledby > aria-label > wrapping label > placeholder > legend
 */
export function getLabelForElement(element) {
    if (!element) return '';

    // Strategy 1: Explicit <label for="id">
    if (element.id) {
        const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (label) return cleanLabelText(label, element);
    }

    // Strategy 2: aria-labelledby (references another element)
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl) return cleanLabelText(labelEl, element);
    }

    // Strategy 3: aria-label attribute
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    // Strategy 4: Implicit label (element wrapped in <label>)
    const parentLabel = element.closest('label');
    if (parentLabel) return cleanLabelText(parentLabel, element);

    // Strategy 5: Placeholder (fallback for inputs)
    if (element.placeholder) return element.placeholder.trim();

    // Strategy 6: Legend in fieldset
    const fieldset = element.closest('fieldset');
    if (fieldset) {
        const legend = fieldset.querySelector('legend');
        if (legend) return cleanLabelText(legend, element);
    }

    return '';
}

/**
 * Clean label text - remove element's own value and extra whitespace
 */
function cleanLabelText(labelElement, inputElement) {
    if (!labelElement) return '';

    // Clone to avoid modifying the DOM
    const clone = labelElement.cloneNode(true);

    // Remove the input element itself from the clone (for wrapping labels)
    const inputInClone = clone.querySelector('input, select, textarea');
    if (inputInClone) {
        inputInClone.remove();
    }

    // Get text and normalize whitespace
    return clone.textContent?.replace(/\s+/g, ' ').trim() || '';
}

// Element assertion helpers for QA testing - checking element existence, values, etc.
export class ElementAssertions {
    constructor(sendMessage, getXpaths) {
        this.sendMessage = sendMessage;
        this.getXpaths = getXpaths;
    }

    init() {
        // Listen for assertion requests from background script
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.action === 'assertElement') {
                const result = this.assertElement(request.xpath, request.assertion);
                sendResponse(result);
            } else if (request.action === 'getElementValue') {
                const value = this.getElementValue(request.xpath);
                sendResponse(value);
            } else if (request.action === 'getElementProperties') {
                const props = this.getElementProperties(request.xpath);
                sendResponse(props);
            } else if (request.action === 'waitForElement') {
                this.waitForElement(request.xpath, request.timeout)
                    .then(result => sendResponse(result))
                    .catch(error => sendResponse({ success: false, error: error.message }));
                return true; // Keep channel open for async response
            }
        });
    }

    // Find element by XPath
    findElement(xpath) {
        try {
            const result = document.evaluate(
                xpath, 
                document, 
                null, 
                XPathResult.FIRST_ORDERED_NODE_TYPE, 
                null
            );
            return result.singleNodeValue;
        } catch (e) {
            console.error('XPath evaluation error:', e);
            return null;
        }
    }

    // Assert element conditions
    assertElement(xpath, assertion) {
        const element = this.findElement(xpath);
        
        const result = {
            xpath: xpath,
            assertion: assertion,
            success: false,
            element: null,
            message: ''
        };

        if (!element) {
            result.message = `Element not found: ${xpath}`;
            return result;
        }

        result.element = {
            exists: true,
            tagName: element.tagName,
            id: element.id,
            className: element.className
        };

        switch (assertion.type) {
            case 'exists':
                result.success = true;
                result.message = 'Element exists';
                break;
                
            case 'visible':
                result.success = this.isElementVisible(element);
                result.message = result.success ? 'Element is visible' : 'Element is not visible';
                break;
                
            case 'enabled':
                result.success = !element.disabled;
                result.message = result.success ? 'Element is enabled' : 'Element is disabled';
                break;
                
            case 'text_equals':
                const actualText = element.textContent.trim();
                result.success = actualText === assertion.value;
                result.actualValue = actualText;
                result.message = result.success ? 
                    'Text matches expected value' : 
                    `Text mismatch. Expected: "${assertion.value}", Actual: "${actualText}"`;
                break;
                
            case 'text_contains':
                const elementText = element.textContent.trim();
                result.success = elementText.includes(assertion.value);
                result.actualValue = elementText;
                result.message = result.success ? 
                    'Text contains expected value' : 
                    `Text does not contain "${assertion.value}"`;
                break;
                
            case 'value_equals':
                const actualValue = element.value || '';
                result.success = actualValue === assertion.value;
                result.actualValue = actualValue;
                result.message = result.success ? 
                    'Value matches expected' : 
                    `Value mismatch. Expected: "${assertion.value}", Actual: "${actualValue}"`;
                break;
                
            case 'attribute_equals':
                const attrValue = element.getAttribute(assertion.attribute) || '';
                result.success = attrValue === assertion.value;
                result.actualValue = attrValue;
                result.message = result.success ? 
                    `Attribute ${assertion.attribute} matches expected value` : 
                    `Attribute mismatch. Expected: "${assertion.value}", Actual: "${attrValue}"`;
                break;
                
            case 'css_property_equals':
                const computedStyle = window.getComputedStyle(element);
                const cssValue = computedStyle.getPropertyValue(assertion.property);
                result.success = cssValue === assertion.value;
                result.actualValue = cssValue;
                result.message = result.success ? 
                    `CSS property ${assertion.property} matches expected value` : 
                    `CSS mismatch. Expected: "${assertion.value}", Actual: "${cssValue}"`;
                break;
                
            case 'selected':
                result.success = element.selected || element.checked;
                result.message = result.success ? 'Element is selected' : 'Element is not selected';
                break;
                
            case 'has_class':
                result.success = element.classList.contains(assertion.className);
                result.message = result.success ? 
                    `Element has class "${assertion.className}"` : 
                    `Element does not have class "${assertion.className}"`;
                break;
                
            default:
                result.message = `Unknown assertion type: ${assertion.type}`;
        }

        // Log assertion for tracking
        this.sendMessage({
            message: "onAssertion",
            result: result
        });

        return result;
    }

    // Check if element is visible
    isElementVisible(element) {
        if (!element) return false;
        
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        
        return style.display !== 'none' &&
               style.visibility !== 'hidden' &&
               style.opacity !== '0' &&
               rect.width > 0 &&
               rect.height > 0 &&
               (rect.top + rect.height) > 0 &&
               (rect.left + rect.width) > 0;
    }

    // Get element value (handles different element types)
    getElementValue(xpath) {
        const element = this.findElement(xpath);
        if (!element) {
            return { success: false, error: 'Element not found', xpath: xpath };
        }

        let value = '';
        const tagName = element.tagName.toLowerCase();

        if (tagName === 'input' || tagName === 'textarea') {
            value = element.value;
        } else if (tagName === 'select') {
            const selectedOption = element.options[element.selectedIndex];
            value = {
                value: element.value,
                text: selectedOption ? selectedOption.text : '',
                selectedIndex: element.selectedIndex
            };
        } else if (element.isContentEditable) {
            value = element.textContent;
        } else {
            value = element.textContent.trim();
        }

        return {
            success: true,
            xpath: xpath,
            value: value,
            tagName: tagName,
            type: element.type || null
        };
    }

    // Get comprehensive element properties
    getElementProperties(xpath) {
        const element = this.findElement(xpath);
        if (!element) {
            return { success: false, error: 'Element not found', xpath: xpath };
        }

        const rect = element.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(element);

        return {
            success: true,
            xpath: xpath,
            properties: {
                // Basic properties
                tagName: element.tagName,
                id: element.id,
                className: element.className,
                classList: Array.from(element.classList),
                
                // Content
                textContent: element.textContent.trim(),
                innerHTML: element.innerHTML,
                value: element.value || null,
                
                // Attributes
                attributes: Array.from(element.attributes).reduce((acc, attr) => {
                    acc[attr.name] = attr.value;
                    return acc;
                }, {}),
                
                // State
                disabled: element.disabled || false,
                readonly: element.readOnly || false,
                required: element.required || false,
                checked: element.checked || false,
                selected: element.selected || false,
                
                // Position and dimensions
                position: {
                    top: rect.top,
                    left: rect.left,
                    bottom: rect.bottom,
                    right: rect.right,
                    width: rect.width,
                    height: rect.height
                },
                
                // Visibility
                visible: this.isElementVisible(element),
                display: computedStyle.display,
                visibility: computedStyle.visibility,
                opacity: computedStyle.opacity,
                
                // Form validation (if applicable)
                validity: element.validity || null,
                validationMessage: element.validationMessage || null,
                
                // Parent and children info
                parentTag: element.parentElement ? element.parentElement.tagName : null,
                childCount: element.children.length,
                
                // Custom data attributes
                dataset: element.dataset ? { ...element.dataset } : {}
            }
        };
    }

    // Wait for element to appear
    async waitForElement(xpath, timeout = 10000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const checkInterval = 100; // Check every 100ms
            
            const check = () => {
                const element = this.findElement(xpath);
                
                if (element && this.isElementVisible(element)) {
                    resolve({
                        success: true,
                        xpath: xpath,
                        waitTime: Date.now() - startTime,
                        element: {
                            tagName: element.tagName,
                            id: element.id,
                            className: element.className
                        }
                    });
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Timeout waiting for element: ${xpath}`));
                } else {
                    setTimeout(check, checkInterval);
                }
            };
            
            check();
        });
    }
}