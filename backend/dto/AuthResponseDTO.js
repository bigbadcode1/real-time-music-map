/**
 * AuthResponseDTO - Data Transfer Object for the token exchange response.
 * Ensures only the necessary fields are returned to the client,
 * never exposing internal server state or raw database entities.
 */
export class AuthResponseDTO {
  constructor({ access_token, refresh_token, expires_in, app_session_token, user_id }) {
    this.access_token = access_token;
    this.refresh_token = refresh_token;
    this.expires_in = expires_in;
    this.app_session_token = app_session_token;
    this.user_id = user_id;
  }

  static from(data) {
    return new AuthResponseDTO(data);
  }
}

/**
 * TokenRefreshDTO - Data Transfer Object for token refresh responses.
 */
export class TokenRefreshDTO {
  constructor({ access_token, refresh_token, expires_in }) {
    this.access_token = access_token;
    this.refresh_token = refresh_token ?? null;
    this.expires_in = expires_in;
  }

  static from(data) {
    return new TokenRefreshDTO(data);
  }
}
