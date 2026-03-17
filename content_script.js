const PROCESSED_CLASS = "price-rounder-wrapped";
const VALUE_PATTERN = `(\\d\\s*?){1,6}([.,]\\d{1,2})?`;
const CURRENCY_PATTERN = `([€$£¥₹₩₽₺₪₦৳₱₨৳]|zł|CHF|د.إ|USD|EUR)`;
const PRICE_PATTERN = new RegExp(`(${VALUE_PATTERN}\\s?${CURRENCY_PATTERN})|(${CURRENCY_PATTERN}\\s?${VALUE_PATTERN})`, "g");

let activeBrackets = DEFAULT_BRACKETS;

// ── Rounding ──

function roundPrice(price) {
    for (const bracket of activeBrackets) {
        if (price >= bracket.from && price < bracket.to) {
            return Math.ceil(price / bracket.precision) * bracket.precision;
        }
    }
    return price;
}

// ── Price formatting ──

function formatPrice(priceStr) {
    const currencyMatch = priceStr.match(CURRENCY_PATTERN);
    const currency = currencyMatch[0];
    const currencyFirst = currencyMatch.index === 0;

    let numericStr = priceStr.replace(currency, "").replace(/\s+/g, "");
    const useComma = numericStr.includes(",");
    if (useComma) numericStr = numericStr.replace(",", ".");

    let rounded = roundPrice(Number(numericStr)).toFixed(2);
    if (useComma) rounded = rounded.replace(".", ",");

    const roundedStr = currencyFirst ? currency + rounded : rounded + currency;
    return { original: priceStr, rounded: roundedStr };
}

// ── DOM helpers ──

function isProcessed(element) {
    return element.classList && element.classList.contains(PROCESSED_CLASS);
}

function createTooltipSpan(roundedText, originalText) {
    const span = document.createElement("span");
    span.className = PROCESSED_CLASS;
    span.setAttribute("data-original-price", originalText);
    span.textContent = roundedText;
    return span;
}

function queryAllDeep(selector, root = document) {
    const elements = Array.from(root.querySelectorAll(selector));
    for (const el of root.querySelectorAll("*")) {
        if (el.shadowRoot) {
            elements.push(...queryAllDeep(selector, el.shadowRoot));
        }
    }
    return elements;
}

// ── Amazon-specific ──

function getAmazonFraction(priceContainer) {
    const hasFraction = Array.from(priceContainer.childNodes).some((node) => node.classList && node.classList.contains("a-price-fraction"));
    return "," + (hasFraction ? priceContainer.getElementsByClassName("a-price-fraction")[0].textContent : "");
}

function processAmazonPrice(element) {
    const priceContainer = element.querySelector('span[aria-hidden="true"]');
    if (!priceContainer || priceContainer.children.length === 0) return;

    const offscreenEl = element.getElementsByClassName("a-offscreen")[0];
    const offscreenText = offscreenEl ? offscreenEl.textContent : null;

    let result;
    if (offscreenText && offscreenText.match(PRICE_PATTERN)) {
        result = formatPrice(offscreenText);
    } else {
        const whole = priceContainer.getElementsByClassName("a-price-whole")[0].textContent.replace(/\s+/g, "");
        const symbol = priceContainer.getElementsByClassName("a-price-symbol")[0].textContent;
        const reconstructed = (whole + getAmazonFraction(priceContainer)).replaceAll(",", ".").replace("..", ".") + symbol;
        result = formatPrice(reconstructed);
    }

    priceContainer.textContent = "";
    priceContainer.appendChild(createTooltipSpan(result.rounded, result.original));
}

// ── Text node processing ──

function processTextNode(targetNode) {
    const text = targetNode.nodeValue;
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    let anyMatched = false;

    const regex = new RegExp(PRICE_PATTERN.source, "g");
    let match;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }

        const result = formatPrice(match[0]);
        fragment.appendChild(createTooltipSpan(result.rounded, result.original));
        anyMatched = true;
        lastIndex = match.index + match[0].length;
    }

    if (!anyMatched) return;

    if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    targetNode.parentNode.replaceChild(fragment, targetNode);
}

// ── Main processing ──

function processElements(elements) {
    for (const element of elements) {
        try {
            if (isProcessed(element)) continue;

            // Try regular text node first
            if (element.children.length <= 1) {
                const textNode = Array.from(element.childNodes).find((n) => n.nodeType === Node.TEXT_NODE);
                if (textNode && textNode.nodeValue.match(PRICE_PATTERN)) {
                    processTextNode(textNode);
                    continue;
                }
            }

            // Amazon-specific price elements
            if (element.classList && element.classList.contains("a-price")) {
                processAmazonPrice(element);
            }
        } catch (error) {
            console.error("Price Rounder: error processing element:", error);
        }
    }
}

// ── Mutation observer ──

function handleMutations(mutations) {
    const elements = [];

    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.nodeType !== Node.ELEMENT_NODE || isProcessed(node)) continue;

            elements.push(node);
            for (const child of queryAllDeep("*", node)) {
                if (!isProcessed(child)) elements.push(child);
            }
        }
    }

    if (elements.length > 0) processElements(elements);
}

// ── Initialization ──

async function initialize(force) {
    const validUrls = await getValidUrls();
    const hostname = new URL(window.location.href).hostname;

    if (!validUrls.includes(hostname) && !force) return;

    activeBrackets = await getBrackets();

    const runRounding = () => processElements(queryAllDeep("*"));

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", runRounding);
    } else {
        runRounding();
    }

    new MutationObserver(handleMutations).observe(document.body, {
        childList: true,
        subtree: true,
    });
}

// ── Message handling ──

function handleMessage(request) {
    if (request.command === "activate") {
        initialize(true);
    } else if (request.command === "deactivate") {
        location.reload();
    }
}

initialize(false);
browser.runtime.onMessage.addListener(handleMessage);
