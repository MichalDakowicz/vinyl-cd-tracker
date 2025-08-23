import { getAlbumImageFromSpotify } from "./spotify.js";
import { getAlbumDataFromAppleMusic } from "./applemusic.js";
import {
    database,
    auth,
    provider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,
    ref,
    set,
    get,
} from "./firebase-config.js";

let items = [];
let currentUser = null;
let userItemsRef = null;
let isSharedView = false;

// Check for shared collection in URL parameters
const urlParams = new URLSearchParams(window.location.search);
const shareId = urlParams.get('share');

if (shareId) {
    isSharedView = true;
    loadSharedCollection(shareId);
}

const loginContainer = document.querySelector("#loginContainer");
const appContent = document.querySelector("#appContent");
const loginButton = document.querySelector("#loginButton");
const userAuthStatus = document.querySelector("#userAuthStatus");

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
    if (darkModeToggle) darkModeToggle.checked = true;
    document
        .querySelector('meta[name="theme-color"]')
        .setAttribute("content", "#333333");
}

function getIconPath(iconName) {
    const isDarkMode = body.classList.contains("dark-mode");
    const defaultPath = `img/${iconName}.svg`;
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
        "up",
        "down",
        "loading",
        "reorder",
    ];

    return isDarkMode && darkModeIcons.includes(iconName)
        ? darkModePath
        : defaultPath;
}

function updateAllIcons() {
    const addItemButtonIcon = document.querySelector("#addItemButton img");
    if (addItemButtonIcon) addItemButtonIcon.src = getIconPath("add");

    const exportButtonIcon = document.querySelector("#exportButton img");
    if (exportButtonIcon) exportButtonIcon.src = getIconPath("export");

    const importButtonIcon = document.querySelector("#importButton img");
    if (importButtonIcon) importButtonIcon.src = getIconPath("import");

    const shareButtonIcon = document.querySelector("#shareButton img");
    if (shareButtonIcon) shareButtonIcon.src = getIconPath("link");

    const modalAddButtonIcon = document.querySelector(
        "#addItemForm button[type='submit'] img"
    );
    if (modalAddButtonIcon) modalAddButtonIcon.src = getIconPath("add");

    if (viewModeButton && viewModeButton.querySelector("img")) {
        viewModeButton.querySelector("img").src = getIconPath(
            isGridView ? "list" : "grid"
        );
    }

    const randomButtonIcon = document.querySelector("#randomButton img");
    if (randomButtonIcon) randomButtonIcon.src = getIconPath("random");

    const clearButtonIcon = document.querySelector("#clearButton img");
    if (clearButtonIcon) clearButtonIcon.src = getIconPath("clear");

    const filterButtonIcon = document.querySelector("#filtersButton img");
    if (filterButtonIcon) filterButtonIcon.src = getIconPath("filter");

    const statsButtonIcon = document.querySelector("#statsButton img");
    if (statsButtonIcon) statsButtonIcon.src = getIconPath("stats");

    const reorderButtonIcon = document.querySelector("#reorderButton img");
    if (reorderButtonIcon) reorderButtonIcon.src = getIconPath("reorder");

    renderItems(applyFilters(items));

    if (reorderModal.classList.contains("show")) {
        updateReorderIcons();
    }
}

if (darkModeToggle) {
    darkModeToggle.addEventListener("change", (event) => {
        toggleDarkMode(event);
        updateAllIcons();
    });
}

const modal = document.querySelector("#addItemModal");
const addItemButton = document.querySelector("#addItemButton");
const closeModalButton = modal ? modal.querySelector(".close") : null;
const addItemForm = document.querySelector("#addItemForm");
let artistsTagInput;
let genresTagInput;

if (addItemButton) {
    addItemButton.addEventListener("click", () => {
        if (modal) modal.classList.add("show");
        if (addItemForm) addItemForm.reset();
        if (artistsTagInput) artistsTagInput.clearTags();
        if (genresTagInput) genresTagInput.clearTags();
        if (formPreviewCard) formPreviewCard.innerHTML = "";
        isEditing = false;
        currentEditingId = null;
        document.querySelector("#albumName").focus();
        updateFormPreview();
    });
}

if (closeModalButton) {
    closeModalButton.addEventListener("click", () => {
        if (modal) modal.classList.remove("show");
        isEditing = false;
        currentEditingId = null;
    });
}

const previewModal = document.querySelector("#previewModal");
const closePreviewButton = document.querySelector("#closePreview");

if (closePreviewButton) {
    closePreviewButton.addEventListener("click", () => {
        if (previewModal) previewModal.style.display = "none";
    });
}

function showLoginScreen() {
    let container = document.querySelector(".container");
    if (container) {
        container.style.display = "none";
    }
    if (loginContainer) loginContainer.style.display = "flex";
    if (appContent) appContent.style.display = "none";
    if (userAuthStatus) userAuthStatus.innerHTML = "";
    items = [];
    renderUI();
}

function showAppContent(user) {
    let container = document.querySelector(".container");
    if (container) {
        container.style.display = "block";
    }
    if (loginContainer) loginContainer.style.display = "none";
    if (appContent) appContent.style.display = "block";

    if (userAuthStatus) {
        userAuthStatus.innerHTML = "";
        const logoutButton = document.createElement("button");
        logoutButton.id = "logoutButton";
        logoutButton.innerHTML =
            "<img src='" + getIconPath("logout") + "' alt='Logout'>";
        logoutButton.addEventListener("click", handleLogout);

        userAuthStatus.appendChild(logoutButton);
    }
}

async function handleLogin() {
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Login failed:", error);
        notifyUser(`Login failed: ${error.message}`, "error");
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout failed:", error);
        notifyUser(`Logout failed: ${error.message}`, "error");
    }
}

async function loadSharedCollection(shareId) {
    try {
        // Check if Firebase is available
        if (typeof database === 'undefined') {
            // For demo/testing purposes when Firebase is not available
            const mockSharedData = {
                items: [
                    {
                        id: 1,
                        albumName: "The Dark Side of the Moon",
                        albumArtists: ["Pink Floyd"],
                        releaseDate: "1973-03-01",
                        genres: ["Progressive Rock", "Psychedelic Rock"],
                        types: { vinyl: true, cd: false },
                        wanted: false,
                        imageUrl: "img/default.png",
                        albumLink: "https://open.spotify.com/album/4LH4d3cOWNNsVw41Gqt2kv"
                    },
                    {
                        id: 2,
                        albumName: "Abbey Road",
                        albumArtists: ["The Beatles"],
                        releaseDate: "1969-09-26",
                        genres: ["Rock", "Pop"],
                        types: { vinyl: true, cd: true },
                        wanted: false,
                        imageUrl: "img/default.png",
                        albumLink: "https://open.spotify.com/album/0ETFjACtuP2ADo6LFhL6HN"
                    },
                    {
                        id: 3,
                        albumName: "Kind of Blue",
                        albumArtists: ["Miles Davis"],
                        releaseDate: "1959-08-17",
                        genres: ["Jazz"],
                        types: { vinyl: true, cd: false },
                        wanted: true,
                        imageUrl: "img/default.png"
                    }
                ],
                metadata: {
                    sharedBy: "Demo User",
                    sharedAt: new Date().toISOString(),
                    totalItems: 3
                }
            };
            
            items = mockSharedData.items;
            showSharedCollection(mockSharedData.metadata);
            renderUI();
            return;
        }
        
        const shareRef = ref(database, `public-shares/${shareId}`);
        const snapshot = await get(shareRef);
        
        if (snapshot.exists()) {
            const shareData = snapshot.val();
            items = shareData.items || [];
            
            // Show shared collection UI
            showSharedCollection(shareData.metadata);
            renderUI();
        } else {
            notifyUser("Shared collection not found or may have expired.", "error");
            // Remove share parameter and reload
            const url = new URL(window.location);
            url.searchParams.delete('share');
            window.history.replaceState({}, '', url);
            isSharedView = false;
        }
    } catch (error) {
        console.error("Error loading shared collection:", error);
        notifyUser("Failed to load shared collection.", "error");
        isSharedView = false;
    }
}

