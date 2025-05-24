import { getAlbumImageFromSpotify } from "./spotify.js";
import { getAlbumDataFromAppleMusic } from "./applemusic.js";
import {
    database,
    auth,
    provider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
} from "./firebase-config.js";
import {
    ref,
    set,
    get,
    child,
    remove,
    update,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";

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
        document
            .querySelector('meta[name="theme-color"]')
            .setAttribute("content", "#333333");
    } else {
        body.classList.remove("dark-mode");
        localStorage.removeItem("darkMode");
        document
            .querySelector('meta[name="theme-color"]')
            .setAttribute("content", "#ffffff");
    }
}

const darkMode = localStorage.getItem("darkMode");
if (darkMode === "enabled") {
    body.classList.add("dark-mode");
    darkModeToggle.checked = true;
    document
        .querySelector('meta[name="theme-color"]')
        .setAttribute("content", "#333333");
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
    if (reorderModal.classList.contains("show")) {
        updateReorderIcons();
    }
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
const formPreviewCard = document.querySelector("#formPreviewCard");

const loginButton = document.querySelector("#loginButton");
const userAuthStatus = document.querySelector("#userAuthStatus");
const appContent = document.querySelector("#appContent");
const loginContainer = document.querySelector("#loginContainer");

let currentUserId = null; 

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

async function saveItemsToFirebase(itemsToSave) {
    if (!currentUserId) {
        notifyUser("You must be logged in to save items.", "error");
        console.warn("Attempted to save items without a logged-in user.");
        return;
    }
    try {
        await set(ref(database, `users/${currentUserId}/items`), itemsToSave);
    } catch (error) {
        console.error("Error saving items to Firebase:", error);
        notifyUser("Failed to save items to cloud.", "error");
    }
}

async function loadItemsFromFirebase() {
    if (!currentUserId) {
        return [];
    }
    try {
        const snapshot = await get(
            child(ref(database), `users/${currentUserId}/items`)
        );
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Array.isArray(data) ? data : Object.values(data || {});
        } else {
            return [];
        }
    } catch (error) {
        console.error("Error loading items from Firebase:", error);
        notifyUser(
            "Failed to load items from cloud. Check console for details.",
            "error"
        );
        return []; 
    }
}

function saveItemsToLocalStorage(itemsToSave) {
    console.warn(
        "LocalStorage backup is not user-specific in the current multi-user setup."
    );
}
function loadItemsFromLocalStorage() {
    console.warn(
        "LocalStorage fallback is not user-specific in the current multi-user setup."
    );
    return [];
}

let items = []; 

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

async function refreshItems() {
    if (!currentUserId) {
        console.log("No user logged in, clearing items.");
        items = [];
        renderItems(items);
        return;
    }
    items = await loadItemsFromFirebase();
    renderItems(items);
}

let currentEditingId = null;

async function addItemFormSubmitHandler(event) {
    event.preventDefault();
    if (!currentUserId) {
        notifyUser("You must be logged in to add items.", "error");
        return;
    }
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

    const newItem = {
        id: currentEditingId || Date.now().toString(),
        title: albumName,
        artists: artists,
        year: year,
        month: month,
        day: day,
        wanted: wanted,
        types: types,
        imageUrl: finalImageUrl,
        albumLink: albumLink || null,
    };

    let success = false;
    if (currentEditingId) {
        const itemIndex = items.findIndex(
            (item) => item.id === currentEditingId
        );
        if (itemIndex !== -1) {
            items[itemIndex] = newItem;
            success = true;
        } else {
            notifyUser("Error: Item not found for update.", "error");
            return;
        }
    } else {
        items.push(newItem);
        success = true;
    }

    if (success) {
        try {
            await saveItemsToFirebase(items);
            notifyUser(
                currentEditingId
                    ? "Item updated successfully!"
                    : "Item added successfully!",
                "success"
            );
            renderItems(items);
            addItemForm.reset();
            if (artistsTagInput) artistsTagInput.removeAllTags();
            if (genresTagInput) genresTagInput.removeAllTags();
            modal.classList.remove("show");
            currentEditingId = null;
            isEditing = false;
            formPreviewCard.innerHTML = ""; 
        } catch (error) {
            console.error(
                "Error saving item to Firebase after add/update:",
                error
            );
            notifyUser("Failed to save item to cloud.", "error");
        }
    }
}

addItemForm.addEventListener("submit", addItemFormSubmitHandler);

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

