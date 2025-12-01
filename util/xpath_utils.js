// XPath generation utilities - Multiple algorithms for robust element identification

/**
 * Generate multiple XPath expressions for an element
 * Returns array of unique, validated XPaths
 */
export function getXpaths(element) {
    if (!element || !element.tagName) return [];
    
    var paths = [];
    paths.push(getElementInfo_Custom(element, false));
    paths.push(getElementInfo_Custom(element, true));
    paths.push(getElementInfo_Moz(element));
    
    // Deduplicate paths
    var unique = paths.filter(function(path, index, self) {
        return path && self.indexOf(path) === index;
    });
    
    // Validate each XPath
    unique = unique.filter(function(xpath) {
        try {
            var result = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
            var count = 0;
            var node = result.iterateNext();
            while (node) {
                count++;
                node = result.iterateNext();
            }
            return count === 1; // Only return unique XPaths
        } catch (e) {
            return false;
        }
    });
    
    return unique;
}

/**
 * Custom XPath generation with optional attribute-based targeting
 */
export function getElementInfo_Custom(element, useAttributes) {
    var getSiblingInfo = function(element, useAttributes) {
        var info = { num: 0, index: 1 };
        var prevCount = 0;
        var nextCount = 0;
        var prevSibling = element.previousSibling;
        var nextSibling = element.nextSibling;
        
        if (useAttributes) {
            while (prevSibling !== null) {
                if (prevSibling.id === element.id && 
                    prevSibling.tagName === element.tagName && 
                    prevSibling.name === element.name && 
                    prevSibling.className === element.className && 
                    prevSibling.type === element.type) {
                    prevCount += 1;
                }
                prevSibling = prevSibling.previousSibling;
            }
            while (nextSibling !== null) {
                if (nextSibling.id === element.id && 
                    nextSibling.tagName === element.tagName && 
                    nextSibling.name === element.name && 
                    nextSibling.className === element.className && 
                    nextSibling.type === element.type) {
                    nextCount += 1;
                }
                nextSibling = nextSibling.nextSibling;
            }
        } else {
            while (prevSibling !== null) {
                if (prevSibling.tagName === element.tagName) {
                    prevCount += 1;
                }
                prevSibling = prevSibling.previousSibling;
            }
            while (nextSibling !== null) {
                if (nextSibling.tagName === element.tagName) {
                    nextCount += 1;
                }
                nextSibling = nextSibling.nextSibling;
            }
        }
        
        info.num = prevCount + nextCount;
        info.index += prevCount;
        return info;
    };
    
    var getElementString = function(element, useAttributes) {
        // Check if element has tagName property
        if (!element || !element.tagName) {
            return '';
        }
        var tagName = element.tagName.toLowerCase();
        var siblingInfo = getSiblingInfo(element, useAttributes);
        
        if (useAttributes) {
            var attributes = [];
            var attrNames = ["@type=", "@class=", "@name=", "@id="];
            var attrValues = [element.type, element.className, element.name, element.id];
            
            for (var i = attrNames.length - 1; i >= 0; i--) {
                if (typeof attrValues[i] !== "undefined" && attrValues[i] !== "") {
                    attributes.push(attrNames[i] + "'" + attrValues[i] + "'");
                }
            }
            
            if (attributes.length > 0) {
                tagName += "[" + attributes.join(" and ") + "]";
            }
        }
        
        if (siblingInfo.num > 0) {
            tagName += "[" + siblingInfo.index + "]";
        }
        
        return tagName;
    };
    
    var buildPath = function(element, useAttributes) {
        var path = getElementString(element, useAttributes);
        if (!path) {
            return '';
        }
        var parent = element.parentNode;
        
        while (parent && parent.tagName) {
            if (!useAttributes) {
                if (element.id !== "") {
                    return "//" + element.tagName.toLowerCase() + "[@id='" + element.id + "']";
                }
                if (parent.id !== "") {
                    return "//" + parent.tagName.toLowerCase() + "[@id='" + parent.id + "']/" + path;
                }
            }
            path = getElementString(parent, useAttributes) + "/" + path;
            parent = parent.parentNode;
        }
        
        return path.replace(/^((\/){0,2}html)/, "/html");
    };
    
    return buildPath(element, useAttributes);
}

/**
 * Mozilla-style XPath generation (more standardized approach)
 */
export function getElementInfo_Moz(element) {
    if (element && element.id) {
        return '//*[@id="' + element.id + '"]';
    }
    
    var paths = [];
    for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
        var index = 0;
        var hasFollowingSiblings = false;
        
        for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling) {
            if (sibling.nodeType === Node.DOCUMENT_TYPE_NODE) continue;
            if (sibling.nodeName === element.nodeName) ++index;
        }
        
        for (var sibling = element.nextSibling; sibling && !hasFollowingSiblings; sibling = sibling.nextSibling) {
            if (sibling.nodeName === element.nodeName) hasFollowingSiblings = true;
        }
        
        var tagName = (element.prefix ? element.prefix + ":" : "") + element.localName;
        var pathIndex = "[" + (index + 1) + "]";
        paths.splice(0, 0, tagName + pathIndex);
    }
    
    return paths.length ? "/" + paths.join("/") : null;
}

/**
 * Validate XPath syntax and uniqueness
 */
export function validateXPath(xpath) {
    try {
        const result = document.evaluate(xpath, document, null, XPathResult.ANY_TYPE, null);
        let count = 0;
        let node = result.iterateNext();
        while (node) {
            count++;
            node = result.iterateNext();
        }
        return { 
            valid: true, 
            count: count,
            isUnique: count === 1 
        };
    } catch (e) {
        return { 
            valid: false, 
            error: e.message 
        };
    }
}