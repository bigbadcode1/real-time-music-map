import axios from 'axios';

export async function getCurrentlyPlayingTrack(accessToken) {
    try {
        const response = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        // If no track is playing, the status code will be 204
        if (response.status === 204) {
            return { isPlaying: false };
        }

        return {
            isPlaying: response.data.is_playing,
            track: {
                name: response.data.item.name,
                artist: response.data.item.artists.map(artist => artist.name).join(', '),
                album: response.data.item.album.name,
                albumArt: response.data.item.album.images[0]?.url,
                duration: response.data.item.duration_ms,
                progress: response.data.progress_ms,
                uri: response.data.item.uri
            }
        };
    } catch (error) {
        console.error('Error getting currently playing track:', error.response?.data || error.message);
        throw error;
    }
}