confirmDeleteBtn.addEventListener("click", async () => {
    if (itemToDelete && itemToDelete.id) {
        if (!currentUserId) {
            notifyUser("You must be logged in to delete items.", "error");
            return;
        }
        const originalItems = [...items];
        items = items.filter((item) => item.id !== itemToDelete.id);
        try {
            await saveItemsToFirebase(items);
            renderItems(items);
            deleteConfirmModal.style.display = "none";
            itemToDelete = null;
            notifyUser("Item deleted successfully!", "success");
        } catch (error) {
            items = originalItems; 
            console.error("Error deleting item from Firebase:", error);
            notifyUser("Failed to delete item from cloud.", "error");
        }
    }
});

cancelDeleteBtn.addEventListener("click", () => {
    deleteConfirmModal.style.display = "none";
    itemToDelete = null;
});

document.querySelector("#results").addEventListener("click", async (event) => {
    const editButton = event.target.closest(".edit-btn");
    const deleteButton = event.target.closest(".delete-btn");
    const card = event.target.closest(".card");

    if (editButton && card && card.dataset.id) {
        const itemId = card.dataset.id;
        const itemToEdit = items.find((item) => item.id === itemId);
        if (itemToEdit) {
            document.querySelector("#imageUrl").value =
                itemToEdit.imageUrl || "";
            document.querySelector("#albumName").value = itemToEdit.title || "";
            document.querySelector("#albumLink").value =
                itemToEdit.albumLink || "";
            document.querySelector("#wantedToggle").checked = Boolean(
                itemToEdit.wanted
            );
            document.querySelector("#vinylCheck").checked = Boolean(
                itemToEdit.types?.vinyl
            );
            document.querySelector("#cdCheck").checked = Boolean(
                itemToEdit.types?.cd
            );

            const artistsInput = artistsTagInput;
            const genresInput = genresTagInput;

            artistsInput.clearTags();
            genresInput.clearTags();

            if (Array.isArray(itemToEdit.albumArtists)) {
                itemToEdit.albumArtists.forEach((artist) =>
                    artistsInput.addTag(artist)
                );
            }

            if (Array.isArray(itemToEdit.genres)) {
                itemToEdit.genres.forEach((genre) => genresInput.addTag(genre));
            }

            if (itemToEdit.releaseDate) {
                const [y, m, d] = itemToEdit.releaseDate.split("-");
                document.querySelector("#releaseYear").value = y || "";
                document.querySelector("#releaseMonth").value =
                    parseInt(m) || "";
                document.querySelector("#releaseDay").value = parseInt(d) || "";
            }

            modal.classList.add("show");
            updateFormPreview();
            document.querySelector("#albumName").focus();
        }
    } else if (deleteButton && card) {
        const itemId = card.dataset.id;
        const item = items.find((it) => it.id === itemId);
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
    if (!currentUserId) {
        notifyUser("You must be logged in to import items.", "error");
        return;
    }
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedFileItems = JSON.parse(event.target.result);
                    if (Array.isArray(importedFileItems)) {
                        const updatedItems = [...items];
                        let itemsChanged = false;

                        for (const importedItem of importedFileItems) {
                            const existingItemIndex = updatedItems.findIndex(
                                (i) => i.id === importedItem.id
                            );
                            if (existingItemIndex !== -1) {
                                updatedItems[existingItemIndex] = {
                                    ...updatedItems[existingItemIndex],
                                    ...importedItem,
                                };
                                itemsChanged = true;
                            } else {
                                const newItemWithId = {
                                    ...importedItem,
                                    id:
                                        importedItem.id ||
                                        Date.now().toString() +
                                            Math.random()
                                                .toString(36)
                                                .substring(2),
                                };
                                updatedItems.push(newItemWithId);
                                itemsChanged = true;
                            }
                        }

                        if (itemsChanged) {
                            items = updatedItems;
                            await saveItemsToFirebase(items);
                            saveItemsToLocalStorage(items);
                            renderItems(items);
                            notifyUser(
                                "Items imported successfully!",
                                "success"
                            );
                        } else {
                            notifyUser(
                                "No new items to import or update.",
                                "info"
                            );
                        }
                    } else {
                        notifyUser("Invalid file format.", "error");
                    }
                } catch (error) {
                    notifyUser("Error reading file.", "error");
                    console.error("Error importing items:", error);
                }
            };
            reader.readAsText(file);
        }
    };
    fileInput.click();
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
    if (!currentUserId) {
        notifyUser("You must be logged in to reorder items.", "error");
        return;
    }
    const orderedItems = [];
    document.querySelectorAll("#results .card").forEach((cardEl, index) => {
        const itemId = cardEl.dataset.id;
        const item = items.find((i) => i.id === itemId);
        if (item) {
            orderedItems.push({ ...item, order: index });
        }
    });

    orderedItems.sort((a, b) => a.order - b.order);

    items = orderedItems.map(({ order, ...rest }) => rest);

    saveItemsToFirebase(items);
}

