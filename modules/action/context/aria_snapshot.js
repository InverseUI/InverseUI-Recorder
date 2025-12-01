/**
 * ARIA Snapshot Generator - Based on Playwright's ariaSnapshot.ts
 * Generates AI-optimized DOM snapshots with element references
 *
 * Key differences from original:
 * - Uses 'fragment' as root wrapper (never returns arrays)
 * - Uses 'generic' as default role for AI mode
 * - Normalizes generic roles and string children after generation
 */

export class AriaSnapshotGenerator {
  constructor() {
    this.lastRef = 0;
    this.elements = new Map();
    this.refs = new Map();
    this.targetRef = null;
    this._targetElement = null;
  }

  /**
   * Generate ARIA snapshot for a specific element and its context
   * @param {Element} targetElement - The clicked/interacted element
   */
  generateForElement(targetElement) {
    // Reset state
    this.lastRef = 0;
    this.elements = new Map();
    this.refs = new Map();
    this.targetRef = null;
    this._targetElement = targetElement;

    // Find the question/field container (parent context)
    const container = this.findContextContainer(targetElement);

    // Create fragment root (like Playwright)
    const root = {
      role: 'fragment',
      name: '',
      children: [],
      element: container,
      props: {}
    };

    // Visit the container and build tree
    this.visit(root, container, true);

    // Normalize the tree (like Playwright)
    this.normalizeStringChildren(root);
    this.normalizeGenericRoles(root);

    return {
      yaml: this.renderAriaTree(root),
      elements: this.elements,
      targetRef: this.targetRef
    };
  }

  /**
   * Find the container that provides context (question text, options, etc.)
   */
  findContextContainer(element) {
    // Look for common form field containers
    const container = element.closest(
      '[class*="question"], [class*="field"], [class*="form-group"], ' +
      'fieldset, [role="group"], [role="radiogroup"], ' +
      'label, form > div, section'
    );

    // If no container found, go up 3 levels
    if (!container) {
      let parent = element;
      for (let i = 0; i < 3 && parent.parentElement; i++) {
        parent = parent.parentElement;
      }
      return parent;
    }

    return container;
  }

