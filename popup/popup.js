function getActiveTabHostname() {
    return browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => new URL(tabs[0].url).hostname);
}

function sendCommandToActiveTab(command) {
    browser.tabs.query({ currentWindow: true, active: true }).then((tabs) => {
        browser.tabs.sendMessage(tabs[0].id, { command });
    });
}

async function onPopupOpen() {
    const validUrls = await getValidUrls();
    const hostname = await getActiveTabHostname();

    document.getElementsByClassName("text_toggle")[0].textContent = hostname;

    const checkbox = document.getElementById("checkbox");
    checkbox.checked = validUrls.includes(hostname);

    checkbox.addEventListener("change", async () => {
        const urls = await getValidUrls();
        const index = urls.indexOf(hostname);
        const wasActive = index >= 0;

        if (wasActive) {
            urls.splice(index, 1);
        } else {
            urls.push(hostname);
        }

        await browser.storage.local.set({ valid_urls: urls });

        // Wait for the toggle animation
        await new Promise((r) => setTimeout(r, 300));

        sendCommandToActiveTab(wasActive ? "deactivate" : "activate");
        window.close();
    });
}

onPopupOpen();
