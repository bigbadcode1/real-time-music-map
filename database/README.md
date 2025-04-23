# Music Map Database Initialization

This sets up a PostgreSQL database with the necessary tables for our application, along with a Docker Compose configuration for easy deployment.

## Database Schema
![ER_diagram](https://github.com/user-attachments/assets/454880f0-5374-405a-83be-d47537eddf0a)

## Key Features

- **Real-time Hotspot Tracking**: Identifies areas with high user concentrations using geohash technology
- **User Management**: Tracks active users with their current locations and music preferences
- **Authentication**: Secure token-based authentication system
- **Optimized Performance**: Reduces Spotify API calls by caching song data

## Database Schema

### Main Tables

1. **Hotspots**
   - Tracks geographic areas with multiple users
   - `geohash`: 8-character geohash identifier (primary key)
   - `count`: Number of active users in the area
   - `last_updated`: Timestamp of last activity

2. **Active Users**
   - Currently active users in the system
   - `id`: User identifier
   - `song_id`: Currently playing song (references Songs table)
   - `geohash`: Current location (references Hotspots)
   - `expires_at`: Session expiration time

3. **Songs**
   - Cache of Spotify song data to reduce API calls
   - Stores song ID, image URL, title, and artist

4. **Auth**
   - User authentication system
   - Stores hashed auth tokens with expiration times

## Key Functions

### `get_hotspots(geohash_prefixes)`
Retrieves hotspot data matching the provided geohash prefixes.

### `upsert_active_user()`
Handles user authentication and updates user location/song data:
- Validates auth tokens
- Updates user location
- Manages session expiration

## Triggers

1. **Hotspot Auto-update**
   - Automatically updates hotspot counts when users change locations
   - Removes empty hotspots

2. **New User Handling**
   - Increments hotspot counts when new users join


### Setup

1. Create a `.env` file based on `.env.example` with your PostgreSQL credentials:
   ```
   POSTGRES_DB=your_db_name
   POSTGRES_USER=your_db_user
   POSTGRES_PASSWORD=your_secure_password
   ```

2. Start the PostgreSQL container (you need to be inside real-time-music-map/database folder:
   ```bash
   docker compose up -d
   ```

   OR (to see live logs)
   ```bash
   docker compose up
   ```

3. Initialize the database by running the SQL scripts (you can use a client like psql or Azure Database)

### Volumes
- Data is persisted in a Docker volume named `music_map_pgdata`

### Configuration
- PostgreSQL version: 14.5-alpine
- Port: 5432 (mapped to host)

## Usage

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
docker-compose down -v
```
