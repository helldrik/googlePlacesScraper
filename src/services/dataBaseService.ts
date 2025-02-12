import * as pg  from 'pg';
import dotenv from 'dotenv';
dotenv.config();

export default class DataBaseService {
  private pool: pg.Pool;

    constructor(environment: string) {
        this.pool = new pg.Pool({connectionString: environment === 'dev'? process.env.DB_CONNECTION_STRING_DEV : process.env.DB_CONNECTION_STRING_PROD});
    }

    async init(){
        // Create the table if it doesn't exist
        const client = await this.pool.connect();
        try{
            await client.query(`BEGIN`);
            await client.query(`
                CREATE TABLE IF NOT EXISTS map_location (
                  id SERIAL PRIMARY KEY,
                  location GEOGRAPHY(Point, 4326)
                );
              `);
            await client.query(`CREATE INDEX IF NOT EXISTS map_location_idx ON map_location USING GIST (location);`);

            await client.query(`
                CREATE TABLE IF NOT EXISTS point_of_interest (
                  id SERIAL PRIMARY KEY,
                  map_location_id INTEGER NOT NULL,
                  name TEXT,
                  url TEXT,
                  address TEXT,
                  type TEXT,
                  opening_hours TEXT,
                  rating FLOAT,
                  reviews JSONB,
                  CONSTRAINT fk_map_location
                    FOREIGN KEY (map_location_id)
                    REFERENCES map_location(id)
                    ON DELETE CASCADE
                );
              `);

            //Add more tables here if needed


            await client.query(`COMMIT`);
        }catch(e){
            console.error('Error creating table', e);
        }finally{
            client.release();
        }
    }

    async connect(){
        return this.pool.connect();
    }


}