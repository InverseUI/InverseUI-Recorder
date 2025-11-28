// Import modules
import { setupAuthListener } from './api/auth.js';
import { ACTION_TYPES, MESSAGE_HANDLER_MAPPING } from './modules/action/action_constants.js';
import {
    getRecState,
    getActions,
    clearActions,
    toggleRec,
    pushAction,
    setActionOnlyMode,
    getActionOnlyMode
} from './modules/recording.js';

// Main background script code
console.log('Background service worker started');

// Set up authentication listener
setupAuthListener();

// Update from browserAction to action (for MV3)
chrome.action.onClicked.addListener(function(tab) {
    toggleRec();
});

// Handle browser history for recording navigation
chrome.history.onVisited.addListener(function(historyItem) {
    if (getRecState()) {
        chrome.history.getVisits({
            url: historyItem.url
        }, function(visitItems) {
            var latestVisit = visitItems[visitItems.length - 1];
            if (latestVisit.transition === "typed") {
                console.log("Go to url [" + historyItem.url + "]");
                pushAction({
                    browserAction: ACTION_TYPES.GO_TO_URL,
                    url: historyItem.url
                });
            }
        });
    }
});

// Main message listener for content script communication
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // Handle recording state queries
    if (request.message === "recState") {
        sendResponse({
            recState: getRecState()
        });
        return true;
    }
    
    // API for Selenium control
    if (request.message === "startRecording") {
        if (!getRecState()) {
            toggleRec();
            sendResponse({
                success: true,
                recState: getRecState(),
                message: "Recording started"
            });
        } else {
            sendResponse({
                success: false,
                recState: getRecState(),
                message: "Already recording"
            });
        }
        return true;
    }
    
    if (request.message === "stopRecording") {
        if (getRecState()) {
            toggleRec();
            sendResponse({
                success: true,
                recState: getRecState(),
                message: "Recording stopped"
            });
        } else {
            sendResponse({
                success: false,
                recState: getRecState(),
                message: "Not recording"
            });
        }
        return true;
    }
    
    if (request.message === "getActions") {
        sendResponse({
            success: true,
            actions: getActions(),
            count: getActions().length
        });
        return true;
    }
    
    if (request.message === "clearActions") {
        clearActions();
        sendResponse({
            success: true,
            message: "Actions cleared"
        });
        return true;
    }
    
    if (request.message === "setActionOnlyMode") {
        setActionOnlyMode(request.enabled);
        sendResponse({
            success: true,
            actionOnlyMode: getActionOnlyMode(),
            message: `Action only mode ${request.enabled ? 'enabled' : 'disabled'}`
        });
        return true;
    }
    
    if (request.message === "getActionOnlyMode") {
        sendResponse({
            success: true,
            actionOnlyMode: getActionOnlyMode()
        });
        return true;
    }
    
    
    // Handle settings updates from frontend
    if (request.type === "UPDATE_EXTENSION_SETTINGS") {
        chrome.storage.sync.set(request.settings, function() {
            console.log("Extension settings updated:", request.settings);
            sendResponse({ success: true });
        });
        return true;
    }
    
    // Handle settings retrieval from frontend
    if (request.type === "GET_EXTENSION_SETTINGS") {
        chrome.storage.sync.get(null, function(settings) {
            sendResponse({ success: true, settings: settings });
        });
        return true;
    }
    
    

    // Handle user action events from content script
    handleUserActionMessage(request, sendResponse);
    
    return true;
});

/**
 * Handle user action messages from content scripts
 */
function handleUserActionMessage(request, sendResponse) {
    // Handle user action messages using MESSAGE_HANDLER_MAPPING
    
    // Look up the handler in the mapping
    const handlerInfo = MESSAGE_HANDLER_MAPPING[request.message];
    
    if (!handlerInfo) {
        console.warn(`No handler found for message: ${request.message}`);
        return;
    }
    
    // Call the handler function to generate action data
    const actionData = handlerInfo.handler(request);
    
    // Skip if handler returns null (e.g., filtered keyboard events)
    if (actionData === null) {
        return;
    }
    
    // Log the action for debugging
    console.log(`${handlerInfo.category} action: ${request.message}`, actionData);
    
    
    // Push the action
    pushAction(actionData);
}

// Simple context menu for start/stop recording
chrome.runtime.onInstalled.addListener(function() {
    // Updated from browserAction to action (for MV3)
    chrome.action.setBadgeBackgroundColor({
        color: "#BF0B0B"
    });
    
    // Create simple start/stop recording menu
    chrome.contextMenus.create({
        title: "Start Recording",
        type: "normal",
        id: "recStateToggle",
        contexts: ["all"]
    });
});

// Handle context menu clicks - simple toggle
chrome.contextMenus.onClicked.addListener(function(info, tab) {
    if (info.menuItemId === "recStateToggle") {
        toggleRec();
        // Update menu title based on new state
        const newTitle = getRecState() ? "Stop Recording" : "Start Recording";
        chrome.contextMenus.update("recStateToggle", { title: newTitle });
    }
});