function showSharedCollection(metadata) {
    // Hide login container and show app content
    if (loginContainer) loginContainer.style.display = "none";
    if (appContent) appContent.style.display = "block";
    
    // Show shared collection banner
    const header = document.querySelector(".header");
    if (header && !document.querySelector(".shared-banner")) {
        const banner = document.createElement("div");
        banner.className = "shared-banner";
        banner.innerHTML = `
            <div class="shared-info">
                <strong>📋 Viewing Shared Collection</strong>
                <span>Shared by ${metadata?.sharedBy || "Unknown"}</span>
                <span>${metadata?.totalItems || items.length} items</span>
            </div>
            <div class="shared-actions">
                <button id="viewOwnCollection" class="view-own-btn">View My Collection</button>
            </div>
        `;
        header.appendChild(banner);
        
        // Add click handler for "View My Collection" button
        const viewOwnBtn = banner.querySelector("#viewOwnCollection");
        if (viewOwnBtn) {
            viewOwnBtn.addEventListener("click", () => {
                const url = new URL(window.location);
                url.searchParams.delete('share');
                window.location = url.toString();
            });
        }
    }
    
    // Hide action buttons that shouldn't be available in shared view
    const actionsToHide = ["#addItemButton", "#shareButton"];
    actionsToHide.forEach(selector => {
        const element = document.querySelector(selector);
        if (element) element.style.display = "none";
    });
    
    // Update user auth status
    if (userAuthStatus) {
        userAuthStatus.innerHTML = `
            <span class="shared-status">👁️ Viewing shared collection</span>
        `;
    }
}

onAuthStateChanged(auth, async (user) => {
    // Skip auth flow if viewing shared collection
    if (isSharedView) return;
    
    if (user) {
        currentUser = user;
        userItemsRef = ref(database, `users/${currentUser.uid}/items`);
        showAppContent(user);
        await loadItemsFromFirebase();
    } else {
        currentUser = null;
        userItemsRef = null;
        showLoginScreen();
    }
});

if (loginButton) {
    loginButton.addEventListener("click", handleLogin);
}

async function saveItemsToFirebase() {
    if (!userItemsRef) {
        return;
    }
    try {
        await set(userItemsRef, items);
    } catch (error) {
        console.error("Error saving items to Firebase:", error);
        notifyUser("Failed to save changes to the cloud.", "error");
    }
}

async function loadItemsFromFirebase() {
    if (!userItemsRef) {
        items = [];
        renderUI();
        return;
    }
    try {
        const snapshot = await get(userItemsRef);
        if (snapshot.exists()) {
            const firebaseItems = snapshot.val();
            items = Array.isArray(firebaseItems)
                ? firebaseItems
                : firebaseItems
                ? Object.values(firebaseItems)
                : [];
            let needsFirebaseUpdate = false;
            items = items
                .map((item) => {
                    if (
                        item &&
                        typeof item === "object" &&
                        !item.hasOwnProperty("id")
                    ) {
                        needsFirebaseUpdate = true;
                        return { ...item, id: Date.now() + Math.random() };
                    }
                    return item;
                })
                .filter(Boolean);

            if (needsFirebaseUpdate) {
                await saveItemsToFirebase();
            }
        } else {
            items = [];
        }
    } catch (error) {
        console.error("Error loading items from Firebase:", error);
        notifyUser("Failed to load data from the cloud.", "error");
        items = [];
    }
    renderUI();
}

function renderUI() {
    renderItems(applyFilters(items));
    if (typeof updateArtistsList === "function") updateArtistsList();
    if (typeof updateGenresList === "function") updateGenresList();
    if (typeof updateStats === "function") updateStats();
    if (typeof updateAllIcons === "function") updateAllIcons();
    if (
        artistsTagInput &&
        typeof artistsTagInput.updateSuggestions === "function"
    )
        artistsTagInput.updateSuggestions();
    if (
        genresTagInput &&
        typeof genresTagInput.updateSuggestions === "function"
    )
        genresTagInput.updateSuggestions();
}

function formatDate(dateString) {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length < 3) return dateString;
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
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString("en-GB");
    } catch (e) {
        return dateString;
    }
}

