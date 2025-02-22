import { getAlbumImageFromSpotify } from "./spotify.js";
import { getAlbumDataFromAppleMusic } from "./applemusic.js";

function notifyUser(message, type = "error") {
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.position = "fixed";
    notification.style.top = "10px";
    notification.style.right = "10px";
    notification.style.background = type === "error" ? "#f44336" : "#4caf50";
    notification.style.color = "#fff";
    notification.style.padding = "10px 20px";
    notification.style.borderRadius = "4px";
    notification.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
    notification.style.zIndex = "10000";
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.opacity = "0";
        setTimeout(() => notification.remove(), 1000);
    }, 3000);
}
window.notifyUser = notifyUser;

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
    const defaultPath = `img/${iconName}.svg`;

    if (!darkMode) return defaultPath;

    const darkModePath = `img/${iconName}.svg`;

    const darkModeIcons = [
        "add",
        "edit",
        "delete",
        "filter",
        "stats",
        "grid",
        "list",
        "export",
        "import",
        "refresh",
        "link",
        "clear",
        "random",
    ];

    return darkModeIcons.includes(iconName) ? darkModePath : defaultPath;
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

    const filterButtonIcon = document.querySelector("#filtersButton img");
    filterButtonIcon.src = getIconPath("filter");

    const statsButtonIcon = document.querySelector("#statsButton img");
    statsButtonIcon.src = getIconPath("stats");
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
let artistsTagInput;
let genresTagInput;

addItemButton.addEventListener("click", () => {
    modal.classList.add("show");
    addItemForm.reset();
    formPreviewCard.innerHTML = "";
});

closeModalButton.addEventListener("click", () => {
    modal.classList.remove("show");
});

