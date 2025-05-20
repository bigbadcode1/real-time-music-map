import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    exchangeCodeForTokens,
    refreshAccessToken,
    getValidAccessToken,
    isTokenExpired
} from './spotifyAuthService'; // Adjust path if needed

// Mock AsyncStorage and fetch
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(), // Include clear if you might use it elsewhere
}));

// Mock fetch globally
global.fetch = jest.fn();

// Helper function to mock fetch responses
const mockFetchResponse = (body: any, ok: boolean = true, status: number = 200) => {
    (fetch as jest.Mock).mockResolvedValueOnce({
        ok,
        status,
        json: async () => body,
        text: async () => JSON.stringify(body), // Add text method for error cases
    });
};

const mockFetchNetworkError = (error = new Error('Network Error')) => {
    (fetch as jest.Mock).mockRejectedValueOnce(error);
};

describe('spotifyAuthService', () => {
    const mockCode = 'test-auth-code';
    const mockRedirectUri = 'exp://test-uri';
    const mockRefreshToken = 'test-refresh-token';
    const mockAccessToken = 'test-access-token';
    const backendExchangeUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL}/exchange-token`;
    const backendRefreshUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL}/refresh-token`;

    beforeEach(() => {
        // Clear mocks before each test
        (AsyncStorage.getItem as jest.Mock).mockClear();
        (AsyncStorage.setItem as jest.Mock).mockClear();
        (fetch as jest.Mock).mockClear();
        // Reset fetch mock implementation if needed, or rely on mockFetchResponse/Error per test
    });

    describe('isTokenExpired', () => {
        it('should return true if expiration time is in the past', () => {
            expect(isTokenExpired(Date.now() - 1000)).toBe(true);
        });

        it('should return true if expiration time is within the 5-minute buffer', () => {
            expect(isTokenExpired(Date.now() + 4 * 60 * 1000)).toBe(true);
        });

        it('should return false if expiration time is beyond the 5-minute buffer', () => {
            expect(isTokenExpired(Date.now() + 6 * 60 * 1000)).toBe(false);
        });
    });

    describe('exchangeCodeForTokens', () => {
        it('should call backend, store tokens with expiry, and return success', async () => {
            const mockResponseTokens = {
                access_token: mockAccessToken,
                refresh_token: mockRefreshToken,
                expires_in: 3600,
            };
            mockFetchResponse(mockResponseTokens);

            const result = await exchangeCodeForTokens(mockCode, mockRedirectUri);

            expect(fetch).toHaveBeenCalledTimes(1);
            expect(fetch).toHaveBeenCalledWith(backendExchangeUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: mockCode, redirectUri: mockRedirectUri }),
            });

            expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
            // Check that the stored data includes the calculated expires_at
            const storedDataString = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
            const storedData = JSON.parse(storedDataString);
            expect(storedData.access_token).toBe(mockAccessToken);
            expect(storedData.refresh_token).toBe(mockRefreshToken);
            expect(storedData.expires_at).toBeCloseTo(Date.now() + 3600 * 1000, -3); // Check expiry time (within ~1 sec)

            expect(result).toEqual({ success: true, tokens: mockResponseTokens });
        });

        it('should return error on backend fetch failure', async () => {
            mockFetchResponse({ error: 'Invalid code' }, false, 400);

            const result = await exchangeCodeForTokens(mockCode, mockRedirectUri);

            expect(fetch).toHaveBeenCalledTimes(1);
            expect(AsyncStorage.setItem).not.toHaveBeenCalled();
            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to exchange code: 400');
        });

        it('should return error on network error', async () => {
            mockFetchNetworkError();

            const result = await exchangeCodeForTokens(mockCode, mockRedirectUri);

            expect(fetch).toHaveBeenCalledTimes(1);
            expect(AsyncStorage.setItem).not.toHaveBeenCalled();
            expect(result.success).toBe(false);
            expect(result.error).toContain('Network Error');
        });
    });

    describe('refreshAccessToken', () => {
        it('should retrieve refresh token, call backend, store new tokens, and return success', async () => {
            const storedTokens = {
                refresh_token: mockRefreshToken,
                expires_at: Date.now() - 1000 // Expired
            };
            const mockNewTokens = {
                access_token: 'new-access-token',
                expires_in: 3600,
                 // Assuming backend might return the same or a new refresh token
                refresh_token: 'new-refresh-token'
            };
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedTokens));
            mockFetchResponse(mockNewTokens);

            const result = await refreshAccessToken();

            expect(AsyncStorage.getItem).toHaveBeenCalledWith('spotifyTokens');
            expect(fetch).toHaveBeenCalledTimes(1);
            expect(fetch).toHaveBeenCalledWith(backendRefreshUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: mockRefreshToken }),
            });

            expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
            const storedDataString = (AsyncStorage.setItem as jest.Mock).mock.calls[0][1];
            const storedData = JSON.parse(storedDataString);
            expect(storedData.access_token).toBe(mockNewTokens.access_token);
            expect(storedData.refresh_token).toBe(mockNewTokens.refresh_token);
            expect(storedData.expires_at).toBeCloseTo(Date.now() + 3600 * 1000, -3);

            expect(result.success).toBe(true);
            expect(result.tokens).toEqual(storedData); // Check the structure including expires_at
        });

         it('should return success with existing tokens if not expired', async () => {
            const validExpiry = Date.now() + 10 * 60 * 1000; // 10 mins from now
            const storedTokens = {
                access_token: mockAccessToken,
                refresh_token: mockRefreshToken,
                expires_at: validExpiry
            };
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedTokens));

            const result = await refreshAccessToken();

            expect(AsyncStorage.getItem).toHaveBeenCalledWith('spotifyTokens');
            expect(fetch).not.toHaveBeenCalled();
            expect(AsyncStorage.setItem).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.tokens).toEqual(storedTokens);
        });

        it('should return error if no stored tokens found', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

            const result = await refreshAccessToken();

            expect(AsyncStorage.getItem).toHaveBeenCalledWith('spotifyTokens');
            expect(fetch).not.toHaveBeenCalled();
            expect(result.success).toBe(false);
            expect(result.error).toBe('No stored tokens found');
        });

        it('should return error on backend refresh failure', async () => {
             const storedTokens = { refresh_token: mockRefreshToken, expires_at: Date.now() - 1000 };
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedTokens));
            mockFetchResponse({ error: 'Invalid refresh token' }, false, 400);

            const result = await refreshAccessToken();

            expect(fetch).toHaveBeenCalledTimes(1);
            expect(AsyncStorage.setItem).not.toHaveBeenCalled();
            expect(result.success).toBe(false);
            expect(result.error).toContain('Failed to refresh token: 400');
        });
    });

    describe('getValidAccessToken', () => {
        it('should return access token directly if stored and valid', async () => {
            const validExpiry = Date.now() + 10 * 60 * 1000;
            const storedTokens = {
                access_token: mockAccessToken,
                refresh_token: mockRefreshToken,
                expires_at: validExpiry
            };
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedTokens));

            const token = await getValidAccessToken();

            expect(AsyncStorage.getItem).toHaveBeenCalledWith('spotifyTokens');
            expect(fetch).not.toHaveBeenCalled(); // No refresh needed
            expect(token).toBe(mockAccessToken);
        });

        it('should attempt refresh and return new token if stored token is expired', async () => {
            const expiredExpiry = Date.now() - 1000;
            const storedTokens = {
                access_token: 'old-token',
                refresh_token: mockRefreshToken,
                expires_at: expiredExpiry
            };
            const mockNewTokens = {
                access_token: 'new-access-token',
                expires_in: 3600,
                refresh_token: 'new-refresh-token'
            };
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedTokens));
            // Mock the fetch call that refreshAccessToken will make
            mockFetchResponse(mockNewTokens);

            const token = await getValidAccessToken();

            expect(AsyncStorage.getItem).toHaveBeenCalledWith('spotifyTokens');
            expect(fetch).toHaveBeenCalledTimes(1); // Refresh should be called
            expect(fetch).toHaveBeenCalledWith(backendRefreshUrl, expect.anything());
            expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1); // refreshAccessToken stores new tokens
            expect(token).toBe(mockNewTokens.access_token);
        });

         it('should return null if stored token is expired and refresh fails', async () => {
            const expiredExpiry = Date.now() - 1000;
            const storedTokens = {
                access_token: 'old-token',
                refresh_token: mockRefreshToken,
                expires_at: expiredExpiry
            };
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(storedTokens));
            // Mock the fetch call for refresh failure
            mockFetchResponse({ error: 'Invalid refresh token' }, false, 400);

            const token = await getValidAccessToken();

            expect(AsyncStorage.getItem).toHaveBeenCalledWith('spotifyTokens');
            expect(fetch).toHaveBeenCalledTimes(1); // Refresh was attempted
            expect(token).toBeNull();
        });

        it('should return null if no tokens are stored', async () => {
            (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

            const token = await getValidAccessToken();

            expect(AsyncStorage.getItem).toHaveBeenCalledWith('spotifyTokens');
            expect(fetch).not.toHaveBeenCalled();
            expect(token).toBeNull();
        });

         it('should return null if error occurs during storage access', async () => {
            (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('AsyncStorage failed'));

            const token = await getValidAccessToken();

            expect(token).toBeNull();
        });
    });
}); 