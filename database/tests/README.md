# Database Tests

Tests use [**pgTAP Framework**](https://pgtap.org/)

## Test Structure

The tests are organized into several categories:

1. **Table Tests**:
   - `hotspots.sql` - Tests for geohash hotspot functionality
   - `songs.sql` - Tests for song data storage
   - `users.sql` - Tests for active user tracking
   - `auth.sql` - Tests for authentication system

2. **Function Tests**:
   - `get_hotspots.sql` - Tests the hotspot lookup function
   - `upsert_active_user.sql` - Tests user upsert functionality


> **Note**: Tables are built from XX-init.sql files - include your definitions there.


Files can be found [here](/database/tests/sql)

## Running the Tests

To run all tests using Docker:
> Run it in database/tests directory

```bash
docker compose up
```

After running:
```bash
docker compose down -v
```

The tests will automatically execute when the PostgreSQL container starts.