window.addEventListener("click", (event) => {
    if (event.target == modal) {
        modal.classList.remove("show");
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
    if (!dateString) return "";

    const parts = dateString.split("-");
    const year = parts[0];
    const month = parts[1];
    const day = parts[2];

    if (
        year &&
        (!month || month === "00" || month === "01") &&
        (!day || day === "00" || day === "01")
    ) {
        return year;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString("en-GB");
}

function renderItems(itemsToRender) {
    const results = document.querySelector("#results");
    results.innerHTML = "";

    const ownedItems = itemsToRender.filter((item) => !item.wanted);
    const wantedItems = itemsToRender.filter((item) => item.wanted);
    const sortedItems = [...ownedItems, ...wantedItems];

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
        const albumArtists = Array.isArray(item.albumArtists)
            ? item.albumArtists.join(" • ")
            : item.albumArtists || "Unknown Artist";

        const genresList =
            Array.isArray(item.genres) && item.genres.length > 0
                ? `<p class="genres">${item.genres.join(" • ")}</p>`
                : "";
        const releaseDate =
            item.releaseDate || new Date().toISOString().split("T")[0];

        const linkButton = item.albumLink
            ? `
            <button class="linkButton" title="Open Album Link" data-url="${
                item.albumLink
            }">
                <img src="${getIconPath("link")}" alt="Link">
            </button>
            <button class="updateButton" title="Update from Spotify" data-id="${
                item.id
            }">
                <img src="${getIconPath("refresh")}" alt="Update">
            </button>
        `
            : "";

        newItemElement.innerHTML = `
            <img src="${imageUrl}" alt="Album Image" onerror="this.src='img/default.png'">
            <div class="album-info">
                <h3>${albumName}</h3>
                <p>${albumArtists}</p>
                <p>${formatDate(releaseDate)}</p>
                ${genresList}
                <div class="type-badges">${typesBadges}</div>
            </div>
            <div class="actions">
                ${linkButton}
                <button class="editButton" data-id="${item.id}">
                    <img src="${getIconPath("edit")}" alt="Edit">
                </button>
                <button class="removeButton" data-id="${item.id}">
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
        renderItems(applyFilters(items));
        return;
    }

    const searchQuery = query.toLowerCase().trim();
    const filteredItems = items.filter((item) => {
        const albumName = (item.albumName || "").toLowerCase();
        const artistsMatch =
            Array.isArray(item.albumArtists) &&
            item.albumArtists.some((artist) =>
                artist.toLowerCase().includes(searchQuery)
            );
        const genresMatch =
            Array.isArray(item.genres) &&
            item.genres.some((genre) =>
                genre.toLowerCase().includes(searchQuery)
            );
        const releaseDate = formatDate(item.releaseDate || "");
        const types = Object.entries(item.types || {})
            .filter(([_, checked]) => checked)
            .map(([type]) => type.toLowerCase());

        return (
            albumName.includes(searchQuery) ||
            artistsMatch ||
            genresMatch ||
            releaseDate.includes(searchQuery) ||
            types.some((type) => type.includes(searchQuery))
        );
    });

    renderItems(applyFilters(filteredItems));
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
    updateStats();
}

renderItems(items);

let isEditing = false;
let editingIndex = null;

const formPreviewCard = document.querySelector("#formPreviewCard");

async function updateImageFromSpotify() {
    const imageUrl = document.querySelector("#imageUrl").value;
    const albumLink = document.querySelector("#albumLink").value;

    if (!imageUrl && albumLink && albumLink.includes("spotify.com")) {
        try {
            const spotifyData = await getAlbumImageFromSpotify(albumLink);
            if (spotifyData.imageUrl) {
                document.querySelector("#imageUrl").value =
                    spotifyData.imageUrl;
                document.querySelector("#genres").value =
                    spotifyData.genres.join(", ");
                updateFormPreview();
                return spotifyData.imageUrl;
            }
        } catch (err) {
            console.error("Failed to update image from Spotify:", err);
            notifyUser("Failed to fetch Spotify image.", "error");
        }
    }
    return imageUrl || "img/default.png";
}

function updateFormPreview() {
    const imageUrl = document.querySelector("#imageUrl").value;
    const albumName = document.querySelector("#albumName").value;
    const albumArtists = document.querySelector("#albumArtists").value;
    const genres = document.querySelector("#genres").value;

    const year = document.querySelector("#releaseYear").value.padStart(4, "0");
    const month =
        document.querySelector("#releaseMonth").value.padStart(2, "0") || "01";
    const day =
        document.querySelector("#releaseDay").value.padStart(2, "0") || "01";
    const releaseDate = `${year}-${month}-${day}`;

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
        <div class="preview-image-container">
            <img src="${
                imageUrl || "img/default.png"
            }" alt="Album Image" onerror="this.src='img/default.png'">
            <div class="type-badges">${typesBadges}</div>
        </div>
        <div class="album-info">
            <h3>${albumName}</h3>
            <p>${albumArtists}</p>
            <p>${formatDate(releaseDate)}</p>
            ${genres ? `<p class="genres">${genres}</p>` : ""}
        </div>
    `;
}

document
    .querySelectorAll(
        "#imageUrl, #albumName, #albumArtists, #releaseYear, #releaseMonth, #releaseDay, #vinylCheck, #cdCheck"
    )
    .forEach((input) => {
        input.addEventListener("input", updateFormPreview);
        if (input.type === "checkbox") {
            input.addEventListener("change", updateFormPreview);
        }
    });

document.querySelector("#imageUrl").addEventListener("input", async (e) => {
    if (!e.target.value) {
        await updateImageFromSpotify();
    }
    updateFormPreview();
});

document.querySelector("#albumLink").addEventListener("input", async (e) => {
    const link = e.target.value;
    if (
        link &&
        (link.includes("spotify.com") || link.includes("music.apple.com"))
    ) {
        try {
            let albumData = null;
            if (link.includes("spotify.com")) {
                albumData = await getAlbumImageFromSpotify(link);
            } else if (link.includes("music.apple.com")) {
                albumData = await getAlbumDataFromAppleMusic(link);
            }
            if (albumData) {
                if (!document.querySelector("#albumName").value)
                    document.querySelector("#albumName").value =
                        albumData.albumName || "";
                if (albumData.artists) {
                    document.querySelector("#albumArtists").value =
                        albumData.artists.join(" • ");
                    if (artistsTagInput) {
                        artistsTagInput.clearTags();
                        albumData.artists.forEach((artist) =>
                            artistsTagInput.addTag(artist)
                        );
                    }
                }
                if (albumData.genres) {
                    document.querySelector("#genres").value =
                        albumData.genres.join(", ");
                    if (genresTagInput) {
                        genresTagInput.clearTags();
                        albumData.genres.forEach((genre) =>
                            genresTagInput.addTag(genre)
                        );
                    }
                }
                if (!document.querySelector("#imageUrl").value)
                    document.querySelector("#imageUrl").value =
                        albumData.imageUrl || "";
                if (
                    !document.querySelector("#releaseYear").value &&
                    albumData.releaseDate
                ) {
                    const fullDate = albumData.releaseDate.substring(0, 10);
                    const [year, month, day] = fullDate.split("-");
                    document.querySelector("#releaseYear").value = year;
                    document.querySelector("#releaseMonth").value = month;
                    document.querySelector("#releaseDay").value = day;
                }
                updateFormPreview();
            }
        } catch (error) {
            console.error("Error retrieving album details:", error);
            notifyUser(
                "Error retrieving album details. Please try again.",
                "error"
            );
        }
    } else {
        updateFormPreview();
    }
});

let currentEditingId = null;

async function addItemFormSubmitHandler(event) {
    event.preventDefault();
    const imageUrl = document.querySelector("#imageUrl").value;
    const albumLink = document.querySelector("#albumLink").value;

    let finalImageUrl = imageUrl;
    let genres = [];
    let artists = [];

    if (!imageUrl && albumLink && albumLink.includes("spotify.com")) {
        const spotifyData = await getAlbumImageFromSpotify(albumLink);
        finalImageUrl = spotifyData.imageUrl || "";
        genres = spotifyData.genres || [];

        artists = spotifyData.artists || [];
    } else {
        const artistInput = document.querySelector("#albumArtists").value;
        artists = artistInput
            .split(" • ")
            .map((a) => a.trim())
            .filter((a) => a);
        genres = document
            .querySelector("#genres")
            .value.split(",")
            .map((g) => g.trim())
            .filter((g) => g);
    }

    const albumName = document.querySelector("#albumName").value;
    const yearInput = document.querySelector("#releaseYear");
    const monthInput = document.querySelector("#releaseMonth");
    const dayInput = document.querySelector("#releaseDay");

    const year = yearInput.value.padStart(4, "0");
    const month = monthInput.value.padStart(2, "0") || "01";
    const day = dayInput.value.padStart(2, "0") || "01";
    const releaseDate = `${year}-${month}-${day}`;
    const wanted = document.querySelector("#wantedToggle").checked;
    const types = {
        vinyl: document.querySelector("#vinylCheck").checked,
        cd: document.querySelector("#cdCheck").checked,
    };

    const itemData = {
        imageUrl: finalImageUrl,
        albumName,
        albumArtists: artists,
        genres: genres,
        releaseDate,
        wanted,
        types,
        albumLink: albumLink || null,
    };

    if (isEditing && currentEditingId) {
        const index = items.findIndex((item) => item.id === currentEditingId);
        if (index !== -1) {
            items[index] = { ...items[index], ...itemData };
        }
    } else {
        items.push({
            id: Date.now(),
            ...itemData,
        });
    }

    refreshItems();
    modal.classList.remove("show");
    addItemForm.reset();
    formPreviewCard.innerHTML = "";

    isEditing = false;
    currentEditingId = null;
}

addItemForm.addEventListener("submit", (event) => {
    addItemFormSubmitHandler(event).catch(console.error);
});

const deleteConfirmModal = document.querySelector("#deleteConfirmModal");
const confirmDeleteBtn = document.querySelector("#confirmDelete");
const cancelDeleteBtn = document.querySelector("#cancelDelete");
let itemToDelete = null;

function showDeleteConfirmation(item) {
    itemToDelete = item;
    const preview = deleteConfirmModal.querySelector(".delete-preview");

    const typesBadges = Object.entries(item.types || {})
        .filter(([_, checked]) => checked)
        .map(
            ([type]) => `<span class="type-badge">${type.toUpperCase()}</span>`
        )
        .join("");

    preview.innerHTML = `
        <div class="preview-image-container">
            <img src="${item.imageUrl || "img/default.png"}" alt="Album Image">
            <div class="type-badges">${typesBadges}</div>
        </div>
        <div class="album-info">
            <h3>${item.albumName}</h3>
            <p>${
                Array.isArray(item.albumArtists)
                    ? item.albumArtists.join(" • ")
                    : item.albumArtists || "Unknown Artist"
            }</p>
            <p>${formatDate(item.releaseDate)}</p>
        </div>
    `;
    deleteConfirmModal.classList.add("show");
}

confirmDeleteBtn.addEventListener("click", () => {
    if (itemToDelete) {
        const index = items.findIndex((item) => item.id === itemToDelete.id);
        if (index !== -1) {
            items.splice(index, 1);
            refreshItems();
        }
    }
    deleteConfirmModal.style.display = "none";
    itemToDelete = null;
});

cancelDeleteBtn.addEventListener("click", () => {
    deleteConfirmModal.style.display = "none";
    itemToDelete = null;
});

document.querySelector("#results").addEventListener("click", async (event) => {
    const target = event.target.closest("button");
    if (!target) return;

    if (target.classList.contains("updateButton")) {
        const itemId = Number(target.dataset.id);
        const item = items.find((item) => item.id === itemId);
        if (!item || !item.albumLink) return;

        target.disabled = true;
        const originalImg = target.querySelector("img").src;
        target.querySelector("img").src = getIconPath("loading");

        try {
            const spotifyData = await getAlbumImageFromSpotify(item.albumLink);
            if (spotifyData) {
                const updatedItem = {
                    ...item,
                    imageUrl: spotifyData.imageUrl || item.imageUrl,
                    albumName: spotifyData.albumName || item.albumName,
                    albumArtists: spotifyData.artists || item.albumArtists,
                    genres: spotifyData.genres || item.genres,
                    releaseDate: spotifyData.releaseDate || item.releaseDate,
                };

                const index = items.findIndex((i) => i.id === itemId);
                if (index !== -1) {
                    items[index] = updatedItem;
                    refreshItems();
                }
            }
        } catch (error) {
            console.error("Failed to update from Spotify:", error);
        } finally {
            target.disabled = false;
            target.querySelector("img").src = getIconPath("refresh");
        }
        return;
    }

    if (target.classList.contains("editButton")) {
        const itemId = Number(target.dataset.id);
        const item = items.find((item) => item.id === itemId);
        if (!item) return;

        isEditing = true;
        currentEditingId = itemId;

        document.querySelector("#imageUrl").value = item.imageUrl || "";
        document.querySelector("#albumName").value = item.albumName || "";
        document.querySelector("#albumLink").value = item.albumLink || "";
        document.querySelector("#wantedToggle").checked = Boolean(item.wanted);
        document.querySelector("#vinylCheck").checked = Boolean(
            item.types?.vinyl
        );
        document.querySelector("#cdCheck").checked = Boolean(item.types?.cd);

        const artistsInput = artistsTagInput;
        const genresInput = genresTagInput;

        artistsInput.clearTags();
        genresInput.clearTags();

        if (Array.isArray(item.albumArtists)) {
            item.albumArtists.forEach((artist) => artistsInput.addTag(artist));
        }

        if (Array.isArray(item.genres)) {
            item.genres.forEach((genre) => genresInput.addTag(genre));
        }

        if (item.releaseDate) {
            const [y, m, d] = item.releaseDate.split("-");
            document.querySelector("#releaseYear").value = y || "";
            document.querySelector("#releaseMonth").value = parseInt(m) || "";
            document.querySelector("#releaseDay").value = parseInt(d) || "";
        }

        modal.classList.add("show");
        updateFormPreview();
        document.querySelector("#albumName").focus();
    } else if (target.classList.contains("removeButton")) {
        const itemId = Number(target.dataset.id);
        const item = items.find((item) => item.id === itemId);
        if (item) {
            showDeleteConfirmation(item);
        }
    }
});

closeModalButton.addEventListener("click", () => {
    modal.classList.remove("show");
    isEditing = false;
    currentEditingId = null;
    addItemForm.reset();
    formPreviewCard.innerHTML = "";
});

window.addEventListener("click", (event) => {
    if (event.target == modal) {
        modal.classList.remove("show");
    }
    if (event.target == previewModal) {
        previewModal.style.display = "none";
    }
    if (event.target == deleteConfirmModal) {
        deleteConfirmModal.style.display = "none";
        itemToDelete = null;
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

                saveNewOrder();
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

    cards.forEach((card) => {
        const itemId = card.dataset.id;
        const item = items.find((item) => item.id === Number(itemId));
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
    const filteredItems = applyFilters(items);
    const displayedCards = document.querySelectorAll(".card");
    const availableCards = Array.from(displayedCards).filter((card) => {
        if (card.classList.contains("wanted")) return false;
        const itemId = Number(card.dataset.id);
        return filteredItems.some((item) => item.id === itemId);
    });

    if (availableCards.length === 0) return;

    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const targetCard = availableCards[randomIndex];

    document
        .querySelectorAll(".highlight")
        .forEach((card) => card.classList.remove("highlight"));

    targetCard.scrollIntoView({
        behavior: "smooth",
        block: "center",
    });

    setTimeout(() => {
        targetCard.classList.add("highlight");
        setTimeout(() => targetCard.classList.remove("highlight"), 4000);
    }, 500);
});

function setupDateInputs() {
    const dayInput = document.querySelector("#releaseDay");
    const monthInput = document.querySelector("#releaseMonth");
    const yearInput = document.querySelector("#releaseYear");

    function handleDateInput(input, nextInput, max) {
        input.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/\D/g, "");
            const value = e.target.value;

            if (value.length === input.maxLength && nextInput && value <= max) {
                nextInput.focus();
            }
        });

        input.addEventListener("keydown", (e) => {
            if (
                e.key === "Backspace" &&
                e.target.value === "" &&
                input !== yearInput
            ) {
                input.previousElementSibling.previousElementSibling.focus();
            }
        });
    }

    handleDateInput(dayInput, monthInput, 31);
    handleDateInput(monthInput, yearInput, 12);
    handleDateInput(yearInput, null, 9999);
}

document.addEventListener("DOMContentLoaded", () => {
    setupDateInputs();
    updateAddItemButtonIcon();
});

const filtersButton = document.querySelector("#filtersButton");
const filtersPopup = document.querySelector("#filtersPopup");
const filterVinyl = document.querySelector("#filterVinyl");
const filterCD = document.querySelector("#filterCD");
const filterArtist = document.querySelector("#filterArtist");
const sortBy = document.querySelector("#sortBy");

const filterGenre = document.querySelector("#filterGenre");

function updateGenresList() {
    const genresSet = new Set();
    items.forEach((item) => {
        if (Array.isArray(item.genres)) {
            item.genres.forEach((genre) => {
                if (genre) genresSet.add(genre);
            });
        }
    });

    const genres = Array.from(genresSet).sort();
    filterGenre.innerHTML = `
        <option value="">All Genres</option>
        <option value="none">No Genre</option>
    `;

    genres.forEach((genre) => {
        const opt = document.createElement("option");
        opt.value = genre.toLowerCase();
        opt.textContent = genre;
        filterGenre.appendChild(opt);
    });
}

function updateArtistsList() {
    const artistSet = new Set();
    items.forEach((item) => {
        if (Array.isArray(item.albumArtists)) {
            item.albumArtists.forEach((artist) => {
                if (artist) artistSet.add(artist);
            });
        }
    });

    const artists = Array.from(artistSet).sort();
    filterArtist.innerHTML = '<option value="">All Artists</option>';
    artists.forEach((artist) => {
        const opt = document.createElement("option");
        opt.value = artist;
        opt.textContent = artist;
        filterArtist.appendChild(opt);
    });

    updateGenresList();
}

function applyFilters(itemsToFilter) {
    let filteredItems = [...itemsToFilter];

    if (filterVinyl.checked || filterCD.checked) {
        filteredItems = filteredItems.filter((item) => {
            if (filterVinyl.checked && filterCD.checked) {
                return item.types?.vinyl && item.types?.cd;
            }
            return (
                (filterVinyl.checked && item.types?.vinyl) ||
                (filterCD.checked && item.types?.cd)
            );
        });
    }

    if (filterArtist.value) {
        filteredItems = filteredItems.filter(
            (item) =>
                Array.isArray(item.albumArtists) &&
                item.albumArtists.includes(filterArtist.value)
        );
    }

    const selectedGenres = Array.from(filterGenre.selectedOptions)
        .map((opt) => opt.value)
        .filter((val) => val !== "");

    if (selectedGenres.length) {
        filteredItems = filteredItems.filter((item) => {
            if (selectedGenres.includes("none")) {
                return (
                    !item.genres ||
                    !Array.isArray(item.genres) ||
                    item.genres.length === 0
                );
            }

            if (!Array.isArray(item.genres) || item.genres.length === 0) {
                return false;
            }

            return selectedGenres.some((selected) =>
                item.genres
                    .map((g) => g.toLowerCase())
                    .includes(selected.toLowerCase())
            );
        });
    }

    if (sortBy.value !== "custom") {
        filteredItems.sort((a, b) => {
            switch (sortBy.value) {
                case "name":
                    return a.albumName.localeCompare(b.albumName);
                case "artist":
                    return a.albumArtists.localeCompare(b.albumArtists);
                case "year":
                    return a.releaseDate.localeCompare(b.releaseDate);
                default:
                    return 0;
            }
        });
    }

    return filteredItems;
}

filterGenre.addEventListener("change", () => {
    searchItems(searchInput.value);
});

[filterVinyl, filterCD, filterArtist, filterGenre, sortBy].forEach((filter) => {
    filter.addEventListener("change", () => {
        searchItems(searchInput.value);
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const filtersButton = document.querySelector("#filtersButton");
    const filtersPopup = document.querySelector("#filtersPopup");

    filtersButton.addEventListener("click", (e) => {
        e.stopPropagation();
        console.log("Filters button clicked");
        filtersPopup.classList.toggle("show");
        updateArtistsList();
    });

    document.addEventListener("click", (e) => {
        if (
            !filtersPopup.contains(e.target) &&
            !filtersButton.contains(e.target)
        ) {
            filtersPopup.classList.remove("show");
        }
    });
});

const albumViewModal = document.querySelector("#albumViewModal");
const albumViewClose = albumViewModal.querySelector(".close");

albumViewClose.addEventListener("click", () => {
    albumViewModal.classList.remove("show");
});

document.querySelector("#results").addEventListener("click", (event) => {
    const isActionButton = event.target.closest(".actions");
    const isCardImage = event.target.closest(".card img:not(.actions img)");
    const card = event.target.closest(".card");

    if (isActionButton || isCardImage || !card) return;

    const itemId = Number(card.dataset.id);
    const item = items.find((item) => item.id === itemId);
    if (!item) return;

    const modal = document.querySelector("#albumViewModal");
    modal.querySelector(".album-cover img").src =
        item.imageUrl || "img/default.png";
    modal.querySelector(".album-title").textContent = item.albumName;

    const artistsDisplay = Array.isArray(item.albumArtists)
        ? item.albumArtists.join(" • ")
        : item.albumArtists;
    modal.querySelector(".album-artist").textContent = artistsDisplay;

    modal.querySelector(".album-date").textContent = formatDate(
        item.releaseDate
    );

    const genresDisplay =
        Array.isArray(item.genres) && item.genres.length > 0
            ? item.genres.map((genre) => `<span>${genre}</span>`).join(" ")
            : "No genres listed";
    modal.querySelector(".album-genres").innerHTML = genresDisplay;

    const badges = Object.entries(item.types || {})
        .filter(([_, checked]) => checked)
        .map(
            ([type]) => `<span class="type-badge">${type.toUpperCase()}</span>`
        )
        .join("");
    modal.querySelector(".album-badges").innerHTML = badges;

    const spotifyLink = modal.querySelector(".spotify-link");
    if (item.albumLink) {
        spotifyLink.href = item.albumLink;
        spotifyLink.style.display = "inline-flex";
    } else {
        spotifyLink.style.display = "none";
    }

    modal.classList.add("show");
});

window.addEventListener("click", (event) => {
    if (event.target === albumViewModal) {
        albumViewModal.classList.remove("show");
    }
});

const statsModal = document.querySelector("#statsModal");
const statsButton = document.querySelector("#statsButton");

function updateStats() {
    const totalItems = items.length;

    const vinylOwned = items.filter(
        (item) => !item.wanted && item.types?.vinyl
    ).length;
    const vinylWanted = items.filter(
        (item) => item.wanted && item.types?.vinyl
    ).length;

    const cdOwned = items.filter(
        (item) => !item.wanted && item.types?.cd
    ).length;
    const cdWanted = items.filter(
        (item) => item.wanted && item.types?.cd
    ).length;

    const wantedCount = items.filter((item) => item.wanted).length;

    const ownedItems = items.filter((item) => !item.wanted).length;

    const progressPercentage =
        totalItems > 0 ? (ownedItems / totalItems) * 100 : 0;

    document.querySelector(
        "#libraryProgress"
    ).style.width = `${progressPercentage}%`;
    document.querySelector("#progressValue").textContent = `${Math.round(
        progressPercentage
    )}%`;

    document.querySelector("#totalItems").textContent = totalItems;
    document.querySelector("#ownedCount").textContent = ownedItems;
    document.querySelector("#vinylOwnedCount").textContent = vinylOwned;
    document.querySelector("#vinylWantedCount").textContent = vinylWanted;
    document.querySelector("#cdOwnedCount").textContent = cdOwned;
    document.querySelector("#cdWantedCount").textContent = cdWanted;
    document.querySelector("#wantedCount").textContent = wantedCount;

    const uniqueArtists = new Set(
        items.flatMap((item) =>
            Array.isArray(item.albumArtists) ? item.albumArtists : []
        )
    );
    const uniqueGenres = new Set(
        items.flatMap((item) => (Array.isArray(item.genres) ? item.genres : []))
    );

    document.querySelector("#totalArtists").textContent = uniqueArtists.size;
    document.querySelector("#totalGenres").textContent = uniqueGenres.size;

    const years = items
        .map((item) => parseInt(item.releaseDate?.split("-")[0]))
        .filter((year) => !isNaN(year));

    const oldestYear = Math.min(...years);
    const newestYear = Math.max(...years);
    const yearsSpan = years.length ? newestYear - oldestYear + 1 : 0;

    const yearFrequency = years.reduce((acc, year) => {
        acc[year] = (acc[year] || 0) + 1;
        return acc;
    }, {});

    const mostCommonYear =
        Object.entries(yearFrequency).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        "-";

    const artistFrequency = items.reduce((acc, item) => {
        if (Array.isArray(item.albumArtists)) {
            item.albumArtists.forEach((artist) => {
                acc[artist] = (acc[artist] || 0) + 1;
            });
        }
        return acc;
    }, {});

    const mostCommonArtist =
        Object.entries(artistFrequency).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        "-";

    document.querySelector("#totalYears").textContent = yearsSpan || "-";
    document.querySelector("#oldestYear").textContent = years.length
        ? oldestYear
        : "-";
    document.querySelector("#newestYear").textContent = years.length
        ? newestYear
        : "-";
    document.querySelector("#mostCommonYear").textContent = mostCommonYear;
    document.querySelector("#mostCommonArtist").textContent = mostCommonArtist;
}

function initializeTagInput(containerId, inputId, placeholder) {
    const container = document.createElement("div");
    container.className = "tag-input-container";

    const row = document.createElement("div");
    row.className = "tag-input-row";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "tag-input";
    input.placeholder = placeholder;
    input.setAttribute("list", `${inputId}-datalist`);

    const datalist = document.createElement("datalist");
    datalist.id = `${inputId}-datalist`;
    document.body.appendChild(datalist);

    const addButton = document.createElement("button");
    addButton.className = "add-tag-button";
    addButton.textContent = "+";

    const hiddenInput = document.querySelector(`#${inputId}`);
    const tags = new Set();

    function updateSuggestions() {
        const suggestions = new Set();
        items.forEach((item) => {
            if (
                inputId === "albumArtists" &&
                Array.isArray(item.albumArtists)
            ) {
                item.albumArtists.forEach((artist) => suggestions.add(artist));
            } else if (inputId === "genres" && Array.isArray(item.genres)) {
                item.genres.forEach((genre) => suggestions.add(genre));
            }
        });

        datalist.innerHTML = "";

        suggestions.forEach((value) => {
            const option = document.createElement("option");
            option.value = value;
            datalist.appendChild(option);
        });
    }

    function updateHiddenInput() {
        hiddenInput.value = Array.from(tags).join(" • ");
        updateFormPreview();
    }

    function addTag(value) {
        if (!value.trim()) return;

        tags.add(value.trim());
        updateHiddenInput();
        renderTags();
        input.value = "";
    }

    function removeTag(value) {
        tags.delete(value);
        updateHiddenInput();
        renderTags();
    }

    function renderTags() {
        while (container.firstChild) {
            if (container.firstChild === row) break;
            container.removeChild(container.firstChild);
        }

        Array.from(tags).forEach((tag) => {
            const tagElement = document.createElement("div");
            tagElement.className = "tag";
            tagElement.textContent = tag;

            const removeButton = document.createElement("button");
            removeButton.className = "tag-remove";
            removeButton.textContent = "×";
            removeButton.onclick = () => removeTag(tag);

            tagElement.appendChild(removeButton);
            container.insertBefore(tagElement, row);
        });
    }

    addButton.onclick = (e) => {
        e.preventDefault();
        addTag(input.value);
    };

    input.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag(input.value);
        }
        if (e.key === "Backspace" && input.value === "" && tags.size > 0) {
            const lastTag = Array.from(tags).pop();
            removeTag(lastTag);
        }
    };

    if (hiddenInput.value) {
        hiddenInput.value.split(" • ").forEach((tag) => tags.add(tag.trim()));
        renderTags();
    }

    row.appendChild(input);
    row.appendChild(addButton);
    container.appendChild(row);

    hiddenInput.style.display = "none";
    hiddenInput.parentNode.insertBefore(container, hiddenInput);

    updateSuggestions();

    return {
        container,
        updateSuggestions,
        addTag,
        clearTags: () => {
            tags.clear();
            updateHiddenInput();
            renderTags();
        },
    };
}

document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("show");
        }
    });
});

statsButton.addEventListener("click", () => {
    updateStats();
    statsModal.classList.add("show");
});

statsModal.querySelector(".close").addEventListener("click", () => {
    statsModal.classList.remove("show");
});

document.addEventListener("DOMContentLoaded", () => {
    setupDateInputs();
    updateAddItemButtonIcon();
    updateStats();
    artistsTagInput = initializeTagInput(
        "artistsContainer",
        "albumArtists",
        "Add artist..."
    );
    genresTagInput = initializeTagInput(
        "genresContainer",
        "genres",
        "Add genre..."
    );

    artistsTagInput.updateSuggestions();
    genresTagInput.updateSuggestions();
});

document.querySelectorAll(".modal").forEach((modal) => {
    const closeBtn = modal.querySelector(".close");
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            modal.classList.remove("show");
        });
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        document.querySelectorAll(".modal").forEach((modal) => {
            modal.classList.remove("show");
        });

        const filtersPopup = document.querySelector("#filtersPopup");
        if (filtersPopup) {
            filtersPopup.classList.remove("show");
        }

        itemToDelete = null;
    }
});