function renderItems(itemsToRender) {
    if (!resultsContainer) return;
    resultsContainer.innerHTML = "";

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
        const releaseDate = item.releaseDate || "";

        const linkButtonHTML = item.albumLink
            ? `
            <button class="linkButton" title="Open Album Link" data-url="${
                item.albumLink
            }">
                <img src="${getIconPath("link")}" alt="Link">
            </button>`
            : `<button class="updateButton" title="Update (requires link in edit)" data-id="${
                  item.id
              }" disabled>
                <img src="${getIconPath("refresh")}" alt="Update">
            </button>`;

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
                ${linkButtonHTML}
                ${!isSharedView ? `
                <button class="editButton" data-id="${item.id}">
                    <img src="${getIconPath("edit")}" alt="Edit">
                </button>
                <button class="removeButton" data-id="${item.id}">
                    <img src="${getIconPath("delete")}" alt="Remove">
                </button>
                ` : ''}
            </div>
        `;
        newItemElement.setAttribute("data-index", index);
        newItemElement.setAttribute("data-id", item.id);
        resultsContainer.appendChild(newItemElement);
    }); 
    if (isGridView && !isSharedView) {
        const addButtonCard = document.createElement("div");
        addButtonCard.classList.add("card", "add-button-card");
        addButtonCard.innerHTML = `
            <div class="add-button-content">
                <img src="${getIconPath("add")}" alt="Add Item" />
                <span>Add New Item</span>
            </div>
        `;
        addButtonCard.addEventListener("click", () => {
            const modal = document.querySelector("#addItemModal");
            if (modal) modal.classList.add("show");
        });
        resultsContainer.appendChild(addButtonCard);
    }

    document.querySelectorAll(".linkButton").forEach((button) => {
        button.addEventListener("click", (e) => {
            e.stopPropagation();
            window.open(button.dataset.url, "_blank");
        });
    });
    if (typeof initDragAndDrop === "function") initDragAndDrop();
}

const searchInput = document.querySelector("#search");
const clearButton = document.querySelector("#clearButton");

function searchItems(query) {
    if (!items) return;
    const currentFilters = applyFilters(items);
    if (!query) {
        renderItems(currentFilters);
        return;
    }

    const searchQuery = query.toLowerCase().trim();
    const searchedItems = currentFilters.filter((item) => {
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
        const releaseDate = formatDate(item.releaseDate || "").toLowerCase();
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
    renderItems(searchedItems);
}

if (searchInput) {
    searchInput.addEventListener("input", () => {
        searchItems(searchInput.value);
    });
    searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            searchItems(searchInput.value);
        }
    });
}

if (clearButton) {
    clearButton.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        renderItems(applyFilters(items));
    });
}

async function refreshItems() {
    await saveItemsToFirebase();
    searchItems(searchInput ? searchInput.value : "");
    if (typeof updateStats === "function") updateStats();
    if (typeof updateArtistsList === "function") updateArtistsList();
    if (typeof updateGenresList === "function") updateGenresList();
}

let isEditing = false;
let currentEditingId = null;
const formPreviewCard = document.querySelector("#formPreviewCard");

async function updateImageAndDataFromProvider(
    albumLinkInput,
    imageUrlInput,
    albumNameInput,
    artistsTagInputInstance,
    genresTagInputInstance,
    releaseYearInput,
    releaseMonthInput,
    releaseDayInput
) {
    const link = albumLinkInput.value;
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
                if (!albumNameInput.value && albumData.albumName)
                    albumNameInput.value = albumData.albumName;
                if (
                    albumData.artists &&
                    artistsTagInputInstance.getTags().length === 0
                ) {
                    artistsTagInputInstance.clearTags();
                    albumData.artists.forEach((artist) =>
                        artistsTagInputInstance.addTag(artist)
                    );
                }
                if (
                    albumData.genres &&
                    genresTagInputInstance.getTags().length === 0
                ) {
                    genresTagInputInstance.clearTags();
                    albumData.genres.forEach((genre) =>
                        genresTagInputInstance.addTag(genre)
                    );
                }
                if (!imageUrlInput.value && albumData.imageUrl)
                    imageUrlInput.value = albumData.imageUrl;

                if (!releaseYearInput.value && albumData.releaseDate) {
                    const [year, month, day] = albumData.releaseDate
                        .substring(0, 10)
                        .split("-");
                    releaseYearInput.value = year || "";
                    releaseMonthInput.value = month ? parseInt(month, 10) : "";
                    releaseDayInput.value = day ? parseInt(day, 10) : "";
                }
                updateFormPreview();
            }
        } catch (error) {
            console.error("Error retrieving album details:", error);
            notifyUser("Error retrieving album details.", "error");
        }
    }
}

function updateFormPreview() {
    if (!formPreviewCard) return;
    const imageUrl = document.querySelector("#imageUrl").value;
    const albumName = document.querySelector("#albumName").value;
    const albumArtistsArray = artistsTagInput ? artistsTagInput.getTags() : [];
    const genresArray = genresTagInput ? genresTagInput.getTags() : [];
    const albumArtists = albumArtistsArray.join(" • ");
    const genres = genresArray.join(", ");

    const year = document.querySelector("#releaseYear").value.padStart(4, "0");
    const month = (
        document.querySelector("#releaseMonth").value || "01"
    ).padStart(2, "0");
    const day = (document.querySelector("#releaseDay").value || "01").padStart(
        2,
        "0"
    );
    const releaseDate = `${year}-${month}-${day}`;

    const types = {
        vinyl: document.querySelector("#vinylCheck")
            ? document.querySelector("#vinylCheck").checked
            : false,
        cd: document.querySelector("#cdCheck")
            ? document.querySelector("#cdCheck").checked
            : false,
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
            <h3>${albumName || "Album Name"}</h3>
            <p>${albumArtists || "Artist(s)"}</p>
            <p>${formatDate(releaseDate)}</p>
            ${genres ? `<p class="genres">${genres}</p>` : ""}
        </div>
    `;
}

document
    .querySelectorAll("#addItemForm input, #addItemForm select")
    .forEach((input) => {
        input.addEventListener("input", updateFormPreview);
        if (input.type === "checkbox") {
            input.addEventListener("change", updateFormPreview);
        }
    });

const albumLinkInput = document.querySelector("#albumLink");
if (albumLinkInput) {
    albumLinkInput.addEventListener("input", async () => {
        await updateImageAndDataFromProvider(
            albumLinkInput,
            document.querySelector("#imageUrl"),
            document.querySelector("#albumName"),
            artistsTagInput,
            genresTagInput,
            document.querySelector("#releaseYear"),
            document.querySelector("#releaseMonth"),
            document.querySelector("#releaseDay")
        );
        updateFormPreview();
    });
}

if (addItemForm) {
    addItemForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const albumLink = document.querySelector("#albumLink").value;
        let imageUrl = document.querySelector("#imageUrl").value;
        let albumName = document.querySelector("#albumName").value;
        let artists = artistsTagInput.getTags();
        let genres = genresTagInput.getTags();
        let releaseDateYear = document.querySelector("#releaseYear").value;
        let releaseDateMonth = document.querySelector("#releaseMonth").value;
        let releaseDateDay = document.querySelector("#releaseDay").value;

        if (
            !imageUrl &&
            albumLink &&
            (albumLink.includes("spotify.com") ||
                albumLink.includes("music.apple.com"))
        ) {
            try {
                let providerData;
                if (albumLink.includes("spotify.com")) {
                    providerData = await getAlbumImageFromSpotify(albumLink);
                } else {
                    providerData = await getAlbumDataFromAppleMusic(albumLink);
                }
                if (providerData) {
                    if (!imageUrl) imageUrl = providerData.imageUrl || "";
                    if (!albumName && providerData.albumName)
                        albumName = providerData.albumName;
                    if (artists.length === 0 && providerData.artists)
                        artists = providerData.artists;
                    if (genres.length === 0 && providerData.genres)
                        genres = providerData.genres;
                    if (!releaseDateYear && providerData.releaseDate) {
                        const [year, month, day] = providerData.releaseDate
                            .substring(0, 10)
                            .split("-");
                        if (!releaseDateYear) releaseDateYear = year;
                        if (!releaseDateMonth) releaseDateMonth = month;
                        if (!releaseDateDay) releaseDateDay = day;
                    }
                }
            } catch (err) {
                console.error(
                    "Failed to fetch data from provider link for submission:",
                    err
                );
            }
        }

        const year = releaseDateYear.padStart(4, "0");
        const month = (releaseDateMonth || "01").padStart(2, "0");
        const day = (releaseDateDay || "01").padStart(2, "0");
        const releaseDate = `${year}-${month}-${day}`;
        const wanted = document.querySelector("#wantedToggle").checked;
        const types = {
            vinyl: document.querySelector("#vinylCheck").checked,
            cd: document.querySelector("#cdCheck").checked,
        };

        const itemData = {
            imageUrl: imageUrl,
            albumName,
            albumArtists: artists,
            genres: genres,
            releaseDate,
            wanted,
            types,
            albumLink: albumLink || null,
        };

        if (isEditing && currentEditingId) {
            const index = items.findIndex(
                (item) => item.id === currentEditingId
            );
            if (index !== -1) {
                items[index] = { ...items[index], ...itemData };
            }
        } else {
            items.push({
                id: Date.now() + Math.random(),
                ...itemData,
            });
        }

        await refreshItems();
        if (modal) modal.classList.remove("show");
        addItemForm.reset();
        artistsTagInput.clearTags();
        genresTagInput.clearTags();
        if (formPreviewCard) formPreviewCard.innerHTML = "";
        isEditing = false;
        currentEditingId = null;
    });
}

