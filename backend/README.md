# Backend

A Node.js backend service that integrates with Spotify API to track and visualize users' currently playing tracks on a map.

## 🎵 Overview

Backend is the server component of our application that allows users to share their currently playing Spotify tracks on a geographical map. The service handles Spotify authentication, retrieves current track information, and manages user location data through geohashing.


## 📋 Prerequisites

- Node.js (v14+)
- Docker & Docker Compose
- Spotify Developer Account (for API credentials)

## ⚙️ Environment Variables

Create a `.env` file in the root directory with the following variables (see `.env_sample` file):

```
PORT=ENTER_PORT_HERE

# SPOTIFY API
SPOTIFY_CLIENT_ID=clientid
SPOTIFY_CLIENT_SECRET=secret
SPOTIFY_REDIRECT_URI=uri

# database
DB_USER=admin
DB_PASS=admin
DB_HOST=localhost
DB_NAME=music_map_db
DB_PORT=5432
```

## 🚀 Getting Started

### Installation & Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (see above)
4. Start the service with Docker:
   ```bash
   docker compose up -d
   ```

### Manual Startup (Development)

```bash
npm run dev
```

## 🔌 API Endpoints

### Spotify Authentication

- **POST** `/exchange-token`
  - Exchange Spotify authorization code for access token
  - Body: `{ "code": "spotify-auth-code", "redirectUri": "your-redirect-uri" }`

- **POST** `/refresh-token`
  - Refresh an expired Spotify access token
  - Body: `{ "refresh_token": "spotify-refresh-token" }`

### User & Track Management

- **GET** `/currentTrack`
  - Get user's currently playing track
  - Headers: `Authorization: Bearer spotify-access-token`

### Geographical Features

- **POST** `/get_hotspots`
  - Get hotspots within geographical boundaries
  - Body(example): `{ "ne_lat": 90, "ne_long": 180, "sw_lat": -90, "sw_long": -180 }`

- **POST** `/get_users_from_hotspots`
  - Get users in specified hotspots
  - Body(example): `{ "hotspots": ["xj", "4d1q", "6vw"] }`


## 🐳 Docker

Backend is containerized using Docker and can be easily deployed using Docker Compose.

To run only backend container run inside `/backend`:
```bash
docker compose up
```

## 🧪 Testing

Run tests using Jest:

```bash
npm test
```
