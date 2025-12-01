import { ACTION_TYPES, DEBOUNCER_TIME } from '../modules/action/config/constants.js';

/**
 * Validate XPath and clean it up if needed
 * Note: This function would need to be called from content script context
 * since background scripts don't have access to document
 */
export function validateActionXPath(action) {
    // This is a background-safe validation that doesn't require DOM access
    if (!action.xpath) return action;
    
    const xpaths = Array.isArray(action.xpath) ? action.xpath : [action.xpath];
    
    // Clean up XPaths
    const cleanedXpaths = xpaths.map(xpath => {
        // Basic validation and cleanup
        if (typeof xpath !== 'string') return '';
        
        // Remove any extra whitespace
        xpath = xpath.trim();
        
        // Ensure XPath starts with / or //
        if (!xpath.startsWith('/') && !xpath.startsWith('(')) {
            xpath = '//' + xpath;
        }
        
        return xpath;
    }).filter(xpath => xpath.length > 0);
    
    return {
        ...action,
        xpath: cleanedXpaths
    };
}

/**
 * Compare two actions to determine if they should be deduplicated
 */
export function compareAction(a, b) {
    if (a !== undefined && b !== undefined) {
        switch (a.browserAction) {
          case ACTION_TYPES.GO_TO_URL:
            if (a.browserAction === ACTION_TYPES.GO_TO_URL && a.url === b.url && b.timestamp - a.timestamp <= DEBOUNCER_TIME) {
                return 0;
            } else {
                return 1;
            }
            break;

          case ACTION_TYPES.SCROLL:
            return 1;
            break;

          case ACTION_TYPES.WINDOW_RESIZE:
            if (a.browserAction === ACTION_TYPES.WINDOW_RESIZE && a.width === b.width && a.height === b.height && b.timestamp - a.timestamp <= DEBOUNCER_TIME) {
                return 0;
            } else {
                return 1;
            }
            break;

          case ACTION_TYPES.SUCCESS_CONDITION_EQUALS:
          case ACTION_TYPES.SUCCESS_CONDITION_CONTAINS:
            if (a.browserAction === b.browserAction) {
                return 0;
            } else {
                return 1;
            }
            break;
            
            
          case ACTION_TYPES.KEY_PRESS:
            // Don't deduplicate key presses - each one is important
            return 1;
            break;

          case ACTION_TYPES.MOUSE_ENTER:
          case ACTION_TYPES.MOUSE_LEAVE:
            // Deduplicate rapid mouse enter/leave on same element
            if (a.browserAction === b.browserAction && a.xpath[0] === b.xpath[0] && b.timestamp - a.timestamp <= DEBOUNCER_TIME) {
                return 0;
            } else {
                return 1;
            }
            break;
            
          case ACTION_TYPES.MOUSE_MOVE:
            // Always record mouse moves but this might need throttling
            return 1;
            break;
            
          case ACTION_TYPES.ELEMENT_SCROLL:
          case ACTION_TYPES.WINDOW_SCROLL:
            // Handle like regular scroll - keep only the last one
            return 1;
            break;
            
          case ACTION_TYPES.FULLSCREEN_CHANGE:
          case ACTION_TYPES.POPSTATE:
            // Don't deduplicate these important state changes
            return 1;
            break;

          default:
            if (a.browserAction === b.browserAction && a.xpath[0] === b.xpath[0] && a.content === b.content && b.timestamp - a.timestamp <= DEBOUNCER_TIME) {
                return 0;
            } else {
                return 1;
            }
            break;
        }
    } else {
        return 1;
    }
}

/**
 * Fix XPath double quote issues for Python string compatibility
 */
export function fixXpathDoubleQuoteIssues(xpathString) {
    // avoid unescaped double quotes in Python strings
    return xpathString.replace(/(\[@[a-zA-Z]+)="([^"]*)"]/g, "$1='$2']");
}