  /**
   * Visit a node and add it to the tree
   */
  visit(ariaNode, node, parentVisible) {
    if (!node) return;

    // Handle text nodes
    if (node.nodeType === Node.TEXT_NODE && node.nodeValue) {
      if (!parentVisible) return;
      const text = node.nodeValue;
      if (ariaNode.role !== 'textbox' && text) {
        ariaNode.children.push(text);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node;
    const visible = parentVisible && !this.isElementHidden(element);

    // Create aria node for this element
    const childAriaNode = visible ? this.toAriaNode(element) : null;

    if (childAriaNode) {
      if (childAriaNode.ref) {
        this.elements.set(childAriaNode.ref, element);
        this.refs.set(element, childAriaNode.ref);
      }
      ariaNode.children.push(childAriaNode);
    }

    // Process children into either the new node or current node
    this.processChildren(childAriaNode || ariaNode, element, visible);
  }

  /**
   * Process element's children
   */
  processChildren(ariaNode, element, parentVisible) {
    // Add spacing for block elements
    const style = window.getComputedStyle(element);
    const display = style?.display || 'inline';
    const isBlock = display !== 'inline' || element.nodeName === 'BR';

    if (isBlock) ariaNode.children.push(' ');

    // Visit child nodes
    for (let child = element.firstChild; child; child = child.nextSibling) {
      this.visit(ariaNode, child, parentVisible);
    }

    // Handle shadow DOM
    if (element.shadowRoot) {
      for (let child = element.shadowRoot.firstChild; child; child = child.nextSibling) {
        this.visit(ariaNode, child, parentVisible);
      }
    }

    if (isBlock) ariaNode.children.push(' ');

    // Remove duplicate name in children
    if (ariaNode.children.length === 1 && ariaNode.name === ariaNode.children[0]) {
      ariaNode.children = [];
    }

    // Extract properties
    if (ariaNode.role === 'link' && element.hasAttribute('href')) {
      ariaNode.props['url'] = element.getAttribute('href');
    }
    if (ariaNode.role === 'textbox' && element.hasAttribute('placeholder')) {
      ariaNode.props['placeholder'] = element.getAttribute('placeholder');
    }
  }

  /**
   * Check if element is hidden
   */
  isElementHidden(element) {
    if (element.getAttribute('aria-hidden') === 'true') return true;
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return true;
    return false;
  }

  /**
   * Convert element to AriaNode
   */
  toAriaNode(element) {
    // Get role (use 'generic' as default for AI mode)
    const role = this.getAriaRole(element) || 'generic';

    // Skip presentation/none roles
    if (role === 'presentation' || role === 'none') return null;

    // Get accessible name
    const name = this.getAccessibleName(element);

    // Check visibility and interactivity
    const rect = element.getBoundingClientRect();
    const visible = rect.width > 0 && rect.height > 0;
    const receivesPointerEvents = this.receivesPointerEvents(element);
    const style = window.getComputedStyle(element);

    // Skip inline generic with single text node
    if (role === 'generic' && style.display === 'inline' &&
        element.childNodes.length === 1 &&
        element.childNodes[0].nodeType === Node.TEXT_NODE) {
      return null;
    }

    const node = {
      role,
      name: this.normalizeWhitespace(name),
      children: [],
      element,
      props: {},
      visible,
      receivesPointerEvents,
      cursor: style.cursor
    };

    // Assign ref to interactive elements
    if (visible && receivesPointerEvents) {
      node.ref = 'e' + (++this.lastRef);

      // Track target element
      if (element === this._targetElement) {
        this.targetRef = node.ref;
      }
    }

    // Extract ARIA states
    this.extractAriaStates(node, element, role);

    // Handle input values
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      if (element.type !== 'checkbox' && element.type !== 'radio' && element.type !== 'file') {
        node.children = [element.value];
      }
    }

    return node;
  }

  /**
   * Get ARIA role for element
   */
  getAriaRole(element) {
    // Explicit role first
    const explicit = element.getAttribute('role');
    if (explicit) return explicit;

    // Implicit role mapping
    const tagName = element.tagName;
    switch (tagName) {
      case 'BUTTON': return 'button';
      case 'A': return element.hasAttribute('href') ? 'link' : null;
      case 'INPUT': return this.getInputRole(element);
      case 'SELECT': return element.multiple || element.size > 1 ? 'listbox' : 'combobox';
      case 'TEXTAREA': return 'textbox';
      case 'OPTION': return 'option';
      case 'OPTGROUP': return 'group';
      case 'LI': return 'listitem';
      case 'UL': case 'OL': case 'MENU': return 'list';
      case 'H1': case 'H2': case 'H3': case 'H4': case 'H5': case 'H6': return 'heading';
      case 'TABLE': return 'table';
      case 'TR': return 'row';
      case 'TH': return 'columnheader';
      case 'TD': return 'cell';
      case 'DIALOG': return 'dialog';
      case 'NAV': return 'navigation';
      case 'MAIN': return 'main';
      case 'ASIDE': return 'complementary';
      case 'ARTICLE': return 'article';
      case 'SECTION': return element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby') ? 'region' : null;
      case 'FORM': return element.hasAttribute('aria-label') || element.hasAttribute('aria-labelledby') ? 'form' : null;
      case 'IMG': return element.getAttribute('alt') === '' ? 'presentation' : 'img';
      case 'FIELDSET': return 'group';
      case 'LABEL': return null; // Labels are processed for accessible name, not as roles
      case 'PROGRESS': return 'progressbar';
      case 'METER': return 'meter';
      default: return null;
    }
  }

  /**
   * Get role for input element
   */
  getInputRole(input) {
    const type = (input.type || 'text').toLowerCase();
    switch (type) {
      case 'checkbox': return 'checkbox';
      case 'radio': return 'radio';
      case 'range': return 'slider';
      case 'number': return 'spinbutton';
      case 'search': return input.hasAttribute('list') ? 'combobox' : 'searchbox';
      case 'email': case 'tel': case 'text': case 'url': case 'password':
        const list = input.getAttribute('list');
        if (list && document.getElementById(list)?.tagName === 'DATALIST') {
          return 'combobox';
        }
        return 'textbox';
      case 'hidden': return null;
      case 'button': case 'submit': case 'reset': case 'image': return 'button';
      default: return 'textbox';
    }
  }

  /**
   * Get accessible name for element
   */
  getAccessibleName(element) {
    // 1. aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const text = labelledBy.split(/\s+/)
        .map(id => document.getElementById(id)?.textContent)
        .filter(Boolean)
        .join(' ');
      if (text) return text;
    }

    // 2. aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    // 3. Associated label (for inputs)
    if (element.id) {
      const label = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
      if (label) return label.textContent?.trim() || '';
    }

    // 4. Enclosing label
    const enclosingLabel = element.closest('label');
    if (enclosingLabel && enclosingLabel !== element) {
      const clone = enclosingLabel.cloneNode(true);
      clone.querySelectorAll('input, select, textarea, button').forEach(el => el.remove());
      const text = clone.textContent?.trim();
      if (text) return text;
    }

    // 5. Title/placeholder/alt
    if (element.title) return element.title.trim();
    if (element.placeholder) return element.placeholder.trim();
    if (element.alt) return element.alt.trim();

    // 6. Text content for buttons, links, headings
    const role = this.getAriaRole(element);
    if (['button', 'link', 'heading', 'tab', 'menuitem', 'option'].includes(role)) {
      return element.textContent?.trim() || '';
    }

    return '';
  }

