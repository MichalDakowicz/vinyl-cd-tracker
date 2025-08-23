// Test script for music tracker - no Firebase dependencies

let items = [];
let currentUser = null;
let userItemsRef = null;

// Test data
const testData = [
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
    },
    {
        id: 4,
        albumName: "Thriller",
        albumArtists: ["Michael Jackson"],
        releaseDate: "1982-11-30",
        genres: ["Pop", "Rock", "Funk"],
        types: { vinyl: false, cd: true },
        wanted: false,
        imageUrl: "img/default.png",
        albumLink: "https://open.spotify.com/album/2ANVost0y2y52ema1E9xAZ"
    },
    {
        id: 5,
        albumName: "OK Computer",
        albumArtists: ["Radiohead"],
        releaseDate: "1997-06-16",
        genres: ["Alternative Rock", "Electronic"],
        types: { vinyl: true, cd: true },
        wanted: true,
        imageUrl: "img/default.png"
    }
];

const loginContainer = document.querySelector("#loginContainer");
const appContent = document.querySelector("#appContent");
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
        "link",
        "reorder",
        "random",
        "clear",
        "logout",
    ];

    if (isDarkMode && darkModeIcons.includes(iconName)) {
        return darkModePath;
    }
    return defaultPath;
}

function updateAllIcons() {
    const iconsToUpdate = [
        { selector: "#statsButton img", icon: "stats" },
        { selector: "#addItemButton img", icon: "add" },
        { selector: "#exportButton img", icon: "export" },
        { selector: "#importButton img", icon: "import" },
        { selector: "#shareButton img", icon: "link" },
        { selector: "#reorderButton img", icon: "reorder" },
        { selector: "#filterButton img", icon: "filter" },
        { selector: "#randomButton img", icon: "random" },
        { selector: "#clearButton img", icon: "clear" },
    ];

    iconsToUpdate.forEach(({ selector, icon }) => {
        const element = document.querySelector(selector);
        if (element) {
            element.src = getIconPath(icon);
        }
    });

    if (viewModeButton && viewModeButton.querySelector("img")) {
        viewModeButton.querySelector("img").src = getIconPath(
            isGridView ? "list" : "grid"
        );
    }

    document.querySelectorAll(".editButton img").forEach((img) => {
        img.src = getIconPath("edit");
    });
    document.querySelectorAll(".removeButton img").forEach((img) => {
        img.src = getIconPath("delete");
    });
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
let isEditing = false;
let currentEditingId = null;

if (addItemButton) {
    addItemButton.addEventListener("click", () => {
        if (modal) modal.classList.add("show");
        if (addItemForm) addItemForm.reset();
        document.querySelector("#albumName").focus();
        isEditing = false;
        currentEditingId = null;
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

function showAppContent() {
    let container = document.querySelector(".container");
    if (container) {
        container.style.display = "block";
    }
    if (loginContainer) loginContainer.style.display = "none";
    if (appContent) appContent.style.display = "block";
}

function renderUI() {
    updateAllIcons();
    renderItems(applyFilters(items));
}

function formatDate(dateString) {
    if (!dateString) return "Unknown";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function renderItems(itemsToRender) {
    if (!resultsContainer) return;

    resultsContainer.innerHTML = "";

    itemsToRender.forEach((item, index) => {
        const newItemElement = document.createElement("div");
        newItemElement.classList.add("card");
        if (item.wanted) newItemElement.classList.add("wanted");

        const typesBadges = Object.entries(item.types || {})
            .filter(([_, hasType]) => hasType)
            .map(([type]) => `<span class="type-badge ${type}">${type.toUpperCase()}</span>`)
            .join("");

        const genresList = (item.genres || [])
            .map(genre => `<span class="genre">${genre}</span>`)
            .join("");

        const linkButtonHTML = item.albumLink
            ? `<button class="linkButton" onclick="window.open('${item.albumLink}', '_blank')" title="Open Album Link">
                <img src="${getIconPath("link")}" alt="Link">
               </button>`
            : "";

        newItemElement.innerHTML = `
            <div class="card-image">
                <img src="${item.imageUrl || "img/default.png"}" alt="${item.albumName}" />
            </div>
            <div class="card-content">
                <h3>${item.albumName}</h3>
                <p><strong>Artist:</strong> ${item.albumArtists ? item.albumArtists.join(", ") : "Unknown Artist"}</p>
                <p><strong>Release Date:</strong> ${formatDate(item.releaseDate)}</p>
                ${genresList}
                <div class="type-badges">${typesBadges}</div>
            </div>
            <div class="actions">
                ${linkButtonHTML}
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
        resultsContainer.appendChild(newItemElement);
    }); 

    if (isGridView) {
        const addButtonCard = document.createElement("div");
        addButtonCard.classList.add("card", "add-button-card");
        addButtonCard.innerHTML = `
            <div class="add-button-content">
                <img src="${getIconPath("add")}" alt="Add Item" />
                <span>Add New Album</span>
            </div>
        `;
        addButtonCard.addEventListener("click", () => {
            if (modal) modal.classList.add("show");
            if (addItemForm) addItemForm.reset();
            document.querySelector("#albumName").focus();
            isEditing = false;
            currentEditingId = null;
        });
        resultsContainer.appendChild(addButtonCard);
    }

    attachEventListeners();
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

const searchInput = document.querySelector("#search");
const clearButton = document.querySelector("#clearButton");

function searchItems(query) {
    const filteredItems = items.filter((item) => {
        const searchTerm = query.toLowerCase();
        return (
            item.albumName.toLowerCase().includes(searchTerm) ||
            (item.albumArtists && item.albumArtists.some(artist => 
                artist.toLowerCase().includes(searchTerm)
            )) ||
            (item.genres && item.genres.some(genre => 
                genre.toLowerCase().includes(searchTerm)
            ))
        );
    });
    renderItems(filteredItems);
}

function applyFilters(itemList) {
    let filteredItems = [...itemList];

    const filterWanted = document.querySelector("#filterWanted");
    const filterVinyl = document.querySelector("#filterVinyl");
    const filterCD = document.querySelector("#filterCD");
    const sortBy = document.querySelector("#sortBy");

    if (filterWanted && filterWanted.checked) {
        filteredItems = filteredItems.filter(item => item.wanted);
    }

    if (filterVinyl && filterVinyl.checked) {
        filteredItems = filteredItems.filter(item => item.types && item.types.vinyl);
    }

    if (filterCD && filterCD.checked) {
        filteredItems = filteredItems.filter(item => item.types && item.types.cd);
    }

    if (sortBy) {
        const sortValue = sortBy.value;
        switch (sortValue) {
            case "name":
                filteredItems.sort((a, b) => a.albumName.localeCompare(b.albumName));
                break;
            case "artist":
                filteredItems.sort((a, b) => {
                    const artistA = (a.albumArtists && a.albumArtists[0]) || "";
                    const artistB = (b.albumArtists && b.albumArtists[0]) || "";
                    return artistA.localeCompare(artistB);
                });
                break;
            case "year":
                filteredItems.sort((a, b) => {
                    const yearA = a.releaseDate ? new Date(a.releaseDate).getFullYear() : 0;
                    const yearB = b.releaseDate ? new Date(b.releaseDate).getFullYear() : 0;
                    return yearB - yearA;
                });
                break;
        }
    }

    return filteredItems;
}

function attachEventListeners() {
    document.querySelectorAll(".removeButton").forEach((button) => {
        button.addEventListener("click", (e) => {
            const itemId = parseInt(e.target.closest("button").dataset.id);
            removeItem(itemId);
        });
    });

    document.querySelectorAll(".editButton").forEach((button) => {
        button.addEventListener("click", (e) => {
            const itemId = parseInt(e.target.closest("button").dataset.id);
            editItem(itemId);
        });
    });
}

function removeItem(id) {
    if (confirm("Are you sure you want to remove this item?")) {
        items = items.filter((item) => item.id !== id);
        renderUI();
        notifyUser("Item removed successfully!", "success");
    }
}

function editItem(id) {
    const item = items.find((item) => item.id === id);
    if (!item) return;

    if (modal) modal.classList.add("show");
    
    document.querySelector("#albumName").value = item.albumName || "";
    document.querySelector("#albumArtists").value = item.albumArtists ? item.albumArtists.join(", ") : "";
    document.querySelector("#releaseDate").value = item.releaseDate || "";
    document.querySelector("#genres").value = item.genres ? item.genres.join(", ") : "";
    document.querySelector("#imageUrl").value = item.imageUrl || "";
    document.querySelector("#albumLink").value = item.albumLink || "";
    document.querySelector("#vinylCheck").checked = item.types ? item.types.vinyl : false;
    document.querySelector("#cdCheck").checked = item.types ? item.types.cd : false;
    document.querySelector("#wantedToggle").checked = item.wanted || false;

    isEditing = true;
    currentEditingId = id;
}

if (addItemForm) {
    addItemForm.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const albumName = document.querySelector("#albumName").value.trim();
        const artists = document.querySelector("#albumArtists").value
            .split(/[,\n]/)
            .map(artist => artist.trim())
            .filter(artist => artist);
        const genres = document.querySelector("#genres").value
            .split(/[,\n]/)
            .map(genre => genre.trim())
            .filter(genre => genre);
        const releaseDate = document.querySelector("#releaseDate").value;
        const imageUrl = document.querySelector("#imageUrl").value.trim();
        const albumLink = document.querySelector("#albumLink").value.trim();
        const wanted = document.querySelector("#wantedToggle").checked;
        const types = {
            vinyl: document.querySelector("#vinylCheck").checked,
            cd: document.querySelector("#cdCheck").checked,
        };

        const itemData = {
            imageUrl: imageUrl || "img/default.png",
            albumName,
            albumArtists: artists,
            genres: genres,
            releaseDate,
            wanted,
            types,
            albumLink: albumLink || null,
        };

        if (isEditing && currentEditingId) {
            // Update existing item
            const itemIndex = items.findIndex(item => item.id === currentEditingId);
            if (itemIndex !== -1) {
                items[itemIndex] = { ...items[itemIndex], ...itemData };
                notifyUser("Item updated successfully!", "success");
            }
        } else {
            // Add new item
            itemData.id = Date.now() + Math.random();
            items.push(itemData);
            notifyUser("Item added successfully!", "success");
        }

        if (modal) modal.classList.remove("show");
        renderUI();
        isEditing = false;
        currentEditingId = null;
    });
}

// Event listeners for UI controls
if (viewModeButton) {
    viewModeButton.addEventListener("click", toggleViewMode);
}

if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        searchItems(e.target.value);
    });
}

if (clearButton) {
    clearButton.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        renderItems(applyFilters(items));
    });
}

// Filter event listeners
const filterButton = document.querySelector("#filterButton");
const filterOptions = document.querySelector("#filterOptions");

if (filterButton) {
    filterButton.addEventListener("click", () => {
        filterOptions.style.display = filterOptions.style.display === "none" ? "block" : "none";
    });
}

["#filterWanted", "#filterVinyl", "#filterCD", "#sortBy"].forEach(selector => {
    const element = document.querySelector(selector);
    if (element) {
        element.addEventListener("change", () => {
            renderItems(applyFilters(items));
        });
    }
});

// Initialize the app
console.log('Test mode initialized');
items = testData;
showAppContent();
updateViewMode();
renderUI();

// Share button functionality for test mode (setup after DOM is ready)
const shareButton = document.querySelector("#shareButton");

if (shareButton) {
    shareButton.addEventListener("click", async () => {
        if (items.length === 0) {
            notifyUser("Your collection is empty. Add some items first!", "error");
            return;
        }

        try {
            shareButton.disabled = true;
            const shareButtonIcon = shareButton.querySelector("img");
            if (shareButtonIcon) shareButtonIcon.src = getIconPath("loading");

            // Generate a unique share ID for test mode
            const shareId = 'test-' + Date.now().toString(36) + Math.random().toString(36).substr(2);
            
            // Create shareable collection data for test mode
            const shareData = {
                items: items,
                metadata: {
                    sharedBy: "Test User",
                    sharedAt: new Date().toISOString(),
                    totalItems: items.length
                }
            };

            // In test mode, we simulate the share by creating a URL that would work
            // if the collection was actually saved to Firebase
            const shareUrl = `${window.location.origin}${window.location.pathname.replace('test.html', 'index.html')}?share=${shareId}`;

            // Store temporarily in localStorage for demo purposes (this would normally be Firebase)
            try {
                localStorage.setItem(`test-share-${shareId}`, JSON.stringify(shareData));
            } catch (e) {
                console.warn("Could not save to localStorage:", e);
            }

            // Copy to clipboard and show notification
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(shareUrl);
                notifyUser("Share URL copied to clipboard! (Test mode - sharing simulated)", "success");
            } else {
                // Fallback for browsers that don't support clipboard API
                notifyUser(`Share URL: ${shareUrl} (Test mode - copy this link manually)`, "success");
            }
            
        } catch (error) {
            console.error("Error sharing collection in test mode:", error);
            
            let errorMessage = "Failed to share collection in test mode. ";
            
            if (error.name === 'NotAllowedError') {
                errorMessage += "Clipboard access denied. The share URL was generated but could not be copied automatically.";
            } else {
                errorMessage += "Please try again.";
            }
            
            notifyUser(errorMessage, "error");
        } finally {
            shareButton.disabled = false;
            const shareButtonIcon = shareButton.querySelector("img");
            if (shareButtonIcon) shareButtonIcon.src = getIconPath("link");
        }
    });
}

// Update test item count
const testItemCount = document.querySelector("#test-item-count");
if (testItemCount) {
    testItemCount.textContent = `${items.length} test items`;
}

// Notification for test mode
notifyUser("Test mode loaded with sample data. No login required!", "success");