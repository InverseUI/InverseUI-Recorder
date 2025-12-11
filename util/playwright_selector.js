/**
 * Playwright Selector Generator - Ported from Playwright
 *
 * Original source: https://github.com/microsoft/playwright
 * Files: packages/injected/src/selectorGenerator.ts, roleUtils.ts, selectorUtils.ts
 *
 * Copyright (c) Microsoft Corporation.
 * Licensed under the Apache License, Version 2.0
 */

// ============ SCORE CONSTANTS (from selectorGenerator.ts lines 39-65) ============
const kTestIdScore = 1;
const kOtherTestIdScore = 2;
const kRoleWithNameScore = 100;
const kPlaceholderScore = 120;
const kLabelScore = 140;
const kAltTextScore = 160;
const kTextScore = 180;
const kTitleScore = 200;
const kCSSIdScore = 500;
const kRoleWithoutNameScore = 510;
const kCSSInputTypeNameScore = 520;
const kCSSTagNameScore = 530;

// ============ FROM roleUtils.ts - Input type to role mapping ============
const inputTypeToRole = {
    'button': 'button',
    'checkbox': 'checkbox',
    'image': 'button',
    'number': 'spinbutton',
    'radio': 'radio',
    'range': 'slider',
    'reset': 'button',
    'submit': 'button',
};

// ============ FROM roleUtils.ts - Implicit role by tag name (lines 89-217) ============
const kImplicitRoleByTagName = {
    'A': (e) => e.hasAttribute('href') ? 'link' : null,
    'AREA': (e) => e.hasAttribute('href') ? 'link' : null,
    'ARTICLE': () => 'article',
    'ASIDE': () => 'complementary',
    'BLOCKQUOTE': () => 'blockquote',
    'BUTTON': () => 'button',
    'CAPTION': () => 'caption',
    'CODE': () => 'code',
    'DATALIST': () => 'listbox',
    'DD': () => 'definition',
    'DEL': () => 'deletion',
    'DETAILS': () => 'group',
    'DFN': () => 'term',
    'DIALOG': () => 'dialog',
    'DT': () => 'term',
    'EM': () => 'emphasis',
    'FIELDSET': () => 'group',
    'FIGURE': () => 'figure',
    'FOOTER': () => 'contentinfo',
    'FORM': (e) => hasExplicitAccessibleName(e) ? 'form' : null,
    'H1': () => 'heading',
    'H2': () => 'heading',
    'H3': () => 'heading',
    'H4': () => 'heading',
    'H5': () => 'heading',
    'H6': () => 'heading',
    'HEADER': () => 'banner',
    'HR': () => 'separator',
    'HTML': () => 'document',
    'IMG': (e) => (e.getAttribute('alt') === '') ? 'presentation' : 'img',
    'INPUT': (e) => {
        const type = (e.type || '').toLowerCase();
        if (type === 'search') return e.hasAttribute('list') ? 'combobox' : 'searchbox';
        if (['email', 'tel', 'text', 'url', ''].includes(type)) {
            const list = e.getAttribute('list');
            if (list) {
                const datalist = document.getElementById(list);
                return (datalist && datalist.nodeName === 'DATALIST') ? 'combobox' : 'textbox';
            }
            return 'textbox';
        }
        if (type === 'hidden') return null;
        if (type === 'file') return 'button';
        return inputTypeToRole[type] || 'textbox';
    },
    'INS': () => 'insertion',
    'LI': () => 'listitem',
    'MAIN': () => 'main',
    'MARK': () => 'mark',
    'MATH': () => 'math',
    'MENU': () => 'list',
    'METER': () => 'meter',
    'NAV': () => 'navigation',
    'OL': () => 'list',
    'OPTGROUP': () => 'group',
    'OPTION': () => 'option',
    'OUTPUT': () => 'status',
    'P': () => 'paragraph',
    'PROGRESS': () => 'progressbar',
    'SEARCH': () => 'search',
    'SECTION': (e) => hasExplicitAccessibleName(e) ? 'region' : null,
    'SELECT': (e) => e.hasAttribute('multiple') || e.size > 1 ? 'listbox' : 'combobox',
    'STRONG': () => 'strong',
    'SUB': () => 'subscript',
    'SUP': () => 'superscript',
    'SVG': () => 'img',
    'TABLE': () => 'table',
    'TBODY': () => 'rowgroup',
    'TD': () => 'cell',
    'TEXTAREA': () => 'textbox',
    'TFOOT': () => 'rowgroup',
    'TH': () => 'columnheader',
    'THEAD': () => 'rowgroup',
    'TIME': () => 'time',
    'TR': () => 'row',
    'UL': () => 'list',
};

