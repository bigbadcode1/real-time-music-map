# Database Tests

This directory contains comprehensive tests for the Music Map database using the [pgTAP Framework](https://pgtap.org/), a TAP-compliant testing framework for PostgreSQL.

## Test Structure

The tests are organized into several categories:

### Table Tests
These tests validate the schema, constraints, and basic CRUD operations for each table:

- **`hotspots.sql`**:
  - Tests geohash validation (7-character limit, valid characters)
  - Verifies automatic coordinate calculation from geohash
  - Confirms proper count handling and last_updated timestamp management

- **`songs.sql`**:
  - Tests ID and URL pattern validation
  - Verifies constraint enforcement for required fields
  - Tests basic CRUD operations for song data

- **`users.sql`**:
  - Tests foreign key constraints (song_id, geohash)
  - Validates required fields and pattern matching
  - Tests session expiration tracking

- **`auth.sql`**:
  - Tests token storage and validation
  - Verifies foreign key constraints with users table
  - Tests token update functionality

### Function Tests
These tests validate the behavior of stored procedures and functions:

-   **`get_hotspots.sql`**:
    -   Tests geographic bounding box queries
    -   Verifies coordinate validation logic
    -   Tests the limit of 20 hotspots returned

-   **`update_user_info.sql`**:
    -   Tests updating user's geohash and song information.
    -   Verifies handling of valid and invalid auth tokens.
    -   Tests cases for updating with new songs and adding new songs to the database.
    -   Ensures expiration time is correctly updated.

-   **`update_auth_token.sql`**:
    -   Tests updating user's auth token.
    -   Verifies updating with valid and invalid old tokens.
    -   Tests updating token for non-existent users.
    -   Ensures auth token and active user expiration times are updated.

-   **`add_new_user.sql`**:
    -   Tests adding new users with valid data.
    -   Verifies user creation in `Active Users` and `Auth` tables.
    -   Tests hotspot count incrementing.
    -   Tests handling of users without geohash.
    -   Verifies prevention of adding users with expired tokens or duplicate users.
    -   Tests successful addition of a user replacing an expired user.

-   **`get_users_from_hotspots.sql`**:
    -   Tests filtering by geohash prefixes
    -   Verifies user and song data retrieval
    -   Tests edge cases with empty arrays and non-matching prefixes

## Running the Tests

### Using Docker Compose

To run all tests using Docker:

```bash
# Run in the database/tests directory
docker compose up
```

After testing is complete:
```bash
docker compose down -v
```

The tests will automatically execute when the PostgreSQL container starts, using the `run_all.sql` script.

### Test File Location

All test SQL files can be found in the `/database/tests/sql` directory.

## Writing New Tests

When adding new functionality to the database:

1. Create a new test file in the appropriate category
2. Follow the BEGIN/ROLLBACK transaction pattern to avoid test data persistence
3. Add your test file to the `run_all.sql` script

Example test structure:
```sql
BEGIN;
SELECT * FROM no_plan();

-- Your test cases here
SELECT is(...);
SELECT throws_ok(...);

SELECT * FROM finish();
ROLLBACK;
```

> **Note**: Tables are built from XX-init.sql files - include your definitions there.
