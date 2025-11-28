// Centralized configuration for all API endpoints and URLs

// Production API URLs
const BASE_URL = 'https://inverseui.com';
const API_BASE_URL = 'https://api.inverseui.com';

// API configuration
export const API_CONFIG = {
    // Authentication endpoints
    AUTH: {
        loginUrl: BASE_URL + '/login',
        authCheckUrl: API_BASE_URL + '/auth/verify',
        tokenKey: 'inverseui_auth_token'
    },

    // Recordings API
    RESULTS: {
        endpoint: API_BASE_URL + '/track/save',
        viewUrl: BASE_URL + '/track/'
    },

    // Extension metadata
    EXTENSION: {
        name: 'InverseUI',
        version: chrome.runtime.getManifest().version
    }
};

// Helper function to check if we're on the InverseUI website
export function isInverseUIWebsite(hostname) {
    return hostname.includes('inverseui.com');
}

// Helper function to get API headers with auth
export function getAuthHeaders(token) {
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-Extension-ID': chrome.runtime.id,
        'X-Extension-Version': API_CONFIG.EXTENSION.version
    };
}