function setupDateInputs() {
    console.log(
        "setupDateInputs function called - ensure its body is correctly implemented."
    );
    const releaseMonthInput = document.querySelector("#releaseMonth");
    const releaseDayInput = document.querySelector("#releaseDay");
    const releaseYearInput = document.querySelector("#releaseYear");
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        console.log("User signed in:", currentUserId, user.displayName);
        if (userAuthStatus) {
            userAuthStatus.innerHTML = `<button id="logoutButton" class="auth-button icon-button" title="Logout ${
                user.displayName || user.email
            }"><img src="img/logout.svg" alt="Logout"></button>`;
            userAuthStatus.style.display = "flex"; 
            const logoutButton = document.getElementById("logoutButton");
            if (logoutButton) {
                logoutButton.addEventListener("click", async () => {
                    try {
                        await signOut(auth);
                    } catch (error) {
                        console.error("Logout failed:", error);
                        notifyUser("Logout failed. Please try again.", "error");
                    }
                });
            }
        }
        if (loginContainer) loginContainer.style.display = "none";
        if (appContent) appContent.style.display = "block"; 
        document.body.classList.remove("logged-out-view");
        refreshItems(); 
    } else {
        currentUserId = null;
        console.log("User signed out");
        items = [];
        renderItems(items); 
        if (userAuthStatus) {
            userAuthStatus.innerHTML = "";
            userAuthStatus.style.display = "none";
        }
        if (loginContainer) {
            loginContainer.style.display = "flex"; 
            document.body.classList.add("logged-out-view");
        }
        if (appContent) {
            appContent.style.display = "none"; 
        }
    }
});

if (loginButton) {
    loginButton.addEventListener("click", async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Login failed:", error);
            if (error.code === "auth/popup-closed-by-user") {
                notifyUser(
                    "Login cancelled. Please try again if you wish to log in.",
                    "info"
                );
            } else if (error.code === "auth/network-request-failed") {
                notifyUser(
                    "Login failed: Network error. Please check your connection.",
                    "error"
                );
            } else {
                notifyUser(`Login failed: ${error.message}`, "error");
            }
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM fully loaded and parsed");
    if (appContent) appContent.style.display = "none";
    if (userAuthStatus) userAuthStatus.style.display = "none";

    setupDateInputs();
});

function updateFormPreview() {
    if (!formPreviewCard) return;

    const albumName =
        document.querySelector("#albumName").value || "Album Title";
    const albumArtistsRaw = artistsTagInput
        ? artistsTagInput.value.map((tag) => tag.value).join(" • ")
        : document.querySelector("#albumArtists")?.value || "Artist(s)";
    const albumArtists = albumArtistsRaw || "Artist(s)";

    const year = document.querySelector("#releaseYear").value || "YYYY";
    const month = document.querySelector("#releaseMonth").value || "MM";
    const day = document.querySelector("#releaseDay").value || "DD";
    let releaseDateDisplay = "Release Date";
    if (year !== "YYYY") {
        releaseDateDisplay = year;
        if (month !== "MM" && month !== "00" && month !== "01") {
            const monthName = new Date(
                2000,
                parseInt(month) - 1,
                1
            ).toLocaleString("default", { month: "short" });
            releaseDateDisplay = `${monthName} ${year}`;
            if (day !== "DD" && day !== "00" && day !== "01") {
                releaseDateDisplay = `${day} ${monthName} ${year}`;
            }
        }
    }

    const imageUrl =
        document.querySelector("#imageUrl").value || "img/default.png";
    const wanted = document.querySelector("#wantedToggle").checked;
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
        <div class="card ${wanted ? "wanted-preview" : ""}">
            <img src="${imageUrl}" alt="Preview Image" onerror="this.src='img/default.png'">
            <div class="album-info">
                <h3>${albumName}</h3>
                <p>${albumArtists}</p>
                <p>${releaseDateDisplay}</p>
                <div class="type-badges">${typesBadges}</div>
            </div>
        </div>
    `;
}

document
    .querySelector("#albumName")
    ?.addEventListener("input", updateFormPreview);
document
    .querySelector("#albumArtists")
    ?.addEventListener("input", updateFormPreview);
document
    .querySelector("#imageUrl")
    ?.addEventListener("input", updateFormPreview);
document
    .querySelector("#releaseYear")
    ?.addEventListener("input", updateFormPreview);
document
    .querySelector("#releaseMonth")
    ?.addEventListener("input", updateFormPreview);
document
    .querySelector("#releaseDay")
    ?.addEventListener("input", updateFormPreview);
document
    .querySelector("#wantedToggle")
    ?.addEventListener("change", updateFormPreview);
document
    .querySelector("#vinylCheck")
    ?.addEventListener("change", updateFormPreview);
document
    .querySelector("#cdCheck")
    ?.addEventListener("change", updateFormPreview);
