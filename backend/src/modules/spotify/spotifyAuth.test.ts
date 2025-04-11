import axios from 'axios';
import { SpotifyAuthService } from './spotifyAuth.service';
import { SpotifyTokenResponse } from './spotify.types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('SpotifyAuthService', () => {
  let spotifyAuthService: SpotifyAuthService;
  
  // Mock environment variables
  const mockEnv = {
    SPOTIFY_CLIENT_ID: 'test_client_id',
    SPOTIFY_CLIENT_SECRET: 'test_client_secret',
    SPOTIFY_REDIRECT_URI: 'http://localhost:3000/callback',
  };
  
  beforeEach(() => {
    // Reset mocks
    jest.resetAllMocks();
    
    // Mock process.env
    process.env = { ...process.env, ...mockEnv };
    
    // Create service instance
    spotifyAuthService = new SpotifyAuthService();
  });
  
  describe('getAccessToken', () => {
    it('should get access token with valid authorization code', async () => {
      // Arrange
      const authCode = 'valid_auth_code';
      const mockResponse: SpotifyTokenResponse = {
        access_token: 'access_token_123',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh_token_123',
        scope: 'user-read-private user-read-email',
      };
      
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });
      
      // Act
      const result = await spotifyAuthService.getAccessToken(authCode);
      
      // Assert
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': expect.stringContaining('Basic'),
          }),
        })
      );
      
      expect(result).toEqual(mockResponse);
    });
    
    it('should throw error when authorization code is invalid', async () => {
      // Arrange
      const invalidCode = 'invalid_code';
      mockedAxios.post.mockRejectedValueOnce(new Error('Invalid authorization code'));
      
      // Act & Assert
      await expect(spotifyAuthService.getAccessToken(invalidCode))
        .rejects
        .toThrow('Invalid authorization code');
    });
    
    it('should throw error when environment variables are missing', async () => {
      // Arrange
      process.env.SPOTIFY_CLIENT_ID = '';
      const authCode = 'valid_code';
      
      // Act & Assert
      await expect(spotifyAuthService.getAccessToken(authCode))
        .rejects
        .toThrow('Missing required environment variables');
    });
  });
  
  describe('refreshAccessToken', () => {
    it('should refresh access token with valid refresh token', async () => {
      // Arrange
      const refreshToken = 'valid_refresh_token';
      const mockResponse: SpotifyTokenResponse = {
        access_token: 'new_access_token_123',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'new_refresh_token_123',
        scope: 'user-read-private user-read-email',
      };
      
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });
      
      // Act
      const result = await spotifyAuthService.refreshAccessToken(refreshToken);
      
      // Assert
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.stringContaining('grant_type=refresh_token'),
        expect.any(Object)
      );
      
      expect(result).toEqual(mockResponse);
    });
  });
}); 