  /**
   * Check if element receives pointer events
   */
  receivesPointerEvents(element) {
    const style = window.getComputedStyle(element);
    if (style.pointerEvents === 'none') return false;

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return false;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    if (centerX < 0 || centerY < 0 ||
        centerX > window.innerWidth || centerY > window.innerHeight) {
      return false;
    }

    const topElement = document.elementFromPoint(centerX, centerY);
    return topElement === element || element.contains(topElement);
  }

  /**
   * Extract ARIA states
   */
  extractAriaStates(node, element, role) {
    // Checked
    if (['checkbox', 'radio', 'switch', 'menuitemcheckbox', 'menuitemradio'].includes(role)) {
      const ariaChecked = element.getAttribute('aria-checked');
      if (ariaChecked === 'true') node.checked = true;
      else if (ariaChecked === 'mixed') node.checked = 'mixed';
      else if (element.checked !== undefined) node.checked = element.checked;
    }

    // Disabled
    if (element.disabled || element.getAttribute('aria-disabled') === 'true') {
      node.disabled = true;
    }

    // Expanded
    const expanded = element.getAttribute('aria-expanded');
    if (expanded) node.expanded = expanded === 'true';

    // Selected
    if (['option', 'tab', 'treeitem', 'gridcell', 'row'].includes(role)) {
      const selected = element.getAttribute('aria-selected');
      if (selected === 'true') node.selected = true;
      else if (element.selected) node.selected = true;
    }

    // Pressed
    const pressed = element.getAttribute('aria-pressed');
    if (pressed === 'true') node.pressed = true;
    else if (pressed === 'mixed') node.pressed = 'mixed';

    // Level (for headings)
    if (role === 'heading') {
      node.level = parseInt(element.tagName[1]) || 1;
    }
  }

  /**
   * Normalize string children (combine adjacent text nodes)
   */
  normalizeStringChildren(rootNode) {
    const visit = (ariaNode) => {
      const normalizedChildren = [];
      const buffer = [];

      const flush = () => {
        if (buffer.length) {
          const text = this.normalizeWhitespace(buffer.join(''));
          if (text) normalizedChildren.push(text);
          buffer.length = 0;
        }
      };

      for (const child of ariaNode.children || []) {
        if (typeof child === 'string') {
          buffer.push(child);
        } else {
          flush();
          visit(child);
          normalizedChildren.push(child);
        }
      }
      flush();

      ariaNode.children = normalizedChildren;

      // Remove children if it's just the name repeated
      if (ariaNode.children.length === 1 && ariaNode.children[0] === ariaNode.name) {
        ariaNode.children = [];
      }
    };

    visit(rootNode);
  }

