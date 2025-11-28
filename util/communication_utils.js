// Message handling utilities - Safe communication with background script

/**
 * Safe message sending with error handling
 */
export function safeSendMessage(message, callback) {
    try {
        if (chrome.runtime && chrome.runtime.sendMessage) {
            chrome.runtime.sendMessage(message, function(response) {
                if (chrome.runtime.lastError) {
                    console.log('Chrome runtime error:', chrome.runtime.lastError.message);
                    return;
                }
                if (callback && typeof callback === 'function') {
                    callback(response);
                }
            });
        } else {
            console.log('Chrome runtime API not available');
        }
    } catch (error) {
        console.log('Error sending message:', error);
    }
}

/**
 * Initialize page-to-content communication for Selenium API
 */
export function initPageCommunication() {
    // Set up the event listener for messages from the page
    window.addEventListener('inverseui-page-to-content', function(event) {
        if (event.detail && event.detail.action) {
            const { action, id, data } = event.detail;
            
            // Map actions to chrome.runtime.sendMessage calls
            const messageMap = {
                'startRecording': { message: 'startRecording' },
                'stopRecording': { message: 'stopRecording' },
                'recState': { message: 'recState' },
                'getActions': { message: 'getActions' },
                'clearActions': { message: 'clearActions' },
                'setActionFetchOnlyMode': { message: 'setActionFetchOnlyMode', enabled: event.detail.enabled },
                'getActionFetchOnlyMode': { message: 'getActionFetchOnlyMode' }
            };
            
            const message = messageMap[action];
            if (message) {
                chrome.runtime.sendMessage(message, function(response) {
                    // Send response back to page
                    const responseEvent = new CustomEvent('inverseui-content-to-page', {
                        detail: {
                            id: id,
                            response: response,
                            error: chrome.runtime.lastError ? chrome.runtime.lastError.message : null
                        }
                    });
                    window.dispatchEvent(responseEvent);
                });
            }
        }
    });
}

/**
 * Initialize background-to-content message listeners
 */
export function initBackgroundCommunication(onRecordingStateChange) {
    // Listen for recording state changes from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'RECORDING_STATE_CHANGED') {
            onRecordingStateChange(message.recording);
            sendResponse({success: true});
            return true;
        }
        
        if (message.type === 'CONTENT_SCRIPT_PING') {
            sendResponse({ready: true});
            return true;
        }
        
        if (message.type === 'GET_STORAGE_DATA') {
            try {
                const storageData = {
                    localStorage: {},
                    sessionStorage: {}
                };

                // Extract localStorage
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    storageData.localStorage[key] = localStorage.getItem(key);
                }

                // Extract sessionStorage
                for (let i = 0; i < sessionStorage.length; i++) {
                    const key = sessionStorage.key(i);
                    storageData.sessionStorage[key] = sessionStorage.getItem(key);
                }

                sendResponse(storageData);
            } catch (error) {
                console.error('Error getting storage data:', error);
                sendResponse({localStorage: {}, sessionStorage: {}});
            }
            return true;
        }

        if (message.type === 'GET_INITIAL_STATE') {
            try {
                // Capture comprehensive initial webpage state
                const initialState = {
                    // Current URL
                    url: window.location.href,

                    // Window dimensions (outer = includes browser chrome)
                    window: {
                        outerWidth: window.outerWidth,
                        outerHeight: window.outerHeight,
                        innerWidth: window.innerWidth,
                        innerHeight: window.innerHeight
                    },

                    // Scroll position
                    scroll: {
                        x: window.scrollX || window.pageXOffset,
                        y: window.scrollY || window.pageYOffset
                    },

                    // Document dimensions
                    document: {
                        width: document.documentElement.scrollWidth,
                        height: document.documentElement.scrollHeight
                    },

                    // Viewport dimensions
                    viewport: {
                        width: document.documentElement.clientWidth,
                        height: document.documentElement.clientHeight
                    },

                    // Screen information
                    screen: {
                        width: window.screen.width,
                        height: window.screen.height,
                        availWidth: window.screen.availWidth,
                        availHeight: window.screen.availHeight,
                        devicePixelRatio: window.devicePixelRatio
                    },

                    // Timestamp
                    timestamp: Date.now()
                };

                console.log('📸 Initial state captured:', initialState);
                sendResponse({
                    success: true,
                    state: initialState
                });
            } catch (error) {
                console.error('❌ Error capturing initial state:', error);
                sendResponse({
                    success: false,
                    error: error.message
                });
            }
            return true;
        }
    });
}

/**
 * Send content script ready message
 */
export function notifyContentScriptReady() {
    safeSendMessage({
        message: "contentScriptReady",
        url: window.location.href
    });
}