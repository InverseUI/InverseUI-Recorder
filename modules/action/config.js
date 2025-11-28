/**
 * InverseUI Chrome Extension Configuration
 * Only contains settings that are actually used in the codebase
 */

// Event debouncing timeouts (in milliseconds)
export const DEBOUNCER_TIME = 100;
export const SELECTION_CHANGE_DEBOUNCE = 500;
export const POINTER_MOVE_DEBOUNCE = 100;
export const WINDOW_RESIZE_DEBOUNCE = 500;


/**
 * REACTIVE DROPDOWN DETECTION CONFIGURATION
 *
 * These settings control the behavior of the reactive dropdown detection system.
 * Detection happens at CLICK TIME by analyzing backwards, not by predicting forward.
 */

// Detection confidence scores (higher = more reliable)
export const DROPDOWN_CONFIDENCE = {
    NATIVE: 1.0,              // Native <select> elements (always 100% accurate)
    ARIA: 0.95,               // ARIA combobox/listbox patterns (very high confidence)
    HEURISTIC: 0.85,          // Heuristic detection with recent trigger correlation
    HEURISTIC_NO_TRIGGER: 0.7 // Heuristic detection without trigger correlation
};

// How far back to look for recent input interactions (milliseconds)
// If user typed in an input more than this long ago, we won't correlate it with a popup
export const RECENT_INTERACTION_TIMEOUT = 5000;  // 5 seconds

// Geometric proximity settings for correlating popups with triggers
export const GEOMETRIC_PROXIMITY = {
    // Minimum horizontal overlap ratio (0.3 = 30% of smaller element's width)
    MIN_HORIZONTAL_OVERLAP_RATIO: 0.3,

    // Maximum vertical gap between trigger and popup (pixels)
    MAX_VERTICAL_GAP: 200
};

// CSS selectors for identifying popup containers
export const POPUP_SELECTORS = [
    '[role="listbox"]',
    '[role="menu"]',
    '[role="dialog"]',
    '[class*="dropdown"]',
    '[class*="menu"]',
    '[class*="popup"]',
    '[class*="popper"]',
    '[class*="autocomplete"]',
    '[class*="suggest"]',
    '[class*="options"]',
    '[class*="listbox"]'
];

// CSS selectors for identifying option elements
export const OPTION_SELECTORS = [
    '[role="option"]',
    '[role="menuitem"]',
    '[class*="option"]',
    '[class*="item"]',
    '[class*="suggestion"]',
    '[class*="result"]',
    'li'
];

// ARIA roles that indicate a popup container
export const POPUP_ARIA_ROLES = [
    'menu',
    'listbox',
    'dialog',
    'combobox'
];

// ARIA roles that indicate an option element
export const OPTION_ARIA_ROLES = [
    'option',
    'menuitem',
    'treeitem'
];

// ARIA roles for popup parent containers (used in ARIA detection)
export const POPUP_PARENT_ROLES = [
    'listbox',
    'menu',
    'tree',
    'grid',
    'dialog'
];
