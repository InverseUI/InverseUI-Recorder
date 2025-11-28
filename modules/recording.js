// Recording state management with API integration
import { sendTrackToBackend } from '../api/track_uploader.js';
import { checkAuth, openLoginPage } from '../api/auth.js';
import { ACTION_TYPES } from './action/action_constants.js';
import { compareAction, fixXpathDoubleQuoteIssues, validateActionXPath } from '../util/action_utils.js';

// Recording state
export let recState = false;
export let actions = [];
export let actionOnlyMode = false;
export let dimension_w = "";
export let dimension_h = "";
export let scroll_top = "";
export let scroll_left = "";
let initialState = null; // Store initial state including frontend HTML/JS

/**
 * Capture initial webpage state when recording starts
 * This ensures the generated code can reproduce the same starting conditions
 */
export async function captureInitialState(tabId) {
    try {
        console.log('📸 Capturing initial webpage state...');

        // Request initial state from content script
        const response = await chrome.tabs.sendMessage(tabId, {
            type: 'GET_INITIAL_STATE'
        });

        if (response && response.success) {
            console.log('✅ Initial state captured:', response.state);
            return response.state;
        } else {
            console.warn('⚠️ Failed to capture initial state from content script');
            return null;
        }
    } catch (error) {
        console.error('❌ Error capturing initial state:', error);
        return null;
    }
}

/**
 * Create initial actions based on captured webpage state
 * This sets the baseline for the recording
 */
export function createInitialActions(initialState, currentTab) {
    if (!initialState) {
        console.warn('⚠️ No initial state provided, skipping initial actions');
        return;
    }

    console.log('🎬 Creating initial actions from state...');

    // 1. Initial URL - Always add this first
    if (currentTab && currentTab.url) {
        actions.push({
            browserAction: ACTION_TYPES.GO_TO_URL,
            url: currentTab.url,
            timestamp: Date.now()
        });
        console.log(`📍 Initial URL: ${currentTab.url}`);
    }

    // 2. Window dimensions - Set baseline
    if (initialState.window) {
        dimension_w = initialState.window.outerWidth;
        dimension_h = initialState.window.outerHeight;

        // Add resize action to set initial window size
        actions.push({
            browserAction: ACTION_TYPES.WINDOW_RESIZE,
            width: dimension_w,
            height: dimension_h,
            timestamp: Date.now()
        });
        console.log(`📐 Initial window size: ${dimension_w}x${dimension_h}`);
    }

    // 3. Scroll position - Only add if page is scrolled
    if (initialState.scroll) {
        scroll_top = initialState.scroll.y;
        scroll_left = initialState.scroll.x;

        // Only add scroll action if page is not at top-left
        if (scroll_top > 0 || scroll_left > 0) {
            actions.push({
                browserAction: ACTION_TYPES.WINDOW_SCROLL,
                scrollPosition: {
                    x: scroll_left,
                    y: scroll_top
                },
                documentSize: initialState.document,
                viewportSize: initialState.viewport,
                timestamp: Date.now()
            });
            console.log(`📜 Initial scroll position: (${scroll_left}, ${scroll_top})`);
        } else {
            console.log('📜 Page at top - no initial scroll needed');
        }
    }

    console.log(`✅ Created ${actions.length} initial action(s)`);
}

/**
 * Process and send track data to backend
 */
