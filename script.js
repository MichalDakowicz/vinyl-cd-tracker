const darkModeToggle = document.querySelector("#dark-mode-toggle");
const body = document.body;

const viewModeButton = document.querySelector("#viewModeButton");
const resultsContainer = document.querySelector("#results");
let isGridView = localStorage.getItem("viewMode") === "grid";

function toggleDarkMode(event) {
    if (event.target.checked) {
        body.classList.add("dark-mode");
        localStorage.setItem("darkMode", "enabled");
    } else {
        body.classList.remove("dark-mode");
        localStorage.removeItem("darkMode");
    }
}

const darkMode = localStorage.getItem("darkMode");
if (darkMode === "enabled") {
    body.classList.add("dark-mode");
    darkModeToggle.checked = true;
}

function getIconPath(iconName) {
    const darkMode = body.classList.contains("dark-mode");
    return darkMode ? `img/${iconName}-dark-mode.svg` : `img/${iconName}.svg`;
}

function updateAddItemButtonIcon() {
    const addItemButtonIcon = document.querySelector("#addItemButton img");
    const exportButtonIcon = document.querySelector("#exportButton img");
    const importButtonIcon = document.querySelector("#importButton img");

    addItemButtonIcon.src = getIconPath("add");
    exportButtonIcon.src = getIconPath("export");
    importButtonIcon.src = getIconPath("import");

    const modalAddButtonIcon = document.querySelector(
        "#addItemForm button[type='submit'] img"
    );
    modalAddButtonIcon.src = getIconPath("add");

    viewModeButton.querySelector("img").src = getIconPath(
        isGridView ? "list" : "grid"
    );

    const randomButtonIcon = document.querySelector("#randomButton img");
    const clearButtonIcon = document.querySelector("#clearButton img");

    randomButtonIcon.src = getIconPath("random");
    clearButtonIcon.src = getIconPath("clear");
}

darkModeToggle.addEventListener("change", (event) => {
    toggleDarkMode(event);
    renderItems(items);
    updateAddItemButtonIcon();
});

document.addEventListener("DOMContentLoaded", () => {
    updateAddItemButtonIcon();
});

const modal = document.querySelector("#addItemModal");
const addItemButton = document.querySelector("#addItemButton");
const closeModalButton = document.querySelector(".close");
const addItemForm = document.querySelector("#addItemForm");

addItemButton.addEventListener("click", () => {
    modal.style.display = "block";
    addItemForm.reset();
    formPreviewCard.innerHTML = "";
});

closeModalButton.addEventListener("click", () => {
    modal.style.display = "none";
});

window.addEventListener("click", (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
    }
});

const previewModal = document.querySelector("#previewModal");
const previewCard = document.querySelector("#previewCard");
const closePreviewButton = document.querySelector("#closePreview");

closePreviewButton.addEventListener("click", () => {
    previewModal.style.display = "none";
});

window.addEventListener("click", (event) => {
    if (event.target == previewModal) {
        previewModal.style.display = "none";
    }
});

function saveItemsToLocalStorage(items) {
    localStorage.setItem("items", JSON.stringify(items));
}

function loadItemsFromLocalStorage() {
    try {
        const storedItems = localStorage.getItem("items");
        if (!storedItems) return [];

        const parsedItems = JSON.parse(storedItems);
        if (!Array.isArray(parsedItems)) return [];

        let needsUpdate = false;
        const validItems = parsedItems
            .filter((item) => item && typeof item === "object")
            .map((item) => {
                if (!item.id) {
                    needsUpdate = true;
                    return {
                        ...item,
                        id: Date.now() + Math.random(),
                    };
                }
                return item;
            });

        if (needsUpdate) {
            localStorage.setItem("items", JSON.stringify(validItems));
        }

        return validItems;
    } catch (error) {
        console.error("Error loading items:", error);
        return [];
    }
}

const items = loadItemsFromLocalStorage();

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB");
}