// Valid ARIA roles for validation
const validRoles = ['alert', 'alertdialog', 'application', 'article', 'banner', 'blockquote', 'button', 'caption', 'cell', 'checkbox', 'code', 'columnheader', 'combobox',
    'complementary', 'contentinfo', 'definition', 'deletion', 'dialog', 'directory', 'document', 'emphasis', 'feed', 'figure', 'form', 'generic', 'grid',
    'gridcell', 'group', 'heading', 'img', 'insertion', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'mark', 'marquee', 'math', 'meter', 'menu',
    'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation', 'none', 'note', 'option', 'paragraph', 'presentation', 'progressbar', 'radio', 'radiogroup',
    'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider',
    'spinbutton', 'status', 'strong', 'subscript', 'superscript', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox', 'time', 'timer',
    'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'];

// ============ HELPER FUNCTIONS ============

function hasExplicitAccessibleName(e) {
    return e.hasAttribute('aria-label') || e.hasAttribute('aria-labelledby');
}

/**
 * Get explicit ARIA role from element (from roleUtils.ts line 270-274)
 */
function getExplicitAriaRole(element) {
    const roles = (element.getAttribute('role') || '').split(' ').map(role => role.trim());
    return roles.find(role => validRoles.includes(role)) || null;
}

/**
 * Get implicit ARIA role from element (from roleUtils.ts line 242-260)
 */
function getImplicitAriaRole(element) {
    const tagName = element.nodeName;
    const roleFunc = kImplicitRoleByTagName[tagName];
    return roleFunc ? roleFunc(element) : null;
}

/**
 * Get ARIA role (explicit or implicit) - from roleUtils.ts lines 281-291
 */
function getAriaRole(element) {
    const explicitRole = getExplicitAriaRole(element);
    if (!explicitRole)
        return getImplicitAriaRole(element);
    if (explicitRole === 'none' || explicitRole === 'presentation') {
        const implicitRole = getImplicitAriaRole(element);
        // Presentation conflict resolution
        if (element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby'))
            return implicitRole;
    }
    return explicitRole;
}

/**
 * Normalize whitespace in text (from stringUtils)
 */
function normalizeWhiteSpace(text) {
    return text.replace(/\s+/g, ' ').trim();
}

/**
 * Get element text content (from selectorUtils.ts lines 65-99)
 */
function elementText(element) {
    if (!element) return { full: '', normalized: '', immediate: [] };

    const tagName = element.nodeName;
    if (['SCRIPT', 'NOSCRIPT', 'STYLE'].includes(tagName))
        return { full: '', normalized: '', immediate: [] };

    // Special case for input buttons
    if (tagName === 'INPUT' && ['submit', 'button'].includes((element.type || '').toLowerCase())) {
        const value = element.value || '';
        return { full: value, normalized: normalizeWhiteSpace(value), immediate: [value] };
    }

    let full = '';
    const immediate = [];
    let currentImmediate = '';

    for (let child = element.firstChild; child; child = child.nextSibling) {
        if (child.nodeType === Node.TEXT_NODE) {
            full += child.nodeValue || '';
            currentImmediate += child.nodeValue || '';
        } else if (child.nodeType === Node.ELEMENT_NODE) {
            if (currentImmediate) {
                immediate.push(currentImmediate);
                currentImmediate = '';
            }
            full += elementText(child).full;
        }
    }
    if (currentImmediate) immediate.push(currentImmediate);

    // Include shadow DOM text
    if (element.shadowRoot) {
        full += elementText(element.shadowRoot).full;
    }

    return {
        full,
        normalized: normalizeWhiteSpace(full),
        immediate
    };
}

/**
 * Get element labels (from selectorUtils.ts lines 115-131)
 */
function getElementLabels(element) {
    // Check aria-labelledby first
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
        const ids = labelledBy.split(' ').filter(id => id);
        const labels = ids.map(id => document.getElementById(id)).filter(el => el);
        if (labels.length)
            return labels.map(label => elementText(label));
    }

    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim())
        return [{ full: ariaLabel, normalized: normalizeWhiteSpace(ariaLabel), immediate: [ariaLabel] }];

    // Check HTML labels for form elements
    const isNonHiddenInput = element.nodeName === 'INPUT' && element.type !== 'hidden';
    if (['BUTTON', 'METER', 'OUTPUT', 'PROGRESS', 'SELECT', 'TEXTAREA'].includes(element.nodeName) || isNonHiddenInput) {
        const labels = element.labels;
        if (labels && labels.length)
            return [...labels].map(label => elementText(label));
    }

    return [];
}