const deleteConfirmModal = document.querySelector("#deleteConfirmModal");
const confirmDeleteBtn = document.querySelector("#confirmDelete");
const cancelDeleteBtn = document.querySelector("#cancelDelete");
let itemToDelete = null;

function showDeleteConfirmation(item) {
    itemToDelete = item;
    const preview = deleteConfirmModal
        ? deleteConfirmModal.querySelector(".delete-preview")
        : null;
    if (!preview) return;

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
    if (deleteConfirmModal) deleteConfirmModal.classList.add("show");
}

if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
        if (itemToDelete) {
            const index = items.findIndex(
                (item) => item.id === itemToDelete.id
            );
            if (index !== -1) {
                items.splice(index, 1);
                await refreshItems();
            }
        }
        if (deleteConfirmModal) deleteConfirmModal.classList.remove("show");
        itemToDelete = null;
    });
}

if (cancelDeleteBtn) {
    cancelDeleteBtn.addEventListener("click", () => {
        if (deleteConfirmModal) deleteConfirmModal.classList.remove("show");
        itemToDelete = null;
    });
}

if (resultsContainer) {
    resultsContainer.addEventListener("click", async (event) => {
        const targetButton = event.target.closest("button");
        const cardElement = event.target.closest(".card");

        if (targetButton) {
            event.stopPropagation();
            const itemId = Number(targetButton.dataset.id);
            const itemIndex = items.findIndex((i) => i.id === itemId);
            if (itemIndex === -1) return;
            const item = items[itemIndex];

            if (targetButton.classList.contains("updateButton")) {
                if (!item.albumLink) {
                    notifyUser(
                        "No album link available for this item. Edit to add one.",
                        "error"
                    );
                    targetButton.disabled = false;
                    const imgElement = targetButton.querySelector("img");
                    if (imgElement) imgElement.src = getIconPath("refresh");
                    return;
                }
                targetButton.disabled = true;
                const imgElement = targetButton.querySelector("img");
                if (imgElement) imgElement.src = getIconPath("loading");
                try {
                    let providerData;
                    if (item.albumLink.includes("spotify.com")) {
                        providerData = await getAlbumImageFromSpotify(
                            item.albumLink
                        );
                    } else if (item.albumLink.includes("music.apple.com")) {
                        providerData = await getAlbumDataFromAppleMusic(
                            item.albumLink
                        );
                    } else {
                        notifyUser(
                            "Link provider not supported for auto-update.",
                            "error"
                        );
                        throw new Error("Unsupported link provider");
                    }

                    if (providerData) {
                        items[itemIndex] = {
                            ...item,
                            imageUrl: providerData.imageUrl || item.imageUrl,
                            albumName: providerData.albumName || item.albumName,
                            albumArtists:
                                providerData.artists || item.albumArtists,
                            genres: providerData.genres || item.genres,
                            releaseDate:
                                providerData.releaseDate || item.releaseDate,
                        };
                        await refreshItems();
                        notifyUser(
                            "Item updated successfully from provider!",
                            "success"
                        );
                    }
                } catch (error) {
                    console.error("Failed to update from provider:", error);
                    notifyUser("Failed to update item from provider.", "error");
                } finally {
                    targetButton.disabled = false;
                    if (imgElement) imgElement.src = getIconPath("refresh");
                }
            } else if (targetButton.classList.contains("editButton")) {
                isEditing = true;
                currentEditingId = itemId;
                document.querySelector("#imageUrl").value = item.imageUrl || "";
                document.querySelector("#albumName").value =
                    item.albumName || "";
                document.querySelector("#albumLink").value =
                    item.albumLink || "";
                document.querySelector("#wantedToggle").checked = Boolean(
                    item.wanted
                );
                document.querySelector("#vinylCheck").checked = Boolean(
                    item.types?.vinyl
                );
                document.querySelector("#cdCheck").checked = Boolean(
                    item.types?.cd
                );

                artistsTagInput.clearTags();
                genresTagInput.clearTags();

                if (Array.isArray(item.albumArtists)) {
                    item.albumArtists.forEach((artist) =>
                        artistsTagInput.addTag(artist)
                    );
                }
                if (Array.isArray(item.genres)) {
                    item.genres.forEach((genre) =>
                        genresTagInput.addTag(genre)
                    );
                }

                if (item.releaseDate) {
                    const [y, m, d] = item.releaseDate.split("-");
                    document.querySelector("#releaseYear").value = y || "";
                    document.querySelector("#releaseMonth").value = m
                        ? parseInt(m, 10)
                        : "";
                    document.querySelector("#releaseDay").value = d
                        ? parseInt(d, 10)
                        : "";
                } else {
                    document.querySelector("#releaseYear").value = "";
                    document.querySelector("#releaseMonth").value = "";
                    document.querySelector("#releaseDay").value = "";
                }

                if (modal) modal.classList.add("show");
                updateFormPreview();
                document.querySelector("#albumName").focus();
            } else if (targetButton.classList.contains("removeButton")) {
                showDeleteConfirmation(item);
            }
        } else if (
            cardElement &&
            !event.target.closest(".actions") &&
            !event.target.matches(".card img:not(.actions img)")
        ) {
            const itemId = Number(cardElement.dataset.id);
            const item = items.find((i) => i.id === itemId);
            if (!item) return;

            const albumView = document.querySelector("#albumViewModal");
            if (!albumView) return;
            albumView.querySelector(".album-cover img").src =
                item.imageUrl || "img/default.png";
            albumView.querySelector(".album-title").textContent =
                item.albumName || "Untitled";
            const artistsDisplay = Array.isArray(item.albumArtists)
                ? item.albumArtists.join(" • ")
                : item.albumArtists || "Unknown Artist";
            albumView.querySelector(".album-artist").textContent =
                artistsDisplay;
            albumView.querySelector(".album-date").textContent = formatDate(
                item.releaseDate
            );
            const genresDisplay =
                Array.isArray(item.genres) && item.genres.length > 0
                    ? item.genres
                          .map((genre) => `<span>${genre}</span>`)
                          .join(" ")
                    : "No genres listed";
            albumView.querySelector(".album-genres").innerHTML = genresDisplay;
            const badges = Object.entries(item.types || {})
                .filter(([_, checked]) => checked)
                .map(
                    ([type]) =>
                        `<span class="type-badge">${type.toUpperCase()}</span>`
                )
                .join("");
            albumView.querySelector(".album-badges").innerHTML = badges;
            const linkEl = albumView.querySelector(".spotify-link");
            if (item.albumLink) {
                linkEl.href = item.albumLink;
                linkEl.style.display = "inline-flex";
                let linkText = "Open Link";
                if (item.albumLink.includes("spotify.com"))
                    linkText = "Open in Spotify";
                else if (item.albumLink.includes("music.apple.com"))
                    linkText = "Open in Apple Music";
                linkEl.innerHTML = `<img src="${getIconPath(
                    "link"
                )}" alt="Open Link"> ${linkText}`;
            } else {
                linkEl.style.display = "none";
            }
            albumView.classList.add("show");
        }
    });
}