  /**
   * Normalize generic roles (remove unnecessary wrappers)
   */
  normalizeGenericRoles(node) {
    const normalizeChildren = (ariaNode) => {
      const result = [];

      for (const child of ariaNode.children || []) {
        if (typeof child === 'string') {
          result.push(child);
          continue;
        }
        const normalized = normalizeChildren(child);
        result.push(...normalized);
      }

      // Remove generic wrappers that only contain one ref-able element
      const removeSelf = ariaNode.role === 'generic' &&
                         !ariaNode.name &&
                         result.length <= 1 &&
                         result.every(c => typeof c !== 'string' && !!c.ref);

      if (removeSelf) return result;

      ariaNode.children = result;
      return [ariaNode];
    };

    normalizeChildren(node);
  }

  /**
   * Normalize whitespace
   */
  normalizeWhitespace(text) {
    return (text || '').replace(/\s+/g, ' ').trim();
  }

  /**
   * Render the aria tree to YAML format
   */
  renderAriaTree(root) {
    const lines = [];

    // Don't render the fragment itself, just its children
    const nodesToRender = root.role === 'fragment' ? root.children : [root];

    const visitText = (text, indent) => {
      const trimmed = text.trim();
      if (trimmed && trimmed.length <= 200) {
        lines.push(`${indent}- text: "${this.escapeYaml(trimmed)}"`);
      }
    };

    const visit = (ariaNode, indent) => {
      // Build the key
      let key = ariaNode.role;

      // Add name
      if (ariaNode.name && ariaNode.name.length <= 100) {
        key += ` "${this.escapeYaml(ariaNode.name)}"`;
      }

      // Add states
      if (ariaNode.checked === true) key += ' [checked]';
      if (ariaNode.checked === 'mixed') key += ' [checked=mixed]';
      if (ariaNode.disabled) key += ' [disabled]';
      if (ariaNode.expanded === true) key += ' [expanded]';
      if (ariaNode.expanded === false) key += ' [collapsed]';
      if (ariaNode.selected) key += ' [selected]';
      if (ariaNode.pressed === true) key += ' [pressed]';
      if (ariaNode.pressed === 'mixed') key += ' [pressed=mixed]';
      if (ariaNode.level) key += ` [level=${ariaNode.level}]`;

      // Add ref and cursor
      if (ariaNode.ref) {
        key += ` [ref=${ariaNode.ref}]`;
        if (ariaNode.cursor === 'pointer') {
          key += ' [cursor=pointer]';
        }
      }

      // Render based on children
      if (!ariaNode.children?.length && !Object.keys(ariaNode.props || {}).length) {
        // Leaf node
        lines.push(`${indent}- ${key}`);
      } else if (ariaNode.children?.length === 1 && typeof ariaNode.children[0] === 'string') {
        // Single text child - inline it
        const text = ariaNode.children[0];
        if (text.length <= 100) {
          lines.push(`${indent}- ${key}: "${this.escapeYaml(text)}"`);
        } else {
          lines.push(`${indent}- ${key}`);
        }
      } else {
        // Node with children
        lines.push(`${indent}- ${key}:`);

        // Render props
        for (const [name, value] of Object.entries(ariaNode.props || {})) {
          lines.push(`${indent}  - /${name}: "${this.escapeYaml(value)}"`);
        }

        // Render children
        for (const child of ariaNode.children || []) {
          if (typeof child === 'string') {
            visitText(child, indent + '  ');
          } else {
            visit(child, indent + '  ');
          }
        }
      }
    };

    for (const node of nodesToRender) {
      if (typeof node === 'string') {
        visitText(node, '');
      } else {
        visit(node, '');
      }
    }

    return lines.join('\n');
  }

  /**
   * Escape YAML special characters
   */
  escapeYaml(str) {
    return (str || '').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
}

// Export singleton instance
export const ariaSnapshotGenerator = new AriaSnapshotGenerator();
