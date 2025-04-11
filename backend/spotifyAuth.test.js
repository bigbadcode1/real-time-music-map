const axios = require('axios');
const { getAccessToken } = require('./spotifyAuth');

jest.mock('axios');

describe('Spotify Auth', () => {
    const mockCode = 'valid_code';

    it('should get access token with valid code', async () => {
        const mockResponse = {
            data:{
                access_token: 'access123',
                token_type: 'Bearer',
                expires_in: 3600,
                refresh_token: 'refresh123',
            },
        };



        axios.post = jest.fn().mockImplementation(() => Promise.resolve(mockResponse));

        const result = await getAccessToken('valid code');

        expect(axios.post).toHaveBeenCalled();

        expect(result.access_token).toEqual('access123');
    });

    it('should throw error on invalid code', async () => {
        axios.post = jest.fn().mockImplementation(() => Promise.reject(new Error('Failed')));

        await expect(getAccessToken('invalid_code')).rejects.toThrow('Failed');
    });
});
