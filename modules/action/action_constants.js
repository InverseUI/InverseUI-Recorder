// Action type constants for recording - synchronized with actual implementations
// Each constant includes implementation details and handler mappings

/**
 * MOUSE ACTIONS
 * Implemented in: action/mouse_actions.js
 * Handles: clicks, double-clicks, hover, drag & drop, context menu
 */
export const MOUSE_ACTIONS = {
    // Basic mouse interactions
    CLICK: "CLICK",                           // Handler: onClick -> CLICK
    DOUBLE_CLICK: "DOUBLE_CLICK",             // Handler: onDblClick -> DOUBLE_CLICK
    CONTEXT_MENU: "CONTEXT_MENU",             // Handler: onContextMenuClick -> CLICK (button: 2)

    // Mouse movement
    MOUSE_MOVE: "MOUSE_MOVE",                 // Handler: onMouseMove (during drag)
    
    // Drag and drop operations
    DRAG_START: "DRAG_START",                 // Handler: onDragStart -> DRAG_START
    DRAG_END: "DRAG_END",                     // Handler: onDragEnd -> DRAG_END
    DRAG_ENTER: "DRAG_ENTER",                 // Handler: onDragEnter -> DRAG_ENTER
    DRAG_LEAVE: "DRAG_LEAVE",                 // Handler: onDragLeave -> DRAG_LEAVE
    DROP: "DROP"                              // Handler: onDrop -> DROP
};

/**
 * KEYBOARD ACTIONS
 * Implemented in: action/keyboard_actions.js
 * Handles: key presses, shortcuts, navigation keys
 */
export const KEYBOARD_ACTIONS = {
    KEY_PRESS: "KEY_PRESS"                    // Handler: onKeyDown -> KEY_PRESS
};

/**
 * FORM ACTIONS
 * Implemented in: action/form_actions.js
 * Handles: form inputs, changes, submission
 */
export const FORM_ACTIONS = {
    // Essential form events for Selenium automation
    SET: "SET",                               // Handler: onChange -> SET (field value changes)
    
    // Text selection
    SELECT: "SELECT",                         // Handler: onSelect
    
    // Form submission
    SUBMIT: "SUBMIT",                         // Handler: onSubmit
    RESET: "RESET",                           // Handler: onReset
    
    // Validation
    INVALID: "INVALID"                        // Handler: onInvalid
};

/**
 * CLIPBOARD ACTIONS
 * Implemented in: action/clipboard_actions.js
 * Handles: copy, cut, paste, selection changes
 */
export const CLIPBOARD_ACTIONS = {
    COPY: "COPY",                             // Handler: onCopy -> COPY
    CUT: "CUT",                               // Handler: onCut -> CUT
    PASTE: "PASTE",                           // Handler: onPaste -> PASTE
    SELECTION_CHANGE: "SELECTION_CHANGE"      // Handler: onSelectionChange -> SELECTION_CHANGE
};

/**
 * WINDOW ACTIONS
 * Implemented in: action/window_actions.js
 * Handles: window events, scrolling, navigation, document lifecycle
 */
export const WINDOW_ACTIONS = {
    // Window management
    WINDOW_RESIZE: "WINDOW_RESIZE",           // Handler: onWindowResize -> WINDOW_RESIZE
    FULLSCREEN_CHANGE: "FULLSCREEN_CHANGE",   // Handler: onFullscreenChange -> FULLSCREEN_CHANGE

    // Scrolling
    SCROLL: "SCROLL",                         // Handler: onScroll -> SCROLL (legacy)
    WINDOW_SCROLL: "WINDOW_SCROLL",           // Handler: onWindowScroll -> WINDOW_SCROLL
    ELEMENT_SCROLL: "ELEMENT_SCROLL",         // Handler: onElementScroll -> ELEMENT_SCROLL
    
    // Navigation
    GO_TO_URL: "GO_TO_URL",                   // Navigation events
    POPSTATE: "POPSTATE"                      // Handler: onPopState -> POPSTATE
};



/**
 * ASSERTION ACTIONS
 * Implemented in: util/element_utils.js (ElementAssertions)
 * Handles: test success conditions and element assertions
 */
