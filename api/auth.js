// Authentication module for InverseUI extension
import { API_CONFIG, isInverseUIWebsite } from './config.js';

/**
 * Get auth token from cookies
 * @returns {Promise<string|null>}
 */
async function getTokenFromCookie() {
    try {
        // Get configuration to determine which domain to check
        const domain = 'inverseui.com';
        
        // Get all cookies for the domain to debug
        const allCookies = await chrome.cookies.getAll({
            domain: domain.startsWith('.') ? domain : `.${domain}`
        });
        console.log(`All cookies for ${domain}:`, allCookies);
        
        // Get specific cookie from domain
        // Using getAll with specific name since get() might have issues with domain cookies
        const cookies = await chrome.cookies.getAll({
            domain: domain.startsWith('.') ? domain : `.${domain}`,
            name: 'inverseui_auth_token'
        });
        
        if (cookies && cookies.length > 0) {
            return cookies[0].value;
        }
        
        return null;
    } catch (error) {
        console.error('Failed to read auth cookie:', error);
        return null;
    }
}

/**
 * Check if user is authenticated
 * @returns {Promise<{isAuthenticated: boolean, token: string|null}>}
 */
export async function checkAuth() {
    try {
        console.log('Checking auth');
        
        // Get token from cookie
        let token = await getTokenFromCookie();
        console.log('Token from cookie:', token ? `${token.substring(0, 10)}...` : 'null');
        
        if (!token) {
            console.log('No token found in cookies');
            return { isAuthenticated: false, token: null };
        }
        
        // Verify token with backend
        console.log('Verifying token with backend:', API_CONFIG.AUTH.authCheckUrl);
        const response = await fetch(API_CONFIG.AUTH.authCheckUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Extension-ID': chrome.runtime.id
            }
        });
        
        console.log('Auth verification response:', response.status);
        
        if (response.ok) {
            console.log('Authentication successful');
            return { isAuthenticated: true, token };
        } else {
            // Token invalid - cookies are managed by frontend
            console.log('Token verification failed:', response.status, response.statusText);
            const errorText = await response.text().catch(() => 'No error details');
            console.log('Error details:', errorText);
            return { isAuthenticated: false, token: null };
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        return { isAuthenticated: false, token: null };
    }
}

/**
 * Get current auth token
 * @returns {Promise<string|null>}
 */
export async function getAuthToken() {
    return await getTokenFromCookie();
}

/**
 * Open login page in new tab
 * @param {string} returnUrl - Optional URL to return to after login
 */
export async function openLoginPage(returnUrl = '') {
    const loginUrl = new URL(API_CONFIG.AUTH.loginUrl);

    // Add extension callback parameter
    loginUrl.searchParams.set('source', 'extension');
    loginUrl.searchParams.set('extension_id', chrome.runtime.id);

    if (returnUrl) {
        loginUrl.searchParams.set('return_url', returnUrl);
    }

    // Create or focus login tab
    const tabs = await chrome.tabs.query({ url: `${API_CONFIG.AUTH.loginUrl}*` });
    
    if (tabs.length > 0) {
        // Focus existing login tab
        await chrome.tabs.update(tabs[0].id, { active: true });
        await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
        // Open new login tab
        await chrome.tabs.create({ url: loginUrl.toString() });
    }
}

/**
 * Listen for auth messages from the website
 */
export function setupAuthListener() {
    // Listen for messages from the website
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
        if (request.type === 'AUTH_SUCCESS' && sender.url && isInverseUIWebsite(new URL(sender.url).hostname)) {
            // Frontend handles token storage as cookies
            sendResponse({ success: true });
            
            // Let frontend handle the tab - don't close it
            // Auth complete - no need to notify anyone
            // User can start recording manually when ready
            
            return true; // Keep channel open for async response
        }
    });
    
    // Also listen for auth via web navigation (for OAuth flows)
    chrome.webNavigation.onCompleted.addListener(async (details) => {
        const url = new URL(details.url);

        // Check if this is the auth callback URL
        if (isInverseUIWebsite(url.hostname) && url.pathname === '/auth/success') {
            const token = url.searchParams.get('token');

            if (token) {
                // Frontend handles token storage as cookies
                // Let frontend handle the tab - don't close it
                // Auth complete - no need to notify anyone
                // User can start recording manually when ready
                console.log('Auth callback detected, token handled by frontend');
            }
        }
    }, {
        url: [{ hostContains: 'inverseui.com' }]
    });
}

// checkWebsiteAuth function removed - we now read directly from cookies