"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpotifyAuthService = void 0;
class SpotifyAuthService {
    constructor() {
        this.tokenEndpoint = 'https://accounts.spotify.com/api/token';
        this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
        this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
        this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || '';
    }
    async getAccessToken(code) {
        // This will be implemented in the next phase
        throw new Error('Not implemented');
    }
    async refreshAccessToken(refreshToken) {
        // This will be implemented in the next phase
        throw new Error('Not implemented');
    }
}
exports.SpotifyAuthService = SpotifyAuthService;
