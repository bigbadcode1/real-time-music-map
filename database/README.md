# Music Map Database

This repository contains a PostgreSQL database setup for a real-time music map application, along with Docker Compose configuration for easy deployment. The application tracks user locations, their currently playing songs, and creates geographic hotspots of music activity.

### Tables

#### Hotspots
- Stores geographic hotspots with activity tracking
- **Fields**:
  - `geohash` (VARCHAR(7)): Primary key, valid geohash string with 7 characters
  - `count` (INT): Number of active users in this location
  - `last_updated` (TIMESTAMPTZ): Timestamp of last activity
  - `longitude` (DOUBLE PRECISION): Longitude coordinate (-180 to 180)
  - `latitude` (DOUBLE PRECISION): Latitude coordinate (-90 to 90)
  
#### Songs
- Caches Spotify song information to reduce API calls
- **Fields**:
  - `id` (TEXT): Spotify song ID (alphanumeric, max 80 chars)
  - `image_url` (TEXT): Album art URL (valid HTTP/HTTPS URL)
  - `title` (TEXT): Song title
  - `artist` (TEXT): Artist name

#### Active Users
- Tracks currently active users
- **Fields**:
  - `id` (TEXT): User ID (alphanumeric, max 80 chars)
  - `name` (TEXT): User's display name
  - `song_id` (TEXT): Currently playing song (references Songs.id)
  - `geohash` (VARCHAR(7)): User's location (references Hotspots.geohash)
  - `expires_at` (TIMESTAMPTZ): Session expiration time (default 1 hour)

#### Auth
- Manages user authentication tokens
- **Fields**:
  - `user_id` (TEXT): References "Active Users".id
  - `auth_token_hash` (TEXT): Hashed authentication token
  - `expires_at` (TIMESTAMPTZ): Token expiration time (default 1 hour)

## Key Functions

### User Management
- `upsert_active_user`: Adds or updates a user with their current song and location
  - Handles authentication
  - Updates user session expiration
  - Updates associated hotspot counts

### Hotspot Management
- `get_hotspots`: Retrieves hotspots within a geographic bounding box
- `get_users_from_hotspots`: Gets users from specified hotspots with their song information

### Triggers
- Automatic hotspot counting when users are added, moved, or removed
- Automatic geohash to coordinates conversion using PostGIS

## Technologies
- PostgreSQL 14.5
- PostGIS extension for geospatial functionality
- Docker and Docker Compose for deployment

## Docker Deployment

### Prerequisites
- Docker
- Docker Compose

([Docker Desktop](https://www.docker.com/products/docker-desktop/) provides both)

### Setup

1. Create a `.env` file based on `.env.example` with your PostgreSQL credentials:
   ```
   POSTGRES_DB=your_db_name
   POSTGRES_USER=your_db_user
   POSTGRES_PASSWORD=your_secure_password
   ```

2. Start the PostgreSQL container:
   ```bash
   docker compose up -d
   ```

   OR (to see live logs)
   ```bash
   docker compose up
   ```

3. The database will be initialized with the schema and functions from the SQL scripts

### Volumes
- Data is persisted in a Docker volume named `music_map_pgdata`

## Connection Details

To connect to the database:
- Host: `localhost` (or your Docker host IP)
- Port: `5432`
- Database: Value from `POSTGRES_DB` in your .env file
- Username/Password: From your .env file

## Maintenance

To stop the container:
```bash
docker compose down
```
OR (without removing the containers)
```bash
docker compose stop
```

To completely remove the data volume (warning: irreversible):
```bash
docker compose down -v
```

## Testing
For tests documentation, see [Tests Documentation](/database/tests/README.md)
