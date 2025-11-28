// InverseUI Extension Control API - Injected into page context for external automation control
// This API allows external tools (like Selenium) to control the extension's recording functionality
(() => {
    if (window.INVERSEUI_EXTENSION_API) return;

    // Get extension ID from the script URL
    const scriptUrl = document.currentScript?.src || '';
    const extensionId = scriptUrl.match(/chrome-extension:\/\/([^\/]+)/)?.[1] || '';

    window.INVERSEUI_EXTENSION_ID = extensionId;

    // Extension Control API - NOT the backend API
    window.INVERSEUI_EXTENSION_API = {
        startRecording: () => {
            return new Promise((resolve, reject) => {
                const id = 'invui-' + Math.random().toString(36).slice(2);
                const listener = (e) => {
                    if (e.detail && e.detail.id === id) {
                        window.removeEventListener('inverseui-content-to-page', listener);
                        if (e.detail.error) reject(e.detail.error);
                        else resolve(e.detail.response);
                    }
                };
                window.addEventListener('inverseui-content-to-page', listener);
                window.dispatchEvent(new CustomEvent('inverseui-page-to-content', {
                    detail: { action: 'startRecording', id: id }
                }));
            });
        },
        stopRecording: () => {
            return new Promise((resolve, reject) => {
                const id = 'invui-' + Math.random().toString(36).slice(2);
                const listener = (e) => {
                    if (e.detail && e.detail.id === id) {
                        window.removeEventListener('inverseui-content-to-page', listener);
                        if (e.detail.error) reject(e.detail.error);
                        else resolve(e.detail.response);
                    }
                };
                window.addEventListener('inverseui-content-to-page', listener);
                window.dispatchEvent(new CustomEvent('inverseui-page-to-content', {
                    detail: { action: 'stopRecording', id: id }
                }));
            });
        },
        isRecording: () => {
            return new Promise((resolve, reject) => {
                const id = 'invui-' + Math.random().toString(36).slice(2);
                const listener = (e) => {
                    if (e.detail && e.detail.id === id) {
                        window.removeEventListener('inverseui-content-to-page', listener);
                        if (e.detail.error) reject(e.detail.error);
                        else resolve(e.detail.response?.recState || false);
                    }
                };
                window.addEventListener('inverseui-content-to-page', listener);
                window.dispatchEvent(new CustomEvent('inverseui-page-to-content', {
                    detail: { action: 'recState', id: id }
                }));
            });
        },
        getActions: () => {
            return new Promise((resolve, reject) => {
                const id = 'invui-' + Math.random().toString(36).slice(2);
                const listener = (e) => {
                    if (e.detail && e.detail.id === id) {
                        window.removeEventListener('inverseui-content-to-page', listener);
                        if (e.detail.error) reject(e.detail.error);
                        else resolve(e.detail.response);
                    }
                };
                window.addEventListener('inverseui-content-to-page', listener);
                window.dispatchEvent(new CustomEvent('inverseui-page-to-content', {
                    detail: { action: 'getActions', id: id }
                }));
            });
        },
        clearActions: () => {
            return new Promise((resolve, reject) => {
                const id = 'invui-' + Math.random().toString(36).slice(2);
                const listener = (e) => {
                    if (e.detail && e.detail.id === id) {
                        window.removeEventListener('inverseui-content-to-page', listener);
                        if (e.detail.error) reject(e.detail.error);
                        else resolve(e.detail.response);
                    }
                };
                window.addEventListener('inverseui-content-to-page', listener);
                window.dispatchEvent(new CustomEvent('inverseui-page-to-content', {
                    detail: { action: 'clearActions', id: id }
                }));
            });
        },
        setActionFetchOnlyMode: (enabled) => {
            return new Promise((resolve, reject) => {
                const id = 'invui-' + Math.random().toString(36).slice(2);
                const listener = (e) => {
                    if (e.detail && e.detail.id === id) {
                        window.removeEventListener('inverseui-content-to-page', listener);
                        if (e.detail.error) reject(e.detail.error);
                        else resolve(e.detail.response);
                    }
                };
                window.addEventListener('inverseui-content-to-page', listener);
                window.dispatchEvent(new CustomEvent('inverseui-page-to-content', {
                    detail: { action: 'setActionFetchOnlyMode', id: id, enabled: enabled }
                }));
            });
        },
        getActionFetchOnlyMode: () => {
            return new Promise((resolve, reject) => {
                const id = 'invui-' + Math.random().toString(36).slice(2);
                const listener = (e) => {
                    if (e.detail && e.detail.id === id) {
                        window.removeEventListener('inverseui-content-to-page', listener);
                        if (e.detail.error) reject(e.detail.error);
                        else resolve(e.detail.response);
                    }
                };
                window.addEventListener('inverseui-content-to-page', listener);
                window.dispatchEvent(new CustomEvent('inverseui-page-to-content', {
                    detail: { action: 'getActionFetchOnlyMode', id: id }
                }));
            });
        }
    };

    console.log("[INVERSEUI] Control API injected into page context");
    console.log('window.INVERSEUI_EXTENSION_API:', window.INVERSEUI_EXTENSION_API);
    console.log('typeof INVERSEUI_EXTENSION_API:', typeof window.INVERSEUI_EXTENSION_API);
    console.log('Extension ID:', window.INVERSEUI_EXTENSION_ID);
})();