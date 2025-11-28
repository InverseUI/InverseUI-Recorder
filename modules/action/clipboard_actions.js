// Clipboard event handlers for copy, cut, paste operations
export class ClipboardEventTracker {
    constructor(sendMessage, getXpaths) {
        this.sendMessage = sendMessage;
        this.getXpaths = getXpaths;
    }

    init() {
        document.addEventListener('copy', this.handleCopy.bind(this), true);
        document.addEventListener('cut', this.handleCut.bind(this), true);
        document.addEventListener('paste', this.handlePaste.bind(this), true);
        
        // Also track selection changes for better context
        document.addEventListener('selectionchange', this.handleSelectionChange.bind(this), true);
    }

    handleCopy(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const selection = window.getSelection();
                const target = event.target;
                const xpaths = this.getXpaths(target);
                
                const clipboardData = {
                    text: selection.toString(),
                    html: this.getSelectionHTML(),
                    rangeCount: selection.rangeCount
                };
                
                // Get selected text from input/textarea if applicable
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                    clipboardData.text = target.value.substring(
                        target.selectionStart, 
                        target.selectionEnd
                    );
                    clipboardData.selectionStart = target.selectionStart;
                    clipboardData.selectionEnd = target.selectionEnd;
                }
                
                this.sendMessage({
                    message: "onCopy",
                    xPath: xpaths,
                    clipboardData: clipboardData,
                    targetInfo: {
                        tagName: target.tagName,
                        isEditable: target.isContentEditable || 
                                   ['INPUT', 'TEXTAREA'].includes(target.tagName)
                    }
                });
            }
        });
    }

    handleCut(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const selection = window.getSelection();
                const target = event.target;
                const xpaths = this.getXpaths(target);
                
                const clipboardData = {
                    text: selection.toString(),
                    html: this.getSelectionHTML()
                };
                
                // Get cut text from input/textarea
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                    clipboardData.text = target.value.substring(
                        target.selectionStart, 
                        target.selectionEnd
                    );
                    clipboardData.selectionStart = target.selectionStart;
                    clipboardData.selectionEnd = target.selectionEnd;
                    clipboardData.originalValue = target.value;
                }
                
                this.sendMessage({
                    message: "onCut",
                    xPath: xpaths,
                    clipboardData: clipboardData,
                    targetInfo: {
                        tagName: target.tagName,
                        isEditable: target.isContentEditable || 
                                   ['INPUT', 'TEXTAREA'].includes(target.tagName)
                    }
                });
            }
        });
    }

    handlePaste(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const target = event.target;
                const xpaths = this.getXpaths(target);
                
                // Try to get clipboard data if available
                let pasteData = {
                    text: '',
                    html: '',
                    types: []
                };
                
                if (event.clipboardData) {
                    pasteData.types = Array.from(event.clipboardData.types);
                    pasteData.text = event.clipboardData.getData('text/plain');
                    pasteData.html = event.clipboardData.getData('text/html');
                }
                
                // Get paste position for input/textarea
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                    pasteData.pastePosition = target.selectionStart;
                    pasteData.originalValue = target.value;
                }
                
                this.sendMessage({
                    message: "onPaste",
                    xPath: xpaths,
                    pasteData: pasteData,
                    targetInfo: {
                        tagName: target.tagName,
                        type: target.type || null,
                        isEditable: target.isContentEditable || 
                                   ['INPUT', 'TEXTAREA'].includes(target.tagName)
                    }
                });
            }
        });
    }

    handleSelectionChange(event) {
        // Debounce selection changes to avoid too many events
        clearTimeout(this.selectionTimeout);
        this.selectionTimeout = setTimeout(() => {
            this.sendMessage({
                message: "recState"
            }, (response) => {
                if (response && response.recState) {
                    const selection = window.getSelection();
                    
                    if (selection.toString().length > 0) {
                        const range = selection.getRangeAt(0);
                        const container = range.commonAncestorContainer;
                        const element = container.nodeType === Node.TEXT_NODE ? 
                            container.parentElement : container;
                        
                        const xpaths = this.getXpaths(element);
                        
                        this.sendMessage({
                            message: "onSelectionChange",
                            xPath: xpaths,
                            selection: {
                                text: selection.toString(),
                                rangeCount: selection.rangeCount,
                                isCollapsed: selection.isCollapsed,
                                anchorOffset: selection.anchorOffset,
                                focusOffset: selection.focusOffset
                            }
                        });
                    }
                }
            });
        }, 500);
    }

    getSelectionHTML() {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const container = document.createElement('div');
            for (let i = 0; i < selection.rangeCount; i++) {
                container.appendChild(selection.getRangeAt(i).cloneContents());
            }
            return container.innerHTML;
        }
        return '';
    }
}