function renderItems(itemsToRender) {
    const results = document.querySelector("#results");
    results.innerHTML = "";

    const sortedItems = [...itemsToRender];

    sortedItems.sort((a, b) => {
        if (a.wanted === b.wanted) {
            return 0;
        }
        return a.wanted ? 1 : -1;
    });

    sortedItems.forEach((item, index) => {
        const typesBadges = Object.entries(item.types || {})
            .filter(([_, checked]) => checked)
            .map(
                ([type]) =>
                    `<span class="type-badge">${type.toUpperCase()}</span>`
            )
            .join("");

        const newItemElement = document.createElement("div");
        newItemElement.classList.add("card");
        if (item.wanted) {
            newItemElement.classList.add("wanted");
        }

        const imageUrl = item.imageUrl || "";
        const albumName = item.albumName || "Untitled";
        const albumArtists = item.albumArtists || "Unknown Artist";
        const releaseDate =
            item.releaseDate || new Date().toISOString().split("T")[0];

        const linkButton = item.albumLink
            ? `
            <button class="linkButton" title="Open Album Link" data-url="${
                item.albumLink
            }">
                <img src="${getIconPath("link")}" alt="Link">
            </button>
        `
            : "";

        newItemElement.innerHTML = `
            <img src="${imageUrl}" alt="Album Image" onerror="this.src='img/default-album.png'">
            <div class="album-info">
                <h3>${albumName}</h3>
                <p>${albumArtists}</p>
                <p>${formatDate(releaseDate)}</p>
                <div class="type-badges">${typesBadges}</div>
            </div>
            <div class="actions">
                ${linkButton}
                <button class="editButton" data-index="${index}">
                    <img src="${getIconPath("edit")}" alt="Edit">
                </button>
                <button class="removeButton" data-index="${index}">
                    <img src="${getIconPath("delete")}" alt="Remove">
                </button>
            </div>
        `;
        newItemElement.setAttribute("data-index", index);
        newItemElement.setAttribute("data-id", item.id); 
        results.appendChild(newItemElement);
    });

    document.querySelectorAll(".linkButton").forEach((button) => {
        button.addEventListener("click", (e) => {
            e.preventDefault();
            window.open(button.dataset.url, "_blank");
        });
    });

    initDragAndDrop();
}

const searchInput = document.querySelector("#search");
const clearButton = document.querySelector("#clearButton");

function searchItems(query) {
    if (!query) {
        renderItems(items);
        return;
    }

    const searchQuery = query.toLowerCase().trim();
    const filteredItems = items.filter((item) => {
        const albumName = (item.albumName || "").toLowerCase();
        const albumArtists = (item.albumArtists || "").toLowerCase();
        const releaseDate = formatDate(item.releaseDate || "");
        const types = Object.entries(item.types || {})
            .filter(([_, checked]) => checked)
            .map(([type]) => type.toLowerCase());

        return (
            albumName.includes(searchQuery) ||
            albumArtists.includes(searchQuery) ||
            releaseDate.includes(searchQuery) ||
            types.some((type) => type.includes(searchQuery))
        );
    });

    renderItems(filteredItems);
}

searchInput.addEventListener("input", () => {
    searchItems(searchInput.value);
});

clearButton.addEventListener("click", () => {
    searchInput.value = "";
    renderItems(items);
});

searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        searchItems(searchInput.value);
    }
});

function refreshItems() {
    saveItemsToLocalStorage(items);
    searchItems(searchInput.value);
}

renderItems(items);

let isEditing = false;
let editingIndex = null;

const formPreviewCard = document.querySelector("#formPreviewCard");

function updateFormPreview() {
    const imageUrl = document.querySelector("#imageUrl").value;
    const albumName = document.querySelector("#albumName").value;
    const albumArtists = document.querySelector("#albumArtists").value;
    const releaseDate = document.querySelector("#releaseDate").value;
    const types = {
        vinyl: document.querySelector("#vinylCheck").checked,
        cd: document.querySelector("#cdCheck").checked,
    };

    const typesBadges = Object.entries(types)
        .filter(([_, checked]) => checked)
        .map(
            ([type]) => `<span class="type-badge">${type.toUpperCase()}</span>`
        )
        .join("");

    formPreviewCard.innerHTML = `
        <img src="${imageUrl}" alt="Album Image">
        <div class="album-info">
            <h3>${albumName}</h3>
            <p>${albumArtists}</p>
            <p>${formatDate(releaseDate)}</p>
            <div class="type-badges">${typesBadges}</div>
        </div>
    `;
}

document
    .querySelectorAll(
        "#imageUrl, #albumName, #albumArtists, #releaseDate, #vinylCheck, #cdCheck"
    )
    .forEach((input) => {
        input.addEventListener("input", updateFormPreview);
        if (input.type === "checkbox") {
            input.addEventListener("change", updateFormPreview);
        }
    });

function addItemFormSubmitHandler(event) {
    event.preventDefault();
    const imageUrl = document.querySelector("#imageUrl").value;
    const albumName = document.querySelector("#albumName").value;
    const albumArtists = document.querySelector("#albumArtists").value;
    const releaseDate = document.querySelector("#releaseDate").value;
    const wanted = document.querySelector("#wantedToggle").checked;
    const albumLink = document.querySelector("#albumLink").value;
    const types = {
        vinyl: document.querySelector("#vinylCheck").checked,
        cd: document.querySelector("#cdCheck").checked,
    };

    const newItem = {
        id: Date.now(),
        imageUrl,
        albumName,
        albumArtists,
        releaseDate,
        wanted,
        types,
        albumLink: albumLink || null,
    };

    if (isEditing && editingIndex !== null) {
        items[editingIndex] = { ...newItem, id: items[editingIndex].id };
    } else {
        items.push(newItem);
    }

    refreshItems();
    modal.style.display = "none";
    addItemForm.reset();
    formPreviewCard.innerHTML = "";

    isEditing = false;
    editingIndex = null;
}

