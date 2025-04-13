import { jest } from '@jest/globals';
import { getSpotifyAccessToken, refreshSpotifyToken } from './spotifyAuth.js';

// Set up fetch mock
global.fetch = jest.fn();

// Helper to reset mocks before each test
beforeEach(() => {
    global.fetch.mockClear();
});

describe('spotifyAuth', () => {
    const clientId = 'test-client-id';
    const clientSecret = 'test-client-secret';
    const code = 'test-code';
    const redirectUri = 'test-redirect-uri';
    const refreshToken = 'test-refresh-token';

    describe('getSpotifyAccessToken', () => {
        it('should exchange code for tokens successfully', async () => {
            const mockTokenResponse = {
                access_token: 'mock-access-token',
                refresh_token: 'mock-refresh-token',
                expires_in: 3600,
            };
            
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockTokenResponse,
            });

            const tokens = await getSpotifyAccessToken(clientId, clientSecret, code, redirectUri);

            expect(global.fetch).toHaveBeenCalledTimes(1);
            
            const expectedUrl = 'https://accounts.spotify.com/api/token';
            const expectedHeaders = {
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            };
            
            // Check the fetch call
            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining(expectedHeaders),
                    body: expect.any(URLSearchParams)
                })
            );

            const callArgs = global.fetch.mock.calls[0][1];
            const bodyParams = new URLSearchParams(callArgs.body);
            
            expect(bodyParams.get('grant_type')).toBe('authorization_code');
            expect(bodyParams.get('code')).toBe(code);
            expect(bodyParams.get('redirect_uri')).toBe(redirectUri);

            expect(tokens).toEqual(mockTokenResponse);
        });

        it('should handle errors during token exchange', async () => {
            const errorText = 'Invalid code';
            
            global.fetch.mockResolvedValue({
                ok: false,
                status: 400,
                text: async () => errorText,
            });


            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await expect(getSpotifyAccessToken(clientId, clientSecret, code, redirectUri))
                .rejects.toThrow(`Token exchange error: 400 - ${errorText}`);

            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe('refreshSpotifyToken', () => {
        it('should refresh token successfully and return original refresh token if not provided', async () => {
            const mockRefreshData = {
                access_token: 'new-mock-access-token',
                expires_in: 3600,

            };
            
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockRefreshData,
            });

            const tokens = await refreshSpotifyToken(clientId, clientSecret, refreshToken);

            expect(global.fetch).toHaveBeenCalledTimes(1);
            
            const expectedUrl = 'https://accounts.spotify.com/api/token';
            const expectedHeaders = {
                'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            };


            expect(global.fetch).toHaveBeenCalledWith(
                expectedUrl,
                {
                    method: 'POST',
                    headers: expectedHeaders,
                    body: 'grant_type=refresh_token&refresh_token=test-refresh-token'
                }
            );

            expect(tokens).toEqual({
                access_token: mockRefreshData.access_token, 
                expires_in: mockRefreshData.expires_in,
                refresh_token: refreshToken,
            });
        });

        it('should refresh token successfully and return new refresh token if provided', async () => {
            const mockRefreshData = {
                access_token: 'new-mock-access-token-2',
                expires_in: 3600,
                refresh_token: 'new-mock-refresh-token'
            };
            
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => mockRefreshData,
            });

            const tokens = await refreshSpotifyToken(clientId, clientSecret, refreshToken);

            expect(global.fetch).toHaveBeenCalledTimes(1);

            expect(tokens).toEqual({
                access_token: mockRefreshData.access_token,
                expires_in: mockRefreshData.expires_in,
                refresh_token: mockRefreshData.refresh_token,
            });
        });

        it('should handle Spotify API errors during refresh', async () => {
            const errorText = 'Invalid refresh token';
            
            global.fetch.mockResolvedValue({
                ok: false,
                status: 400,
                text: async () => errorText,
            });

            // Mock console.error
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await expect(refreshSpotifyToken(clientId, clientSecret, refreshToken))
                .rejects.toThrow(`Refresh token error: 400 - ${errorText}`);

            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should handle network errors during refresh', async () => {
            const networkError = new Error('Network failed');
            global.fetch.mockRejectedValue(networkError);

            // Mock console.error
            const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

            await expect(refreshSpotifyToken(clientId, clientSecret, refreshToken))
                .rejects.toThrow(networkError);

            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });
});