/**
 * Get accessible name for element (simplified from roleUtils.ts lines 504-528)
 */
function getElementAccessibleName(element) {
    if (!element) return '';

    // Check aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
        const ids = labelledBy.split(' ').filter(id => id);
        const texts = ids.map(id => {
            const el = document.getElementById(id);
            return el ? elementText(el).normalized : '';
        }).filter(t => t);
        if (texts.length) return texts.join(' ');
    }

    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel && ariaLabel.trim()) return ariaLabel.trim();

    // For inputs, check labels
    const labels = getElementLabels(element);
    if (labels.length) {
        return labels.map(l => l.normalized).join(' ');
    }

    // For buttons and links, use text content
    const role = getAriaRole(element);
    if (['button', 'link', 'menuitem', 'option', 'tab'].includes(role)) {
        return elementText(element).normalized;
    }

    // Check alt for images
    if (element.nodeName === 'IMG') {
        const alt = element.getAttribute('alt');
        if (alt) return alt;
    }

    // Check title as fallback
    const title = element.getAttribute('title');
    if (title) return title;

    return '';
}

/**
 * Check if ID looks like a GUID (from selectorGenerator.ts lines 479-506)
 */
function isGuidLike(id) {
    let lastCharacterType;
    let transitionCount = 0;
    for (let i = 0; i < id.length; ++i) {
        const c = id[i];
        let characterType;
        if (c === '-' || c === '_')
            continue;
        if (c >= 'a' && c <= 'z')
            characterType = 'lower';
        else if (c >= 'A' && c <= 'Z')
            characterType = 'upper';
        else if (c >= '0' && c <= '9')
            characterType = 'digit';
        else
            characterType = 'other';

        if (characterType === 'lower' && lastCharacterType === 'upper') {
            lastCharacterType = characterType;
            continue;
        }

        if (lastCharacterType && lastCharacterType !== characterType)
            ++transitionCount;
        lastCharacterType = characterType;
    }
    return transitionCount >= id.length / 4;
}

/**
 * Build selector candidates (ported from buildNoTextCandidates and buildTextCandidates)
 */
