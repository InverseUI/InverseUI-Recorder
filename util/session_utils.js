// Handle browser session and authentication state for recordings


/**
 * Capture current browser session data
 */
export async function captureSessionData() {
    const sessionData = {
        cookies: [],
        localStorage: {},
        sessionStorage: {},
        url: ''
    };
    
    try {
        // Get current tab
        const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
        if (!tab) return sessionData;
        
        sessionData.url = tab.url;
        
        // Get cookies for the current domain
        const url = new URL(tab.url);
        const cookies = await chrome.cookies.getAll({ domain: url.hostname });
        sessionData.cookies = cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            sameSite: cookie.sameSite
        }));
        
        // Get localStorage and sessionStorage via content script injection
        const storageData = await chrome.tabs.sendMessage(tab.id, {
            type: 'GET_STORAGE_DATA'
        }).catch(() => null);
        
        if (storageData) {
            sessionData.localStorage = storageData.localStorage || {};
            sessionData.sessionStorage = storageData.sessionStorage || {};
        }
        
    } catch (error) {
        console.error('Failed to capture session data:', error);
    }
    
    return sessionData;
}

/**
 * Capture comprehensive auth data from all domains visited during recording
 */
export async function captureComprehensiveAuthData(trackingLog) {
    const domainData = new Map();
    const visitedDomains = new Set();
    
    try {
        // Extract unique domains from tracking log
        for (const action of trackingLog) {
            if (action.url) {
                try {
                    const url = new URL(action.url);
                    visitedDomains.add(url.hostname);
                } catch (e) {
                    // Skip invalid URLs
                }
            }
        }
        
        console.log('Collecting auth data for domains:', Array.from(visitedDomains));
        
        // Collect data for each unique domain
        for (const domain of visitedDomains) {
            const data = {
                origins: [],
                cookies: []
            };
            
            try {
                // Get all cookies for this domain and its subdomains
                const cookies = await chrome.cookies.getAll({ domain: domain });
                data.cookies = cookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path || '/',
                    secure: !!cookie.secure,
                    httpOnly: !!cookie.httpOnly,
                    sameSite: mapSameSite(cookie.sameSite),
                    expirationDate: cookie.expirationDate
                }));
                
                // For HTTPS domains, also collect localStorage
                try {
                    const origin = `https://${domain}`;
                    
                    // Try to get a tab with this domain to collect localStorage
                    const tabs = await chrome.tabs.query({ url: `*://${domain}/*` });
                    if (tabs.length > 0) {
                        const storageData = await chrome.tabs.sendMessage(tabs[0].id, {
                            type: 'GET_STORAGE_DATA'
                        }).catch(() => ({ localStorage: {}, sessionStorage: {} }));
                        
                        data.origins.push({
                            origin,
                            localStorage: storageData.localStorage || {}
                        });
                    } else {
                        // No active tab, just add empty localStorage for this origin
                        data.origins.push({
                            origin,
                            localStorage: {}
                        });
                    }
                } catch (e) {
                    console.warn(`Could not collect localStorage for ${domain}:`, e);
                }
                
                domainData.set(domain, data);
                
            } catch (error) {
                console.error(`Failed to collect data for domain ${domain}:`, error);
            }
        }
        
    } catch (error) {
        console.error('Failed to capture comprehensive auth data:', error);
    }
    
    return Array.from(domainData.values());
}

/**
 * Map Chrome sameSite values to Playwright format
 */
function mapSameSite(sameSite) {
    if (!sameSite) return 'Lax';
    const value = sameSite.toLowerCase();
    if (value.includes('strict')) return 'Strict';
    if (value.includes('none') || value.includes('no_restriction')) return 'None';
    return 'Lax';
}

/**
 * Check if localStorage contains authentication tokens
 */
export function detectAuthMethod(sessionData) {
    if (!sessionData.localStorage) return [];
    
    return Object.keys(sessionData.localStorage)
        .filter(key => key.toLowerCase().includes('token') || key.toLowerCase().includes('auth'))
        .map(key => ({ type: 'localStorage', key }));
}

