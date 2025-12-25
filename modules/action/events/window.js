// Window and document level event handlers
export class WindowEventTracker {
    constructor(sendMessage, getXpaths) {
        this.sendMessage = sendMessage;
        this.getXpaths = getXpaths;
        this.resizeDebounced = this.debounce(this.handleResize.bind(this), 500);
        this.scrollDebounced = this.debounce(this.handleScroll.bind(this), 300);
        this.lastWindowSize = {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    init() {
        // Window events
        window.addEventListener('resize', this.resizeDebounced, true);

        // Document events
        document.addEventListener('fullscreenchange', this.handleFullscreenChange.bind(this), true);

        // Scroll events (both window and element level) - debounced to capture final position
        window.addEventListener('scroll', this.scrollDebounced, true);

        // Note: popstate is handled by NavigationTracker for unified URL change tracking
    }

    handleResize(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const newSize = {
                    width: window.innerWidth,
                    height: window.innerHeight
                };
                
                // Only track significant size changes
                if (Math.abs(newSize.width - this.lastWindowSize.width) > 10 ||
                    Math.abs(newSize.height - this.lastWindowSize.height) > 10) {
                    
                    this.sendMessage({
                        message: "onWindowResize",
                        previousSize: this.lastWindowSize,
                        newSize: newSize,
                        screen: {
                            width: window.screen.width,
                            height: window.screen.height,
                            availWidth: window.screen.availWidth,
                            availHeight: window.screen.availHeight
                        }
                    });
                    
                    this.lastWindowSize = newSize;
                }
            }
        });
    }

    handleScroll(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const target = event.target;
                
                if (target === document || target === document.body || target === window) {
                    // Window scroll
                    this.sendMessage({
                        message: "onWindowScroll",
                        scrollPosition: {
                            x: window.scrollX || window.pageXOffset,
                            y: window.scrollY || window.pageYOffset
                        },
                        documentSize: {
                            width: document.documentElement.scrollWidth,
                            height: document.documentElement.scrollHeight
                        },
                        viewportSize: {
                            width: window.innerWidth,
                            height: window.innerHeight
                        }
                    });
                } else {
                    // Element scroll
                    const xpaths = this.getXpaths(target);
                    
                    this.sendMessage({
                        message: "onElementScroll",
                        xPath: xpaths,
                        scrollPosition: {
                            top: target.scrollTop,
                            left: target.scrollLeft
                        },
                        scrollSize: {
                            width: target.scrollWidth,
                            height: target.scrollHeight
                        },
                        clientSize: {
                            width: target.clientWidth,
                            height: target.clientHeight
                        }
                    });
                }
            }
        });
    }

    handleFullscreenChange(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const fullscreenElement = document.fullscreenElement || 
                                        document.webkitFullscreenElement || 
                                        document.mozFullScreenElement || 
                                        document.msFullscreenElement;
                
                let xpaths = null;
                if (fullscreenElement) {
                    xpaths = this.getXpaths(fullscreenElement);
                }
                
                this.sendMessage({
                    message: "onFullscreenChange",
                    isFullscreen: !!fullscreenElement,
                    elementXPath: xpaths
                });
            }
        });
    }

}