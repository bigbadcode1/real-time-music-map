export async function getUserInfo(accessToken) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Check if the request was successful (status 200-299)
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("[spotifyUserInfo.js] data: ", data);

        // Safely extract user data (handle possible missing fields)
        const user = {
            id: data.id,
            name: data.display_name || 'No display name',
            image_url: data.images?.[0]?.url || null,
        };

        return user;
    } catch (error) {
        console.error("[spotifyUserInfo.js] Error fetching user info:", error);
        throw error; // Re-throw the error to let the caller handle it
    }
}