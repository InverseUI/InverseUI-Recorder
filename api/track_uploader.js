// Handle track results - send to backend API and redirect to results page
import { checkAuth, getAuthToken } from './auth.js';
import { captureSessionData, detectAuthMethod, captureComprehensiveAuthData } from '../util/session_utils.js';
import { API_CONFIG, getAuthHeaders } from './config.js';

/**
 * Send track data to backend and redirect to results page
 * @param {Array} trackingLog - Array of recorded actions
 * @param {number} popupWindowId - ID of the processing popup window
 * @param {boolean} actionOnlyMode - Whether to skip backend submission
 * @param {Object} initialState - Initial webpage state (window, scroll, viewport)
 */
export async function sendTrackToBackend(trackingLog, popupWindowId, actionOnlyMode = false, initialState = null) {
    // Additional failsafe check for actionOnlyMode
    if (actionOnlyMode) {
        console.log('FAILSAFE: actionOnlyMode is active in sendTrackToBackend - aborting API call');
        return { success: false, error: 'Action only mode is active' };
    }
    
    // Check authentication first
    const authStatus = await checkAuth();
    
    if (!authStatus.isAuthenticated) {
        // This shouldn't happen as auth is checked before recording starts
        console.error('Not authenticated when trying to save track');
        
        // Close processing popup
        if (popupWindowId) {
            chrome.windows.remove(popupWindowId).catch(() => {});
        }
        
        // Show error notification
        chrome.notifications.create({
            type: 'basic',
            iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
            title: 'Authentication Error',
            message: 'Please log in and try recording again.',
            priority: 2
        });
        
        return { success: false, error: 'Not authenticated' };
    }

    console.log('Sending trackingLog to /track/save:', trackingLog);
    console.log('Number of actions:', trackingLog.length);
    try {
        // Get current tab info
        const [activeTab] = await chrome.tabs.query({active: true, currentWindow: true});
        
        // Get auth token
        const token = await getAuthToken();
        
        // Capture session data for the recorded site
        const sessionData = await captureSessionData();
        const authMethods = detectAuthMethod(sessionData);
        
        // Capture comprehensive auth data from all domains visited during recording
        const comprehensiveAuthData = await captureComprehensiveAuthData(trackingLog);
        
        
        // Prepare request body matching server expectations
        const requestBody = {
            url: activeTab?.url || '',
            title: activeTab?.title || '',
            actions: trackingLog,
            // Optional metadata can be included if server supports it
            metadata: {
                timestamp: Date.now(),
                extensionVersion: chrome.runtime.getManifest().version,
                actionsCount: trackingLog.length
            },
            sessionData: {
                // Only send non-sensitive auth indicators
                hasAuthentication: authMethods.length > 0,
                authMethods: authMethods.map(m => ({ type: m.type, name: m.name || m.key })),
                authAnalysis: {
                    hasLoginForm: false,
                    hasLogoutButton: false,
                    loginActions: [],
                    cookies: [],
                    localStorage: [],
                    sessionStorage: []
                },
                // Don't send actual cookie/token values for security
                requiresAuth: sessionData.cookies.some(c =>
                    c.name.toLowerCase().includes('session') ||
                    c.name.toLowerCase().includes('auth')
                ),
            },
            // Add comprehensive auth data for Playwright automation
            playwrightAuth: {
                domainData: comprehensiveAuthData,
                visitedDomains: [...new Set(trackingLog.map(action => {
                    try {
                        return action.url ? new URL(action.url).hostname : null;
                    } catch (e) {
                        return null;
                    }
                }).filter(Boolean))]
            }
        };
        
        console.log('Request body:', JSON.stringify(requestBody, null, 2));
        console.log('Request headers:', getAuthHeaders(token));

        // Send tracking data to backend
        // Note: Chrome extensions are not subject to CORS when making requests from background scripts
        const response = await fetch(API_CONFIG.RESULTS.endpoint, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
            error.status = response.status;
            error.name = 'HTTP_ERROR';
            error.responseText = errorText;
            throw error;
        }

        const result = await response.json();

        // Close the popup window if it exists
        if (popupWindowId) {
            chrome.windows.remove(popupWindowId).catch(() => {
                // Window might already be closed
            });
        }

        // Open the results page on InverseUI using track_id
        const trackUrl = `${API_CONFIG.RESULTS.viewUrl}${result.track_id}`;
        chrome.tabs.create({
            url: trackUrl
        });

        return { success: true, trackId: result.track_id, trackUrl: trackUrl };

    } catch (error) {
        console.error('Failed to send to InverseUI:', error);
        
        // Handle error - fallback to local download
        return handleUploadError(trackingLog, popupWindowId, error);
    }
}

/**
 * Handle upload errors with fallback to local download
 * @param {Array} trackingLog - Array of recorded actions
 * @param {number} popupWindowId - ID of the processing popup window
 * @param {Error} error - The error that occurred
 */
async function handleUploadError(trackingLog, popupWindowId, error) {
    // Close popup if it exists
    if (popupWindowId) {
        chrome.windows.remove(popupWindowId).catch(() => {
            // Window might already be closed
        });
    }

    // Save recording locally as backup
    const recordingId = `track_${Date.now()}`;
    const jsonData = JSON.stringify(trackingLog, null, 2);
    const dataUrl = 'data:application/json;charset=utf-8,' + encodeURIComponent(jsonData);

    chrome.downloads.download({
        url: dataUrl,
        filename: `inverseui_${recordingId}.json`,
        saveAs: true
    });

    // Determine error details
    const errorCode = error.name || 'UNKNOWN_ERROR';
    const errorMessage = error.message || 'An unknown error occurred';
    const httpStatus = error.status || '';

    // Build error page URL with details
    const errorUrl = new URL(`${API_CONFIG.RESULTS.viewUrl.replace('/track/', '/error')}`);
    errorUrl.searchParams.set('code', errorCode);
    errorUrl.searchParams.set('message', errorMessage);
    errorUrl.searchParams.set('recording_id', recordingId);
    errorUrl.searchParams.set('actions_count', trackingLog.length.toString());
    errorUrl.searchParams.set('timestamp', Date.now().toString());

    if (httpStatus) {
        errorUrl.searchParams.set('status', httpStatus.toString());
    }

    // Open error page on InverseUI website
    chrome.tabs.create({
        url: errorUrl.toString()
    });

    // Also show notification
    chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon-48.png'),
        title: 'Upload Failed',
        message: 'Failed to send to InverseUI. Opening error details...',
        priority: 2
    });

    return { success: false, error: error.message };
}