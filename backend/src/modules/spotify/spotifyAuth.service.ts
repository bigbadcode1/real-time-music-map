import axios from 'axios';
import querystring from 'querystring';
import { SpotifyTokenResponse } from './spotify.types';

export class SpotifyAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private tokenEndpoint = 'https://accounts.spotify.com/api/token';

  constructor() {
    this.clientId = process.env.SPOTIFY_CLIENT_ID || '';
    this.clientSecret = process.env.SPOTIFY_CLIENT_SECRET || '';
    this.redirectUri = process.env.SPOTIFY_REDIRECT_URI || '';
  }

  async getAccessToken(code: string): Promise<SpotifyTokenResponse> {
    // This will be implemented in the next phase
    throw new Error('Not implemented');
  }

  async refreshAccessToken(refreshToken: string): Promise<SpotifyTokenResponse> {
    // This will be implemented in the next phase
    throw new Error('Not implemented');
  }
} 