export const ASSERTION_ACTIONS = {
    SUCCESS_CONDITION_EQUALS: "SUCCESS_CONDITION_EQUALS",       // Element text equals expected
    SUCCESS_CONDITION_CONTAINS: "SUCCESS_CONDITION_CONTAINS",   // Element text contains expected
    SUCCESS_CONDITION_EXISTS: "SUCCESS_CONDITION_EXISTS",       // Element exists
    SUCCESS_CONDITION_VISIBLE: "SUCCESS_CONDITION_VISIBLE"      // Element is visible
};


/**
 * CONSOLIDATED ACTION_TYPES for backward compatibility
 * This maintains the original ACTION_TYPES export while organizing by category
 */
export const ACTION_TYPES = {
    // Mouse actions
    ...MOUSE_ACTIONS,
    
    // Keyboard actions
    ...KEYBOARD_ACTIONS,
    
    // Form actions
    ...FORM_ACTIONS,
    
    // Clipboard actions
    ...CLIPBOARD_ACTIONS,
    
    // Window actions
    ...WINDOW_ACTIONS,
    
    
    
    // Assertion actions
    ...ASSERTION_ACTIONS
};

/**
 * ACTION CATEGORIES for organization and filtering
 */
export const ACTION_CATEGORIES = {
    MOUSE: 'MOUSE',
    KEYBOARD: 'KEYBOARD', 
    FORM: 'FORM',
    CLIPBOARD: 'CLIPBOARD',
    WINDOW: 'WINDOW',
    ASSERTION: 'ASSERTION'
};


/**
 * Implementation file mapping for each action category
 */
export const IMPLEMENTATION_FILES = {
    [ACTION_CATEGORIES.MOUSE]: 'modules/action/mouse_actions.js',
    [ACTION_CATEGORIES.KEYBOARD]: 'modules/action/keyboard_actions.js',
    [ACTION_CATEGORIES.FORM]: 'modules/action/form_actions.js',
    [ACTION_CATEGORIES.CLIPBOARD]: 'modules/action/clipboard_actions.js',
    [ACTION_CATEGORIES.WINDOW]: 'modules/action/window_actions.js',
    [ACTION_CATEGORIES.ASSERTION]: 'util/dom_utils.js'
};

/**
 * Background message handler mapping
 * Maps content script messages to background script handlers and resulting action types
 */
