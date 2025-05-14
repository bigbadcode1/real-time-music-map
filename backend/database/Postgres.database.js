import { Pool } from 'pg'
import { config } from 'dotenv';
config();

// Database class manages database connections and adds an abstraction layer to calling queries
class Database {
  // creates connection pool
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASS,
      port: process.env.DB_PORT,

    });
  }

  // helper function, calls specified query with params 
  async query(text, params) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }


  // functions for calling db queries
  async addNewUser(id, name, token_hash, expires_at, geohash = null) {
    
    let result;
    if (geohash) {
      result = await this.query('SELECT add_new_user($1, $2, $3, $4, $5)', [id, name, token_hash, expires_at, geohash]);
    } else {
      result = await this.query('SELECT add_new_user($1, $2, $3, $4)', [id, name, token_hash, expires_at]);
    }
    
    return result;
  }

  async updateUserInfo(user_id, token, geohash, song_id, song_image, song_title, song_artist) {
    const result = await this.query('SELECT update_user_info($1, $2, $3, $4, $5, $6, $7)', [user_id, token, geohash, song_id, song_image, song_title, song_artist]);
    
    return result;    
  }


  async updateAuthToken(user_id, old_token, new_token, expires_at) {
    const result = await this.query('SELECT update_auth_token($1, $2, $3, $4)', [user_id, old_token, new_token, expires_at]);

    return result;    
  }

  async getUsersFromHotspots(array) {
    const result = await this.query('SELECT * FROM get_users_from_hotspots($1)', [array]);
    const data = result?.rows;

    return data;
  }

  async getHotspots(ne_lat, ne_long, sw_lat, sw_long) {
    const result = await this.query('SELECT * FROM get_hotspots($1, $2, $3, $4)', [ne_lat, ne_long, sw_lat, sw_long]);
    const data = result?.rows;

    return data;
  }

}

// Export a singleton instance
export default new Database();