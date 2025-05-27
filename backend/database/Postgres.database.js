import { Pool } from 'pg'
import { config } from 'dotenv';

config();

// Database class manages database connections and adds an abstraction layer to calling queries
class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false // Required for Render's PostgreSQL connections
      },
      max: 80,
      connectionTimeoutMillis: 5000,
    });
    console.log('[Postgresql.database.js] Using DATABASE_URL for connection.');
  }

  // helper function, calls specified query with params
  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } catch (error) {
      console.error('[Postgresql.database.js] Query error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ---------------- functions for calling db queries

  async addNewUser(id, name, token_hash, expires_at = (Date.now() + 60 * 60 * 1000), geohash = null, image_url = null) {
    const expires = new Date(expires_at);
    const result = await this.query('SELECT add_new_user($1, $2, $3, $4, $5, $6)', 
      [id, name, token_hash, expires, geohash, image_url]);
    return result;
  }

  async updateUserInfo(user_id, token, geohash, song_id, song_image, song_title, song_artist) {
    const result = await this.query('SELECT update_user_info($1, $2, $3, $4, $5, $6, $7)', 
      [user_id, token, geohash, song_id, song_image, song_title, song_artist]);
    return result;
  }

  async updateAuthToken(user_id, old_token, new_token, expires_at) {
    const result = await this.query('SELECT update_auth_token($1, $2, $3, $4)', 
      [user_id, old_token, new_token, expires_at]);
    return result;
  }

  async getUsersFromHotspots(array) {
    const result = await this.query('SELECT * FROM get_users_from_hotspots($1)', [array]);
    return result?.rows || [];
  }

  async getHotspots(ne_lat, ne_long, sw_lat, sw_long) {
    const result = await this.query('SELECT * FROM get_hotspots($1, $2, $3, $4)', 
      [ne_lat, ne_long, sw_lat, sw_long]);
    return result?.rows || [];
  }

  async testConnection() {
    let client;
    try {
      // Get a client from the pool
      client = await this.pool.connect();
      // Test with a simple query
      await client.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database connection failed:', error);
      throw new Error(`Database connection failed: ${error.message}`);
    } finally {
      if (client) client.release();
    }
  }

  // Updated to use the proper delete_user function
  async deleteUser(userId) {
    const result = await this.query('SELECT delete_user($1)', [userId]);
    console.log(`[Postgresql.database.js] User ${userId} deleted from DB with hotspot cleanup.`);
    return result;
  }

  // Keep the old method name for backward compatibility, but use the new function
  async deleteUserOnLogout(userId) {
    return this.deleteUser(userId);
  }

  // Additional helper methods for the new database functions
  async cleanupExpiredUsers() {
    const result = await this.query('SELECT cleanup_expired_users()');
    console.log('[Postgresql.database.js] Expired users cleaned up.');
    return result;
  }

  async cleanupExpiredAuth() {
    const result = await this.query('SELECT cleanup_expired_auth()');
    console.log('[Postgresql.database.js] Expired auth tokens cleaned up.');
    return result;
  }

  async deleteAllUsers() {
    const result = await this.query('SELECT delete_all_users()');
    console.log('[Postgresql.database.js] All users and hotspots deleted.');
    return result;
  }

  // Utility method to close the database pool
  async close() {
    await this.pool.end();
    console.log('[Postgresql.database.js] Database pool closed.');
  }
}

// Export a singleton instance
export default new Database();