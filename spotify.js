// https://developer.spotify.com/dashboard
const clientId = "64728b5e13784d218442b13368311be3";
const clientSecret = "a4aa6fb243564b0d94936418ad53fc72";

let accessToken = null;
let tokenExpiration = null;

async function getSpotifyToken() {
    console.log("🎵 Checking Spotify token...");
    if (accessToken && tokenExpiration > Date.now()) {
        console.log("✅ Using existing token");
        return accessToken;
    }

    console.log("🔄 Getting new Spotify token...");
    const response = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: "Basic " + btoa(clientId + ":" + clientSecret),
        },
        body: "grant_type=client_credentials",
    });

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiration = Date.now() + data.expires_in * 1000;
    console.log(
        "✨ New token acquired, expires in:",
        data.expires_in,
        "seconds"
    );
    return accessToken;
}

async function getAlbumImageFromSpotify(spotifyUrl) {
    try {
        console.log("🔍 Processing Spotify URL:", spotifyUrl);
        const albumId = spotifyUrl.match(/album[/:]([a-zA-Z0-9]+)/)?.[1];
        if (!albumId) {
            console.warn("⚠️ No album ID found in URL");
            return null;
        }
        console.log("📀 Album ID:", albumId);

        const token = await getSpotifyToken();

        console.log("📡 Fetching album data...");
        const albumResponse = await fetch(
            `https://api.spotify.com/v1/albums/${albumId}`,
            {
                headers: { Authorization: `Bearer ${token}` },
            }
        );
        if (!albumResponse.ok) {
            console.error(
                "❌ Failed to fetch album data:",
                albumResponse.statusText
            );
            return {
                imageUrl: null,
                genres: [],
                albumName: null,
                releaseDate: null,
                artists: [],
            };
        }
        const albumData = await albumResponse.json();

        let albumGenres = albumData.genres || [];
        const artistPromises = albumData.artists.map((artist) =>
            fetch(`https://api.spotify.com/v1/artists/${artist.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            }).then((res) => res.json())
        );

        console.log("👥 Fetching all artists' data...");
        const artistsData = await Promise.all(artistPromises);

        const allGenres = new Set(albumGenres);
        artistsData.forEach((artist) => {
            if (artist.genres) {
                artist.genres.forEach((genre) => allGenres.add(genre));
            }
        });

        const result = {
            imageUrl: albumData.images[0]?.url || null,
            genres: Array.from(allGenres),
            albumName: albumData.name || null,
            releaseDate: albumData.release_date || null,
            artists: albumData.artists?.map((artist) => artist.name) || [],
        };

        console.log("🎉 Final result:", result);
        return result;
    } catch (error) {
        console.error("❌ Spotify API error:", error);
        return {
            imageUrl: null,
            genres: [],
            albumName: null,
            releaseDate: null,
            artists: [],
        };
    }
}
