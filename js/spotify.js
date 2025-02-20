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
        console.log("📝 Album data:", {
            name: albumData.name,
            artists: albumData.artists?.map((a) => a.name),
            genres: albumData.genres,
            release_date: albumData.release_date,
            totalImages: albumData.images?.length,
        });

        let albumGenres = albumData.genres || [];
        if (
            albumGenres.length === 0 &&
            albumData.artists &&
            albumData.artists[0]
        ) {
            const artistId = albumData.artists[0].id;
            console.log(
                "👤 Album has no genres; fetching artist data for ID:",
                artistId
            );
            const artistResponse = await fetch(
                `https://api.spotify.com/v1/artists/${artistId}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            if (artistResponse.ok) {
                const artistData = await artistResponse.json();
                console.log("🎨 Artist genres:", artistData.genres);
                albumGenres = artistData.genres || [];
            } else {
                console.warn(
                    "⚠️ Failed to fetch artist data:",
                    artistResponse.statusText
                );
            }
        }

        const albumName = albumData.name || null;
        const releaseDate = albumData.release_date || null;
        const artists = albumData.artists?.map((artist) => artist.name) || [];

        const result = {
            imageUrl: albumData.images[0]?.url || null,
            genres: albumGenres,
            albumName: albumName,
            releaseDate: releaseDate,
            artists: artists,
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
