// Inject tooltip styles into the page
function injectTooltipStyles() {
    const style = document.createElement("style");
    style.textContent = `
        .price-rounder-wrapped {
            position: relative;
            cursor: default;
        }
        .price-rounder-wrapped::after {
            content: attr(data-original-price);
            position: absolute;
            bottom: calc(100% + 6px);
            left: 50%;
            transform: translateX(-50%) scale(0.95);
            background: rgba(24, 24, 27, 0.92);
            color: #f4f4f5;
            font-size: 12px;
            font-weight: 500;
            line-height: 1;
            padding: 5px 9px;
            border-radius: 6px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.15s ease, transform 0.15s ease;
            z-index: 2147483647;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
            letter-spacing: 0.01em;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .price-rounder-wrapped:hover::after {
            opacity: 1;
            transform: translateX(-50%) scale(1);
        }
        .price-rounder-wrapped::before {
            content: "";
            position: absolute;
            bottom: calc(100% + 2px);
            left: 50%;
            transform: translateX(-50%) scale(0.95);
            border: 4px solid transparent;
            border-top-color: rgba(24, 24, 27, 0.92);
            opacity: 0;
            transition: opacity 0.15s ease, transform 0.15s ease;
            pointer-events: none;
            z-index: 2147483647;
        }
        .price-rounder-wrapped:hover::before {
            opacity: 1;
            transform: translateX(-50%) scale(1);
        }
    `;
    document.head.appendChild(style);
}

// add a fraction to the price if it exists
function return_amazon_fraction(priceContainer) {
    return "," + (Array.from(priceContainer.childNodes).some((node) => node.classList.contains("a-price-fraction")) ? priceContainer.getElementsByClassName("a-price-fraction")[0].textContent : "");
}

// round the price following some rules
function roundPrice(price) {
    // For prices over 200, round to the nearest ten if the units are more that 4.9 (295€ => 300€)
    if (price > 200 && price % 10 > 4.9) {
        price = Math.ceil(price / 10) * 10;
    }

    // For prices over 80, round to the nearest ten if the units are close to rounding up (88€ => 90€)
    else if (price > 80 && price % 10 > 6.9) {
        price = Math.ceil(price / 10) * 10;
    }

    // Round to the nearest whole number if cents are >= 0.85
    else if (price % 1 >= 0.85) {
        price = Math.round(price);
    }

    // Round to the nearest 0.1 if cents in tenths place are close to rounding up (e.g., 4.49 to 4.50)
    else if (price % 0.1 > 0.089) {
        price = Number(price.toFixed(1));
    }

    return price;
}

// Helper function to format and replace a price string, returns { original, rounded }
function formatPrice(price, currencySymbolsRegex) {
    const currencyMatch = price.match(currencySymbolsRegex);
    const currency = currencyMatch[0];
    const currencyFirst = currencyMatch.index === 0;

    let formattedPrice = price.replace(currency, "").replace(/\s+/g, "");

    const useComma = formattedPrice.includes(",");
    useComma && (formattedPrice = formattedPrice.replace(",", "."));

    const numericValue = Number(formattedPrice);
    const roundedValue = roundPrice(numericValue);

    // Skip if nothing changed
    if (numericValue === roundedValue) {
        return null;
    }

    let roundedPrice = roundedValue.toFixed(2);
    useComma && (roundedPrice = roundedPrice.replace(".", ","));

    const roundedString = currencyFirst ? currency + roundedPrice : roundedPrice + currency;

    return { original: price, rounded: roundedString };
}

// Create a tooltip-wrapped span for a rounded price
function createTooltipSpan(roundedText, originalText) {
    const span = document.createElement("span");
    span.className = "price-rounder-wrapped";
    span.setAttribute("data-original-price", originalText);
    span.textContent = roundedText;
    return span;
}

