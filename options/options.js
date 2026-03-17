// get the valid urls stored in Firefox's storage
async function get_valid_urls() {
    return (await browser.storage.local.get("valid_urls")).valid_urls || [];
}

// Function to render the URLs in the list
async function renderUrls() {
    const valid_urls = await get_valid_urls(); //get urls in use
    const urlList = document.getElementById("urlList");
    urlList.innerHTML = ""; // Clear the list before re-rendering

    valid_urls.forEach((url, index) => {
        const listItem = document.createElement("li");
        listItem.className = "url-item";

        // URL text
        const urlText = document.createTextNode(url);
        listItem.appendChild(urlText);

        // Remove button
        const removeBtn = document.createElement("span");
        removeBtn.className = "remove-btn";
        removeBtn.title = "Delete the url";
        removeBtn.textContent = "✖";
        removeBtn.onclick = function () {
            removeUrl(index);
        };

        listItem.appendChild(removeBtn);
        urlList.appendChild(listItem);
    });
}

// Function to remove a URL and remove it from the storage list
async function removeUrl(index) {
    valid_urls = await get_valid_urls();
    valid_urls.splice(index, 1); // Remove the URL from the array
    await browser.storage.local.set({ valid_urls });

    await renderUrls(); // Re-render the list
}

// Initial render of the list
renderUrls();
