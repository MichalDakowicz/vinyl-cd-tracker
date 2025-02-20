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

    const filterButtonIcon = document.querySelector("#filtersButton img");
    filterButtonIcon.src = getIconPath("filter");
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
            <img src="${imageUrl}" alt="Album Image" onerror="this.src='img/default.png'">
            <div class="album-info">
                <h3>${albumName}</h3>
                <p>${albumArtists}</p>
                <p>${formatDate(releaseDate)}</p>
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
}

renderItems(items);

let isEditing = false;
let editingIndex = null;

const formPreviewCard = document.querySelector("#formPreviewCard");

async function updateImageFromSpotify() {
    const imageUrl = document.querySelector("#imageUrl").value;
    const albumLink = document.querySelector("#albumLink").value;

    if (!imageUrl && albumLink && albumLink.includes("spotify.com")) {
        const spotifyData = await getAlbumImageFromSpotify(albumLink);
        if (spotifyData.imageUrl) {
            document.querySelector("#imageUrl").value = spotifyData.imageUrl;
            document.querySelector("#genres").value =
                spotifyData.genres.join(", ");
            updateFormPreview();
            return spotifyData.imageUrl;
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
        <img src="${
            imageUrl || "img/default.png"
        }" alt="Album Image" onerror="this.src='img/default.png'">
        <div class="album-info">
            <h3>${albumName}</h3>
            <p>${albumArtists}</p>
            <p>${formatDate(releaseDate)}</p>
            ${genres ? `<p class="genres">${genres}</p>` : ""}
            <div class="type-badges">${typesBadges}</div>
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
    if (link && link.includes("spotify.com")) {
        const spotifyData = await getAlbumImageFromSpotify(link);
        if (spotifyData) {
            if (!document.querySelector("#albumName").value)
                document.querySelector("#albumName").value =
                    spotifyData.albumName || "";
            if (!document.querySelector("#albumArtists").value)
                document.querySelector("#albumArtists").value =
                    spotifyData.artists.join(", ") || "";
            if (!document.querySelector("#genres").value)
                document.querySelector("#genres").value =
                    spotifyData.genres.join(", ") || "";
            if (!document.querySelector("#imageUrl").value)
                document.querySelector("#imageUrl").value =
                    spotifyData.imageUrl || "";
            if (
                !document.querySelector("#releaseYear").value &&
                spotifyData.releaseDate
            ) {
                const parts = spotifyData.releaseDate.split("-");
                document.querySelector("#releaseYear").value = parts[0] || "";
                document.querySelector("#releaseMonth").value = parts[1] || "";
                document.querySelector("#releaseDay").value = parts[2] || "";
            }
            updateFormPreview();
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
    let genres = document.querySelector("#genres").value;

    if (!imageUrl && albumLink && albumLink.includes("spotify.com")) {
        const spotifyData = await getAlbumImageFromSpotify(albumLink);
        finalImageUrl = spotifyData.imageUrl || "";
        genres = genres || spotifyData.genres.join(", ");
    }

    const albumName = document.querySelector("#albumName").value;
    const albumArtists = document.querySelector("#albumArtists").value;
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
        albumArtists,
        releaseDate,
        wanted,
        types,
        albumLink: albumLink || null,
        genres,
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
    modal.style.display = "none";
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
        <img src="${item.imageUrl || "img/default.png"}" alt="Album Image">
        <div class="album-info">
            <h3>${item.albumName}</h3>
            <p>${item.albumArtists}</p>
            <p>${formatDate(item.releaseDate)}</p>
            <div class="type-badges">${typesBadges}</div>
        </div>
    `;
    deleteConfirmModal.style.display = "block";
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

    if (target.classList.contains("editButton")) {
        const itemId = Number(target.dataset.id);
        const item = items.find((item) => item.id === itemId);
        if (!item) return;

        isEditing = true;
        currentEditingId = itemId;

        document.querySelector("#imageUrl").value = item.imageUrl || "";
        document.querySelector("#albumName").value = item.albumName || "";
        document.querySelector("#albumArtists").value = item.albumArtists || "";
        document.querySelector("#albumLink").value = item.albumLink || "";
        document.querySelector("#genres").value = item.genres || "";
        document.querySelector("#wantedToggle").checked = Boolean(item.wanted);
        document.querySelector("#vinylCheck").checked = Boolean(
            item.types?.vinyl
        );
        document.querySelector("#cdCheck").checked = Boolean(item.types?.cd);
        if (item.releaseDate) {
            const [y, m, d] = item.releaseDate.split("-");
            document.querySelector("#releaseYear").value = y || "";
            document.querySelector("#releaseMonth").value = parseInt(m) || "";
            document.querySelector("#releaseDay").value = parseInt(d) || "";
        }

        const albumLinkInput = document.querySelector("#albumLink").value;
        if (
            albumLinkInput &&
            (!document.querySelector("#genres").value ||
                !document.querySelector("#imageUrl").value ||
                !document.querySelector("#albumName").value ||
                !document.querySelector("#albumArtists").value)
        ) {
            const spotifyData = await getAlbumImageFromSpotify(albumLinkInput);
            if (spotifyData) {
                if (!document.querySelector("#genres").value)
                    document.querySelector("#genres").value =
                        spotifyData.genres.join(", ");
                if (!document.querySelector("#imageUrl").value)
                    document.querySelector("#imageUrl").value =
                        spotifyData.imageUrl || "";
                if (!document.querySelector("#albumName").value)
                    document.querySelector("#albumName").value =
                        spotifyData.albumName || "";
                if (!document.querySelector("#albumArtists").value)
                    document.querySelector("#albumArtists").value =
                        spotifyData.artists.join(", ");
                if (
                    !document.querySelector("#releaseYear").value &&
                    spotifyData.releaseDate
                ) {
                    const parts = spotifyData.releaseDate.split("-");
                    document.querySelector("#releaseYear").value =
                        parts[0] || "";
                    document.querySelector("#releaseMonth").value =
                        parts[1] || "";
                    document.querySelector("#releaseDay").value =
                        parts[2] || "";
                }
            }
        }

        modal.style.display = "block";
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
    modal.style.display = "none";
    isEditing = false;
    currentEditingId = null;
    addItemForm.reset();
    formPreviewCard.innerHTML = "";
});

window.addEventListener("click", (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
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
    let genresSet = new Set();
    items.forEach((item) => {
        if (item.genres) {
            item.genres.split(",").forEach((genre) => {
                const trimmed = genre.trim();
                if (trimmed) genresSet.add(trimmed);
            });
        }
    });

    let genres = Array.from(genresSet).sort((a, b) => a.localeCompare(b));

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
    const artists = [...new Set(items.map((item) => item.albumArtists))].sort();
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
            (item) => item.albumArtists === filterArtist.value
        );
    }
    const selectedGenres = Array.from(filterGenre.selectedOptions)
        .map((opt) => opt.value)
        .filter((val) => val !== "");

    if (selectedGenres.length) {
        filteredItems = filteredItems.filter((item) => {
            if (selectedGenres.includes("none")) {
                return !item.genres || item.genres.trim() === "";
            }

            if (!item.genres || item.genres.trim() === "") {
                return false;
            }

            const itemGenres = item.genres
                .split(",")
                .map((g) => g.trim().toLowerCase())
                .filter((g) => g);

            return selectedGenres.some((selected) =>
                itemGenres.includes(selected.toLowerCase())
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
