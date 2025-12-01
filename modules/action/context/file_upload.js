// File upload detection - finds actual input[type="file"] when clicking upload buttons

export class FileUploadDetector {
    constructor(getXpaths) {
        this.getXpaths = getXpaths;
    }

    /**
     * Find associated file input when clicking upload buttons/wrappers
     */
    findAssociatedFileInput(clickedElement) {
        // Check if clicked element IS the file input
        if (clickedElement.matches?.('input[type="file"]')) {
            return clickedElement;
        }

        // Check if clicked element CONTAINS a file input
        const childInput = clickedElement.querySelector?.('input[type="file"]');
        if (childInput) return childInput;

        // Check parent containers (up to 3 levels) for file input
        let parent = clickedElement.parentElement;
        for (let i = 0; i < 3 && parent; i++) {
            const input = parent.querySelector('input[type="file"]');
            if (input) return input;
            parent = parent.parentElement;
        }

        return null;
    }

    /**
     * Enrich click data with file input info if found
     */
    enrichClick(clickData, clickedElement) {
        const fileInput = this.findAssociatedFileInput(clickedElement);
        if (fileInput) {
            clickData.fileInput = {
                xpath: this.getXpaths(fileInput),
                id: fileInput.id || '',
                name: fileInput.name || '',
                accept: fileInput.accept || ''
            };
            console.log('📁 File input detected:', clickData.fileInput);
        }
        return clickData;
    }
}

export function initializeFileUploadDetection(getXpaths) {
    return new FileUploadDetector(getXpaths);
}