const exportButton = document.querySelector("#exportButton");
const importButton = document.querySelector("#importButton");

if (exportButton) {
    exportButton.addEventListener("click", () => {
        const dataStr = JSON.stringify(items, null, 2);
        const dataUri =
            "data:application/json;charset=utf-8," +
            encodeURIComponent(dataStr);
        const exportFileDefaultName = "vinyl-cd-tracker-data.json";
        const linkElement = document.createElement("a");
        linkElement.setAttribute("href", dataUri);
        linkElement.setAttribute("download", exportFileDefaultName);
        linkElement.click();
    });
}

if (importButton) {
    importButton.addEventListener("click", () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "application/json";
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const importedData = JSON.parse(event.target.result);
                    if (!Array.isArray(importedData))
                        throw new Error("Imported data is not an array.");

                    const validatedImportedItems = importedData
                        .map((item) => ({
                            ...item,
                            id: item.id || Date.now() + Math.random(),
                        }))
                        .filter(Boolean);

                    const existingIds = new Set(items.map((i) => i.id));
                    const newItemsToPush = [];
                    validatedImportedItems.forEach((importedItem) => {
                        if (!existingIds.has(importedItem.id)) {
                            newItemsToPush.push(importedItem);
                        }
                    });
                    items.push(...newItemsToPush);
                    await refreshItems();
                    notifyUser("Items imported successfully!", "success");
                } catch (error) {
                    console.error("Error importing file:", error);
                    notifyUser(
                        `Error importing file: ${error.message}. Ensure it's valid JSON.`,
                        "error"
                    );
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });
}

const shareButton = document.querySelector("#shareButton");

if (shareButton) {
    shareButton.addEventListener("click", async () => {
        if (!currentUser) {
            notifyUser("Please log in to share your collection.", "error");
            return;
        }

        if (items.length === 0) {
            notifyUser("Your collection is empty. Add some items first!", "error");
            return;
        }

        try {
            shareButton.disabled = true;
            const shareButtonIcon = shareButton.querySelector("img");
            if (shareButtonIcon) shareButtonIcon.src = getIconPath("loading");

            // Check if Firebase is available
            if (typeof database === 'undefined' || !database) {
                throw new Error("Firebase database not available. Please check your internet connection and try again.");
            }

            // Generate a unique share ID
            const shareId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            
            // Create shareable collection data
            const shareData = {
                items: items,
                metadata: {
                    sharedBy: currentUser.displayName || currentUser.email || "Anonymous",
                    sharedAt: new Date().toISOString(),
                    totalItems: items.length
                }
            };

            // Store in Firebase under public shares
            const shareRef = ref(database, `public-shares/${shareId}`);
            await set(shareRef, shareData);

            // Generate shareable URL
            const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;

            // Copy to clipboard and show notification
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                notifyUser("Share URL copied to clipboard! Anyone with this link can view your collection.", "success");
            } else {
                // Fallback for browsers that don't support clipboard API
                notifyUser(`Share URL: ${shareUrl} (Copy this link to share your collection)`, "success");
            }
            
        } catch (error) {
            console.error("Error sharing collection:", error);
            
            // Provide specific error messages based on the error type
            let errorMessage = "Failed to share collection. ";
            
            if (error.message && error.message.includes("Firebase database not available")) {
                errorMessage += "Database connection failed. Please check your internet connection and try again.";
            } else if (error.code === 'PERMISSION_DENIED') {
                errorMessage += "Permission denied. Please make sure you're logged in and try again.";
            } else if (error.code === 'NETWORK_ERROR' || error.message.includes('network')) {
                errorMessage += "Network error. Please check your internet connection and try again.";
            } else if (error.name === 'NotAllowedError') {
                errorMessage += "Clipboard access denied. The share URL was generated but could not be copied automatically.";
            } else {
                errorMessage += "Please try again or contact support if the problem persists.";
            }
            
            notifyUser(errorMessage, "error");
        } finally {
            shareButton.disabled = false;
            const shareButtonIcon = shareButton.querySelector("img");
            if (shareButtonIcon) shareButtonIcon.src = getIconPath("link");
        }
    });
}

function toggleViewMode() {
    isGridView = !isGridView;
    updateViewMode();
    localStorage.setItem("viewMode", isGridView ? "grid" : "list");
}

function updateViewMode() {
    if (resultsContainer)
        resultsContainer.className = isGridView ? "grid-view" : "list-view";
    if (viewModeButton && viewModeButton.querySelector("img")) {
        viewModeButton.querySelector("img").src = getIconPath(
            isGridView ? "list" : "grid"
        );
        viewModeButton.title = `Switch to ${isGridView ? "List" : "Grid"} View`;
    }
    renderItems(applyFilters(items));
}
if (viewModeButton) updateViewMode();
if (viewModeButton) viewModeButton.addEventListener("click", toggleViewMode);

