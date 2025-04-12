# Spotify Authentication Flow Documentation

This document outlines the authentication flow used to connect the application with Spotify, allowing users to log in using their Spotify account and grant the app necessary permissions.

## Table of Contents

- [Overview](#overview)
- [Key Concepts](#key-concepts)
- [Backend Implementation](#backend-implementation)
  - [Environment Variables](#backend-environment-variables)
  - [Endpoints](#backend-endpoints)
    - [`/login` (GET - Initial Redirect)](#login-get---initial-redirect)
    - [`/callback` (GET - Deprecated/Internal)](#callback-get---deprecatedinternal)
    - [`/exchange-token` (POST)](#exchange-token-post) 
    - [`/refresh-token` (POST)](#refresh-token-post)
  - [Core Functions (`spotifyAuth.js`)](#core-functions-spotifyauthjs)
    - [`getSpotifyAccessToken`](#getspotifyaccesstoken)
    - [`refreshSpotifyToken`](#refreshspotifytoken)
- [Frontend Implementation](#frontend-implementation)
  - [Environment Variables](#frontend-environment-variables)
  - [Core Components & Services](#core-components--services)
    - [`app/(onboarding)/welcome.tsx`](#apponboardingwelcometsx)
    - [`src/hooks/useSpotifyAuth.ts`](#srchooksspotifyauthts)
    - [`src/services/spotifyAuthService.ts`](#srcservicesspotifyauthservicets)
    - [`AuthContext.tsx`](#authcontexttsx)
    - [`app/index.tsx`](#appindextsx)
  - [Authentication Flow Steps](#authentication-flow-steps)
  - [Token Management](#token-management)
- [Setup](#setup)

## Overview

The application utilizes the **OAuth 2.0 Authorization Code Flow** provided by Spotify. This is a standard, secure method for third-party applications to obtain delegated access to a user's Spotify account. The flow involves redirecting the user to Spotify to grant permissions and then exchanging an authorization code for access and refresh tokens.

## Key Concepts

*   **OAuth 2.0 Authorization Code Flow:** A specific sequence of steps defined by the OAuth 2.0 standard. It involves the user granting permission on the resource owner's site (Spotify), receiving an authorization code, and the application exchanging that code for tokens.
*   **Access Token:** A short-lived credential used by the application to make authorized API calls to Spotify on behalf of the user (e.g., get currently playing track).
*   **Refresh Token:** A longer-lived credential used to obtain a new access token when the current one expires, without requiring the user to log in again.
*   **Redirect URI:** The specific URL within our application where Spotify redirects the user after they have authorized (or denied) the connection. This URI must be registered in the Spotify Developer Dashboard for our application.
*   **Scopes:** Permissions requested by the application (e.g., reading playback state, reading email). The user must approve these scopes during the authorization step.
*   **Client ID & Client Secret:** Credentials provided by Spotify when registering the application. They identify our application to Spotify's API. **The Client Secret must be kept confidential.**

## Backend Implementation

The backend (`Node.js` with `Express.js`) handles the direct communication with the Spotify API for token exchange and refresh, keeping sensitive credentials (like the `Client Secret`) secure.

### Backend Environment Variables

The backend requires the following environment variables (defined in `backend/.env`):

*   `SPOTIFY_CLIENT_ID`: Your Spotify application's Client ID.
*   `SPOTIFY_CLIENT_SECRET`: Your Spotify application's Client Secret.
*   `SPOTIFY_REDIRECT_URI`: The specific redirect URI configured in your Spotify app settings *for the backend* (often used for initial testing or server-side flows, though the primary flow uses the frontend redirect URI).

### Backend Endpoints

#### `/login` (GET - Initial Redirect)

*   **File:** `backend/index.js`
*   **Purpose:** Primarily for server-side initiated auth flows or testing. It constructs the Spotify authorization URL with the necessary parameters (client ID, scopes, redirect URI, state) and redirects the user's browser to Spotify.
*   **Note:** The current frontend implementation initiates the flow directly using `expo-auth-session`, making this backend endpoint less critical for the main mobile app flow but potentially useful for web versions or testing.

#### `/callback` (GET - Deprecated/Internal)

*   **File:** `backend/index.js`
*   **Purpose:** Handles the redirect back from Spotify *if* the backend's `/login` endpoint was used. It receives the `code` and `state` parameters. It then calls `getSpotifyAccessToken` to exchange the code for tokens.
*   **Note:** Likely superseded by the `/exchange-token` endpoint for the mobile app flow.

#### `/exchange-token` (POST)

*   **File:** `backend/index.js`
*   **Purpose:** Securely exchanges an authorization code (received by the frontend) for Spotify access and refresh tokens. This is the primary endpoint used by the frontend after the user authorizes the app via Spotify.
*   **Request Body:** `{ "code": "...", "redirectUri": "..." }`
*   **Response Body:** `{ "access_token": "...", "refresh_token": "...", "expires_in": ... }`
*   **Process:**
    1.  Receives the `code` and the `redirectUri` (used by the frontend) in the request body.
    2.  Calls `getSpotifyAccessToken` with the received `code`, `redirectUri`, and the backend's `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
    3.  Returns the obtained tokens (`access_token`, `refresh_token`, `expires_in`) to the frontend.

#### `/refresh-token` (POST)

*   **File:** `backend/index.js`
*   **Purpose:** Securely obtains a new access token using a valid refresh token when the previous access token has expired.
*   **Request Body:** `{ "refresh_token": "..." }`
*   **Response Body:** `{ "access_token": "...", "refresh_token": "...", "expires_in": ... }` (Note: Spotify might return a new refresh token).
*   **Process:**
    1.  Receives the `refresh_token` from the frontend.
    2.  Calls `refreshSpotifyToken` with the `refresh_token` and the backend's `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`.
    3.  Returns the new `access_token` (and potentially updated `refresh_token`) and its `expires_in` time to the frontend.

### Core Functions (`spotifyAuth.js`)

#### `getSpotifyAccessToken`

*   **File:** `backend/spotifyAuth.js`
*   **Purpose:** Makes a POST request to Spotify's `/api/token` endpoint.
*   **Parameters:** `client_id`, `client_secret`, `code`, `redirect_uri`.
*   **Action:** Sends the authorization code, grant type (`authorization_code`), redirect URI, and base64-encoded client credentials to Spotify to receive the initial set of tokens.

#### `refreshSpotifyToken`

*   **File:** `backend/spotifyAuth.js`
*   **Purpose:** Makes a POST request to Spotify's `/api/token` endpoint.
*   **Parameters:** `client_id`, `client_secret`, `refresh_token`.
*   **Action:** Sends the refresh token, grant type (`refresh_token`), and base64-encoded client credentials to Spotify to receive a new access token.

## Frontend Implementation

The frontend (`React Native` with `Expo`) manages the user-facing part of the login flow, initiates the authorization request, handles the redirect, communicates with the backend for token exchange/refresh, stores tokens securely, and manages the application's authentication state.

### Frontend Environment Variables

The frontend requires the following environment variables (defined in `frontend/.env` and exposed via `EXPO_PUBLIC_` prefix):

*   `EXPO_PUBLIC_SPOTIFY_CLIENT_ID`: Your Spotify application's Client ID. (Must match the backend's).
*   `EXPO_PUBLIC_BACKEND_URL` (Optional/Implied): The base URL for the backend API (e.g., `http://localhost:8888`). Currently hardcoded in `spotifyAuthService.ts`.

### Core Components & Services

#### `app/(onboarding)/welcome.tsx`

*   **Purpose:** Renders the onboarding sequence (image, text, swiper). On the final slide, presents the "Log in with Spotify" button.
*   **Key Libraries:** `react-native-swiper`.
*   **Process:**
    1.  Displays onboarding content using `Swiper`.
    2.  Uses the `useSpotifyAuth` custom hook to manage the authentication state (`isLoading`, `error`, `isAuthRequestReady`) and trigger the login process.
    3.  On the last slide, the "Log in with Spotify" button's `onPress` handler calls the `signInWithSpotify` function obtained from the `useSpotifyAuth` hook.
    4.  Displays errors reported by the `useSpotifyAuth` hook.
    5.  Disables the login button based on the `isLoading` and `isAuthRequestReady` states from the `useSpotifyAuth` hook.

#### `src/hooks/useSpotifyAuth.ts`

*   **Purpose:** A custom React hook that encapsulates the entire Spotify authentication flow logic using `expo-auth-session`.
*   **Key Libraries:** `expo-auth-session`, `expo-web-browser`.
*   **Responsibilities:**
    1.  Configures the Spotify authorization request using `useAuthRequest` (client ID, scopes, redirect URI, response type 'code').
    2.  Provides a `signInWithSpotify` function that calls `promptAsync` to open the Spotify login page in a web browser.
    3.  Uses a `useEffect` hook to listen for and process the response from `expo-auth-session` after the user interacts with the Spotify login page.
    4.  Handles success (`response.type === 'success'`), error (`response.type === 'error'`), and cancellation (`response.type === 'cancel'`) scenarios.
    5.  On success, extracts the authorization `code` and calls `exchangeCodeForTokens` from `spotifyAuthService`.
    6.  If token exchange is successful, calls `setIsLoggedIn(true)` (from `AuthContext`) and navigates the user to the main app screen using `expo-router`.
    7.  Manages `isLoading` and `error` states throughout the process.
    8.  Exposes `signInWithSpotify`, `isAuthRequestReady`, `isLoading`, and `error` for the UI component (`welcome.tsx`) to use.

#### `src/services/spotifyAuthService.ts`

*   **Purpose:** Encapsulates all communication logic with the backend for authentication tasks and manages token storage.
*   **Key Libraries:** `@react-native-async-storage/async-storage`.
*   **Functions:**
    *   `exchangeCodeForTokens(code, redirectUri)`: Sends the received `code` and the `redirectUri` used in the auth request to the backend's `/exchange-token` endpoint. Stores the received tokens (`access_token`, `refresh_token`, `expires_in`) and calculates an `expires_at` timestamp in `AsyncStorage`.
    *   `refreshAccessToken()`: Retrieves the `refresh_token` from `AsyncStorage`. Sends it to the backend's `/refresh-token` endpoint. Stores the new tokens and `expires_at` timestamp in `AsyncStorage`.
    *   `isTokenExpired(expirationTime)`: Helper function to check if a token is expired or close to expiring (adds a 5-minute buffer).
    *   `getValidAccessToken()`: Checks `AsyncStorage` for tokens. If tokens exist and are not expired (using `isTokenExpired`), returns the `access_token`. If expired, calls `refreshAccessToken()` first, then returns the new `access_token`. Returns `null` if no tokens are found or refresh fails.
*   **Token Storage:** Uses `AsyncStorage` to persist the `access_token`, `refresh_token`, and the calculated `expires_at` timestamp locally on the device.

#### `AuthContext.tsx`

*   **Purpose:** Provides a global state management solution for the user's authentication status.
*   **Key Hooks:** `createContext`, `useContext`, `useState`.
*   **State:** Manages `isLoggedIn` (boolean) and potentially `isLoading` flags.
*   **Provider:** `AuthProvider` wraps the application (likely in `app/_layout.tsx`) making the auth state available throughout the component tree.
*   **Hook:** `useAuth()` provides easy access to `isLoggedIn` state and the `setIsLoggedIn` function for components to read or update the auth status.

#### `app/index.tsx`

*   **Purpose:** Acts as the initial entry point or router gate.
*   **Process:**
    1.  Uses the `useAuth()` hook to get the current `isLoggedIn` status.
    2.  Conditionally renders a `Redirect` component from `expo-router`:
        *   If `isLoggedIn` is true, redirects to the main authenticated part of the app (e.g., `/(root)/(tabs)/mapScreen`).
        *   If `isLoggedIn` is false, redirects to the onboarding/login flow (e.g., `/(onboarding)/welcome`).
    3.  May include a loading indicator while the initial auth state is being determined (e.g., checking `AsyncStorage`).

### Authentication Flow Steps

1.  **User Action:** User reaches the `welcome.tsx` screen and taps "Log in with Spotify".
2.  **Initiate Auth:** The button's `onPress` handler calls `signInWithSpotify` from the `useSpotifyAuth` hook.
3.  **Hook Action:** The `signInWithSpotify` function inside the hook calls `promptAsync()` from `expo-auth-session`, opening the Spotify authorization URL in a web browser.
4.  **User Grants Permission:** User logs into Spotify (if needed) and approves the requested scopes.
5.  **Spotify Redirects:** Spotify redirects the browser back to the app using the specified `redirectUri`, appending an authorization `code`.
6.  **Handle Redirect:** `expo-auth-session` captures the redirect and updates the `response` object within the `useSpotifyAuth` hook.
7.  **Hook Processes Response:** The `useEffect` hook inside `useSpotifyAuth` detects the successful response and extracts the `code`.
8.  **Token Exchange:** The hook calls `exchangeCodeForTokens(code, redirectUri)` from the `spotifyAuthService`.
9.  **Backend Exchanges Code:** The backend (`/exchange-token`) verifies the code with Spotify and receives access/refresh tokens.
10. **Tokens Sent to Frontend Service:** Backend returns the tokens to the `spotifyAuthService`.
11. **Store Tokens:** `spotifyAuthService` saves the tokens and expiry time in `AsyncStorage`.
12. **Hook Updates Auth State:** The hook receives confirmation from the service and calls `setIsLoggedIn(true)` via `AuthContext`.
13. **Hook Navigates:** The hook uses `expo-router` to navigate the user to the main authenticated screen (e.g., `mapScreen`).

### Token Management

*   **Storage:** Tokens (`access_token`, `refresh_token`) and expiration time (`expires_at`) are stored using `@react-native-async-storage/async-storage`.
*   **Expiration Check:** Before making an API call that requires authentication, the app should ideally use `getValidAccessToken()` from `spotifyAuthService`.
*   **Refresh:** `getValidAccessToken` handles the refresh logic internally. It checks `isTokenExpired`. If the token is expired, it calls `refreshAccessToken` (which communicates with the backend's `/refresh-token` endpoint) before returning the valid token.
*   **Logout:** A logout function would typically clear the tokens from `AsyncStorage` and set `isLoggedIn` to `false`. (Implementation details not shown in provided code).

## Setup

1.  **Spotify Developer Dashboard:**
    *   Register your application at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
    *   Note down your **Client ID** and **Client Secret**.
    *   Under "Edit Settings", add your **Redirect URIs**. You will need:
        *   The backend redirect URI (e.g., `http://localhost:8888/callback`, if using the backend `/login` flow for testing).
        *   The frontend redirect URI(s) used by `expo-auth-session`. Find this by logging the output of `makeRedirectUri()` or using the specific scheme for your development/production builds (e.g., `exp://YOUR_IP_ADDRESS:PORT`, `your-app-scheme://auth`).
2.  **Backend `.env` File:**
    *   Create a `.env` file in the `backend/` directory (copy from `.env_sample` if needed).
    *   Add your `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, and the backend `SPOTIFY_REDIRECT_URI`.
3.  **Frontend `.env` File:**
    *   Create a `.env` file in the `frontend/` directory (copy from `.env_sample` if needed).
    *   Add your `EXPO_PUBLIC_SPOTIFY_CLIENT_ID`. Ensure it starts with `EXPO_PUBLIC_` to be accessible in the Expo app.
4.  **Install Dependencies:** Run `npm install` or `yarn install` in both the `backend/` and `frontend/` directories.
5.  **Run Backend:** Start the backend server (e.g., `npm start` or `nodemon` in the `backend/` directory).
6.  **Run Frontend:** Start the frontend application (e.g., `npx expo start` in the `frontend/` directory).
