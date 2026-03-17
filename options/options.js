// ── Brackets UI ──

function renderBrackets(brackets) {
    const tbody = document.getElementById("bracketsBody");
    tbody.innerHTML = "";
    const single = brackets.length === 1;

    brackets.forEach((bracket, index) => {
        const tr = document.createElement("tr");
        const isLast = index === brackets.length - 1;

        // "Up to" cell
        const upToTd = document.createElement("td");

        if (single) {
            const label = document.createElement("input");
            label.type = "text";
            label.value = "All";
            label.disabled = true;
            label.setAttribute("tabindex", "-1");
            upToTd.appendChild(label);
        } else if (isLast) {
            const label = document.createElement("input");
            label.type = "text";
            label.value = "Above";
            label.disabled = true;
            label.setAttribute("tabindex", "-1");
            upToTd.appendChild(label);
        } else {
            const toInput = document.createElement("input");
            toInput.type = "number";
            toInput.value = bracket.to;
            toInput.min = bracket.from + 1;
            toInput.step = "any";
            toInput.addEventListener("change", () => onToChanged(index, toInput));
            upToTd.appendChild(toInput);
        }
        tr.appendChild(upToTd);

        // "Round to nearest" cell
        const precTd = document.createElement("td");
        const precInput = document.createElement("input");
        precInput.type = "number";
        precInput.value = bracket.precision;
        precInput.min = "0.01";
        precInput.step = "any";
        precInput.addEventListener("change", () => onPrecisionChanged(index, precInput));
        precTd.appendChild(precInput);
        tr.appendChild(precTd);

        // Remove button cell
        const removeTd = document.createElement("td");
        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-bracket-btn";
        removeBtn.textContent = "✕";
        removeBtn.title = "Remove bracket";
        if (single) {
            removeBtn.disabled = true;
        } else {
            removeBtn.addEventListener("click", () => removeBracket(index));
        }
        removeTd.appendChild(removeBtn);
        tr.appendChild(removeTd);

        tbody.appendChild(tr);
    });
}

async function onToChanged(index, input) {
    const brackets = await getBrackets();
    let value = parseFloat(input.value);

    if (isNaN(value) || value <= brackets[index].from) {
        value = brackets[index].from + 1;
        input.value = value;
    }

    brackets[index].to = value;

    if (index + 1 < brackets.length) {
        brackets[index + 1].from = value;
    }

    await saveBrackets(brackets);
    renderBrackets(brackets);
}

async function onPrecisionChanged(index, input) {
    const brackets = await getBrackets();
    let value = parseFloat(input.value);

    if (isNaN(value) || value <= 0) {
        value = 0.01;
        input.value = value;
    }

    brackets[index].precision = value;
    await saveBrackets(brackets);
}

async function addBracket() {
    const brackets = await getBrackets();
    const last = brackets[brackets.length - 1];

    const splitPoint = last.from + 100 || 100;
    last.to = splitPoint;

    brackets.push({
        from: splitPoint,
        to: Infinity,
        precision: last.precision,
    });

    await saveBrackets(brackets);
    renderBrackets(brackets);
}

async function removeBracket(index) {
    const brackets = await getBrackets();
    if (brackets.length <= 1) return;

    brackets.splice(index, 1);

    brackets[0].from = 0;
    for (let i = 1; i < brackets.length; i++) {
        brackets[i].from = brackets[i - 1].to;
    }
    brackets[brackets.length - 1].to = Infinity;

    await saveBrackets(brackets);
    renderBrackets(brackets);
}

// ── URL list UI ──

async function renderUrls() {
    const validUrls = await getValidUrls();
    const urlList = document.getElementById("urlList");
    urlList.innerHTML = "";

    validUrls.forEach((url, index) => {
        const listItem = document.createElement("li");
        listItem.className = "url-item";

        listItem.appendChild(document.createTextNode(url));

        const removeBtn = document.createElement("span");
        removeBtn.className = "remove-btn";
        removeBtn.title = "Remove site";
        removeBtn.textContent = "✕";
        removeBtn.onclick = () => removeUrl(index);

        listItem.appendChild(removeBtn);
        urlList.appendChild(listItem);
    });
}

async function removeUrl(index) {
    const validUrls = await getValidUrls();
    validUrls.splice(index, 1);
    await browser.storage.local.set({ valid_urls: validUrls });
    await renderUrls();
}

// ── Init ──

async function init() {
    renderBrackets(await getBrackets());
    document.getElementById("addBracket").addEventListener("click", addBracket);
    await renderUrls();
}

init();