function initDragAndDrop() {
    if (!resultsContainer) return;
    const cards = resultsContainer.querySelectorAll(
        ".card:not(.add-button-card)"
    );
    let draggingCard = null;
    let lastOverCard = null;
    let touchStartY = null;
    let touchDragging = false;

    cards.forEach((card) => {
        if (!card) return;
        try {
            card.setAttribute("draggable", true);
            const cardImage = card.querySelector("img");
            if (cardImage) cardImage.setAttribute("draggable", false);

            card.addEventListener("dragstart", (e) => {
                card.classList.add("dragging");
                draggingCard = card;
                e.dataTransfer.setData("text/plain", card.dataset.id);
            });
            card.addEventListener("dragend", () => {
                card.classList.remove("dragging");
                draggingCard = null;
                lastOverCard = null;
                clearTimeout(card._saveTimeout);
                card._saveTimeout = setTimeout(saveNewOrder, 100);
            });
            card.addEventListener("dragover", (e) => {
                e.preventDefault();
                if (!draggingCard || draggingCard === card) return;
                if (lastOverCard && lastOverCard !== card) {
                    lastOverCard.classList.remove("drag-over");
                }
                card.classList.add("drag-over");
                lastOverCard = card;
                const box = card.getBoundingClientRect();
                const offsetY = e.clientY - box.top;
                const isBefore = offsetY < box.height / 2;
                if (
                    (isBefore && card.previousSibling !== draggingCard) ||
                    (!isBefore && card.nextSibling !== draggingCard)
                ) {
                    card.parentNode.insertBefore(
                        draggingCard,
                        isBefore ? card : card.nextSibling
                    );
                }
            });
            card.addEventListener("dragleave", () => {
                card.classList.remove("drag-over");
            });
            card.addEventListener("drop", (e) => {
                card.classList.remove("drag-over");
            });

            card.addEventListener("touchstart", (e) => {
                if (e.touches.length !== 1) return;
                touchStartY = e.touches[0].clientY;
                draggingCard = card;
                touchDragging = true;
                card.classList.add("dragging");
            });
            card.addEventListener("touchmove", (e) => {
                if (!touchDragging || !draggingCard) return;
                const touch = e.touches[0];
                const overElem = document.elementFromPoint(
                    touch.clientX,
                    touch.clientY
                );
                const overCard =
                    overElem && overElem.closest && overElem.closest(".card");
                if (overCard && overCard !== draggingCard) {
                    if (lastOverCard && lastOverCard !== overCard) {
                        lastOverCard.classList.remove("drag-over");
                    }
                    overCard.classList.add("drag-over");
                    lastOverCard = overCard;
                    const box = overCard.getBoundingClientRect();
                    const offsetY = touch.clientY - box.top;
                    const isBefore = offsetY < box.height / 2;
                    if (
                        (isBefore &&
                            overCard.previousSibling !== draggingCard) ||
                        (!isBefore && overCard.nextSibling !== draggingCard)
                    ) {
                        overCard.parentNode.insertBefore(
                            draggingCard,
                            isBefore ? overCard : overCard.nextSibling
                        );
                    }
                }
            });
            card.addEventListener("touchend", (e) => {
                if (!touchDragging) return;
                card.classList.remove("dragging");
                if (lastOverCard) lastOverCard.classList.remove("drag-over");
                draggingCard = null;
                lastOverCard = null;
                touchDragging = false;
                clearTimeout(card._saveTimeout);
                card._saveTimeout = setTimeout(saveNewOrder, 100);
            });
        } catch (error) {
            console.error("Error setting up drag and drop for card:", error);
        }
    });
}

async function saveNewOrder() {
    if (!resultsContainer) return;
    const cards = resultsContainer.querySelectorAll(
        ".card:not(.add-button-card)"
    );
    const newOrder = [];
    cards.forEach((card) => {
        const itemId = Number(card.dataset.id);
        const item = items.find((i) => i.id === itemId);
        if (item) {
            newOrder.push(item);
        }
    });

    if (newOrder.length === items.length) {
        items.length = 0;
        items.push(...newOrder);
        await saveItemsToFirebase();
    } else {
        await loadItemsFromFirebase();
    }
}

const randomButton = document.querySelector("#randomButton");
if (randomButton) {
    randomButton.addEventListener("click", () => {
        const currentFilteredItems = applyFilters(items);
        const availableOwnedItems = currentFilteredItems.filter(
            (item) => !item.wanted
        );

        if (availableOwnedItems.length === 0) {
            notifyUser(
                "No owned items in the current view to select from.",
                "error"
            );
            return;
        }

        const randomIndex = Math.floor(
            Math.random() * availableOwnedItems.length
        );
        const randomItem = availableOwnedItems[randomIndex];
        const targetCard = resultsContainer.querySelector(
            `.card[data-id="${randomItem.id}"]`
        );

        if (!targetCard) {
            notifyUser(
                "Could not find the selected random item in the view.",
                "error"
            );
            return;
        }

        document
            .querySelectorAll(".highlight")
            .forEach((card) => card.classList.remove("highlight"));
        targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
            targetCard.classList.add("highlight");
            setTimeout(() => targetCard.classList.remove("highlight"), 4000);
        }, 500);
    });
}

function setupDateInputs() {
    const dayInput = document.querySelector("#releaseDay");
    const monthInput = document.querySelector("#releaseMonth");
    const yearInput = document.querySelector("#releaseYear");

    function handleDateInputLogic(
        input,
        nextInput,
        prevInput,
        maxLength,
        maxValue
    ) {
        if (!input) return;
        input.addEventListener("input", (e) => {
            e.target.value = e.target.value.replace(/\D/g, "");
            if (e.target.value.length > maxLength) {
                e.target.value = e.target.value.slice(0, maxLength);
            }
            const value = parseInt(e.target.value, 10);
            if (value > maxValue) {
                e.target.value = maxValue.toString();
            }
            if (
                e.target.value.length === maxLength &&
                nextInput &&
                value <= maxValue
            ) {
                nextInput.focus();
            }
        });
        input.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && e.target.value === "" && prevInput) {
                prevInput.focus();
            }
        });
    }
    handleDateInputLogic(dayInput, monthInput, null, 2, 31);
    handleDateInputLogic(monthInput, yearInput, dayInput, 2, 12);
    handleDateInputLogic(yearInput, null, monthInput, 4, 9999);
}

const filtersButton = document.querySelector("#filtersButton");
const filtersPopup = document.querySelector("#filtersPopup");

function updateGenresList() {
    const filterGenre = document.querySelector("#filterGenre");
    if (!filterGenre || !items) return;
    const genresSet = new Set();
    items.forEach((item) => {
        if (Array.isArray(item.genres)) {
            item.genres.forEach((genre) => {
                if (genre) genresSet.add(genre);
            });
        }
    });
    const sortedGenres = Array.from(genresSet).sort();
    const currentSelected = Array.from(filterGenre.selectedOptions).map(
        (opt) => opt.value
    );
    filterGenre.innerHTML = `<option value="">All Genres</option><option value="none">No Genre</option>`;
    sortedGenres.forEach((genre) => {
        const opt = document.createElement("option");
        opt.value = genre.toLowerCase();
        opt.textContent = genre;
        if (currentSelected.includes(opt.value)) opt.selected = true;
        filterGenre.appendChild(opt);
    });
}

function updateArtistsList() {
    const filterArtist = document.querySelector("#filterArtist");
    if (!filterArtist || !items) return;
    const artistSet = new Set();
    items.forEach((item) => {
        if (Array.isArray(item.albumArtists)) {
            item.albumArtists.forEach((artist) => {
                if (artist) artistSet.add(artist);
            });
        }
    });
    const sortedArtists = Array.from(artistSet).sort();
    const currentSelected = filterArtist.value;
    filterArtist.innerHTML = '<option value="">All Artists</option>';
    sortedArtists.forEach((artist) => {
        const opt = document.createElement("option");
        opt.value = artist;
        opt.textContent = artist;
        if (currentSelected === artist) opt.selected = true;
        filterArtist.appendChild(opt);
    });
}

