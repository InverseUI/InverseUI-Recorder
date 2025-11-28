// InverseUI Content Script - Modular event tracking system
console.log('🚀 InverseUI content script LOADED');

(function() {
    'use strict';
    
    console.log('🔥 InverseUI content script starting...');
    
    // Check if we're in an extension context before using Chrome APIs
    if (typeof chrome === 'undefined' || !chrome.runtime) {
        console.warn('❌ Chrome extension API not available in this context');
        return;
    }
    
    console.log('✅ Chrome APIs available, continuing initialization...');

    // Import modules
    async function initializeContentScript() {
        try {
            console.log('Step 1: Importing xpath_utils...');
            const { getXpaths } = await import(chrome.runtime.getURL('util/xpath_utils.js'));
            console.log('Step 1: SUCCESS');
            
            console.log('Step 2: Importing communication_utils...');
            const { initPageCommunication, initBackgroundCommunication, notifyContentScriptReady } = await import(chrome.runtime.getURL('util/communication_utils.js'));
            console.log('Step 2: SUCCESS');
            
            console.log('Step 3: Importing api_injection...');
            const { initAPIInjection } = await import(chrome.runtime.getURL('inject/api_injection.js'));
            console.log('Step 3: SUCCESS');
            
            console.log('Step 4: Importing action tracking...');
            const { initializeActionTracking } = await import(chrome.runtime.getURL('modules/action/index.js'));
            console.log('Step 4: SUCCESS');
            
            console.log('Step 5: Getting safeSendMessage...');
            const { safeSendMessage } = await import(chrome.runtime.getURL('util/communication_utils.js'));
            console.log('Step 5: SUCCESS');
            
            
            // Initialize API injection for Selenium communication
            initAPIInjection();
            
            // Initialize communication channels
            initPageCommunication();
            initBackgroundCommunication((recording) => {
                // Handle recording state changes - start/stop recording
                console.log('Recording state changed:', recording);
                
                if (recording) {
                    // Start recording - import and call recording functions
                    import(chrome.runtime.getURL('modules/recording.js')).then(module => {
                        module.startRecording(getXpaths, safeSendMessage);
                    }).catch(err => {
                        console.error('Failed to import recording.js for start:', err);
                    });
                } else {
                    // Stop recording
                    import(chrome.runtime.getURL('modules/recording.js')).then(module => {
                        module.stopRecording();
                    }).catch(err => {
                        console.error('Failed to import recording.js for stop:', err);
                    });
                }
            });
            
            // Initialize comprehensive action tracking system
            await initializeActionTracking(safeSendMessage, getXpaths);
            
            
            // Send ready message to background
            notifyContentScriptReady();
            
            console.log('InverseUI: Content script fully initialized');
            
        } catch (error) {
            console.error('Failed to initialize content script modules:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Error name:', error.name);
            console.error('Full error object:', error);
            // Fallback to inline implementation
            await initializeFallbackTracking();
        }
    }


    // Fallback to inline implementation if modules fail
    async function initializeFallbackTracking() {
        try {
            console.log('InverseUI: Falling back to inline tracking implementation');
            
            // Import required modules for fallback
            const { getXpaths } = await import(chrome.runtime.getURL('util/xpath_utils.js'));
            const { initializeRecording } = await import(chrome.runtime.getURL('modules/recording.js'));
            
            // Initialize inline tracking
            initializeRecording(getXpaths);
            
            console.log('InverseUI: Fallback inline tracking initialized');
        } catch (error) {
            console.error('Failed to initialize fallback tracking:', error);
            console.error('Fallback error message:', error.message);
            console.error('Fallback error stack:', error.stack);
            console.error('InverseUI: Content script initialization failed completely');
        }
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeContentScript);
    } else {
        initializeContentScript();
    }

})();