export async function processAndSendTrack(trackingLog, initialState = null) {
    console.log('processAndSendTrack called with actionOnlyMode:', actionOnlyMode);

    // Check if we're in action only mode
    if (actionOnlyMode) {
        console.log('Action only mode ACTIVE - processAndSendTrack called but skipping backend submission');
        console.log('Current actionOnlyMode value:', actionOnlyMode);
        return;
    }

    console.log('Action only mode NOT active - proceeding with backend submission');

    try {
        // Use all actions (no filtering needed)
        const actualActions = trackingLog;

        // Validate and fix XPath issues before sending
        const fixedLog = actualActions.map(action => {
            // First validate and clean the action
            let fixedAction = validateActionXPath({...action});

            // Then fix XPath quote issues for Python compatibility
            if (fixedAction.xpath) {
                const xpathArray = Array.isArray(fixedAction.xpath) ?
                    fixedAction.xpath : [fixedAction.xpath];

                fixedAction.xpath = xpathArray.map(xpath => fixXpathDoubleQuoteIssues(xpath));
            }

            return fixedAction;
        });

        console.log('Sending recording with', fixedLog.length, 'actions');

        // Send to backend and handle redirect (no popup) - pass actionOnlyMode as failsafe and initialState
        await sendTrackToBackend(fixedLog, null, actionOnlyMode, initialState);
    } catch (error) {
        console.error('Error in processAndSendTrack:', error);

        // Show user-friendly error notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
            title: 'Recording Processing Failed',
            message: 'Unable to process recording. Please try again.',
            priority: 2
        });
    }
}

/**
 * Start a fresh recording session
 */
export async function startFreshRecording() {
    // Check authentication status first
    const authStatus = await checkAuth();
    
    if (!authStatus.isAuthenticated) {
        // Show notification that login is required
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
            title: 'Login Required',
            message: 'Please log in to InverseUI to start recording.',
            priority: 2
        });
        
        // Open login page
        await openLoginPage();
        
        // Don't set pendingRecording flag - let user manually start recording after login
        return;
    }
    
    // Get current tab
    const [currentTab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (!currentTab) return;

    // Start recording immediately
    actions.length = 0; // Clear actions array
    console.log("Start recording...");
    recState = true;
    chrome.action.setBadgeText({ text: "rec" });

    // Capture initial webpage state and create baseline actions
    try {
        initialState = await captureInitialState(currentTab.id);
        createInitialActions(initialState, currentTab);
    } catch (error) {
        console.error('Failed to capture initial state:', error);
        // Continue recording even if initial state capture fails
        initialState = null;
    }

    // Broadcast state to all tabs
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
            type: 'RECORDING_STATE_CHANGED',
            recording: recState
        }).catch(() => {});
    });
    
    // Show notification with instructions
    chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
        title: 'Recording Started',
        message: 'For best results, please log out first to record the complete login flow. This ensures your test will work in Selenium.',
        priority: 2,
        requireInteraction: true
    });
    
}

/**
 * Toggle recording on/off
 */
export async function toggleRec() {
    if (recState) {
        // Stop recording directly without checking success conditions
        chrome.action.setBadgeText({ text: "" });
        console.log("Stop recording");
        
        
        // Only send to backend if not in action only mode and we have actions
        if (!actionOnlyMode && actions.length > 0) {
            processAndSendTrack(actions, initialState).catch(error => {
                console.error('Failed to process and send track:', error);
            });
        } else {
            console.log("Action only mode enabled - skipping backend submission");
        }

        console.log("🔄 Resetting recording state variables");
        dimension_w = "";
        dimension_h = "";
        scroll_top = "";
        scroll_left = "";
        initialState = null;
        recState = false;
        
        // Broadcast recording stopped
        const tabs = await chrome.tabs.query({});
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                type: 'RECORDING_STATE_CHANGED',
                recording: recState
            }).catch(() => {});
        });
        
        // Show notification
        const message = actionOnlyMode ? 
            'Recording stopped. Action only mode - no backend submission or code generation.' :
            actions.length > 0 ? 'Recording stopped and test code is being generated.' : 'Recording stopped (no actions recorded).';
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
            title: 'Recording Stopped',
            message: message,
            priority: 2
        });
        
        // Update context menu
        chrome.contextMenus.update("recStateToggle", { 
            title: "Start Recording" 
        }).catch(() => {});
        
    } else {
        // Start recording with fresh session
        startFreshRecording();
    }
}

