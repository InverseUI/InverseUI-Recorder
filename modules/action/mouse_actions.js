// Mouse event handlers for comprehensive tracking
import { getLabelForElement } from '../../util/dom_utils.js';

export class MouseEventTracker {
    constructor(sendMessage, getXpaths) {
        this.sendMessage = sendMessage;
        this.getXpaths = getXpaths;
        this.isDragging = false;
        this.dragStartData = null;
        this.dropdownDetector = null;  // Reactive dropdown detector
    }

    /**
     * Set the dropdown detector for reactive detection on clicks
     */
    setDropdownDetector(detector) {
        this.dropdownDetector = detector;
    }

    debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    init() {
        // Click events
        document.addEventListener('click', this.handleClick.bind(this), true);
        document.addEventListener('dblclick', this.handleDblClick.bind(this), true);
        document.addEventListener('contextmenu', this.handleContextMenu.bind(this), true);

        // Drag events - Only track the essential 3 events for action completeness
        // dragstart: User starts dragging
        // drop: Successful drop on valid target (dragstart → drop → dragend)
        // dragend: Always fires when drag ends (helps identify failed drags: dragstart → dragend without drop)
        document.addEventListener('dragstart', this.handleDragStart.bind(this), true);
        document.addEventListener('drop', this.handleDrop.bind(this), true);
        document.addEventListener('dragend', this.handleDragEnd.bind(this), true);
    }

    handleClick(event) {
        console.log('🖱️ Click detected on element:', event.target);
        this.sendMessage({
            message: "recState"
        }, (response) => {
            console.log('📝 Recording state response:', response);
            if (response && response.recState) {
                const target = event.target;
                const xpaths = this.getXpaths(target);
                const coords = { x: event.clientX, y: event.clientY };

                // Build click action data
                let clickData = {
                    message: "onClick",
                    xPath: xpaths,
                    coordinates: coords,
                    button: event.button
                };

                // Layer 1: Check if clicking on a native SELECT element or OPTION within SELECT
                let selectElement = null;
                if (target.tagName === 'SELECT') {
                    selectElement = target;
                } else if (target.tagName === 'OPTION' && target.parentElement?.tagName === 'SELECT') {
                    selectElement = target.parentElement;
                }

                // If clicking on a native dropdown, capture all options (Layer 1: Native)
                if (selectElement) {
                    const allOptions = Array.from(selectElement.options).map(opt => ({
                        value: opt.value,
                        text: opt.text,
                        index: opt.index,
                        selected: opt.selected,
                        disabled: opt.disabled
                    }));

                    clickData.dropdown = {
                        kind: 'native',
                        label: getLabelForElement(selectElement),
                        selectedValue: selectElement.value,
                        selectedText: selectElement.selectedOptions[0]?.text || '',
                        selectedIndex: selectElement.selectedIndex,
                        allOptions: allOptions,
                        isMultiple: selectElement.multiple,
                        detectionConfidence: 1.0
                    };

                    console.log('📋 Native dropdown detected on click:', clickData.dropdown);
                }

                // Layers 2-3: Reactive dropdown detection (ARIA + Heuristic)
                // This analyzes BACKWARDS at click time - no prediction needed
                if (this.dropdownDetector && !clickData.dropdown) {
                    clickData = this.dropdownDetector.enrichClick(clickData, target);
                }

                console.log('✅ Sending click action:', clickData);
                this.sendMessage(clickData);
            } else {
                console.log('❌ Recording not active, click ignored');
            }
        });
    }

    handleDblClick(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const target = event.target;
                const xpaths = this.getXpaths(target);

                this.sendMessage({
                    message: "onDblClick",
                    xPath: xpaths,
                    coordinates: { x: event.clientX, y: event.clientY }
                });
            }
        });
    }

    handleContextMenu(event) {
        const target = event.target;
        const xpaths = this.getXpaths(target);

        this.sendMessage({
            message: "onContextMenuClick",
            xPath: xpaths,
            content: target.textContent,
            coordinates: { x: event.clientX, y: event.clientY }
        });
    }

    handleMouseMove(event) {
        if (this.isDragging) {
            this.sendMessage({
                message: "recState"
            }, (response) => {
                if (response && response.recState) {
                    this.sendMessage({
                        message: "onMouseMove",
                        coordinates: { x: event.clientX, y: event.clientY },
                        isDragging: true
                    });
                }
            });
        }
    }

    handleDragStart(event) {
        this.isDragging = true;
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const target = event.target;
                const xpaths = this.getXpaths(target);

                this.dragStartData = {
                    xPath: xpaths,
                    startCoords: { x: event.clientX, y: event.clientY }
                };

                this.sendMessage({
                    message: "onDragStart",
                    xPath: xpaths,
                    coordinates: { x: event.clientX, y: event.clientY },
                    dataTransfer: {
                        effectAllowed: event.dataTransfer.effectAllowed,
                        types: Array.from(event.dataTransfer.types)
                    }
                });
            }
        });
    }

    handleDragEnd(event) {
        this.isDragging = false;
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const target = event.target;
                const xpaths = this.getXpaths(target);

                this.sendMessage({
                    message: "onDragEnd",
                    xPath: xpaths,
                    coordinates: { x: event.clientX, y: event.clientY },
                    dropEffect: event.dataTransfer.dropEffect
                });

                this.dragStartData = null;
            }
        });
    }

    handleDragEnter(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const target = event.target;
                const xpaths = this.getXpaths(target);

                this.sendMessage({
                    message: "onDragEnter",
                    xPath: xpaths
                });
            }
        });
    }

    handleDragLeave(event) {
        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const target = event.target;
                const xpaths = this.getXpaths(target);

                this.sendMessage({
                    message: "onDragLeave",
                    xPath: xpaths
                });
            }
        });
    }

    handleDragOver(event) {
        // Prevent default to allow drop
        event.preventDefault();
    }

    handleDrop(event) {
        event.preventDefault();
        this.isDragging = false;

        this.sendMessage({
            message: "recState"
        }, (response) => {
            if (response && response.recState) {
                const target = event.target;
                const xpaths = this.getXpaths(target);

                this.sendMessage({
                    message: "onDrop",
                    xPath: xpaths,
                    coordinates: { x: event.clientX, y: event.clientY },
                    dragStartData: this.dragStartData,
                    dataTransfer: {
                        dropEffect: event.dataTransfer.dropEffect,
                        types: Array.from(event.dataTransfer.types)
                    }
                });

                this.dragStartData = null;
            }
        });
    }
}