function applyFilters(itemsToFilter) {
    if (!itemsToFilter) return [];
    let filteredItems = [...itemsToFilter];

    const filterVinyl = document.querySelector("#filterVinyl");
    const filterCD = document.querySelector("#filterCD");
    const filterArtist = document.querySelector("#filterArtist");
    const sortBy = document.querySelector("#sortBy");
    const filterGenre = document.querySelector("#filterGenre");

    if (filterVinyl && filterCD && (filterVinyl.checked || filterCD.checked)) {
        filteredItems = filteredItems.filter((item) => {
            if (filterVinyl.checked && filterCD.checked)
                return item.types?.vinyl && item.types?.cd;
            return (
                (filterVinyl.checked && item.types?.vinyl) ||
                (filterCD.checked && item.types?.cd)
            );
        });
    }
    if (filterArtist && filterArtist.value) {
        filteredItems = filteredItems.filter(
            (item) =>
                Array.isArray(item.albumArtists) &&
                item.albumArtists.includes(filterArtist.value)
        );
    }
    if (filterGenre) {
        const selectedGenres = Array.from(filterGenre.selectedOptions)
            .map((opt) => opt.value)
            .filter((val) => val !== "");
        if (selectedGenres.length) {
            filteredItems = filteredItems.filter((item) => {
                if (selectedGenres.includes("none"))
                    return (
                        !item.genres ||
                        !Array.isArray(item.genres) ||
                        item.genres.length === 0
                    );
                if (!Array.isArray(item.genres) || item.genres.length === 0)
                    return false;
                return selectedGenres.some((selected) =>
                    item.genres
                        .map((g) => g.toLowerCase())
                        .includes(selected.toLowerCase())
                );
            });
        }
    }
    if (sortBy && sortBy.value !== "custom") {
        filteredItems.sort((a, b) => {
            const valA = (val) =>
                Array.isArray(val)
                    ? (val[0] || "").toLowerCase()
                    : (val || "").toLowerCase();
            switch (sortBy.value) {
                case "name":
                    return valA(a.albumName).localeCompare(valA(b.albumName));
                case "artist":
                    return valA(a.albumArtists).localeCompare(
                        valA(b.albumArtists)
                    );
                case "year":
                    return (a.releaseDate || "").localeCompare(
                        b.releaseDate || ""
                    );
                default:
                    return 0;
            }
        });
    }
    return filteredItems;
}

[
    document.querySelector("#filterVinyl"),
    document.querySelector("#filterCD"),
    document.querySelector("#filterArtist"),
    document.querySelector("#filterGenre"),
    document.querySelector("#sortBy"),
].forEach((filter) => {
    if (filter)
        filter.addEventListener("change", () => {
            searchItems(searchInput ? searchInput.value : "");
        });
});

const albumViewModal = document.querySelector("#albumViewModal");
if (albumViewModal) {
    const albumViewClose = albumViewModal.querySelector(".close");
    if (albumViewClose)
        albumViewClose.addEventListener("click", () =>
            albumViewModal.classList.remove("show")
        );
}

const statsModal = document.querySelector("#statsModal");
const statsButton = document.querySelector("#statsButton");

function updateStats() {
    if (!items || !document.querySelector("#totalItems")) return;
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
    const ownedItemsCount = items.filter((item) => !item.wanted).length;
    const progressPercentage =
        totalItems > 0 ? (ownedItemsCount / totalItems) * 100 : 0;

    document.querySelector(
        "#libraryProgress"
    ).style.width = `${progressPercentage}%`;
    document.querySelector("#progressValue").textContent = `${Math.round(
        progressPercentage
    )}%`;
    document.querySelector("#totalItems").textContent = totalItems;
    document.querySelector("#ownedCount").textContent = ownedItemsCount;
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
    const oldestYear = years.length ? Math.min(...years) : "-";
    const newestYear = years.length ? Math.max(...years) : "-";
    const yearsSpan =
        years.length && oldestYear !== "-" && newestYear !== "-"
            ? newestYear - oldestYear + 1
            : 0;

    const yearFrequency = years.reduce((acc, year) => {
        acc[year] = (acc[year] || 0) + 1;
        return acc;
    }, {});
    const mostCommonYear = Object.keys(yearFrequency).length
        ? Object.entries(yearFrequency).sort(([, a], [, b]) => b - a)[0][0]
        : "-";
    const artistFrequency = items.reduce((acc, item) => {
        if (Array.isArray(item.albumArtists))
            item.albumArtists.forEach((artist) => {
                acc[artist] = (acc[artist] || 0) + 1;
            });
        return acc;
    }, {});
    const mostCommonArtist = Object.keys(artistFrequency).length
        ? Object.entries(artistFrequency).sort(([, a], [, b]) => b - a)[0][0]
        : "-";

    document.querySelector("#totalYears").textContent = yearsSpan || "-";
    document.querySelector("#oldestYear").textContent = oldestYear;
    document.querySelector("#newestYear").textContent = newestYear;
    document.querySelector("#mostCommonYear").textContent = mostCommonYear;
    document.querySelector("#mostCommonArtist").textContent = mostCommonArtist;
}

function initializeTagInput(containerId, inputId, placeholder) {
    const formContainer = document.querySelector(`#${containerId}`);
    if (!formContainer) return null;

    const container = document.createElement("div");
    container.className = "tag-input-container";
    const row = document.createElement("div");
    row.className = "tag-input-row";
    const input = document.createElement("input");
    input.type = "text";
    input.className = "tag-input";
    input.placeholder = placeholder;
    const datalistId = `${inputId}-datalist`;
    input.setAttribute("list", datalistId);
    const datalist = document.createElement("datalist");
    datalist.id = datalistId;
    const addButton = document.createElement("button");
    addButton.className = "add-tag-button";
    addButton.type = "button";
    addButton.textContent = "+";
    const hiddenInput = document.querySelector(`#${inputId}`);
    const tags = new Set();

    function updateSuggestions() {
        const suggestions = new Set();
        (items || []).forEach((item) => {
            const sourceArray =
                inputId === "albumArtists" ? item.albumArtists : item.genres;
            if (Array.isArray(sourceArray))
                sourceArray.forEach((val) => {
                    if (val) suggestions.add(val);
                });
        });
        datalist.innerHTML = "";
        suggestions.forEach((value) => {
            const option = document.createElement("option");
            option.value = value;
            datalist.appendChild(option);
        });
    }
    function updateHiddenInput() {
        if (hiddenInput)
            hiddenInput.value = Array.from(tags).join(
                inputId === "albumArtists" ? " • " : ", "
            );
        updateFormPreview();
    }
    function addTag(value) {
        value = value.trim();
        if (!value) return;
        tags.add(value);
        updateHiddenInput();
        renderTags();
        input.value = "";
        input.focus();
    }
    function removeTag(value) {
        tags.delete(value);
        updateHiddenInput();
        renderTags();
    }
    function renderTags() {
        container.querySelectorAll(".tag").forEach((el) => el.remove());
        Array.from(tags).forEach((tag) => {
            const tagElement = document.createElement("div");
            tagElement.className = "tag";
            tagElement.textContent = tag;
            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.className = "tag-remove";
            removeButton.textContent = "×";
            removeButton.onclick = () => removeTag(tag);
            tagElement.appendChild(removeButton);
            container.insertBefore(tagElement, row);
        });
    }
    addButton.onclick = (e) => addTag(input.value);
    input.onkeydown = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addTag(input.value);
        } else if (
            e.key === "Backspace" &&
            input.value === "" &&
            tags.size > 0
        ) {
            const lastTag = Array.from(tags).pop();
            if (lastTag) removeTag(lastTag);
        }
    };
    if (hiddenInput && hiddenInput.value) {
        hiddenInput.value
            .split(inputId === "albumArtists" ? " • " : ",")
            .forEach((tag) => {
                if (tag.trim()) tags.add(tag.trim());
            });
    }
    row.appendChild(input);
    row.appendChild(addButton);
    row.appendChild(datalist);
    container.appendChild(row);

    if (hiddenInput) {
        hiddenInput.style.display = "none";
        formContainer.appendChild(container);
    } else {
        return null;
    }
    renderTags();
    return {
        container,
        updateSuggestions,
        addTag,
        clearTags: () => {
            tags.clear();
            updateHiddenInput();
            renderTags();
        },
        getTags: () => Array.from(tags),
    };
}

