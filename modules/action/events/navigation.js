// Navigation tracker - detects URL changes for cross-page action tracking

export class NavigationTracker {
    constructor(sendMessage) {
        this.sendMessage = sendMessage;
        this.currentUrl = window.location.href;
    }

    init() {
        // Track SPA navigations (pushState/replaceState)
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = (...args) => {
            originalPushState.apply(history, args);
            this.checkUrlChange();
        };

        history.replaceState = (...args) => {
            originalReplaceState.apply(history, args);
            this.checkUrlChange();
        };

        // Track popstate (back/forward buttons)
        window.addEventListener('popstate', () => this.checkUrlChange());

        // Track hash changes
        window.addEventListener('hashchange', () => this.checkUrlChange());

        console.log('🔗 Navigation tracker initialized, current URL:', this.currentUrl);
    }

    checkUrlChange() {
        const newUrl = window.location.href;
        if (newUrl !== this.currentUrl) {
            const oldUrl = this.currentUrl;
            this.currentUrl = newUrl;

            console.log('🔗 URL changed:', oldUrl, '→', newUrl);

            this.sendMessage({
                message: "recState"
            }, (response) => {
                if (response?.recState) {
                    this.sendMessage({
                        message: "onUrlChange",
                        url: newUrl,
                        previousUrl: oldUrl,
                        timestamp: Date.now()
                    });
                    console.log('📍 GO_TO_URL marker sent for:', newUrl);
                }
            });
        }
    }
}

export function initializeNavigationTracking(sendMessage) {
    const tracker = new NavigationTracker(sendMessage);
    tracker.init();
    return tracker;
}