function buildCandidates(element, testIdAttributeName = 'data-testid') {
    const candidates = [];
    const tagName = element.nodeName;

    // ============ NO-TEXT CANDIDATES (from buildNoTextCandidates) ============

    // 1. Test ID attributes - highest priority
    const testIdAttrs = ['data-testid', 'data-test-id', 'data-test'];
    for (const attr of testIdAttrs) {
        const value = element.getAttribute(attr);
        if (value) {
            const score = attr === testIdAttributeName ? kTestIdScore : kOtherTestIdScore;
            candidates.push({
                method: 'getByTestId',
                testId: value,
                score
            });
        }
    }

    // 2. Placeholder (for INPUT/TEXTAREA)
    if (tagName === 'INPUT' || tagName === 'TEXTAREA') {
        const placeholder = element.placeholder;
        if (placeholder) {
            candidates.push({
                method: 'getByPlaceholder',
                placeholder,
                score: kPlaceholderScore
            });
        }
    }

    // 3. Labels
    const labels = getElementLabels(element);
    for (const label of labels) {
        if (label.normalized) {
            candidates.push({
                method: 'getByLabel',
                label: label.normalized,
                score: kLabelScore
            });
        }
    }

    // 4. ARIA role without name
    const ariaRole = getAriaRole(element);
    if (ariaRole && !['none', 'presentation'].includes(ariaRole)) {
        candidates.push({
            method: 'getByRole',
            role: ariaRole,
            score: kRoleWithoutNameScore
        });
    }

    // 5. CSS ID (if not GUID-like)
    const idAttr = element.getAttribute('id');
    if (idAttr && !isGuidLike(idAttr)) {
        candidates.push({
            method: 'locator',
            selector: `#${CSS.escape(idAttr)}`,
            score: kCSSIdScore
        });
    }

    // 6. Input type/name selectors
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tagName) && element.getAttribute('type') !== 'hidden') {
        const name = element.getAttribute('name');
        if (name) {
            candidates.push({
                method: 'locator',
                selector: `${tagName.toLowerCase()}[name="${CSS.escape(name)}"]`,
                score: kCSSInputTypeNameScore
            });
        }
        const type = element.getAttribute('type');
        if (type && tagName === 'INPUT') {
            candidates.push({
                method: 'locator',
                selector: `input[type="${CSS.escape(type)}"]`,
                score: kCSSInputTypeNameScore
            });
        }
    }

    // ============ TEXT CANDIDATES (from buildTextCandidates) ============

    // 7. Title attribute
    const title = element.getAttribute('title');
    if (title) {
        candidates.push({
            method: 'getByTitle',
            title,
            score: kTitleScore
        });
    }

    // 8. Alt text (for images)
    const alt = element.getAttribute('alt');
    if (alt && ['APPLET', 'AREA', 'IMG', 'INPUT'].includes(tagName)) {
        candidates.push({
            method: 'getByAltText',
            alt,
            score: kAltTextScore
        });
    }

    // 9. Text content
    const text = elementText(element);
    if (text.normalized && text.normalized.length <= 80) {
        candidates.push({
            method: 'getByText',
            text: text.normalized,
            score: kTextScore
        });
    }

    // 10. Role with accessible name (highest priority after testId)
    if (ariaRole && !['none', 'presentation'].includes(ariaRole)) {
        const ariaName = getElementAccessibleName(element);
        // Filter out icon font characters
        if (ariaName && !/^[\uE000-\uF8FF]+$/.test(ariaName)) {
            candidates.push({
                method: 'getByRole',
                role: ariaRole,
                name: ariaName,
                score: kRoleWithNameScore
            });
        }
    }

    // 11. CSS tag name fallback
    candidates.push({
        method: 'locator',
        selector: tagName.toLowerCase(),
        score: kCSSTagNameScore
    });

    return candidates;
}

/**
 * Get the best Playwright selector for an element
 * Returns object with method and params
 */
export function getPlaywrightSelector(element) {
    if (!element) {
        return { method: 'locator', selector: '*' };
    }

    // Build all candidates
    const candidates = buildCandidates(element);

    // Sort by score (lower is better)
    candidates.sort((a, b) => a.score - b.score);

    // Return the best candidate (remove the score property)
    const best = candidates[0];
    const { score, ...result } = best;
    return result;
}

// Keep backward compatibility with old function name
export function getPlaywrightMethod(element) {
    const selector = getPlaywrightSelector(element);
    return selector.method;
}