// round any price present in the element given by the application
const processElements = (elements) => {
    const valuePattern = `(\\d\\s*?){1,6}([.,]\\d{1,2})?`;
    const currencySymbolsRegex = `([€$£¥₹₩₽₺₪₦৳₱₨৳]|zł|CHF|د.إ|USD|EUR)`;
    const pricePattern = new RegExp(`(${valuePattern}\\s?${currencySymbolsRegex})|(${currencySymbolsRegex}\\s?${valuePattern})`, "g");

    elements.forEach((element) => {
        try {
            // Skip elements we already processed
            if (element.classList && element.classList.contains("price-rounder-wrapped")) {
                return;
            }

            // Regular price in text nodes
            let target_node = null;
            if (element.children.length <= 1) {
                target_node = Array.from(element.childNodes).find((node) => node.nodeType === Node.TEXT_NODE);
            }
            const matchedPrices = target_node?.nodeValue.match(pricePattern);
            if (matchedPrices) {
                // Build a document fragment that replaces the text node,
                // wrapping each matched price in a tooltip span
                const text = target_node.nodeValue;
                const fragment = document.createDocumentFragment();
                let lastIndex = 0;
                let anyReplaced = false;

                // Use a fresh regex for exec iteration
                const iterRegex = new RegExp(pricePattern.source, "g");
                let match;
                while ((match = iterRegex.exec(text)) !== null) {
                    const original = match[0];
                    const result = formatPrice(original, currencySymbolsRegex);

                    // Add any text before this match
                    if (match.index > lastIndex) {
                        fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
                    }

                    if (result) {
                        // Price was rounded — wrap in tooltip span
                        fragment.appendChild(createTooltipSpan(result.rounded, result.original));
                        anyReplaced = true;
                    } else {
                        // Price unchanged — keep as text
                        fragment.appendChild(document.createTextNode(original));
                    }

                    lastIndex = match.index + original.length;
                }

                if (anyReplaced) {
                    // Add any remaining text after the last match
                    if (lastIndex < text.length) {
                        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
                    }
                    target_node.parentNode.replaceChild(fragment, target_node);
                }
            }

            // Handle Amazon price display
            else if (element.classList && element.classList.contains("a-price")) {
                let priceContainer = element.querySelector('span[aria-hidden="true"]');
                if (priceContainer && priceContainer.children.length > 0) {
                    const offscreenEl = element.getElementsByClassName("a-offscreen")[0];
                    const priceText = offscreenEl ? offscreenEl.textContent : null;
                    let result = null;

                    if (priceText && priceText.match(pricePattern)) {
                        result = formatPrice(priceText, currencySymbolsRegex);
                    } else {
                        let reconstructed = (priceContainer.getElementsByClassName("a-price-whole")[0].textContent.replace(/\s+/g, "") + return_amazon_fraction(priceContainer)).replaceAll(",", ".").replace("..", ".") + priceContainer.getElementsByClassName("a-price-symbol")[0].textContent;
                        result = formatPrice(reconstructed, currencySymbolsRegex);
                    }

                    if (result) {
                        priceContainer.textContent = "";
                        priceContainer.appendChild(createTooltipSpan(result.rounded, result.original));
                    }
                }
            }
        } catch (error) {
            console.error("An error occurred while processing " + element + ": " + error);
        }
    });
};

function get_active_tab_hostname() {
    return new URL(window.location.href).hostname;
}

// get the valid urls stored in Firefox's storage
async function get_valid_urls() {
    return (await browser.storage.local.get("valid_urls")).valid_urls || [];
}

// query all elements, including shadow ones
function queryAllDeep(selector, root = document) {
    const elements = Array.from(root.querySelectorAll(selector));

    root.querySelectorAll("*").forEach((element) => {
        if (element.shadowRoot) {
            elements.push(...queryAllDeep(selector, element.shadowRoot));
        }
    });

    return elements;
}

// initialize the extension
async function initialize(force) {
    let valid_urls = await get_valid_urls();
    const active_page_hostname = await get_active_tab_hostname();

    if (valid_urls.includes(active_page_hostname) || force) {
        // Inject tooltip CSS once
        injectTooltipStyles();

        // Initialization
        initialRounding = () => processElements(queryAllDeep("*"));

        if (document.readyState !== "loading") {
            initialRounding();
        } else {
            document.addEventListener("DOMContentLoaded", function () {
                initialRounding();
            });
        }

        // Handle DOM changes
        const observer = new MutationObserver(handleNewNodes);

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }
}

// round price on every element updated in the DOM
function handleNewNodes(mutations) {
    const addedElements = [];

    mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Skip our own tooltip spans to avoid reprocessing
                if (node.classList && node.classList.contains("price-rounder-wrapped")) {
                    return;
                }
                addedElements.push(node);

                queryAllDeep("*", node).forEach((subNode) => {
                    if (!subNode.classList || !subNode.classList.contains("price-rounder-wrapped")) {
                        addedElements.push(subNode);
                    }
                });
            }
        });
    });

    if (addedElements.length > 0) {
        processElements(addedElements);
    }
}

// React to messages from the popup
function handleMessage(request, sender, sendResponse) {
    if (request.command === "activate") {
        initialize(true);
    } else if (request.command === "deactivate") {
        location.reload();
    } else {
        console.warn("The command", request.command, "from", sender, "was received but not handled");
    }
}

initialize(false);
browser.runtime.onMessage.addListener(handleMessage);
