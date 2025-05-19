export async function getCurrentlyPlayingTrack(accessToken) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // If no track is playing, return a default response
        if (response.status === 204) {
            return {
                isPlaying: false,
                track: null
            };
        }

        // Handle other error status codes
        if (!response.ok) {
            const errorData = await response.text();
            console.error('Spotify API Error:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });

            // Handle specific error cases
            if (response.status === 401) {
                throw new Error('Access token expired or invalid');
            } else if (response.status === 403) {
                throw new Error('Insufficient permissions to access player data');
            } else if (response.status === 429) {
                throw new Error('Rate limit exceeded');
            } else {
                throw new Error(`Player API error: ${response.status} - ${errorData}`);
            }
        }

        const data = await response.json();

        // Validate the response data
        if (!data.item) {
            return {
                isPlaying: false,
                track: null
            };
        }

        return {
            isPlaying: data.is_playing,
            track: {
                name: data.item.name,
                artist: data.item.artists.map(artist => artist.name).join(', '),
                album_name: data.item.album.name,
                image: data.item.album.images[0]?.url,
                duration: data.item.duration_ms,
                progress: data.progress_ms,
                uri: data.item.uri,
                id: data.item.id
            }
        };
    } catch (error) {
        console.error('Error getting currently playing track:', error);
        throw new Error('Failed to fetch current track: ' + error.message);
    }
}