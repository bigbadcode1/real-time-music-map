export async function getCurrentlyPlayingTrack(accessToken) {
    try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        // If no track is playing, the status code will be 204
        if (response.status === 204) {
            return { isPlaying: false };
        }
        
        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Player API error: ${response.status} - ${errorData}`);
        }
        
        const data = await response.json();
        
        return {
            isPlaying: data.is_playing,
            track: {
                name: data.item.name,
                artist: data.item.artists.map(artist => artist.name).join(', '),
                album: data.item.album.name,
                albumArt: data.item.album.images[0]?.url,
                duration: data.item.duration_ms,
                progress: data.progress_ms,
                uri: data.item.uri
            }
        };
    } catch (error) {
        console.error('Error getting currently playing track:', error);
        throw error;
    }
}