/**
 * Add an action to the recording
 * Note: Initial state is captured in startFreshRecording()
 * This function only tracks CHANGES during recording
 */
export function pushAction(action) {
    // Log every action that's detected
    console.log('📍 Action detected:', {
        type: action.browserAction,
        xpath: action.xpath || 'N/A',
        url: action.url || 'N/A',
        content: action.content || 'N/A',
        timestamp: new Date().toISOString()
    });

    chrome.windows.getCurrent(function(currentWindow) {
        action.timestamp = Date.now();
        var lastAction = actions[actions.length - 1];

        // Track window dimension CHANGES from baseline
        // Note: dimension_w and dimension_h are set during initialization
        if (dimension_w && dimension_h &&
            (currentWindow.width !== dimension_w || currentWindow.height !== dimension_h)) {
            console.log(`📐 Window resized: [${dimension_w}x${dimension_h}] → [${currentWindow.width}x${currentWindow.height}]`);
            dimension_w = currentWindow.width;
            dimension_h = currentWindow.height;

            if (compareAction(lastAction, action) === 0) {
                console.log("Duplicated action [" + lastAction.browserAction + "] at the same element, ignore it!");
            } else {
                actions.push({
                    browserAction: ACTION_TYPES.WINDOW_RESIZE,
                    width: dimension_w,
                    height: dimension_h,
                    timestamp: Date.now()
                });
            }
        }
        
        if (action.browserAction === ACTION_TYPES.SCROLL) {
            if (actions[actions.length - 1]) {
                if (actions[actions.length - 1].browserAction === ACTION_TYPES.SCROLL) {
                    console.log("remove previous scroll in favour of the last one");
                    actions.pop();
                }
            }
        }

        // Special handling for input actions with same xpath
        if (action.browserAction === ACTION_TYPES.INPUT && lastAction && 
            lastAction.browserAction === ACTION_TYPES.INPUT &&
            lastAction.xpath[0] === action.xpath[0]) {
            console.log("Update content for input action on same element");
            lastAction.content = action.content;
            lastAction.timestamp = Date.now();
        }
        // Normal handling for other actions
        else if (compareAction(lastAction, action) === 0) {
            console.log("Duplicated action [" + lastAction.browserAction + "] at the same element, ignore it!");
        } else {
            action.timestamp = Date.now();
            actions.push(action);
        }

        console.log("reset xpathOfSelectedElement and contentOfSelectedElement");
    });
}

/**
 * Set action only mode
 */
export function setActionOnlyMode(enabled) {
    actionOnlyMode = enabled;
    console.log(`Action only mode ${actionOnlyMode ? 'ENABLED' : 'DISABLED'}`);
}

/**
 * Get current action only mode
 */
export function getActionOnlyMode() {
    return actionOnlyMode;
}

/**
 * Get current recording state
 */
export function getRecState() {
    return recState;
}

/**
 * Get current actions
 */
export function getActions() {
    return actions;
}

/**
 * Clear actions
 */
export function clearActions() {
    actions.length = 0;
}

// Global variable to store event listeners and recording state
let eventListeners = [];
let isRecordingActive = false;

/**
 * Start recording user actions by adding event listeners
 */