addItemForm.addEventListener("submit", addItemFormSubmitHandler);

document.querySelector("#results").addEventListener("click", (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    if (target.classList.contains("editButton")) {
        const index = target.dataset.index;
        const item = items[index];
        document.querySelector("#imageUrl").value = item.imageUrl;
        document.querySelector("#albumName").value = item.albumName;
        document.querySelector("#albumArtists").value = item.albumArtists;
        document.querySelector("#releaseDate").value = item.releaseDate;
        document.querySelector("#wantedToggle").checked = item.wanted;
        document.querySelector("#albumLink").value = item.albumLink || "";
        document.querySelector("#vinylCheck").checked =
            item.types?.vinyl || false;
        document.querySelector("#cdCheck").checked = item.types?.cd || false;
        modal.style.display = "block";

        updateFormPreview();

        isEditing = true;
        editingIndex = index;
    } else if (target.classList.contains("removeButton")) {
        const index = target.dataset.index;
        items.splice(index, 1);
        refreshItems();
    }
});

const exportButton = document.querySelector("#exportButton");
const importButton = document.querySelector("#importButton");

exportButton.addEventListener("click", () => {
    const dataStr = JSON.stringify(items, null, 2);
    const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = "vinyl-cd-tracker-data.json";

    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
});

importButton.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";

    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const importedItems = JSON.parse(event.target.result);
                items.length = 0;
                items.push(...importedItems);
                refreshItems();
            } catch (error) {
                alert(
                    "Error importing file. Please make sure it's a valid JSON file."
                );
            }
        };

        reader.readAsText(file);
    };

    input.click();
});

function toggleViewMode() {
    isGridView = !isGridView;
    updateViewMode();
    localStorage.setItem("viewMode", isGridView ? "grid" : "list");
}

function updateViewMode() {
    resultsContainer.className = isGridView ? "grid-view" : "list-view";
    viewModeButton.querySelector("img").src = getIconPath(
        isGridView ? "list" : "grid"
    );
    viewModeButton.title = `Switch to ${isGridView ? "List" : "Grid"} View`;
}

updateViewMode();

viewModeButton.addEventListener("click", toggleViewMode);

function initDragAndDrop() {
    const cards = document.querySelectorAll(".card");

    cards.forEach((card) => {
        if (!card) return;

        try {
            card.setAttribute("draggable", true);

            const cardImage = card.querySelector("img");
            if (cardImage) {
                cardImage.setAttribute("draggable", false);
            }

            card.addEventListener("dragstart", (e) => {
                card.classList.add("dragging");
                e.dataTransfer.setData("text/plain", card.dataset.index);
            });

            card.addEventListener("dragend", () => {
                card.classList.remove("dragging");
            });

            card.addEventListener("dragover", (e) => {
                e.preventDefault();
                const draggingCard = document.querySelector(".dragging");
                if (!draggingCard || draggingCard === card) return;

                const box = card.getBoundingClientRect();
                const dragY = e.clientY;
                const dropPosition = dragY < box.top + box.height / 2;

                if (dropPosition) {
                    card.parentNode.insertBefore(draggingCard, card);
                } else {
                    card.parentNode.insertBefore(
                        draggingCard,
                        card.nextSibling
                    );
                }

                clearTimeout(card.dataset.saveTimeout);
                card.dataset.saveTimeout = setTimeout(saveNewOrder, 100);
            });
        } catch (error) {
            console.error("Error setting up drag and drop for card:", error);
        }
    });
}

document.querySelector("#results").removeEventListener("dragend", saveNewOrder);

function saveNewOrder() {
    const cards = document.querySelectorAll(".card");
    const newOrder = [];

    const itemMap = new Map(items.map((item) => [item.id, item]));

    cards.forEach((card) => {
        const index = parseInt(card.dataset.index);
        const item = items[index];
        if (item) {
            newOrder.push(item);
        }
    });

    items.length = 0;
    items.push(...newOrder);

    saveItemsToLocalStorage(items);
}

const randomButton = document.querySelector("#randomButton");

randomButton.addEventListener("click", () => {
    if (items.length === 0) return;
    const randomIndex = Math.floor(Math.random() * items.length);
    const randomItem = items[randomIndex];

    searchInput.value = "";
    renderItems(items);

    const cards = document.querySelectorAll(".card");
    const targetCard = cards[randomIndex];
    if (targetCard) {
        targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
        targetCard.classList.add("highlight");
        setTimeout(() => targetCard.classList.remove("highlight"), 2000);
    }
});
