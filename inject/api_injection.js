// API Injection - Inject control API into page context for Selenium access

/**
 * Inject the extension API into the real page context
 * This allows Selenium to access InverseUI functionality
 */
export function injectAPIIntoPage() {
    console.log('[Content Script] Starting API injection into page context');
    
    // Wait for document.documentElement to be available
    if (!document.documentElement) {
        // If running at document_start, wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', injectAPIIntoPage);
            return;
        }
    }
    
    // Inject the API script from external file (avoids CSP issues)
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL('inject/extension_api.js');
    script.onload = function() {
        console.log('[Content Script] Extension API script loaded successfully');
        this.remove();
    };
    script.onerror = function() {
        console.error('[Content Script] Failed to load extension API script');
        this.remove();
    };
    
    // Inject into the page
    (document.head || document.documentElement).appendChild(script);
}

/**
 * Initialize API injection on DOM ready
 */
export function initAPIInjection() {
    console.log('[Content Script] Initializing API injection');
    
    // Inject immediately if DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectAPIIntoPage);
    } else {
        injectAPIIntoPage();
    }
}