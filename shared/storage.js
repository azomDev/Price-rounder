/**
 * Shared storage helpers for the Price-rounder extension.
 *
 * This file is meant to be loaded via a <script> tag (or manifest
 * "js" entry) before the script that needs these helpers.  It
 * deliberately places everything on the global scope (no ES modules)
 * so it works in content-script and extension-page contexts alike.
 */

const DEFAULT_BRACKETS = [
    { from: 0, to: 100, precision: 0.1 },
    { from: 100, to: Infinity, precision: 1 },
];

async function getValidUrls() {
    return (await browser.storage.local.get("valid_urls")).valid_urls || [];
}

async function getBrackets() {
    const result = await browser.storage.local.get("brackets");
    if (!result.brackets) return structuredClone(DEFAULT_BRACKETS);
    // Restore Infinity from JSON (stored as null)
    return result.brackets.map((b) => ({
        ...b,
        to: b.to === null ? Infinity : b.to,
    }));
}

async function saveBrackets(brackets) {
    await browser.storage.local.set({ brackets });
}
