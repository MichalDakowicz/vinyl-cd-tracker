export async function getAlbumDataFromAppleMusic(appleLink) {
    try {
        console.log("🍎 Processing Apple Music URL:", appleLink);
        const term = encodeURIComponent(appleLink);
        const response = await fetch(
            `https://itunes.apple.com/search?term=${term}&entity=album&limit=1`
        );
        const data = await response.json();
        if (data.resultCount > 0) {
            const album = data.results[0];
            return {
                imageUrl: album.artworkUrl100.replace("100x100", "600x600"),
                genres: album.primaryGenreName ? [album.primaryGenreName] : [],
                albumName: album.collectionName || null,
                releaseDate: album.releaseDate || null,
                artists: album.artistName ? [album.artistName] : [],
            };
        }
        console.warn("⚠️ No album data found on Apple Music");
        return {
            imageUrl: null,
            genres: [],
            albumName: null,
            releaseDate: null,
            artists: [],
        };
    } catch (error) {
        console.error("❌ Apple Music API error:", error);
        if (window.notifyUser) {
            window.notifyUser(
                "Apple Music API error. Please try again.",
                "error"
            );
        }
        return {
            imageUrl: null,
            genres: [],
            albumName: null,
            releaseDate: null,
            artists: [],
        };
    }
}