if (statsButton && statsModal) {
    statsButton.addEventListener("click", () => {
        updateStats();
        statsModal.classList.add("show");
    });
    const statsClose = statsModal.querySelector(".close");
    if (statsClose)
        statsClose.addEventListener("click", () =>
            statsModal.classList.remove("show")
        );
}

const reorderModal = document.querySelector("#reorderModal");
const reorderButton = document.querySelector("#reorderButton");
const reorderListContainer = document.querySelector("#reorderList");
const saveReorderButton = document.querySelector("#saveReorder");
const cancelReorderButton = document.querySelector("#cancelReorder");

function populateReorderModal() {
    if (!reorderListContainer || !items) return;
    reorderListContainer.innerHTML = "";
    items.forEach((item, index) => {
        const listItem = document.createElement("div");
        listItem.classList.add("reorder-item");
        listItem.dataset.id = item.id;
        listItem.innerHTML = `
            <img src="${
                item.imageUrl || "img/default.png"
            }" alt="Cover" class="reorder-item-img" onerror="this.src='img/default.png'">
            <div class="reorder-item-info">
                <span class="reorder-item-title">${
                    item.albumName || "Untitled"
                }</span>
                <span class="reorder-item-artist">${
                    Array.isArray(item.albumArtists)
                        ? item.albumArtists.join(" • ")
                        : item.albumArtists || "Unknown Artist"
                }</span>
            </div>
            <div class="reorder-item-controls">
                <button class="reorder-up" title="Move Up" ${
                    index === 0 ? "disabled" : ""
                }><img src="${getIconPath("up")}" alt="Up"></button>
                <button class="reorder-down" title="Move Down" ${
                    index === items.length - 1 ? "disabled" : ""
                }><img src="${getIconPath("down")}" alt="Down"></button>
            </div>
        `;
        reorderListContainer.appendChild(listItem);
    });
    updateReorderIcons();
}
function updateReorderIcons() {
    if (!reorderListContainer) return;
    const upIcon = getIconPath("up");
    const downIcon = getIconPath("down");
    reorderListContainer
        .querySelectorAll(".reorder-up img")
        .forEach((img) => (img.src = upIcon));
    reorderListContainer
        .querySelectorAll(".reorder-down img")
        .forEach((img) => (img.src = downIcon));
}
function updateReorderButtonStates() {
    if (!reorderListContainer) return;
    const itemsInList = reorderListContainer.querySelectorAll(".reorder-item");
    itemsInList.forEach((item, index) => {
        item.querySelector(".reorder-up").disabled = index === 0;
        item.querySelector(".reorder-down").disabled =
            index === itemsInList.length - 1;
    });
}

if (reorderButton && reorderModal) {
    reorderButton.addEventListener("click", () => {
        populateReorderModal();
        reorderModal.classList.add("show");
    });
}
if (reorderListContainer) {
    reorderListContainer.addEventListener("click", (e) => {
        const targetButton = e.target.closest("button");
        if (!targetButton) return;
        const item = targetButton.closest(".reorder-item");
        if (!item) return;
        if (targetButton.classList.contains("reorder-up")) {
            const previousItem = item.previousElementSibling;
            if (previousItem)
                reorderListContainer.insertBefore(item, previousItem);
        } else if (targetButton.classList.contains("reorder-down")) {
            const nextItem = item.nextElementSibling;
            if (nextItem) reorderListContainer.insertBefore(nextItem, item);
        }
        updateReorderButtonStates();
    });
}
if (saveReorderButton && reorderModal) {
    saveReorderButton.addEventListener("click", async () => {
        if (!reorderListContainer) return;
        const reorderedItemElements =
            reorderListContainer.querySelectorAll(".reorder-item");
        const newOrderIds = Array.from(reorderedItemElements).map((el) =>
            Number(el.dataset.id)
        );
        const newItemsOrder = newOrderIds
            .map((id) => items.find((item) => item.id === id))
            .filter((item) => item);
        if (newItemsOrder.length === items.length) {
            items.length = 0;
            items.push(...newItemsOrder);
            await saveItemsToFirebase();
            renderItems(applyFilters(items));
        }
        reorderModal.classList.remove("show");
    });
}
if (cancelReorderButton && reorderModal) {
    cancelReorderButton.addEventListener("click", () =>
        reorderModal.classList.remove("show")
    );
}
if (reorderModal) {
    const reorderClose = reorderModal.querySelector(".close");
    if (reorderClose)
        reorderClose.addEventListener("click", () =>
            reorderModal.classList.remove("show")
        );
}

document.addEventListener("DOMContentLoaded", () => {
    setupDateInputs();
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
    updateAllIcons();

    if (filtersButton && filtersPopup) {
        filtersButton.addEventListener("click", (e) => {
            e.stopPropagation();
            filtersPopup.classList.toggle("show");
            if (filtersPopup.classList.contains("show")) {
                updateArtistsList();
                updateGenresList();
            }
        });
        document.addEventListener("click", (e) => {
            if (
                !filtersPopup.contains(e.target) &&
                !filtersButton.contains(e.target)
            ) {
                filtersPopup.classList.remove("show");
            }
        });
    }
});

window.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal")) {
        event.target.classList.remove("show");
        if (event.target === deleteConfirmModal) itemToDelete = null;
    }
    if (event.target == previewModal) {
        if (previewModal) previewModal.style.display = "none";
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        document
            .querySelectorAll(".modal.show")
            .forEach((m) => m.classList.remove("show"));
        if (filtersPopup && filtersPopup.classList.contains("show"))
            filtersPopup.classList.remove("show");
        if (deleteConfirmModal && deleteConfirmModal.classList.contains("show"))
            itemToDelete = null;
    }
});