export function startRecording(getXpaths, safeSendMessage) {
    if (isRecordingActive) return;
    
    console.log('InverseUI: Starting action recording');
    isRecordingActive = true;
    
    // Store listeners so we can remove them later
    const clickListener = function(event) {
        var target = event.target || event.srcElement;
        var xpaths = getXpaths(target);
        console.log("click on xpath: " + xpaths);
        
        safeSendMessage({
            message: "onClick",
            xPath: xpaths,
            coordinates: { x: event.clientX, y: event.clientY },
            button: event.button,
            modifiers: {
                ctrl: event.ctrlKey,
                shift: event.shiftKey,
                alt: event.altKey,
                meta: event.metaKey
            }
        });
    };
    
    const inputListener = function(event) {
        var target = event.target || event.srcElement;
        var xpaths = getXpaths(target);
        console.log("input on xpath: " + xpaths + " | content: " + target.value);
        safeSendMessage({
            message: "onInput",
            xPath: xpaths,
            content: target.value,
            type: target.type
        });
    };
    
    // Add event listeners
    document.addEventListener("click", clickListener, true);
    document.addEventListener("input", inputListener, true);
    
    // Store listeners for cleanup
    eventListeners.push(
        { element: document, event: "click", listener: clickListener, capture: true },
        { element: document, event: "input", listener: inputListener, capture: true }
    );
}

/**
 * Stop recording user actions by removing event listeners
 */
export function stopRecording() {
    if (!isRecordingActive) return;
    
    console.log('InverseUI: Stopping action recording');
    isRecordingActive = false;
    
    // Remove all event listeners
    eventListeners.forEach(({ element, event, listener, capture }) => {
        element.removeEventListener(event, listener, capture);
    });
    
    // Clear the listeners array
    eventListeners = [];
}

/**
 * Complete inline recording implementation (all features) - fallback when modules fail to load
 */
export function initializeRecording(getXpaths) {
    console.log('InverseUI: Initializing comprehensive inline recording');
    
    // Import safeSendMessage for the inline implementation
    import('../util/communication_utils.js').then(module => {
        const { safeSendMessage } = module;
        
        // Mouse Events

        // Handle primary clicks (left button)
        document.addEventListener("click", function(event) {
            safeSendMessage({
                message: "recState"
            }, function(response) {
                if (response && response.recState) {
                    var target = event.target || event.srcElement;
                    var xpaths = getXpaths(target);
                    console.log("click on xpath: " + xpaths);
                    
                    safeSendMessage({
                        message: "onClick",
                        xPath: xpaths,
                        coordinates: { x: event.clientX, y: event.clientY },
                        button: event.button,
                        modifiers: {
                            ctrl: event.ctrlKey,
                            shift: event.shiftKey,
                            alt: event.altKey,
                            meta: event.metaKey
                        }
                    });
                }
            });
        }, true);

        document.addEventListener("dblclick", function(event) {
            safeSendMessage({
                message: "recState"
            }, function(response) {
                if (response && response.recState) {
                    var target = event.target || event.srcElement;
                    var xpaths = getXpaths(target);
                    console.log("dblclick on xpath: " + xpaths);
                    safeSendMessage({
                        message: "onDblClick",
                        xPath: xpaths,
                        coordinates: { x: event.clientX, y: event.clientY }
                    });
                }
            });
        }, true);

        // Form Events
        document.addEventListener("change", function(event) {
            safeSendMessage({
                message: "recState"
            }, function(response) {
                if (response && response.recState) {
                    var target = event.target || event.srcElement;
                    var xpaths = getXpaths(target);
                    console.log("set value on xpath: " + xpaths + " | content: " + target.value);
                    safeSendMessage({
                        message: "onChange",
                        xPath: xpaths,
                        content: target.value,
                        type: target.type
                    });
                }
            });
        }, true);

        // Input handler with debouncing
        var inputDebounce = null;
        document.addEventListener("input", function(event) {
            clearTimeout(inputDebounce);
            inputDebounce = setTimeout(function() {
                safeSendMessage({
                    message: "recState"
                }, function(response) {
                    if (response && response.recState) {
                        var target = event.target || event.srcElement;
                        var xpaths = getXpaths(target);
                        console.log("input on xpath: " + xpaths + " | content: " + target.value);
                        safeSendMessage({
                            message: "onInput",
                            xPath: xpaths,
                            content: target.value,
                            type: target.type
                        });
                    }
                });
            }, 300);
        }, true);
        
        console.log('InverseUI: Fallback inline recording initialized');
    });
}