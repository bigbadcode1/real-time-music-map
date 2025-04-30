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
  async upsertUser(id, name, song_id, token_hash, expires_at, geohash) {
    const result = await this.query('SELECT upsert_active_user($1, $2, $3, $4, $5, $6)', id, name, song_id, token_hash, expires_at, geohash);
    return result;
  }

  async getUsersFromHotspots(array) {
    const result = await this.query('SELECT * FROM get_users_from_hotspots($1)', [array]);
    const data = result?.rows;
    
    return data;
  }
  
  async getHotspots(array) {
    const result = await this.query('SELECT * FROM get_hotspots($1)', [array]);
    const data = result?.rows;

    return data;
  }

}

// Export a singleton instance
export default new Database();