export const MESSAGE_HANDLER_MAPPING = {
    // Mouse event handlers
    'onClick': {
        actionType: ACTION_TYPES.CLICK,
        category: ACTION_CATEGORIES.MOUSE,
        handler: (request) => ({
            browserAction: ACTION_TYPES.CLICK,
            xpath: request.xPath,
            button: request.button,
            coordinates: request.coordinates,
            content: request.content,
            dropdown: request.dropdown  // Include dropdown data if present
        })
    },
    'onDblClick': { 
        actionType: ACTION_TYPES.DOUBLE_CLICK, 
        category: ACTION_CATEGORIES.MOUSE,
        handler: (request) => ({
            browserAction: ACTION_TYPES.DOUBLE_CLICK,
            xpath: request.xPath,
            coordinates: request.coordinates,
            content: request.content
        })
    },
    'onContextMenuClick': { 
        actionType: ACTION_TYPES.CLICK, 
        category: ACTION_CATEGORIES.MOUSE,
        handler: (request) => ({
            browserAction: ACTION_TYPES.CLICK,
            xpath: request.xPath,
            button: 2,  // Right click
            coordinates: request.coordinates,
            content: request.content
        })
    },
    'onDragStart': { 
        actionType: ACTION_TYPES.DRAG_START, 
        category: ACTION_CATEGORIES.MOUSE,
        handler: (request) => ({
            browserAction: ACTION_TYPES.DRAG_START,
            xpath: request.xPath,
            coordinates: request.coordinates,
            dataTransfer: request.dataTransfer
        })
    },
    'onDragEnd': { 
        actionType: ACTION_TYPES.DRAG_END, 
        category: ACTION_CATEGORIES.MOUSE,
        handler: (request) => ({
            browserAction: ACTION_TYPES.DRAG_END,
            xpath: request.xPath,
            dropEffect: request.dropEffect
        })
    },
    'onDragEnter': { 
        actionType: ACTION_TYPES.DRAG_ENTER, 
        category: ACTION_CATEGORIES.MOUSE,
        handler: (request) => ({
            browserAction: ACTION_TYPES.DRAG_ENTER,
            xpath: request.xPath
        })
    },
    'onDragLeave': { 
        actionType: ACTION_TYPES.DRAG_LEAVE, 
        category: ACTION_CATEGORIES.MOUSE,
        handler: (request) => ({
            browserAction: ACTION_TYPES.DRAG_LEAVE,
            xpath: request.xPath
        })
    },
    'onDrop': { 
        actionType: ACTION_TYPES.DROP, 
        category: ACTION_CATEGORIES.MOUSE,
        handler: (request) => ({
            browserAction: ACTION_TYPES.DROP,
            xpath: request.xPath,
            dragStartData: request.dragStartData,
            dataTransfer: request.dataTransfer
        })
    },
    'onMouseMove': { 
        actionType: ACTION_TYPES.MOUSE_MOVE, 
        category: ACTION_CATEGORIES.MOUSE,
        handler: (request) => ({
            browserAction: ACTION_TYPES.MOUSE_MOVE,
            coordinates: request.coordinates,
            isDragging: request.isDragging
        })
    },
    
    // Keyboard event handlers
    'onKeyDown': { 
        actionType: ACTION_TYPES.KEY_PRESS, 
        category: ACTION_CATEGORIES.KEYBOARD,
        handler: (request) => {
            // Only process special keys, shortcuts, or navigation keys
            if (request.isSpecialKey || request.isShortcut || request.isNavigation) {
                return {
                    browserAction: ACTION_TYPES.KEY_PRESS,
                    xpath: request.xPath,
                    key: request.key,
                    keyCombo: request.keyCombo,
                    isSpecialKey: request.isSpecialKey,
                    isShortcut: request.isShortcut,
                    isNavigation: request.isNavigation,
                    targetType: request.target.type,
                    targetTagName: request.target.tagName
                };
            }
            return null; // Skip non-special keys
        }
    },
    // Form event handlers (essential for Selenium automation)
    'onChange': {
        actionType: ACTION_TYPES.SET,
        category: ACTION_CATEGORIES.FORM,
        handler: (request) => ({
            browserAction: ACTION_TYPES.SET,
            xpath: request.xPath,
            content: request.content,
            checked: request.checked,
            value: request.value,
            selectedOptions: request.selectedOptions,
            files: request.files,
            fieldInfo: request.fieldInfo,
            dropdown: request.dropdown  // Include dropdown data if present
        })
    },
    'onSelect': { 
        actionType: ACTION_TYPES.SELECT, 
        category: ACTION_CATEGORIES.FORM,
        handler: (request) => ({
            browserAction: ACTION_TYPES.SELECT,
            xpath: request.xPath,
            selection: request.selection
        })
    },
    'onSubmit': { 
        actionType: ACTION_TYPES.SUBMIT, 
        category: ACTION_CATEGORIES.FORM,
        handler: (request) => ({
            browserAction: ACTION_TYPES.SUBMIT,
            xpath: request.xPath,
            formData: request.formData,
            action: request.action,
            method: request.method,
            target: request.target,
            enctype: request.enctype
        })
    },
    'onReset': { 
        actionType: ACTION_TYPES.RESET, 
        category: ACTION_CATEGORIES.FORM,
        handler: (request) => ({
            browserAction: ACTION_TYPES.RESET,
            xpath: request.xPath
        })
    },
    'onInvalid': { 
        actionType: ACTION_TYPES.INVALID, 
        category: ACTION_CATEGORIES.FORM,
        handler: (request) => ({
            browserAction: ACTION_TYPES.INVALID,
            xpath: request.xPath,
            fieldInfo: request.fieldInfo,
            validationMessage: request.validationMessage
        })
    },
    
    // Clipboard event handlers
    'onCopy': { 
        actionType: ACTION_TYPES.COPY, 
        category: ACTION_CATEGORIES.CLIPBOARD,
        handler: (request) => ({
            browserAction: ACTION_TYPES.COPY,
            xpath: request.xPath,
            clipboardData: request.clipboardData,
            targetInfo: request.targetInfo
        })
    },
    'onCut': { 
        actionType: ACTION_TYPES.CUT, 
        category: ACTION_CATEGORIES.CLIPBOARD,
        handler: (request) => ({
            browserAction: ACTION_TYPES.CUT,
            xpath: request.xPath,
            clipboardData: request.clipboardData,
            targetInfo: request.targetInfo
        })
    },
    'onPaste': { 
        actionType: ACTION_TYPES.PASTE, 
        category: ACTION_CATEGORIES.CLIPBOARD,
        handler: (request) => ({
            browserAction: ACTION_TYPES.PASTE,
            xpath: request.xPath,
            pasteData: request.pasteData,
            targetInfo: request.targetInfo
        })
    },
    'onSelectionChange': { 
        actionType: ACTION_TYPES.SELECTION_CHANGE, 
        category: ACTION_CATEGORIES.CLIPBOARD,
        handler: (request) => ({
            browserAction: ACTION_TYPES.SELECTION_CHANGE,
            xpath: request.xPath,
            selection: request.selection
        })
    },
    
    // Window event handlers
    'onWindowResize': { 
        actionType: ACTION_TYPES.WINDOW_RESIZE, 
        category: ACTION_CATEGORIES.WINDOW,
        handler: (request) => ({
            browserAction: ACTION_TYPES.WINDOW_RESIZE,
            previousSize: request.previousSize,
            newSize: request.newSize,
            screen: request.screen
        })
    },
    'onWindowScroll': { 
        actionType: ACTION_TYPES.WINDOW_SCROLL, 
        category: ACTION_CATEGORIES.WINDOW,
        handler: (request) => ({
            browserAction: ACTION_TYPES.WINDOW_SCROLL,
            scrollPosition: request.scrollPosition,
            documentSize: request.documentSize,
            viewportSize: request.viewportSize
        })
    },
    'onElementScroll': { 
        actionType: ACTION_TYPES.ELEMENT_SCROLL, 
        category: ACTION_CATEGORIES.WINDOW,
        handler: (request) => ({
            browserAction: ACTION_TYPES.ELEMENT_SCROLL,
            xpath: request.xPath,
            scrollPosition: request.scrollPosition,
            scrollSize: request.scrollSize,
            clientSize: request.clientSize
        })
    },
    'onScroll': { 
        actionType: ACTION_TYPES.SCROLL, 
        category: ACTION_CATEGORIES.WINDOW,
        handler: (request) => ({
            browserAction: ACTION_TYPES.SCROLL,
            xpath: request.xPath,
            top: request.top,
            left: request.left
        })
    },
    'onFullscreenChange': { 
        actionType: ACTION_TYPES.FULLSCREEN_CHANGE, 
        category: ACTION_CATEGORIES.WINDOW,
        handler: (request) => ({
            browserAction: ACTION_TYPES.FULLSCREEN_CHANGE,
            isFullscreen: request.isFullscreen,
            elementXPath: request.elementXPath
        })
    },
    'onPopState': { 
        actionType: ACTION_TYPES.POPSTATE, 
        category: ACTION_CATEGORIES.WINDOW,
        handler: (request) => ({
            browserAction: ACTION_TYPES.POPSTATE,
            url: request.url,
            state: request.state,
            timestamp: request.timestamp
        })
    }
};

// Import configuration constants
import {
    DEBOUNCER_TIME,
    SELECTION_CHANGE_DEBOUNCE,
    POINTER_MOVE_DEBOUNCE,
    WINDOW_RESIZE_DEBOUNCE
} from './config.js';

// Re-export for backward compatibility
export {
    DEBOUNCER_TIME,
    SELECTION_CHANGE_DEBOUNCE,
    POINTER_MOVE_DEBOUNCE,
    WINDOW_RESIZE_DEBOUNCE
};