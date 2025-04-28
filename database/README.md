# Music Map Database Initialization

This sets up a PostgreSQL database with the necessary tables for our application, along with a Docker Compose configuration for easy deployment.

## Database Schema
![ER_diagram](https://github.com/user-attachments/assets/454880f0-5374-405a-83be-d47537eddf0a)

### Tables

#### Hotspots
- Stores geographic hotspots with activity tracking
- **Fields**:
  - `geohash` (VARCHAR(8)): Primary key, valid geohash string
  - `count` (INT): Number of active users in this location
  - `last_updated` (TIMESTAMPTZ): Timestamp of last activity

#### Songs
- Caches Spotify song information to reduce API calls
- **Fields**:
  - `id` (TEXT): Spotify song ID (22-character alphanumeric)
  - `image_url` (TEXT): Album art URL
  - `title` (TEXT): Song title
  - `artist` (TEXT): Artist name

#### Active Users
- Tracks currently active users
- **Fields**:
  - `id` (TEXT): User ID (22-32 character alphanumeric)
  - `song_id` (TEXT): Currently playing song (references Songs.id)
  - `geohash` (VARCHAR(8)): User's location (references Hotspots.geohash)
  - `expires_at` (TIMESTAMPTZ): Session expiration time (default 1 hour)

#### Auth
- Manages user authentication tokens
- **Fields**:
  - `user_id` (TEXT): References "Active Users".id
  - `auth_token_hash` (TEXT): Hashed authentication token
  - `expires_at` (TIMESTAMPTZ): Token expiration time (default 1 hour)

## Docker Deployment

### Prerequisites
- Docker
- Docker Compose

([Docker Desktop](https://www.docker.com/products/docker-desktop/) provides them)


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

## Testing
[Tests Documentation](/database/tests/README.md)

To completely remove the data volume (warning: irreversible):
```bash
docker-compose down -v
```
